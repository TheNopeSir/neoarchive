
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

// --- API ROUTES ---

// AUTH: REGISTER
app.post('/api/auth/register', async (req, res) => {
    const { username, password, tagline, email } = req.body;
    
    if (!username || !password || !email) {
        return res.status(400).json({ error: "Заполните все поля" });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.toLowerCase().trim();

    try {
        // Check for duplicates
        const existing = await query(
            `SELECT username FROM users WHERE username = $1 OR data->>'email' = $2`, 
            [cleanUsername, cleanEmail]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: "Пользователь или Email уже заняты" });
        }

        const newUser = {
            username: cleanUsername,
            email: cleanEmail,
            password, // In production, use bcrypt/argon2
            tagline: tagline || "Новый пользователь",
            avatarUrl: `https://ui-avatars.com/api/?name=${cleanUsername}&background=random&color=fff`,
            joinedDate: new Date().toLocaleDateString(),
            following: [],
            followers: [],
            achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
            settings: { theme: 'dark' },
            isAdmin: false
        };

        await query(
            `INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`,
            [cleanUsername, newUser]
        );

        res.json(newUser);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// AUTH: LOGIN
app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) return res.status(400).json({ error: "Missing credentials" });

    try {
        // Find by username OR email
        // Note: JSONB queries can be slow on large datasets without GIN index, but fine for prototype
        let result = await query(`SELECT data FROM users WHERE username = $1`, [identifier]);
        
        if (result.rows.length === 0) {
            result = await query(`SELECT data FROM users WHERE data->>'email' = $1`, [identifier.toLowerCase()]);
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const user = result.rows[0].data;

        // Simple password check (replace with hash compare in prod)
        if (user.password !== password) {
            return res.status(401).json({ error: "Неверный пароль" });
        }

        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// AUTH: TELEGRAM
app.post('/api/auth/telegram', async (req, res) => {
    const tgUser = req.body;
    // In a real app, verify hash here using BOT_TOKEN
    
    const username = tgUser.username || `tg_${tgUser.id}`;
    
    try {
        const result = await query(`SELECT data FROM users WHERE username = $1`, [username]);
        
        if (result.rows.length > 0) {
            return res.json(result.rows[0].data);
        }

        // Create new if not exists
        const newUser = {
            username,
            email: `tg_${tgUser.id}@telegram.neolink`,
            tagline: "Telegram User",
            password: crypto.randomUUID(), // Random pass, they rely on TG auth
            avatarUrl: tgUser.photo_url || `https://ui-avatars.com/api/?name=${username}`,
            joinedDate: new Date().toLocaleDateString(),
            following: [],
            followers: [],
            achievements: [],
            settings: { theme: 'dark' },
            telegramId: tgUser.id
        };

        await query(`INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`, [username, newUser]);
        res.json(newUser);

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// AUTH: RECOVER
app.post('/api/auth/recover', async (req, res) => {
    const { email } = req.body;
    // Mock recovery for now
    console.log(`Recovery requested for ${email}`);
    res.json({ success: true, message: "Если почта существует, мы отправили инструкцию." });
});

// NOTIFICATIONS API
app.get('/api/notifications', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });
    try {
        // Fetch up to 300 recent notifications
        const result = await query(
            `SELECT data FROM notifications WHERE data->>'recipient' = $1 ORDER BY created_at DESC LIMIT 300`,
            [username]
        );
        res.json(result.rows.map(r => r.data));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GENERIC CRUD API
const createCrudRoutes = (table) => {
    // GET ONE
    app.get(`/api/${table}/:id`, async (req, res) => {
        try {
            const result = await query(`SELECT data FROM "${table}" WHERE id = $1`, [req.params.id]);
            if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
            res.json(result.rows[0].data);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // UPSERT (Create or Update)
    app.post(`/api/${table}`, async (req, res) => {
        try {
            const { id } = req.body;
            const recordId = id || req.body.id;
            if (!recordId) return res.status(400).json({ error: "ID is required" });
            
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

    // DELETE
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

// SYNC (Basic implementation for User Data + Collections)
app.get('/api/sync', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.json({});
    
    try {
        const userRes = await query(`SELECT data FROM users WHERE username = $1`, [username]);
        const user = userRes.rows[0]?.data;
        
        const colsRes = await query(`SELECT data FROM collections WHERE data->>'owner' = $1`, [username]);
        const collections = colsRes.rows.map(r => r.data);

        res.json({ users: user ? [user] : [], collections });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// FEED API
app.get('/api/feed', async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    try {
        // Fetch most recent exhibits
        // Note: In production, use pagination cursor or offset
        const result = await query(`SELECT data FROM exhibits ORDER BY created_at DESC LIMIT $1`, [limit]);
        res.json(result.rows.map(r => r.data));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('*', async (req, res) => {
    const filePath = path.join(__dirname, 'dist', 'index.html');
    fs.readFile(filePath, 'utf8', async (err, htmlData) => {
        if (err) return res.status(500).send('Server Error');
        res.send(htmlData);
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 NeoArchive Server running on port ${PORT}`);
});
