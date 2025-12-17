
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
const CACHE_VERSION = '4.0.0-Optimized'; 

// Changed: We assume online by default to force connection attempts
let isOfflineMode = false;

// Base API URL
const API_BASE = '/api';

// --- INDEXEDDB WRAPPER ---
const idb = {
    open: (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new Error("IndexedDB not supported"));
                return;
            }
            const request = indexedDB.open(DB_NAME, 2);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    put: async (key: string, value: any) => {
        try {
            const db = await idb.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.put(value, key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.error("IDB Put Error", e);
        }
    },
    get: async (key: string) => {
        try {
            const db = await idb.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            return null;
        }
    },
    clear: async () => {
        try {
            const db = await idb.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.clear();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.error("IDB Clear Error", e);
        }
    }
};

// --- EXPORTS ---
export const isOffline = () => isOfflineMode;

export const getUserAvatar = (username: string): string => {
    const user = cache.users.find(u => u.username === username);
    if (user && user.avatarUrl && !user.avatarUrl.includes('ui-avatars.com')) {
        return user.avatarUrl;
    }
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const color = "00000".substring(0, 6 - c.length) + c;
    return `https://ui-avatars.com/api/?name=${username}&background=${color}&color=fff&bold=true`;
};

const slugify = (text: string): string => {
    return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/-+$/, '');
};

const prepareCacheForStorage = (currentCache: typeof cache) => {
    const activeUser = localStorage.getItem(SESSION_USER_KEY);
    const users = currentCache.users;
    const allExhibits = currentCache.exhibits;
    const myExhibits = activeUser ? allExhibits.filter(e => e.owner === activeUser) : [];
    const feedExhibits = allExhibits
        .filter(e => e.owner !== activeUser)
        .sort((a,b) => b.id.localeCompare(a.id))
        .slice(0, 50);
    
    const combinedExhibits = [...myExhibits, ...feedExhibits];
    const uniqueExhibits = Array.from(new Map(combinedExhibits.map(item => [item.id, item])).values());

    return {
        ...currentCache,
        exhibits: uniqueExhibits,
    };
};

const saveToLocalCache = async () => {
    try {
        const optimizedCache = prepareCacheForStorage(cache);
        const payload = {
            version: CACHE_VERSION,
            data: optimizedCache
        };
        await idb.put(CACHE_KEY, payload);
    } catch (e) { 
        console.error("Cache Save Error", e);
    }
};

const loadFromCache = async (): Promise<boolean> => {
    try {
        const stored: any = await idb.get(CACHE_KEY);
        if (stored) {
            const parsed = stored; 
            const data = parsed.data || parsed; 
            cache = {
                exhibits: data.exhibits || [],
                collections: data.collections || [],
                notifications: data.notifications || [],
                messages: data.messages || [],
                users: data.users || [],
                guestbook: data.guestbook || [],
                deletedIds: data.deletedIds || [],
                isLoaded: true
            };
            return true;
        }
    } catch (e) { 
        return false; 
    }
    return false;
};

// --- API CLIENT ---
const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
        const options: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) options.body = JSON.stringify(body);
        
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        if (!res.ok) {
            let errorMsg = res.statusText;
            try {
                const errBody = await res.json();
                if (errBody.error) errorMsg = errBody.error;
            } catch (e) {}
            throw new Error(`API Error ${res.status}: ${errorMsg}`);
        }
        return await res.json();
    } catch (error) {
        console.error(`API Call Failed (${endpoint}):`, error);
        throw error;
    }
};

export const loadFeedBatch = async (page: number) => {
    if (isOfflineMode) return [];
    try {
        const newItems: Exhibit[] = await apiCall(`/feed?page=${page}`);
        if (newItems && newItems.length > 0) {
            const existingIds = new Set(cache.exhibits.map(e => e.id));
            const uniqueNew = newItems.filter(e => !existingIds.has(e.id));
            cache.exhibits = [...cache.exhibits, ...uniqueNew];
            return uniqueNew;
        }
        return [];
    } catch (e) {
        console.warn("Feed fetch failed", e);
        return [];
    }
};

const performCloudSync = async () => {
    const activeUser = localStorage.getItem(SESSION_USER_KEY);
    const endpoint = activeUser ? `/sync?username=${activeUser}` : '/sync';
    
    const data = await apiCall(endpoint);
    
    if (data.users) cache.users = data.users;
    if (data.exhibits) cache.exhibits = data.exhibits; 
    if (data.collections) cache.collections = data.collections;
    if (data.notifications) cache.notifications = data.notifications;
    if (data.messages) cache.messages = data.messages;
    if (data.guestbook) cache.guestbook = data.guestbook;

    await saveToLocalCache();
};

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    // 1. Load what we have locally instantly
    await loadFromCache();
    
    // 2. Try to sync with server. 
    // IMPORTANT: We do NOT fallback to offline mode easily anymore.
    // If sync fails, we assume connection issues but don't disable future write attempts.
    try {
        await performCloudSync();
        isOfflineMode = false;
        cache.isLoaded = true;
        console.log("✅ [Sync] Connected to Database.");
    } catch (e: any) {
        console.warn("⚠️ [Sync] Warning: Could not sync with server.", e.message);
        // We do NOT set isOfflineMode = true immediately to allow retry on next action
        // Only set it if you want to completely disable writes.
    }

    const localActiveUser = localStorage.getItem(SESSION_USER_KEY);
    if (localActiveUser) {
        const cachedUser = cache.users.find(u => u.username === localActiveUser);
        if (cachedUser) return cachedUser;
    }
    return null;
};

