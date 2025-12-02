import transporter from "../config/nodemailer.js";
import { SENDER_EMAIL } from "../utils/constants.js";
import MailTemplates from "../utils/mail.templates.js";

export class MailService {
  constructor(transporter) {
    this.transporter = transporter;
  }

  /** Send Email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} body - Email body (HTML)
   * @param {string} [text] - Optional plain text version of the email body
   */
  async sendEmail(to, subject, body, text) {
    const mailOptions = {
      from: {
        name: "El Mister Support",
        address: SENDER_EMAIL,
      },
      to,
      subject,
      html: body,
      text: text || body.replace(/<[^>]*>/g, ""),
    };

    const info = await new Promise((resolve, reject) => {
      this.transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
          reject(error);
        } else {
          console.log("Email sent:", info.response);
          resolve(info);
        }
      });
    });
    return info;
  }

  /** Password OTP Mail
   * @param {string} email - Recipient email address
   * @param {string} otp - 6-digit code
   * @returns {function} to send otp in mail to recipient
   */
  async initiatePasswordReset(email, otp) {
    const subject = "Password Reset Request";
    const body = MailTemplates.otpMail(otp);
    return await this.sendEmail(email, subject, body);
  }

  /** Email Verfication Mail
   * @param {string} email - Recipient email address
   * @param {string} link - the link to confirm email 
   * @returns {function} to send otp in mail to recipient
   */
  async initiateAccountVerfication(email, link) {
    const subject = "Confirm you Email Address";
    const body = MailTemplates.confirmationLinkMail(link);
    return await this.sendEmail(email, subject, body);
  }
}

export default new MailService(transporter);
