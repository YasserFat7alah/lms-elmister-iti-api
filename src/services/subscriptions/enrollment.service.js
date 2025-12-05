import stripe from "./../../config/stripe.js";
import AppError from "../../utils/app.error.js";
import Enrollment from "../../models/Enrollment.js";
import Group from "../../models/Group.js";
import User from "../../models/users/User.js";
import ParentProfile from "../../models/users/ParentProfile.js";
import StudentProfile from "../../models/users/StudentProfile.js";
import TeacherProfile from "../../models/users/TeacherProfile.js";
import { CLIENT_URL, STRIPE_WEBHOOK_SECRET } from "../../utils/constants.js";
import paymentService from "../payment.service.js";

class EnrollmentService {
  constructor() {
    this.activeStatuses = ["trialing", "active", "past_due"];
    this.platformFee = 0.1;
  }

  /** subscribe a student in a paid group (creates Stripe subscription)
   * @param {object} parent - authenticated parent user
   * @param {object} data - { studentId, groupId, paymentMethodId }
   * @returns {{ enrollment, clientSecret, stripeStatus }}
   */
  async subscribe(parent, studentId, groupId) {
    const parentId = parent._id || parent.id;

    // Vaidate data input
    if (!studentId || !groupId ) {
      throw AppError.badRequest(
        "groupId, studentId are required!"
      );
    }

    // Validate group availability
    const group = await Group.findById(groupId).populate("courseId");
    if (!group) throw AppError.notFound("Group not found");

    if (group.isFree) {
      throw AppError.badRequest(
        "Selected group is free and does not require a subscription"
      );
    }
    if (!group.price || group.price <= 0) {
      throw AppError.badRequest(
        "Group price must be greater than zero for paid subscriptions"
      );
    }

    if (group.studentsCount >= group.capacity || group.status === "closed") {
      throw AppError.conflict("Group is full or closed for enrollments");
    }

    
    // Validate student data
    const student = await User.findOne({ _id: studentId, role: "student" });
    if (!student) throw AppError.badRequest("Invalid student");

    const studentProfile = await StudentProfile.findOne({
      user: studentId,
      parent: parentId,
    });
    if (!studentProfile) {
      throw AppError.forbidden("This student is not linked to your account!");
    }

    let enrollment = await Enrollment.findOne({
      student: studentId,
      course: group.courseId,
    });
    if (enrollment && enrollment.status === "active") {
      throw AppError.conflict(
        "This student already has an active subscription for this course"
      );
    }
    const parentProfile = await this.getParentProfile(parentId);
    const stripeCustomerId = await this.getCustomerId(parent, parentProfile);
    const stripePriceId = await this.getPriceId(group);

    if(!enrollment) {
    enrollment = await Enrollment.create({
      parent: parentId,
      student: studentId,
      teacher: group.teacherId,
      group: groupId,
      course: group.courseId._id,
      customerId: stripeCustomerId,
      priceId: stripePriceId,
      status: 'incomplete',
      amount: group.price,
      currency: group.currency || "usd",
    });
  }
    
    const session = await paymentService.createCheckoutSession({
      customerId: stripeCustomerId,
      priceId: stripePriceId,
      successUrl: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${CLIENT_URL}/payment/canceled`,
      metadata: { 
        enrollmentId: enrollment._id.toString(),
        groupId: groupId.toString(),
        studentId: studentId.toString(),
        teacherId: group.teacherId.toString(),
        parentId: parentId.toString(),
        courseId: group.courseId._id.toString()
      },
    });

    // Store checkout session ID temporarily (will be replaced with subscription ID on completion)
    enrollment.subscriptionId = session.id;
    await enrollment.save();
    
    return {
      url: session.url,
      enrollment,
    };
  }

  /** Cancel an enrollment (at period end) */
  async cancel(parentId, enrollmentId) {
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      throw AppError.notFound("Enrollment not found");
    }

    if (enrollment.parent.toString() !== parentId.toString()) {
      throw AppError.forbidden("You do not own this enrollment");
    }

    const stripeUpdated = await stripe.subscriptions.update(
      enrollment.subscriptionId,
      { cancel_at_period_end: true }
    );

    enrollment.cancelAtPeriodEnd = stripeUpdated.cancel_at_period_end;
    enrollment.status = stripeUpdated.status;
    enrollment.canceledAt = this.updateDate(stripeUpdated.canceled_at, enrollment.canceledAt);

    await enrollment.save();
    return enrollment;
  }

  /* --- --- --- HELPERS --- --- --- */

  /** Find enrollment
   * @param {string} enrollmentId
   * @returns {Enrollment}
   * */
  async find(enrollmentId) {
    const enrollment = await Enrollment.findById(enrollmentId);
    return enrollment;
  }

   /** List all enrollments for a parent
   * @param {string} parentId : Authenticated Parent
   * @returns {Enrollment[]}
   * */
  async listByParent(parentId) {
    const enrollments = Enrollment.find({ parent: parentId })
      .sort("-createdAt")
      .populate("group", "title startingDate startingTime")
      .populate("student", "name email");

    return enrollments;
  }

  /** Get parent profile
   * @param {string} parentId : Authenticated Parent
   * @returns {ParentProfile}
   * */
  async getParentProfile(parentId) {
    let profile = await ParentProfile.findOne({ user: parentId });
    if (!profile) {
      profile = await ParentProfile.create({ user: parentId });
    }
    if (!profile.stripe) {
      profile.stripe = {};
      await profile.save();
    }
    return profile;
  }

  /** Get Stripe Customer Id
   * @param {object} parent - authenticated parent user
   * @param {object} parentProfile - parent profile
   * @returns {string} Stripe Customer Id
   * */
  async getCustomerId(parent, parentProfile) {
    if (parentProfile.stripe && parentProfile.stripe.customerId) {
      return parentProfile.stripe.customerId;
    }

    const customer = await stripe.customers.create({
      email: parent.email,
      name: parent.name,
      metadata: {
        parentId: (parent._id || parent.id).toString(),
      },
    });

    parentProfile.stripe = parentProfile.stripe || {};
    parentProfile.stripe.customerId = customer.id;
    await parentProfile.save();

    return customer.id;
  }

  /** Use Payment Method
   * @param {string} customerId - Stripe Customer Id
   * @param {string} paymentMethodId - Stripe Payment Method Id
   * @param {object} profile - parent profile
   * @returns {string} Stripe Payment Method Id
   * */
  async usePaymentMethod(customerId, paymentMethodId, profile) {
    if (!paymentMethodId && profile.stripe?.defaultPaymentMethodId) {
      return profile.stripe.defaultPaymentMethodId;
    }

    if (!paymentMethodId) {
      throw AppError.badRequest("paymentMethodId is required!");
    }

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    profile.stripe = profile.stripe || {};
    profile.stripe.defaultPaymentMethodId = paymentMethodId;
    await profile.save();

    return paymentMethodId;
  }

  /** get price id from stripe
   * @param {object} group
   * @returns {string} Stripe Price Id
   * */
  async getPriceId(group) {
    if (!group.stripe) group.stripe = {};
    

    if (group.stripe.priceId && group.stripe.price === group.price) {
      return group.stripe.priceId;
    }

    if (!group.stripe.productId) {
      const product = await stripe.products.create({
        name: `${group.title} (${group._id.toString()})`,
        metadata: {
          groupId: group._id.toString(),
          courseId: group.courseId?._id.toString() || "",
        },
      });
      group.stripe.productId = product.id;
    }

    const price = await stripe.prices.create({
      product: group.stripe.productId,
      unit_amount: Math.round(group.price * 100),
      currency: group.currency || "usd",
      recurring: {
        interval: group.stripe.billingInterval || "month",
      },
    });

    group.stripe.priceId = price.id;
    group.stripe.price = group.price;
    await group.save();

    return price.id;
  }

  /** Ensure student is in group
   * @param {string} groupId
   * @param {string} studentId
   * */
  async ensureStudentInGroup(groupId, studentId) {
   await Group.updateOne(
        { _id: groupId, students: { $ne: studentId } }, 
        { 
            $push: { students: studentId },
            $inc: { studentsCount: 1 } 
        }
    );
  }

  /** Format Stripe Date
   * @param {number} date
   * @returns {Date} Date object
   * */
  updateDate(date, fallback = null) {
    return date ? new Date(date * 1000) : fallback;
  }
  /* --- --- --- WEBHOOK HANDLERS --- --- --- */

  constructStripeEvent(signature, rawBody) {
    if (!STRIPE_WEBHOOK_SECRET) {
      throw AppError.internal(
        "Stripe webhook secret is not configured in environment variables"
      );
    }

    return stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  }

  async handleStripeEvent(event) {
    switch (event.type) {
      case "invoice.payment_succeeded":
        await this.handleInvoicePaid(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await this.syncSubscription(event.data.object);
        break;
      case "customer.subscription.deleted":
        await this.markSubscriptionCancelled(event.data.object);
        break;
      default:
        break;
    }
  }

  async syncSubscription(stripeSubscription) {
    const enrollment = await Enrollment.findOne({
      subscriptionId: stripeSubscription.id,
    });
    if (!enrollment) return;

    enrollment.status = stripeSubscription.status;
    enrollment.currentPeriodStart = this.updateDate(stripeSubscription.current_period_start, enrollment.currentPeriodStart);
    enrollment.currentPeriodEnd = this.updateDate(stripeSubscription.current_period_end, enrollment.currentPeriodEnd);
    enrollment.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    enrollment.canceledAt = this.updateDate(stripeSubscription.canceled_at, enrollment.canceledAt);

    await enrollment.save();
  }

  async markSubscriptionCancelled(stripeSubscription) {
    const enrollment = await Enrollment.findOne({
      subscriptionId: stripeSubscription.id,
    });
    if (!enrollment) return;

    enrollment.status = "canceled";
    enrollment.canceledAt = new Date();
    enrollment.cancelAtPeriodEnd = true;
    await enrollment.save();
  }

  async handleInvoicePaid(invoice) {
    if (!invoice.subscription || !invoice.amount_paid) return;

    const enrollment = await Enrollment.findOne({
      subscriptionId: invoice.subscription,
    });
    if (!enrollment) return;

    const alreadyLogged = enrollment.charges.some(
      (charge) => charge.invoiceId === invoice.id
    );
    if (alreadyLogged) return;

    const amountPaid = invoice.amount_paid / 100;
    const teacherShare = Number(
      (amountPaid * (1 - this.platformFee)).toFixed(2)
    );
    const platformFee = Number((amountPaid * this.platformFee).toFixed(2));

    const invoicePeriod = invoice.lines?.data?.[0]?.period;

    enrollment.charges.push({
      invoiceId: invoice.id,
      amount: amountPaid,
      currency: invoice.currency || enrollment.currency,
      teacherShare,
      platformFee,
      paidAt: this.updateDate(invoice.status_transitions?.paid_at, new Date())
    });

    enrollment.status = "active";
    enrollment.currentPeriodStart = this.updateDate(invoicePeriod?.start, new Date());
    enrollment.currentPeriodEnd = this.updateDate(invoicePeriod?.end, enrollment.currentPeriodEnd);

    await enrollment.save();

    await this.creditTeacher(enrollment.teacher, teacherShare);
    await this.ensureStudentInGroup(enrollment.group, enrollment.student);
  }

  async creditTeacher(teacherId, amount) {
    if (!amount) return;
    const teacherProfile = await TeacherProfile.findOne({ user: teacherId });
    if (!teacherProfile) return;

    teacherProfile.totalEarnings += amount;
    teacherProfile.pendingPayouts += amount;
    await teacherProfile.save();
  }

  
}

export default new EnrollmentService();
