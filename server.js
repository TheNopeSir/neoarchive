import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');
const DIST_DIR = path.join(__dirname, 'dist');

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
        tagline: "Подключен к сети.",
        avatarUrl: "https://picsum.photos/100/100?grayscale",
        joinedDate: "31.12.1999",
        following: [],
        password: "123",
        isAdmin: false
      },
      {
        username: "truester",
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
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB_STATE, null, 2));
  }
} catch (err) {
  console.error("🔴 Fatal Error: Could not initialize database.", err);
}

// Helpers
const getDb = () => {
  try {
    if (!fs.existsSync(DB_FILE)) return INITIAL_DB_STATE;
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
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

const startServer = (port) => {
    // Check dist folder
    if (!fs.existsSync(DIST_DIR) || !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
        console.warn("⚠️  WARNING: 'dist' folder not found. Please run 'npm run build' to generate frontend assets.");
    } else {
        console.log("📂  Frontend assets found in ./dist");
    }

    const server = http.createServer(async (req, res) => {
        // Headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const getBody = async () => {
            return new Promise((resolve) => {
                let body = '';
                req.on('data', chunk => body += chunk.toString());
                req.on('end', () => resolve(body ? JSON.parse(body) : {}));
                req.on('error', () => resolve({}));
            });
        };

        try {
            // Robust URL parsing
            const host = req.headers.host || 'localhost';
            const parsedUrl = new URL(req.url, `http://${host}`);
            const pathname = parsedUrl.pathname;

            // --- API ROUTES ---
            if (pathname.startsWith('/api')) {
                // Mock Auth
                if (pathname === '/api/auth/google') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: "Google Auth Link Established (Simulation Mode)", mockToken: "g_token_" + Date.now() }));
                    return;
                }

                // Get DB
                if (pathname === '/api/db' && req.method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(getDb()));
                    return;
                }

                // Sync
                if (pathname === '/api/sync' && req.method === 'POST') {
                    const { key, data } = await getBody();
                    if (key && data) {
                        const db = getDb();
                        db[key] = data;
                        saveDb(db);
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                    return;
                }

                // Reset
                if (pathname === '/api/reset' && req.method === 'POST') {
                    saveDb(INITIAL_DB_STATE);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                    return;
                }

                // API 404
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'API Endpoint Not Found' }));
                return;
            }

            // --- STATIC FILE SERVING ---
            let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
            const ext = path.extname(filePath);

            fs.readFile(filePath, (err, content) => {
                if (!err) {
                    const mime = MIMES[ext] || 'application/octet-stream';
                    res.writeHead(200, { 'Content-Type': mime });
                    res.end(content);
                } else {
                    // SPA Fallback: If file not found and request has no extension (navigation route), serve index.html
                    // If request has extension (e.g. main.js), it is a missing asset, return 404.
                    if (err.code === 'ENOENT' && !ext) {
                        fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, content2) => {
                            if (!err2) {
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(content2);
                            } else {
                                res.writeHead(500, { 'Content-Type': 'text/plain' });
                                res.end('Server Error: Frontend build missing. Run "npm run build".');
                            }
                        });
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 Not Found');
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