import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// --- REQUEST LOGGING (DEBUGGING) ---
app.use((req, res, next) => {
    // Skip logging for stream chunks to avoid console spam
    if (!req.url.includes('/api/stream')) {
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    }
    next();
});

// --- CORS CONFIGURATION ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// --- CHECKS ---
const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
requiredEnv.forEach(key => {
    if (!process.env[key]) console.error(`❌ ${key} is missing in .env`);
});

if (!process.env.BREVO_API_KEY) {
    console.warn("⚠️ BREVO_API_KEY is missing. Emails will NOT be sent (Mock Mode active).");
}

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// --- CLOUDFLARE R2 CLIENT ---
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Configure Multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// --- SCHEMAS ---

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: { type: String, select: false },
  role: { type: String, default: 'student' },
  branch: String,
  year: String,
  college: String,
  purchasedCourseIds: [String],
  purchasedNoteIds: [String],
  courseProgress: { type: Map, of: [String] } 
});
const User = mongoose.model('User', userSchema);

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  createdAt: { type: Date, expires: 300, default: Date.now } 
});
const Otp = mongoose.model('Otp', otpSchema);

// Nested Schemas
const resourceSchema = new mongoose.Schema({
  title: String,
  url: String, // R2 Key
  type: { type: String, default: 'pdf' } 
});

const videoSchema = new mongoose.Schema({
  id: String,
  title: String,
  description: String,
  duration: String,
  videoUrl: String, 
  notesUrl: String, // Legacy support
  resources: [resourceSchema], // New: Multiple resources/notes
  isFreePreview: Boolean
});

const moduleSchema = new mongoose.Schema({
  title: String,
  videos: [videoSchema]
});

const courseSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    title: { type: String, required: true },
    branchSlug: { type: String, required: true },
    year: { type: String, required: true },
    description: String,
    price: { type: Number, default: 0 },
    thumbnail: String, 
    modules: [moduleSchema], 
    createdAt: { type: Date, default: Date.now }
});
const Course = mongoose.model('Course', courseSchema);

const fileSchema = new mongoose.Schema({
    title: String,
    url: String
});

const noteSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  title: String,
  branchSlug: String,
  year: String,
  subject: String,
  description: String,
  price: Number,
  coverage: String,
  fileUrl: String, // Legacy single file
  files: [fileSchema], // New multi-file support
  createdAt: { type: Date, default: Date.now }
});
const Note = mongoose.model('Note', noteSchema);


// --- CONFIGS ---
// Initialize Brevo (Sendinblue)
let apiInstance;
if (process.env.BREVO_API_KEY) {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
}

const razorpay = new Razorpay({
  key_id: process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'test_key', 
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
});

// --- HELPERS ---
const isUrl = (str) => str && (str.startsWith('http://') || str.startsWith('https://'));

const signKey = async (key, expiresIn = 3600) => {
    if (!key || isUrl(key)) return key; 
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key
        });
        return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (e) {
        console.error(`Failed to sign key ${key}:`, e);
        return key;
    }
};

// --- ROUTES ---

// 1. PROXY UPLOAD ROUTES (R2)
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const folder = req.body.folder || 'uploads';
        
        console.log(`📂 Processing Upload: ${file?.originalname} -> ${folder}`);
        
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const safeName = file.originalname.replace(/\s+/g, '-');
        const key = `${folder}/${Date.now()}-${safeName}`;
        
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await s3Client.send(command);
        console.log(`✅ Uploaded to R2: ${key}`);

        res.json({ key });
    } catch (err) {
        console.error("❌ Proxy Upload Error:", err);
        res.status(500).json({ error: 'Upload failed', details: err.message });
    }
});