export const backgroundSync = async (): Promise<boolean> => {
    try {
        await performCloudSync();
        isOfflineMode = false;
        return true;
    } catch (e) { return false; }
};

export const getFullDatabase = () => ({ ...cache, timestamp: new Date().toISOString() });

// --- AUTH ---

export const registerUser = async (username: string, password: string, tagline: string, email: string, telegram?: string, avatarUrl?: string): Promise<UserProfile> => {
    const userProfile: UserProfile = {
        username, email, tagline,
        avatarUrl: avatarUrl || getUserAvatar(username),
        joinedDate: new Date().toLocaleString('ru-RU'),
        following: [],
        achievements: ['HELLO_WORLD'],
        isAdmin: false,
        telegram,
        preferences: {},
        password
    };
    const res = await apiCall('/auth/register', 'POST', { username, email, password, data: userProfile });
    if (res.success) {
        cache.users.push(userProfile);
        await saveToLocalCache();
        return userProfile;
    } else {
        throw new Error(res.error || "Registration failed");
    }
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
    const res = await apiCall('/auth/login', 'POST', { email, password });
    if (res.success && res.user) {
        const userProfile = res.user;
        const idx = cache.users.findIndex(u => u.username === userProfile.username);
        if (idx !== -1) cache.users[idx] = userProfile;
        else cache.users.push(userProfile);
        await saveToLocalCache();
        return userProfile;
    }
    throw new Error(res.error || "Login failed");
};

// NEW: Unified Telegram Auth
export const loginViaTelegram = async (telegramUser: any): Promise<UserProfile> => {
    // Send raw telegram data to backend, let backend decide if it's login or register
    const res = await apiCall('/auth/telegram', 'POST', telegramUser);
    
    if (res.success && res.user) {
        const userProfile = res.user;
        // Update local cache
        const idx = cache.users.findIndex(u => u.username === userProfile.username);
        if (idx !== -1) cache.users[idx] = userProfile;
        else cache.users.push(userProfile);
        
        await saveToLocalCache();
        return userProfile;
    }
    throw new Error(res.error || "Telegram Auth Failed");
};

export const recoverPassword = async (email: string) => {
    return await apiCall('/auth/recover', 'POST', { email });
};

export const logoutUser = async () => {
    localStorage.removeItem(SESSION_USER_KEY);
};

export const updateUserProfile = async (user: UserProfile) => {
    // Optimistic update
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    else cache.users.push(user);
    await saveToLocalCache();
    // Fire and forget (or await if critical)
    await apiCall('/users/update', 'POST', user);
};

// Generic Helpers
// CHANGED: syncItem now THROWS error if it fails. It does not fail silently.
const syncItem = async (endpoint: string, item: any) => {
    try { 
        await apiCall(endpoint, 'POST', item); 
    } catch(e) { 
        console.error(`Sync Item failed (${endpoint})`, e); 
        throw new Error("Не удалось сохранить данные на сервере. Проверьте соединение.");
    }
};
const deleteItem = async (endpoint: string, id: string) => {
    try { await apiCall(`${endpoint}/${id}`, 'DELETE'); } catch(e) { console.error("Delete Item failed", e); }
};

export const updateUserPreference = async (username: string, category: string, weight: number) => {
    const userIndex = cache.users.findIndex(u => u.username === username);
    if (userIndex === -1) return;
    const user = cache.users[userIndex];
    const currentPrefs = user.preferences || {};
    const newWeight = (currentPrefs[category] || 0) + weight;
    const updatedUser = { ...user, preferences: { ...currentPrefs, [category]: newWeight } };
    cache.users[userIndex] = updatedUser;
    await saveToLocalCache();
    // Preferences are low priority, don't block
    apiCall('/users/update', 'POST', updatedUser).catch(console.warn);
};

