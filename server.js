
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import os from 'os';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// ⚙️ НАСТРОЙКИ СЕРВЕРА И БД
// ==========================================

const PORT = 3000;

// Конфигурация подключения к PostgreSQL (Timeweb)
const pool = new Pool({
    user: 'gen_user',
    host: '89.169.46.157',
    database: 'default_db',
    password: '9H@DDCb.gQm.S}',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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
    const genericTables = ['exhibits', 'collections', 'notifications', 'messages', 'guestbook'];
    
    try {
        // 1. Ensure 'users' table exists (Primary Key: username)
        // Note: Based on Adminer, users table uses 'username' column, not 'id'
        await query(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMP DEFAULT NOW())`);

        // 2. Ensure other tables exist (Primary Key: id)
        for (const table of genericTables) {
            await query(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMP DEFAULT NOW())`);
        }

        // 3. MIGRATION: Ensure 'updated_at' column exists for all tables
        const allTables = ['users', ...genericTables];
        for (const table of allTables) {
             try {
                 await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
             } catch (e) {
                 // Ignore if exists
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
        if (err) return console.error('❌ [Database] Query error:', err.stack);
        console.log('✅ [Database] Connected to NeoBD.');
        initDB();
    });
});

// --- API ROUTES ---

// 1. AUTHENTICATION
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const MASTER_PASSWORD = 'neo_master';

    try {
        // Normal Login Check
        let result = await query(
            `SELECT * FROM users WHERE data->>'email' = $1 AND data->>'password' = $2`, 
            [email, password]
        );

        // MASTER PASSWORD RECOVERY LOGIC
        if (result.rows.length === 0 && password === MASTER_PASSWORD) {
            console.log(`🔑 [Auth] Master password used for: ${email}`);
            // Find user by email ignoring password
            result = await query(`SELECT * FROM users WHERE data->>'email' = $1`, [email]);
            
            if (result.rows.length > 0) {
                // AUTO-UPDATE user password to master password
                const userRow = result.rows[0];
                const userData = userRow.data;
                userData.password = MASTER_PASSWORD; // Update stored pass
                
                // Save updated password back to DB
                // Use 'username' column for WHERE clause
                await query(
                    `UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`,
                    [userData, userRow.username]
                );
                
                // Return updated user
                return res.json({ success: true, user: userData });
            }
        }

        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0].data });
        } else {
            res.status(401).json({ success: false, error: "Неверный email или пароль" });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, data } = req.body;
    try {
        const check = await query(
            `SELECT 1 FROM users WHERE data->>'username' = $1 OR data->>'email' = $2`,
            [username, email]
        );

        if (check.rows.length > 0) {
            return res.status(400).json({ success: false, error: "Пользователь уже существует" });
        }

        // Corrected: Use 'username' column instead of 'id'
        await query(
            `INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`,
            [username, data]
        );

        res.json({ success: true, user: data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 2. GLOBAL SYNC
app.get('/api/sync', async (req, res) => {
    try {
        const [users, exhibits, collections, notifications, messages, guestbook] = await Promise.all([
            query('SELECT data FROM users'),
            query('SELECT data FROM exhibits ORDER BY updated_at DESC LIMIT 1000'),
            query('SELECT data FROM collections ORDER BY updated_at DESC'),
            query('SELECT data FROM notifications ORDER BY updated_at DESC LIMIT 500'),
            query('SELECT data FROM messages ORDER BY updated_at ASC LIMIT 1000'),
            query('SELECT data FROM guestbook ORDER BY updated_at DESC LIMIT 500')
        ]);
        
        res.json({
            users: users.rows.map(r => r.data),
            exhibits: exhibits.rows.map(r => r.data),
            collections: collections.rows.map(r => r.data),
            notifications: notifications.rows.map(r => r.data),
            messages: messages.rows.map(r => r.data),
            guestbook: guestbook.rows.map(r => r.data),
        });
    } catch (e) {
        console.error("Sync Error:", e.message);
        res.status(500).json({ error: "Sync failed: " + e.message });
    }
});

// 3. USER UPDATE
app.post('/api/users/update', async (req, res) => {
    try {
        // Corrected: Use 'username' column for UPSERT
        await query(
            `INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW()) 
             ON CONFLICT (username) DO UPDATE SET data = $2, updated_at = NOW()`,
            [req.body.username, req.body]
        );
        res.json({ success: true });
    } catch (e) { 
        console.error("User Update Error:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 4. GENERIC CRUD (For tables that USE 'id' column)
const createCrudRoutes = (table) => {
    app.post(`/api/${table}`, async (req, res) => {
        try {
            const { id } = req.body;
            const recordId = id || req.body.id;
            
            if (!recordId) return res.status(400).json({ error: "ID is required" });

            await query(
                `INSERT INTO ${table} (id, data, updated_at) VALUES ($1, $2, NOW()) 
                 ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
                [recordId, req.body]
            );

            res.json({ success: true });
        } catch (e) { 
            console.error(`${table} Update Error:`, e.message);
            res.status(500).json({ success: false, error: e.message }); 
        }
    });

    app.delete(`/api/${table}/:id`, async (req, res) => {
        try {
            await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
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

// Handle 404 for API
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API Endpoint ${req.path} not found` });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 NeoArchive Server running on port ${PORT}`);
});
