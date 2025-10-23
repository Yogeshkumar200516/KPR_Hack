const express = require("express");
const router = express.Router();
const db = require("../config/config.js"); // Database config import
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ⬇️ Import your authentication middleware
const { authenticateUser } = require("../middleware/auth.js");

// Apply auth to all product routes
router.use(authenticateUser);

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../public/images/products");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.use((req, res, next) => {
  console.log(
    `[PRODUCT ROUTER] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`
  );
  next();
});

// Generate barcode function
const generateBarcode = () => "BC" + Math.random().toString().slice(2, 10);

// ==================== PRODUCT ROUTES ====================

// Add a new product
router.post("/add", async (req, res) => {
  try {
    // ✅ Ensure tenant_id exists
    if (!req.user || !req.user.tenant_id) {
      return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
    }

    const {
      product_name,
      hsn_code,
      category_id,
      price,
      stock_quantity,
      description,
      image_url,
      gst,
      c_gst,
      s_gst,
      discount = 0,
      barcode,
    } = req.body;

    // ✅ Basic field validation
    if (
      !product_name ||
      !hsn_code ||
      !category_id ||
      price == null ||
      stock_quantity == null ||
      gst == null ||
      c_gst == null ||
      s_gst == null
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Verify category for this tenant
    const [categoryCheck] = await db.execute(
      "SELECT category_id, is_active FROM product_categories WHERE category_id = ? AND tenant_id = ?",
      [category_id, req.user.tenant_id]
    );

    if (categoryCheck.length === 0) {
      return res.status(400).json({ error: "Category does not exist for this tenant" });
    }

    if (Number(categoryCheck[0].is_active) !== 1) {
      return res.status(400).json({ error: "Category is inactive" });
    }

    // ✅ Generate barcode if not provided
    const finalBarcode = barcode || generateBarcode();

    // ✅ Insert product
    const insertQuery = `
      INSERT INTO products (
        product_name, barcode, hsn_code, category_id, price, stock_quantity,
        description, image_url, gst, c_gst, s_gst, discount, tenant_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(insertQuery, [
      product_name,
      finalBarcode,
      hsn_code,
      category_id,
      price,
      stock_quantity,
      description || "",
      image_url || "",
      gst,
      c_gst,
      s_gst,
      discount,
      req.user.tenant_id,
    ]);

    res.status(201).json({
      message: "Product added successfully",
      product_id: result.insertId,
      barcode: finalBarcode,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Failed to add product" });
  }
});

// Edit a product by ID
router.put("/edit/:id", async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    let {
      product_name,
      hsn_code,
      category_id,
      price,
      stock_quantity,
      description,
      image_url,
      gst,
      c_gst,
      s_gst,
      discount = 0,
      barcode,
    } = req.body;

    category_id = parseInt(category_id);
    price = parseFloat(price);
    stock_quantity = parseInt(stock_quantity);
    gst = parseFloat(gst);
    c_gst = parseFloat(c_gst);
    s_gst = parseFloat(s_gst);
    discount = parseFloat(discount);

    if (
      !product_name ||
      !hsn_code ||
      isNaN(category_id) ||
      isNaN(price) ||
      isNaN(stock_quantity) ||
      isNaN(gst) ||
      isNaN(c_gst) ||
      isNaN(s_gst) ||
      isNaN(discount)
    ) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    // ✅ Check category validity for tenant
    const [categoryRows] = await db.execute(
      "SELECT category_id, is_active FROM product_categories WHERE category_id = ? AND tenant_id = ?",
      [category_id, req.user.tenant_id]
    );

    if (categoryRows.length === 0) {
      return res.status(400).json({ error: "Category does not exist for this tenant" });
    }
    if (Number(categoryRows[0].is_active) !== 1) {
      return res.status(400).json({ error: "Category is inactive" });
    }

    const updateQuery = `
      UPDATE products SET
        product_name = ?, barcode = ?, hsn_code = ?, category_id = ?, price = ?, stock_quantity = ?,
        description = ?, image_url = ?, gst = ?, c_gst = ?, s_gst = ?, discount = ?
      WHERE product_id = ? AND tenant_id = ?
    `;

    const params = [
      product_name,
      barcode || null,
      hsn_code,
      category_id,
      price,
      stock_quantity,
      description || "",
      image_url || "",
      gst,
      c_gst,
      s_gst,
      discount,
      productId,
      req.user.tenant_id,
    ];

    const [result] = await db.execute(updateQuery, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found or no changes made" });
    }

    res.json({ message: "Product updated successfully" });
  } catch (err) {
    console.error("PUT /edit/:id error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

// ==================== CATEGORY ROUTES ====================

// Fetch categories (tenant-specific)
router.get("/categories", async (req, res) => {
  try {
    if (!req.user?.tenant_id) {
      return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
    }

    const [categories] = await db.execute(
      "SELECT category_id, category_name, is_active FROM product_categories WHERE tenant_id = ? ORDER BY category_name ASC",
      [req.user.tenant_id]
    );
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});


// ==================== OTHER ROUTES (unchanged) ====================
// (Keep your fetch products, delete, traced, toggle-trace, update-stock, upload, by-barcode as is)

// Fetch products (tenant-specific)
router.get("/", async (req, res) => {
  try {
    const [products] = await db.execute(
      `
        SELECT p.*, c.category_name
        FROM products p
        JOIN product_categories c ON p.category_id = c.category_id
        WHERE p.is_traced = FALSE AND p.tenant_id = ?
        ORDER BY p.created_at DESC
      `,
      [req.user.tenant_id]
    );

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Delete product (tenant-specific)
router.delete("/delete/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    const [checkRef] = await db.execute(
      "SELECT COUNT(*) AS count FROM invoice_items WHERE product_id = ?",
      [productId]
    );

    if (checkRef[0].count > 0) {
      await db.execute(
        "UPDATE products SET is_traced = TRUE WHERE product_id = ? AND tenant_id = ?",
        [productId, req.user.tenant_id]
      );

      return res.status(200).json({
        message: "Product marked as traced (not deleted).",
        traced: true,
      });
    }

    const [result] = await db.execute(
      "DELETE FROM products WHERE product_id = ? AND tenant_id = ?",
      [productId, req.user.tenant_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted successfully", traced: false });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Fetch traced products (tenant-specific)
router.get("/traced", async (req, res) => {
  try {
    const [products] = await db.execute(
      `
        SELECT p.*, c.category_name
        FROM products p
        JOIN product_categories c ON p.category_id = c.category_id
        WHERE p.is_traced = TRUE AND p.tenant_id = ?
        ORDER BY p.created_at DESC
      `,
      [req.user.tenant_id]
    );

    res.json(products);
  } catch (error) {
    console.error("Error fetching traced products:", error);
    res.status(500).json({ error: "Failed to fetch traced products" });
  }
});

// Toggle traced status (tenant-specific)
router.put("/:productId/toggle-trace", async (req, res) => {
  const { productId } = req.params;

  try {
    const [result] = await db.execute(
      `UPDATE products SET is_traced = NOT is_traced WHERE product_id = ? AND tenant_id = ?`,
      [productId, req.user.tenant_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product trace status toggled successfully" });
  } catch (error) {
    console.error("Error toggling trace status:", error);
    res.status(500).json({ error: "Failed to toggle trace status" });
  }
});

// Fetch a single product by ID (tenant-specific)
router.get("/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    const [rows] = await db.execute(
      `
        SELECT p.*, c.category_name
        FROM products p
        JOIN product_categories c ON p.category_id = c.category_id
        WHERE p.product_id = ? AND p.tenant_id = ?
      `,
      [productId, req.user.tenant_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Update stock (tenant-specific)
router.post("/update-stock", async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      product_id,
      new_stock,
      updated_by = "admin",
      reason = "Stock updated due to shortage",
    } = req.body;

    if (!product_id || new_stock === undefined || new_stock < 0) {
      return res.status(400).json({ message: "Invalid product_id or new_stock value." });
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      "SELECT stock_quantity FROM products WHERE product_id = ? AND tenant_id = ? FOR UPDATE",
      [product_id, req.user.tenant_id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Product not found." });
    }

    const oldStock = rows[0].stock_quantity;
    const stockChange = new_stock - oldStock;
    const changeType = stockChange > 0 ? "IN" : "OUT";

    await connection.execute(
      "UPDATE products SET stock_quantity = ? WHERE product_id = ? AND tenant_id = ?",
      [new_stock, product_id, req.user.tenant_id]
    );

    await connection.execute(
      `INSERT INTO stock_movements 
        (product_id, change_type, quantity_changed, old_stock, new_stock, reason, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        product_id,
        changeType,
        Math.abs(stockChange),
        oldStock,
        new_stock,
        reason,
        updated_by,
      ]
    );

    await connection.commit();
    res.status(200).json({ message: "Stock updated and movement logged." });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: "Error updating stock", error: error.message });
  } finally {
    connection.release();
  }
});

// Image upload route
router.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  const imagePath = `images/products/${req.file.filename}`;
  res.status(200).json({ imagePath });
});

// Fetch product by barcode (tenant-agnostic)
router.get("/by-barcode/:barcode", async (req, res) => {
  const { barcode } = req.params;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM products WHERE barcode = ?",
      [barcode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching product by barcode:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
