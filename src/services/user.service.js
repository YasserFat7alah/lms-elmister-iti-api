import BaseService from "./base.service";



class UserService extends BaseService {
    constructor(User) {
        super(User);
    }
/* --- --- --- User Profile --- --- --- */
    /** Get current user profile
     * @param {string} userId - The ID of the user
     * @returns {object} The user profile
     * @throws {AppError} If the user is not found
     */
    async getMe(userId) {
        let user = await this.findById(userId);
        user = this.sanitize(user);
        return user;
    }

    


/* --- --- --- PASSWORD MANAGEMENT --- --- --- */

    /** Change password for a user
     * @param {string} userId - The ID of the user
     * @param {string} currentPassword - The current password of the user   
     * @param {string} newPassword - The new password to set
     * @throws {AppError} If the user is not found or the current password is incorrect
     */
    async changePassword(userId, currentPassword, newPassword) {

        const user = await this.findById(userId, '+password');

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch)  throw AppError.unauthorized('Current password is incorrect');

        user.password = newPassword;
        await user.save();
    }


}

export default new UserService();