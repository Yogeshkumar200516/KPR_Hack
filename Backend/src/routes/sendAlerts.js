// routes/reminderRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../config/config.js");
const { sendReminderEmail } = require("../utils/sendEmail.js");
const { authenticateUser } = require("../middleware/auth.js");
const dayjs = require("dayjs");

router.post("/send-reminder", async (req, res) => {
  const {
    customerEmail,
    invoiceNumber,
    companyName,
    companyEmail,
    dueDate,
    type,
  } = req.body;

  // 1️⃣ Validate required fields
  if (!customerEmail || !invoiceNumber || !companyName || !dueDate) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: customerEmail, invoiceNumber, companyName, dueDate",
    });
  }

  // 2️⃣ Validate 'type'
  const validTypes = ["reminder", "overdue"];
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: "Invalid or missing type. Must be 'reminder' or 'overdue'.",
    });
  }

  try {
    console.log("📧 Sending reminder email:", req.body);

    const info = await sendReminderEmail({
      customerEmail,
      invoiceNumber,
      companyName,
      companyEmail, // optional
      dueDate,
      type,
    });

    console.log("✅ Reminder email sent successfully:", info.messageId);

    res.json({ success: true, info });
  } catch (err) {
    console.error("❌ Failed to send reminder email:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// PUT /api/invoices/update/:id
router.put("/update/:id", authenticateUser, async (req, res) => {
  const invoiceId = req.params.id;
  const { due_date, payment_status, payment_completion_status } = req.body;
  const tenantId = req.user?.tenant_id;
  const companyName = req.user?.company_name || "Your Company";
  const companyEmail = req.user?.company_email || process.env.EMAIL_AUTH_USER;

  if (!tenantId) return res.status(403).json({ message: "Tenant ID missing" });

  try {
    // 1️⃣ Fetch current invoice
    const [rows] = await db.execute(
      `SELECT invoice_number, due_date, payment_status, payment_completion_status, customer_id 
       FROM invoices WHERE invoice_id = ? AND tenant_id = ?`,
      [invoiceId, tenantId]
    );

    if (!rows.length) return res.status(404).json({ message: "Invoice not found" });

    const invoice = rows[0];
    const dueDateChanged = invoice.due_date?.toISOString().split("T")[0] !== due_date;

    // 2️⃣ Update invoice
    await db.execute(
      `UPDATE invoices 
       SET due_date = ?, payment_status = ?, payment_completion_status = ? 
       WHERE invoice_id = ? AND tenant_id = ?`,
      [due_date, payment_status, payment_completion_status, invoiceId, tenantId]
    );

    // 3️⃣ Fetch customer email
    const [custRows] = await db.execute(
      `SELECT email FROM customers WHERE customer_id = ?`,
      [invoice.customer_id]
    );

    const customerEmail = custRows[0]?.email;
    
    // 4️⃣ If due date changed or overdue, send email
    if (customerEmail && dueDateChanged) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const newDueDate = new Date(due_date);
      newDueDate.setHours(0,0,0,0);

      const diffDays = Math.floor((newDueDate - today) / (1000 * 60 * 60 * 24));
      let type = null;

      if (diffDays === 2) type = "reminder";
      else if (diffDays < 0) type = "overdue";

      if (type) {
        await sendReminderEmail({
          customerEmail,
          invoiceNumber: invoice.invoice_number,
          companyName,
          companyEmail,
          dueDate: due_date,
          type,
        });
        console.log(`📧 Email triggered for Invoice #${invoice.invoice_number} on PUT`);
      }
    }

    return res.status(200).json({ success: true, message: "Invoice updated successfully" });
  } catch (err) {
    console.error("❌ Error updating invoice:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
});

// Send alerts for invoices due soon or overdue
router.post("/send-invoice-alerts", authenticateUser, async (req, res) => {
  try {
    const companyId = req.user?.tenant_id;
    const companyName = req.user?.company_name || "Your Company";
    const companyEmail = req.user?.company_email || process.env.EMAIL_AUTH_USER;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID missing in token." });
    }

    const today = dayjs().startOf("day");
    const twoDaysLater = today.add(2, "day");

    const [invoices] = await db.execute(
      `SELECT i.invoice_id, i.invoice_number, i.due_date, c.email AS customer_email
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.customer_id
       WHERE i.tenant_id = ?
         AND i.payment_status = 'Advance'
         AND i.payment_completion_status = 'Pending'
         AND i.due_date IS NOT NULL
         AND i.due_date <= ?`,
      [companyId, twoDaysLater.format("YYYY-MM-DD")]
    );

    const emailsSent = [];

    for (const inv of invoices) {
      if (!inv.customer_email) {
        console.warn(`⚠️ Skipping invoice #${inv.invoice_number} due to missing customer email.`);
        continue;
      }

      const dueDate = dayjs(inv.due_date).startOf("day");
      const diffDays = dueDate.diff(today, "day");

      let type = null;
      if (diffDays === 2) type = "reminder";
      else if (diffDays < 0) type = "overdue";

      if (type) {
        await sendReminderEmail({
          customerEmail: inv.customer_email,
          invoiceNumber: inv.invoice_number,
          companyName,
          companyEmail,
          dueDate: dueDate.format("YYYY-MM-DD"),
          type,
        });
        emailsSent.push({ invoiceNumber: inv.invoice_number, type, customerEmail: inv.customer_email });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Alert emails sent for ${emailsSent.length} invoices.`,
      details: emailsSent,
    });
  } catch (err) {
    console.error("❌ Error in /send-invoice-alerts:", err.message);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
});

module.exports = router;
