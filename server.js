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
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.static(path.join(__dirname, 'dist')));

// --- DATABASE CONFIGURATION (Timeweb) ---
const { Pool } = pg;

// Данные берутся из .env файла
const pool = new Pool({
    host: process.env.POSTGRESQL_HOST || process.env.PGHOST,
    port: parseInt(process.env.POSTGRESQL_PORT || process.env.PGPORT || '5432'),
    user: process.env.POSTGRESQL_USER || process.env.PGUSER,
    password: process.env.POSTGRESQL_PASSWORD || process.env.PGPASSWORD,
    database: process.env.POSTGRESQL_DBNAME || process.env.PGDATABASE,
    ssl: { rejectUnauthorized: false }, // Обязательно для облачных БД без ручной установки сертификатов
    connectionTimeoutMillis: 5000 // Тайм-аут подключения
});

// Init DB Tables on Startup
const initDB = async () => {
    let client;
    try {
        console.log("🐘 [Server] Connecting to Timeweb PostgreSQL...");
        client = await pool.connect();
        console.log("✅ [Server] Connection established.");
        
        // Создаем таблицы, если их нет. Храним данные в JSONB для гибкости.
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
        // Не переключаемся на файлы, а выводим ошибку, чтобы сразу видеть проблему
    } finally {
        if (client) client.release();
    }
};

initDB();

// --- DATA HELPERS ---

// Helper to save generic entity
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

// Helper for users (PK is username)
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

// 1. GLOBAL SYNC (Load all data)
app.get('/api/sync', async (req, res) => {
    const client = await pool.connect();
    try {
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
        console.error("Sync Error:", e);
        res.status(500).json({ error: "Database Sync Failed" });
    } finally {
        client.release();
    }
});

// 2. AUTHENTICATION
app.post('/api/auth/register', async (req, res) => {
    const user = req.body;
    try {
        await upsertUser(user.username, user);
        res.json(user);
    } catch (e) {
        console.error("Register Error", e);
        res.status(500).json({ error: "Registration Failed" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { login, password } = req.body;
    const client = await pool.connect();
    try {
        // Ищем пользователя по username или email внутри JSONB
        const result = await client.query(
            `SELECT data FROM users 
             WHERE (username = $1 OR data->>'email' = $1) 
             AND data->>'password' = $2`,
            [login, password]
        );

        if (result.rows.length > 0) {
            res.json(result.rows[0].data);
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (e) {
        console.error("Login Error", e);
        res.status(500).json({ error: "Login System Error" });
    } finally {
        client.release();
    }
});

// 3. CRUD OPERATIONS

// Users Update
app.post('/api/users/update', async (req, res) => {
    try {
        await upsertUser(req.body.username, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Exhibits
app.post('/api/exhibits', async (req, res) => {
    try {
        await upsertEntity('exhibits', req.body.id, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/exhibits/:id', async (req, res) => {
    try {
        await deleteEntity('exhibits', req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Collections
app.post('/api/collections', async (req, res) => {
    try {
        await upsertEntity('collections', req.body.id, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/collections/:id', async (req, res) => {
    try {
        await deleteEntity('collections', req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Notifications
app.post('/api/notifications', async (req, res) => {
    try {
        await upsertEntity('notifications', req.body.id, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Messages
app.post('/api/messages', async (req, res) => {
    try {
        await upsertEntity('messages', req.body.id, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Guestbook
app.post('/api/guestbook', async (req, res) => {
    try {
        await upsertEntity('guestbook', req.body.id, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// Fallback for SPA
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ NeoArchive Server running on port ${PORT}`);
});