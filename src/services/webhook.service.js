import stripe from "../config/stripe.js";
import Enrollment from "../models/Enrollment.js";
import Invoice from "../models/financial/Invoice.js";
import ParentProfile from "../models/users/ParentProfile.js";
import TeacherProfile from "../models/users/TeacherProfile.js";
import AppError from "../utils/app.error.js";
import { STRIPE_WEBHOOK_SECRET } from "../utils/constants.js";
import paymentService from "./payment.service.js";
import enrollmentService from "./subscriptions/enrollment.service.js";

class WebhookService {
    constructor({ model }) {
        this.model = model;
    }

    /* --- --- --- EVENT INITIALIZATION --- --- --- */

    /** Constructs an event from a raw body and signature.
     * @param {string} signature : The Stripe signature
     * @param {string} rawBody : The raw body
     * @returns {object} : The Stripe event object
     * */
    constructEvent(signature, rawBody) {
        if (!STRIPE_WEBHOOK_SECRET)
            throw AppError.internal(
                "Stripe webhook secret is not configured in environment variables"
            );

        return this.model.webhooks.constructEvent(
            rawBody,
            signature,
            STRIPE_WEBHOOK_SECRET
        );
    }

    /* --- --- --- EVENT HANDLING --- --- --- */

    /** handles an event from the webhook
     * @param {object} event : The event object
     * */
    async handleEvent(event) {
        switch (event.type) {

            case 'charge.succeeded':
                console.log(event.data);
                
                break;

            // Handle checkout session completed
            case "checkout.session.completed":
                await this.handleCheckoutCompleted(event.data.object);
                break;

            // Handle checkout session expired (user clicked back/cancel)
            case "checkout.session.expired":
            case "checkout.session.async_payment_failed":
                await this.handleCheckoutCancelled(event.data.object);
                break;

            // Handle subscription updates
            // case "customer.subscription.updated":
            //     console.log('customer updated');
            //     await this.syncSubscription(event.data.object);
                
            //     break;
            // case "customer.subscription.created":
            //     console.log('customer created');
            //     await this.syncSubscription(event.data.object);
            //     break;

            // Handle subscription cancellation
            case "customer.subscription.deleted":
                await this.markSubscriptionCancelled(event.data.object);
                break;
            
            // Handle payment completed
            case "invoice.payment_succeeded":
                await this.handleInvoicePaid(event.data.object);
                break;

            // Handle recurring invoice payments
            // case "invoice_payment.paid":
            //     await this.handleInvoicePaid(event.data.object);
            //     break;

            // Unhandled event
            default:
                console.log(`Unhandled event type: ${event.type}`);
                break;
        }
    }

    /* --- --- --- EVENT HANDLERS --- --- --- */

    async syncSubscription(subscription) {
        console.log(
            "-------------------------subscription updated----------------------------\n",
            subscription
        );

        const enrollment = await Enrollment.findOne({ subscriptionId: subscription.id });
            if (!enrollment) return console.error("Enrollment not found for subscription:", subscription.id);

            enrollment.currentPeriodStart = this.updateDate(subscription.current_period_start, enrollment.currentPeriodStart);
            enrollment.currentPeriodEnd = this.updateDate(subscription.current_period_end, enrollment.currentPeriodEnd);
            enrollment.cancelAtPeriodEnd = subscription.cancel_at_period_end;
            enrollment.canceledAt = this.updateDate(subscription.canceled_at, enrollment.canceledAt);

            await enrollment.save();

        if (subscription.status === "canceled") {
            enrollment.canceledAt = new Date();
            enrollment.cancelAtPeriodEnd = true;
        }

        if (subscription.status === "incomplete_expired") {
            enrollment.canceledAt = new Date();
            enrollment.cancelAtPeriodEnd = true;
        }

        await enrollment.save();

        console.log(enrollment);
    }

