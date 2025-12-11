
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from root
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// --- DATABASE CONFIGURATION (Supabase PostgreSQL via Pooler) ---

// Using the transaction pooler credentials provided
const SUPABASE_DB_HOST = process.env.POSTGRES_HOST || 'aws-1-eu-west-1.pooler.supabase.com';
const SUPABASE_DB_PORT = parseInt(process.env.POSTGRES_PORT || '6543');
const SUPABASE_DB_USER = process.env.POSTGRES_USER || 'postgres.kovcgjtqbvmuzhsrcktd';
const SUPABASE_DB_PASS = process.env.POSTGRES_PASSWORD || 'ivKzfKVe$W7-AQ9';
const SUPABASE_DB_NAME = process.env.POSTGRES_DB || 'postgres';

console.log("🐘 [Server] DB Configuration (Supabase Pooler):");
console.log(`   > Host: ${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}`);
console.log(`   > User: ${SUPABASE_DB_USER}`);
console.log(`   > Database: ${SUPABASE_DB_NAME}`);

const { Pool } = pg;

const pool = new Pool({
    host: SUPABASE_DB_HOST,
    port: SUPABASE_DB_PORT,
    user: SUPABASE_DB_USER,
    password: SUPABASE_DB_PASS,
    database: SUPABASE_DB_NAME,
    ssl: {
        rejectUnauthorized: false // Required for Supabase connections
    },
    max: 20, // Connection pool limit
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Fail fast if connection hangs
});

// Safe query helper
const safeQuery = async (text, params) => {
    let client;
    try {
        client = await pool.connect();
        const res = await client.query(text, params);
        return { rows: res.rows }; 
    } catch (e) {
        console.error(`🔴 [DB Error] Query failed: ${text.substring(0, 50)}...`);
        console.error(`   > Message: ${e.message}`);
        // Log detailed network error if present
        if (e.code === 'ENETUNREACH' || e.code === 'ECONNREFUSED') {
            console.error(`   > Network Error: Check hostname ${SUPABASE_DB_HOST} and port ${SUPABASE_DB_PORT}`);
        }
        throw e;
    } finally {
        if (client) client.release();
    }
};

// Init DB Tables on Startup
const initDB = async () => {
    try {
        console.log("🐘 [Server] Connecting to Supabase PostgreSQL...");
        
        // Test connection
        const start = Date.now();
        await safeQuery('SELECT NOW()');
        console.log(`✅ [Server] DB Connection established successfully! (${Date.now() - start}ms)`);
        
        // Ensure tables exist (PostgreSQL syntax)
        // Note: Using JSONB for better performance than JSON
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                username VARCHAR(255) PRIMARY KEY,
                data JSONB
            )`,
            `CREATE TABLE IF NOT EXISTS exhibits (
                id VARCHAR(255) PRIMARY KEY,
                data JSONB,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS collections (
                id VARCHAR(255) PRIMARY KEY,
                data JSONB,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(255) PRIMARY KEY,
                data JSONB,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS messages (
                id VARCHAR(255) PRIMARY KEY,
                data JSONB,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS guestbook (
                id VARCHAR(255) PRIMARY KEY,
                data JSONB,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const sql of tables) {
            await safeQuery(sql);
        }
        
        console.log("✅ [Server] Database schema ensured.");
    } catch (err) {
        console.error("⚠️ [Server] DB Initialization failed:", err.message);
        console.error("   Please check your internet connection and Supabase credentials.");
    }
};

// Start DB Init
initDB();

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', engine: 'postgres-pooler', timestamp: new Date() });
});

// 1. GLOBAL SYNC
app.get('/api/sync', async (req, res) => {
    try {
        const { rows: users } = await safeQuery('SELECT data FROM users');
        const { rows: exhibits } = await safeQuery('SELECT data FROM exhibits ORDER BY timestamp DESC');
        const { rows: collections } = await safeQuery('SELECT data FROM collections ORDER BY timestamp DESC');
        const { rows: notifs } = await safeQuery('SELECT data FROM notifications ORDER BY timestamp DESC');
        const { rows: msgs } = await safeQuery('SELECT data FROM messages ORDER BY timestamp ASC');
        const { rows: gb } = await safeQuery('SELECT data FROM guestbook ORDER BY timestamp DESC');
        
        res.json({
            users: users.map(r => r.data),
            exhibits: exhibits.map(r => r.data),
            collections: collections.map(r => r.data),
            notifications: notifs.map(r => r.data),
            messages: msgs.map(r => r.data),
            guestbook: gb.map(r => r.data),
        });
    } catch (e) {
        console.error("Sync Error:", e.message);
        res.status(503).json({ error: "Database Unavailable", details: e.message });
    }
});

// 2. USER PROFILE SYNC
app.post('/api/users/update', async (req, res) => {
    try {
        // Postgres UPSERT syntax
        await safeQuery(
            `INSERT INTO users (username, data) VALUES ($1, $2) 
             ON CONFLICT (username) DO UPDATE SET data = EXCLUDED.data`,
            [req.body.username, JSON.stringify(req.body)]
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
            // Postgres UPSERT syntax
            await safeQuery(
                `INSERT INTO ${resourceName} (id, data, timestamp) VALUES ($1, $2, NOW()) 
                 ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, timestamp = NOW()`,
                [req.body.id, JSON.stringify(req.body)]
            );
            res.json({ success: true });
        } catch (e) { 
            res.status(500).json({ error: e.message }); 
        }
    });

    app.delete(`/api/${resourceName}/:id`, async (req, res) => {
        try {
            // Postgres DELETE syntax (Standard SQL)
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

// Handle 404 for API routes specifically
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API Endpoint ${req.path} not found` });
});

// Fallback for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Helper to find local IP
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '0.0.0.0';
}

app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIp();
    console.log(`\n🚀 NeoArchive Server running!`);
    console.log(`   > Local:   http://localhost:${PORT}`);
    console.log(`   > Network: http://${ip}:${PORT}`);
});
