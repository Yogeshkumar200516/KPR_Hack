const express = require("express");
const router = express.Router();
const db = require("../config/config.js");
const { sendEmailWithPDF, sendReminderEmail } = require("../utils/sendEmail.js");
const { authenticateUser } = require("../middleware/auth.js");

/**
 * Send Bill PDF
 */
router.post("/send-bill", authenticateUser, async (req, res) => {
  try {
    const { billNumber, customerEmail, pdfBase64 } = req.body;
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
      invoiceNumber: billNumber,
      customerEmail,
      fromEmail: companyEmail,
      fromName: companyName,
    });

    if (info.accepted && info.accepted.includes(customerEmail)) {
      return res.status(200).json({ success: true, message: "Bill sent via email.", smtp_info: info });
    }

    return res.status(500).json({ success: false, message: "SMTP did not accept recipient.", smtp_info: info });
  } catch (err) {
    console.error("❌ Error in /send-bill:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error." });
  }
});


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

module.exports = router;
