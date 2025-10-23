// middleware/getCompanySubscription.js
const db = require("../config/config.js");

async function getCompanySubscription(req, res, next) {
  try {
    const tenant_id = req.user?.tenant_id;
    if (!tenant_id)
      return res.status(403).json({ success: false, message: "Tenant missing." });

    const [rows] = await db.execute(
      "SELECT subscription_type FROM company_info WHERE id = ?",
      [tenant_id]
    );
    if (!rows.length)
      return res.status(403).json({ success: false, message: "Company not found." });

    req.subscription_type = rows[0].subscription_type; // 'invoice' | 'bill' | 'both'
    next();
  } catch (err) {
    console.error("Error getCompanySubscription:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = getCompanySubscription;
