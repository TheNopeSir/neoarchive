
import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry } from '../types';

// Internal Cache (In-Memory)
let cache = {
    exhibits: [] as Exhibit[],
    collections: [] as Collection[],
    notifications: [] as Notification[],
    messages: [] as Message[],
    users: [] as UserProfile[],
    guestbook: [] as GuestbookEntry[],
    deletedIds: [] as string[],
    isLoaded: false
};

const DB_NAME = 'NeoArchiveDB';
const STORE_NAME = 'client_cache';
const CACHE_KEY = 'neo_archive_v2'; // Bumped version
const SESSION_USER_KEY = 'neo_active_user';
const CACHE_VERSION = '5.0.0-Optimized'; 

let isOfflineMode = false;
const API_BASE = '/api';

const idb = {
    open: (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 3);
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
    }
};

export const isOffline = () => isOfflineMode;

export const getUserAvatar = (username: string): string => {
    const user = cache.users.find(u => u.username === username);
    if (user?.avatarUrl && !user.avatarUrl.includes('ui-avatars.com')) return user.avatarUrl;
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    const color = (hash & 0x00FFFFFF).toString(16).toUpperCase().padStart(6, '0');
    return `https://ui-avatars.com/api/?name=${username}&background=${color}&color=fff&bold=true`;
};

const slugify = (text: string): string => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/-+$/, '');

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
            cache = { ...cache, ...data, isLoaded: true };
            return true;
        }
    } catch (e) { return false; }
    return false;
};

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const controller = new AbortController();
    // Increase timeout to 60s for slow operations like SMTP emails
    // Pass an explicit error object to abort() to avoid "signal is aborted without reason"
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
            } catch (e) {
                // Ignore parsing error, keep default status message
            }
            throw new Error(errorMsg);
        }
        return await res.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        // Handle AbortError specifically for user-friendly message
        if (error.name === 'AbortError' || error.message === 'Timeout') {
            throw new Error("Сервер долго не отвечает. Попробуйте позже (Timeout).");
        }
        throw error;
    }
};

