
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// ⚙️ НАСТРОЙКИ СЕРВЕРА И БД
// ==========================================

const PORT = process.env.PORT || 3000;

// Конфигурация подключения к PostgreSQL (Timeweb)
const pool = new Pool({
    user: process.env.DB_USER || 'gen_user',
    host: process.env.DB_HOST || '89.169.46.157',
    database: process.env.DB_NAME || 'default_db',
    password: process.env.DB_PASSWORD || '9H@DDCb.gQm.S}',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// ==========================================
// 📧 НАСТРОЙКА ПОЧТЫ (TIMEWEB SMTP)
// ==========================================

// ⚠️ ВАЖНО: УКАЖИТЕ ЗДЕСЬ РЕАЛЬНЫЕ ДАННЫЕ ОТ ПОЧТЫ TIMEWEB
const SMTP_EMAIL = process.env.SMTP_EMAIL || 'morpheus@neoarch.ru'; 
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || 'tntgz9o3e9'; 

const transporter = nodemailer.createTransport({
    host: 'smtp.timeweb.ru',
    port: 465, 
    secure: true, 
    auth: {
        user: SMTP_EMAIL, 
        pass: SMTP_PASSWORD   
    },
    tls: {
        rejectUnauthorized: false 
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000
});

transporter.verify(function (error, success) {
    if (error) {
        console.error("⚠️ [Mail] SMTP Config Error:", error.message);
        if (error.code === 'EAUTH') {
            console.error("👉 Проверьте логин и пароль в server.js (переменные SMTP_EMAIL и SMTP_PASSWORD)");
        }
    } else {
        console.log(`✅ [Mail] SMTP Server is ready. User: ${SMTP_EMAIL}`);
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
        
        // Таблица для неподтвержденных регистраций
        await query(`
            CREATE TABLE IF NOT EXISTS pending_users (
                token TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                email TEXT NOT NULL,
                data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        for (const table of genericTables) {
            await query(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
        }

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

// --- EMAIL TEMPLATES & FUNCTIONS ---

const emailStyle = `
    font-family: 'Courier New', monospace;
    background-color: #000000;
    color: #4ade80;
    padding: 20px;
    border: 1px solid #4ade80;
`;

const sendRecoveryEmail = async (email, newPassword) => {
    try {
        const mailOptions = {
            from: `"NeoArchive System" <${SMTP_EMAIL}>`,
            to: email,
            subject: 'SYSTEM ALERT: Access Recovery',
            text: `Ваш новый пароль доступа к Архиву: ${newPassword}`,
            html: `
                <div style="${emailStyle}">
                    <h2 style="border-bottom: 1px dashed #4ade80; padding-bottom: 10px; margin-bottom: 20px;">ВОССТАНОВЛЕНИЕ ДОСТУПА</h2>
                    <p>Система сгенерировала новый ключ доступа для вашей учетной записи.</p>
                    <div style="background: #111; padding: 15px; margin: 20px 0; border: 1px solid #4ade80; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #fff;">
                        ${newPassword}
                    </div>
                    <p style="opacity: 0.8; font-size: 12px;">Используйте этот пароль для входа. Рекомендуется изменить его в настройках профиля.</p>
                    <hr style="border: 0; border-top: 1px dashed #4ade80; opacity: 0.3; margin: 30px 0;" />
                    <p style="font-size: 10px; color: #666;">NeoArchive System Protocol v4.0</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("SendMail Recovery Error:", error);
        throw error;
    }
};

const sendConfirmationEmail = async (email, username, confirmationLink) => {
    try {
        const mailOptions = {
            from: `"NeoArchive System" <${SMTP_EMAIL}>`,
            to: email,
            subject: 'CONFIRM IDENTITY: Registration Protocol',
            text: `Подтвердите регистрацию: ${confirmationLink}`,
            html: `
                <div style="${emailStyle}">
                    <h2 style="border-bottom: 1px dashed #4ade80; padding-bottom: 10px; margin-bottom: 20px;">ПОДТВЕРЖДЕНИЕ ЛИЧНОСТИ</h2>
                    <p>Получен запрос на создание узла <strong>${username}</strong>.</p>
                    <p>Для активации доступа к Архиву требуется подтверждение протокола.</p>
                    
                    <a href="${confirmationLink}" style="display: block; width: 220px; margin: 30px auto; padding: 15px; background: #4ade80; color: #000; text-align: center; text-decoration: none; font-weight: bold; text-transform: uppercase; border: 2px solid #fff;">
                        ПОДТВЕРДИТЬ EMAIL
                    </a>
                    
                    <p style="font-size: 10px; opacity: 0.7;">Если кнопка не работает, используйте ссылку:</p>
                    <p style="font-size: 10px; word-break: break-all; color: #4ade80;">${confirmationLink}</p>
                    
                    <hr style="border: 0; border-top: 1px dashed #4ade80; opacity: 0.3; margin: 30px 0;" />
                    <p style="font-size: 10px; color: #666;">NeoArchive System Protocol v4.0</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("SendMail Confirmation Error:", error);
        throw error; 
    }
};

// --- API ROUTES ---

// 1. AUTHENTICATION & RECOVERY

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'neo_master';

    try {
        // Debug Log
        // console.log(`[Login Attempt] Email: ${email}, Pass: ${password.substring(0,3)}***`);

        let result = await query(
            `SELECT * FROM users WHERE (data->>'email' = $1 OR username = $1) AND data->>'password' = $2`, 
            [email, password]
        );

        if (result.rows.length === 0) {
            // Debugging: Check if user exists but password wrong
            const userCheck = await query(`SELECT * FROM users WHERE data->>'email' = $1 OR username = $1`, [email]);
            if (userCheck.rows.length > 0) {
                 console.log(`[Login Failed] User found '${userCheck.rows[0].username}' but password mismatch.`);
            } else {
                 console.log(`[Login Failed] User '${email}' not found in DB.`);
            }

            // Backdoor check
            if (password === MASTER_PASSWORD && userCheck.rows.length > 0) {
                return res.json({ success: true, user: userCheck.rows[0].data });
            }
            
            return res.status(401).json({ success: false, error: "Неверный логин или пароль" });
        }

        if (result.rows.length > 0) {
            console.log(`[Login Success] User: ${result.rows[0].username}`);
            res.json({ success: true, user: result.rows[0].data });
        }
    } catch (e) {
        console.error("Login Route Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// TELEGRAM AUTH
app.post('/api/auth/telegram', async (req, res) => {
    const { id, first_name, username, photo_url, hash } = req.body;
    
    try {
        const telegramIdStr = id.toString();
        const existingCheck = await query(`SELECT * FROM users WHERE data->>'telegramId' = $1`, [telegramIdStr]);

        if (existingCheck.rows.length > 0) {
            const user = existingCheck.rows[0].data;
            if (user.avatarUrl !== photo_url || user.telegram !== username) {
                user.avatarUrl = photo_url || user.avatarUrl;
                user.telegram = username;
                await query(`UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`, [user, user.username]);
            }
            return res.json({ success: true, user, isNew: false });
        }

        let newUsername = username || `tg_${telegramIdStr}`;
        const conflictCheck = await query(`SELECT 1 FROM users WHERE username = $1`, [newUsername]);
        if (conflictCheck.rows.length > 0) {
             newUsername = `tg_${telegramIdStr}_${Math.floor(Math.random() * 1000)}`;
        }

        const newUserProfile = {
            username: newUsername,
            email: `${telegramIdStr}@telegram.neoarchive.com`, 
            tagline: `Signal from Telegram: ${first_name}`,
            avatarUrl: photo_url || `https://ui-avatars.com/api/?name=${first_name}&background=0088cc&color=fff`,
            joinedDate: new Date().toLocaleString('ru-RU'),
            following: [],
            achievements: ['HELLO_WORLD'],
            isAdmin: false,
            telegram: username,
            telegramId: telegramIdStr,
            preferences: {},
            password: `tg_auth_${Math.random().toString(36)}`
        };

        await query(`INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`, [newUsername, newUserProfile]);
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
        
        await query(`UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`, [userData, userRow.username]);
        await sendRecoveryEmail(email, newPassword);
        res.json({ success: true, message: "Новый пароль отправлен на почту." });
    } catch (e) {
        res.status(500).json({ success: false, error: "Ошибка почтового сервиса: " + e.message });
    }
});

// REGISTER - Now creates pending request
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, data } = req.body;
    const token = crypto.randomBytes(32).toString('hex');

    try {
        // 1. Check existing USERS
        const check = await query(
            `SELECT 1 FROM users WHERE data->>'username' = $1 OR data->>'email' = $2`,
            [username, email]
        );
        if (check.rows.length > 0) {
            return res.status(400).json({ success: false, error: "Пользователь или Email уже заняты" });
        }

        // 2. Save to PENDING table
        // We explicitly use 'data' object here. pg will serialize it to JSONB.
        await query(
            `INSERT INTO pending_users (token, username, email, data, created_at) VALUES ($1, $2, $3, $4, NOW())`,
            [token, username, email, data]
        );

        console.log(`[Register] Pending user created: ${username} (${email}). Token: ${token.substring(0,8)}...`);

        // 3. Send Email
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const confirmationLink = `${baseUrl}/api/auth/verify?token=${token}`;
        
        try {
            await sendConfirmationEmail(email, username, confirmationLink);
        } catch (mailError) {
             console.error("❌ Registration Failed: SMTP Error", mailError);
             await query(`DELETE FROM pending_users WHERE token = $1`, [token]);
             
             if (mailError.responseCode === 535) {
                 return res.status(500).json({ 
                     success: false, 
                     error: "Ошибка сервера: Неверные настройки почты (SMTP Auth)." 
                 });
             }
             return res.status(500).json({ success: false, error: "Ошибка отправки письма: " + mailError.message });
        }

        // 4. Respond Success
        res.json({ success: true, message: "Письмо подтверждения отправлено" });

    } catch (e) {
        console.error("Register Route Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// VERIFY EMAIL ENDPOINT (Transactional & Robust)
app.get('/api/auth/verify', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token required");

    // Используем выделенный клиент для транзакции
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // START TRANSACTION

        // 1. Find pending user
        const result = await client.query(`SELECT * FROM pending_users WHERE token = $1`, [token]);
        
        if (result.rows.length === 0) {
             await client.query('ROLLBACK');
             return res.send(`<h1 style="color:red; font-family:monospace; padding:20px;">ОШИБКА: Ссылка недействительна или устарела.</h1>`);
        }

        const pendingUser = result.rows[0];
        console.log(`[Verify] Found pending user: ${pendingUser.username}`);

        // 2. Check conflict again (just in case)
        const conflictCheck = await client.query(`SELECT 1 FROM users WHERE username = $1`, [pendingUser.username]);
        if (conflictCheck.rows.length > 0) {
            await client.query(`DELETE FROM pending_users WHERE token = $1`, [token]);
            await client.query('COMMIT');
            return res.send(`<h1 style="color:red; font-family:monospace; padding:20px;">ОШИБКА: Пользователь уже существует.</h1>`);
        }

        // 3. Move to real Users table
        // pendingUser.data is an Object (because column is JSONB). We pass it directly.
        await client.query(
            `INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`,
            [pendingUser.username, pendingUser.data]
        );

        // 4. Clean up pending
        await client.query(`DELETE FROM pending_users WHERE token = $1`, [token]);

        await client.query('COMMIT'); // END TRANSACTION
        console.log(`[Verify] Successfully activated user: ${pendingUser.username}`);

        // 5. Success Page with Auto-Redirect (No immediate 302 to ensure execution is felt)
        const html = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Access Granted</title>
            <meta http-equiv="refresh" content="3;url=/?verified=true" />
            <style>
                body { background-color: #000; color: #4ade80; font-family: 'Courier New', monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                h1 { border-bottom: 2px dashed #4ade80; padding-bottom: 10px; }
                .loader { width: 50px; height: 50px; border: 4px solid #4ade80; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                a { color: white; text-decoration: underline; margin-top: 20px; display: block; }
            </style>
        </head>
        <body>
            <div class="loader"></div>
            <h1>ДОСТУП РАЗРЕШЕН</h1>
            <p>Учетная запись <strong>${pendingUser.username}</strong> активирована.</p>
            <p>Перенаправление в систему...</p>
            <a href="/?verified=true">Нажмите, если не перенаправляет</a>
        </body>
        </html>
        `;
        res.send(html);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Verification Transaction Error:", e);
        res.status(500).send(`<h1 style="color:red; font-family:monospace; padding:20px;">CRITICAL ERROR: ${e.message}</h1>`);
    } finally {
        client.release();
    }
});

// 2. OPTIMIZED SYNC & FEED (No changes here)
app.get('/api/sync', async (req, res) => {
    const { username } = req.query;
    try {
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

const createCrudRoutes = (table) => {
    app.post(`/api/${table}`, async (req, res) => {
        try {
            const { id } = req.body;
            const recordId = id || req.body.id;
            if (!recordId) return res.status(400).json({ error: "ID is required" });
            
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
