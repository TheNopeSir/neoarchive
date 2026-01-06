
import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry, WishlistItem, Guild, Duel, TradeRequest, TradeRequestStatus, TradeType, NotificationType } from '../types';

// INTERNAL IN-MEMORY CACHE
let cache = {
    exhibits: [] as Exhibit[],
    collections: [] as Collection[],
    notifications: [] as Notification[],
    messages: [] as Message[],
    users: [] as UserProfile[],
    guestbook: [] as GuestbookEntry[],
    wishlist: [] as WishlistItem[],
    guilds: [] as Guild[],
    duels: [] as Duel[],
    tradeRequests: [] as TradeRequest[],
    lastSync: 0
};

const CACHE_STORAGE_KEY = 'neo_archive_db_cache_v2'; 
const SESSION_USER_KEY = 'neo_active_user';
const API_BASE = '/api'; 

// --- OBSERVER PATTERN ---
type ChangeListener = () => void;
const listeners: ChangeListener[] = [];

type ToastListener = (n: Notification) => void;
const toastListeners: ToastListener[] = [];

export const subscribeToToasts = (listener: ToastListener) => {
    toastListeners.push(listener);
    return () => {
        const index = toastListeners.indexOf(listener);
        if (index > -1) toastListeners.splice(index, 1);
    };
};

export const subscribe = (listener: ChangeListener) => {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
    };
};

const notifyListeners = () => listeners.forEach(l => l());

// --- PERSISTENCE HELPERS ---
const saveCacheToLocal = () => {
    try {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
    } catch (e) { console.error("Cache save failed", e); }
};

const loadCacheFromLocal = () => {
    try {
        const stored = localStorage.getItem(CACHE_STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            cache = { ...cache, ...data };
            notifyListeners(); 
        }
    } catch (e) { console.error("Cache load failed", e); }
};

// --- API HELPER ---
const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
        const headers: any = { 'Content-Type': 'application/json' };
        const options: RequestInit = { method, headers };
        if (body) options.body = JSON.stringify(body);
        
        const fullPath = `${API_BASE}${endpoint}`;
        const res = await fetch(fullPath, options);
        
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API Error ${res.status}: ${errText.slice(0, 100)}`);
        }
        return await res.json();
    } catch (e) {
        // Explicitly cast error to any to avoid TS unknown error
        const message = (e as any).message || String(e);
        console.error(`❌ API Call Failed [${endpoint}]:`, message);
        throw e;
    }
};

export const isOffline = () => !navigator.onLine;

export const getUserAvatar = (username: string): string => {
    if (!username) return 'https://ui-avatars.com/api/?name=NA&background=000&color=fff';
    const u = cache.users.find(u => u.username === username);
    if (u?.avatarUrl) return u.avatarUrl;
    return `https://ui-avatars.com/api/?name=${username}&background=random&color=fff&bold=true`;
};

<<<<<<< Updated upstream
// --- CORE FUNCTIONS ---
=======
const slugify = (text: string): string => {
    if (!text) return 'untitled';
    return String(text).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/-+$/, '');
};

const saveToLocalCache = async () => {
    try {
        await idb.put(CACHE_KEY, { version: CACHE_VERSION, data: cache });
    } catch (e) { console.error("Cache Save Error", e); }
};

const loadFromCache = async (): Promise<boolean> => {
    try {
        const stored: any = await idb.get(CACHE_KEY);
        if (stored && (stored.version === CACHE_VERSION || stored.data)) {
            const data = stored.data || stored;
            
            data.exhibits = Array.isArray(data.exhibits) ? data.exhibits : [];
            data.collections = Array.isArray(data.collections) ? data.collections : [];
            data.notifications = Array.isArray(data.notifications) ? data.notifications : [];
            data.messages = Array.isArray(data.messages) ? data.messages : [];
            data.users = Array.isArray(data.users) ? data.users : [];
            data.guestbook = Array.isArray(data.guestbook) ? data.guestbook : [];
            data.wishlist = Array.isArray(data.wishlist) ? data.wishlist : [];
            data.tradeRequests = Array.isArray(data.tradeRequests) ? data.tradeRequests : [];
            data.guilds = Array.isArray(data.guilds) ? data.guilds : [{ id: 'g1', name: 'Retro Keepers', description: 'Хранители старого железа', leader: 'SysAdmin', members: ['SysAdmin'], isPrivate: false, inviteCode: 'retro123' }];
            data.duels = Array.isArray(data.duels) ? data.duels : [];
            
            cache = { ...cache, ...data, isLoaded: true };
            return true;
        }
    } catch (e) { return false; }
    return false;
};

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error("Timeout")), 60000);
    
    try {
        const options: RequestInit = { 
            method, 
            headers: { 'Content-Type': 'application/json' }, 
            signal: controller.signal 
        };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            let errorMsg = `API Error ${res.status}`;
            try {
                const json = await res.json();
                if (json.error) errorMsg = json.error;
            } catch (e) { }
            throw new Error(errorMsg);
        }
        return await res.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError' || error.message === 'Timeout') {
            throw new Error("Сервер долго не отвечает. Попробуйте позже (Timeout).");
        }
        throw error;
    }
};

