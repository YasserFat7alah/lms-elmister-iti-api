import stripe from "../config/stripe.js";
import AppError from "../utils/app.error.js";
import Payout from "../models/Payout.js";
import TeacherProfile from "../models/users/TeacherProfile.js";
import { CLIENT_URL } from "../utils/constants.js";

const STATUS_TRANSITIONS = {
  pending: ["approved", "rejected", "paid"],
  approved: ["paid", "rejected"],
  paid: [],
  rejected: [],
};

class PayoutService {
  /** Request to pull cash 
   * @param {string} teacherId : Authenticated Teacher
   * @param {number} amount : Amount to request
   * @param {string} note : Additional note
   * @returns {Payout}
   * */
  async requestPayout(teacherId, amount, note) {
    if (!amount || amount <= 0) {
      throw AppError.badRequest("Amount must be greater than zero");
    }

    const teacherProfile = await TeacherProfile.findOne({ user: teacherId });
    if (!teacherProfile) {
      throw AppError.badRequest(
        "Complete your teacher profile before requesting payouts"
      );
    }

    // Check if teacher has enough pending payouts
    const pendingPayoutsCount = await Payout.countDocuments({
      teacher: teacherId,
      status: "pending"
    });

    if (pendingPayoutsCount >= 3) {
      throw AppError.badRequest("You have reached the maximum number of pending payouts");
    }
    const availableBalance = teacherProfile.balance || 0;
    if (availableBalance < amount) {
      throw AppError.badRequest(
        `Requested amount (${amount}) exceeds your available balance (${availableBalance})`
      );
    }

    teacherProfile.balance -= amount;
    await teacherProfile.save();

    const payout = await Payout.create({
      teacher: teacherId,
      requestedBy: teacherId,
      amount,
      currency: "usd",
      teacherNote: note,
      status: "pending"
    });

    return payout;
  }

  /** get all payouts for a teacher
   * @param {string} teacherId : Authenticated Teacher
   * @returns {Payout[]}
   * */
  async getTeacherPayouts(teacherId) {
    return Payout.find({ teacher: teacherId }).sort("-createdAt");
  }

  async getAll(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.from) query.createdAt = { $gte: filters.from };
    if (filters.to) query.createdAt = { $lte: filters.to };


    return Payout.find(query)
      .populate("teacher", "name email")
      .populate("approvedBy", "name email")
      .sort("-createdAt");
  }

  /** Admin update payout status ( Reject, Approve, Pay )
   * @param {string} payoutId : Payout ID
   * @param {string} adminId : Authenticated Admin
   * @param {object} payload : { status, adminNote, referenceIds, period }
   * @returns {Payout}
   * */
  async updateStatus(payoutId, adminId, status, note) {
    if (!status) throw AppError.badRequest("status is required");

    const payout = await Payout.findById(payoutId);
    if (!payout) throw AppError.notFound("Payout request not found");

    const allowedStatuses = STATUS_TRANSITIONS[payout.status] || [];
    if (!allowedStatuses.includes(status)) throw AppError.badRequest(`Cannot change payout from ${payout.status} to ${status}`);

    if (status === "rejected") {
      await this.restoreTeacherBalance(payout.teacher, payout.amount);
      payout.rejectedAt = payout.rejectedAt || new Date();
    };

    if (status === "paid") {
      if (payout.status === 'paid') return payout; // Already paid

      // Trigger Transfer
      const transfer = await this.processTransfer(payout);
      const isTest = process.env.STRIPE_SECRET_KEY?.includes('_test_') || String(process.env.STRIPE_SECRET_KEY).startsWith('sk_test_');
      const baseUrl = isTest ? 'https://dashboard.stripe.com/test' : 'https://dashboard.stripe.com';

      payout.transactionId = transfer.id;
      payout.transactionUrl = `${baseUrl}/transfers/${transfer.id}`;
      payout.paidAt = payout.paidAt || new Date();
    }

    payout.status = status;
    payout.approvedBy = adminId;
    payout.adminNote = note || status === "rejected" ? "Rejected" : "Approved";

    await payout.save();
    return payout;
  }

  /** Restore teacher balance
   * @param {string} teacherId : teacherId
   * @param {number} amount : Amount to restore
   * */
  async restoreTeacherBalance(teacherId, amount) {
    if (!amount) return;

    const teacherProfile = await TeacherProfile.findOne({ user: teacherId });
    if (!teacherProfile) return;

    teacherProfile.balance += amount;
    await teacherProfile.save();
  }

  /* --- --- --- STRIPE CONNECT --- --- --- */

  /** Create Connected Account
   * @param {string} teacherId
   * */
  async createConnectAccount(teacherId, email) {
    const teacherProfile = await TeacherProfile.findOne({ user: teacherId });
    if (!teacherProfile) throw AppError.notFound("Teacher profile not found");

    // Check if already exists
    if (teacherProfile.payoutAccount?.stripeAccountId) {
      return teacherProfile.payoutAccount.stripeAccountId;
    }

    const account = await stripe.accounts.create({
      type: 'express',
      email: email,
      capabilities: {
        transfers: { requested: true },
      },
    });

    teacherProfile.payoutAccount = teacherProfile.payoutAccount || {};
    teacherProfile.payoutAccount.stripeAccountId = account.id;
    await teacherProfile.save();

    return account.id;
  }

  /** Create Account Link (Onboarding)
   * @param {string} accountId
   * */
  async createAccountLink(accountId) {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${CLIENT_URL}/dashboard/teacher/payouts/onboarding-failed`,
      return_url: `${CLIENT_URL}/dashboard/teacher/payouts/onboarding-success`, // Frontend will call callback API
      type: 'account_onboarding',
    });
    return accountLink.url;
  }

  /** Check if account is fully onboarded */
  async checkOnboardingStatus(accountId) {
    const account = await stripe.accounts.retrieve(accountId);
    return account.charges_enabled && account.details_submitted;
  }

  /** Get onboarding status by teacherId */
  async getOnboardingStatus(teacherId) {
    const teacherProfile = await TeacherProfile.findOne({ user: teacherId });
    if (!teacherProfile || !teacherProfile.payoutAccount?.stripeAccountId) return false;
    return await this.checkOnboardingStatus(teacherProfile.payoutAccount.stripeAccountId);
  }

  /** Process Stripe Transfer */
  async processTransfer(payout) {
    const teacherProfile = await TeacherProfile.findOne({ user: payout.teacher });
    const destinationCheck = await this.checkOnboardingStatus(teacherProfile.payoutAccount?.stripeAccountId);

    if (!destinationCheck) {
      throw AppError.badRequest("Teacher Stripe account is not ready to receive funds.");
    }

    // Create Transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(payout.amount * 100), // cents
      currency: payout.currency,
      destination: teacherProfile.payoutAccount.stripeAccountId,
      metadata: {
        payoutId: payout._id.toString(),
        teacherId: payout.teacher.toString(),
      }
    });

    return transfer;
  }
}

export default new PayoutService();


