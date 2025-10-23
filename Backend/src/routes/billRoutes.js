const express = require("express");
const router = express.Router();
const db = require("../config/config.js");
const { authenticateUser } = require("../middleware/auth"); // make sure this exists


// GET /get-bill : Fetch all bills with bill items, scoped by tenant
// GET /get-bill : Fetch all bills with bill items and company info, scoped by tenant
router.get("/get-bill", authenticateUser, async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) {
    return res.status(403).json({ message: "Tenant information missing in token." });
  }

  try {
    // Fetch bills with creator info and company info
    const [bills] = await db.execute(
      `SELECT
        b.*,
        u.first_name AS created_by_first_name,
        u.last_name AS created_by_last_name,
        c.company_name,
        c.company_logo,
        c.address AS company_address,
        c.cell_no1,
        c.cell_no2,
        c.gst_no,
        c.email AS company_email,
        c.website
      FROM bills b
      LEFT JOIN users u ON b.created_by = u.user_id
      LEFT JOIN company_info c ON b.tenant_id = c.id
      WHERE b.tenant_id = ?
      ORDER BY b.created_at DESC`,
      [tenant_id]
    );

    // Fetch bill items with product and category info
    const [items] = await db.execute(
      `SELECT
        bi.*,
        p.product_name,
        p.description AS product_description,
        p.image_url,
        p.price AS product_price,
        p.gst,
        p.c_gst,
        p.s_gst,
        p.discount,
        pc.category_name
      FROM bill_items bi
      LEFT JOIN products p ON bi.product_id = p.product_id AND p.tenant_id = ?
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id AND pc.tenant_id = ?
      WHERE bi.tenant_id = ?`,
      [tenant_id, tenant_id, tenant_id]
    );

    // Group bill items per bill
    const itemsGroupedByBill = {};
    items.forEach(item => {
      if (!itemsGroupedByBill[item.bill_id]) {
        itemsGroupedByBill[item.bill_id] = [];
      }
      itemsGroupedByBill[item.bill_id].push(item);
    });

    // Merge bill, items, and company info
    const fullBills = bills.map(bill => ({
      ...bill,
      created_by_name: `${bill.created_by_first_name} ${bill.created_by_last_name}`,
      items: itemsGroupedByBill[bill.bill_id] || [],
      company: {
        name: bill.company_name,
        logo: bill.company_logo,
        address: bill.company_address,
        mobile1: bill.cell_no1,
        mobile2: bill.cell_no2,
        gst_no: bill.gst_no,
        email: bill.company_email,
        website: bill.website,
      },
    }));

    res.json(fullBills);
  } catch (err) {
    console.error("❌ Failed to fetch bills:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /update-bill/:bill_id : Update bill scoped by tenant
router.put("/update-bill/:bill_id", authenticateUser, async (req, res) => {
  const { bill_id } = req.params;
  const {
    advance_amount,
    due_date,
    payment_status,
    payment_completion_status,
    payment_settlement_date,
  } = req.body;

  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) {
    return res.status(403).json({ message: "Tenant information missing in token." });
  }

  try {
    // Ensure the bill exists for tenant
    const [rows] = await db.query(
      "SELECT * FROM bills WHERE bill_id = ? AND tenant_id = ?",
      [bill_id, tenant_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Bill not found." });
    }

    // Validate incoming status
    const allowedStatus = ["Full Payment", "Advance"];
    if (!allowedStatus.includes(payment_status)) {
      return res.status(400).json({ message: "Invalid payment_status value." });
    }

    // Update bill fields
    await db.query(
      `UPDATE bills SET
        advance_amount = ?, due_date = ?, payment_status = ?, payment_completion_status = ?, payment_settlement_date = ?
        WHERE bill_id = ? AND tenant_id = ?`,
      [
        advance_amount || 0,
        due_date || null,
        payment_status,
        payment_completion_status || "Completed",
        payment_settlement_date || null,
        bill_id,
        tenant_id,
      ]
    );

    res.json({ message: "Bill updated successfully." });
  } catch (error) {
    console.error("Error updating bill:", error);
    res.status(500).json({ message: "Server error while updating bill." });
  }
});








// POST /api/bills/create : Create a bill
router.post("/create", authenticateUser, async (req, res) => {
  let connection;
  const tenant_id = req.user?.tenant_id;

  if (!tenant_id) {
    return res.status(403).json({ success: false, message: "Tenant information missing." });
  }
  console.log("✅ Received request at /api/bills/create");

  // Utility to sanitize inputs and provide default values
  const sanitize = (val, def = null) => {
    if (val === undefined || val === null) return def;
    if (typeof val === "string" && val.trim() === "") return def;
    return val;
  };

  try {
    const { customer = {}, products = [], summaryData = {}, created_by } = req.body;

    // Bill number is required
    if (!customer.billNo) {
      return res.status(400).json({ success: false, message: "Bill number is required." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // 0. Check company subscription
    const [companyRows] = await connection.execute(
      "SELECT subscription_type FROM company_info WHERE id = ?",
      [tenant_id]
    );
    if (companyRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Company not found" });
    }
    if (companyRows[0].subscription_type !== "bill") {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Your subscription does not allow bill creation." });
    }

    // 1. Insert bill header
    const createdAt = new Date();
    const [billResult] = await connection.execute(
      `INSERT INTO bills
       (tenant_id, customer_name, mobile_no, bill_number, bill_date,
        subtotal, gst_percentage, gst_amount, cgst_amount, sgst_amount,
        discount_type, discount_value, transport_charge, total_amount,
        payment_type, payment_status, advance_amount, due_date,
        payment_completion_status, payment_settlement_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenant_id,
        sanitize(customer.name),  // Optional
        sanitize(customer.mobile), // Optional
        sanitize(customer.billNo),
        sanitize(customer.date) || createdAt.toISOString().split("T")[0],
        sanitize(summaryData.totalWithGst, 0),
        sanitize(summaryData.gst, 0),
        sanitize(summaryData.gstCost, 0),
        sanitize(summaryData.cgstCost, 0),
        sanitize(summaryData.sgstCost, 0),
        sanitize(summaryData.discountType, "%"),
        sanitize(summaryData.discountValue, 0),
        sanitize(summaryData.transportCharge, 0),
        sanitize(summaryData.total, 0),
        sanitize(summaryData.paymentType, "Cash"),
        sanitize(summaryData.paymentStatus, "Full Payment"),
        sanitize(summaryData.advanceAmount, 0),
        sanitize(summaryData.dueDate, null),
        sanitize(summaryData.paymentStatus === "Advance" && summaryData.advanceAmount > 0 ? "Pending" : "Completed"),
        sanitize(summaryData.paymentStatus === "Full Payment" ? createdAt.toISOString().split("T")[0] : null),
        sanitize(created_by, req.user.user_id),
      ]
    );

    const bill_id = billResult.insertId;
    console.log("✅ Bill inserted ID:", bill_id);

    // 2. Insert bill items if provided
    for (const p of products) {
      await connection.execute(
        `INSERT INTO bill_items
         (tenant_id, bill_id, product_id, hsn_code, quantity, unit, rate, gst_percentage, base_amount, total_with_gst)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenant_id,
          bill_id,
          sanitize(p.product_id),
          sanitize(p.hsn_code),
          sanitize(p.quantity, 0),
          sanitize(p.unit),
          sanitize(p.rate, 0),
          sanitize(p.gst, 0),
          sanitize(p.amount, 0),
          sanitize(p.priceIncludingGst, 0),
        ]
      );
    }

    // 3. Update stock & log movements
    for (const p of products) {
      const [stockRows] = await connection.execute(
        "SELECT stock_quantity FROM products WHERE tenant_id = ? AND product_id = ? FOR UPDATE",
        [tenant_id, p.product_id]
      );
      const currentStock = stockRows[0]?.stock_quantity ?? 0;
      const newStock = currentStock - p.quantity;
      if (newStock < 0) {
        await connection.rollback();
        return res
          .status(400)
          .json({ success: false, message: `Insufficient stock for product ID ${p.product_id}` });
      }

      await connection.execute(
        "UPDATE products SET stock_quantity = ? WHERE tenant_id = ? AND product_id = ?",
        [newStock, tenant_id, p.product_id]
      );

      await connection.execute(
        `INSERT INTO stock_movements
         (tenant_id, product_id, change_type, quantity_changed, old_stock, new_stock, reason, reference_id, updated_by)
         VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?, ?)`,
        [
          tenant_id,
          p.product_id,
          p.quantity,
          currentStock,
          newStock,
          `Bill #${sanitize(customer.billNo)}`,
          bill_id,
          String(sanitize(created_by, req.user.user_id)),
        ]
      );
    }

    await connection.commit();
    console.log("✅ Bill transaction committed");

    return res.status(201).json({
      success: true,
      message: "Bill created successfully",
      bill_id,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("❌ Error creating bill:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  } finally {
    if (connection) connection.release();
    console.log("🔚 Connection released");
  }
});


module.exports = router;
