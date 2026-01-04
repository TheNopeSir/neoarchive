
import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry, WishlistItem, Guild, Duel, TradeRequest, TradeRequestStatus, TradeType, NotificationType } from '../types';

// Internal Cache (In-Memory)
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
    deletedIds: [] as string[],
    isLoaded: false
};

const DB_NAME = 'NeoArchiveDB';
const STORE_NAME = 'client_cache';
const CACHE_KEY = 'neo_archive_v5_7'; 
const SESSION_USER_KEY = 'neo_active_user';

let isOfflineMode = false;
let liveUpdateInterval: any = null;
const API_BASE = '/api';

// --- OBSERVER PATTERN ---
type ChangeListener = () => void;
const listeners: ChangeListener[] = [];

// --- TOAST EMITTER ---
type ToastListener = (n: Notification) => void;
const toastListeners: ToastListener[] = [];

export const subscribeToToasts = (listener: ToastListener) => {
    toastListeners.push(listener);
    return () => {
        const index = toastListeners.indexOf(listener);
        if (index > -1) toastListeners.splice(index, 1);
    };
};

const emitToast = (n: Notification) => {
    toastListeners.forEach(l => l(n));
};

export const subscribe = (listener: ChangeListener) => {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
    };
};

const notifyListeners = () => listeners.forEach(l => l());

const idb = {
    open: (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 4); 
            request.onupgradeneeded = (e) => {
                const db = (e.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    put: async (key: string, value: any) => {
        const db = await idb.open();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(value, key);
            tx.oncomplete = () => resolve(true);
        });
    },
    get: async (key: string) => {
        const db = await idb.open();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(key);
            req.onsuccess = () => resolve(req.result);
        });
    },
    clear: async () => {
        const db = await idb.open();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        notifyListeners();
    }
};

export const isOffline = () => isOfflineMode;
export const getUserAvatar = (username: string): string => {
    if (!username) return 'https://ui-avatars.com/api/?name=NA&background=000&color=fff';
    const u = cache.users.find(u => u.username === username);
    if (u?.avatarUrl) return u.avatarUrl;
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    const color = (hash & 0x00FFFFFF).toString(16).toUpperCase().padStart(6, '0');
    return `https://ui-avatars.com/api/?name=${username}&background=${color}&color=fff&bold=true`;
};

const saveToLocalCache = async () => {
    try { await idb.put(CACHE_KEY, { version: '5.7.0', data: cache }); } catch (e) { console.error("Cache Save Error", e); }
};

const loadFromCache = async (): Promise<boolean> => {
    try {
        const stored: any = await idb.get(CACHE_KEY);
        if (stored && stored.data) {
            const data = stored.data;
            cache.exhibits = data.exhibits || [];
            cache.collections = data.collections || [];
            cache.notifications = data.notifications || [];
            cache.messages = data.messages || [];
            cache.users = data.users || [];
            cache.guestbook = data.guestbook || [];
            cache.wishlist = data.wishlist || [];
            cache.tradeRequests = data.tradeRequests || [];
            cache.guilds = data.guilds || [];
            cache.isLoaded = true;
            return true;
        }
    } catch (e) { return false; }
    return false;
};

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 
    
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
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `API Error ${res.status}`);
        }
        isOfflineMode = false;
        return await res.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        console.warn(`API Fail: ${endpoint}`, error);
        isOfflineMode = true;
        notifyListeners(); 
        throw error;
    }
};

// --- SMART MERGE HELPERS ---
const mergeArrays = <T>(local: T[], server: T[], key: keyof T = 'id' as keyof T): T[] => {
    const map = new Map<string, T>();
    server.forEach(item => map.set(String(item[key]), item));
    local.forEach(item => {
        if (!map.has(String(item[key]))) {
            map.set(String(item[key]), item);
        }
    });
    return Array.from(map.values());
};

// --- FEED RANKING ALGORITHM ---
export const calculateFeedScore = (item: Exhibit, currentUser?: UserProfile): number => {
    const now = new Date().getTime();
    const createdAt = new Date(item.timestamp).getTime(); 
    if (isNaN(createdAt)) return 0;

    const hoursOld = (now - createdAt) / (1000 * 60 * 60);
    let score = 0;

    if (hoursOld < 2) score += 100;
    else if (hoursOld < 12) score += 80;
    else if (hoursOld < 24) score += 60;
    else if (hoursOld < 72) score += 40;
    else score += Math.max(0, 20 - (hoursOld / 24));

    const rawPopularity = (item.likes * 2) + ((item.comments?.length || 0) * 5) + (item.views * 0.1);
    const ageFactor = Math.sqrt(Math.max(1, hoursOld));
    score += (rawPopularity / ageFactor) * 10;

    if (currentUser && currentUser.following.includes(item.owner)) {
        score += 50; 
    }

    if (item.tradeStatus === 'FOR_TRADE' || item.tradeStatus === 'FOR_SALE') {
        score += 15;
    }

    return score;
};

