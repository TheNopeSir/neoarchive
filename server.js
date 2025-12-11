
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import os from 'os';

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

// --- DATABASE CONFIGURATION (MySQL/Timeweb) ---
// Using credentials provided by user
const dbConfig = {
    host: process.env.MYSQL_HOST || 'eac945a9e201d3657964fcb9.twc1.net',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'gen_user',
    password: process.env.MYSQL_PASSWORD || '6l3RE-<@Ge4D3W',
    database: process.env.MYSQL_DBNAME || 'NeoBD',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Enable multiple statements for initialization if needed, but best to separate them
    multipleStatements: true 
};

console.log("🐬 [Server] DB Config Host:", dbConfig.host);
console.log("🐬 [Server] DB Config Database:", dbConfig.database);

const pool = mysql.createPool(dbConfig);

// Safe query helper
const safeQuery = async (text, params) => {
    try {
        const [rows, fields] = await pool.execute(text, params);
        return { rows }; 
    } catch (e) {
        console.error(`🔴 [DB Error] Query failed: ${text.substring(0, 50)}...`, e.message);
        throw e;
    }
};

// Init DB Tables on Startup (Non-blocking)
const initDB = async () => {
    let connection;
    try {
        console.log("🐬 [Server] Attempting to connect to Timeweb MySQL...");
        connection = await pool.getConnection();
        console.log("✅ [Server] DB Connection established successfully!");
        
        // Ensure tables exist using MySQL syntax
        // JSON type is supported in MySQL 5.7+
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                username VARCHAR(255) PRIMARY KEY,
                data JSON
            )`,
            `CREATE TABLE IF NOT EXISTS exhibits (
                id VARCHAR(255) PRIMARY KEY,
                data JSON,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS collections (
                id VARCHAR(255) PRIMARY KEY,
                data JSON,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(255) PRIMARY KEY,
                data JSON,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS messages (
                id VARCHAR(255) PRIMARY KEY,
                data JSON,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS guestbook (
                id VARCHAR(255) PRIMARY KEY,
                data JSON,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const sql of tables) {
            await connection.query(sql);
        }
        
        console.log("✅ [Server] Database schema ensured.");
    } catch (err) {
        console.error("⚠️ [Server] DB Initialization failed (Offline Mode Active):", err.message);
        console.error("   Ensure 'NeoBD' exists in Timeweb dashboard or check .env credentials.");
    } finally {
        if (connection) connection.release();
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
        const [users] = await pool.query('SELECT data FROM users');
        const [exhibits] = await pool.query('SELECT data FROM exhibits ORDER BY timestamp DESC');
        const [collections] = await pool.query('SELECT data FROM collections ORDER BY timestamp DESC');
        const [notifs] = await pool.query('SELECT data FROM notifications ORDER BY timestamp DESC');
        const [msgs] = await pool.query('SELECT data FROM messages ORDER BY timestamp ASC');
        const [gb] = await pool.query('SELECT data FROM guestbook ORDER BY timestamp DESC');
        
        // MySQL JSON columns are returned as objects automatically, no parsing needed usually
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
        // MySQL UPSERT syntax
        await safeQuery(
            `INSERT INTO users (username, data) VALUES (?, ?) 
             ON DUPLICATE KEY UPDATE data = VALUES(data)`,
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
            await safeQuery(
                `INSERT INTO ${resourceName} (id, data, timestamp) VALUES (?, ?, NOW()) 
                 ON DUPLICATE KEY UPDATE data = VALUES(data)`,
                [req.body.id, JSON.stringify(req.body)]
            );
            res.json({ success: true });
        } catch (e) { 
            res.status(500).json({ error: e.message }); 
        }
    });

    app.delete(`/api/${resourceName}/:id`, async (req, res) => {
        try {
            await safeQuery(`DELETE FROM ${resourceName} WHERE id = ?`, [req.params.id]);
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
    console.log(`   (Note: If accessing from mobile, ensure Firewall allows Node.js)\n`);
});
