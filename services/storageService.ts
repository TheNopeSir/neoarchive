import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry } from '../types';

// API Base URL - определяем автоматически
const API_BASE = window.location.origin;

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
    } catch (e) { console.error("Cache Error", e); }
};

const loadFromLocalCache = (): boolean => {
    const json = localStorage.getItem(LOCAL_STORAGE_KEY);
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
        } catch (e) { return false; }
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

// --- API HELPERS ---
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        return await response.json();
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
};

// --- INITIALIZATION ---
export const initializeDatabase = async (): Promise<UserProfile | null> => {
    // 1. Load optimistic cache first
    loadFromLocalCache();

    // 2. Sync with server
    try {
        console.log("☁️ [Sync] Connecting to server API...");
        const data = await apiCall('/api/sync');
        
        if (data.users) cache.users = data.users;
        if (data.exhibits) cache.exhibits = data.exhibits;
        if (data.collections) cache.collections = data.collections;
        if (data.notifications) cache.notifications = data.notifications;
        if (data.messages) cache.messages = data.messages.sort((a: Message, b: Message) => 
            a.timestamp.localeCompare(b.timestamp)
        );
        if (data.guestbook) cache.guestbook = data.guestbook;
        
        cache.isLoaded = true;
        saveToLocalCache();
        console.log("✅ [Sync] Server synchronization complete.");
    } catch (e) {
        console.warn("⚠️ [Sync] Server unavailable, running in offline mode:", e);
    }

    // 3. Check for stored session
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

export const getFullDatabase = () => ({ ...cache, timestamp: new Date().toISOString() });

// --- AUTH ---
export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    // Create profile
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

    // Save to server
    await apiCall('/api/users/update', {
        method: 'POST',
        body: JSON.stringify(userProfile)
    });

    // Update cache
    cache.users.push(userProfile);
    saveToLocalCache();
    localStorage.setItem('neo_user', JSON.stringify(userProfile));
    
    return userProfile;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
    // In this simplified version, we just check if user exists
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
    });
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
    });
};

export const updateExhibit = async (updatedExhibit: Exhibit) => {
    const index = cache.exhibits.findIndex(e => e.id === updatedExhibit.id);
    if (index !== -1) {
        cache.exhibits[index] = updatedExhibit;
        saveToLocalCache();
        
        await apiCall('/api/exhibits', {
            method: 'POST',
            body: JSON.stringify(updatedExhibit)
        });
    }
};

export const deleteExhibit = async (id: string) => {
    cache.exhibits = cache.exhibits.filter(e => e.id !== id);
    saveToLocalCache();
    
    await apiCall(`/api/exhibits/${id}`, {
        method: 'DELETE'
    });
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
    });
};

export const updateCollection = async (updatedCollection: Collection) => {
    const index = cache.collections.findIndex(c => c.id === updatedCollection.id);
    if (index !== -1) {
        cache.collections[index] = updatedCollection;
        saveToLocalCache();
        
        await apiCall('/api/collections', {
            method: 'POST',
            body: JSON.stringify(updatedCollection)
        });
    }
};

export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    saveToLocalCache();
    
    await apiCall(`/api/collections/${id}`, {
        method: 'DELETE'
    });
};

// --- NOTIFICATIONS ---
export const getNotifications = (): Notification[] => cache.notifications;

export const saveNotification = async (notif: Notification) => {
    cache.notifications.unshift(notif);
    saveToLocalCache();
    
    await apiCall('/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notif)
    });
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
    
    for (const n of toUpdate) {
        await apiCall('/api/notifications', {
            method: 'POST',
            body: JSON.stringify(n)
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
    });
};

// --- MESSAGES ---
export const getMessages = (): Message[] => cache.messages;

export const saveMessage = async (msg: Message) => {
    cache.messages.push(msg);
    saveToLocalCache();
    
    await apiCall('/api/messages', {
        method: 'POST',
        body: JSON.stringify(msg)
    });
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
    
    for (const m of toUpdate) {
        await apiCall('/api/messages', {
            method: 'POST',
            body: JSON.stringify(m)
        });
    }
};

export const isOffline = () => {
    return !cache.isLoaded;
};

export const getUserByUsername = (username: string): UserProfile | undefined => {
    return cache.users.find(u => u.username === username);
};

export const getAllUsers = (): UserProfile[] => {
    return cache.users;
};