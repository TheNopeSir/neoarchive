
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors()); // Allow all CORS requests
app.use(express.json({ limit: '50mb' })); 
app.use(express.static(path.join(__dirname, 'dist')));

// --- DATABASE CONFIGURATION (Timeweb) ---
const { Pool } = pg;

// Helper to log DB config safely
const dbConfig = {
    host: process.env.POSTGRESQL_HOST || process.env.PGHOST,
    port: parseInt(process.env.POSTGRESQL_PORT || process.env.PGPORT || '5432'),
    user: process.env.POSTGRESQL_USER || process.env.PGUSER,
    database: process.env.POSTGRESQL_DBNAME || process.env.PGDATABASE,
    // Do not log password
    ssl: { rejectUnauthorized: false }, 
    connectionTimeoutMillis: 10000 
};

console.log("🐘 [Server] DB Config:", { ...dbConfig, password: '****' });

const pool = new Pool({
    ...dbConfig,
    password: process.env.POSTGRESQL_PASSWORD || process.env.PGPASSWORD
});

// Init DB Tables on Startup
const initDB = async () => {
    let client;
    try {
        console.log("🐘 [Server] Connecting to Timeweb PostgreSQL...");
        client = await pool.connect();
        console.log("✅ [Server] Connection established successfully.");
        
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
        console.error("🔴 [Server] CRITICAL DB ERROR:", err);
        // Do not exit process, let the server run to serve static files/API errors
    } finally {
        if (client) client.release();
    }
};

initDB();

// --- DATA HELPERS ---

const upsertEntity = async (table, id, data) => {
    const client = await pool.connect();
    try {
        await client.query(
            `INSERT INTO ${table} (id, data, timestamp) VALUES ($1, $2, NOW()) 
             ON CONFLICT (id) DO UPDATE SET data = $2`,
            [id, data]
        );
    } finally {
        client.release();
    }
};

const upsertUser = async (username, data) => {
    const client = await pool.connect();
    try {
        await client.query(
            `INSERT INTO users (username, data) VALUES ($1, $2) 
             ON CONFLICT (username) DO UPDATE SET data = $2`,
            [username, data]
        );
    } finally {
        client.release();
    }
};

const deleteEntity = async (table, id) => {
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    } finally {
        client.release();
    }
};

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// 1. GLOBAL SYNC (Load all data)
app.get('/api/sync', async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const [users, exhibits, collections, notifs, msgs, gb] = await Promise.all([
            client.query('SELECT data FROM users'),
            client.query('SELECT data FROM exhibits ORDER BY timestamp DESC'),
            client.query('SELECT data FROM collections ORDER BY timestamp DESC'),
            client.query('SELECT data FROM notifications ORDER BY timestamp DESC'),
            client.query('SELECT data FROM messages ORDER BY timestamp ASC'),
            client.query('SELECT data FROM guestbook ORDER BY timestamp DESC')
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
        console.error("🔴 Sync Error:", e);
        res.status(500).json({ error: "Database Sync Failed", details: e.message });
    } finally {
        if (client) client.release();
    }
});

// 2. USER PROFILE SYNC
app.post('/api/users/update', async (req, res) => {
    try {
        await upsertUser(req.body.username, req.body);
        res.json({ success: true });
    } catch (e) { 
        console.error("User Update Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

// 3. CRUD OPERATIONS
const createCrudRoutes = (resourceName) => {
    app.post(`/api/${resourceName}`, async (req, res) => {
        try {
            await upsertEntity(resourceName, req.body.id, req.body);
            res.json({ success: true });
        } catch (e) { 
            console.error(`${resourceName} Create Error:`, e);
            res.status(500).json({ error: e.message }); 
        }
    });

    app.delete(`/api/${resourceName}/:id`, async (req, res) => {
        try {
            await deleteEntity(resourceName, req.params.id);
            res.json({ success: true });
        } catch (e) { 
            console.error(`${resourceName} Delete Error:`, e);
            res.status(500).json({ error: e.message }); 
        }
    });
};

createCrudRoutes('exhibits');
createCrudRoutes('collections');
createCrudRoutes('notifications');
createCrudRoutes('messages');
createCrudRoutes('guestbook');

// Fallback for SPA
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ NeoArchive Server running on port ${PORT}`);
});