// --- PAGINATION & OPTIMIZED LOADING ---
export const loadFeedBatch = async (page: number, limit: number = 10): Promise<Exhibit[]> => {
    try {
        const items: Exhibit[] = await apiCall(`/feed?page=${page}&limit=${limit}`);
        if (items && items.length > 0) {
            const currentIds = new Set(cache.exhibits.map(e => e.id));
            const newItems = items.filter(item => !currentIds.has(item.id));
            // Keep exhibits sorted by timestamp
            cache.exhibits = [...cache.exhibits, ...newItems].sort((a,b) => {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
            await saveToLocalCache();
            return items;
        }
        return [];
    } catch (e) {
        console.warn("Feed Load Error, using local only", e);
        return [];
    }
};

/**
 * Optimized Sync: First fetch critical user-specific data, then the rest.
 */
const performCloudSync = async () => {
    const activeUser = localStorage.getItem(SESSION_USER_KEY);
    try {
        // Priority 1: User Profile, Notifications, Messages (The "Social" pulse)
        const initData = await apiCall(activeUser ? `/sync?username=${activeUser}&priority=high` : '/sync?priority=high');
        
        if (initData.users) cache.users = initData.users;
        if (initData.notifications) cache.notifications = initData.notifications;
        if (initData.messages) {
            // Merge messages to avoid duplicates
            const msgMap = new Map(cache.messages.map(m => [m.id, m]));
            (initData.messages as Message[]).forEach(m => msgMap.set(m.id, m));
            cache.messages = Array.from(msgMap.values()).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
        }
        
        // Priority 2: Initial Feed & Collections
        if (initData.exhibits) {
            const serverMap = new Map((initData.exhibits as Exhibit[]).map(e => [e.id, e]));
            // Only keep what's not deleted locally
            cache.exhibits.forEach(e => { if(!serverMap.has(e.id) && !cache.deletedIds.includes(e.id)) serverMap.set(e.id, e); });
            cache.exhibits = Array.from(serverMap.values()).sort((a,b) => {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
        }
        if (initData.collections) cache.collections = initData.collections;
        if (initData.guestbook) cache.guestbook = initData.guestbook;

        await saveToLocalCache();
        isOfflineMode = false;
    } catch (e) {
        console.warn("Sync slow or failed, staying in local mode");
        isOfflineMode = true;
    }
};

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    await loadFromCache();
    performCloudSync();
    
    const localActiveUser = localStorage.getItem(SESSION_USER_KEY);
    if (localActiveUser) {
        return cache.users.find(u => u.username === localActiveUser) || null;
    }
    return null;
};

export const forceSync = performCloudSync;
export const getFullDatabase = () => ({ ...cache });

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
    const res = await apiCall('/auth/login', 'POST', { email, password });
    if (res.success && res.user) {
        localStorage.setItem(SESSION_USER_KEY, res.user.username);
        const idx = cache.users.findIndex(u => u.username === res.user.username);
        if (idx !== -1) cache.users[idx] = res.user; else cache.users.push(res.user);
        await saveToLocalCache();
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
        localStorage.setItem(SESSION_USER_KEY, res.user.username);
        const idx = cache.users.findIndex(u => u.username === res.user.username);
        if (idx !== -1) cache.users[idx] = res.user; else cache.users.push(res.user);
        await saveToLocalCache();
        return res.user;
    }
    throw new Error(res.error || "Telegram login failed");
};

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    const profile = { username, email, tagline, avatarUrl: getUserAvatar(username), joinedDate: new Date().toLocaleString(), following: [], followers: [], achievements: [{id:'HELLO_WORLD', current:1, target:1, unlocked:true}], password };
    const res = await apiCall('/auth/register', 'POST', { username, email, password, data: profile });
    if (res.success) return profile;
    throw new Error(res.error || "Registration failed");
};

export const toggleFollow = async (currentUsername: string, targetUsername: string) => {
    const current = cache.users.find(u => u.username === currentUsername);
    let target = cache.users.find(u => u.username === targetUsername);

    // If target isn't found in cache, we might need to fetch them specifically, 
    // but for now, rely on cache. If target isn't found, we can't update them.
    if (!current || !target) return;

    // Ensure arrays exist
    if (!current.following) current.following = [];
    if (!target.followers) target.followers = [];

    const isFollowing = current.following.includes(targetUsername);
    
    if (isFollowing) {
        current.following = current.following.filter(u => u !== targetUsername);
        target.followers = target.followers.filter(u => u !== currentUsername);
    } else {
        current.following = [...current.following, targetUsername];
        target.followers = [...target.followers, currentUsername];
    }

    await saveToLocalCache();
    // Sync both user profiles to server
    apiCall('/users/update', 'POST', current).catch((e) => console.warn('Sync follow current failed', e));
    apiCall('/users/update', 'POST', target).catch((e) => console.warn('Sync follow target failed', e));
};

export const updateUserProfile = async (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    await saveToLocalCache();
    await apiCall('/users/update', 'POST', user);
};

const syncItem = async (endpoint: string, item: any) => apiCall(endpoint, 'POST', item).catch((e) => {
    console.warn(`Sync failed for ${endpoint}:`, e.message);
});

export const saveExhibit = async (ex: Exhibit) => { 
    ex.slug = `${slugify(ex.title)}-${Date.now().toString().slice(-4)}`;
    cache.exhibits.unshift(ex); 
    await saveToLocalCache(); 
    await syncItem('/exhibits', ex); 
};
export const updateExhibit = async (ex: Exhibit) => {
    const idx = cache.exhibits.findIndex(e => e.id === ex.id);
    if (idx !== -1) cache.exhibits[idx] = ex;
    await saveToLocalCache();
    await syncItem('/exhibits', ex);
};
export const deleteExhibit = async (id: string) => {
    cache.exhibits = cache.exhibits.filter(e => e.id !== id);
    if (!cache.deletedIds.includes(id)) cache.deletedIds.push(id);
    await saveToLocalCache();
    await apiCall(`/exhibits/${id}`, 'DELETE').catch((e) => console.warn(`Delete exhibit ${id} failed`, e));
};

export const saveCollection = async (c: Collection) => {
    c.slug = `${slugify(c.title)}-${Date.now().toString().slice(-4)}`;
    cache.collections.unshift(c);
    await saveToLocalCache();
    await syncItem('/collections', c);
};
export const updateCollection = async (c: Collection) => {
    const idx = cache.collections.findIndex(col => col.id === c.id);
    if (idx !== -1) cache.collections[idx] = c;
    await saveToLocalCache();
    await syncItem('/collections', c);
};

export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    if (!cache.deletedIds.includes(id)) cache.deletedIds.push(id);
    await saveToLocalCache();
    await apiCall(`/collections/${id}`, 'DELETE').catch((e) => console.warn(`Delete collection ${id} failed`, e));
};

export const saveMessage = async (msg: Message) => {
    if (!cache.messages.some(m => m.id === msg.id)) {
        cache.messages.push(msg);
        cache.messages.sort((a,b) => a.timestamp.localeCompare(b.timestamp));
        await saveToLocalCache();
        syncItem('/messages', msg);
    }
};

export const saveGuestbookEntry = async (e: GuestbookEntry) => { cache.guestbook.push(e); await saveToLocalCache(); await syncItem('/guestbook', e); };
export const updateGuestbookEntry = async (e: GuestbookEntry) => { const idx = cache.guestbook.findIndex(g => g.id === e.id); if (idx !== -1) cache.guestbook[idx] = e; await saveToLocalCache(); await syncItem('/guestbook', e); };
export const deleteGuestbookEntry = async (id: string) => { cache.guestbook = cache.guestbook.filter(g => g.id !== id); await saveToLocalCache(); apiCall(`/guestbook/${id}`, 'DELETE').catch(()=>{}); };

export const logoutUser = () => { localStorage.removeItem(SESSION_USER_KEY); };
export const clearLocalCache = async () => { localStorage.removeItem(SESSION_USER_KEY); await idb.clear(); window.location.reload(); };

export const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > 1200 || height > 1200) {
                    if (width > height) { height *= 1200 / width; width = 1200; } 
                    else { width *= 1200 / height; height = 1200; }
                }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
        };
    });
};

export const getStorageEstimate = async () => { if (navigator.storage?.estimate) return await navigator.storage.estimate(); return null; };