app.post('/api/upload/multiple', upload.array('files'), async (req, res) => {
    try {
        const files = req.files;
        const folder = req.body.folder || 'uploads';
        const uploadedItems = [];

        console.log(`📂 Processing Multiple Uploads: ${files?.length} files -> ${folder}`);

        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        for (const file of files) {
             const safeName = file.originalname.replace(/\s+/g, '-');
             const key = `${folder}/${Date.now()}-${safeName}`;
             
             await s3Client.send(new PutObjectCommand({
                 Bucket: process.env.R2_BUCKET_NAME, 
                 Key: key, 
                 Body: file.buffer, 
                 ContentType: file.mimetype
             }));
             
             uploadedItems.push({ 
                 originalName: file.originalname, 
                 key, 
                 type: file.mimetype 
             });
        }
        console.log(`✅ Uploaded ${uploadedItems.length} files to R2`);
        res.json({ uploadedItems });
    } catch (err) {
        console.error("❌ Multiple Upload Error:", err);
        res.status(500).json({ error: 'Upload failed', details: err.message });
    }
});

// 2. VIDEO STREAMING & SIGNING
app.get('/api/media/sign', async (req, res) => {
    try {
        const { key } = req.query;
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });
        jwt.verify(token, process.env.JWT_SECRET);
        
        if (!key) return res.status(400).json({ message: "Key required" });
        // Increase expiry for videos (3 hours) to prevent interruptions
        const url = await signKey(key, 3600 * 3); 
        res.json({ url });
    } catch (error) {
        console.error("Signing Error:", error);
        res.status(500).json({ message: "Failed to sign URL" });
    }
});

// STREAMING ENDPOINT (Chunked)
app.get('/api/stream', async (req, res) => {
    const { key, token } = req.query;
    
    if (!key || typeof key !== 'string') return res.status(400).send("Missing key");
    if (!token || typeof token !== 'string') return res.status(401).send("Missing token");

    try {
        jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        return res.status(403).send("Invalid Token");
    }

    const range = req.headers.range;
    if (!range) {
        return res.status(400).send("Requires Range header");
    }

    try {
        // 1. Get File Metadata (Size)
        const headCommand = new HeadObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key
        });
        const headData = await s3Client.send(headCommand);
        const fileSize = headData.ContentLength;

        // 2. Parse Range
        // Range: bytes=0-1024
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        // 3. Create Partial Request
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Range: `bytes=${start}-${end}`
        });
        
        const data = await s3Client.send(command);

        // 4. Send Partial Response
        res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": headData.ContentType || "video/mp4",
        });

        // 5. Pipe Data
        data.Body.pipe(res);

    } catch (error) {
        console.error("Stream Error:", error);
        if (error.name === 'NoSuchKey') {
            res.status(404).send("File not found");
        } else {
            res.status(500).send("Stream Error");
        }
    }
});


