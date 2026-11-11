import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import pool from './db.js';
dotenv.config();
try {
  const hash=await bcrypt.hash('Admin@123',12);
  await pool.query('INSERT IGNORE INTO admins(username,password_hash) VALUES(?,?)',['admin',hash]);
  const [[count]]=await pool.query('SELECT COUNT(*) count FROM menus');
  if(!count.count){
    await pool.query('INSERT INTO menus(name,icon,sort_order) VALUES ?',
      [[['Sweets','🍬',1],['Snacks','🥨',2],['Milk Products','🥛',3],['Offers','🎁',4]]]);
  }
  const [[pc]]=await pool.query('SELECT COUNT(*) count FROM products');
  if(!pc.count){
    const [menus]=await pool.query('SELECT id,name FROM menus');
    const sweets=menus.find(m=>m.name==='Sweets')?.id || null;
    await pool.query(`INSERT INTO products(menu_id,name,description,image,price,rating,stock) VALUES
      (?,?,?,?,?,?,?),(?,?,?,?,?,?,?),(?,?,?,?,?,?,?)`,
      [sweets,'Kadalai Mittai','Traditional peanut candy','',6,4.5,100,
       sweets,'Paalkova','Delicious milk sweet','',6,4.6,50,
       sweets,'Ellu Mittai','Sesame candy','',6,4.4,60]);
  }
  console.log('Seed completed. Login: admin / Admin@123');
} catch(e){ console.error(e); process.exitCode=1; }
finally { await pool.end(); }
