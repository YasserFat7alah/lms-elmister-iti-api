import User from "../models/User.js";
import BaseService from "./base.service.js";
import cloudinaryService from "./cloudinary.service.js";



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

    async uploadAvatar(userId, avatarFile) {
        let user = await this.findById(userId);
        let avatar = user.avatar || null;
        if (avatarFile) {
            if (avatar) 
                await cloudinaryService.delete(avatar.publicId, avatar.type);

            const uploadResult = await cloudinaryService.upload(avatarFile, "users/avatars/");
            avatar = {
                ...uploadResult
            };
        }
        return avatar;
    }

    /** Update user profile
     * @param {string} userId - The ID of the user
     * @param {object} payload - The profile data to update 
     * @returns {object} The updated user profile
     * @throws {AppError} If no valid fields are provided or user is not found
     */
    async updateMe(userId, data = {}, avatarFile) {
        const user = await super.findById(userId);
        let avatar = user.avatar;

        if (avatarFile) {
            if (avatar?.publicId) { 
                await cloudinaryService.delete(avatar.publicId, avatar.type);
            }
            const uploadResult = await cloudinaryService.upload(avatarFile, "users/avatars/");
            avatar = {
                ...uploadResult
            };
        }
    
        const updatedUser = await this.updateById(userId, { ...data, avatar }, { new: true });
    
    return this.sanitize(updatedUser);
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

export default new UserService(User);