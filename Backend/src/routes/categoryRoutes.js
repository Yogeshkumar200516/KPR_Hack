const express = require("express");
const router = express.Router();
const db = require("../config/config.js");
const { authenticateUser } = require("../middleware/auth.js");

// Apply authentication middleware to all category routes
router.use(authenticateUser);

// GET all categories for tenant
router.get("/", async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) {
    return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
  }

  try {
    const [rows] = await db.execute(
      "SELECT * FROM product_categories WHERE tenant_id = ? ORDER BY created_at DESC",
      [tenant_id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ADD new category for tenant
router.post("/add", async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { category_name, is_active = true } = req.body;

  if (!tenant_id) {
    return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
  }

  if (!category_name || !category_name.trim()) {
    return res.status(400).json({ error: "Category name is required" });
  }

  const trimmedName = category_name.trim();

  try {
    // Check for duplicate category name in the same tenant
    const [existing] = await db.execute(
      "SELECT category_id FROM product_categories WHERE tenant_id = ? AND category_name = ?",
      [tenant_id, trimmedName]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "Category already exists for this tenant" });
    }

    await db.execute(
      "INSERT INTO product_categories (tenant_id, category_name, is_active) VALUES (?, ?, ?)",
      [tenant_id, trimmedName, is_active]
    );

    res.status(201).json({ message: "Category added successfully" });
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({ error: "Failed to add category" });
  }
});

// UPDATE category (only if belongs to tenant)
router.put("/edit/:id", async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { id } = req.params;
  const { category_name, is_active } = req.body;

  if (!tenant_id) {
    return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
  }

  if (!category_name || !category_name.trim()) {
    return res.status(400).json({ error: "Category name is required" });
  }

  const trimmedName = category_name.trim();

  try {
    // Check for duplicate category name in the same tenant (excluding current category)
    const [existing] = await db.execute(
      "SELECT category_id FROM product_categories WHERE tenant_id = ? AND category_name = ? AND category_id != ?",
      [tenant_id, trimmedName, id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "Category already exists for this tenant" });
    }

    const [result] = await db.execute(
      `UPDATE product_categories
       SET category_name = ?, is_active = ?
       WHERE category_id = ? AND tenant_id = ?`,
      [trimmedName, is_active, id, tenant_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found or unauthorized" });
    }

    res.json({ message: "Category updated successfully" });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// TOGGLE status (only if belongs to tenant)
router.patch("/toggle-status/:id", async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { id } = req.params;

  if (!tenant_id) {
    return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
  }

  try {
    const [current] = await db.execute(
      "SELECT is_active FROM product_categories WHERE category_id = ? AND tenant_id = ?",
      [id, tenant_id]
    );

    if (current.length === 0) {
      return res.status(404).json({ error: "Category not found or unauthorized" });
    }

    const newStatus = !current[0].is_active;
    await db.execute(
      "UPDATE product_categories SET is_active = ? WHERE category_id = ? AND tenant_id = ?",
      [newStatus, id, tenant_id]
    );

    res.json({ message: `Category ${newStatus ? "activated" : "deactivated"} successfully` });
  } catch (error) {
    console.error("Error toggling status:", error);
    res.status(500).json({ error: "Failed to toggle status" });
  }
});

module.exports = router;
