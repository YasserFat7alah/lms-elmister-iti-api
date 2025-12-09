import mailService from "../services/mail.service.js"; // Adjust path if needed
import { SENDER_EMAIL } from "../utils/constants.js";

const testEmail = async () => {
  const recipient = process.argv[2];

  if (!recipient) {
    console.error("Please provide a recipient email address.");
    console.log("Usage: node src/scripts/test-mail-speed.js <recipient-email>");
    process.exit(1);
  }

  console.log(`Testing email delivery to ${recipient}...`);
  console.log(`Using sender: ${SENDER_EMAIL}`);
  console.log("----------------------------------------");

  const start = Date.now();
  try {
    const result = await mailService.sendEmail(
      recipient,
      "Production Speed Test",
      "<h1>This is a test email</h1><p>If you received this, the mailer is working.</p>",
      "This is a test email. If you received this, the mailer is working."
    );
    const end = Date.now();
    const duration = (end - start) / 1000;

    console.log("----------------------------------------");
    console.log("✅ Email sent successfully!");
    console.log(`⏱️ Time taken: ${duration} seconds`);
    console.log("Verify if the email arrived in your inbox.");
    console.log("Result Info:", result.info);
  } catch (error) {
    const end = Date.now();
    const duration = (end - start) / 1000;
    
    console.log("----------------------------------------");
    console.error("❌ Failed to send email.");
    console.error(`⏱️ Time taken before failure: ${duration} seconds`);
    console.error("Error details:", error.message);
  }
  process.exit(0);
};

testEmail();
