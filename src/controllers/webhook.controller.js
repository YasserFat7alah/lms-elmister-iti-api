import stripe from "../config/stripe.js";
import Enrollment from "../models/Enrollment.js";
import Group from "../models/Group.js";
import TeacherProfile from "../models/users/TeacherProfile.js";
import { STRIPE_WEBHOOK_SECRET } from "../utils/constants.js";
import asyncHandler from 'express-async-handler';
import AppError from "../utils/app.error.js";

class WebhookController {
  
  handleWebhook = asyncHandler( async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    if (!STRIPE_WEBHOOK_SECRET) {
      throw AppError.internal("Stripe webhook secret is not configured");
    }
    
    try {
      event = stripe.webhooks.constructEvent(
        req.body, 
        sig,
        STRIPE_WEBHOOK_SECRET      
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
    
    // Handle checkout session completion (initial subscription creation)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await this.handleCheckoutCompleted(session);
    }
    
    // Handle recurring invoice payments
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      await this.handleInvoicePaid(invoice);
    }
    
    // Handle subscription updates
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      await this.handleSubscriptionUpdated(subscription);
    }
    
    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      await this.handleSubscriptionDeleted(subscription);
    }

    res.json({ received: true });
  });

  /** Handle checkout.session.completed - initial payment */
  handleCheckoutCompleted = asyncHandler(async (session) => {
    if (session.mode !== 'subscription') return;
    
    const { enrollmentId, groupId, studentId, teacherId } = session.metadata || {};
    
    if (!enrollmentId) {
      console.error("No enrollmentId in checkout session metadata");
      return;
    }

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      console.error("Enrollment not found:", enrollmentId);
      return;
    }

    // Update enrollment with subscription ID from checkout session
    enrollment.subscriptionId = session.subscription;
    enrollment.status = 'active';
    enrollment.transactionId = session.payment_intent;
    enrollment.paidAt = new Date();
    
    // Get subscription details to set period dates
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      enrollment.currentPeriodStart = subscription.current_period_start 
        ? new Date(subscription.current_period_start * 1000) 
        : null;
      enrollment.currentPeriodEnd = subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000) 
        : null;
    }
    
    await enrollment.save();

    // Add student to group
    if (groupId && studentId) {
      await Group.updateOne(
        { _id: groupId, students: { $ne: studentId } },
        { 
          $push: { students: studentId },
          $inc: { studentsCount: 1 } 
        }
      );
    }

    // Credit teacher for initial payment (10% platform fee)
    if (teacherId && session.amount_total) {
      const amountPaid = session.amount_total / 100;
      const platformFee = Number((amountPaid * 0.10).toFixed(2));
      const teacherShare = Number((amountPaid - platformFee).toFixed(2));

      // Log charge in enrollment
      enrollment.charges.push({
        invoiceId: session.payment_intent || `checkout_${session.id}`,
        amount: amountPaid,
        currency: session.currency || enrollment.currency,
        teacherShare,
        platformFee,
        paidAt: new Date(),
      });
      await enrollment.save();

      // Credit teacher (10% platform fee deducted)
      await TeacherProfile.updateOne(
        { user: teacherId },
        { 
          $inc: { 
            totalEarnings: teacherShare,
            pendingPayouts: teacherShare
          } 
        }
      );
    }
  });

  /** Handle invoice.payment_succeeded - recurring payments */
  handleInvoicePaid = asyncHandler(async (invoice) => {
    if (!invoice.subscription || !invoice.amount_paid) return;

    const enrollment = await Enrollment.findOne({
      subscriptionId: invoice.subscription,
    });
    
    if (!enrollment) {
      console.error("Enrollment not found for subscription:", invoice.subscription);
      return;
    }

    // Check if this invoice was already processed
    const alreadyLogged = enrollment.charges.some(
      (charge) => charge.invoiceId === invoice.id
    );
    if (alreadyLogged) return;

    const amountPaid = invoice.amount_paid / 100;
    const platformFee = Number((amountPaid * 0.10).toFixed(2));
    const teacherShare = Number((amountPaid - platformFee).toFixed(2));

    // Log charge
    enrollment.charges.push({
      invoiceId: invoice.id,
      amount: amountPaid,
      currency: invoice.currency || enrollment.currency,
      teacherShare,
      platformFee,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
    });

    // Update enrollment status and period
    enrollment.status = 'active';
    const invoicePeriod = invoice.lines?.data?.[0]?.period;
    if (invoicePeriod) {
      enrollment.currentPeriodStart = invoicePeriod.start 
        ? new Date(invoicePeriod.start * 1000) 
        : enrollment.currentPeriodStart;
      enrollment.currentPeriodEnd = invoicePeriod.end 
        ? new Date(invoicePeriod.end * 1000) 
        : enrollment.currentPeriodEnd;
    }
    
    await enrollment.save();

    // Credit teacher (10% platform fee deducted)
    await TeacherProfile.updateOne(
      { user: enrollment.teacher },
      { 
        $inc: { 
          totalEarnings: teacherShare,
          pendingPayouts: teacherShare
        } 
      }
    );

    // Ensure student is in group
    await Group.updateOne(
      { _id: enrollment.group, students: { $ne: enrollment.student } },
      { 
        $push: { students: enrollment.student },
        $inc: { studentsCount: 1 } 
      }
    );
  });

  /** Handle subscription updates */
  handleSubscriptionUpdated = asyncHandler(async (subscription) => {
    const enrollment = await Enrollment.findOne({
      subscriptionId: subscription.id,
    });
    
    if (!enrollment) return;

    enrollment.status = subscription.status;
    enrollment.currentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : enrollment.currentPeriodStart;
    enrollment.currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : enrollment.currentPeriodEnd;
    enrollment.cancelAtPeriodEnd = subscription.cancel_at_period_end;
    
    if (subscription.canceled_at) {
      enrollment.canceledAt = new Date(subscription.canceled_at * 1000);
    }
    
    await enrollment.save();
  });

  /** Handle subscription deletion */
  handleSubscriptionDeleted = asyncHandler(async (subscription) => {
    const enrollment = await Enrollment.findOne({
      subscriptionId: subscription.id,
    });
    
    if (!enrollment) return;

    enrollment.status = 'canceled';
    enrollment.canceledAt = new Date();
    enrollment.cancelAtPeriodEnd = true;
    
    await enrollment.save();
  });
}

export default new WebhookController();