// 3. COURSE ROUTES
app.get('/api/courses', async (req, res) => {
    try {
        const courses = await Course.find().sort({ createdAt: -1 });
        const signedCourses = await Promise.all(courses.map(async (c) => {
            const cObj = c.toObject();
            if (cObj.thumbnail) {
                cObj.thumbnail = await signKey(cObj.thumbnail);
            }
            return {
                ...cObj,
                videoCount: c.modules?.reduce((acc, m) => acc + m.videos.length, 0) || 0,
                pdfCount: c.modules?.reduce((acc, m) => acc + m.videos.reduce((vc, v) => vc + (v.resources?.length || (v.notesUrl ? 1 : 0)), 0), 0) || 0
            };
        }));
        res.json(signedCourses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/courses/:id', async (req, res) => {
    try {
        const course = await Course.findOne({ id: req.params.id });
        if(!course) return res.status(404).json({ message: "Not found" });
        const cObj = course.toObject();
        if (cObj.thumbnail) cObj.thumbnail = await signKey(cObj.thumbnail);
        res.json(cObj);
    } catch(e) { res.status(500).send(e) }
});

app.post('/api/courses', async (req, res) => {
    try {
        const { id, thumbnail, ...data } = req.body;
        const updatePayload = { ...data };
        if (thumbnail && !isUrl(thumbnail)) {
            updatePayload.thumbnail = thumbnail;
        } 
        const updated = await Course.findOneAndUpdate(
            { id }, 
            { $set: updatePayload }, 
            { upsert: true, new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/courses/:id', async (req, res) => {
    try {
        await Course.deleteOne({ id: req.params.id });
        res.json({ message: "Course deleted" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- MODULE & VIDEO ROUTES ---
app.post('/api/courses/:courseId/modules', async (req, res) => {
    const { courseId } = req.params;
    const { title } = req.body;
    try {
        const course = await Course.findOne({ id: courseId });
        if(!course) return res.status(404).send();
        course.modules.push({ title, videos: [] });
        await course.save();
        res.json(course);
    } catch(e) { res.status(500).send(e) }
});

app.post('/api/courses/:courseId/modules/:moduleIndex/videos', async (req, res) => {
    const { courseId, moduleIndex } = req.params;
    const videoData = req.body; // Expects { title, description, videoUrl, resources: [] }
    try {
        const course = await Course.findOne({ id: courseId });
        if(!course) return res.status(404).send();
        
        const newVideo = {
            ...videoData,
            id: `v_${Date.now()}`,
            resources: videoData.resources || []
        };
        
        course.modules[moduleIndex].videos.push(newVideo);
        await course.save();
        res.json(course);
    } catch(e) { res.status(500).send(e) }
});

// UPDATE Video Metadata
app.put('/api/courses/:courseId/modules/:moduleIndex/videos/:videoId', async (req, res) => {
    const { courseId, moduleIndex, videoId } = req.params;
    const { title, description } = req.body;
    try {
        const course = await Course.findOne({ id: courseId });
        if(!course) return res.status(404).json({message: "Course not found"});
        
        const video = course.modules[moduleIndex].videos.find(v => v.id === videoId);
        if(video) {
            video.title = title;
            video.description = description;
            await course.save();
            res.json(course);
        } else {
            res.status(404).json({message: "Video not found"});
        }
    } catch(e) { res.status(500).send(e) }
});

// DELETE Video
app.delete('/api/courses/:courseId/modules/:moduleIndex/videos/:videoId', async (req, res) => {
    const { courseId, moduleIndex, videoId } = req.params;
    try {
        const course = await Course.findOne({ id: courseId });
        if(!course) return res.status(404).send();
        
        const video = course.modules[moduleIndex].videos.find(v => v.id === videoId);
        if (!video) return res.status(404).send();

        // 1. Delete from R2 (Video)
        if (video.videoUrl && !isUrl(video.videoUrl)) {
            try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: video.videoUrl
                }));
            } catch (e) { console.error("R2 Video Delete Failed", e); }
        }

        // 2. Delete from R2 (Resources/Notes)
        if (video.resources && video.resources.length > 0) {
            for(const res of video.resources) {
                if(res.url && !isUrl(res.url)) {
                    try {
                        await s3Client.send(new DeleteObjectCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            Key: res.url
                        }));
                    } catch (e) { console.error("R2 Resource Delete Failed", e); }
                }
            }
        }
        // Legacy notesUrl
        if (video.notesUrl && !isUrl(video.notesUrl)) {
             try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: video.notesUrl
                }));
            } catch (e) { console.error("R2 Notes Delete Failed", e); }
        }

        // 3. Remove from DB
        course.modules[moduleIndex].videos = course.modules[moduleIndex].videos.filter(v => v.id !== videoId);
        await course.save();
        
        res.json(course);
    } catch(e) { 
        console.error(e);
        res.status(500).send(e) 
    }
});


app.post('/api/courses/progress', async (req, res) => {
    const { courseId, videoId } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    if(!token) return res.status(401).send();
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await User.findByIdAndUpdate(decoded.id, {
            $addToSet: { [`courseProgress.${courseId}`]: videoId }
        });
        res.send('ok');
    } catch(e) { res.status(500).send(e) }
});

