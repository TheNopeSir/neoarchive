
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from root
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// --- DATABASE CONFIGURATION (Timeweb) ---
const { Pool } = pg;

// Fallback credentials in case .env fails to load in specific environments
const dbConfig = {
    host: process.env.POSTGRESQL_HOST || 'a584c7ff2ab7c4ced51afbdd.twc1.net',
    port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
    user: process.env.POSTGRESQL_USER || 'gen_user',
    database: process.env.POSTGRESQL_DBNAME || 'default_db',
    password: process.env.POSTGRESQL_PASSWORD || 'txO%AY~q4d8W%a',
    ssl: { rejectUnauthorized: false }, 
    connectionTimeoutMillis: 10000 // Increased timeout
};

console.log("🐘 [Server] DB Config Host:", dbConfig.host);

const pool = new Pool(dbConfig);

// Safe query helper
const safeQuery = async (text, params) => {
    try {
        const res = await pool.query(text, params);
        return res;
    } catch (e) {
        console.error(`🔴 [DB Error] Query failed: ${text.substring(0, 50)}...`, e.message);
        throw e;
    }
};

// Init DB Tables on Startup (Non-blocking)
const initDB = async () => {
    let client;
    try {
        console.log("🐘 [Server] Attempting to connect to Timeweb PostgreSQL...");
        client = await pool.connect();
        console.log("✅ [Server] Connection established successfully!");
        
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
        console.log("✅ [Server] Database schema ensured.");
    } catch (err) {
        console.error("⚠️ [Server] DB Initialization failed (Offline Mode Active):", err.message);
    } finally {
        if (client) client.release();
    }
};

// Start DB Init
initDB();

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// 1. GLOBAL SYNC
app.get('/api/sync', async (req, res) => {
    try {
        const [users, exhibits, collections, notifs, msgs, gb] = await Promise.all([
            safeQuery('SELECT data FROM users'),
            safeQuery('SELECT data FROM exhibits ORDER BY timestamp DESC'),
            safeQuery('SELECT data FROM collections ORDER BY timestamp DESC'),
            safeQuery('SELECT data FROM notifications ORDER BY timestamp DESC'),
            safeQuery('SELECT data FROM messages ORDER BY timestamp ASC'),
            safeQuery('SELECT data FROM guestbook ORDER BY timestamp DESC')
        ]);
        
        res.json({
            users: users.rows.map(r => r.data),
            exhibits: exhibits.rows.map(r => r.data),
            collections: collections.rows.map(r => r.data),
            notifications: notifs.rows.map(r => r.data),
            messages: msgs.rows.map(r => r.data),
            guestbook: gb.rows.map(r => r.data),
        });
    } catch (e) {
        console.error("Sync Error:", e.message);
        res.status(503).json({ error: "Database Unavailable", details: e.message });
    }
});

// 2. USER PROFILE SYNC
app.post('/api/users/update', async (req, res) => {
    try {
        await safeQuery(
            `INSERT INTO users (username, data) VALUES ($1, $2) 
             ON CONFLICT (username) DO UPDATE SET data = $2`,
            [req.body.username, req.body]
        );
        res.json({ success: true });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

// 3. CRUD OPERATIONS GENERATOR
const createCrudRoutes = (resourceName) => {
    app.post(`/api/${resourceName}`, async (req, res) => {
        try {
            await safeQuery(
                `INSERT INTO ${resourceName} (id, data, timestamp) VALUES ($1, $2, NOW()) 
                 ON CONFLICT (id) DO UPDATE SET data = $2`,
                [req.body.id, req.body]
            );
            res.json({ success: true });
        } catch (e) { 
            res.status(500).json({ error: e.message }); 
        }
    });

    app.delete(`/api/${resourceName}/:id`, async (req, res) => {
        try {
            await safeQuery(`DELETE FROM ${resourceName} WHERE id = $1`, [req.params.id]);
            res.json({ success: true });
        } catch (e) { 
            res.status(500).json({ error: e.message }); 
        }
    });
};

createCrudRoutes('exhibits');
createCrudRoutes('collections');
createCrudRoutes('notifications');
createCrudRoutes('messages');
createCrudRoutes('guestbook');

// Handle 404 for API routes specifically (return JSON, not HTML)
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API Endpoint ${req.path} not found` });
});

// Fallback for SPA (Serve index.html for all other routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ NeoArchive Server running on port ${PORT}`);
});
