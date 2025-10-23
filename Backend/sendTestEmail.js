// sendTestEmail.js
const nodemailer = require("nodemailer");
require("dotenv").config();

async function main() {
  try {
    // Configure Gmail SMTP
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.EMAIL_AUTH_USER,
        pass: process.env.EMAIL_AUTH_PASS,
      },
      logger: true, // log SMTP details
      debug: true,  // show debugging output
    });

    // Test email
    let info = await transporter.sendMail({
      from: `"Test Sender" <${process.env.EMAIL_AUTH_USER}>`,
      to: "yogeshkumar.s.radha@gmail.com", // 👈 change to your own second email (not the same as sender)
      subject: "Test Email from Nodemailer",
      text: "Hello! This is a simple test email sent using Nodemailer + Gmail SMTP.",
    });

    console.log("📧 Nodemailer Response:", info);
  } catch (err) {
    console.error("❌ Error sending test email:", err);
  }
}

main();