// Exhibits
export const getExhibits = (): Exhibit[] => cache.exhibits;
export const saveExhibit = async (exhibit: Exhibit) => {
  exhibit.slug = `${slugify(exhibit.title)}-${Date.now().toString().slice(-4)}`;
  
  // WRITE-THROUGH: Server FIRST
  await syncItem('/exhibits', exhibit);
  
  // If server success, update cache
  const existingIdx = cache.exhibits.findIndex(e => e.id === exhibit.id);
  if (existingIdx !== -1) cache.exhibits[existingIdx] = exhibit;
  else cache.exhibits.unshift(exhibit);
  await saveToLocalCache();
};
export const updateExhibit = async (updatedExhibit: Exhibit) => {
  await syncItem('/exhibits', updatedExhibit);
  
  const index = cache.exhibits.findIndex(e => e.id === updatedExhibit.id);
  if (index !== -1) {
    cache.exhibits[index] = updatedExhibit;
    await saveToLocalCache();
  }
};
export const deleteExhibit = async (id: string) => {
  await deleteItem('/exhibits', id);
  
  cache.exhibits = cache.exhibits.filter(e => e.id !== id);
  cache.notifications = cache.notifications.filter(n => n.targetId !== id);
  cache.deletedIds.push(id); 
  await saveToLocalCache();
};

// Collections
export const getCollections = (): Collection[] => cache.collections;
export const saveCollection = async (collection: Collection) => {
    collection.slug = `${slugify(collection.title)}-${Date.now().toString().slice(-4)}`;
    
    await syncItem('/collections', collection);
    
    cache.collections.unshift(collection);
    await saveToLocalCache();
};
export const updateCollection = async (updatedCollection: Collection) => {
    await syncItem('/collections', updatedCollection);
    
    const index = cache.collections.findIndex(c => c.id === updatedCollection.id);
    if (index !== -1) {
        cache.collections[index] = updatedCollection;
        await saveToLocalCache();
    }
};
export const deleteCollection = async (id: string) => {
    await deleteItem('/collections', id);
    
    cache.collections = cache.collections.filter(c => c.id !== id);
    cache.deletedIds.push(id);
    await saveToLocalCache();
};

// Notifications/Messages/Guestbook
export const getNotifications = (): Notification[] => cache.notifications;
export const saveNotification = async (notif: Notification) => {
    // Fire and forget notifications usually
    apiCall('/notifications', 'POST', notif).catch(e => console.warn("Notif sync fail"));
    cache.notifications.unshift(notif);
    await saveToLocalCache();
};
export const markNotificationsRead = async (recipient: string) => {
    let hasUpdates = false;
    const toUpdate: Notification[] = [];
    cache.notifications.forEach(n => {
        if (n.recipient === recipient && !n.isRead) {
             n.isRead = true;
             toUpdate.push(n);
             hasUpdates = true;
        }
    });
    if (hasUpdates) {
        await saveToLocalCache();
        toUpdate.forEach(n => apiCall('/notifications', 'POST', n).catch(() => {}));
    }
};
export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;
export const saveGuestbookEntry = async (entry: GuestbookEntry) => {
    await syncItem('/guestbook', entry);
    cache.guestbook.push(entry);
    await saveToLocalCache();
};
export const updateGuestbookEntry = async (entry: GuestbookEntry) => {
    await syncItem('/guestbook', entry);
    const idx = cache.guestbook.findIndex(g => g.id === entry.id);
    if (idx !== -1) {
        cache.guestbook[idx] = entry;
        await saveToLocalCache();
    }
};
export const deleteGuestbookEntry = async (id: string) => {
    await deleteItem('/guestbook', id);
    cache.guestbook = cache.guestbook.filter(g => g.id !== id);
    await saveToLocalCache();
};
export const getMessages = (): Message[] => cache.messages;
export const saveMessage = async (msg: Message) => {
    await syncItem('/messages', msg);
    cache.messages.push(msg);
    await saveToLocalCache();
};
export const markMessagesRead = async (sender: string, receiver: string) => {
    const toUpdate: Message[] = [];
    cache.messages.forEach(m => {
        if (m.sender === sender && m.receiver === receiver && !m.isRead) {
            m.isRead = true;
            toUpdate.push(m);
        }
    });
    await saveToLocalCache();
    toUpdate.forEach(m => apiCall('/messages', 'POST', m).catch(() => {}));
};

// Cache Maintenance
export const getStorageEstimate = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      if (usage !== undefined && quota !== undefined) {
        return { usage, quota, percentage: (usage / quota) * 100 };
      }
    } catch (e) {}
  }
  return null;
};
export const clearLocalCache = async () => {
    try {
        localStorage.removeItem(SESSION_USER_KEY);
        localStorage.removeItem('neo_archive_client_cache');
        await idb.clear();
        window.location.reload();
    } catch(e) {}
};
export const autoCleanStorage = async () => {
    const estimate = await getStorageEstimate();
    if (estimate && estimate.percentage > 90) {
        console.warn("⚠️ Storage >90%. Cleaning...");
        await idb.clear();
        window.location.reload(); 
    }
};
export const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1080;
                const MAX_HEIGHT = 1080;
                let width = img.width;
                let height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
                else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (error) => reject(error);
    });
};
export const fileToBase64 = compressImage;
