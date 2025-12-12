import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry } from '../types';

// API Base URL - определяем автоматически
const API_BASE = window.location.origin;

// Cache TTL Configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 минут
let lastSyncTime = 0;

// Internal Cache
let cache = {
    exhibits: [] as Exhibit[],
    collections: [] as Collection[],
    notifications: [] as Notification[],
    messages: [] as Message[],
    users: [] as UserProfile[],
    guestbook: [] as GuestbookEntry[],
    isLoaded: false
};

const LOCAL_STORAGE_KEY = 'neo_archive_client_cache';
const LAST_SYNC_KEY = 'neo_archive_last_sync';

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
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cache));
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    } catch (e) { 
        console.error("Cache Error", e); 
    }
};

const loadFromLocalCache = (): boolean => {
    const json = localStorage.getItem(LOCAL_STORAGE_KEY);
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    
    if (lastSync) {
        lastSyncTime = parseInt(lastSync, 10);
    }
    
    if (json) {
        try {
            const data = JSON.parse(json);
            cache = {
                exhibits: data.exhibits || [],
                collections: data.collections || [],
                notifications: data.notifications || [],
                messages: data.messages || [],
                users: data.users || [],
                guestbook: data.guestbook || [],
                isLoaded: true
            };
            return true;
        } catch (e) { 
            console.error("Failed to parse cache:", e);
            return false; 
        }
    }
    return false;
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// --- API HELPERS WITH RETRY LOGIC ---
const apiCall = async (
    endpoint: string, 
    options: RequestInit = {}, 
    retries = 3,
    timeout = 30000 // 30 секунд
) => {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error: any) {
            console.error(`API Error [${endpoint}] attempt ${attempt + 1}/${retries}:`, error.message);
            
            // Если это последняя попытка - выбрасываем ошибку
            if (attempt === retries - 1) {
                throw error;
            }
            
            // Exponential backoff: 1s, 2s, 4s
            const delay = 1000 * Math.pow(2, attempt);
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // Эта строка никогда не должна выполниться, но TypeScript требует return
    throw new Error('Max retries exceeded');
};

// --- INITIALIZATION WITH TTL ---
export const initializeDatabase = async (): Promise<UserProfile | null> => {
    // 1. Load optimistic cache first
    const cacheLoaded = loadFromLocalCache();
    
    // 2. Check if cache is fresh enough
    const now = Date.now();
    const cacheAge = now - lastSyncTime;
    
    if (cacheLoaded && cacheAge < CACHE_TTL) {
        console.log(`⚡ Using cached data (${Math.round(cacheAge / 1000)}s old), skipping server sync`);
        
        // Restore session from localStorage
        const storedUser = localStorage.getItem('neo_user');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch (e) {
                localStorage.removeItem('neo_user');
            }
        }
        return null;
    }
    
    // 3. Sync with server (cache expired or doesn't exist)
    try {
        console.log("☁️ [Sync] Connecting to server API...");
        const data = await apiCall('/api/sync', {}, 3, 30000);
        
        if (data.users) cache.users = data.users;
        if (data.exhibits) cache.exhibits = data.exhibits;
        if (data.collections) cache.collections = data.collections;
        if (data.notifications) cache.notifications = data.notifications;
        if (data.messages) {
            cache.messages = data.messages.sort((a: Message, b: Message) => 
                a.timestamp.localeCompare(b.timestamp)
            );
        }
        if (data.guestbook) cache.guestbook = data.guestbook;
        
        cache.isLoaded = true;
        lastSyncTime = now;
        saveToLocalCache();
        console.log("✅ [Sync] Server synchronization complete.");
    } catch (e: any) {
        console.warn("⚠️ [Sync] Server unavailable, running in offline mode:", e.message);
        
        // If we have cached data, use it even if expired
        if (cacheLoaded) {
            console.log("📦 Using stale cache as fallback");
        }
    }

    // 4. Restore session
    const storedUser = localStorage.getItem('neo_user');
    if (storedUser) {
        try {
            return JSON.parse(storedUser);
        } catch (e) {
            localStorage.removeItem('neo_user');
        }
    }
    
    return null;
};

// Force refresh (bypass cache)
export const forceRefresh = async (): Promise<void> => {
    console.log("🔄 Forcing data refresh...");
    lastSyncTime = 0; // Reset TTL
    await initializeDatabase();
};

export const getFullDatabase = () => ({ 
    ...cache, 
    timestamp: new Date().toISOString(),
    lastSync: new Date(lastSyncTime).toISOString()
});

