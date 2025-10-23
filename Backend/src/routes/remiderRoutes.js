const express = require("express");
const router = express.Router();
const db = require("../config/config.js");
const { sendEmailWithPDF, sendReminderEmail } = require("../utils/sendEmail.js");
const { authenticateUser } = require("../middleware/auth.js");

/**
 * Check Reminder Status for Invoices (subscription_type = invoice)
 */
// Check Reminder Status for Invoices (subscription_type = invoice)
router.get("/check-reminder-status", authenticateUser, async (req, res) => {
  try {
    const companyId = req.user?.tenant_id;
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, message: "Company ID missing in token." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch invoices with customer info and company name
    const [invoices] = await db.execute(
      `SELECT 
          i.invoice_id,
          i.invoice_number,
          i.due_date,
          i.total_amount,
          i.advance_amount,
          i.payment_status,
          i.payment_completion_status,
          c.name AS customer_name,
          c.email AS customer_email,
          c.gst_number AS customer_gst_no,
          c.mobile AS customer_phone_no,
          c.whatsapp_number AS whatsapp,
          comp.company_name
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.customer_id
       LEFT JOIN company_info comp ON i.tenant_id = comp.id
       WHERE i.tenant_id = ?
         AND i.payment_status = 'Advance'
         AND i.payment_completion_status = 'Pending'
         AND i.due_date IS NOT NULL`,
      [companyId]
    );

    const reminders = [];
    const overdues = [];

    invoices.forEach((inv) => {
      const due = new Date(inv.due_date);
      due.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
      const dueDateStr = due.toISOString().split("T")[0];

      // Always include company_name in the returned object
      const invoiceWithCompany = { ...inv, dueDate: dueDateStr };

      if (diffDays < 0) {
        overdues.push(invoiceWithCompany);
      } else if (diffDays <= 2) {
        // Include today, 1-day away, and 2-days away reminders
        reminders.push(invoiceWithCompany);
      }
      // Optionally, ignore invoices > 2 days away
    });

    return res.status(200).json({ reminders, overdues });
  } catch (err) {
    console.error("❌ Error in /check-reminder-status:", err.message);
    return res
      .status(500)
      .json({ message: err.message || "Internal server error" });
  }
});



/**
 * Check Reminder Status for Bills (subscription_type = bill)
 */
// ✅ Check Bill Reminder Status
router.get("/check-bill-reminder-status", authenticateUser, async (req, res) => {
  try {
    const companyId = req.user?.tenant_id;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID missing in token." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Select necessary fields from bills table
    const [bills] = await db.execute(
      `SELECT bill_id, bill_number, due_date, total_amount, advance_amount,
              payment_status, payment_completion_status,
              customer_name, mobile_no
       FROM bills
       WHERE tenant_id = ?
         AND payment_status = 'Advance'
         AND payment_completion_status = 'Pending'
         AND due_date IS NOT NULL`,
      [companyId]
    );

    const reminders = [];
    const overdues = [];

    // Separate overdue and upcoming reminders
    for (const bill of bills) {
      const due = new Date(bill.due_date);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
      const dueDateStr = due.toISOString().split("T")[0];

      if (diffDays < 0) {
        overdues.push({ ...bill, dueDate: dueDateStr });
      } else {
        reminders.push({ ...bill, dueDate: dueDateStr });
      }
    }

    return res.status(200).json({ reminders, overdues });
  } catch (err) {
    console.error("❌ Error in /check-bill-reminder-status:", err.message);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
});


module.exports = router;
