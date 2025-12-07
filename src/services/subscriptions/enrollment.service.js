import stripe from "./../../config/stripe.js";
import BaseService from "../base.service.js";
import AppError from "../../utils/app.error.js";
import paymentService from "../payment.service.js";
import { CLIENT_URL } from "../../utils/constants.js";

/* --- --- --- MODELS --- --- --- */
import User from "../../models/users/User.js";
import Group from "../../models/Group.js";
import Enrollment from "../../models/Enrollment.js";
import ParentProfile from "../../models/users/ParentProfile.js";
import StudentProfile from "../../models/users/StudentProfile.js";
import TeacherProfile from "../../models/users/TeacherProfile.js";

class EnrollmentService extends BaseService {
  constructor(model) {
    super(model);
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
      course: group.courseId._id,
    });
    if (enrollment && enrollment.status === "active") {
      throw AppError.conflict(
        "This student already has an active subscription for this course"
      );
    }
    const parentProfile = await this.getParentProfile(parentId);
    const stripeCustomerId = await paymentService.getCustomerId(parent, parentProfile);
    const stripePriceId = await paymentService.getPriceId(group);
    
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
        courseId: group.courseId?._id.toString()
      },
    });

    // Store checkout session ID temporarily (will be replaced with subscription ID on completion)
    enrollment.checkoutSessionId = session.id;
    enrollment.subscriptionId = enrollment.subscriptionId || null;
    await enrollment.save()
    
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
    const enrollments = this.model.find({ parent: parentId })
      .sort("-createdAt")
      .populate("group", "title startingDate startingTime")
      .populate("student", "name email");

    return enrollments;
  }

  /** List all enrollments for a student
   * @param {string} studentId
   * @returns {Enrollment[]}
   * */
  async listByStudent(studentId) {
    const enrollments = await this.model.find({ 
            student: studentId, 
            status: { $in: ['active', 'trialing'] } 
        })
        .populate('group')
        .select('group course status');

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
    teacherProfile.balance += amount;
    await teacherProfile.save();
  }
  
}

export default new EnrollmentService(Enrollment);