// --- SYNC & INIT ---

const performCloudSync = async () => {
    const activeUser = localStorage.getItem(SESSION_USER_KEY);
    try {
        const [feedData, userData, notifData] = await Promise.allSettled([
            apiCall('/feed?page=1&limit=50'),
            activeUser ? apiCall(`/sync?username=${activeUser}`) : Promise.resolve(null),
            activeUser ? apiCall(`/notifications?username=${activeUser}`) : Promise.resolve(null)
        ]);

        let hasUpdates = false;

        if (feedData.status === 'fulfilled' && Array.isArray(feedData.value)) {
            const prevLen = cache.exhibits.length;
            cache.exhibits = mergeArrays(cache.exhibits, feedData.value);
            cache.exhibits.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            if (cache.exhibits.length !== prevLen) hasUpdates = true;
        }

        if (userData.status === 'fulfilled' && userData.value) {
             if (userData.value.collections) cache.collections = mergeArrays(cache.collections, userData.value.collections);
             if (userData.value.users) cache.users = mergeArrays(cache.users, userData.value.users, 'username');
             hasUpdates = true;
        }

        if (notifData.status === 'fulfilled' && Array.isArray(notifData.value)) {
             cache.notifications = mergeArrays(cache.notifications, notifData.value);
             hasUpdates = true;
        }

        if (hasUpdates) {
            await saveToLocalCache();
            notifyListeners();
        }
        isOfflineMode = false;
        return true;
    } catch (e) {
        console.warn("Sync failed", e);
        isOfflineMode = true;
        return false;
    }
};

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    const hasCache = await loadFromCache();
    
    if (!hasCache || cache.exhibits.length === 0) {
        console.log("⚡ [System] Cache empty, performing blocking sync...");
        try {
            await performCloudSync();
        } catch (e) {
            console.error("Critical: Initial sync failed");
        }
    } else {
        performCloudSync(); 
    }
    
    const localActiveUser = localStorage.getItem(SESSION_USER_KEY);
    if (localActiveUser) {
        return cache.users.find(u => u.username === localActiveUser) || { username: localActiveUser } as UserProfile;
    }
    return null;
};

// AUTHENTICATION FUNCTIONS - NOW CONNECTED TO API
export const loginUser = async (identifier: string, password: string): Promise<UserProfile> => {
    try {
        const user = await apiCall('/auth/login', 'POST', { identifier, password });
        if (user) {
            cache.users = mergeArrays(cache.users, [user], 'username');
            localStorage.setItem(SESSION_USER_KEY, user.username);
            notifyListeners();
            return user;
        }
    } catch (e) {
        console.error("Login failed", e);
        throw e;
    }
    throw new Error("Login failed");
};

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    try {
        const user = await apiCall('/auth/register', 'POST', { username, password, tagline, email });
        if (user) {
            cache.users = mergeArrays(cache.users, [user], 'username');
            localStorage.setItem(SESSION_USER_KEY, user.username);
            notifyListeners();
            return user;
        }
    } catch (e) {
        console.error("Register failed", e);
        throw e;
    }
    throw new Error("Registration failed");
};

export const loginViaTelegram = async (tgUser: any): Promise<UserProfile> => {
    try {
        const user = await apiCall('/auth/telegram', 'POST', tgUser);
        if (user) {
            cache.users = mergeArrays(cache.users, [user], 'username');
            localStorage.setItem(SESSION_USER_KEY, user.username);
            notifyListeners();
            return user;
        }
    } catch (e) {
        throw e;
    }
    throw new Error("TG Auth Failed");
};

export const recoverPassword = async (email: string) => {
    return await apiCall('/auth/recover', 'POST', { email });
};

export const logoutUser = async () => { 
    localStorage.removeItem(SESSION_USER_KEY); 
    notifyListeners(); 
};