    async handleCheckoutCompleted(session) {
        console.log(
            "-------------------------checkout session completed-----------------------------"
        );

        console.log(session.metadata);
        console.log('--------------------------------------------');
        console.log(session.subscription);
        console.log('--------------------------------------------');
        // Only handle subscription checkout sessions
        // if (session.mode !== 'subscription') return;

        

        const { enrollmentId, parentId, studentId } = session.metadata || {};
        if (!enrollmentId || !parentId || !studentId) {
            console.error("Missing enrollmentId or parentId or studentId in checkout session metadata");
            return;
        }

        // Find enrollment by subscriptionId (which was set to session.id initially)
        let enrollment = await Enrollment.findOne({ 
            $or: [ { subscriptionId: session.id }, { _id: enrollmentId } ]
        });

        if (!enrollment) {
            console.error("Enrollment not found for checkout session:", session.id);
            return;
        }

        // If already processed, skip
        if (enrollment.status === "active" && enrollment.subscriptionId !== session.id) {
            return;
        }

        // Update enrollment with subscription ID from checkout session
        enrollment.subscriptionId = session.subscription;
        enrollment.status = "active";
        enrollment.transactionId = session.payment_intent;
        enrollment.paidAt = new Date();

        // Get subscription details to set period dates
        if (session.subscription) {
            try {
                const subscription = await this.model.subscriptions.retrieve(session.subscription);
                enrollment.currentPeriodStart = this.updateDate(
                    subscription.current_period_start, 
                    enrollment.currentPeriodStart
                );
                enrollment.currentPeriodEnd = this.updateDate(
                    subscription.current_period_end, 
                    enrollment.currentPeriodEnd
                );
            } catch (error) {
                console.error("Error retrieving subscription:", error);
            }
        }

        console.log(enrollment);
        console.log('--------------------------------------------');

        await enrollment.save();

        // Add remaining amount to parent cash
        const parentProfile = await ParentProfile.findOne({ user: parentId });
        if (parentProfile) {
            
            // Save payment method from the checkout session
            try {
                const customerId = session.customer || enrollment.customerId;
                if (customerId) {
                    // Get payment method from payment intent if available
                    let paymentMethodId = null;
                    if (session.payment_intent) {
                        try {
                            const paymentIntent = await this.model.paymentIntents.retrieve(session.payment_intent);
                            paymentMethodId = paymentIntent.payment_method;
                        } catch (error) {
                            console.error("Error retrieving payment intent:", error);
                        }
                    }

                    // If no payment method from payment intent, get from subscription
                    if (!paymentMethodId && session.subscription) {
                        try {
                            const subscription = await this.model.subscriptions.retrieve(session.subscription);
                            paymentMethodId = subscription.default_payment_method || subscription.default_source;
                        } catch (error) {
                            console.error("Error retrieving subscription:", error);
                        }
                    }

                    // If still no payment method, list customer's payment methods
                    if (!paymentMethodId) {
                        try {
                            const paymentMethods = await this.model.paymentMethods.list({
                                customer: customerId,
                                type: 'card',
                            });

                            if (paymentMethods.data && paymentMethods.data.length > 0) {
                                paymentMethodId = paymentMethods.data[0].id;
                            }
                        } catch (error) {
                            console.error("Error listing payment methods:", error);
                        }
                    }

                    // Save payment method to parent profile
                    if (paymentMethodId) {
                        parentProfile.stripe = parentProfile.stripe || {};
                        parentProfile.stripe.payment = parentProfile.stripe.payment || [];
                        
                        // Add payment method if not already saved
                        if (!parentProfile.stripe.payment.includes(paymentMethodId)) {
                            parentProfile.stripe.payment.push(paymentMethodId);
                        }

                        // Set as default if not already set
                        if (!parentProfile.stripe.defaultPaymentMethodId) {
                            parentProfile.stripe.defaultPaymentMethodId = paymentMethodId;
                        }
                    }
                }
            } catch (error) {
                console.error("Error saving payment method:", error);
            }

            await parentProfile.save();
        }

        // Ensure student is in group
        if (enrollment.group && enrollment.student) {
            await enrollmentService.ensureStudentInGroup(enrollment.group, enrollment.student);
        }

        console.log("Checkout session completed successfully:", session.id);
    }

    async handleCheckoutCancelled(session) {
        console.log(
            "-------------------------checkout session cancelled/expired-----------------------------"
        );

        // Only handle subscription checkout sessions
        if (session.mode !== 'subscription') return;

        const { enrollmentId } = session.metadata || {};
        if (!enrollmentId) {
            console.error("Missing enrollmentId in checkout session metadata");
            return;
        }

        // Find enrollment
        const enrollment = await Enrollment.findOne({ 
            $or: [
                { subscriptionId: session.id },
                { _id: enrollmentId }
            ]
        });

        if (!enrollment) {
            console.error("Enrollment not found for checkout session:", session.id);
            return;
        }

        // Mark enrollment as incomplete_expired if it's still incomplete
        if (enrollment.status === "incomplete") {
            enrollment.status = "incomplete_expired";
            enrollment.canceledAt = new Date();
            await enrollment.save();
        }

        // Expire the session in Stripe (if not already expired)
        try {
            await this.model.checkout.sessions.expire(session.id);
            console.log("Checkout session expired:", session.id);
        } catch (error) {
            // Session might already be expired, ignore error
            console.log("Session already expired or error expiring:", error.message);
        }

        console.log("Checkout session cancelled/expired:", session.id);
    }

