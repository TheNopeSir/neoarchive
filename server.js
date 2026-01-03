
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
    max: 15, // Slightly increased for concurrent sync queries
    idleTimeoutMillis: 60000, // Increased to 60s
    connectionTimeoutMillis: 15000, // Increased to 15s
});

// Handle unexpected pool errors
pool.on('error', (err, client) => {
    console.error('❌ [Database] Unexpected error on idle client', err);
});

// ==========================================
// 📧 НАСТРОЙКА ПОЧТЫ (TIMEWEB SMTP)
// ==========================================

const SMTP_EMAIL = process.env.SMTP_EMAIL || 'morpheus@neoarch.ru'; 
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || 'tntgz9o3e9'; 

const transporter = nodemailer.createTransport({
    host: 'smtp.timeweb.ru',
    port: 465, 
    secure: true, 
    auth: {
        user: SMTP_EMAIL, 
        pass: SMTP_PASSWORD   
    },
    tls: {
        rejectUnauthorized: false 
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000
});

transporter.verify(function (error, success) {
    if (error) {
        console.error("⚠️ [Mail] SMTP Config Error:", error.message);
    } else {
        console.log(`✅ [Mail] SMTP Server is ready. User: ${SMTP_EMAIL}`);
    }
});

// ==========================================

const app = express();

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

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

// Initialize Database Schema
const initDB = async () => {
    const genericTables = ['exhibits', 'collections', 'notifications', 'messages', 'guestbook', 'wishlist', 'trade_requests'];
    
    try {
        await query(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMP DEFAULT NOW())`);
        
        // Таблица для неподтвержденных регистраций
        await query(`
            CREATE TABLE IF NOT EXISTS pending_users (
                token TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                email TEXT NOT NULL,
                data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        // Guilds Table
        await query(`CREATE TABLE IF NOT EXISTS guilds (id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);

        // Guild Messages Table
        await query(`CREATE TABLE IF NOT EXISTS guild_messages (id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMP DEFAULT NOW())`);

        for (const table of genericTables) {
            await query(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
        }

        const allTables = ['users', 'guilds', 'guild_messages', ...genericTables];
        for (const table of allTables) {
             try {
                 if (table !== 'guild_messages') {
                    await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
                 }
                 await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS data JSONB`); 
                 if (table !== 'users') {
                    await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
                 }
             } catch (e) {
                 console.warn(`[Database] Schema warning for ${table}:`, e.message);
             }
        }
        
        console.log("✅ [Database] Schema initialized.");
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

// ... [Auth Routes Omitted for brevity - they are unchanged] ...
// Re-adding Auth routes briefly to ensure file integrity in response
const emailStyle = `font-family: 'Courier New', monospace; background-color: #000000; color: #4ade80; padding: 20px; border: 1px solid #4ade80;`;
const sendRecoveryEmail = async (email, newPassword) => {
    try {
        const mailOptions = {
            from: `"NeoArchive System" <${SMTP_EMAIL}>`,
            to: email,
            subject: 'SYSTEM ALERT: Access Recovery',
            text: `Pass: ${newPassword}`,
            html: `<div style="${emailStyle}"><h2>RECOVERY</h2><p>${newPassword}</p></div>`
        };
        await transporter.sendMail(mailOptions);
    } catch (e) { console.error(e); }
};
const sendConfirmationEmail = async (email, username, link) => {
    try {
        const mailOptions = {
            from: `"NeoArchive System" <${SMTP_EMAIL}>`,
            to: email,
            subject: 'CONFIRM IDENTITY',
            html: `<div style="${emailStyle}"><h2>CONFIRM</h2><a href="${link}">CLICK ME</a></div>`
        };
        await transporter.sendMail(mailOptions);
    } catch (e) { console.error(e); }
};

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let result = await query(`SELECT * FROM users WHERE (LOWER(data->>'email') = LOWER($1) OR username = $1) AND data->>'password' = $2`, [email, password]);
        if (result.rows.length === 0) return res.status(401).json({ success: false, error: "Invalid credentials" });
        res.json({ success: true, user: result.rows[0].data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/auth/telegram', async (req, res) => {
    const { id, first_name, username, photo_url } = req.body;
    try {
        const telegramIdStr = id.toString();
        const existing = await query(`SELECT * FROM users WHERE data->>'telegramId' = $1`, [telegramIdStr]);
        if (existing.rows.length > 0) return res.json({ success: true, user: existing.rows[0].data });
        const newUser = { username: username || `tg_${id}`, email: `${id}@tg.com`, tagline: `Signal: ${first_name}`, avatarUrl: photo_url, joinedDate: new Date().toLocaleString(), following: [], followers: [], achievements: ['HELLO_WORLD'], telegramId: telegramIdStr, password: Math.random().toString() };
        await query(`INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`, [newUser.username, newUser]);
        res.json({ success: true, user: newUser });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, data } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    try {
        const check = await query(`SELECT 1 FROM users WHERE username = $1 OR LOWER(data->>'email') = $2`, [username, email.toLowerCase()]);
        if (check.rows.length > 0) return res.status(400).json({ success: false, error: "User exists" });
        await query(`INSERT INTO pending_users (token, username, email, data) VALUES ($1, $2, $3, $4)`, [token, username, email.toLowerCase(), { ...data, followers: [], following: [] }]);
        const link = `${req.protocol}://${req.get('host')}/api/auth/verify?token=${token}`;
        await sendConfirmationEmail(email, username, link);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/auth/verify', async (req, res) => {
    const { token } = req.query;
    try {
        const check = await query(`SELECT * FROM pending_users WHERE token = $1`, [token]);
        if (check.rows.length === 0) return res.send("Invalid Token");
        await query(`INSERT INTO users (username, data) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [check.rows[0].username, check.rows[0].data]);
        await query(`DELETE FROM pending_users WHERE token = $1`, [token]);
        res.send("<h1>ACCESS GRANTED</h1><script>setTimeout(()=>window.location='/', 2000)</script>");
    } catch (e) { res.status(500).send("Error"); }
});

// 2. SYNC & GUILDS
app.get('/api/sync', async (req, res) => {
    const { username } = req.query;
    
    // Increased limits
    let exhibitQuery = `SELECT data FROM exhibits ORDER BY updated_at DESC LIMIT 200`;
    let collectionQuery = `SELECT data FROM collections ORDER BY updated_at DESC LIMIT 50`;
    let wishlistQuery = `SELECT data FROM wishlist ORDER BY updated_at DESC LIMIT 100`;
    let tradeQuery = `SELECT data FROM trade_requests ORDER BY updated_at DESC LIMIT 100`;
    
    if (username) {
        exhibitQuery = `SELECT data FROM exhibits WHERE data->>'owner' = '${username}' OR id IN (SELECT id FROM exhibits ORDER BY updated_at DESC LIMIT 200)`;
        tradeQuery = `SELECT data FROM trade_requests WHERE data->>'sender' = '${username}' OR data->>'receiver' = '${username}' ORDER BY updated_at DESC LIMIT 50`;
    }

    const run = async (q) => { try { const r = await query(q); return r.rows.map(x => x.data); } catch { return []; } };

    try {
        const [users, exhibits, collections, notifications, messages, guestbook, wishlist, guilds, tradeRequests] = await Promise.all([
            run('SELECT data FROM users'),
            run(exhibitQuery),
            run(collectionQuery),
            run('SELECT data FROM notifications ORDER BY updated_at DESC LIMIT 100'),
            run('SELECT data FROM messages ORDER BY updated_at DESC LIMIT 200'),
            run('SELECT data FROM guestbook ORDER BY updated_at DESC LIMIT 200'),
            run(wishlistQuery),
            run('SELECT data FROM guilds LIMIT 50'),
            run(tradeQuery)
        ]);
        res.json({ users, exhibits, collections, notifications, messages, guestbook, wishlist, guilds, tradeRequests });
    } catch (e) { res.status(500).json({ error: "Sync failed" }); }
});

app.get('/api/feed', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    try {
        const exhibits = await query(`SELECT data FROM exhibits ORDER BY updated_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
        res.json(exhibits.rows.map(r => r.data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/notifications', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });
    try {
        const result = await query(`SELECT data FROM notifications WHERE data->>'recipient' = $1 ORDER BY created_at DESC LIMIT 20`, [username]);
        res.json(result.rows.map(r => r.data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- GUILD ROUTES ---
app.get('/api/guilds/:id/messages', async (req, res) => {
    try {
        const result = await query(`SELECT data FROM guild_messages WHERE data->>'guildId' = $1 ORDER BY created_at DESC LIMIT 50`, [req.params.id]);
        res.json(result.rows.map(r => r.data).reverse()); // Send oldest first for chat flow
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/guilds/messages', async (req, res) => {
    try {
        const { id, guildId } = req.body;
        await query(`INSERT INTO guild_messages (id, data, created_at) VALUES ($1, $2, NOW())`, [id, req.body]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/update', async (req, res) => {
    try {
        await query(`INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (username) DO UPDATE SET data = $2, updated_at = NOW()`, [req.body.username, req.body]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const createCrudRoutes = (table) => {
    app.post(`/api/${table}`, async (req, res) => {
        try {
            const { id } = req.body;
            if (!id) return res.status(400).json({ error: "ID required" });
            await query(`INSERT INTO ${table} (id, data, updated_at, created_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`, [id, req.body]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.delete(`/api/${table}/:id`, async (req, res) => {
        try { await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
    });
};

createCrudRoutes('exhibits');
createCrudRoutes('collections');
createCrudRoutes('notifications');
createCrudRoutes('messages');
createCrudRoutes('guestbook');
createCrudRoutes('wishlist');
createCrudRoutes('guilds');
createCrudRoutes('trade_requests');

app.all('/api/*', (req, res) => res.status(404).json({ error: "Not found" }));

const injectMeta = (html, data) => {
    if (!data) return html;
    const title = data.title || 'NeoArchive';
    const desc = data.description || 'Digital Collection Manager';
    const image = data.image || 'https://neoarchive.ru/default-og.png';
    return html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(/content="NeoArchive: Ваша цифровая полка"/g, `content="${title}"`)
        .replace(/property="og:title" content=".*?"/, `property="og:title" content="${title}"`)
        .replace(/name="description" content=".*?"/, `name="description" content="${desc}"`)
        .replace(/property="og:image" content=".*?"/, `property="og:image" content="${image}"`);
};

app.get('*', async (req, res) => {
    const filePath = path.join(__dirname, 'dist', 'index.html');
    fs.readFile(filePath, 'utf8', async (err, htmlData) => {
        if (err) return res.status(500).send('Server Error');
        let metaData = null;
        try {
            if (req.path.startsWith('/artifact/')) {
                const id = req.path.split('/')[2];
                const r = await query('SELECT data FROM exhibits WHERE id = $1', [id]);
                if (r.rows.length) metaData = { title: r.rows[0].data.title, description: r.rows[0].data.description, image: r.rows[0].data.imageUrls?.[0] };
            }
        } catch (e) {}
        res.send(metaData ? injectMeta(htmlData, metaData) : htmlData);
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 NeoArchive Server running on port ${PORT}`);
});
