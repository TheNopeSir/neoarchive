
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
const CACHE_KEY = 'neo_archive_v1';
const SESSION_USER_KEY = 'neo_active_user';
const CACHE_VERSION = '4.2.1-InfiniteScroll'; 

let isOfflineMode = false;
const API_BASE = '/api';

const idb = {
    open: (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 2);
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
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
        const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' }, signal: controller.signal };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`API Error ${res.status}`);
        return await res.json();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

// --- PAGINATION ---
export const loadFeedBatch = async (page: number, limit: number = 10): Promise<Exhibit[]> => {
    try {
        const items: Exhibit[] = await apiCall(`/feed?page=${page}&limit=${limit}`);
        if (items && items.length > 0) {
            const currentIds = new Set(cache.exhibits.map(e => e.id));
            const newItems = items.filter(item => !currentIds.has(item.id));
            cache.exhibits = [...cache.exhibits, ...newItems].sort((a,b) => b.timestamp.localeCompare(a.timestamp));
            await saveToLocalCache();
            return items;
        }
        return [];
    } catch (e) {
        console.error("Feed Load Error", e);
        return [];
    }
};

const performCloudSync = async () => {
    const activeUser = localStorage.getItem(SESSION_USER_KEY);
    try {
        const data = await apiCall(activeUser ? `/sync?username=${activeUser}` : '/sync');
        if (data.users) cache.users = data.users;
        if (data.exhibits) {
            const serverMap = new Map((data.exhibits as Exhibit[]).map(e => [e.id, e]));
            cache.exhibits.forEach(e => { if(!serverMap.has(e.id)) serverMap.set(e.id, e); });
            cache.deletedIds.forEach(id => serverMap.delete(id));
            cache.exhibits = Array.from(serverMap.values()).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        }
        if (data.collections) cache.collections = data.collections;
        if (data.notifications) cache.notifications = data.notifications;
        if (data.messages) cache.messages = data.messages;
        if (data.guestbook) cache.guestbook = data.guestbook;
        await saveToLocalCache();
    } catch (e) {
        console.warn("Sync failed, using cached data");
        isOfflineMode = true;
    }
};

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    await loadFromCache();
    performCloudSync(); // Sync in background
    const localActiveUser = localStorage.getItem(SESSION_USER_KEY);
    if (localActiveUser) {
        return cache.users.find(u => u.username === localActiveUser) || null;
    }
    return null;
};

export const forceSync = performCloudSync;
export const getFullDatabase = () => ({ ...cache });

// --- AUTH & SOCIAL ---
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

// Fix: Added loginViaTelegram to handle Telegram authentication protocol
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
    const target = cache.users.find(u => u.username === targetUsername);
    if (!current || !target) return;
    const isFollowing = current.following.includes(targetUsername);
    if (isFollowing) {
        current.following = current.following.filter(u => u !== targetUsername);
        target.followers = (target.followers || []).filter(u => u !== currentUsername);
    } else {
        current.following = [...current.following, targetUsername];
        target.followers = [...(target.followers || []), currentUsername];
    }
    await saveToLocalCache();
    apiCall('/users/update', 'POST', current).catch(()=>{});
    apiCall('/users/update', 'POST', target).catch(()=>{});
};

export const updateUserProfile = async (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    await saveToLocalCache();
    await apiCall('/users/update', 'POST', user);
};

// --- CRUD ---
const syncItem = async (endpoint: string, item: any) => apiCall(endpoint, 'POST', item).catch(() => {});

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
export const saveMessage = async (msg: Message) => {
    if (!cache.messages.some(m => m.id === msg.id)) {
        cache.messages.push(msg);
        await saveToLocalCache();
        await syncItem('/messages', msg);
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
                if (width > 1080 || height > 1080) {
                    if (width > height) { height *= 1080 / width; width = 1080; } 
                    else { width *= 1080 / height; height = 1080; }
                }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
};
export const getStorageEstimate = async () => { if (navigator.storage?.estimate) return await navigator.storage.estimate(); return null; };
