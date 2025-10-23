const express = require("express");
const router = express.Router();
const db = require("../config/config.js");
const { authenticateUser } = require("../middleware/auth.js"); // ✅ import auth

// ✅ Apply authentication to all routes in this file
router.use(authenticateUser);

// Helper function to build WHERE clause for month/year/tenant
function buildDateFilter(month, year, tenantId) {
  let clause = "WHERE tbl.tenant_id = ?";
  let params = [tenantId];
  if (month && year) {
    clause += " AND MONTH(tbl.created_at) = ? AND YEAR(tbl.created_at) = ?";
    params.push(month, year);
  } else if (year) {
    clause += " AND YEAR(tbl.created_at) = ?";
    params.push(year);
  }
  return { clause, params };
}

// Helper to get subscription_type for current tenant
async function getSubscriptionType(tenantId) {
  const [rows] = await db.execute("SELECT subscription_type FROM company_info WHERE id = ?", [tenantId]);
  return rows[0]?.subscription_type || "invoice";
}

// 1. Summary Stats
router.get("/summary", async (req, res) => {
  const { month, year } = req.query;
  const tenantId = req.user.tenant_id;
  try {
    const subscriptionType = await getSubscriptionType(tenantId);
    if (subscriptionType === "bill") {
      const { clause, params } = buildDateFilter(month, year, tenantId);
      const query = `
        SELECT
          COUNT(DISTINCT tbl.bill_id) AS total_bills,
          COALESCE(SUM(tbl.total_amount), 0) AS total_sales,
          COALESCE(SUM(tbl.gst_amount), 0) AS total_gst,
          COALESCE(SUM(tbl.cgst_amount), 0) AS total_cgst,
          COALESCE(SUM(tbl.sgst_amount), 0) AS total_sgst,
          COALESCE(SUM(tbl.discount_value), 0) AS total_discount,
          COALESCE(SUM(tbl.transport_charge), 0) AS total_transport,
          COALESCE(SUM(tbi.quantity), 0) AS total_quantity_sold,
          COUNT(DISTINCT tbi.product_id) AS total_products_sold,
          COALESCE(AVG(tbl.total_amount), 0) AS avg_bill_value
        FROM bills tbl
        LEFT JOIN bill_items tbi ON tbi.bill_id = tbl.bill_id
        ${clause}
      `;
      const [rows] = await db.execute(query, params);
      res.json(rows[0] || {});
    } else {
      const { clause, params } = buildDateFilter(month, year, tenantId);
      const query = `
        SELECT
          COUNT(DISTINCT tbl.invoice_id) AS total_invoices,
          COALESCE(SUM(tbl.total_amount), 0) AS total_sales,
          COALESCE(SUM(tbl.gst_amount), 0) AS total_gst,
          COALESCE(SUM(tbl.cgst_amount), 0) AS total_cgst,
          COALESCE(SUM(tbl.sgst_amount), 0) AS total_sgst,
          COALESCE(SUM(tbl.discount_value), 0) AS total_discount,
          COALESCE(SUM(tbl.transport_charge), 0) AS total_transport,
          COALESCE(SUM(tii.quantity), 0) AS total_quantity_sold,
          COUNT(DISTINCT tii.product_id) AS total_products_sold,
          COALESCE(AVG(tbl.total_amount), 0) AS avg_invoice_value
        FROM invoices tbl
        LEFT JOIN invoice_items tii ON tii.invoice_id = tbl.invoice_id
        ${clause}
      `;
      const [rows] = await db.execute(query, params);
      res.json(rows[0] || {});
    }
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
    const subscriptionType = await getSubscriptionType(tenantId);
    let query, params;
    if (subscriptionType === "bill") {
      if (year) {
        query = `
          SELECT
            DATE_FORMAT(tbl.created_at, '%Y-%m') AS month,
            COUNT(*) AS total_bills,
            COALESCE(SUM(tbl.total_amount), 0) AS total_sales,
            COALESCE(SUM(tbl.gst_amount), 0) AS total_gst,
            COALESCE(SUM(tbl.cgst_amount), 0) AS total_cgst,
            COALESCE(SUM(tbl.sgst_amount), 0) AS total_sgst,
            COALESCE(AVG(tbl.total_amount), 0) AS avg_bill_value,
            COALESCE(SUM(tbi.total_quantity), 0) AS total_quantity_sold
          FROM bills tbl
          LEFT JOIN (
            SELECT bill_id, SUM(quantity) AS total_quantity
            FROM bill_items GROUP BY bill_id
          ) tbi ON tbl.bill_id = tbi.bill_id
          WHERE tbl.tenant_id = ? AND YEAR(tbl.created_at) = ?
          GROUP BY month ORDER BY month
        `;
        params = [tenantId, year];
      } else {
        query = `
          SELECT
            DATE_FORMAT(tbl.created_at, '%Y-%m') AS month,
            COUNT(*) AS total_bills,
            COALESCE(SUM(tbl.total_amount), 0) AS total_sales,
            COALESCE(SUM(tbl.gst_amount), 0) AS total_gst,
            COALESCE(SUM(tbl.cgst_amount), 0) AS total_cgst,
            COALESCE(SUM(tbl.sgst_amount), 0) AS total_sgst,
            COALESCE(AVG(tbl.total_amount), 0) AS avg_bill_value,
            COALESCE(SUM(tbi.total_quantity), 0) AS total_quantity_sold
          FROM bills tbl
          LEFT JOIN (
            SELECT bill_id, SUM(quantity) AS total_quantity
            FROM bill_items GROUP BY bill_id
          ) tbi ON tbl.bill_id = tbi.bill_id
          WHERE tbl.tenant_id = ?
          GROUP BY month ORDER BY month
        `;
        params = [tenantId];
      }
    } else {
      if (year) {
        query = `
          SELECT
            DATE_FORMAT(tbl.created_at, '%Y-%m') AS month,
            COUNT(*) AS total_invoices,
            COALESCE(SUM(tbl.total_amount), 0) AS total_sales,
            COALESCE(SUM(tbl.gst_amount), 0) AS total_gst,
            COALESCE(SUM(tbl.cgst_amount), 0) AS total_cgst,
            COALESCE(SUM(tbl.sgst_amount), 0) AS total_sgst,
            COALESCE(AVG(tbl.total_amount), 0) AS avg_invoice_value,
            COALESCE(SUM(tii.total_quantity), 0) AS total_quantity_sold
          FROM invoices tbl
          LEFT JOIN (
            SELECT invoice_id, SUM(quantity) AS total_quantity
            FROM invoice_items GROUP BY invoice_id
          ) tii ON tbl.invoice_id = tii.invoice_id
          WHERE tbl.tenant_id = ? AND YEAR(tbl.created_at) = ?
          GROUP BY month ORDER BY month
        `;
        params = [tenantId, year];
      } else {
        query = `
          SELECT
            DATE_FORMAT(tbl.created_at, '%Y-%m') AS month,
            COUNT(*) AS total_invoices,
            COALESCE(SUM(tbl.total_amount), 0) AS total_sales,
            COALESCE(SUM(tbl.gst_amount), 0) AS total_gst,
            COALESCE(SUM(tbl.cgst_amount), 0) AS total_cgst,
            COALESCE(SUM(tbl.sgst_amount), 0) AS total_sgst,
            COALESCE(AVG(tbl.total_amount), 0) AS avg_invoice_value,
            COALESCE(SUM(tii.total_quantity), 0) AS total_quantity_sold
          FROM invoices tbl
          LEFT JOIN (
            SELECT invoice_id, SUM(quantity) AS total_quantity
            FROM invoice_items GROUP BY invoice_id
          ) tii ON tbl.invoice_id = tii.invoice_id
          WHERE tbl.tenant_id = ?
          GROUP BY month ORDER BY month
        `;
        params = [tenantId];
      }
    }
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
    const subscriptionType = await getSubscriptionType(tenantId);
    if (subscriptionType === "bill") {
      const { clause, params } = buildDateFilter(month, year, tenantId);
      const query = `
        SELECT
          p.product_name,
          p.hsn_code,
          c.category_name,
          COALESCE(SUM(tbi.quantity), 0) AS total_quantity,
          COALESCE(SUM(tbi.base_amount), 0) AS total_sales,
          COALESCE(SUM(tbi.total_with_gst - tbi.base_amount), 0) AS gst_collected,
          COALESCE(AVG(tbi.gst_percentage), 0) AS avg_gst_rate,
          COALESCE(SUM(tbl.discount_value), 0) AS total_discount_given,
          COUNT(DISTINCT tbl.bill_id) AS bill_count
        FROM bill_items tbi
        JOIN products p ON p.product_id = tbi.product_id AND p.tenant_id = ?
        LEFT JOIN product_categories c ON c.category_id = p.category_id
        JOIN bills tbl ON tbl.bill_id = tbi.bill_id
        ${clause}
        GROUP BY tbi.product_id
        ORDER BY gst_collected DESC
      `;
      const [rows] = await db.execute(query, [tenantId, ...params]);
      res.json(rows);
    } else {
      const { clause, params } = buildDateFilter(month, year, tenantId);
      const query = `
        SELECT
          p.product_name,
          p.hsn_code,
          c.category_name,
          COALESCE(SUM(tii.quantity), 0) AS total_quantity,
          COALESCE(SUM(tii.base_amount), 0) AS total_sales,
          COALESCE(SUM(tii.total_with_gst - tii.base_amount), 0) AS gst_collected,
          COALESCE(AVG(tii.gst_percentage), 0) AS avg_gst_rate,
          COALESCE(SUM(tbl.discount_value), 0) AS total_discount_given,
          COUNT(DISTINCT tbl.invoice_id) AS invoice_count
        FROM invoice_items tii
        JOIN products p ON p.product_id = tii.product_id AND p.tenant_id = ?
        LEFT JOIN product_categories c ON c.category_id = p.category_id
        JOIN invoices tbl ON tbl.invoice_id = tii.invoice_id
        ${clause}
        GROUP BY tii.product_id
        ORDER BY gst_collected DESC
      `;
      const [rows] = await db.execute(query, [tenantId, ...params]);
      res.json(rows);
    }
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
    const subscriptionType = await getSubscriptionType(tenantId);
    if (subscriptionType === "bill") {
      const { clause, params } = buildDateFilter(month, year, tenantId);
      const query = `
        SELECT
          u.first_name,
          u.last_name,
          u.role,
          COUNT(tbl.bill_id) AS total_bills,
          COALESCE(SUM(tbl.gst_amount), 0) AS total_gst_collected,
          COALESCE(SUM(tbl.total_amount), 0) AS total_sales,
          COALESCE(AVG(tbl.gst_amount), 0) AS avg_gst_per_bill
        FROM bills tbl
        JOIN users u ON u.user_id = tbl.created_by AND u.tenant_id = ?
        ${clause}
        GROUP BY tbl.created_by
        ORDER BY total_gst_collected DESC
      `;
      const [rows] = await db.execute(query, [tenantId, ...params]);
      res.json(rows);
    } else {
      const { clause, params } = buildDateFilter(month, year, tenantId);
      const query = `
        SELECT
          u.first_name,
          u.last_name,
          u.role,
          COUNT(tbl.invoice_id) AS total_invoices,
          COALESCE(SUM(tbl.gst_amount), 0) AS total_gst_collected,
          COALESCE(SUM(tbl.total_amount), 0) AS total_sales,
          COALESCE(AVG(tbl.gst_amount), 0) AS avg_gst_per_invoice
        FROM invoices tbl
        JOIN users u ON u.user_id = tbl.created_by AND u.tenant_id = ?
        ${clause}
        GROUP BY tbl.created_by
        ORDER BY total_gst_collected DESC
      `;
      const [rows] = await db.execute(query, [tenantId, ...params]);
      res.json(rows);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// 5. Stock Movements (no change needed: always stock_movements join products)
// router.get("/stock-movements", async (req, res) => {
//   const { month, year } = req.query;
//   const tenantId = req.user.tenant_id;
//   try {
//     let query = `
//       SELECT
//         sm.movement_id,
//         p.product_name,
//         sm.change_type,
//         sm.quantity_changed,
//         sm.old_stock,
//         sm.new_stock,
//         sm.reason,
//         sm.updated_by,
//         sm.created_at
//       FROM stock_movements sm
//       JOIN products p ON p.product_id = sm.product_id
//       WHERE sm.tenant_id = ?
//     `;
//     const params = [tenantId];
//     if (month && year) {
//       query += ` AND MONTH(sm.created_at) = ? AND YEAR(sm.created_at) = ? `;
//       params.push(month, year);
//     } else if (year) {
//       query += ` AND YEAR(sm.created_at) = ? `;
//       params.push(year);
//     }
//     query += ` ORDER BY sm.created_at DESC `;
//     const [rows] = await db.execute(query, params);
//     res.json(rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Internal Server Error");
//   }
// });

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
        u.user_id AS updated_by_id,
        u.first_name AS updated_by_name,
        sm.created_at
      FROM stock_movements sm
      JOIN products p ON p.product_id = sm.product_id
      LEFT JOIN users u ON u.user_id = sm.updated_by
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


// 6. High GST Invoices/Bills
router.get("/high-gst-invoices", async (req, res) => {
  const { month, year } = req.query;
  const tenantId = req.user.tenant_id;
  try {
    const subscriptionType = await getSubscriptionType(tenantId);
    let query, params;
    if (subscriptionType === "bill") {
      query = `
        SELECT
          tbl.bill_number AS invoice_number,
          tbl.bill_date AS invoice_date,
          tbl.customer_name,
          tbl.gst_amount,
          tbl.total_amount
        FROM bills tbl
        WHERE tbl.tenant_id = ? AND tbl.gst_amount > 0
      `;
      params = [tenantId];
      if (month && year) {
        query += ` AND MONTH(tbl.created_at) = ? AND YEAR(tbl.created_at) = ? `;
        params.push(month, year);
      } else if (year) {
        query += ` AND YEAR(tbl.created_at) = ? `;
        params.push(year);
      }
      query += ` ORDER BY tbl.gst_amount DESC`;
    } else {
      query = `
        SELECT
          tbl.invoice_number,
          tbl.invoice_date,
          c.name AS customer_name,
          tbl.gst_amount,
          tbl.total_amount
        FROM invoices tbl
        LEFT JOIN customers c ON c.customer_id = tbl.customer_id
        WHERE tbl.tenant_id = ? AND tbl.gst_amount > 0
      `;
      params = [tenantId];
      if (month && year) {
        query += ` AND MONTH(tbl.created_at) = ? AND YEAR(tbl.created_at) = ? `;
        params.push(month, year);
      } else if (year) {
        query += ` AND YEAR(tbl.created_at) = ? `;
        params.push(year);
      }
      query += ` ORDER BY tbl.gst_amount DESC`;
    }
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
    const subscriptionType = await getSubscriptionType(tenantId);
    if (subscriptionType === "bill") {
      const { clause, params } = buildDateFilter(month, year, tenantId);
      const query = `
        SELECT
          p.product_name,
          COUNT(tbi.bill_item_id) AS times_sold,
          ROUND(AVG(tbl.discount_value), 2) AS avg_discount,
          ROUND(SUM(tbl.discount_value), 2) AS total_discount_amount,
          MIN(tbl.discount_value) AS min_discount,
          MAX(tbl.discount_value) AS max_discount
        FROM bill_items tbi
        JOIN bills tbl ON tbl.bill_id = tbi.bill_id
        JOIN products p ON p.product_id = tbi.product_id AND p.tenant_id = ?
        ${clause}
        GROUP BY p.product_name
        ORDER BY avg_discount DESC
      `;
      const [rows] = await db.execute(query, [tenantId, ...params]);
      res.json(rows);
    } else {
      const { clause, params } = buildDateFilter(month, year, tenantId);
      const query = `
        SELECT
          p.product_name,
          COUNT(tii.item_id) AS times_sold,
          ROUND(AVG(tbl.discount_value), 2) AS avg_discount,
          ROUND(SUM(tbl.discount_value), 2) AS total_discount_amount,
          MIN(tbl.discount_value) AS min_discount,
          MAX(tbl.discount_value) AS max_discount
        FROM invoice_items tii
        JOIN invoices tbl ON tbl.invoice_id = tii.invoice_id
        JOIN products p ON p.product_id = tii.product_id AND p.tenant_id = ?
        ${clause}
        GROUP BY p.product_name
        ORDER BY avg_discount DESC
      `;
      const [rows] = await db.execute(query, [tenantId, ...params]);
      res.json(rows);
    }
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
    const subscriptionType = await getSubscriptionType(tenantId);
    if (subscriptionType === "bill") {
      const { clause, params } = buildDateFilter(month, year, tenantId);
      const query = `
        SELECT
          c.category_name,
          COUNT(DISTINCT tbi.product_id) AS products_in_category,
          COALESCE(SUM(tbi.quantity), 0) AS total_quantity_sold,
          COALESCE(SUM(tbi.base_amount), 0) AS total_sales,
          COALESCE(SUM(tbi.total_with_gst - tbi.base_amount), 0) AS total_gst_collected,
          COALESCE(AVG(tbi.gst_percentage), 0) AS avg_gst_rate,
          ROUND(AVG(tbl.discount_value), 2) AS avg_discount
        FROM bill_items tbi
        JOIN products p ON p.product_id = tbi.product_id AND p.tenant_id = ?
        JOIN product_categories c ON c.category_id = p.category_id
        JOIN bills tbl ON tbl.bill_id = tbi.bill_id
        ${clause}
        GROUP BY c.category_name
        ORDER BY total_sales DESC
      `;
      const [rows] = await db.execute(query, [tenantId, ...params]);
      res.json(rows);
    } else {
      const { clause, params } = buildDateFilter(month, year, tenantId);
      const query = `
        SELECT
          c.category_name,
          COUNT(DISTINCT tii.product_id) AS products_in_category,
          COALESCE(SUM(tii.quantity), 0) AS total_quantity_sold,
          COALESCE(SUM(tii.base_amount), 0) AS total_sales,
          COALESCE(SUM(tii.total_with_gst - tii.base_amount), 0) AS total_gst_collected,
          COALESCE(AVG(tii.gst_percentage), 0) AS avg_gst_rate,
          ROUND(AVG(tbl.discount_value), 2) AS avg_discount
        FROM invoice_items tii
        JOIN products p ON p.product_id = tii.product_id AND p.tenant_id = ?
        JOIN product_categories c ON c.category_id = p.category_id
        JOIN invoices tbl ON tbl.invoice_id = tii.invoice_id
        ${clause}
        GROUP BY c.category_name
        ORDER BY total_sales DESC
      `;
      const [rows] = await db.execute(query, [tenantId, ...params]);
      res.json(rows);
    }
  } catch (err) {
    console.error("Error fetching category sales summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 9. Advance Invoices/Bills
router.get("/advance-invoices", async (req, res) => {
  const { status } = req.query;
  const tenantId = req.user.tenant_id;
  try {
    const subscriptionType = await getSubscriptionType(tenantId);
    let sql, params;
    if (subscriptionType === "bill") {
      sql = `
        SELECT 
          tbl.bill_id, tbl.bill_number, tbl.bill_date,
          tbl.total_amount, tbl.advance_amount,
          (tbl.total_amount - tbl.advance_amount) AS due_amount,
          tbl.due_date, tbl.payment_completion_status,
          tbl.payment_settlement_date,
          tbl.customer_name AS customer_name, tbl.mobile_no AS customer_mobile
        FROM bills tbl
        WHERE tbl.tenant_id = ? AND tbl.payment_status = 'Advance'
      `;
      params = [tenantId];
      if (status === "pending") {
        sql += " AND tbl.payment_completion_status = 'Pending'";
      } else if (status === "completed") {
        sql += " AND tbl.payment_completion_status = 'Completed'";
      }
      sql += " ORDER BY tbl.bill_date DESC";
    } else {
      sql = `
        SELECT 
          tbl.invoice_id, tbl.invoice_number, tbl.invoice_date,
          tbl.total_amount, tbl.advance_amount,
          (tbl.total_amount - tbl.advance_amount) AS due_amount,
          tbl.due_date, tbl.payment_completion_status,
          tbl.payment_settlement_date,
          c.name AS customer_name, c.mobile AS customer_mobile
        FROM invoices tbl
        LEFT JOIN customers c ON tbl.customer_id = c.customer_id
        WHERE tbl.tenant_id = ? AND tbl.payment_status = 'Advance'
      `;
      params = [tenantId];
      if (status === "pending") {
        sql += " AND tbl.payment_completion_status = 'Pending'";
      } else if (status === "completed") {
        sql += " AND tbl.payment_completion_status = 'Completed'";
      }
      sql += " ORDER BY tbl.invoice_date DESC";
    }
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching advance invoices:", err);
    res.status(500).json({ error: "Failed to fetch advance invoices" });
  }
});

module.exports = router;
