const express = require('express');
const router = express.Router();
const db = require('../config/config.js');

// GET billing addresses for a company
router.get('/:companyId', async (req, res) => {
  const { companyId } = req.params;
  try {
    const [addresses] = await db.execute(
      'SELECT * FROM billing_address WHERE company_id = ? AND is_active = TRUE',
      [companyId]
    );
    res.json(addresses);
  } catch (err) {
    console.error('[BACKEND] GET /billing_address error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create new billing address for a company
router.post('/', async (req, res) => {
  const {
    company_id,
    address_name,
    address,
    cell_no1,
    cell_no2,
    gst_no,
    pan_no,
    account_name,
    bank_name,
    branch_name,
    ifsc_code,
    account_number,
    email,
    website,
  } = req.body;

  if (!company_id || !address_name || !address) {
    return res.status(400).json({ message: 'Required fields missing' });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO billing_address
      (company_id, address_name, address, cell_no1, cell_no2, gst_no, pan_no, account_name, bank_name, branch_name, ifsc_code, account_number, email, website)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_id,
        address_name,
        address,
        cell_no1 || null,
        cell_no2 || null,
        gst_no || null,
        pan_no || null,
        account_name || null,
        bank_name || null,
        branch_name || null,
        ifsc_code || null,
        account_number || null,
        email || null,
        website || null,
      ]
    );
    res.status(201).json({ message: 'Billing address created', billing_address_id: result.insertId });
  } catch (err) {
    console.error('[BACKEND] POST /billing_address error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT update a billing address by id
router.put('/:billingAddressId', async (req, res) => {
  const { billingAddressId } = req.params;
  const {
    address_name,
    address,
    cell_no1,
    cell_no2,
    gst_no,
    pan_no,
    account_name,
    bank_name,
    branch_name,
    ifsc_code,
    account_number,
    email,
    website,
    is_active,
  } = req.body;

  try {
    const [result] = await db.execute(
      `UPDATE billing_address SET
      address_name = COALESCE(?, address_name),
      address = COALESCE(?, address),
      cell_no1 = COALESCE(?, cell_no1),
      cell_no2 = COALESCE(?, cell_no2),
      gst_no = COALESCE(?, gst_no),
      pan_no = COALESCE(?, pan_no),
      account_name = COALESCE(?, account_name),
      bank_name = COALESCE(?, bank_name),
      branch_name = COALESCE(?, branch_name),
      ifsc_code = COALESCE(?, ifsc_code),
      account_number = COALESCE(?, account_number),
      email = COALESCE(?, email),
      website = COALESCE(?, website),
      is_active = COALESCE(?, is_active)
      WHERE billing_address_id = ?`,
      [
        address_name,
        address,
        cell_no1,
        cell_no2,
        gst_no,
        pan_no,
        account_name,
        bank_name,
        branch_name,
        ifsc_code,
        account_number,
        email,
        website,
        typeof is_active === 'boolean' ? is_active : null,
        billingAddressId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Billing address not found' });
    }

    res.json({ message: 'Billing address updated' });
  } catch (err) {
    console.error('[BACKEND] PUT /billing_address error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE (soft-delete) a billing address by id
router.delete('/:billingAddressId', async (req, res) => {
  const { billingAddressId } = req.params;

  try {
    // Soft delete - set is_active = false
    const [result] = await db.execute(
      'UPDATE billing_address SET is_active = FALSE WHERE billing_address_id = ?',
      [billingAddressId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Billing address not found' });
    }

    res.json({ message: 'Billing address deactivated' });
  } catch (err) {
    console.error('[BACKEND] DELETE /billing_address error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