// 4. NOTE ROUTES
app.get('/api/notes', async (req, res) => {
    const notes = await Note.find().sort({ createdAt: -1 });
    const signedNotes = await Promise.all(notes.map(async (n) => {
        const nObj = n.toObject();
        // Backward compatibility
        if (nObj.fileUrl && !nObj.files?.length) {
            nObj.files = [{ title: 'Main Notes', url: nObj.fileUrl }];
        }
        // Legacy fileUrl signing (deprecated but supported)
        if (nObj.fileUrl) nObj.fileUrl = await signKey(nObj.fileUrl);

        // Don't sign 'files' array here for list view to save resources. 
        // We will sign them on demand when opening the note or if they are few.
        // Actually, let's sign them for now as user expects immediate access on detail view.
        if (nObj.files && nObj.files.length > 0) {
            nObj.files = await Promise.all(nObj.files.map(async f => ({
                ...f,
                url: await signKey(f.url)
            })));
        }
        return nObj;
    }));
    res.json(signedNotes);
});

app.get('/api/notes/:id', async (req, res) => {
    try {
        const note = await Note.findOne({ id: req.params.id });
        if(!note) return res.status(404).json({ message: "Not found" });
        
        const nObj = note.toObject();
        // Compatibility
        if (nObj.fileUrl && !nObj.files?.length) {
            nObj.files = [{ title: 'Main Notes', url: nObj.fileUrl }];
        }
        
        if (nObj.files && nObj.files.length > 0) {
             nObj.files = await Promise.all(nObj.files.map(async f => ({
                ...f,
                url: await signKey(f.url)
            })));
        }
        res.json(nObj);
    } catch(e) { res.status(500).send(e); }
});

app.post('/api/notes', async (req, res) => {
    const { id, fileUrl, files, ...data } = req.body;
    try {
        const updatePayload = { ...data };
        
        // Handle legacy single file upload
        if (fileUrl && !isUrl(fileUrl)) {
            updatePayload.fileUrl = fileUrl;
        }
        
        // Handle new multiple files
        if (files && Array.isArray(files)) {
            updatePayload.files = files; 
            // Also set fileUrl to the first file for backward compatibility
            if (files.length > 0 && !updatePayload.fileUrl) {
                updatePayload.fileUrl = files[0].url;
            }
        }

        const updated = await Note.findOneAndUpdate(
            { id },
            { $set: updatePayload },
            { upsert: true, new: true }
        );
        res.json(updated);
    } catch(e) { res.status(500).json(e) }
});

app.delete('/api/notes/:id', async (req, res) => {
    try {
        const note = await Note.findOne({ id: req.params.id });
        if (note) {
            // Delete legacy file
            if(note.fileUrl && !isUrl(note.fileUrl)) {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: note.fileUrl
                })).catch(e => console.error("Failed to delete legacy note file", e));
            }
            // Delete multi files
            if(note.files && note.files.length > 0) {
                for(const f of note.files) {
                     if(f.url && !isUrl(f.url)) {
                        await s3Client.send(new DeleteObjectCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            Key: f.url
                        })).catch(e => console.error("Failed to delete note file", e));
                     }
                }
            }
        }
        await Note.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).send(e); }
});