// ... (Other exports) ...
export const startLiveUpdates = () => { /* Same as before */ };
export const stopLiveUpdates = () => { /* Same as before */ };
export const getFullDatabase = () => ({ ...cache });
export const updateExhibit = async (e: Exhibit) => { 
    const idx = cache.exhibits.findIndex(x => x.id === e.id);
    if(idx !== -1) cache.exhibits[idx] = e; 
    await apiCall('/exhibits', 'POST', e);
    await saveToLocalCache();
    notifyListeners();
};
export const fetchExhibitById = async (id: string) => { 
    try {
        const item = await apiCall(`/exhibits/${id}`);
        if (item) {
            cache.exhibits = mergeArrays(cache.exhibits, [item]);
            notifyListeners();
            return item;
        }
    } catch(e) {}
    return cache.exhibits.find(e => e.id === id) || null;
};
export const fetchCollectionById = async (id: string) => { return null; };
export const loadFeedBatch = async (page: number, limit: number) => {
    try {
        const newItems = await apiCall(`/feed?page=${page}&limit=${limit}`);
        if (Array.isArray(newItems)) {
            cache.exhibits = mergeArrays(cache.exhibits, newItems);
            await saveToLocalCache();
            notifyListeners();
            return newItems;
        }
    } catch (e) { console.warn("Load batch failed", e); }
    return []; 
};
export const saveExhibit = async (e: Exhibit) => { cache.exhibits.unshift(e); await apiCall('/exhibits', 'POST', e); notifyListeners(); };
export const deleteExhibit = async (id: string) => { await apiCall(`/exhibits/${id}`, 'DELETE'); cache.exhibits = cache.exhibits.filter(e => e.id !== id); notifyListeners(); };
export const saveCollection = async (c: Collection) => { await apiCall('/collections', 'POST', c); cache.collections.push(c); notifyListeners(); };
export const updateCollection = async (c: Collection) => { await apiCall('/collections', 'POST', c); cache.collections = cache.collections.map(col => col.id === c.id ? c : col); notifyListeners(); };
export const deleteCollection = async (id: string) => { await apiCall(`/collections/${id}`, 'DELETE'); cache.collections = cache.collections.filter(c => c.id !== id); notifyListeners(); };
export const saveWishlistItem = async (w: WishlistItem) => { await apiCall('/wishlist', 'POST', w); cache.wishlist.push(w); notifyListeners(); };
export const deleteWishlistItem = async (id: string) => { await apiCall(`/wishlist/${id}`, 'DELETE'); cache.wishlist = cache.wishlist.filter(w => w.id !== id); notifyListeners(); };
export const saveMessage = async (m: Message) => { await apiCall('/messages', 'POST', m); cache.messages.push(m); notifyListeners(); };
export const saveGuestbookEntry = async (e: GuestbookEntry) => { await apiCall('/guestbook', 'POST', e); cache.guestbook.push(e); notifyListeners(); };
export const updateGuestbookEntry = async (e: GuestbookEntry) => { await apiCall('/guestbook', 'POST', e); cache.guestbook = cache.guestbook.map(g => g.id === e.id ? e : g); notifyListeners(); };
export const deleteGuestbookEntry = async (id: string) => { await apiCall(`/guestbook/${id}`, 'DELETE'); cache.guestbook = cache.guestbook.filter(g => g.id !== id); notifyListeners(); };
export const updateUserProfile = async (u: UserProfile) => { await apiCall('/users', 'POST', { id: u.username, ...u }); cache.users = cache.users.map(us => us.username === u.username ? u : us); notifyListeners(); };
export const toggleFollow = async (me: string, them: string) => { /*...*/ };
export const createGuild = async (g: Guild) => { /*...*/ };
export const joinGuild = async (code: string, user: string) => { return false; };
export const leaveGuild = async (gid: string, user: string) => { return false; };
export const kickFromGuild = async (gid: string, user: string) => { /*...*/ };
export const deleteGuild = async (gid: string) => { /*...*/ };
export const getMyTradeRequests = () => ({ incoming: [], outgoing: [], history: [], active: [], actionRequired: [] });
export const sendTradeRequest = async (p: any) => { /*...*/ };
export const acceptTradeRequest = async (id: string) => { /*...*/ };
export const updateTradeStatus = async (id: string, s: string) => { /*...*/ };
export const completeTradeRequest = async (id: string) => { /*...*/ };

export const getStorageEstimate = async (): Promise<StorageEstimate | undefined> => {
    try {
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
            return await navigator.storage.estimate();
        }
    } catch (e) {
        console.warn("Storage estimate not supported");
    }
    return undefined;
};

export const clearLocalCache = async () => { await idb.clear(); };
export const fileToBase64 = async (f: File) => {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
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
    // Optimistic
    cache.notifications.unshift(notif);
    notifyListeners();
};
export const markNotificationsRead = async (username: string) => {
    cache.notifications.forEach(n => { if(n.recipient === username) n.isRead = true; });
    notifyListeners();
};
