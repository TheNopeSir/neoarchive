import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.static(path.join(__dirname, 'dist')));

// --- DATABASE CONFIGURATION ---
const { Pool } = pg;
let pool = null;

// Determine DB Config (Supports standard PG* vars and Timeweb POSTGRESQL_* vars)
const dbConfig = {
    host: process.env.POSTGRESQL_HOST || process.env.PGHOST,
    port: parseInt(process.env.POSTGRESQL_PORT || process.env.PGPORT || '5432'),
    user: process.env.POSTGRESQL_USER || process.env.PGUSER,
    password: process.env.POSTGRESQL_PASSWORD || process.env.PGPASSWORD,
    database: process.env.POSTGRESQL_DBNAME || process.env.PGDATABASE,
};

// Check if credentials are present
if (dbConfig.host && dbConfig.database) {
    console.log(`🐘 [Server] Connecting to PostgreSQL at ${dbConfig.host}...`);
    
    pool = new Pool({
        ...dbConfig,
        // Timeweb requires SSL. rejectUnauthorized: false allows connection without manually downloading the CA cert file
        ssl: { rejectUnauthorized: false } 
    });
    
    // Init DB Tables
    const initDB = async () => {
        let client;
        try {
            client = await pool.connect();
            console.log("✅ [Server] Database connected successfully.");
            
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY,
                    data JSONB
                );
                CREATE TABLE IF NOT EXISTS exhibits (
                    id TEXT PRIMARY KEY,
                    data JSONB,
                    timestamp TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS collections (
                    id TEXT PRIMARY KEY,
                    data JSONB,
                    timestamp TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS notifications (
                    id TEXT PRIMARY KEY,
                    data JSONB,
                    timestamp TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    data JSONB,
                    timestamp TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS guestbook (
                    id TEXT PRIMARY KEY,
                    data JSONB,
                    timestamp TIMESTAMPTZ DEFAULT NOW()
                );
            `);
            console.log("✅ [Server] Database tables initialized.");
        } catch (err) {
            console.error("🔴 [Server] Failed to initialize DB:", err);
            console.log("⚠️  [Server] Switching to local file system fallback due to DB error.");
            pool = null; // Fallback to file system
        } finally {
            if (client) client.release();
        }
    };
    initDB();
} else {
    console.log("📂 [Server] No Database credentials found. Using local file system (data/db.json).");
}

// --- DATA ACCESS LAYER (Hybrid: DB or JSON File) ---

// Helper to read all data
const readData = async () => {
    // 1. PostgreSQL Strategy
    if (pool) {
        try {
            const client = await pool.connect();
            const [users, exhibits, collections, notifs, msgs, gb] = await Promise.all([
                client.query('SELECT data FROM users'),
                client.query('SELECT data FROM exhibits ORDER BY timestamp DESC'),
                client.query('SELECT data FROM collections ORDER BY timestamp DESC'),
                client.query('SELECT data FROM notifications ORDER BY timestamp DESC'),
                client.query('SELECT data FROM messages ORDER BY timestamp ASC'),
                client.query('SELECT data FROM guestbook ORDER BY timestamp DESC')
            ]);
            client.release();
            
            return {
                users: users.rows.map(r => r.data),
                exhibits: exhibits.rows.map(r => r.data),
                collections: collections.rows.map(r => r.data),
                notifications: notifs.rows.map(r => r.data),
                messages: msgs.rows.map(r => r.data),
                guestbook: gb.rows.map(r => r.data),
            };
        } catch (e) {
            console.error("DB Read Error:", e);
            throw e;
        }
    } 
    
    // 2. File System Strategy
    if (fs.existsSync(DB_FILE)) {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
    return { users: [], exhibits: [], collections: [], notifications: [], messages: [], guestbook: [] };
};

// Helper to save specific entity
const saveEntity = async (table, data) => {
    // 1. PostgreSQL Strategy
    if (pool) {
        const client = await pool.connect();
        try {
            // Using UPSERT (Insert or Update)
            if (table === 'users') {
                 await client.query(
                    'INSERT INTO users (username, data) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET data = $2',
                    [data.username, data]
                );
            } else {
                await client.query(
                    `INSERT INTO ${table} (id, data, timestamp) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2`,
                    [data.id, data]
                );
            }
        } finally {
            client.release();
        }
        return;
    }

    // 2. File System Strategy
    const db = await readData();
    if (table === 'users') {
        const idx = db.users.findIndex(u => u.username === data.username);
        if (idx >= 0) db.users[idx] = data;
        else db.users.push(data);
    } else {
        const list = db[table]; // exhibits, collections, etc.
        const idx = list.findIndex(i => i.id === data.id);
        if (idx >= 0) list[idx] = data;
        else list.unshift(data); // Add to top
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

// Helper to delete entity
const deleteEntity = async (table, id) => {
    if (pool) {
        const client = await pool.connect();
        await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        client.release();
        return;
    }
    const db = await readData();
    db[table] = db[table].filter(i => i.id !== id);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}


// --- API ROUTES ---

app.get('/api/sync', async (req, res) => {
    try {
        const data = await readData();
        res.json(data);
    } catch (e) {
        console.error("Sync failed:", e);
        // Fallback to empty data structure if DB fails, to prevent frontend crash
        res.json({ users: [], exhibits: [], collections: [], notifications: [], messages: [], guestbook: [] });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const user = req.body;
    try {
        await saveEntity('users', user);
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/exhibits', async (req, res) => {
    try {
        await saveEntity('exhibits', req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/exhibits/:id', async (req, res) => {
    try {
        await deleteEntity('exhibits', req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/collections', async (req, res) => {
    try {
        await saveEntity('collections', req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/collections/:id', async (req, res) => {
    try {
        await deleteEntity('collections', req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/notifications', async (req, res) => {
    try {
        await saveEntity('notifications', req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/messages', async (req, res) => {
    try {
        await saveEntity('messages', req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/guestbook', async (req, res) => {
    try {
        await saveEntity('guestbook', req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/users/update', async (req, res) => {
    try {
        await saveEntity('users', req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Fallback for SPA
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('NeoArchive API Server Running. Frontend not built. Please run "npm run build".');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});