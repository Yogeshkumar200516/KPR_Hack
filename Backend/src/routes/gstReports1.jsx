const express = require("express");
const router = express.Router();
const db = require("../config/config.js");
const { authenticateUser } = require("../middleware/auth.js"); // ✅ import auth

// ✅ Apply authentication to all routes in this file
router.use(authenticateUser);

// Helper function to build WHERE clause based on month and year AND tenant_id
function buildDateFilter(month, year, tenantId) {
  let clause = "WHERE i.tenant_id = ?";
  let params = [tenantId];

  if (month && year) {
    clause += " AND MONTH(i.created_at) = ? AND YEAR(i.created_at) = ?";
    params.push(month, year);
  } else if (year) {
    clause += " AND YEAR(i.created_at) = ?";
    params.push(year);
  }

  return { clause, params };
}

// 1. Summary Stats
router.get("/summary", async (req, res) => {
  const { month, year } = req.query;
  const tenantId = req.user.tenant_id;

  try {
    const { clause, params } = buildDateFilter(month, year, tenantId);

    const query = `
      SELECT
        COUNT(DISTINCT i.invoice_id) AS total_invoices,
        COALESCE(SUM(i.total_amount), 0) AS total_sales,
        COALESCE(SUM(i.gst_amount), 0) AS total_gst,
        COALESCE(SUM(i.cgst_amount), 0) AS total_cgst,
        COALESCE(SUM(i.sgst_amount), 0) AS total_sgst,
        COALESCE(SUM(i.discount_value), 0) AS total_discount,
        COALESCE(SUM(i.transport_charge), 0) AS total_transport,
        COALESCE(SUM(ii.quantity), 0) AS total_quantity_sold,
        COUNT(DISTINCT ii.product_id) AS total_products_sold,
        COALESCE(AVG(i.total_amount), 0) AS avg_invoice_value
      FROM invoices i
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.invoice_id
      ${clause}
    `;

    const [rows] = await db.execute(query, params);
    res.json(rows[0] || {});
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. Monthly GST Trends
router.get("/monthly", async (req, res) => {
  const { year } = req.query;
  const tenantId = req.user.tenant_id;

  try {
    const query = year
      ? `
        SELECT
          DATE_FORMAT(i.created_at, '%Y-%m') AS month,
          COUNT(*) AS total_invoices,
          COALESCE(SUM(i.total_amount), 0) AS total_sales,
          COALESCE(SUM(i.gst_amount), 0) AS total_gst,
          COALESCE(SUM(i.cgst_amount), 0) AS total_cgst,
          COALESCE(SUM(i.sgst_amount), 0) AS total_sgst,
          COALESCE(AVG(i.total_amount), 0) AS avg_invoice_value,
          COALESCE(SUM(ii.total_quantity), 0) AS total_quantity_sold
        FROM invoices i
        LEFT JOIN (
          SELECT invoice_id, SUM(quantity) AS total_quantity
          FROM invoice_items GROUP BY invoice_id
        ) ii ON i.invoice_id = ii.invoice_id
        WHERE i.tenant_id = ? AND YEAR(i.created_at) = ?
        GROUP BY month ORDER BY month
      `
      : `
        SELECT
          DATE_FORMAT(i.created_at, '%Y-%m') AS month,
          COUNT(*) AS total_invoices,
          COALESCE(SUM(i.total_amount), 0) AS total_sales,
          COALESCE(SUM(i.gst_amount), 0) AS total_gst,
          COALESCE(SUM(i.cgst_amount), 0) AS total_cgst,
          COALESCE(SUM(i.sgst_amount), 0) AS total_sgst,
          COALESCE(AVG(i.total_amount), 0) AS avg_invoice_value,
          COALESCE(SUM(ii.total_quantity), 0) AS total_quantity_sold
        FROM invoices i
        LEFT JOIN (
          SELECT invoice_id, SUM(quantity) AS total_quantity
          FROM invoice_items GROUP BY invoice_id
        ) ii ON i.invoice_id = ii.invoice_id
        WHERE i.tenant_id = ?
        GROUP BY month ORDER BY month
      `;

    const params = year ? [tenantId, year] : [tenantId];
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching monthly trends:", err);
    res.status(500).send("Internal Server Error");
  }
});

// 3. Top GST-Contributing Products
router.get("/top-products", async (req, res) => {
  const { month, year } = req.query;
  const tenantId = req.user.tenant_id;

  try {
    const { clause, params } = buildDateFilter(month, year, tenantId);

    const query = `
      SELECT
        p.product_name,
        p.hsn_code,
        c.category_name,
        COALESCE(SUM(ii.quantity), 0) AS total_quantity,
        COALESCE(SUM(ii.base_amount), 0) AS total_sales,
        COALESCE(SUM(ii.total_with_gst - ii.base_amount), 0) AS gst_collected,
        COALESCE(AVG(ii.gst_percentage), 0) AS avg_gst_rate,
        COALESCE(SUM(i.discount_value), 0) AS total_discount_given,
        COUNT(DISTINCT i.invoice_id) AS invoice_count
      FROM invoice_items ii
      JOIN products p ON p.product_id = ii.product_id AND p.tenant_id = ?
      LEFT JOIN product_categories c ON c.category_id = p.category_id
      JOIN invoices i ON i.invoice_id = ii.invoice_id
      ${clause}
      GROUP BY ii.product_id
      ORDER BY gst_collected DESC
    `;

    const [rows] = await db.execute(query, [tenantId, ...params]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// 4. GST by User
router.get("/gst-by-user", async (req, res) => {
  const { month, year } = req.query;
  const tenantId = req.user.tenant_id;

  try {
    const { clause, params } = buildDateFilter(month, year, tenantId);

    const query = `
      SELECT
        u.first_name,
        u.last_name,
        u.role,
        COUNT(i.invoice_id) AS total_invoices,
        COALESCE(SUM(i.gst_amount), 0) AS total_gst_collected,
        COALESCE(SUM(i.total_amount), 0) AS total_sales,
        COALESCE(AVG(i.gst_amount), 0) AS avg_gst_per_invoice
      FROM invoices i
      JOIN users u ON u.user_id = i.created_by AND u.tenant_id = ?
      ${clause}
      GROUP BY i.created_by
      ORDER BY total_gst_collected DESC
    `;

    const [rows] = await db.execute(query, [tenantId, ...params]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// 5. Stock Movements
router.get("/stock-movements", async (req, res) => {
  const { month, year } = req.query;
  const tenantId = req.user.tenant_id;

  try {
    let query = `
      SELECT
        sm.movement_id,
        p.product_name,
        sm.change_type,
        sm.quantity_changed,
        sm.old_stock,
        sm.new_stock,
        sm.reason,
        sm.updated_by,
        sm.created_at
      FROM stock_movements sm
      JOIN products p ON p.product_id = sm.product_id
      WHERE sm.tenant_id = ?
    `;

    const params = [tenantId];
    if (month && year) {
      query += ` AND MONTH(sm.created_at) = ? AND YEAR(sm.created_at) = ? `;
      params.push(month, year);
    } else if (year) {
      query += ` AND YEAR(sm.created_at) = ? `;
      params.push(year);
    }

    query += ` ORDER BY sm.created_at DESC `;
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// 6. High GST Invoices
router.get("/high-gst-invoices", async (req, res) => {
  const { month, year } = req.query;
  const tenantId = req.user.tenant_id;

  try {
    let query = `
      SELECT
        i.invoice_number,
        i.invoice_date,
        c.name AS customer_name,
        i.gst_amount,
        i.total_amount
      FROM invoices i
      LEFT JOIN customers c ON c.customer_id = i.customer_id
      WHERE i.tenant_id = ? AND i.gst_amount > 0
    `;

    const params = [tenantId];
    if (month && year) {
      query += ` AND MONTH(i.created_at) = ? AND YEAR(i.created_at) = ? `;
      params.push(month, year);
    } else if (year) {
      query += ` AND YEAR(i.created_at) = ? `;
      params.push(year);
    }

    query += ` ORDER BY i.gst_amount DESC`;
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// 7. Discounts by Product
router.get("/discounts-by-product", async (req, res) => {
  const { month, year } = req.query;
  const tenantId = req.user.tenant_id;

  try {
    const { clause, params } = buildDateFilter(month, year, tenantId);

    const query = `
      SELECT
        p.product_name,
        COUNT(ii.item_id) AS times_sold,
        ROUND(AVG(i.discount_value), 2) AS avg_discount,
        ROUND(SUM(i.discount_value), 2) AS total_discount_amount,
        MIN(i.discount_value) AS min_discount,
        MAX(i.discount_value) AS max_discount
      FROM invoice_items ii
      JOIN invoices i ON i.invoice_id = ii.invoice_id
      JOIN products p ON p.product_id = ii.product_id AND p.tenant_id = ?
      ${clause}
      GROUP BY p.product_name
      ORDER BY avg_discount DESC
    `;

    const [rows] = await db.execute(query, [tenantId, ...params]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// 8. Category-wise Product Sales
router.get("/category-sales", async (req, res) => {
  const { month, year } = req.query;
  const tenantId = req.user.tenant_id;

  try {
    const { clause, params } = buildDateFilter(month, year, tenantId);

    const query = `
      SELECT
        c.category_name,
        COUNT(DISTINCT ii.product_id) AS products_in_category,
        COALESCE(SUM(ii.quantity), 0) AS total_quantity_sold,
        COALESCE(SUM(ii.base_amount), 0) AS total_sales,
        COALESCE(SUM(ii.total_with_gst - ii.base_amount), 0) AS total_gst_collected,
        COALESCE(AVG(ii.gst_percentage), 0) AS avg_gst_rate,
        ROUND(AVG(i.discount_value), 2) AS avg_discount
      FROM invoice_items ii
      JOIN products p ON p.product_id = ii.product_id AND p.tenant_id = ?
      JOIN product_categories c ON c.category_id = p.category_id
      JOIN invoices i ON i.invoice_id = ii.invoice_id
      ${clause}
      GROUP BY c.category_name
      ORDER BY total_sales DESC
    `;

    const [rows] = await db.execute(query, [tenantId, ...params]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching category sales summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 9. Advance Invoices
router.get("/advance-invoices", async (req, res) => {
  const { status } = req.query;
  const tenantId = req.user.tenant_id;

  try {
    let sql = `
      SELECT 
        i.invoice_id, i.invoice_number, i.invoice_date,
        i.total_amount, i.advance_amount,
        (i.total_amount - i.advance_amount) AS due_amount,
        i.due_date, i.payment_completion_status,
        i.payment_settlement_date,
        c.name AS customer_name, c.mobile AS customer_mobile
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.customer_id
      WHERE i.tenant_id = ? AND i.payment_status = 'Advance'
    `;

    const params = [tenantId];
    if (status === "pending") {
      sql += " AND i.payment_completion_status = 'Pending'";
    } else if (status === "completed") {
      sql += " AND i.payment_completion_status = 'Completed'";
    }

    sql += " ORDER BY i.invoice_date DESC";
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching advance invoices:", err);
    res.status(500).json({ error: "Failed to fetch advance invoices" });
  }
});

module.exports = router;
