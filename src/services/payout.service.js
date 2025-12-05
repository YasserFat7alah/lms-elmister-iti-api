import AppError from "../utils/app.error.js";
import Payout from "../models/Payout.js";
import TeacherProfile from "../models/users/TeacherProfile.js";

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
    const availableBalance = teacherProfile.pendingPayouts || 0;
    if (availableBalance < amount) {
      throw AppError.badRequest(
        `Requested amount (${amount}) exceeds your available balance (${availableBalance})`
      );
    }

    teacherProfile.pendingPayouts -= amount;
    await teacherProfile.save();

    const payout = await Payout.create({
      teacher: teacherId,
      requestedBy: teacherId,
      amount,
      currency: "usd",
      teacherNote: note,
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
    if (filters.status) {
      query.status = filters.status;
    }

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
  async updateStatus(payoutId, adminId, payload = {}) {
    const { status, adminNote } = payload;
    if (!status) throw AppError.badRequest("status is required");

    const payout = await Payout.findById(payoutId);
    if (!payout) throw AppError.notFound("Payout request not found");

    const allowedStatuses = STATUS_TRANSITIONS[payout.status] || [];
    if (!allowedStatuses.includes(status)) throw AppError.badRequest( `Cannot change payout from ${payout.status} to ${status}`);
    
    if (status === "rejected"){
       await this.restoreTeacherBalance(payout.teacher, payout.amount);
       payout.rejectedAt = payout.rejectedAt || new Date();
      };

    if (status === "paid") payout.paidAt = payout.paidAt || new Date();
    
    payout.status = status;
    payout.approvedBy = adminId;
    payout.adminNote = adminNote || status === "rejected" ? "Rejected" : "Approved";

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

    teacherProfile.pendingPayouts += amount;
    await teacherProfile.save();
  }
}

export default new PayoutService();


