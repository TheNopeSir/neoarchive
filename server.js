
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0'; 
const DIST_DIR = path.join(__dirname, 'dist');

console.log(`🚀 [System] Initializing Static Server on PORT ${PORT}...`);

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

const startServer = (port) => {
    if (!fs.existsSync(DIST_DIR)) {
        console.warn("⚠️  WARNING: 'dist' folder not found. Running in API-only mode or waiting for build.");
    }

    const server = http.createServer(async (req, res) => {
        // CORS Headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        try {
            const host = req.headers.host || 'localhost';
            const parsedUrl = new URL(req.url, `http://${host}`);
            
            let pathname = parsedUrl.pathname;
            if (pathname.length > 1 && pathname.endsWith('/')) {
                pathname = pathname.slice(0, -1);
            }

            // Suppress 404s for common assets
            if (pathname === '/favicon.ico' || pathname.endsWith('.map')) {
                res.writeHead(204);
                res.end();
                return;
            }

            // --- STATIC FILES SERVING ---
            let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
            
            // Security check
            if (!filePath.startsWith(DIST_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }

            const ext = path.extname(filePath);
            const mime = MIMES[ext] || 'application/octet-stream';

            fs.readFile(filePath, (err, content) => {
                if (!err) {
                    res.writeHead(200, { 'Content-Type': mime });
                    res.end(content);
                } else {
                    // SPA Fallback: Serve index.html for non-asset routes
                    if (pathname === '/' || !ext) {
                        fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, content2) => {
                            if (!err2) {
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(content2);
                            } else {
                                res.writeHead(404);
                                res.end('Frontend build not found. Run "npm run build".');
                            }
                        });
                    } else {
                        // Return empty 200 for missing CSS/Images to prevent console noise
                        if (pathname.endsWith('.css') || pathname.endsWith('.png') || pathname.endsWith('.jpg')) {
                             res.writeHead(200);
                             res.end('');
                             return;
                        }
                        res.writeHead(404);
                        res.end('Not Found');
                    }
                }
            });

        } catch (err) {
            console.error("🔴 Server Error:", err);
            res.writeHead(500);
            res.end("Internal Server Error");
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

    server.listen(port, HOST, () => {
        console.log(`✅ Server running on http://${HOST}:${port}`);
    });
};

startServer(PORT);
