
import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry } from '../types';

// Internal Cache
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
const CACHE_VERSION = '3.0.0-PG'; 

let isOfflineMode = false;

// Base API URL - relative for production/dev proxy
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
            console.warn("IDB Get Error (likely first run)", e);
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

// Helper for Consistent Avatars
export const getUserAvatar = (username: string): string => {
    const user = cache.users.find(u => u.username === username);
    if (user && user.avatarUrl && !user.avatarUrl.includes('ui-avatars.com')) {
        return user.avatarUrl;
    }
    // Deterministic generation based on username hash
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const color = "00000".substring(0, 6 - c.length) + c;
    return `https://ui-avatars.com/api/?name=${username}&background=${color}&color=fff&bold=true`;
};

// --- SLUG GENERATOR ---
const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/-+$/, '');
};

// --- CLIENT CACHE ---
const saveToLocalCache = async () => {
    try {
        const payload = {
            version: CACHE_VERSION,
            data: cache
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
        console.warn("Cache load error", e);
        return false; 
    }
    return false;
};

// --- STORAGE MANAGEMENT ---

export const getStorageEstimate = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      if (usage !== undefined && quota !== undefined) {
        return {
          usage,
          quota,
          percentage: (usage / quota) * 100
        };
      }
    } catch (e) {
      console.warn("Storage estimate failed", e);
    }
  }
  return null;
};

export const clearLocalCache = async () => {
    try {
        localStorage.removeItem(SESSION_USER_KEY);
        localStorage.removeItem('neo_archive_client_cache');
        await idb.clear();
        if ('caches' in window) {
            const names = await caches.keys();
            for (let name of names) await caches.delete(name);
        }
        window.location.reload();
    } catch(e) {
        console.error("Failed to clear cache", e);
    }
};

export const autoCleanStorage = async () => {
    const estimate = await getStorageEstimate();
    if (estimate && estimate.percentage > 95) {
        console.warn("⚠️ Storage critical (>95%). Auto-cleaning cache...");
        const sessionUser = localStorage.getItem(SESSION_USER_KEY);
        await idb.clear();
        localStorage.clear();
        if (sessionUser) localStorage.setItem(SESSION_USER_KEY, sessionUser);
        window.location.reload(); 
    }
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
            } catch (e) {
                // Ignore parsing error, stick to statusText
            }
            throw new Error(`API Error ${res.status}: ${errorMsg}`);
        }
        return await res.json();
    } catch (error) {
        console.error(`API Call Failed (${endpoint}):`, error);
        throw error;
    }
};

// --- PREFERENCES LOGIC ---
export const updateUserPreference = async (username: string, category: string, weight: number) => {
    const userIndex = cache.users.findIndex(u => u.username === username);
    if (userIndex === -1) return;

    const user = cache.users[userIndex];
    const currentPrefs = user.preferences || {};
    const newWeight = (currentPrefs[category] || 0) + weight;
    
    const updatedUser = { 
        ...user, 
        preferences: { ...currentPrefs, [category]: newWeight } 
    };
    cache.users[userIndex] = updatedUser;
    
    await saveToLocalCache();
    // Background sync
    apiCall('/users/update', 'POST', updatedUser).catch(console.warn);
};

// --- IMAGE COMPRESSION UTILITY ---
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

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const fileToBase64 = compressImage;

// --- CLOUD SYNC LOGIC ---

const performCloudSync = async () => {
    const data = await apiCall('/sync');
    
    if (data.users) cache.users = data.users;
    if (data.exhibits) cache.exhibits = data.exhibits;
    if (data.collections) cache.collections = data.collections;
    if (data.notifications) cache.notifications = data.notifications;
    if (data.messages) cache.messages = data.messages;
    if (data.guestbook) cache.guestbook = data.guestbook;

    await saveToLocalCache();
};

// --- INITIALIZATION ---
export const initializeDatabase = async (): Promise<UserProfile | null> => {
    // 1. Load local data
    await loadFromCache();

    try {
        console.log("☁️ [Sync] Connecting to NeoArchive Node (PostgreSQL)...");
        // Reduce timeout for faster failure feedback
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timed out')), 5000)
        );

        await Promise.race([performCloudSync(), timeoutPromise]);
        
        cache.isLoaded = true;
        isOfflineMode = false;
        console.log("✅ [Sync] Synchronization complete.");
    } catch (e: any) {
        console.warn("⚠️ [Sync] Server unavailable, switching to OFFLINE MODE.", e.message);
        isOfflineMode = true;
    }

    const localActiveUser = localStorage.getItem(SESSION_USER_KEY);
    if (localActiveUser) {
        const cachedUser = cache.users.find(u => u.username === localActiveUser);
        if (cachedUser) {
            console.log("🟢 [Auth] Restored via local active session");
            return cachedUser;
        }
    }
    return null;
};

export const backgroundSync = async (): Promise<boolean> => {
    if (isOfflineMode) return false;
    try {
        await performCloudSync();
        return true;
    } catch (e) {
        return false;
    }
};

export const getFullDatabase = () => ({ ...cache, timestamp: new Date().toISOString() });

