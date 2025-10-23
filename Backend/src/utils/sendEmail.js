// utils/sendEmail.js
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

// Check environment variables
if (!process.env.EMAIL_AUTH_USER || !process.env.EMAIL_AUTH_PASS) {
  console.error("❌ Missing EMAIL_AUTH_USER or EMAIL_AUTH_PASS in .env");
}

// Create reusable transporter
const transporter = nodemailer.createTransport(
  {
    service: "gmail",
    auth: {
      user: process.env.EMAIL_AUTH_USER,
      pass: process.env.EMAIL_AUTH_PASS, // Must be app password
    },
    tls: { rejectUnauthorized: false },
    logger: true,
    debug: true,
  },
  {
    from: `"Billing System" <${process.env.EMAIL_AUTH_USER}>`,
  }
);

// Verify transporter
transporter.verify((err, success) => {
  if (err) console.error("❌ SMTP Transporter verification failed:", err);
  else console.log(`✅ SMTP Transporter ready. Logged in as ${process.env.EMAIL_AUTH_USER}`);
});

// Send invoice with PDF
const sendEmailWithPDF = async ({ pdfBuffer, invoiceNumber, customerEmail, fromEmail, fromName }) => {
  if (!customerEmail) throw new Error(`Missing customer email for invoice #${invoiceNumber}`);
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) throw new Error("Invalid PDF buffer.");

  const mailOptions = {
    from: `"${fromName || "Billing System"}" <${process.env.EMAIL_AUTH_USER}>`,
    replyTo: fromEmail || process.env.EMAIL_AUTH_USER,
    to: customerEmail,
    subject: `Invoice #${invoiceNumber} from ${fromName || "Your Company"}`,
    html: `
      <p>Dear Customer,</p>
      <p>Thank you for your business with <strong>${fromName || "Our Company"}</strong>.</p>
      <p>Please find attached your invoice <strong>#${invoiceNumber}</strong>.</p>
      <br />
      <p>Best regards,<br /><strong>${fromName || "Billing Team"}</strong></p>
    `,
    attachments: [
      {
        filename: `Invoice_${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  console.log("📧 [INVOICE] Sending email:", { to: customerEmail, subject: mailOptions.subject });

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Invoice email sent to ${customerEmail} (Invoice #${invoiceNumber})`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send invoice email to ${customerEmail} (#${invoiceNumber}):`, err);
    throw err;
  }
};

// Send reminder/overdue email
const sendReminderEmail = async ({ customerEmail, invoiceNumber, companyName, companyEmail, dueDate, type }) => {
  if (!customerEmail) throw new Error(`Missing customer email for ${type} of invoice #${invoiceNumber}`);
  if (!companyName || !invoiceNumber || !dueDate) throw new Error(`Invalid parameters for sendReminderEmail`);

  const subject =
    type === "reminder"
      ? `⏳ Reminder: Invoice #${invoiceNumber} due on ${dueDate}`
      : `⚠️ Overdue Alert: Invoice #${invoiceNumber} (was due on ${dueDate})`;

  const htmlBody =
    type === "reminder"
      ? `<p>Dear Customer,</p>
         <p>This is a friendly reminder that your invoice <strong>#${invoiceNumber}</strong> is due on <strong>${dueDate}</strong>.</p>
         <p>Please ensure payment is made by the due date to avoid inconvenience.</p>
         <br /><p>Best regards,<br /><strong>${companyName}</strong></p>`
      : `<p>Dear Customer,</p>
         <p>Your invoice <strong>#${invoiceNumber}</strong> was due on <strong>${dueDate}</strong> and remains unpaid.</p>
         <p>Please make the payment immediately to avoid further action.</p>
         <br /><p>Best regards,<br /><strong>${companyName}</strong></p>`;

  const mailOptions = {
    from: `"${companyName}" <${process.env.EMAIL_AUTH_USER}>`,
    replyTo: companyEmail || process.env.EMAIL_AUTH_USER,
    to: customerEmail,
    subject,
    html: htmlBody,
  };

  console.log("📧 [REMINDER] Sending email:", { to: customerEmail, subject });

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ ${type.toUpperCase()} email sent to ${customerEmail} (Invoice #${invoiceNumber})`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send ${type} email to ${customerEmail} (Invoice #${invoiceNumber}):`, err);
    throw err;
  }
};

module.exports = {
  sendEmailWithPDF,
  sendReminderEmail,
};
