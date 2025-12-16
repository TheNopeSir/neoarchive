
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
    user: 'gen_user', // Updated based on Adminer URL screenshot (NeoBD is likely cluster name)
    host: '89.169.46.157',
    database: 'default_db',
    password: '9H@DDCb.gQm.S}',
    port: 5432,
    ssl: {
        rejectUnauthorized: false // Timeweb self-signed certs fix
    },
    max: 20, // Max clients in pool
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

// Increased limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Test DB Connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ [Database] Ошибка подключения к PostgreSQL:', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('❌ [Database] Ошибка выполнения запроса:', err.stack);
        }
        console.log('✅ [Database] Успешное подключение к NeoBD @ 89.169.46.157');
    });
});

// --- API ROUTES ---

// Helper to execute queries safely
const query = async (text, params) => {
    try {
        const start = Date.now();
        const res = await pool.query(text, params);
        // const duration = Date.now() - start;
        // console.log('executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (err) {
        console.error("Query Error", err.message);
        throw err;
    }
};

// 1. AUTHENTICATION
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Ищем пользователя, где JSON поле email и password совпадают
        // В продакшене пароли должны быть хешированы, здесь используем прямое сравнение для миграции
        const result = await query(
            `SELECT data FROM users WHERE data->>'email' = $1 AND data->>'password' = $2`, 
            [email, password]
        );

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
        // Проверка на существование
        const check = await query(
            `SELECT 1 FROM users WHERE data->>'username' = $1 OR data->>'email' = $2`,
            [username, email]
        );

        if (check.rows.length > 0) {
            return res.status(400).json({ success: false, error: "Пользователь уже существует" });
        }

        // Вставка
        // Используем email или username как ID для простоты, или генерируем UUID на клиенте
        // Предполагаем, что клиент присылает полный объект user в 'data'
        await query(
            `INSERT INTO users (id, data, updated_at) VALUES ($1, $2, NOW())`,
            [username, data] // ID таблицы = username
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
        res.status(500).json({ error: "Sync failed" });
    }
});

// 3. USER UPDATE
app.post('/api/users/update', async (req, res) => {
    try {
        await query(
            `INSERT INTO users (id, data, updated_at) VALUES ($1, $2, NOW()) 
             ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
            [req.body.username, req.body]
        );
        res.json({ success: true });
    } catch (e) { 
        res.status(500).json({ success: false, error: e.message });
    }
});

// 4. GENERIC CRUD (Upsert & Delete)
const createCrudRoutes = (table) => {
    app.post(`/api/${table}`, async (req, res) => {
        try {
            const { id, ...rest } = req.body;
            // Предполагаем, что тело запроса - это объект данных целиком
            // Извлекаем ID из тела JSON
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
    console.log(`\n🚀 NeoArchive Server (PostgreSQL Edition) running!`);
    console.log(`   > DB: NeoBD @ 89.169.46.157`);
    console.log(`   > Local:   http://localhost:${PORT}`);
    console.log(`   > Network: http://${ip}:${PORT}`);
});
