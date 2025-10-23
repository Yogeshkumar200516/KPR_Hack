const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

// ✅ Create a single persistent transporter to reuse across multiple emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_AUTH_USER,
    pass: process.env.EMAIL_AUTH_PASS,
  },
  tls: { rejectUnauthorized: false },
  logger: true,
  debug: true,
});

// ✅ Send Invoice Email with PDF Attachment
const sendEmailWithPDF = async ({ pdfBuffer, invoiceNumber, customerEmail, fromEmail, fromName }) => {
  if (!customerEmail) throw new Error(`Missing customer email for invoice #${invoiceNumber}`);
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) throw new Error("Invalid PDF buffer.");

  const mailOptions = {
    from: `"${fromName}" <${process.env.EMAIL_AUTH_USER}>`,
    replyTo: fromEmail || process.env.EMAIL_AUTH_USER,
    to: customerEmail,
    subject: `Invoice #${invoiceNumber} from ${fromName}`,
    html: `
      <p>Dear Customer,</p>
      <p>Thank you for your business with <strong>${fromName}</strong>.</p>
      <p>Please find attached your invoice <strong>#${invoiceNumber}</strong>.</p>
      <br />
      <p>Best regards,<br /><strong>${fromName}</strong></p>
    `,
    attachments: [
      {
        filename: `Invoice_${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Invoice email sent to ${customerEmail}: MessageId = ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send invoice email to ${customerEmail} for #${invoiceNumber}:`, err);
    throw err;
  }
};

// ✅ Send Reminder or Overdue Notification Emails
const sendReminderEmail = async ({ customerEmail, invoiceNumber, companyName, companyEmail, dueDate, type }) => {
  if (!customerEmail) throw new Error(`Missing customer email for ${type} of invoice #${invoiceNumber}`);
  if (!companyName || !invoiceNumber || !dueDate)
    throw new Error(`Invalid parameters passed to sendReminderEmail.`);

  const subject =
    type === "reminder"
      ? `⏳ Reminder: Invoice #${invoiceNumber} due on ${dueDate}`
      : `⚠️ Overdue Alert: Invoice #${invoiceNumber} (was due on ${dueDate})`;

  const htmlBody =
    type === "reminder"
      ? `<p>Dear Customer,</p>
         <p>This is a friendly reminder that your invoice <strong>#${invoiceNumber}</strong> is due on <strong>${dueDate}</strong>.</p>
         <p>Please ensure payment is made by the due date to avoid any inconvenience.</p>
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

  console.log("[DEBUG] Preparing to send email:", mailOptions);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ ${type.toUpperCase()} email sent successfully to ${customerEmail} for Invoice #${invoiceNumber}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send ${type} email to ${customerEmail} for invoice #${invoiceNumber}:`, err);
    throw err;
  }
};

module.exports = {
  sendEmailWithPDF,
  sendReminderEmail,
};

