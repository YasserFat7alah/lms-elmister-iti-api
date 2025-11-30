import transporter from "../config/nodemailer.js";
import { FROM_EMAIL } from "../utils/constants.js";


class MailService {
    constructor(transporter) {
        this.transporter = transporter;
    }

    async sendEmail(to, subject, body, text) {
         const mailOptions = {
        from: FROM_EMAIL,
        to,
        subject,
        html: body,
        text: text || body.replace(/<[^>]*>/g, ""), // Strip HTML for text version
      };

      const info = await this.transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
          throw new Error("Failed to send email");
        } else {
          console.log("Email sent:", info.response);
        }
      });
      return { success: true, messageId: info.messageId };
    }

    async initiatePasswordReset(email) {
        const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
        const subject = "Password Reset Request";
        const body = `
            <p>Dear User,</p>
            <p>You requested a password reset. Here is your OTP:</p>
            <p>${otp}</p>
            <p>If you did not request this, please ignore this email.</p>
            <p>Best regards,<br/>Your App Team</p>
        `;
        return await this.sendEmail(email, subject, body);
    }
}

export default new MailService(transporter);