app.delete('/api/admin/reset-courses', async (req, res) => {
    try {
        await Course.deleteMany({});
        await Note.deleteMany({});
        res.json({ message: "All content deleted from Database." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. AUTH & PAYMENT
app.post('/api/auth/signup-init', async (req, res) => {
  try {
      const { email, firstName } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: 'User already exists. Please login.' });
      
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      await Otp.deleteMany({ email });
      await Otp.create({ email, otp });
      
      // LOG OTP FOR DEV
      console.log(`🔑 GENERATED OTP for ${email}: [ ${otp} ]`);

      // Check Mode
      if (!apiInstance) {
          console.warn("⚠️ MOCK MODE: Email not sent. Use console OTP.");
          return res.json({ message: 'OTP Generated (Check Console)', devOtp: otp });
      }

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = "Welcome to Build in Public – Engineers | Verify Your Email";
      sendSmtpEmail.htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { background-color: #f0f9ff; padding: 30px; text-align: center; border-bottom: 1px solid #e0f2fe; }
            .brand { color: #0284c7; font-size: 24px; font-weight: bold; margin: 0; }
            .content { padding: 40px 30px; color: #334155; text-align: center; }
            .greeting { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
            .otp-box { background-color: #ffffff; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin: 30px auto; width: fit-content; min-width: 200px; }
            .otp-code { font-size: 32px; font-family: monospace; letter-spacing: 4px; font-weight: bold; color: #0f172a; margin: 0; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="brand">Build in Public – Engineers</h1>
            </div>
            <div class="content">
              <p class="greeting">Hello, ${firstName}!</p>
              <p>Welcome to our community. Use the verification code below to complete your registration.</p>
              
              <div class="otp-box">
                <p class="otp-code">${otp}</p>
              </div>
              
              <p style="font-size: 14px; color: #64748b;">This code is valid for 5 minutes.</p>
              <p style="font-size: 14px; color: #64748b;">If you did not request this, please ignore this email. Do not share this code with anyone.</p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Build in Public – Engineers. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `;
      
      // IMPORTANT: If 'SENDER_EMAIL' is not verified in Brevo, emails will fail.
      // Defaulting to a generic gmail might work if sender verification is loose, but usually requires verification.
      const senderEmail = process.env.SENDER_EMAIL || "buildinpublicengineers@gmail.com";
      sendSmtpEmail.sender = { "name": "Build in Public - Engineers", "email": senderEmail };
      sendSmtpEmail.to = [{ "email": email, "name": firstName }];
      
      try {
          await apiInstance.sendTransacEmail(sendSmtpEmail);
          console.log(`✅ Email sent successfully to ${email}`);
          res.json({ message: 'OTP sent successfully' });
      } catch (emailError) {
          const errorBody = emailError.response ? emailError.response.body : emailError;
          console.error("❌ BREVO EMAIL FAILED:", JSON.stringify(errorBody, null, 2));
          console.error("💡 HINT: Ensure 'SENDER_EMAIL' in .env is a verified sender in your Brevo account.");
          
          // Return success so user can still proceed using console OTP
          res.json({ message: 'OTP Generated (Check Console for Code)', devOtp: otp });
      }

  } catch (error) {
      console.error('Signup Init Error:', error);
      res.status(500).json({ message: 'Failed to process signup request.' });
  }
});

app.post('/api/auth/signup-verify', async (req, res) => {
  try {
      const { email, otp, password, firstName, lastName, branch, year, college } = req.body;
      const validOtp = await Otp.findOne({ email, otp });
      if (!validOtp) return res.status(400).json({ message: 'Invalid or expired OTP' });
      const hashedPassword = await bcrypt.hash(password, 10);
      const role = email.toLowerCase() === 'admin@admin.com' ? 'admin' : 'student';
      const newUser = await User.create({
        firstName, lastName, email, password: hashedPassword,
        role,
        branch, year, college,
        purchasedCourseIds: [], purchasedNoteIds: [], courseProgress: {}
      });
      const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      await Otp.deleteMany({ email });
      res.json({ token, user: newUser });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Signup failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const userObj = user.toObject();
      delete userObj.password;
      res.json({ token, user: userObj });
  } catch (error) {
      res.status(500).json({ message: 'Login failed.' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if(!token) return res.status(401).send();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    res.json({ user });
  } catch (e) {
    res.status(401).send();
  }
});

app.post('/api/payment/create-order', async (req, res) => {
  const { amount, itemId } = req.body;
  const options = {
    amount: amount * 100, 
    currency: "INR",
    receipt: `receipt_${itemId}_${Date.now()}`
  };
  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json(error);
  }
});

app.post('/api/payment/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, itemId, type } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generated_signature = hmac.digest('hex');
  if (generated_signature === razorpay_signature) {
    const updateField = type === 'course' ? { $addToSet: { purchasedCourseIds: itemId } } : { $addToSet: { purchasedNoteIds: itemId } };
    await User.findByIdAndUpdate(decoded.id, updateField);
    res.json({ status: 'success' });
  } else {
    res.status(400).json({ status: 'failure' });
  }
});

// --- SERVE FRONTEND (PRODUCTION) ---
// This must be after API routes

// Ensure dist folder exists and serve files from it
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Handle React routing, return all requests to React app
app.get(/.*/, (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        console.error("❌ dist/index.html is missing. Frontend not built.");
        res.status(500).send("Frontend build artifacts missing. Please run 'npm run build' on the server.");
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
