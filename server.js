import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');
const DIST_DIR = path.join(__dirname, 'dist');

// --- EMAIL CONFIGURATION ---
const EMAIL_CONFIG = {
    host: 'smtp.timeweb.ru',
    port: 465,
    secure: true,
    auth: {
        user: 'morpheus@neoarch.ru',
        // Escaping backslash: The password is +VWY6Mp8F\0DUg (Literal backslash + 0)
        pass: '+VWY6Mp8F\\0DUg'
    }
};

const transporter = nodemailer.createTransport(EMAIL_CONFIG);

// Verify SMTP connection on startup
transporter.verify(function (error, success) {
    if (error) {
        console.error('🔴 [SMTP] Connection Error:', error);
    } else {
        console.log('✅ [SMTP] Server is ready to take our messages');
    }
});

console.log(`🚀 [System] Initializing server...`);

// MIME Types
const MIMES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// Initial DB State
const INITIAL_DB_STATE = {
  exhibits: [],
  collections: [],
  notifications: [],
  messages: [],
  guestbook: [],
  users: [
      {
        username: "Neo_User_01",
        email: "neo@matrix.com",
        tagline: "Подключен к сети.",
        avatarUrl: "https://picsum.photos/100/100?grayscale",
        joinedDate: "31.12.1999",
        following: [],
        password: "123",
        isAdmin: false
      },
      {
        username: "truester",
        email: "admin@neoarchive.net",
        tagline: "Admin Construct",
        avatarUrl: "https://ui-avatars.com/api/?name=Admin&background=000&color=fff",
        joinedDate: "01.01.1999",
        following: [],
        password: "trinityisall1",
        isAdmin: true
      }
  ]
};

// Ensure Data Directory Exists
try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log(`✅ [Database] Created data directory at ${DB_DIR}`);
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB_STATE, null, 2));
    console.log(`✅ [Database] Created initial database at ${DB_FILE}`);
  } else {
    console.log(`✅ [Database] Loaded existing database from ${DB_FILE}`);
  }
} catch (err) {
  console.error("🔴 Fatal Error: Could not initialize database.", err);
}

// Helpers
const getDb = () => {
  try {
    if (!fs.existsSync(DB_FILE)) return INITIAL_DB_STATE;
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return data ? JSON.parse(data) : INITIAL_DB_STATE;
  } catch (e) {
    console.error("Error reading DB:", e);
    return INITIAL_DB_STATE;
  }
};

const saveDb = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error saving DB:", e);
  }
};

const sendEmail = async (to, subject, text, html) => {
    try {
        await transporter.sendMail({
            from: `"NeoArchive System" <${EMAIL_CONFIG.auth.user}>`,
            to,
            subject,
            text,
            html
        });
        console.log(`✅ [SMTP] Email sent to ${to}`);
        return true;
    } catch (error) {
        console.error("🔴 [SMTP] Failed to send email:", error);
        return false;
    }
};

