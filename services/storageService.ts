
import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry } from '../types';
import { supabase } from './supabaseClient';

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

const LOCAL_STORAGE_KEY = 'neo_archive_client_cache';
const SESSION_USER_KEY = 'neo_active_user';
// BUMP VERSION TO CLEAR CACHE & FIX QUOTA ISSUES
const CACHE_VERSION = '2.7.0-QuotaFix'; 
let isOfflineMode = false;

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
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

// --- CLIENT CACHE ---
const saveToLocalCache = () => {
    try {
        const payload = {
            version: CACHE_VERSION,
            data: cache
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (e: any) { 
        // Handle QuotaExceededError
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.message?.includes('quota')) {
            console.error("🔴 [Cache] Storage Quota Exceeded! Clearing storage to prevent crash...");
            try {
                // Emergency clear
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                // Try to save minimal data
                const minimalPayload = {
                    version: CACHE_VERSION,
                    data: {
                        ...cache,
                        exhibits: cache.exhibits.slice(0, 50), // Keep only recent
                        collections: cache.collections.slice(0, 10),
                        notifications: cache.notifications.slice(0, 20)
                    }
                };
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(minimalPayload));
            } catch (retryErr) {
                console.error("🔴 [Cache] Critical Storage Failure", retryErr);
            }
        } else {
            console.error("Cache Save Error", e); 
        }
    }
};

const loadFromLocalCache = (): boolean => {
    const json = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (json) {
        try {
            const parsed = JSON.parse(json);
            if (!parsed.version || parsed.version !== CACHE_VERSION) {
                console.log(`♻️ [Cache] Version mismatch (${parsed.version} vs ${CACHE_VERSION}). Clearing cache.`);
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                return false;
            }
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
        } catch (e) { 
            console.warn("Cache parse error, clearing.", e);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return false; 
        }
    }
    return false;
};

// --- STORAGE MANAGEMENT (NEW) ---

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

export const clearLocalCache = () => {
    try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        // Optional: clear image cache if utilizing specific cache names
        if ('caches' in window) {
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
            });
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
        // Keep user session if possible, but clear data
        const sessionUser = localStorage.getItem(SESSION_USER_KEY);
        localStorage.clear();
        if (sessionUser) localStorage.setItem(SESSION_USER_KEY, sessionUser);
        
        window.location.reload(); 
    }
};

// --- PREFERENCES LOGIC ---
export const updateUserPreference = async (username: string, category: string, weight: number) => {
    const userIndex = cache.users.findIndex(u => u.username === username);
    if (userIndex === -1) return;

    const user = cache.users[userIndex];
    const currentPrefs = user.preferences || {};
    const newWeight = (currentPrefs[category] || 0) + weight;
    
    // Update local state
    const updatedUser = { 
        ...user, 
        preferences: { ...currentPrefs, [category]: newWeight } 
    };
    cache.users[userIndex] = updatedUser;
    
    // Save
    saveToLocalCache();
    // We don't await the DB update to keep UI snappy
    apiSave('users', updatedUser);
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

// --- CLOUD SYNC HELPERS ---

const toDbPayload = (item: any) => {
    return {
        id: item.id,
        data: item,
        timestamp: new Date().toISOString()
    };
};

// API Helper for PostgreSQL backend
const apiSave = async (table: string, data: any) => {
    try {
        await fetch(`${window.location.origin}/api/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.warn(`[Storage] Failed to save ${table} to server`);
    }
};

const apiDelete = async (table: string, id: string) => {
    try {
        await fetch(`${window.location.origin}/api/${table}/${id}`, {
            method: 'DELETE'
        });
    } catch (e) {
        console.warn(`[Storage] Failed to delete ${table} from server`);
    }
};

// Fetch from PostgreSQL API (replaces Supabase calls)
const fetchAllData = async () => {
    const response = await fetch(`${window.location.origin}/api/sync`);
    if (!response.ok) throw new Error('Sync failed');
    return response.json();
};

const mergeUsers = (local: UserProfile[], cloud: UserProfile[]): UserProfile[] => {
    const map = new Map<string, UserProfile>();
    local.forEach(item => map.set(item.username, item));
    cloud.forEach(item => map.set(item.username, item));
    return Array.from(map.values());
};

const mergeData = <T extends { id: string, timestamp?: string }>(local: T[], cloud: T[], deletedIds: string[]): T[] => {
    const map = new Map<string, T>();
    local.forEach(item => { if (!deletedIds.includes(item.id)) map.set(item.id, item); });
    cloud.forEach(item => { if (!deletedIds.includes(item.id)) map.set(item.id, item); });
    return Array.from(map.values()).sort((a, b) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tB - tA;
    });
};

const performCloudSync = async () => {
    const data = await fetchAllData();

    const { users = [], exhibits = [], collections = [], notifications = [], messages = [], guestbook = [] } = data;

    if (users.length > 0) cache.users = mergeUsers(cache.users, users);
    if (exhibits.length > 0) cache.exhibits = mergeData(cache.exhibits, exhibits, cache.deletedIds);
    if (collections.length > 0) cache.collections = mergeData(cache.collections, collections, cache.deletedIds);
    if (notifications.length > 0) cache.notifications = mergeData(cache.notifications, notifications, []);
    if (messages.length > 0) cache.messages = mergeData(cache.messages, messages, []).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    if (guestbook.length > 0) cache.guestbook = mergeData(cache.guestbook, guestbook, []);

    saveToLocalCache();
};

// --- INITIALIZATION ---
export const initializeDatabase = async (): Promise<UserProfile | null> => {
    loadFromLocalCache();

    try {
        console.log("☁️ [Sync] Connecting to NeoArchive (PostgreSQL)...");
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timed out')), 5000)
        );

        await Promise.race([performCloudSync(), timeoutPromise]);

        cache.isLoaded = true;
        isOfflineMode = false;
        console.log("✅ [Sync] Database synchronization complete.");
    } catch (e: any) {
        console.warn("⚠️ [Sync] Database unavailable, switching to OFFLINE MODE.", e.message);
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
    const usernameExists = cache.users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (usernameExists) {
        // If it's a telegram login, assume login if telegram match
        const existing = cache.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if(existing && telegram && existing.telegram === telegram) return existing;
        if(!telegram) throw new Error("НИКНЕЙМ УЖЕ ЗАНЯТ! ВЫБЕРИТЕ ДРУГОЙ.");
    }

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
        password: password
    };

    cache.users.push(userProfile);
    saveToLocalCache();

    // Save to PostgreSQL via API
    try {
        await fetch(`${window.location.origin}/api/users/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userProfile)
        });
    } catch (e) {
        console.warn('[Auth] Failed to save user to server, using local only');
    }

    return userProfile;
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
        cache.users = cache.users.filter(u => u.username !== 'TheArchitect');
        cache.users.push(adminProfile);
        saveToLocalCache();
        return adminProfile;
    }

    // Use local cache for authentication (no server-side auth)
    const localUser = cache.users.find(u => u.email === email && u.password === password);
    if (localUser) return localUser;

    throw new Error("Неверный email или пароль");
};

