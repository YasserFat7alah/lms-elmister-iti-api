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

    async handleEvent(event) {
        try {
            console.log(`🔔 Event received: ${event.type}`); // LOG
            
            switch (event.type) {
                case "checkout.session.completed":
                    await this.handleCheckoutCompleted(event.data.object);
                    break;

                case "invoice.payment_succeeded":
                    await this.handleInvoicePaid(event.data.object);
                    break;

                case "customer.subscription.deleted":
                case "customer.subscription.updated":
                    await this.handleSubscriptionUpdate(event.data.object);
                    break;

                case "checkout.session.expired":
                case "checkout.session.async_payment_failed":
                    await this.handleCheckoutCancelled(event.data.object);
                    break;

                default:
                    console.log(`Unhandled event type: ${event.type}`);
                    break;
            }
        } catch (error) {
            console.error(`❌ Error handling event ${event.type}:`, error.message);
            console.error(error.stack); // LOG STACK TRACE
        }
    }

    /* --- --- --- CORE LOGIC HANDLERS --- --- --- */

    /**
     * HANDLER 1: checkout.session.completed
     */
    async handleCheckoutCompleted(session) {
        // console.log("------------------------- CHECKOUT COMPLETED -----------------------------");

        // 1. Retrieve Subscription
        const subscription = await this.model.subscriptions.retrieve(session.subscription, {
            expand: ['latest_invoice']
        });

        if (!subscription || !subscription.latest_invoice) {
            console.error("Missing subscription or invoice in checkout session");
            return;
        }

        const invoice = subscription.latest_invoice;

        // 2. Validate Metadata
        const { enrollmentId, parentId, studentId, groupId } = session.metadata || {};
        if (!enrollmentId) {
            console.error("Missing enrollmentId in metadata");
            return;
        }

        // 3. Find Enrollment
        let enrollment = await Enrollment.findById(enrollmentId);
        if (!enrollment) {
            console.error(`Enrollment not found: ${enrollmentId}`);
            return;
        }

        if (enrollment.status === "active" && enrollment.subscriptionId === subscription.id) return;

        /* --- A. UPDATE ENROLLMENT (LINKING & DATES) --- */
        enrollment.subscriptionId = subscription.id;
        enrollment.status = subscription.status;
        enrollment.paidAt = new Date();
        
        // --- DATE LOGIC WITH FALLBACK (30 DAYS) ---
        const stripeStart = this.updateDate(subscription.current_period_start);
        const stripeEnd = this.updateDate(subscription.current_period_end);

        enrollment.currentPeriodStart = stripeStart || new Date(); // Fallback to now
        
        // If Stripe returns null OR if we want to force 30 days logic:
        if (stripeEnd) {
            enrollment.currentPeriodEnd = stripeEnd;
        } else {
            const thirtyDaysFromNow = new Date(enrollment.currentPeriodStart);
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            enrollment.currentPeriodEnd = thirtyDaysFromNow;
        }
        
        enrollment.cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
        enrollment.cancelAt = this.updateDate(subscription.cancel_at);
        enrollment.canceledAt = this.updateDate(subscription.canceled_at);
        await enrollment.save();

        /* --- B. UPDATE PARENT --- */
        if (parentId) {
            try {
                const customerId = subscription.customer || enrollment.customerId;
                await ParentProfile.findOneAndUpdate(
                    { user: parentId },
                    { customerId: customerId }
                );
            } catch (error) { console.error("Error linking parent:", error.message); }
        }

        /* --- C. ENSURE GROUP --- */
        await enrollmentService.ensureStudentInGroup(enrollment.group || groupId, enrollment.student || studentId);

        /* --- D. PROCESS FINANCIALS --- */
        if (invoice.status === 'paid') await this.processFinancials(invoice, enrollment, subscription);
    }

    /**
     * HANDLER 2: invoice.payment_succeeded
     */
    async handleInvoicePaid(invoice) {
        // Skip first invoice
        if (invoice.billing_reason === 'subscription_create') {
            return;
        }

        const subscriptionId = invoice.subscription;
        if (!subscriptionId) return;

        const enrollment = await Enrollment.findOne({ subscriptionId });
        if (!enrollment || !subscriptionId) return; // Skip

        // --- RENEWAL DATE LOGIC ---
        // Try to get period from invoice lines first
        const linePeriodEnd = invoice.lines?.data?.[0]?.period?.end;

        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        
        enrollment.currentPeriodEnd = this.updateDate(linePeriodEnd,nextMonth);
        enrollment.status = 'active';
        await enrollment.save();
        // console.log(`Enrollment Extended to: ${enrollment.currentPeriodEnd}`);

        // Pass subscription as object with ID for consistency
        const subscription = { id: subscriptionId, currency: invoice.currency }; 
        await this.processFinancials(invoice, enrollment, subscription);
    }

    /**
     * HANDLER 3: Subscription Updates
     */
    async handleSubscriptionUpdate(subscription) {
        
        const enrollment = await Enrollment.findOne({ subscriptionId: subscription.id });
        if (!enrollment) return;

        enrollment.status = subscription.status;
        enrollment.cancelAtPeriodEnd = subscription.cancel_at_period_end;
        enrollment.cancelAt = this.updateDate(subscription.cancel_at);
        enrollment.canceledAt = this.updateDate(subscription.canceled_at);

        await enrollment.save();
    }

    /**
     * HANDLER 4: Checkout Cancelled
     */
    async handleCheckoutCancelled(session) {
        if (session.mode !== 'subscription') return;
        
        const { enrollmentId } = session.metadata || {};
        if (!enrollmentId) return;

        const enrollment = await Enrollment.findById(enrollmentId);
        if (enrollment && enrollment.status === "incomplete") {
            enrollment.status = "incomplete_expired";
            enrollment.canceledAt = new Date();
            await enrollment.save();
            console.log("✅ Enrollment marked expired.");
        }
    }

    /* --- --- --- FINANCIAL LOGIC --- --- --- */

    /** process financials
     * @param invoice :
     * @param enrollment :
     * @param subscription : 
     * @param fee : platform fee -fraction ( default: 0.1 )
    async processFinancials(invoice, enrollment, subscription, fee=0.1) {
        try {
            const amountPaid = invoice.amount_paid / 100 || 0;
            const amountDue = invoice.amount_due / 100 || 0;
            const platformFee = Number((amountPaid * fee).toFixed(2));
            const teacherShare = Number((amountPaid - platformFee).toFixed(2));

            // Credit Teacher
            if (enrollment.teacher && teacherShare > 0) {
                try {
                    await enrollmentService.creditTeacher(enrollment.teacher, teacherShare);
                } catch (err) { 
                    // console.error("Error crediting teacher:", err.message);
                }
            }

            // --- INVOICE DATES FIX ---
            // Fix: If invoice start == end, calculate correct end date manually
            let dbPeriodStart = this.updateDate(invoice.period_start);
            let dbPeriodEnd = this.updateDate(invoice.period_end);

            if (dbPeriodStart && dbPeriodEnd && dbPeriodStart.getTime() === dbPeriodEnd.getTime()) {
                // console.log("⚠️ Invoice period start equals end. Adjusting DB invoice end date (+30 days).");
                // Clone date to avoid reference issues
                const adjustedEnd = new Date(dbPeriodStart.getTime());
                adjustedEnd.setDate(adjustedEnd.getDate() + 30);
                dbPeriodEnd = adjustedEnd;
            }
            
            // If we have subscription data (from checkout handler), prefer it
            if (subscription.current_period_end) {
                 dbPeriodEnd = this.updateDate(subscription.current_period_end);
            }

            // Log Invoice
            const invoiceRecord = await Invoice.create({
                stripeInvoiceId: invoice.id,
                stripeSubscriptionId: subscription.id,
                enrollment: enrollment._id,
                amount: amountDue,
                amountPaid: amountPaid,
                amountDue: amountDue,
                currency: invoice.currency,
                platformFee: platformFee,
                teacherShare: teacherShare,
                status: invoice.status,
                paidAt: this.updateDate(invoice.status_transitions?.paid_at, new Date()),
                periodStart: dbPeriodStart,
                periodEnd: dbPeriodEnd, // Using the fixed date
            });

            // console.log(`✅ Invoice logged: ${invoiceRecord._id}`);
        } catch (error) {
            console.error("❌ Error in processFinancials:", error.message);
        }
    }

    /* --- --- --- UTILITIES --- --- --- */

    updateDate(date, fallback = null) {
        return date ? new Date(date * 1000) : fallback;
    }
}

export default new WebhookService({ model: stripe });