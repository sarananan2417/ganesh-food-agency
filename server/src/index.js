import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { requireAdmin } from './middleware/auth.js';
dotenv.config();
const app=express();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const uploadDir=path.join(__dirname,'../uploads');
fs.mkdirSync(uploadDir,{recursive:true});
app.use(cors({origin:process.env.CLIENT_URL || 'http://localhost:5173'}));
app.use(express.json({limit:'2mb'}));
app.use('/uploads',express.static(uploadDir));
const storage=multer.diskStorage({
 destination:(_req,_file,cb)=>cb(null,uploadDir),
 filename:(_req,file,cb)=>cb(null,`${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_')}`)
});
const upload=multer({storage,limits:{fileSize:4*1024*1024},fileFilter:(_req,file,cb)=>{
 if(!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
 cb(null,true);
}});
app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
app.use('/api/auth',authRoutes);
app.use('/api/public',publicRoutes);
app.use('/api/admin',adminRoutes);
app.post('/api/admin/upload',requireAdmin,upload.single('image'),(req,res)=>{
 if(!req.file) return res.status(400).json({message:'Image required'});
 res.status(201).json({image:`/uploads/${req.file.filename}`});
});
app.use((err,_req,res,_next)=>res.status(400).json({message:err.message || 'Request failed'}));
const port=process.env.PORT || 5000;
app.listen(port,()=>console.log(`Ganesh Food Agency API running on ${port}`));
