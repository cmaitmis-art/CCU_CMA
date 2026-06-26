const express = require('express');
const router = express.Router();
const db = require('../db');

function buildUserPayload(user) {
  const fullName = user?.name?.trim() || user?.username?.trim() || 'Admin User';
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase() || 'AD';

  return {
    id: user?.id,
    username: user?.username,
    name: fullName,
    role: user?.role,
    email: user?.email || '',
    avatar: initials,
  };
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const uname = String(username || '').trim();
    const pass = String(password || '');

    if (!uname || !pass) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await db.models.User.findOne({ where: { username: uname } });
    if (!user) {
      return res.status(401).json({ error: 'Username not found.' });
    }

    if (String(user.password) !== pass) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    res.json(buildUserPayload(user));
  } catch (err) {
    console.error('Auth login failed:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

module.exports = router;
