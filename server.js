
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
    connectionTimeoutMillis: 5000, // Increased timeout
});

// Настройка почты (GMAIL) - Порт 587 (STARTTLS)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, 
    auth: {
        user: 'truester1337@gmail.com', 
        pass: 'qkpv igjx hgib uoqf'   
    },
    tls: {
        rejectUnauthorized: false 
    },
    connectionTimeout: 15000, 
    greetingTimeout: 15000
});

transporter.verify(function (error, success) {
    if (error) {
        console.error("⚠️ [Mail] SMTP Warning:", error.message);
    } else {
        console.log("✅ [Mail] SMTP Server (Gmail:587) is ready");
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
            await query(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
        }

        // Migration: Ensure timestamps exist
        const allTables = ['users', ...genericTables];
        for (const table of allTables) {
             try {
                 await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
                 if (table !== 'users') {
                    await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
                 }
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
            from: '"NeoArchive System" <truester1337@gmail.com>',
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
        return true;
    } catch (error) {
        console.error("SendMail Error:", error);
        throw error;
    }
};

// --- API ROUTES ---

// 1. AUTHENTICATION & RECOVERY

// Стандартный логин
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const MASTER_PASSWORD = 'neo_master';

    try {
        let result = await query(
            `SELECT * FROM users WHERE (data->>'email' = $1 OR username = $1) AND data->>'password' = $2`, 
            [email, password]
        );

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

// TELEGRAM AUTH (Login OR Register)
app.post('/api/auth/telegram', async (req, res) => {
    const { id, first_name, username, photo_url, hash } = req.body;
    
    // В продакшене здесь ОБЯЗАТЕЛЬНА проверка хэша через Bot Token!
    // Для прототипа доверяем данным, но используем ID как ключ.

    try {
        const telegramIdStr = id.toString();
        
        // 1. Ищем пользователя по Telegram ID
        const existingCheck = await query(
            `SELECT * FROM users WHERE data->>'telegramId' = $1`,
            [telegramIdStr]
        );

        if (existingCheck.rows.length > 0) {
            // Пользователь найден -> Логин
            const user = existingCheck.rows[0].data;
            // Обновляем фото/ник если поменялись
            if (user.avatarUrl !== photo_url || user.telegram !== username) {
                user.avatarUrl = photo_url || user.avatarUrl;
                user.telegram = username;
                await query(`UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`, [user, user.username]);
            }
            return res.json({ success: true, user, isNew: false });
        }

        // 2. Если не найден, регистрируем нового
        // Генерируем уникальный username, если такой username уже занят кем-то другим (не через тг)
        let newUsername = username || `tg_${telegramIdStr}`;
        const conflictCheck = await query(`SELECT 1 FROM users WHERE username = $1`, [newUsername]);
        if (conflictCheck.rows.length > 0) {
             newUsername = `tg_${telegramIdStr}_${Math.floor(Math.random() * 1000)}`;
        }

        const newUserProfile = {
            username: newUsername,
            email: `${telegramIdStr}@telegram.neoarchive.com`, // Fake email for schema compatibility
            tagline: `Signal from Telegram: ${first_name}`,
            avatarUrl: photo_url || `https://ui-avatars.com/api/?name=${first_name}&background=0088cc&color=fff`,
            joinedDate: new Date().toLocaleString('ru-RU'),
            following: [],
            achievements: ['HELLO_WORLD'],
            isAdmin: false,
            telegram: username,
            telegramId: telegramIdStr,
            preferences: {},
            password: `tg_auth_${Math.random().toString(36)}` // Random password
        };

        await query(
            `INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`,
            [newUsername, newUserProfile]
        );

        res.json({ success: true, user: newUserProfile, isNew: true });

    } catch (e) {
        console.error("Telegram Auth Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/auth/recover', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await query(`SELECT * FROM users WHERE data->>'email' = $1`, [email]);
        if (result.rows.length === 0) {
            await new Promise(r => setTimeout(r, 1000));
            return res.json({ success: true, message: "Если email существует, инструкции отправлены." });
        }

        const userRow = result.rows[0];
        const newPassword = Math.random().toString(36).slice(-8).toUpperCase(); 
        
        const userData = userRow.data;
        userData.password = newPassword;
        await query(
            `UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`,
            [userData, userRow.username]
        );

        await sendRecoveryEmail(email, newPassword);
        res.json({ success: true, message: "Новый пароль отправлен на почту." });
    } catch (e) {
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
    const { username } = req.query;
    try {
        // HYBRID QUERY: Get Top 50 Active OR Top 10 Newest
        // This ensures new items (created_at) appear even if they have low activity (updated_at)
        // AND keeps active discussions visible.
        
        let exhibitQuery = `
            SELECT data FROM exhibits 
            WHERE id IN (
                (SELECT id FROM exhibits ORDER BY updated_at DESC LIMIT 50)
                UNION
                (SELECT id FROM exhibits ORDER BY created_at DESC LIMIT 10)
            )
            ORDER BY updated_at DESC
        `;
        
        let collectionQuery = `SELECT data FROM collections ORDER BY updated_at DESC LIMIT 20`;
        
        if (username) {
            exhibitQuery = `
                SELECT data FROM exhibits 
                WHERE data->>'owner' = '${username}' 
                OR id IN (
                    (SELECT id FROM exhibits ORDER BY updated_at DESC LIMIT 50)
                    UNION
                    (SELECT id FROM exhibits ORDER BY created_at DESC LIMIT 10)
                )
            `;
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

// 2.1 Fetch single user (for session restore)
app.get('/api/users/:username', async (req, res) => {
    try {
        const result = await query(`SELECT data FROM users WHERE username = $1`, [req.params.username]);
        if (result.rows.length > 0) {
            res.json(result.rows[0].data);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

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

            // Handle created_at. If it's a new record (INSERT), created_at is NOW().
            // If UPDATE, we don't touch created_at usually, but here we use simple ON CONFLICT logic.
            // Note: Postgres sets created_at default NOW() on insert.
            
            await query(
                `INSERT INTO ${table} (id, data, updated_at, created_at) VALUES ($1, $2, NOW(), NOW()) 
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

app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API Endpoint ${req.path} not found` });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 NeoArchive Server running on port ${PORT}`);
});