const checkSuperAdmin = (user: UserProfile) => {
    if (user.email && user.email.toLowerCase().trim() === 'kennyornope@gmail.com') {
        user.isAdmin = true;
    }
};

export const loadFeedBatch = async (page: number, limit: number = 10): Promise<Exhibit[]> => {
    try {
        const items: Exhibit[] = await apiCall(`/feed?page=${page}&limit=${limit}`);
        if (Array.isArray(items) && items.length > 0) {
            const currentIds = new Set(cache.exhibits.map(e => e.id));
            const newItems = items.filter(item => !currentIds.has(item.id));
            cache.exhibits = [...cache.exhibits, ...newItems].sort((a,b) => {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
            await saveToLocalCache();
            notifyListeners(); 
            return items;
        }
        return [];
    } catch (e) {
        console.warn("Feed Load Error, using local only", e);
        const start = (page - 1) * limit;
        const end = start + limit;
        if (cache.exhibits.length >= start) {
            return cache.exhibits.slice(start, end);
        }
        return [];
    }
};

export const fetchExhibitById = async (id: string): Promise<Exhibit | null> => {
    const cached = cache.exhibits.find(e => e.id === id);
    if (cached) return cached;
    try {
        const item: Exhibit = await apiCall(`/exhibits/${id}`);
        if (item) {
            cache.exhibits.unshift(item); 
            await saveToLocalCache();
            return item;
        }
    } catch(e) { console.warn("Fetch exhibit failed:", e); }
    return null;
};

export const fetchCollectionById = async (id: string): Promise<Collection | null> => {
    const cached = cache.collections.find(c => c.id === id);
    if (cached) return cached;
    try {
        const item: Collection = await apiCall(`/collections/${id}`);
        if (item) {
            cache.collections.unshift(item);
            await saveToLocalCache();
            return item;
        }
    } catch(e) { console.warn("Fetch collection failed:", e); }
    return null;
};

export const startLiveUpdates = () => {
    if (liveUpdateInterval) return; 

    console.log("📡 [System] Starting live feed updates...");
    
    liveUpdateInterval = setInterval(async () => {
        try {
            const latestItems: Exhibit[] = await apiCall(`/feed?page=1&limit=10`);
            let hasUpdates = false;
            
            if (latestItems && latestItems.length > 0) {
                const currentIds = new Set(cache.exhibits.map(e => e.id));
                const newItems = latestItems.filter(item => !currentIds.has(item.id));

                if (newItems.length > 0) {
                    console.log(`✨ [LiveSync] Incoming: ${newItems.length} new artifacts`);
                    cache.exhibits = [...newItems, ...cache.exhibits].sort((a,b) => 
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    );
                    hasUpdates = true;
                }
            }

            const activeUser = localStorage.getItem(SESSION_USER_KEY);
            if (activeUser) {
                try {
                    const notifs: Notification[] = await apiCall(`/notifications?username=${activeUser}`);
                    if (notifs && notifs.length > 0) {
                        const currentNotifIds = new Set(cache.notifications.map(n => n.id));
                        const newNotifs = notifs.filter(n => !currentNotifIds.has(n.id));
                        if (newNotifs.length > 0) {
                            console.log(`🔔 [LiveSync] Incoming: ${newNotifs.length} new notifications`);
                            cache.notifications = [...newNotifs, ...cache.notifications].sort((a,b) => 
                                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                            );
                            hasUpdates = true;
                        }
                    }
                } catch(e) { }
            }

            if (hasUpdates) {
                await saveToLocalCache();
                notifyListeners(); 
            }
            isOfflineMode = false;

        } catch (e) {
            console.warn("[LiveSync] Pulse skipped (Network issue?)");
        }
    }, 20000); // PERFORMANCE: Increased from 8s to 20s to reduce server load 
};

export const stopLiveUpdates = () => {
    if (liveUpdateInterval) {
        clearInterval(liveUpdateInterval);
        liveUpdateInterval = null;
        console.log("🛑 [System] Live updates paused.");
    }
};

const performCloudSync = async () => {
    const activeUser = localStorage.getItem(SESSION_USER_KEY);
    try {
        const initData = await apiCall(activeUser ? `/sync?username=${activeUser}&priority=high` : '/sync?priority=high');
        
        let hasUpdates = false;

        if (Array.isArray(initData.users)) {
            cache.users = initData.users;
            cache.users.forEach(u => checkSuperAdmin(u));
            hasUpdates = true;
        }
        if (Array.isArray(initData.notifications)) {
            cache.notifications = initData.notifications;
            hasUpdates = true;
        }
        if (Array.isArray(initData.messages)) {
            const msgMap = new Map(cache.messages.map(m => [m.id, m]));
            (initData.messages as Message[]).forEach(m => msgMap.set(m.id, m));
            cache.messages = Array.from(msgMap.values()).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
            hasUpdates = true;
        }
        
        if (Array.isArray(initData.exhibits)) {
            const serverMap = new Map((initData.exhibits as Exhibit[]).map(e => [e.id, e]));
            cache.exhibits.forEach(e => { if(!serverMap.has(e.id) && !cache.deletedIds.includes(e.id)) serverMap.set(e.id, e); });
            cache.deletedIds.forEach(id => { if(serverMap.has(id)) serverMap.delete(id); });
            cache.exhibits = Array.from(serverMap.values()).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            hasUpdates = true;
        }

        if (Array.isArray(initData.collections)) {
             const colServerMap = new Map((initData.collections as Collection[]).map(c => [c.id, c]));
             cache.collections.forEach(c => { if(!colServerMap.has(c.id) && !cache.deletedIds.includes(c.id)) colServerMap.set(c.id, c); });
             cache.deletedIds.forEach(id => { if(colServerMap.has(id)) colServerMap.delete(id); });
             cache.collections = Array.from(colServerMap.values());
             hasUpdates = true;
        }

        if (Array.isArray(initData.wishlist)) {
            const wlMap = new Map((initData.wishlist as WishlistItem[]).map(w => [w.id, w]));
            cache.wishlist.forEach(w => { if (!wlMap.has(w.id) && !cache.deletedIds.includes(w.id)) wlMap.set(w.id, w); });
            cache.deletedIds.forEach(id => { if(wlMap.has(id)) wlMap.delete(id); });
            cache.wishlist = Array.from(wlMap.values());
            hasUpdates = true;
        }

        if (Array.isArray(initData.guestbook)) { cache.guestbook = initData.guestbook; hasUpdates = true; }
        if (Array.isArray(initData.tradeRequests)) { cache.tradeRequests = initData.tradeRequests; hasUpdates = true; }

        if (hasUpdates) {
            await saveToLocalCache();
            notifyListeners(); 
        }
        isOfflineMode = false;
    } catch (e) {
        console.warn("Sync slow or failed, trying to stay active for retries.");
    }
};
>>>>>>> Stashed changes

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    // 1. FAST LOAD
    loadCacheFromLocal();
    
    const activeUser = localStorage.getItem(SESSION_USER_KEY);
    
    // 2. BACKGROUND SYNC
    try {
        // Health Check
        try { await apiCall('/health'); } catch(e) { console.warn("Backend offline or proxy error"); }

        // Fetch global feed
        const feed = await apiCall('/feed');
        if (Array.isArray(feed)) {
            // Merge with local drafts if any
            const drafts = cache.exhibits.filter(e => e.isDraft);
            const serverItems = feed.filter(e => !drafts.find(d => d.id === e.id));
            cache.exhibits = [...drafts, ...serverItems];
            console.log(`[SYNC] Loaded ${feed.length} exhibits from server.`);
        }

        // Fetch User Data if logged in
        if (activeUser) {
            const syncData = await apiCall(`/sync?username=${activeUser}`);
            if (syncData.users && syncData.users.length > 0) {
                const freshUser = syncData.users[0];
                const idx = cache.users.findIndex(u => u.username === freshUser.username);
                if (idx !== -1) cache.users[idx] = freshUser;
                else cache.users.push(freshUser);
                
                cache.collections = syncData.collections || [];
                
                try {
                    const notifs = await apiCall(`/notifications?username=${activeUser}`);
                    if (Array.isArray(notifs)) cache.notifications = notifs;
                } catch(e) {}

                saveCacheToLocal();
                notifyListeners();
                return freshUser;
            }
        }
    } catch (e) {
        console.warn("Background sync failed - showing cached data", e);
    }
    
    saveCacheToLocal();
    notifyListeners();
    return cache.users.find(u => u.username === activeUser) || null;
};

<<<<<<< Updated upstream
// AUTH
export const loginUser = async (identifier: string, password: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/login', 'POST', { identifier, password });
    localStorage.setItem(SESSION_USER_KEY, user.username);
    
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    else cache.users.push(user);
    
    saveCacheToLocal();
    notifyListeners();
    return user;
=======
export const forceSync = performCloudSync;
// PERFORMANCE: Return cache directly instead of shallow copy
// This is safe because external code only reads, never mutates directly
export const getFullDatabase = () => cache;

const checkAndAddHelloAchievement = async (user: UserProfile) => {
    if (!user.achievements) user.achievements = [];
    const hasHello = user.achievements.some(a => a.id === 'HELLO_WORLD');
    if (!hasHello) {
        user.achievements.push({ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true });
        await apiCall('/users/update', 'POST', user);
    }
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
    const res = await apiCall('/auth/login', 'POST', { email, password });
    if (res.success && res.user) {
        checkSuperAdmin(res.user);
        await checkAndAddHelloAchievement(res.user);
        localStorage.setItem(SESSION_USER_KEY, res.user.username);
        const idx = cache.users.findIndex(u => u.username === res.user.username);
        if (idx !== -1) cache.users[idx] = res.user; else cache.users.push(res.user);
        await saveToLocalCache();
        notifyListeners();
        return res.user;
    }
    throw new Error(res.error || "Login failed");
};

export const recoverPassword = async (email: string): Promise<any> => {
    const res = await apiCall('/auth/recover', 'POST', { email });
    if (res.success) return res;
    throw new Error(res.error || "Recovery failed");
};

export const loginViaTelegram = async (user: any): Promise<UserProfile> => {
    const res = await apiCall('/auth/telegram', 'POST', user);
    if (res.success && res.user) {
        checkSuperAdmin(res.user);
        await checkAndAddHelloAchievement(res.user);
        localStorage.setItem(SESSION_USER_KEY, res.user.username);
        const idx = cache.users.findIndex(u => u.username === res.user.username);
        if (idx !== -1) cache.users[idx] = res.user; else cache.users.push(res.user);
        await saveToLocalCache();
        notifyListeners();
        return res.user;
    }
    throw new Error(res.error || "Telegram login failed");
>>>>>>> Stashed changes
};

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/register', 'POST', { username, password, tagline, email });
    localStorage.setItem(SESSION_USER_KEY, user.username);
    cache.users.push(user);
    saveCacheToLocal();
    notifyListeners();
    return user;
};

export const logoutUser = async () => { 
    localStorage.removeItem(SESSION_USER_KEY); 
    notifyListeners(); 
    window.location.reload();
};

export const loginViaTelegram = async (tgUser: any) => { 
    const user = await apiCall('/auth/telegram', 'POST', tgUser);
    localStorage.setItem(SESSION_USER_KEY, user.username);
    cache.users.push(user);
    saveCacheToLocal();
    notifyListeners();
    return user;
};

export const recoverPassword = async (email: string) => { 
    return await apiCall('/auth/recover', 'POST', { email }); 
};

// DATA OPERATIONS
export const getFullDatabase = () => ({ ...cache });

export const saveExhibit = async (e: Exhibit) => { 
    cache.exhibits.unshift(e); 
    notifyListeners();
    await apiCall('/exhibits', 'POST', e);
    saveCacheToLocal();
};

export const updateExhibit = async (e: Exhibit) => { 
    const idx = cache.exhibits.findIndex(x => x.id === e.id);
    if (idx !== -1) {
        cache.exhibits[idx] = e;
        notifyListeners();
    }
    await apiCall('/exhibits', 'POST', e);
    saveCacheToLocal();
};

export const deleteExhibit = async (id: string) => { 
    cache.exhibits = cache.exhibits.filter(e => e.id !== id); 
    notifyListeners();
    await apiCall(`/exhibits/${id}`, 'DELETE');
    saveCacheToLocal();
};

export const saveCollection = async (c: Collection) => {
    cache.collections.push(c);
    notifyListeners();
    await apiCall('/collections', 'POST', c);
    saveCacheToLocal();
};

export const updateCollection = async (c: Collection) => {
    cache.collections = cache.collections.map(col => col.id === c.id ? c : col);
    notifyListeners();
    await apiCall('/collections', 'POST', c);
    saveCacheToLocal();
};

export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    notifyListeners();
    await apiCall(`/collections/${id}`, 'DELETE');
    saveCacheToLocal();
};

