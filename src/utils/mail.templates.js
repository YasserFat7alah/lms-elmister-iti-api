


class MailTemplates {
    static otpMail = (otp) => {
        return `
            <div style="
                font-family: Arial, sans-serif;;
                padding:24px;
                border-radius:10px;
                ">
                <h2 style="margin-top:0;">Password Reset Request</h2>

                <p style="font-size:15px; line-height:1.6;">
                Dear User,<br/>
                You requested a password reset. Here is your OTP:
                </p>

                <div style="
                    border-left:4px solid black;
                    padding:14px 18px;
                    margin:18px 0;
                    border-radius:6px;
                    font-size:18px;
                    font-weight:bold;
                ">
                ${otp}
                </div>

                <p style="font-size:14px; line-height:1.6;">
                If you did not request this, please ignore this email.
                </p>

                <p style="font-size:14px; margin-top:32px;">
                Best regards,<br/>
                <strong>Elmister Team</strong>
                </p>
            </div>
        `
    }

    static confirmationLinkMail = (link) => {
        return `
            <div style="
                font-family: Arial, sans-serif;
                padding:24px;
                border-radius:10px;
                ">

                <h2 style=" margin-top:0;">Confirm Your Email</h2>

                <p style="font-size:15px; line-height:1.6;">
                Thank you for signing up! Please confirm your email address by clicking the button below.
                </p>

                <a href="${link}" style="
                    display:inline-block;
                    padding:12px 22px;
                    text-decoration:none;
                    border-radius:8px;
                    font-weight:bold;
                    margin:20px 0;
                ">
                Confirm Email
                </a>

                <p style="font-size:14px; line-height:1.6; ">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <span style="">${link}</span>
                </p>

                <p style="font-size:14px; margin-top:32px;">
                Best regards,<br/>
                <strong>Elmister Team</strong>
                </p>
            </div>
`;}
}

export default MailTemplates;