// --- AUTH ---
export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    const userProfile: UserProfile = {
        username,
        email,
        tagline,
        avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=random`,
        joinedDate: new Date().toLocaleString('ru-RU'),
        following: [],
        achievements: ['HELLO_WORLD'],
        isAdmin: false
    };

    // Save to server with retry
    await apiCall('/api/users/update', {
        method: 'POST',
        body: JSON.stringify(userProfile)
    }, 3, 15000);

    // Update cache
    cache.users.push(userProfile);
    saveToLocalCache();
    localStorage.setItem('neo_user', JSON.stringify(userProfile));
    
    return userProfile;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
    const username = email.split('@')[0];
    
    let userProfile = cache.users.find(u => u.email === email || u.username === username);
    
    if (!userProfile) {
        throw new Error("Пользователь не найден. Пожалуйста, зарегистрируйтесь.");
    }
    
    localStorage.setItem('neo_user', JSON.stringify(userProfile));
    return userProfile;
};

export const logoutUser = async () => {
    localStorage.removeItem('neo_user');
};

export const updateUserProfile = async (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    saveToLocalCache();
    
    await apiCall('/api/users/update', {
        method: 'POST',
        body: JSON.stringify(user)
    }, 3, 15000);
};

// --- EXHIBITS ---
export const getExhibits = (): Exhibit[] => cache.exhibits;

export const saveExhibit = async (exhibit: Exhibit) => {
    exhibit.slug = `${slugify(exhibit.title)}-${Date.now().toString().slice(-4)}`;
    cache.exhibits.unshift(exhibit);
    saveToLocalCache();
    
    await apiCall('/api/exhibits', {
        method: 'POST',
        body: JSON.stringify(exhibit)
    }, 3, 15000);
};

export const updateExhibit = async (updatedExhibit: Exhibit) => {
    const index = cache.exhibits.findIndex(e => e.id === updatedExhibit.id);
    if (index !== -1) {
        cache.exhibits[index] = updatedExhibit;
        saveToLocalCache();
        
        await apiCall('/api/exhibits', {
            method: 'POST',
            body: JSON.stringify(updatedExhibit)
        }, 3, 15000);
    }
};

export const deleteExhibit = async (id: string) => {
    cache.exhibits = cache.exhibits.filter(e => e.id !== id);
    saveToLocalCache();
    
    await apiCall(`/api/exhibits/${id}`, {
        method: 'DELETE'
    }, 3, 15000);
};

// --- COLLECTIONS ---
export const getCollections = (): Collection[] => cache.collections;

export const saveCollection = async (collection: Collection) => {
    collection.slug = `${slugify(collection.title)}-${Date.now().toString().slice(-4)}`;
    cache.collections.unshift(collection);
    saveToLocalCache();
    
    await apiCall('/api/collections', {
        method: 'POST',
        body: JSON.stringify(collection)
    }, 3, 15000);
};

export const updateCollection = async (updatedCollection: Collection) => {
    const index = cache.collections.findIndex(c => c.id === updatedCollection.id);
    if (index !== -1) {
        cache.collections[index] = updatedCollection;
        saveToLocalCache();
        
        await apiCall('/api/collections', {
            method: 'POST',
            body: JSON.stringify(updatedCollection)
        }, 3, 15000);
    }
};

export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    saveToLocalCache();
    
    await apiCall(`/api/collections/${id}`, {
        method: 'DELETE'
    }, 3, 15000);
};

// --- NOTIFICATIONS ---
export const getNotifications = (): Notification[] => cache.notifications;

export const saveNotification = async (notif: Notification) => {
    cache.notifications.unshift(notif);
    saveToLocalCache();
    
    await apiCall('/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notif)
    }, 3, 10000);
};

export const markNotificationsRead = async (recipient: string) => {
    const toUpdate: Notification[] = [];
    cache.notifications.forEach(n => {
        if (n.recipient === recipient && !n.isRead) {
            n.isRead = true;
            toUpdate.push(n);
        }
    });
    saveToLocalCache();
    
    // Update on server in parallel (fire and forget pattern for better UX)
    for (const n of toUpdate) {
        apiCall('/api/notifications', {
            method: 'POST',
            body: JSON.stringify(n)
        }, 2, 10000).catch(err => {
            console.warn('Failed to sync notification read status:', err);
        });
    }
};

// --- GUESTBOOK ---
export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;

export const saveGuestbookEntry = async (entry: GuestbookEntry) => {
    cache.guestbook.push(entry);
    saveToLocalCache();
    
    await apiCall('/api/guestbook', {
        method: 'POST',
        body: JSON.stringify(entry)
    }, 3, 15000);
};

// --- MESSAGES ---
export const getMessages = (): Message[] => cache.messages;

export const saveMessage = async (msg: Message) => {
    cache.messages.push(msg);
    saveToLocalCache();
    
    await apiCall('/api/messages', {
        method: 'POST',
        body: JSON.stringify(msg)
    }, 3, 15000);
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
    
    // Update on server in parallel (fire and forget pattern)
    for (const m of toUpdate) {
        apiCall('/api/messages', {
            method: 'POST',
            body: JSON.stringify(m)
        }, 2, 10000).catch(err => {
            console.warn('Failed to sync message read status:', err);
        });
    }
};

// --- UTILITY FUNCTIONS ---
export const isOffline = () => {
    return !cache.isLoaded;
};

export const getUserByUsername = (username: string): UserProfile | undefined => {
    return cache.users.find(u => u.username === username);
};

export const getAllUsers = (): UserProfile[] => {
    return cache.users;
};

export const getCacheAge = (): number => {
    return Date.now() - lastSyncTime;
};

export const isCacheFresh = (): boolean => {
    return getCacheAge() < CACHE_TTL;
};