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

    /** Upload user avatar
     * @param {string} userId - The ID of the user
     * @param {object} avatarFile - The avatar file to upload
     * @returns {object} The uploaded avatar details
     */
    async uploadAvatar(userId, avatarFile) {
        const user = await this.findById(userId);
        if (!user) throw new AppError('User not found', 404);

        let newAvatarData = null; 

        if (avatarFile) {
            if (user.avatar?.publicId) {
                await cloudinaryService.delete(user.avatar.publicId, user.avatar.type);
            }

            const uploadResult = await cloudinaryService.upload(avatarFile, "users/avatars/");
            
            newAvatarData = {
                ...uploadResult
            };
        }
        return newAvatarData;
    }

    /** delete user avatar
     * @param {string} userId - The ID of the user
     */
    async deleteAvatar(userId) {
        let user = await this.findById(userId);
        let avatar = user.avatar || null;
        if (avatar?.publicId) {
            await cloudinaryService.delete(avatar.publicId, avatar.type);
            avatar = null;
            await this.updateById(userId, { avatar });
        }
    }

    /** Update user profile
     * @param {string} userId - The ID of the user
     * @param {object} payload - The profile data to update 
     * @returns {object} The updated user profile
     * @throws {AppError} If no valid fields are provided or user is not found
     */
    async updateMe(userId, data = {}, avatarFile) {
        let newAvatar = null; 
        if (avatarFile) {
            newAvatar = await this.uploadAvatar(userId, avatarFile);
        }
    
        const updatePayload = { ...data };
        
        if (newAvatar) {
            updatePayload.avatar = newAvatar;
        }

        const updatedUser = await this.updateById(userId, updatePayload, { new: true });
    
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