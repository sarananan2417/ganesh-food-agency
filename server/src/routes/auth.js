import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, username: rows[0].username });
  } catch (e) { res.status(500).json({ message: 'Login failed' }); }
});

router.get('/me', requireAdmin, (req, res) => res.json({ username: req.admin.username }));
export default router;
