import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// ⚙️ НАСТРОЙКИ СЕРВЕРА (БЕЗ .ENV)
// ==========================================

// 1. Ссылка на проект (взята из вашего connection string)
const SUPABASE_URL = "https://kovcgjtqbvmuzhsrcktd.supabase.co";

// 2. ВАЖНО: Вставьте сюда ваш SERVICE_ROLE ключ (Settings -> API -> service_role secret)
// Он начинается на "ey..." и он длинный. Не путать с anon key!
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdmNnanRxYnZtdXpoc3Jja3RkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM2MTYyMCwiZXhwIjoyMDgwOTM3NjIwfQ.9dGlbb7TV9SRDnYQULdDMDpZrI4r5XO1FgTCoKqrpf4";

const PORT = 3000;

// ==========================================

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

let supabase = null;
let isOfflineMode = false;

// Initialization
console.log("🚀 [Server] Initializing Direct Connection...");

if (SUPABASE_SERVICE_ROLE_KEY.includes("ВСТАВЬТЕ_СЮДА") || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("\n❌ ОШИБКА: Вы не вставили SERVICE_ROLE ключ в файл server.js!");
    console.error("   Откройте server.js и замените заглушку на реальный ключ из Supabase.\n");
    isOfflineMode = true;
} else {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        console.log("✅ [Server] Supabase Client Configured");
    } catch (err) {
        console.error("⚠️ [Server] Client Creation Error:", err.message);
        isOfflineMode = true;
    }
}

if (isOfflineMode) {
    console.warn("⚠️ [Server] Running in OFFLINE/MOCK MODE. API will return empty data.");
    // Mock Client
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
}

// --- API ROUTES ---

const ensureDb = (req, res, next) => {
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
        res.json({ users: [], exhibits: [], collections: [], notifications: [], messages: [], guestbook: [] });
    }
});

// 2. USER PROFILE SYNC
app.post('/api/users/update', ensureDb, async (req, res) => {
    if (isOfflineMode) return res.json({ success: true });
    try {
        await supabase
            .from('users')
            .upsert({ username: req.body.username, data: req.body }, { onConflict: 'username' });
        res.json({ success: true });
    } catch (e) { 
        console.error("User Update Error:", e.message);
        res.status(200).json({ success: false, error: e.message });
    }
});

// 3. CRUD OPERATIONS
const createCrudRoutes = (resourceName) => {
    app.post(`/api/${resourceName}`, ensureDb, async (req, res) => {
        if (isOfflineMode) return res.json({ success: true });
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
        if (isOfflineMode) return res.json({ success: true });
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

// Handle 404
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
    console.log(`   > URL: ${SUPABASE_URL}`);
    console.log(`   > Key Status: ${isOfflineMode ? '❌ MISSING' : '✅ LOADED'}`);
    console.log(`   > Local:   http://localhost:${PORT}`);
    console.log(`   > Network: http://${ip}:${PORT}`);
});