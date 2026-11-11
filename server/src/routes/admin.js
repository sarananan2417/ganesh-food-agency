import { Router } from 'express';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
const router = Router();
router.use(requireAdmin);

router.get('/dashboard', async (_req,res) => {
  const [[products]] = await pool.query('SELECT COUNT(*) count FROM products');
  const [[orders]] = await pool.query('SELECT COUNT(*) count FROM orders');
  const [[customers]] = await pool.query('SELECT COUNT(*) count FROM customers');
  const [[revenue]] = await pool.query("SELECT COALESCE(SUM(total),0) total FROM orders WHERE status <> 'Cancelled'");
  const [recent] = await pool.query(`SELECT o.id,o.total,o.status,o.created_at,c.name AS customer
    FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC LIMIT 6`);
  res.json({ products: products.count, orders: orders.count, customers: customers.count, revenue: revenue.total, recent });
});

router.get('/menus', async (_req,res) => { const [r]=await pool.query('SELECT * FROM menus ORDER BY sort_order,id'); res.json(r); });
router.post('/menus', async (req,res) => {
  const {name,icon='🍬',is_active=true,sort_order=0}=req.body;
  if(!name) return res.status(400).json({message:'Menu name required'});
  const [r]=await pool.query('INSERT INTO menus(name,icon,is_active,sort_order) VALUES(?,?,?,?)',[name,icon,!!is_active,sort_order]);
  res.status(201).json({id:r.insertId,name,icon,is_active:!!is_active,sort_order});
});
router.put('/menus/:id', async (req,res) => {
  const {name,icon,is_active=true,sort_order=0}=req.body;
  await pool.query('UPDATE menus SET name=?,icon=?,is_active=?,sort_order=? WHERE id=?',[name,icon,!!is_active,sort_order,req.params.id]);
  res.json({message:'Menu updated'});
});
router.delete('/menus/:id', async (req,res) => { await pool.query('DELETE FROM menus WHERE id=?',[req.params.id]); res.json({message:'Menu deleted'}); });

router.get('/products', async (_req,res) => { const [r]=await pool.query('SELECT p.*,m.name menu_name FROM products p LEFT JOIN menus m ON m.id=p.menu_id ORDER BY p.created_at DESC'); res.json(r); });
router.post('/products', async (req,res) => {
  const {menu_id=null,name,description='',image='',price=0,rating=4.5,stock=0,is_active=true}=req.body;
  if(!name || Number(price)<0) return res.status(400).json({message:'Valid product name and price required'});
  const [r]=await pool.query('INSERT INTO products(menu_id,name,description,image,price,rating,stock,is_active) VALUES(?,?,?,?,?,?,?,?)',
    [menu_id||null,name,description,image,Number(price),Number(rating),Number(stock),!!is_active]);
  res.status(201).json({id:r.insertId,message:'Product created'});
});
router.put('/products/:id', async (req,res) => {
  const {menu_id=null,name,description='',image='',price=0,rating=4.5,stock=0,is_active=true}=req.body;
  await pool.query('UPDATE products SET menu_id=?,name=?,description=?,image=?,price=?,rating=?,stock=?,is_active=? WHERE id=?',
    [menu_id||null,name,description,image,Number(price),Number(rating),Number(stock),!!is_active,req.params.id]);
  res.json({message:'Product updated'});
});
router.delete('/products/:id', async (req,res) => { await pool.query('DELETE FROM products WHERE id=?',[req.params.id]); res.json({message:'Product deleted'}); });

router.get('/orders', async (_req,res) => {
  const [r]=await pool.query(`SELECT o.*,c.name customer_name,c.phone,c.address FROM orders o
    JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC`);
  for (const order of r) {
    const [items]=await pool.query('SELECT product_name,price,quantity FROM order_items WHERE order_id=?',[order.id]);
    order.items=items;
  }
  res.json(r);
});
router.patch('/orders/:id/status', async (req,res) => {
  const allowed=['Pending','Processing','Delivered','Cancelled'];
  if(!allowed.includes(req.body.status)) return res.status(400).json({message:'Invalid status'});
  await pool.query('UPDATE orders SET status=? WHERE id=?',[req.body.status,req.params.id]);
  res.json({message:'Order status updated'});
});
router.get('/customers', async (_req,res) => { const [r]=await pool.query('SELECT * FROM customers ORDER BY created_at DESC'); res.json(r); });
export default router;
