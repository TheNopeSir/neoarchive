import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import os from 'os';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from root
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log("📄 [Server] Found .env file at:", envPath);
    dotenv.config({ path: envPath });
} else {
    console.warn("⚠️ [Server] .env file not found at:", envPath);
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// --- SUPABASE CONFIGURATION (HTTPS MODE) ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("🔴 [Server] CRITICAL: Missing Supabase URL or Key.");
    console.log("   Debugging Environment Variables:");
    console.log("   > VITE_SUPABASE_URL:", SUPABASE_URL ? "Set (OK)" : "MISSING");
    console.log("   > SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set (OK)" : "MISSING");
    console.log("   > VITE_SUPABASE_ANON_KEY:", process.env.VITE_SUPABASE_ANON_KEY ? "Set (OK)" : "MISSING");
} else {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        console.log("⚡ [Server] Initialized Supabase Client (HTTPS Mode)");
    } catch (err) {
        console.error("🔴 [Server] Failed to initialize Supabase client:", err.message);
    }
}

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: supabase ? 'ok' : 'misconfigured', 
        engine: 'supabase-http', 
        timestamp: new Date() 
    });
});

const ensureDb = (req, res, next) => {
    if (!supabase) {
        return res.status(503).json({ error: "Server misconfigured: Database connection missing" });
    }
    next();
};

// 1. GLOBAL SYNC
app.get('/api/sync', ensureDb, async (req, res) => {
    try {
        const { data: users, error: uErr } = await supabase.from('users').select('data');
        const { data: exhibits, error: eErr } = await supabase.from('exhibits').select('data').order('timestamp', { ascending: false });
        const { data: collections, error: cErr } = await supabase.from('collections').select('data').order('timestamp', { ascending: false });
        const { data: notifs, error: nErr } = await supabase.from('notifications').select('data').order('timestamp', { ascending: false });
        const { data: msgs, error: mErr } = await supabase.from('messages').select('data').order('timestamp', { ascending: true });
        const { data: gb, error: gErr } = await supabase.from('guestbook').select('data').order('timestamp', { ascending: false });

        if (uErr || eErr || cErr || nErr || mErr || gErr) {
            const err = uErr || eErr || cErr || nErr || mErr || gErr;
            throw new Error("Supabase Fetch Error: " + err.message);
        }
        
        res.json({
            users: users ? users.map(r => r.data) : [],
            exhibits: exhibits ? exhibits.map(r => r.data) : [],
            collections: collections ? collections.map(r => r.data) : [],
            notifications: notifs ? notifs.map(r => r.data) : [],
            messages: msgs ? msgs.map(r => r.data) : [],
            guestbook: gb ? gb.map(r => r.data) : [],
        });
    } catch (e) {
        console.error("Sync Error:", e.message);
        res.status(503).json({ error: "Database Unavailable", details: e.message });
    }
});

// 2. USER PROFILE SYNC
app.post('/api/users/update', ensureDb, async (req, res) => {
    try {
        const { error } = await supabase
            .from('users')
            .upsert({ username: req.body.username, data: req.body }, { onConflict: 'username' });

        if (error) throw error;
        res.json({ success: true });
    } catch (e) { 
        console.error("User Update Error:", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

// 3. CRUD OPERATIONS GENERATOR
const createCrudRoutes = (resourceName) => {
    app.post(`/api/${resourceName}`, ensureDb, async (req, res) => {
        try {
            const payload = {
                id: req.body.id,
                data: req.body,
                timestamp: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from(resourceName)
                .upsert(payload, { onConflict: 'id' });

            if (error) throw error;
            res.json({ success: true });
        } catch (e) { 
            console.error(`${resourceName} Update Error:`, e.message);
            res.status(500).json({ error: e.message }); 
        }
    });

    app.delete(`/api/${resourceName}/:id`, ensureDb, async (req, res) => {
        try {
            const { error } = await supabase
                .from(resourceName)
                .delete()
                .eq('id', req.params.id);

            if (error) throw error;
            res.json({ success: true });
        } catch (e) { 
            res.status(500).json({ error: e.message }); 
        }
    });
};

createCrudRoutes('exhibits');
createCrudRoutes('collections');
createCrudRoutes('notifications');
createCrudRoutes('messages');
createCrudRoutes('guestbook');

// Handle 404 for API routes specifically
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
    console.log(`\n🚀 NeoArchive Server running!`);
    console.log(`   > Backend Mode: Supabase HTTPS`);
    console.log(`   > Status: ${supabase ? 'CONNECTED' : 'OFFLINE (MISSING KEYS)'}`);
    console.log(`   > Local:   http://localhost:${PORT}`);
    console.log(`   > Network: http://${ip}:${PORT}`);
});