    async handleInvoicePaid(invoice) {
        console.log(
            "-------------------------invoice paid-------------------------"
        );
        console.log(invoice.parent.subscription_details.subscription);
        console.log('--------------------------------------------');
        
        const subscriptionId = invoice.parent.subscription_details.subscription;
        // Validate invoice has required data
        if (!subscriptionId || !invoice.amount_paid) {
            console.log("Invoice missing subscription or amount_paid");
            return;
        }

        // Check if invoice is fully paid
        const isFullyPaid = invoice.status === 'paid' && 
                           invoice.amount_paid >= invoice.amount_due;

        if (!isFullyPaid) {
            console.log("Invoice not fully paid yet:", invoice.id);
            return;
        }

        // Find enrollment by subscription ID
        const enrollment = await Enrollment.findOne({
            subscriptionId,
        });

        if (!enrollment) {
            console.error("Enrollment not found for subscription:", subscriptionId);
            return;
        }

        // Check if this invoice was already processed
        const alreadyLogged = enrollment.charges.some( (charge) => charge.invoiceId === invoice.id );
        if (alreadyLogged) {
            console.log("Invoice already processed:", invoice.id);
            return;
        }

        // Calculate amounts
        const amountPaid = invoice.amount_paid / 100 || 0; // Convert from cents
        const amountDue = invoice.amount_due ? invoice.amount_due / 100 : amountPaid;
        const platformFeeRate = 0.1; // 10% platform fee
        const platformFee = Number((amountPaid * platformFeeRate).toFixed(2));
        const teacherShare = Number((amountPaid - platformFee).toFixed(2));

        // Get invoice period
        const invoicePeriod = invoice.lines?.data?.[0]?.period;

        // Update enrollment charges
        enrollment.charges.push({
            invoiceId: invoice.id,
            amount: amountPaid,
            currency: invoice.currency || enrollment.currency,
            teacherShare,
            platformFee,
            paidAt: this.updateDate(invoice.status_transitions?.paid_at, new Date()),
        });

        // Update enrollment status and period
        enrollment.status = "active";
        enrollment.currentPeriodStart = this.updateDate(
            invoicePeriod?.start, 
            enrollment.currentPeriodStart || new Date()
        );
        enrollment.currentPeriodEnd = this.updateDate(
            invoicePeriod?.end, 
            enrollment.currentPeriodEnd
        );

        await enrollment.save();

        // Log invoice in Invoice model
        try {
            const invoiceRecord = await Invoice.findOneAndUpdate(
                { stripeInvoiceId: invoice.id },
                {
                    stripeInvoiceId: invoice.id,
                    stripeSubscriptionId: invoice.subscription,
                    enrollment: enrollment._id,
                    teacher: enrollment.teacher,
                    parent: enrollment.parent,
                    student: enrollment.student,
                    amount: amountDue,
                    amountPaid: amountPaid,
                    amountDue: amountDue,
                    currency: invoice.currency || enrollment.currency,
                    platformFee: platformFee,
                    teacherShare: teacherShare,
                    status: "paid",
                    paidAt: this.updateDate(invoice.status_transitions?.paid_at, new Date()),
                    periodStart: this.updateDate(invoicePeriod?.start, null),
                    periodEnd: this.updateDate(invoicePeriod?.end, null),
                },
                { upsert: true, new: true }
            );

            console.log("Invoice logged:", invoiceRecord._id);
        } catch (error) {
            console.error("Error logging invoice:", error);
        }

        // Add money to teacher balance (after 10% platform fee)
        try {
            await enrollmentService.creditTeacher(enrollment.teacher, teacherShare);
        } catch (error) {
            console.error("Error updating teacher balance:", error);
        }

        // Ensure student is in group
        if (enrollment.group && enrollment.student) {
            await enrollmentService.ensureStudentInGroup(enrollment.group, enrollment.student);
        }

        console.log("Invoice paid and processed successfully:", invoice.id);
    }

    

    async markSubscriptionCancelled(subscription) {
        console.log(
            "-------------------------subscription cancelled----------------------------"
        );
        console.log("Subscription cancelled:", subscription);
    }

    /* --- --- --- HELPERS --- --- --- */

    /** Format Stripe Date
     * @param {number} date - Unix timestamp
     * @param {Date} fallback - Fallback date
     * @returns {Date} Date object
     * */
    updateDate(date, fallback = null) {
        return date ? new Date(date * 1000) : fallback;
    }
}

export default new WebhookService({ model: stripe });
