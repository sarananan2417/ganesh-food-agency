import { Router } from 'express';
import pool from '../db.js';
const router = Router();

router.get('/menus', async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM menus WHERE is_active=1 ORDER BY sort_order, id');
  res.json(rows);
});
router.get('/products', async (req, res) => {
  const { search = '', menu = '' } = req.query;
  let sql = `SELECT p.*, m.name AS menu_name FROM products p LEFT JOIN menus m ON m.id=p.menu_id WHERE p.is_active=1`;
  const args = [];
  if (search) { sql += ' AND p.name LIKE ?'; args.push(`%${search}%`); }
  if (menu) { sql += ' AND p.menu_id=?'; args.push(menu); }
  sql += ' ORDER BY p.created_at DESC';
  const [rows] = await pool.query(sql, args);
  res.json(rows);
});
router.get('/products/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM products WHERE id=? AND is_active=1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Product not found' });
  res.json(rows[0]);
});
router.post('/orders', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { name, phone, address, paymentMethod = 'COD', items } = req.body;
    if (!name || !phone || !address || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'Please provide customer details and cart items' });
    }
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO customers (name,phone,address) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), address=VALUES(address)`,
      [name, phone, address]
    );
    const [[customer]] = await conn.query('SELECT id FROM customers WHERE phone=?', [phone]);
    let total = 0;
    const validated = [];
    for (const item of items) {
      const [[p]] = await conn.query('SELECT id,name,price,stock FROM products WHERE id=? AND is_active=1 FOR UPDATE', [item.productId]);
      const qty = Math.max(1, Math.min(99, Number(item.quantity) || 1));
      if (!p || p.stock < qty) throw new Error(`Product unavailable or insufficient stock: ${item.productId}`);
      total += Number(p.price) * qty;
      validated.push({ ...p, qty });
    }
    const [order] = await conn.query('INSERT INTO orders (customer_id,total,payment_method) VALUES (?,?,?)', [customer.id, total, paymentMethod]);
    for (const p of validated) {
      await conn.query('INSERT INTO order_items (order_id,product_id,product_name,price,quantity) VALUES (?,?,?,?,?)',
        [order.insertId, p.id, p.name, p.price, p.qty]);
      await conn.query('UPDATE products SET stock=stock-? WHERE id=?', [p.qty, p.id]);
    }
    await conn.commit();
    res.status(201).json({ message: 'Order placed successfully', orderId: order.insertId, total });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ message: e.message || 'Could not place order' });
  } finally { conn.release(); }
});
export default router;
