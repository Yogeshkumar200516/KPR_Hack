require('dotenv').config();
const express = require('express');
const router = express.Router();
const db = require('../config/config.js');
const jwt = require('jsonwebtoken');

const secretKey = process.env.SECRET_KEY;

router.post('/login', async (req, res) => {
  console.log("[BACKEND] /login POST called");

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Fetch active user
    const [users] = await db.execute(
      'SELECT * FROM users WHERE BINARY email = ? AND status = "active"',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // ❌ No bcrypt, just plain text compare
    if (user.password_hash !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // ✅ Only check tenant if not super_admin
    let company = null;
    if (user.role !== 'super_admin') {
      const [companies] = await db.execute(
        'SELECT * FROM company_info WHERE id = ?',
        [user.tenant_id]
      );
      if (companies.length === 0) {
        return res.status(401).json({ message: 'Invalid tenant' });
      }
      company = companies[0];
    }

    // Create JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        tenant_id: user.tenant_id,
        role: user.role,
        first_name: user.first_name
      },
      secretKey,
      { expiresIn: '22h' }
    );

    const decoded = jwt.verify(token, secretKey);

    // Response object
    const responseUser = {
      user_id: user.user_id,
      tenant_id: user.tenant_id,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      tokenExpiry: decoded.exp,
    };

    res.json({
      message: 'Login successful',
      token,
      user: responseUser,
      company, // null for super_admin
    });

  } catch (err) {
    console.error('[BACKEND] Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
