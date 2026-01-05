import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';

// Загружаем настройки из файла .env
dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// ⚙️ НАСТРОЙКИ СЕРВЕРА
// ==========================================

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors({ origin: true, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '50mb' }));

// Логгер запросов
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// ==========================================
// 📧 SMTP CONFIGURATION
// ==========================================

// Проверка наличия настроек почты
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("\n⚠️  ВНИМАНИЕ: Настройки SMTP (почты) не найдены в файле .env!");
    console.warn("⚠️  Функции регистрации и восстановления пароля могут не работать.");
    console.warn("⚠️  Создайте файл .env и заполните SMTP_USER и SMTP_PASS.\n");
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.timeweb.ru', // Timeweb default
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: parseInt(process.env.SMTP_PORT || '465') === 465, 
    auth: {
        // Данные берутся из файла .env
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS,
    },
});

// ==========================================
// 💽 DATABASE CONNECTION
// ==========================================

const dbConfig = {
    user: process.env.DB_USER || 'gen_user',
    host: process.env.DB_HOST || '89.169.46.157',
    database: process.env.DB_NAME || 'default_db',
    password: process.env.DB_PASSWORD || '9H@DDCb.gQm.S}',
    port: parseInt(process.env.DB_PORT || '5432'),
    // SSL только если явно указано или для удалённого хоста
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10, // максимум соединений в пуле
};

console.log(`[Database] Connecting to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...`);

const pool = new Pool(dbConfig);

pool.on('error', (err) => {
    console.error('❌ [Database] Pool error:', err.message);
});

pool.on('connect', () => {
    console.log('✅ [Database] New client connected');
});

// Тест подключения при старте
const testDatabaseConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as time, current_database() as db');
        console.log(`✅ [Database] Connected! Server time: ${result.rows[0].time}`);
        client.release();
        return true;
    } catch (err) {
        console.error('❌ [Database] Connection test failed:', err.message);
        console.error('   Check your DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env');
        return false;
    }
};

// Функция запроса с retry логикой
const query = async (text, params = [], retries = 2) => {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            return await pool.query(text, params);
        } catch (err) {
            console.error(`❌ [Database] Query attempt ${attempt} failed: ${err.message}`);
            if (attempt <= retries && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === '57P01')) {
                console.log(`   Retrying in ${attempt}s...`);
                await new Promise(r => setTimeout(r, attempt * 1000));
            } else {
                throw err;
            }
        }
    }
};

// Хелпер для объединения колонок SQL и JSON поля 'data' (если есть)
const mapRow = (row) => {
    if (!row) return null;
    const { data, ...rest } = row;
    // Если есть колонка data с JSON, мержим её с остальными колонками
    // Остальные колонки имеют приоритет (например id, owner, created_at)
    return { ...(data || {}), ...rest };
};

// ==========================================
// API ROUTES
// ==========================================

// HEALTH CHECK (расширенный)
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date(),
        database: 'unknown',
        smtp: 'unknown'
    };

    // Проверка БД
    try {
        await pool.query('SELECT 1');
        health.database = 'connected';
    } catch (e) {
        health.database = `error: ${e.message}`;
        health.status = 'degraded';
    }

    // Проверка SMTP
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        health.smtp = 'configured';
    } else {
        health.smtp = 'not configured';
    }

    res.json(health);
});