const startServer = (port) => {
    // Check dist folder
    if (!fs.existsSync(DIST_DIR) || !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
        console.warn("⚠️  WARNING: 'dist' folder not found. Please run 'npm run build' to generate frontend assets.");
    }

    const server = http.createServer(async (req, res) => {
        // Log Request
        console.log(`📥 [${req.method}] ${req.url}`);

        // CORS Headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Handle Preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const getBody = async () => {
            return new Promise((resolve) => {
                let body = '';
                req.on('data', chunk => body += chunk.toString());
                req.on('end', () => {
                    try {
                        resolve(body ? JSON.parse(body) : {});
                    } catch (e) {
                        console.error("❌ Invalid JSON body");
                        resolve({});
                    }
                });
                req.on('error', () => resolve({}));
            });
        };

        try {
            const host = req.headers.host || 'localhost';
            const parsedUrl = new URL(req.url, `http://${host}`);
            
            // Normalize path: remove trailing slash if present (and not root)
            let pathname = parsedUrl.pathname;
            if (pathname.length > 1 && pathname.endsWith('/')) {
                pathname = pathname.slice(0, -1);
            }

            // --- API ROUTES ---
            if (pathname.startsWith('/api')) {
                res.setHeader('Content-Type', 'application/json');
                
                // 1. Send Verification Code
                if (pathname === '/api/auth/send-code' && req.method === 'POST') {
                    const { email } = await getBody();
                    
                    if (!email) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: "Email required" }));
                        return;
                    }

                    const code = Math.floor(1000 + Math.random() * 9000).toString();
                    console.log(`📨 [Auth] Sending verification to: ${email}, Code: ${code}`);

                    const emailSent = await sendEmail(
                        email,
                        "NeoArchive: Код подтверждения",
                        `Ваш код доступа: ${code}`,
                        `<div style="font-family: monospace; background: #09090b; color: #4ade80; padding: 20px; border: 1px solid #4ade80;">
                           <h1>NEO_ARCHIVE // VERIFICATION</h1>
                           <p>ACCESS CODE REQUESTED.</p>
                           <h2 style="font-size: 32px; letter-spacing: 5px; color: #fff;">${code}</h2>
                           <p>IGNORE IF NOT REQUESTED.</p>
                         </div>`
                    );

                    if (emailSent) {
                        res.writeHead(200);
                        res.end(JSON.stringify({ 
                            success: true, 
                            message: 'Code sent via Email.',
                            debugCode: code 
                        }));
                    } else {
                        res.writeHead(500);
                        res.end(JSON.stringify({ 
                            success: false, 
                            error: 'Failed to send email. Check server logs.' 
                        }));
                    }
                    return;
                }

                // 2. Register User & Send Credentials
                if (pathname === '/api/auth/register' && req.method === 'POST') {
                    const { username, password, email, tagline } = await getBody();
                    
                    if (!username || !password || !email) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: "Missing fields" }));
                        return;
                    }

                    const db = getDb();
                    
                    if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: "USERNAME TAKEN" }));
                        return;
                    }

                    const newUser = {
                        username,
                        email,
                        tagline: tagline || "Новый пользователь",
                        avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=random`,
                        joinedDate: new Date().toLocaleDateString('ru-RU'),
                        following: [],
                        password, 
                        isAdmin: false
                    };

                    db.users.push(newUser);
                    saveDb(db);

                    console.log(`👤 [Auth] New user registered: ${username}`);

                    await sendEmail(
                        email,
                        "NeoArchive: Учетные данные",
                        `Добро пожаловать в NeoArchive.\n\nЛогин: ${username}\nПароль: ${password}\n\nСохраните эти данные.`,
                        `<div style="font-family: monospace; background: #09090b; color: #4ade80; padding: 20px; border: 1px solid #4ade80;">
                           <h1 style="border-bottom: 1px dashed #4ade80; padding-bottom: 10px;">NEO_ARCHIVE // ACCESS GRANTED</h1>
                           <p>SYSTEM ENTRY CONFIRMED.</p>
                           <div style="margin: 20px 0; padding: 15px; border: 1px solid #27272a; background: #18181b;">
                             <p style="margin: 5px 0;"><strong>USER_ID:</strong> <span style="color: #fff;">${username}</span></p>
                             <p style="margin: 5px 0;"><strong>PASSWORD:</strong> <span style="color: #fff;">${password}</span></p>
                           </div>
                           <p style="opacity: 0.7; font-size: 10px;">DELETE THIS MESSAGE AFTER MEMORIZATION.</p>
                         </div>`
                    );

                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, user: newUser }));
                    return;
                }

                // 3. Get DB
                if (pathname === '/api/db' && req.method === 'GET') {
                    res.writeHead(200);
                    res.end(JSON.stringify(getDb()));
                    return;
                }

                // 4. Data Management
                if (pathname === '/api/data/manage' && req.method === 'POST') {
                    const { action, collection, item, id } = await getBody();
                    const db = getDb();
                    if (!db[collection]) db[collection] = [];

                    if (action === 'create') {
                        ['exhibits', 'notifications'].includes(collection) ? db[collection].unshift(item) : db[collection].push(item);
                    } 
                    else if (action === 'update') {
                        const key = collection === 'users' ? 'username' : 'id';
                        const val = collection === 'users' ? item.username : item.id;
                        const index = db[collection].findIndex(i => i[key] === val);
                        if (index !== -1) db[collection][index] = item;
                    } 
                    else if (action === 'delete') {
                        db[collection] = db[collection].filter(i => i.id !== id);
                    }

                    saveDb(db);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                    return;
                }

                // 5. Sync (Legacy)
                if (pathname === '/api/sync' && req.method === 'POST') {
                    const { key, data } = await getBody();
                    const db = getDb();
                    if (key && data) {
                        db[key] = data;
                        saveDb(db);
                    }
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                    return;
                }

                // 6. Reset
                if (pathname === '/api/reset' && req.method === 'POST') {
                    saveDb(INITIAL_DB_STATE);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                    return;
                }

                console.log(`⚠️ [API] 404 Not Found: ${pathname} (${req.method})`);
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'API Endpoint Not Found' }));
                return;
            }

            // --- STATIC FILE SERVING ---
            let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
            
            if (!filePath.startsWith(DIST_DIR)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            const ext = path.extname(filePath);

            fs.readFile(filePath, (err, content) => {
                if (!err) {
                    const mime = MIMES[ext] || 'application/octet-stream';
                    res.writeHead(200, { 'Content-Type': mime });
                    res.end(content);
                } else {
                    if (err.code === 'ENOENT' && !ext) {
                        fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, content2) => {
                            if (!err2) {
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(content2);
                            } else {
                                res.writeHead(500, { 'Content-Type': 'text/plain' });
                                res.end('Server Error: Build missing. Run "npm run build".');
                            }
                        });
                    } else {
                        res.writeHead(404);
                        res.end('Not Found');
                    }
                }
            });

        } catch (err) {
            console.error("🔴 Request Error:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${port} is busy, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error("🔴 Server Start Error:", e);
        }
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`✅ Server running at http://localhost:${port}`);
    });
};

startServer(PORT);