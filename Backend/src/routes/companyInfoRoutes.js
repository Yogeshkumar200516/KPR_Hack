const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const db = require("../config/config.js");
const { authenticateUser } = require("../middleware/auth.js");

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/logos"); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    const tenantId = req.user?.tenant_id || "tenant";
    const uniqueName = `${tenantId}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// All routes require authentication
router.use(authenticateUser);

/////////////////////////////////////////////////////////
// GET /api/company/info
// Fetch company info for the logged-in user's tenant
/////////////////////////////////////////////////////////
router.get("/info", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const [rows] = await db.execute(
      "SELECT * FROM company_info WHERE id = ? LIMIT 1",
      [tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Company info not found for this tenant" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Failed to fetch company info:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/////////////////////////////////////////////////////////
// POST /api/company/add
// Add company info for the tenant (only if not exists)
/////////////////////////////////////////////////////////
router.post("/add", upload.single("company_logo"), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      company_name, address, cell_no1, cell_no2, gst_no, pan_no,
      account_name, bank_name, branch_name, ifsc_code, account_number,
      email, website,
    } = req.body;

    const logoFilename = req.file ? req.file.filename : null;

    // Check if company info already exists for this tenant
    const [existing] = await db.execute(
      "SELECT id, company_logo FROM company_info WHERE id = ? LIMIT 1",
      [tenantId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Company info already exists for this tenant. Use update." });
    }

    await db.execute(
      `INSERT INTO company_info
       (id, company_name, company_logo, address, cell_no1, cell_no2, gst_no, pan_no,
        account_name, bank_name, branch_name, ifsc_code, account_number, email, website)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId, company_name, logoFilename, address, cell_no1, cell_no2, gst_no, pan_no,
        account_name, bank_name, branch_name, ifsc_code, account_number, email, website
      ]
    );

    res.status(201).json({ message: "Company info added successfully." });
  } catch (err) {
    console.error("Error adding company info:", err);
    res.status(500).json({ message: "Failed to add company info." });
  }
});

/////////////////////////////////////////////////////////
// PUT /api/company/update
// Update company info for the tenant
/////////////////////////////////////////////////////////
router.put("/update", upload.single("company_logo"), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      company_name, address, cell_no1, cell_no2, gst_no, pan_no,
      account_name, bank_name, branch_name, ifsc_code, account_number,
      email, website,
    } = req.body;

    const logoFilename = req.file ? req.file.filename : null;

    // Fetch existing company info
    const [existing] = await db.execute(
      "SELECT id, company_logo FROM company_info WHERE id = ? LIMIT 1",
      [tenantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Company info not found for this tenant" });
    }

    const logoToUse = logoFilename || existing[0].company_logo;

    await db.execute(
      `UPDATE company_info
       SET company_name = ?, company_logo = ?, address = ?, cell_no1 = ?, cell_no2 = ?, gst_no = ?, pan_no = ?,
           account_name = ?, bank_name = ?, branch_name = ?, ifsc_code = ?, account_number = ?, email = ?, website = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        company_name, logoToUse, address, cell_no1, cell_no2, gst_no, pan_no,
        account_name, bank_name, branch_name, ifsc_code, account_number, email, website,
        tenantId
      ]
    );

    res.json({ message: "Company info updated successfully." });
  } catch (err) {
    console.error("Error updating company info:", err);
    res.status(500).json({ message: "Failed to update company info." });
  }
});

module.exports = router;