// AUTH: REGISTER
app.post('/api/auth/register', async (req, res) => {
    const { username, password, tagline, email } = req.body;
    if (!username || !password || !email) return res.status(400).json({ error: "Заполните все поля" });

    try {
        // Проверяем существование (email хранится в data JSONB)
        const check = await query(`SELECT * FROM users WHERE username = $1 OR data->>'email' = $2`, [username, email]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Пользователь или Email уже занят" });

        const newUser = {
            username,
            email,
            password, 
            tagline: tagline || "Новый пользователь",
            avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=random&color=fff`,
            joinedDate: new Date().toLocaleDateString(),
            following: [],
            followers: [],
            achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
            settings: { theme: 'dark' },
            isAdmin: false
        };

        // Вставляем username и данные в JSONB колонку 'data'
        // Email хранится внутри data
        await query(
            `INSERT INTO users (username, data) VALUES ($1, $2) RETURNING *`,
            [username, newUser]
        );
        
        // Welcome Email
        try {
            await transporter.sendMail({
                from: `"NeoArchive" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'WELCOME TO THE ARCHIVE',
                text: `Welcome, ${username}.`,
                html: `<div style="background: black; color: #00ff00; padding: 20px;"><h1>NEO_ARCHIVE // CONNECTED</h1><p>Добро пожаловать, <strong>${username}</strong>.</p></div>`
            });
            console.log(`[MAIL] Welcome email sent to ${email}`);
        } catch (mailError) {
            console.error("[MAIL] Failed:", mailError.message);
        }

        res.json(newUser);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// AUTH: LOGIN
app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ error: "Логин и пароль обязательны" });
    }

    try {
        console.log(`[Auth] Login attempt for: ${identifier}`);

        // Ищем по username или email (email в JSONB data)
        const result = await query(
            `SELECT * FROM users WHERE username = $1 OR data->>'email' = $1`,
            [identifier]
        );

        if (result.rows.length === 0) {
            console.log(`[Auth] User not found: ${identifier}`);
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const user = mapRow(result.rows[0]);

        // Проверка пароля (в реальном проекте нужен хэш!)
        if (user.password !== password) {
            console.log(`[Auth] Wrong password for: ${identifier}`);
            return res.status(401).json({ error: "Неверный пароль" });
        }

        console.log(`[Auth] Login success: ${identifier}`);
        res.json(user);
    } catch (e) {
        console.error(`[Auth] Login error for ${identifier}:`, e.message);
        console.error('   Stack:', e.stack);
        res.status(500).json({ error: `Ошибка сервера при входе: ${e.message}` });
    }
});

// AUTH: TELEGRAM
app.post('/api/auth/telegram', async (req, res) => {
    const { id, first_name, last_name, username: tgUsername, photo_url } = req.body;

    if (!id) {
        return res.status(400).json({ error: "Telegram ID обязателен" });
    }

    try {
        const telegramId = `tg_${id}`;
        console.log(`[Auth] Telegram login attempt for: ${telegramId}`);

        // Ищем по telegram_id в data
        let result = await query(
            `SELECT * FROM users WHERE data->>'telegram_id' = $1`,
            [String(id)]
        );

        let user;
        if (result.rows.length === 0) {
            // Создаём нового пользователя
            const displayName = tgUsername || `${first_name}${last_name ? ' ' + last_name : ''}`;
            const newUser = {
                username: telegramId,
                telegram_id: String(id),
                telegram: tgUsername || '',
                email: '',
                password: crypto.randomBytes(16).toString('hex'),
                tagline: `Пользователь Telegram`,
                avatarUrl: photo_url || `https://ui-avatars.com/api/?name=${displayName}&background=random&color=fff`,
                joinedDate: new Date().toLocaleDateString(),
                following: [],
                followers: [],
                achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
                settings: { theme: 'dark' },
                isAdmin: false
            };

            await query(
                `INSERT INTO users (username, data) VALUES ($1, $2) RETURNING *`,
                [telegramId, newUser]
            );
            user = newUser;
            console.log(`[Auth] New Telegram user created: ${telegramId}`);
        } else {
            user = mapRow(result.rows[0]);
            console.log(`[Auth] Existing Telegram user logged in: ${user.username}`);
        }

        res.json(user);
    } catch (e) {
        console.error(`[Auth] Telegram login error:`, e.message);
        res.status(500).json({ error: `Ошибка Telegram авторизации: ${e.message}` });
    }
});

