


class UserController {
    constructor(userService) {
        this.userService = userService;
    }  

    // Upload avatar
    async uploadAvatar(req, res, next) {
        try {
            const userId = req.user.id;
            const file = req.file;
            if (!file) {
                throw AppError.badRequest('No file uploaded');
            }
            const updatedUser = await this.userService.uploadAvatar(userId, file);
            res.status(200).json(updatedUser);
        } catch (error) {
            next(error);
        }
    }

}

export default UserController;