export const saveWishlistItem = async (w: WishlistItem) => {
    cache.wishlist.push(w);
    notifyListeners();
    await apiCall('/wishlist', 'POST', w);
    saveCacheToLocal();
};

export const deleteWishlistItem = async (id: string) => {
    cache.wishlist = cache.wishlist.filter(w => w.id !== id);
    notifyListeners();
    await apiCall(`/wishlist/${id}`, 'DELETE');
    saveCacheToLocal();
};

export const saveGuestbookEntry = async (e: GuestbookEntry) => {
    cache.guestbook.push(e);
    notifyListeners();
    await apiCall('/guestbook', 'POST', e);
    saveCacheToLocal();
};

export const updateGuestbookEntry = async (e: GuestbookEntry) => {
    cache.guestbook = cache.guestbook.map(g => g.id === e.id ? e : g);
    notifyListeners();
    await apiCall('/guestbook', 'POST', e);
    saveCacheToLocal();
};

export const deleteGuestbookEntry = async (id: string) => {
    cache.guestbook = cache.guestbook.filter(g => g.id !== id);
    notifyListeners();
    await apiCall(`/guestbook/${id}`, 'DELETE');
    saveCacheToLocal();
};

export const updateUserProfile = async (u: UserProfile) => {
    const idx = cache.users.findIndex(us => us.username === u.username);
    if (idx !== -1) cache.users[idx] = u;
    notifyListeners();
    await apiCall('/users', 'POST', { id: u.username, ...u });
    saveCacheToLocal();
};