// AUTH: RECOVER
app.post('/api/auth/recover', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email обязателен" });

    try {
        const result = await query(`SELECT * FROM users WHERE data->>'email' = $1`, [email]);
        
        if (result.rows.length === 0) {
            // Симулируем успех для безопасности
            return res.json({ success: true, message: "Если email существует, мы отправили инструкцию." });
        }

        const rawUser = result.rows[0];
        const user = mapRow(rawUser);
        const newPass = crypto.randomBytes(4).toString('hex');
        
        // Обновляем пароль в JSON 'data' и, если надо, в отдельной колонке (если бы она была)
        user.password = newPass;
        
        await query(`UPDATE users SET data = $1 WHERE username = $2`, [user, user.username]);

        try {
            await transporter.sendMail({
                from: `"NeoArchive Security" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'PASSWORD RESET // NEO_ARCHIVE',
                html: `
                <div style="background: #000; color: #0f0; padding: 20px; font-family: monospace;">
                    <h2>/// SYSTEM OVERRIDE</h2>
                    <p>Identity: <strong>${user.username}</strong></p>
                    <p>New Access Key:</p>
                    <h1 style="border: 1px dashed #0f0; display: inline-block; padding: 10px;">${newPass}</h1>
                </div>
                `
            });
            console.log(`[MAIL] Recovery sent to ${email}`);
        } catch (mailError) {
            console.error("[MAIL] Recovery Failed:", mailError);
            return res.status(500).json({ error: "Ошибка отправки письма" });
        }

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка восстановления" });
    }
});

// FEED (GET ALL EXHIBITS)
app.get('/api/feed', async (req, res) => {
    console.log('[Feed] Fetching exhibits...');
    try {
        const result = await query(`SELECT * FROM exhibits ORDER BY created_at DESC LIMIT 100`);
        console.log(`[Feed] Found ${result.rows.length} exhibits`);
        const items = result.rows.map(mapRow);
        res.json(items);
    } catch (e) {
        console.error("[Feed] Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// SYNC (User Data + Collections)
app.get('/api/sync', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.json({});
    try {
        const userRes = await query(`SELECT * FROM users WHERE username = $1`, [username]);
        // owner хранится в JSONB поле data
        const colsRes = await query(`SELECT * FROM collections WHERE data->>'owner' = $1`, [username]);

        res.json({
            users: userRes.rows.map(mapRow),
            collections: colsRes.rows.map(mapRow)
        });
    } catch(e) {
        console.error('[Sync] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// GENERIC CRUD ROUTES
const createCrudRoutes = (table) => {
    // GET ONE
    app.get(`/api/${table}/:id`, async (req, res) => {
        try {
            const result = await query(`SELECT * FROM "${table}" WHERE id = $1`, [req.params.id]);
            if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
            res.json(mapRow(result.rows[0]));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // CREATE / UPDATE
    app.post(`/api/${table}`, async (req, res) => {
        try {
            const { id } = req.body;
            // Пытаемся извлечь основные поля для записи в отдельные колонки, если они существуют в схеме
            // Для упрощения пишем всё в data, а триггеры БД или логика выше должны разруливать
            // Но лучше явно передать в колонки если они есть.
            
            // Простейший UPSERT для PostgreSQL:
            // Предполагаем, что таблица имеет колонки id и data как минимум.
            // Если у вас таблица со строгой схемой, этот generic метод нужно адаптировать.
            // Для гибкости: мы обновляем колонку `data` целиком JSON-ом.
            
            const recordId = id || req.body.id;
            if (!recordId) return res.status(400).json({ error: "ID required" });

            // UPSERT: все данные хранятся в JSONB колонке 'data'
            await query(`
                INSERT INTO "${table}" (id, data, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    data = $2,
                    updated_at = NOW()
            `, [recordId, req.body]);

            res.json({ success: true });
        } catch (e) { 
            console.error(`Save ${table} error:`, e.message);
            res.status(500).json({ success: false, error: e.message }); 
        }
    });

    // DELETE
    app.delete(`/api/${table}/:id`, async (req, res) => {
        try {
            await query(`DELETE FROM "${table}" WHERE id = $1`, [req.params.id]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    });
};

['exhibits', 'collections', 'notifications', 'messages', 'guestbook', 'wishlist'].forEach(t => createCrudRoutes(t));

// Fallback for notifications specific query
app.get('/api/notifications', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });
    try {
        // Ищем в JSON поле recipient
        const result = await query(`SELECT * FROM notifications WHERE data->>'recipient' = $1`, [username]);
        res.json(result.rows.map(mapRow));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// STATIC FILES & SPA FALLBACK
// ==========================================

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    const filePath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(200).send(`
            <style>body{background:#000;color:#0f0;font-family:monospace;padding:2rem;}</style>
            <h1>NeoArchive Server Online</h1>
            <p>API is active. Frontend build not found in /dist.</p>
            <p>Status: OK</p>
        `);
    }
});

// Тест SMTP соединения
const testSmtpConnection = async () => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('⚠️  [SMTP] Credentials not configured');
        return false;
    }
    try {
        await transporter.verify();
        console.log('✅ [SMTP] Connection verified');
        return true;
    } catch (err) {
        console.error('❌ [SMTP] Connection failed:', err.message);
        return false;
    }
};

// Запуск сервера с проверками
const startServer = async () => {
    console.log('\n═══════════════════════════════════════');
    console.log('        🚀 NEOARCHIVE SERVER           ');
    console.log('═══════════════════════════════════════\n');

    // Тест подключения к БД
    const dbOk = await testDatabaseConnection();
    if (!dbOk) {
        console.error('\n⚠️  Сервер запущен, но БД недоступна!');
        console.error('   Проверьте настройки в файле .env\n');
    }

    // Тест SMTP
    await testSmtpConnection();

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n✅ Server running on port ${PORT}`);
        console.log(`➜  Health: http://localhost:${PORT}/api/health`);
        console.log(`➜  API:    http://localhost:${PORT}/api/feed\n`);
    });
};

startServer();