const express = require('express');
const router = express.Router();
const db = require('../config/config.js');
const { authenticateUser } = require('../middleware/auth.js');

/* --------------------------
   Utility to check super_admin
--------------------------- */
const ensureSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super admin only.' });
  }
  next();
};

/* --------------------------
   COMPANIES CRUD (company_info)
--------------------------- */

// Get all companies (super_admin only)
router.get('/companies', authenticateUser, ensureSuperAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM company_info');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single company by ID
router.get('/companies/:id', authenticateUser, ensureSuperAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM company_info WHERE id=?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Company not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new company
router.post('/companies', authenticateUser, ensureSuperAdmin, async (req, res) => {
  try {
    let {
      company_name,
      company_logo,
      address,
      cell_no1,
      cell_no2,
      email,
      gst_no,
      pan_no,
      account_name,
      bank_name,
      branch_name,
      ifsc_code,
      account_number,
      website,
      subscription_type,
      is_active
    } = req.body;

    // Convert undefined → null and ensure proper defaults
    company_logo = company_logo ?? null;
    address = address ?? null;
    cell_no1 = cell_no1 ?? null;
    cell_no2 = cell_no2 ?? null;
    email = email ?? null;
    gst_no = gst_no ?? null;
    pan_no = pan_no ?? null;
    account_name = account_name ?? null;
    bank_name = bank_name ?? null;
    branch_name = branch_name ?? null;
    ifsc_code = ifsc_code ?? null;
    account_number = account_number ?? null;
    website = website ?? null;
    subscription_type = subscription_type ?? 'invoice';  // Default subscription
    is_active = (is_active === false || is_active === 0) ? 0 : 1;

    const [result] = await db.execute(
      `INSERT INTO company_info
        (company_name, company_logo, address, cell_no1, cell_no2, email, gst_no, pan_no, 
         account_name, bank_name, branch_name, ifsc_code, account_number, website, subscription_type, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        company_name, company_logo, address, cell_no1, cell_no2, email, gst_no, pan_no,
        account_name, bank_name, branch_name, ifsc_code, account_number, website, subscription_type, is_active
      ]
    );

    res.json({ message: 'Company added successfully', id: result.insertId });
  } catch (err) {
    console.error('Error adding company:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/companies/:id', authenticateUser, ensureSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let {
      company_name,
      company_logo,
      address,
      cell_no1,
      cell_no2,
      email,
      gst_no,
      pan_no,
      account_name,
      bank_name,
      branch_name,
      ifsc_code,
      account_number,
      website,
      subscription_type,
      is_active
    } = req.body;

    company_logo = company_logo ?? null;
    address = address ?? null;
    cell_no1 = cell_no1 ?? null;
    cell_no2 = cell_no2 ?? null;
    email = email ?? null;
    gst_no = gst_no ?? null;
    pan_no = pan_no ?? null;
    account_name = account_name ?? null;
    bank_name = bank_name ?? null;
    branch_name = branch_name ?? null;
    ifsc_code = ifsc_code ?? null;
    account_number = account_number ?? null;
    website = website ?? null;
    subscription_type = subscription_type ?? 'invoice';
    is_active = (is_active === false || is_active === 0) ? 0 : 1;

    await db.execute(
      `UPDATE company_info SET
        company_name=?, company_logo=?, address=?, cell_no1=?, cell_no2=?, email=?, gst_no=?, pan_no=?, 
        account_name=?, bank_name=?, branch_name=?, ifsc_code=?, account_number=?, website=?, 
        subscription_type=?, is_active=?
       WHERE id=?`,
      [
        company_name, company_logo, address, cell_no1, cell_no2, email, gst_no, pan_no,
        account_name, bank_name, branch_name, ifsc_code, account_number, website, subscription_type, is_active,
        id
      ]
    );

    res.json({ message: 'Company updated successfully' });
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete company
router.delete('/companies/:id', authenticateUser, ensureSuperAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM company_info WHERE id=?', [req.params.id]);
    res.json({ message: 'Company deleted' });
  } catch (err) {
    console.error('Error deleting company:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* --------------------------
   USERS CRUD
--------------------------- */

// Get all users (super_admin sees all; admin sees own company)
router.get('/users', authenticateUser, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'super_admin') {
      [rows] = await db.execute('SELECT * FROM users');
    } else if (req.user.role === 'admin') {
      [rows] = await db.execute('SELECT * FROM users WHERE tenant_id=?', [req.user.tenant_id]);
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single user
router.get('/users/:id', authenticateUser, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'super_admin') {
      [rows] = await db.execute('SELECT * FROM users WHERE user_id=?', [req.params.id]);
    } else if (req.user.role === 'admin') {
      [rows] = await db.execute('SELECT * FROM users WHERE user_id=? AND tenant_id=?', [
        req.params.id,
        req.user.tenant_id
      ]);
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new user (super_admin can add anywhere, admin only in own company)
router.post('/users', authenticateUser, async (req, res) => {
  const { tenant_id, first_name, last_name, mobile_number, email, password_hash, role, status } =
    req.body;

  try {
    let actualTenantId = tenant_id;

    if (req.user.role === 'super_admin') {
      // super admin can create super_admin or admin or any role; tenant_id may be null for super_admin
    } else if (req.user.role === 'admin') {
      // admin can only create users in own tenant, not super_admin
      if (role === 'super_admin')
        return res.status(403).json({ message: 'Admins cannot create super admins' });
      actualTenantId = req.user.tenant_id;
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [result] = await db.execute(
      `INSERT INTO users 
       (tenant_id, first_name, last_name, mobile_number, email, password_hash, role, status) 
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        actualTenantId,
        first_name,
        last_name,
        mobile_number,
        email,
        password_hash,
        role,
        status || 'active'
      ]
    );

    res.status(201).json({ message: 'User created', user_id: result.insertId });
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
router.put('/users/:id', authenticateUser, async (req, res) => {
  try {
    let allowed = false;
    if (req.user.role === 'super_admin') allowed = true;
    if (req.user.role === 'admin') {
      // admin can only update users in own company and not super_admin role
      const [rows] = await db.execute('SELECT role, tenant_id FROM users WHERE user_id=?', [
        req.params.id
      ]);
      if (rows.length && rows[0].tenant_id === req.user.tenant_id && rows[0].role !== 'super_admin')
        allowed = true;
    }
    if (!allowed) return res.status(403).json({ message: 'Access denied' });

    const fields = Object.keys(req.body);
    if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });
    const updates = fields.map((f) => `${f}=?`).join(',');
    const values = fields.map((f) => req.body[f]);
    values.push(req.params.id);

    await db.execute(`UPDATE users SET ${updates} WHERE user_id=?`, values);
    res.json({ message: 'User updated' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', authenticateUser, async (req, res) => {
  try {
    let allowed = false;
    if (req.user.role === 'super_admin') allowed = true;
    if (req.user.role === 'admin') {
      // admin can only delete users in own company and not super_admin
      const [rows] = await db.execute('SELECT role, tenant_id FROM users WHERE user_id=?', [
        req.params.id
      ]);
      if (rows.length && rows[0].tenant_id === req.user.tenant_id && rows[0].role !== 'super_admin')
        allowed = true;
    }
    if (!allowed) return res.status(403).json({ message: 'Access denied' });

    await db.execute('DELETE FROM users WHERE user_id=?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
