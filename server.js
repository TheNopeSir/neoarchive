
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// ⚙️ НАСТРОЙКИ СЕРВЕРА И БД
// ==========================================

const PORT = process.env.PORT || 3000;

// Конфигурация подключения к PostgreSQL (Timeweb)
const pool = new Pool({
    user: process.env.DB_USER || 'gen_user',
    host: process.env.DB_HOST || '89.169.46.157',
    database: process.env.DB_NAME || 'default_db',
    password: process.env.DB_PASSWORD || '9H@DDCb.gQm.S}',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    },
    max: 15,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 15000,
});

pool.on('error', (err, client) => {
    console.error('❌ [Database] Unexpected error on idle client', err);
});

// ==========================================
// 📧 НАСТРОЙКА ПОЧТЫ
// ==========================================

const SMTP_EMAIL = process.env.SMTP_EMAIL || 'morpheus@neoarch.ru'; 
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || 'tntgz9o3e9'; 

const transporter = nodemailer.createTransport({
    host: 'smtp.timeweb.ru',
    port: 465, 
    secure: true, 
    auth: { user: SMTP_EMAIL, pass: SMTP_PASSWORD },
    tls: { rejectUnauthorized: false }
});

// ==========================================

const app = express();

app.use(cors({ origin: true, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

const query = async (text, params) => {
    try {
        return await pool.query(text, params);
    } catch (err) {
        console.error("Query Error", err.message);
        throw err;
    }
};

// Initialize Database Schema with robust checks
const initDB = async () => {
    const genericTables = ['exhibits', 'collections', 'notifications', 'messages', 'guestbook', 'wishlist', 'tradeRequests'];
    
    try {
        await query(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMP DEFAULT NOW())`);
        await query(`CREATE TABLE IF NOT EXISTS pending_users (token TEXT PRIMARY KEY, username TEXT NOT NULL, email TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMP DEFAULT NOW())`);
        
        for (const table of genericTables) {
            // Create table if not exists
            await query(`CREATE TABLE IF NOT EXISTS "${table}" (id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
            
            // Ensure columns exist (Migration safety)
            await query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
            await query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
            await query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS data JSONB`);
        }

        // --- OPTIMIZATION INDICES ---
        // Notifications: Speed up fetching by recipient and read status
        await query(`CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications ((data->>'recipient'))`);
        await query(`CREATE INDEX IF NOT EXISTS idx_notif_is_read ON notifications ((data->>'isRead'))`);
        await query(`CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications (created_at DESC)`);

        console.log("✅ [Database] Schema initialized & Indices optimized.");
    } catch (e) {
        console.error("❌ [Database] Schema initialization failed:", e.message);
    }
};

pool.connect((err, client, release) => {
    if (err) return console.error('❌ [Database] Connection error:', err.stack);
    client.query('SELECT NOW()', (err, result) => {
        release();
        initDB();
    });
});

// ... (Email functions remain same) ...
const sendRecoveryEmail = async (email, newPassword) => { /* ... */ };
const sendConfirmationEmail = async (email, username, link) => { /* ... */ };

// --- API ROUTES ---

// ... (Auth routes remain same) ...

// NOTIFICATIONS API (Enhanced)
app.get('/api/notifications', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });
    try {
        // Fetch up to 300 recent notifications for smart merging on client
        const result = await query(
            `SELECT data FROM notifications WHERE data->>'recipient' = $1 ORDER BY created_at DESC LIMIT 300`,
            [username]
        );
        res.json(result.rows.map(r => r.data));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ... (Other routes remain same) ...

// Generic CRUD with updated_at enforcement
const createCrudRoutes = (table) => {
    app.post(`/api/${table}`, async (req, res) => {
        try {
            const { id } = req.body;
            const recordId = id || req.body.id;
            if (!recordId) return res.status(400).json({ error: "ID is required" });
            
            // Ensure payload has timestamp
            const payload = { ...req.body, updatedAt: new Date().toISOString() };

            await query(
                `INSERT INTO "${table}" (id, data, updated_at, created_at) VALUES ($1, $2, NOW(), NOW()) 
                 ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
                [recordId, payload]
            );

            res.json({ success: true });
        } catch (e) { 
            console.error(`${table} Update Error:`, e.message);
            res.status(500).json({ success: false, error: e.message }); 
        }
    });

    app.delete(`/api/${table}/:id`, async (req, res) => {
        try {
            await query(`DELETE FROM "${table}" WHERE id = $1`, [req.params.id]);
            res.json({ success: true });
        } catch (e) { 
             res.status(500).json({ success: false, error: e.message }); 
        }
    });
};

createCrudRoutes('exhibits');
createCrudRoutes('collections');
createCrudRoutes('notifications');
createCrudRoutes('messages');
createCrudRoutes('guestbook');
createCrudRoutes('wishlist');
createCrudRoutes('tradeRequests');

// ... (Rest of server.js) ...

app.get('*', async (req, res) => {
    const filePath = path.join(__dirname, 'dist', 'index.html');
    fs.readFile(filePath, 'utf8', async (err, htmlData) => {
        if (err) return res.status(500).send('Server Error');
        res.send(htmlData); // Simplified for brevity, assume SEO logic exists
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 NeoArchive Server running on port ${PORT}`);
});