export const createNotification = async (r:string, t:NotificationType, a:string, id?:string, p?:string) => {
    const notif: Notification = {
        id: crypto.randomUUID(),
        type: t,
        recipient: r,
        actor: a,
        targetId: id,
        targetPreview: p,
        timestamp: new Date().toISOString(),
        isRead: false
    };
    await apiCall('/notifications', 'POST', notif);
};

export const saveMessage = async (m: Message) => {
    cache.messages.push(m);
    notifyListeners();
    await apiCall('/messages', 'POST', m);
    saveCacheToLocal();
};

// Utils
export const calculateFeedScore = (item: Exhibit, user: UserProfile) => {
    return new Date(item.timestamp).getTime();
};

export const fetchExhibitById = async (id: string) => {
    try {
        const item = await apiCall(`/exhibits/${id}`);
        return item;
    } catch { return null; }
};

export const fetchCollectionById = async (id: string) => {
    try {
        return await apiCall(`/collections/${id}`);
    } catch { return null; }
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const startLiveUpdates = () => {};
export const stopLiveUpdates = () => {};

export const getStorageEstimate = async (): Promise<StorageEstimate | undefined> => {
    if (navigator.storage && navigator.storage.estimate) {
        return await navigator.storage.estimate();
    }
    return undefined;
};

export const clearLocalCache = async () => {
    localStorage.removeItem(CACHE_STORAGE_KEY);
    window.location.reload();
};
export const markNotificationsRead = (u:string) => {
    cache.notifications.forEach(n => { if(n.recipient === u) n.isRead = true; });
    notifyListeners();
};
export const toggleFollow = async (me:string, them:string) => {
    const myUser = cache.users.find(u => u.username === me);
    if(myUser) {
        if(myUser.following.includes(them)) {
            myUser.following = myUser.following.filter(u => u !== them);
        } else {
            myUser.following.push(them);
        }
        updateUserProfile(myUser);
    }
};
export const createGuild = async (g:Guild) => {};
export const joinGuild = async (code:string, u:string) => true;
export const leaveGuild = async (gid:string, u:string) => true;
export const kickFromGuild = async (gid:string, u:string) => {};
export const deleteGuild = async (gid:string) => {};
export const getMyTradeRequests = () => ({ incoming: [], outgoing: [], history: [], active: [], actionRequired: [] });
export const sendTradeRequest = async (p: any) => {};
export const acceptTradeRequest = async (id:string) => {};
export const updateTradeStatus = async (id:string, s:string) => {};
export const completeTradeRequest = async (id:string) => {};
