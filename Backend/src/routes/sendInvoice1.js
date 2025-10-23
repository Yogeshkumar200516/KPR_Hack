const express = require("express");
const router = express.Router();
const db = require("../config/config.js");
const { sendEmailWithPDF, sendReminderEmail } = require("../utils/sendEmail.js");
const { authenticateUser } = require("../middleware/auth.js");

/**
 * Send Invoice PDF
 */
router.post("/send-invoice", authenticateUser, async (req, res) => {
  try {
    const { invoiceNumber, customerEmail, pdfBase64 } = req.body;
    const companyId = req.user?.tenant_id;

    if (!companyId) return res.status(400).json({ success: false, message: "Company ID missing in token." });
    if (!customerEmail) return res.status(400).json({ success: false, message: "Customer email is missing." });

    let pdfBuffer;
    try {
      pdfBuffer = Buffer.from(pdfBase64, "base64");
    } catch {
      return res.status(400).json({ success: false, message: "Invalid PDF data" });
    }

    const [rows] = await db.execute("SELECT * FROM company_info WHERE id = ? LIMIT 1", [companyId]);
    const company = rows[0];
    if (!company) return res.status(404).json({ success: false, message: "Company info not found" });

    const { email: companyEmail, company_name: companyName } = company;

    const info = await sendEmailWithPDF({
      pdfBuffer,
      invoiceNumber,
      customerEmail,
      fromEmail: companyEmail,
      fromName: companyName,
    });

    if (info.accepted && info.accepted.includes(customerEmail)) {
      return res.status(200).json({ success: true, message: "Invoice sent via email.", smtp_info: info });
    }

    return res.status(500).json({ success: false, message: "SMTP did not accept recipient.", smtp_info: info });
  } catch (err) {
    console.error("❌ Error in /send-invoice:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error." });
  }
});

/**
 * Send Reminders and Overdue Alerts
 */
router.get("/send-reminders", authenticateUser, async (req, res) => {
  try {
    const companyId = req.user?.tenant_id;
    if (!companyId) 
      return res.status(400).json({ success: false, message: "Company ID missing in token." });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [companyRows] = await db.execute(
      "SELECT * FROM company_info WHERE id = ? LIMIT 1",
      [companyId]
    );
    const company = companyRows[0];
    if (!company) return res.status(404).json({ success: false, message: "Company info not found" });

    const { email: companyEmail, company_name: companyName } = company;

    const [invoices] = await db.execute(
      `SELECT i.invoice_id, i.invoice_number, i.due_date, i.payment_status, i.payment_completion_status,
              c.name, c.email, c.mobile, c.gst_number
       FROM invoices i
       JOIN customers c ON i.customer_id = c.customer_id
       WHERE i.tenant_id = ?
         AND i.payment_status = 'Advance'
         AND i.payment_completion_status = 'Pending'
         AND i.due_date IS NOT NULL`,
      [companyId]
    );

    let remindersSent = 0;
    const reminderList = [];
    const overdueList = [];

    for (const invoice of invoices) {
      if (!invoice.email || !invoice.email.trim()) {
        console.log(`⏭ Skipping invoice #${invoice.invoice_number} — no email available.`);
        continue;
      }

      const due = new Date(invoice.due_date);
      due.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
      const dueDateStr = due.toISOString().split("T")[0];

      console.log(`[DEBUG] Invoice #${invoice.invoice_number}: dueDate=${dueDateStr}, diffDays=${diffDays}`);

      let type = null;
      if (diffDays === 2) type = "reminder";
      else if (diffDays < 0) type = "overdue";

      if (type) {
        console.log(`[DEBUG] Sending ${type.toUpperCase()} email for Invoice #${invoice.invoice_number} to ${invoice.email}`);

        try {
          const info = await sendReminderEmail({
            customerEmail: invoice.email,
            invoiceNumber: invoice.invoice_number,
            companyEmail,
            companyName,
            dueDate: dueDateStr,
            type,
          });

          if (info.accepted && info.accepted.includes(invoice.email)) {
            console.log(`✅ ${type.toUpperCase()} email successfully sent for Invoice #${invoice.invoice_number}`);

            remindersSent++;
            if (type === "reminder") reminderList.push(invoice);
            else overdueList.push(invoice);
          } else {
            console.error(`❌ SMTP did not accept recipient: ${invoice.email}`);
          }
        } catch (err) {
          console.error(`❌ Failed to send ${type} email for Invoice #${invoice.invoice_number}:`, err);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `${remindersSent} reminder/overdue email(s) sent.`,
      reminders: reminderList,
      overdues: overdueList,
    });
  } catch (err) {
    console.error("❌ Error in /send-reminders:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
});

/**
 * Check Reminder Status without Sending Emails
 */
router.get("/check-reminder-status", authenticateUser, async (req, res) => {
  try {
    const companyId = req.user?.tenant_id;
    if (!companyId) return res.status(400).json({ success: false, message: "Company ID missing in token." });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [invoices] = await db.execute(
      `SELECT i.invoice_id, i.invoice_number, i.due_date, i.total_amount, i.advance_amount,
              i.payment_status, i.payment_completion_status,
              c.name, c.email, c.mobile, c.gst_number
       FROM invoices i
       JOIN customers c ON i.customer_id = c.customer_id
       WHERE i.tenant_id = ?
         AND i.payment_status = 'Advance'
         AND i.payment_completion_status = 'Pending'
         AND i.due_date IS NOT NULL`,
      [companyId]
    );

    const reminders = [];
    const overdues = [];

    for (const invoice of invoices) {
      const due = new Date(invoice.due_date);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
      const dueDateStr = due.toISOString().split("T")[0];

      if (diffDays < 0) {
        overdues.push({ ...invoice, dueDate: dueDateStr });
      } else {
        // Include today and future dates in reminders
        reminders.push({ ...invoice, dueDate: dueDateStr });
      }
    }

    res.status(200).json({ reminders, overdues });
  } catch (err) {
    console.error("❌ Error in /check-reminder-status:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
});

module.exports = router;