export const logoutUser = async () => {
    localStorage.removeItem(SESSION_USER_KEY);
};

export const updateUserProfile = async (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    else cache.users.push(user);
    saveToLocalCache();

    // Save to PostgreSQL via API
    try {
        await fetch(`${window.location.origin}/api/users/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
    } catch (e) {
        console.warn('[Storage] Failed to save user to server');
    }
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
  saveToLocalCache();
  await apiSave('exhibits', exhibit);
};

export const updateExhibit = async (updatedExhibit: Exhibit) => {
  const index = cache.exhibits.findIndex(e => e.id === updatedExhibit.id);
  if (index !== -1) {
    cache.exhibits[index] = updatedExhibit;
    saveToLocalCache();
    await apiSave('exhibits', updatedExhibit);
  }
};

export const deleteExhibit = async (id: string) => {
  cache.exhibits = cache.exhibits.filter(e => e.id !== id);
  cache.notifications = cache.notifications.filter(n => n.targetId !== id);
  cache.deletedIds.push(id); 
  saveToLocalCache();
  await apiDelete('exhibits', id);
};

export const getCollections = (): Collection[] => cache.collections;

export const saveCollection = async (collection: Collection) => {
    collection.slug = `${slugify(collection.title)}-${Date.now().toString().slice(-4)}`;
    cache.collections.unshift(collection);
    saveToLocalCache();
    await apiSave('collections', collection);
};

export const updateCollection = async (updatedCollection: Collection) => {
    const index = cache.collections.findIndex(c => c.id === updatedCollection.id);
    if (index !== -1) {
        cache.collections[index] = updatedCollection;
        saveToLocalCache();
        await apiSave('collections', updatedCollection);
    }
};

export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    cache.deletedIds.push(id);
    saveToLocalCache();
    await apiDelete('collections', id);
};

export const getNotifications = (): Notification[] => cache.notifications;

export const saveNotification = async (notif: Notification) => {
    cache.notifications.unshift(notif);
    saveToLocalCache();
    await apiSave('notifications', notif);
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
        saveToLocalCache();
        if (toUpdate.length > 0) {
            const payload = toUpdate.map(n => toDbPayload(n));
            await Promise.all(payload.map((n: any) => apiSave('notifications', n.data)));
        }
    }
};

export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;

export const saveGuestbookEntry = async (entry: GuestbookEntry) => {
    cache.guestbook.push(entry);
    saveToLocalCache();
    await apiSave('guestbook', entry);
};

export const updateGuestbookEntry = async (entry: GuestbookEntry) => {
    const idx = cache.guestbook.findIndex(g => g.id === entry.id);
    if (idx !== -1) {
        cache.guestbook[idx] = entry;
        saveToLocalCache();
        await apiSave('guestbook', entry);
    }
};

export const deleteGuestbookEntry = async (id: string) => {
    cache.guestbook = cache.guestbook.filter(g => g.id !== id);
    saveToLocalCache();
    await apiDelete('guestbook', id);
};

export const getMessages = (): Message[] => cache.messages;

export const saveMessage = async (msg: Message) => {
    cache.messages.push(msg);
    saveToLocalCache();
    await apiSave('messages', msg);
};

export const markMessagesRead = async (sender: string, receiver: string) => {
    const toUpdate: Message[] = [];
    cache.messages.forEach(m => {
        if (m.sender === sender && m.receiver === receiver && !m.isRead) {
            m.isRead = true;
            toUpdate.push(m);
        }
    });
    saveToLocalCache();
    if (toUpdate.length > 0) {
        const payload = toUpdate.map(m => toDbPayload(m));
        await Promise.all(payload.map((m: any) => apiSave('messages', m.data)));
    }
};
