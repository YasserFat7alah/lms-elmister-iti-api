import jwt from "jsonwebtoken";
import User from "../models/users/User.js";
import AppError from "../utils/app.error.js";
import BaseService from "./base.service.js";
import {
  ACCESS_COOKIE_SETTINGS,
  JWT_ACCESS_EXPIRE,
  JWT_REFRESH_EXPIRE,
  JWT_REFRESH_SECRET,
  JWT_SECRET,
  REFRESH_COOKIE_SETTINGS,
} from "../utils/constants.js";
import TeacherProfile from "../models/users/TeacherProfile.js";
import StudentProfile from "../models/users/StudentProfile.js";
import ParentProfile from "../models/users/ParentProfile.js";
import { emitNotification } from "../config/socket/index.js";
import notificationService from "./notification.service.js";

export class AuthService extends BaseService {
  constructor(userModel) {
    super(userModel);
  }

  /* --- --- --- JWT --- --- --- */

  /** Generate Access Token
   * @param {string} userId - The ID of the user
   * @param {string} secret - The secret key for signing the token
   * @param {string} expiresIn - The expiration time for the token
   * @returns {string} The generated access token
   */
  generateToken(user, secret = JWT_SECRET, expiresIn = JWT_ACCESS_EXPIRE) {
    return jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn });
  }

  /** Generate Access and Refresh Tokens
   * @param {string} userId - The ID of the user
   * @returns {object} An object containing the access and refresh tokens
   */
  generateTokens(user) {
    return {
      accessToken: this.generateToken(user, JWT_SECRET, JWT_ACCESS_EXPIRE),
      refreshToken: this.generateToken(
        user,
        JWT_REFRESH_SECRET,
        JWT_REFRESH_EXPIRE
      ),
    };
  }

  /** Verify Token
   * @param {string} token - The token to verify
   * @returns {object} The decoded token payload
   * @throws {AppError} If the token is invalid or expired
   */
  verifyToken(token, secret) {
    try {
      return jwt.verify(token, secret);
    } catch {
      throw AppError.unauthorized("Invalid or expired token");
    }
  }

  /* --- --- --- User Registration and Login --- --- --- */

  /** Register a new user
   * @param {object} userData - The user data for registration
   * @returns {object} An object containing the sanitized user and tokens
   */
  async register(userData) {
    const { email } = userData;
    // Check if user exists
    const existingUser = await this.model.findOne({ email });
    if (existingUser) {
      throw AppError.conflict("Email already Registered, try logging in.");
    }
    const allowedFields = [
      "name",
      "email",
      "password",
      "age",
      "role",
      "gradeLevel",
      "parentId",
      "specialization",
      "phone",
    ];
    const data = {};
    for (const key of allowedFields) {
      if (userData[key] !== undefined) {
        data[key] = userData[key];
      }
    }
    //create user
    const newUser = await super.create(data);

    // notify admins
    const notification = await notificationService.notifyAdmins({
      title: "New User Registration",
      message: `${newUser.name} registered as ${newUser.role}`,
      type: "NEW_USER",
      actor: newUser?._id,
      refId: newUser?._id,
      refCollection: "users"
    });

    //emit to admin sockets
    emitNotification({
      receiverRole: "admin",
      notification
    });
    //generate tokens
    const { accessToken, refreshToken } = this.generateTokens(newUser);

    return {
      user: this.sanitize(newUser),
      accessToken,
      refreshToken,
    };
  }

  /** Login a user
   * @param {string} email - The user's email
   * @param {string} password - The user's password
   * @returns {object} An object containing the sanitized user and tokens
   */
  async login(email, password) {
    const user = await this.model.findOne({ email }).select("+password");
    if (!user) {
      throw AppError.unauthorized("Invalid email or password.");
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      throw AppError.unauthorized("Invalid email or password.");
    }

    // Populate profile data based on role
    let query = this.model.findById(user._id);
    const role = user.role;

    if (role === "teacher") query = query.populate("teacherData");
    else if (role === "student") query = query.populate("studentData");
    else if (role === "parent") {
      query = query.populate({
        path: "parentData",
        populate: { path: "children", select: "name avatar username gradeLevel" }
      });
    }

    let userObj = await query.lean();

    // Flatten profile data
    if (userObj[`${role}Data`]) {
      userObj = {
        ...userObj,
        ...userObj[`${role}Data`],
        isProfileCompleted: true
      };
      delete userObj[`${role}Data`];
    }

    const { accessToken, refreshToken } = this.generateTokens(user);
    return {
      user: this.sanitize(userObj),
      accessToken,
      refreshToken,
    };
  }

  /** Complete User Profile
   * @param {string} userId - ID of the user
   * @param {string} role - Role of the user (teacher, student, parent)
   * @param {object} data - Profile data from request body
   */
  async completeProfile(userId, role, data) {
    let profileExists = false;
    if (role === "teacher") profileExists = await TeacherProfile.findOne({ user: userId });
    else if (role === "student") profileExists = await StudentProfile.findOne({ user: userId });
    else if (role === "parent") profileExists = await ParentProfile.findOne({ user: userId });

    if (profileExists) throw AppError.badRequest(`Your ${role} profile is already completed.`);


    if (role === "teacher") {
      await TeacherProfile.create({
        user: userId,
        bio: data.bio,
        subjects: data.subjects,
        qualifications: data.qualifications,
      });

    } else if (role === "student") {
      const grade = data.gradeLevel || data.grade;
      await StudentProfile.create({
        user: userId,
        grade: grade,
        parent: data.parent,
      });

    } else if (role === "parent") {
      await ParentProfile.create({
        user: userId,
        address: data.address,
        phone: data.phone,
        children: data.children
      });
    }

    let user = await this.model.findById(userId).populate(`${role}Data`).lean();

    if (user[`${role}Data`]) {
      user = {
        ...user,
        ...user[`${role}Data`],
        isProfileCompleted: true
      };
      delete user[`${role}Data`];
    }

    return this.sanitize(user);
  }

  /* --- --- --- Password Management --- --- --- */

  /** Change User Password
   * @param {string} userId - The ID of the user
   * @param {string} currentPassword - The current password
   * @param {string} newPassword - The new password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.model.findById(userId).select("+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw AppError.unauthorized("Current password is incorrect");

    const updatedUser = await super.updatePassword(user._id, newPassword);
    return updatedUser;
  }

  /** Reset User Password
   * @param {string} email - The user's email
   * @param {string} otp - The one-time password
   * @param {string} newPassword - The new password
   */
  async resetPassword(email, otp, newPassword) {
    let user = await this.findOne({ email }, "+password +otp +otpExpiry");
    if (!user) throw AppError.notFound("User not found");

    if (!otp || !user.otp || user.otpExpiry < Date.now() || user.otp !== otp)
      throw AppError.unauthorized("Invalid or expired OTP");

    user = await super.updateById(user._id, { otp: null, otpExpiry: null });
    user = await super.updatePassword(user._id, newPassword);

    return this.sanitize(user);
  }

  /** Refresh Access and Refresh Tokens
   * @param {string} refreshToken - The refresh token
   * @returns {object} An object containing the user and new tokens
   */
  async refreshTokens(refreshToken) {
    const decoded = this.verifyToken(refreshToken, JWT_REFRESH_SECRET);
    const user = await this.findById(decoded.id);
    if (!user) throw AppError.unauthorized("User not found");

    const tokens = this.generateTokens(user);
    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /* --- --- --- Cookies --- --- --- */

  /** Set the refresh token cookie with appropriate options
   * @param {object} res - The Express response object
   * @param {string} refreshToken - The refresh token to set in the cookie
   */
  setRefreshCookie(res, refreshToken) {
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_SETTINGS);
  }

  /** Clear the refresh token cookie
   * @param {object} res - The Express response object
   */
  clearRefreshCookie(res) {
    res.clearCookie("refreshToken", REFRESH_COOKIE_SETTINGS);
  }

  /** Set the access token cookie with appropriate options
   * @param {object} res - The Express response object
   * @param {string} accessToken - The access token to set in the cookie
   */
  setAccessCookie(res, accessToken) {
    res.cookie("accessToken", accessToken, ACCESS_COOKIE_SETTINGS);
  }

  /** Clear the access token cookie
   * @param {object} res - The Express response object
   */
  clearAccessCookie(res) {
    res.clearCookie("accessToken", ACCESS_COOKIE_SETTINGS);
  }

  /* --- --- --- Email Verification --- --- --- */

  /** Verify email token
   * @param {string} token - The verification token
   * @returns {object} The user with verified email
   */
  async verifyEmailToken(token) {
    const decoded = this.verifyToken(token, JWT_SECRET);
    const user = await this.findById(decoded.id);

    if (user.emailVerified) {
      throw AppError.badRequest("Email already verified");
    }

    user.emailVerified = true;
    await user.save();

    return this.sanitize(user);
  }

  /* --- --- --- OAuth --- --- --- */

  /** Handle Oauth login/registration
   * @param {object} user - The user object from Passport
   * @returns {object} An object containing the sanitized user and tokens
   */
  async handleOauthLogin({ provider, providerId, email, name, avatar }) {
    if (!provider || !providerId || !email) {
      throw AppError.badRequest("OAuth authentication failed - missing data.");
    }

    // Try to find provider
    let user = await this.model.findOne({
      $or: [
        { provider, providerId },
        {
          "linkedProviders.provider": provider,
          "linkedProviders.providerId": providerId,
        },
      ],
    });

    if (user) {
      const tokens = this.generateTokens(user);
      return {
        user: this.sanitize(user),
        ...tokens,
      };
    }

    // check if email exists in database
    user = await this.model.findOne({ email });
    if (user) {
      const tokens = this.generateTokens(user);
      const updated = await this.linkOAuthProvider(
        user._id.toString(),
        provider,
        providerId
      );
      return {
        user: this.sanitize(updated),
        ...tokens,
      };
    }

    user = await this.create({
      provider,
      providerId,
      email,
      name,
      avatar,
    });

    const tokens = this.generateTokens(user);

    return {
      user: this.sanitize(user),
      ...tokens,
    };
  }

  /** Link Oauth provider to existing account
   * @param {string} userId - The ID of the user
   * @param {string} provider - The OAuth provider name
   * @param {string} providerId - The provider's user ID
   * @returns {object} The updated user
   */
  async linkOAuthProvider(userId, provider, providerId) {
    const user = await this.findById(userId);

    // Check if provider is already linked
    const isLinked = user.linkedProviders?.some(
      (lp) => lp.provider === provider
    );
    if (isLinked)
      throw AppError.conflict(`${provider} account is already linked`);

    // Check if another user has this provider ID
    const existingUser = await this.model.findOne({
      $or: [
        { providerId, provider },
        {
          "linkedProviders.providerId": providerId,
          "linkedProviders.provider": provider,
        },
      ],
    });

    if (existingUser && existingUser._id.toString() !== userId) {
      throw AppError.conflict(
        `This ${provider} account is already linked to another user`
      );
    }

    // Add to linked providers
    user.linkedProviders = user.linkedProviders || [];

    user.linkedProviders.push({
      provider,
      providerId,
      linkedAt: new Date(),
    });

    await user.save();
    return this.sanitize(user);
  }

  /** Unlink Oauth provider from account
   * @param {string} userId - The ID of the user
   * @param {string} provider - The OAuth provider name
   * @returns {object} The updated user
   */
  async unlinkOauthProvider(userId, provider) {
    const user = await this.findById(userId);

    if (user.provider === provider && !user.password) {
      throw AppError.badRequest(
        "Cannot unlink primary provider. Please set a password first."
      );
    }

    if (!user.linkedProviders) return this.sanitize(user);
    if (user.provider === provider) {
      user.provider = null;
      user.providerId = null;
      await user.save();
    }

    // Remove from linked providers
    if (user.linkedProviders) {
      user.linkedProviders = user.linkedProviders.filter(
        (lp) => lp.provider !== provider
      );
      await user.save();
    }

    return this.sanitize(user);
  }

  /* --- --- --- Utilities --- --- --- */

  /** Generate OTP
   * @param {number} expiry - The expiration time in minutes
   * @returns {object} An object containing the OTP and its expiration time
   */
  generateOTP(expiry = 5) {
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiry = Date.now() + expiry * 60 * 1000;

    return { otp, otpExpiry };
  }
}

export default new AuthService(User);
