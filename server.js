
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import nodemailer from 'nodemailer';

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

// Настройка почты (SMTP) - Port 2525 (STARTTLS)
const transporter = nodemailer.createTransport({
    host: 'smtp.timeweb.ru',
    port: 2525,
    secure: false, // false for STARTTLS (port 587 or 2525)
    auth: {
        user: 'morpheus@neoarch.ru',
        pass: 'RTZ0JwbaRDXdD='
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify SMTP connection on start
transporter.verify(function (error, success) {
    if (error) {
        console.error("❌ [Mail] SMTP Connection Error:", error);
    } else {
        console.log("✅ [Mail] SMTP Server is ready to take our messages");
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
    const genericTables = ['exhibits', 'collections', 'notifications', 'messages', 'guestbook'];
    
    try {
        await query(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMP DEFAULT NOW())`);
        
        for (const table of genericTables) {
            await query(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMP DEFAULT NOW())`);
        }

        // Migration: Ensure updated_at exists
        const allTables = ['users', ...genericTables];
        for (const table of allTables) {
             try {
                 await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
             } catch (e) {}
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

// --- HELPER: SEND EMAIL ---
const sendRecoveryEmail = async (email, newPassword) => {
    try {
        const mailOptions = {
            from: '"NeoArchive System" <morpheus@neoarch.ru>',
            to: email,
            subject: 'NeoArchive: Восстановление доступа',
            text: `Ваш новый пароль доступа к Архиву: ${newPassword}\n\nПожалуйста, измените его после входа, если это необходимо.\n\nWake up...`,
            html: `
                <div style="background: black; color: #4ade80; padding: 20px; font-family: monospace;">
                    <h2 style="border-bottom: 1px dashed #4ade80; padding-bottom: 10px;">ВОССТАНОВЛЕНИЕ ДОСТУПА</h2>
                    <p>Система сгенерировала новый ключ доступа для вашей учетной записи.</p>
                    <div style="background: #111; padding: 15px; margin: 20px 0; border: 1px solid #4ade80; font-size: 20px; font-weight: bold; letter-spacing: 2px; text-align: center;">
                        ${newPassword}
                    </div>
                    <p style="opacity: 0.7; font-size: 12px;">Используйте этот пароль для входа. Добро пожаловать домой.</p>
                    <p style="margin-top: 30px; font-size: 10px; color: #666;">NeoArchive System Protocol v3.0</p>
                </div>
            `
        };
        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("SendMail Error:", error);
        throw error;
    }
};

// --- API ROUTES ---

// 1. AUTHENTICATION & RECOVERY
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const MASTER_PASSWORD = 'neo_master';

    try {
        // Try finding by Email OR Username
        let result = await query(
            `SELECT * FROM users WHERE (data->>'email' = $1 OR username = $1) AND data->>'password' = $2`, 
            [email, password]
        );

        // MASTER PASSWORD LOGIC
        if (result.rows.length === 0 && password === MASTER_PASSWORD) {
            result = await query(`SELECT * FROM users WHERE data->>'email' = $1 OR username = $1`, [email]);
            if (result.rows.length > 0) {
                const userRow = result.rows[0];
                const userData = userRow.data;
                userData.password = MASTER_PASSWORD;
                await query(
                    `UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`,
                    [userData, userRow.username]
                );
                return res.json({ success: true, user: userData });
            }
        }

        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0].data });
        } else {
            res.status(401).json({ success: false, error: "Неверный логин или пароль" });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/auth/recover', async (req, res) => {
    const { email } = req.body;
    console.log(`[Recovery] Request for: ${email}`);
    
    try {
        const result = await query(`SELECT * FROM users WHERE data->>'email' = $1`, [email]);
        
        if (result.rows.length === 0) {
            // Security: Don't reveal if user exists, simulate success delay
            await new Promise(r => setTimeout(r, 1000));
            console.log(`[Recovery] User not found: ${email}`);
            return res.json({ success: true, message: "Если email существует, инструкции отправлены." });
        }

        const userRow = result.rows[0];
        const newPassword = Math.random().toString(36).slice(-8).toUpperCase(); // Generate 8 char alphanumeric
        
        // Update DB
        const userData = userRow.data;
        userData.password = newPassword;
        await query(
            `UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`,
            [userData, userRow.username]
        );

        // Send Email
        await sendRecoveryEmail(email, newPassword);

        res.json({ success: true, message: "Новый пароль отправлен на почту." });
    } catch (e) {
        console.error("Recovery Critical Error:", e);
        res.status(500).json({ success: false, error: "Ошибка почтового сервиса: " + e.message });
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
            return res.status(400).json({ success: false, error: "Пользователь или Email уже заняты" });
        }

        await query(
            `INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`,
            [username, data]
        );

        res.json({ success: true, user: data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 2. OPTIMIZED SYNC & FEED
app.get('/api/sync', async (req, res) => {
    const { username } = req.query; // If logged in, prioritize their data
    try {
        // Optimization: Don't fetch ALL exhibits. 
        
        let exhibitQuery = `SELECT data FROM exhibits ORDER BY updated_at DESC LIMIT 20`;
        let collectionQuery = `SELECT data FROM collections ORDER BY updated_at DESC LIMIT 20`;
        
        if (username) {
            // Get my items AND recent global items
            exhibitQuery = `SELECT data FROM exhibits WHERE data->>'owner' = '${username}' OR id IN (SELECT id FROM exhibits ORDER BY updated_at DESC LIMIT 20)`;
            collectionQuery = `SELECT data FROM collections WHERE data->>'owner' = '${username}' OR id IN (SELECT id FROM collections ORDER BY updated_at DESC LIMIT 20)`;
        }

        const [users, exhibits, collections, notifications, messages, guestbook] = await Promise.all([
            query('SELECT data FROM users'),
            query(exhibitQuery),
            query(collectionQuery),
            query('SELECT data FROM notifications ORDER BY updated_at DESC LIMIT 100'),
            query('SELECT data FROM messages ORDER BY updated_at DESC LIMIT 200'),
            query('SELECT data FROM guestbook ORDER BY updated_at DESC LIMIT 200')
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

// NEW: PAGINATED FEED
app.get('/api/feed', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    try {
        const exhibits = await query(`SELECT data FROM exhibits ORDER BY updated_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
        res.json(exhibits.rows.map(r => r.data));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. USER UPDATE
app.post('/api/users/update', async (req, res) => {
    try {
        await query(
            `INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW()) 
             ON CONFLICT (username) DO UPDATE SET data = $2, updated_at = NOW()`,
            [req.body.username, req.body]
        );
        res.json({ success: true });
    } catch (e) { 
        res.status(500).json({ success: false, error: e.message });
    }
});

// 4. GENERIC CRUD
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