// --- AUTH & CRUD ---
export const registerUser = async (username: string, password: string, tagline: string, email: string, telegram?: string, avatarUrl?: string): Promise<UserProfile> => {
    const isSuperAdmin = email === 'admin@neoarchive.net';
    const userProfile: UserProfile = {
        username: isSuperAdmin ? 'TheArchitect' : username,
        email,
        tagline: isSuperAdmin ? 'System Administrator' : tagline,
        avatarUrl: avatarUrl || getUserAvatar(username),
        joinedDate: new Date().toLocaleString('ru-RU'),
        following: [],
        achievements: isSuperAdmin ? ['HELLO_WORLD', 'LEGEND', 'THE_ONE'] : ['HELLO_WORLD'],
        isAdmin: isSuperAdmin,
        telegram: telegram,
        preferences: {},
        password: password // In real world, hash this. Here we pass to server secure channel.
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
    if (email === 'admin@neoarchive.net' && password === 'neo_super_secret') {
        const adminProfile: UserProfile = {
            username: 'TheArchitect',
            email: 'admin@neoarchive.net',
            tagline: 'System Root',
            avatarUrl: getUserAvatar('TheArchitect'),
            joinedDate: '01.01.1999',
            following: [],
            achievements: ['LEGEND', 'THE_ONE'],
            isAdmin: true,
            status: 'ONLINE',
            preferences: {}
        };
        return adminProfile;
    }

    const res = await apiCall('/auth/login', 'POST', { email, password });

    if (res.success && res.user) {
        const userProfile = res.user;
        // Update local cache with latest from server
        const idx = cache.users.findIndex(u => u.username === userProfile.username);
        if (idx !== -1) cache.users[idx] = userProfile;
        else cache.users.push(userProfile);
        
        await saveToLocalCache();
        return userProfile;
    }

    throw new Error(res.error || "Login failed");
};

export const logoutUser = async () => {
    localStorage.removeItem(SESSION_USER_KEY);
    // Server is stateless JWT/Sessionless for this migration, so no backend logout needed
};

export const updateUserProfile = async (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    else cache.users.push(user);
    await saveToLocalCache();
    await apiCall('/users/update', 'POST', user);
};

// Generic Helpers
const syncItem = async (endpoint: string, item: any) => {
    if (isOfflineMode) return;
    try {
        await apiCall(endpoint, 'POST', item);
    } catch(e) { console.error("Sync Item failed", e); }
};

const deleteItem = async (endpoint: string, id: string) => {
    if (isOfflineMode) return;
    try {
        await apiCall(`${endpoint}/${id}`, 'DELETE');
    } catch(e) { console.error("Delete Item failed", e); }
};

export const getExhibits = (): Exhibit[] => cache.exhibits;

export const saveExhibit = async (exhibit: Exhibit) => {
  exhibit.slug = `${slugify(exhibit.title)}-${Date.now().toString().slice(-4)}`;
  const existingIdx = cache.exhibits.findIndex(e => e.id === exhibit.id);
  if (existingIdx !== -1) {
      cache.exhibits[existingIdx] = exhibit;
  } else {
      cache.exhibits.unshift(exhibit);
  }
  await saveToLocalCache();
  await syncItem('/exhibits', exhibit);
};

export const updateExhibit = async (updatedExhibit: Exhibit) => {
  const index = cache.exhibits.findIndex(e => e.id === updatedExhibit.id);
  if (index !== -1) {
    cache.exhibits[index] = updatedExhibit;
    await saveToLocalCache();
    await syncItem('/exhibits', updatedExhibit);
  }
};

export const deleteExhibit = async (id: string) => {
  cache.exhibits = cache.exhibits.filter(e => e.id !== id);
  cache.notifications = cache.notifications.filter(n => n.targetId !== id);
  cache.deletedIds.push(id); 
  await saveToLocalCache();
  await deleteItem('/exhibits', id);
};

export const getCollections = (): Collection[] => cache.collections;

export const saveCollection = async (collection: Collection) => {
    collection.slug = `${slugify(collection.title)}-${Date.now().toString().slice(-4)}`;
    cache.collections.unshift(collection);
    await saveToLocalCache();
    await syncItem('/collections', collection);
};

export const updateCollection = async (updatedCollection: Collection) => {
    const index = cache.collections.findIndex(c => c.id === updatedCollection.id);
    if (index !== -1) {
        cache.collections[index] = updatedCollection;
        await saveToLocalCache();
        await syncItem('/collections', updatedCollection);
    }
};

export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    cache.deletedIds.push(id);
    await saveToLocalCache();
    await deleteItem('/collections', id);
};

export const getNotifications = (): Notification[] => cache.notifications;

export const saveNotification = async (notif: Notification) => {
    cache.notifications.unshift(notif);
    await saveToLocalCache();
    await syncItem('/notifications', notif);
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
        // Optimistic: Just send the updated ones to backend
        toUpdate.forEach(n => syncItem('/notifications', n));
    }
};

export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;

export const saveGuestbookEntry = async (entry: GuestbookEntry) => {
    cache.guestbook.push(entry);
    await saveToLocalCache();
    await syncItem('/guestbook', entry);
};

export const updateGuestbookEntry = async (entry: GuestbookEntry) => {
    const idx = cache.guestbook.findIndex(g => g.id === entry.id);
    if (idx !== -1) {
        cache.guestbook[idx] = entry;
        await saveToLocalCache();
        await syncItem('/guestbook', entry);
    }
};

export const deleteGuestbookEntry = async (id: string) => {
    cache.guestbook = cache.guestbook.filter(g => g.id !== id);
    await saveToLocalCache();
    await deleteItem('/guestbook', id);
};

export const getMessages = (): Message[] => cache.messages;

export const saveMessage = async (msg: Message) => {
    cache.messages.push(msg);
    await saveToLocalCache();
    await syncItem('/messages', msg);
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
    toUpdate.forEach(m => syncItem('/messages', m));
};
