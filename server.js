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

// Explicitly load .env from root if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log("📄 [Server] Loading .env configuration...");
    dotenv.config({ path: envPath });
} else {
    console.warn("⚠️ [Server] No .env file found. Relying on system environment variables.");
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
let isOfflineMode = false;

// Robust Initialization
try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || SUPABASE_URL === 'undefined') {
        throw new Error("Credentials missing or invalid");
    }
    
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    console.log("⚡ [Server] Supabase Client Connected via HTTPS");

} catch (err) {
    console.warn(`⚠️ [Server] Failed to connect to Supabase: ${err.message}`);
    console.warn("⚠️ [Server] Starting in OFFLINE/MOCK MODE. API endpoints will return empty data.");
    
    isOfflineMode = true;
    
    // Mock Client to prevent crashes in API routes
    const mockDb = {
        select: () => ({ order: () => ({ data: [], error: null }), data: [], error: null }),
        insert: () => ({ select: () => ({ single: () => ({ data: {}, error: null }) }), error: null }),
        upsert: () => ({ select: () => ({ single: () => ({ data: {}, error: null }) }), error: null }),
        delete: () => ({ eq: () => ({ error: null }) }),
        update: () => ({ eq: () => ({ error: null }) }),
    };

    supabase = {
        from: () => mockDb,
        auth: {
            admin: {
                createUser: () => ({ data: null, error: { message: "Offline Mode" } }),
            }
        }
    };
    
    console.log("   > VITE_SUPABASE_URL:", SUPABASE_URL ? "Set" : "MISSING");
    console.log("   > SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "MISSING");
}

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: isOfflineMode ? 'offline' : 'online', 
        engine: 'supabase-http', 
        timestamp: new Date() 
    });
});

const ensureDb = (req, res, next) => {
    // In offline mode, we allow requests to pass but they will likely return empty data from the mock
    // This prevents the frontend from receiving 503s and crashing
    next();
};

// 1. GLOBAL SYNC
app.get('/api/sync', ensureDb, async (req, res) => {
    try {
        if (isOfflineMode) {
            return res.json({ users: [], exhibits: [], collections: [], notifications: [], messages: [], guestbook: [] });
        }

        const { data: users } = await supabase.from('users').select('data');
        const { data: exhibits } = await supabase.from('exhibits').select('data').order('timestamp', { ascending: false });
        const { data: collections } = await supabase.from('collections').select('data').order('timestamp', { ascending: false });
        const { data: notifs } = await supabase.from('notifications').select('data').order('timestamp', { ascending: false });
        const { data: msgs } = await supabase.from('messages').select('data').order('timestamp', { ascending: true });
        const { data: gb } = await supabase.from('guestbook').select('data').order('timestamp', { ascending: false });
        
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
        // Return empty structure instead of error to keep app alive
        res.json({ users: [], exhibits: [], collections: [], notifications: [], messages: [], guestbook: [] });
    }
});

// 2. USER PROFILE SYNC
app.post('/api/users/update', ensureDb, async (req, res) => {
    if (isOfflineMode) return res.json({ success: true, warning: "Offline Mode" });
    try {
        await supabase
            .from('users')
            .upsert({ username: req.body.username, data: req.body }, { onConflict: 'username' });
        res.json({ success: true });
    } catch (e) { 
        console.error("User Update Error:", e.message);
        res.status(200).json({ success: false, error: e.message }); // Return 200 to prevent frontend errors
    }
});

// 3. CRUD OPERATIONS GENERATOR
const createCrudRoutes = (resourceName) => {
    app.post(`/api/${resourceName}`, ensureDb, async (req, res) => {
        if (isOfflineMode) return res.json({ success: true, warning: "Offline Mode" });
        try {
            const payload = {
                id: req.body.id,
                data: req.body,
                timestamp: new Date().toISOString()
            };
            
            await supabase
                .from(resourceName)
                .upsert(payload, { onConflict: 'id' });

            res.json({ success: true });
        } catch (e) { 
            console.error(`${resourceName} Update Error:`, e.message);
            res.status(200).json({ success: false, error: e.message }); 
        }
    });

    app.delete(`/api/${resourceName}/:id`, ensureDb, async (req, res) => {
        if (isOfflineMode) return res.json({ success: true, warning: "Offline Mode" });
        try {
            await supabase
                .from(resourceName)
                .delete()
                .eq('id', req.params.id);

            res.json({ success: true });
        } catch (e) { 
             res.status(200).json({ success: false, error: e.message }); 
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
    console.log(`   > Mode: ${isOfflineMode ? 'OFFLINE (No DB Connection)' : 'ONLINE (Connected)'}`);
    console.log(`   > Local:   http://localhost:${PORT}`);
    console.log(`   > Network: http://${ip}:${PORT}`);
});