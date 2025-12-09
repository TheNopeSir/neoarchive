


import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry } from '../types';
import { INITIAL_EXHIBITS, MOCK_COLLECTIONS, MOCK_NOTIFICATIONS, MOCK_MESSAGES, MOCK_USER } from '../constants';

const API_URL = '/api'; 

let cache = {
    exhibits: [] as Exhibit[],
    collections: [] as Collection[],
    notifications: [] as Notification[],
    messages: [] as Message[],
    users: [] as UserProfile[],
    guestbook: [] as GuestbookEntry[],
    isLoaded: false
};

const ADMIN_USER: UserProfile = {
    username: "truester",
    tagline: "Admin Construct",
    avatarUrl: "https://ui-avatars.com/api/?name=Admin&background=000&color=fff",
    joinedDate: "01.01.1999",
    following: [],
    password: "trinityisall1",
    isAdmin: true
};

const syncWithServer = async (key: string, data: any) => {
    try {
        await fetch(`${API_URL}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, data })
        });
    } catch (e) {
        console.error("Sync failed:", e);
    }
};

const loadFromServer = async () => {
    try {
        const res = await fetch(`${API_URL}/db`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        
        // Smart Seeding: If server DB is empty, use initial mocks and sync them back
        if (data.exhibits && data.exhibits.length > 0) {
            cache.exhibits = data.exhibits;
        } else {
            console.log("⚠️ [Storage] Server exhibits empty, seeding initial data...");
            cache.exhibits = INITIAL_EXHIBITS;
            syncWithServer('exhibits', INITIAL_EXHIBITS);
        }

        if (data.collections && data.collections.length > 0) {
            cache.collections = data.collections;
        } else {
            cache.collections = MOCK_COLLECTIONS;
            syncWithServer('collections', MOCK_COLLECTIONS);
        }

        if (data.notifications && data.notifications.length > 0) {
            cache.notifications = data.notifications;
        } else {
            cache.notifications = MOCK_NOTIFICATIONS;
            syncWithServer('notifications', MOCK_NOTIFICATIONS);
        }

        if (data.messages && data.messages.length > 0) {
            cache.messages = data.messages;
        } else {
            cache.messages = MOCK_MESSAGES;
            syncWithServer('messages', MOCK_MESSAGES);
        }

        cache.guestbook = data.guestbook || [];
        
        if (!data.users || !Array.isArray(data.users) || data.users.length === 0) {
            cache.users = [MOCK_USER, ADMIN_USER];
            syncWithServer('users', [MOCK_USER, ADMIN_USER]);
        } else {
            cache.users = data.users;
            // Ensure admin exists even if loaded from Partial DB
            if (!cache.users.find(u => u.username === 'truester')) {
                cache.users.push(ADMIN_USER);
                syncWithServer('users', cache.users);
            }
        }

        cache.isLoaded = true;
    } catch (e) {
        console.warn("Server offline or unreachable", e);
        // Fallback for offline mode
        cache.exhibits = INITIAL_EXHIBITS;
        cache.collections = MOCK_COLLECTIONS;
        cache.notifications = MOCK_NOTIFICATIONS;
        cache.messages = MOCK_MESSAGES;
        cache.users = [MOCK_USER, ADMIN_USER];
        cache.isLoaded = true;
    }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const initializeDatabase = async () => {
  if (!cache.isLoaded) {
      await loadFromServer();
  }
};

export const resetDatabase = async () => {
    await fetch(`${API_URL}/reset`, { method: 'POST' });
    window.location.reload();
};

export const getFullDatabase = () => {
    return { ...cache, timestamp: new Date().toISOString() };
};

export const restoreDatabase = (jsonData: string) => {
    try {
        const data = JSON.parse(jsonData);
        if (data.exhibits) { cache.exhibits = data.exhibits; syncWithServer('exhibits', data.exhibits); }
        if (data.collections) { cache.collections = data.collections; syncWithServer('collections', data.collections); }
        if (data.notifications) { cache.notifications = data.notifications; syncWithServer('notifications', data.notifications); }
        if (data.messages) { cache.messages = data.messages; syncWithServer('messages', data.messages); }
        if (data.users) { cache.users = data.users; syncWithServer('users', data.users); }
        if (data.guestbook) { cache.guestbook = data.guestbook; syncWithServer('guestbook', data.guestbook); }
        return true;
    } catch (e) {
        console.error("Restore failed", e);
        return false;
    }
};

// --- AUTHENTICATION ---
export const registerUser = async (username: string, password: string, tagline: string): Promise<UserProfile> => {
    await initializeDatabase(); 
    const existing = cache.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) throw new Error("ПОЛЬЗОВАТЕЛЬ УЖЕ СУЩЕСТВУЕТ");

    const newUser: UserProfile = {
        username: username,
        tagline: tagline || "Новый пользователь",
        avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=random`,
        joinedDate: new Date().toLocaleDateString('ru-RU'),
        following: [],
        password: password,
        isAdmin: false
    };

    cache.users.push(newUser);
    await syncWithServer('users', cache.users);
    return newUser;
};

export const loginUser = async (username: string, password: string): Promise<UserProfile> => {
    await initializeDatabase();
    const user = cache.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) throw new Error("ПОЛЬЗОВАТЕЛЬ НЕ НАЙДЕН");
    if (user.password !== password) throw new Error("НЕВЕРНЫЙ ПАРОЛЬ");
    return user;
};

// Social Login Simulation
export const loginViaProvider = async (provider: string): Promise<UserProfile> => {
    await initializeDatabase();
    
    // Map providers to specific demo user handles to keep the database clean
    // or create unique ones if preferred. Here we use singleton demo users.
    const socialUsernames: Record<string, string> = {
        'Google': 'Google_Agent',
        'Yandex': 'Yandex_Droid',
        'GitHub': 'Git_Runner',
        'Discord': 'Discord_Bot'
    };
    
    const targetUsername = socialUsernames[provider] || `${provider}_User`;
    
    let user = cache.users.find(u => u.username === targetUsername);

    if (!user) {
        // Create the social user if they don't exist
        user = {
            username: targetUsername,
            tagline: `Сигнал верифицирован: ${provider}`,
            avatarUrl: `https://ui-avatars.com/api/?name=${provider.substring(0,2)}&background=random&length=1`,
            joinedDate: new Date().toLocaleDateString('ru-RU'),
            following: [],
            password: Math.random().toString(36), // Random password effectively disables password login
            isAdmin: false
        };
        cache.users.push(user);
        await syncWithServer('users', cache.users);
    }
    return user;
};

export const updateUserProfile = (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) { cache.users[idx] = user; } else { cache.users.push(user); }
    syncWithServer('users', cache.users);
    const currentSessionStr = localStorage.getItem('neo_user');
    if (currentSessionStr) {
        const currentSession = JSON.parse(currentSessionStr);
        if (currentSession.username === user.username) {
             localStorage.setItem('neo_user', JSON.stringify(user));
        }
    }
};

// --- EXHIBITS CRUD ---
export const getExhibits = (): Exhibit[] => cache.exhibits;

export const saveExhibit = (exhibit: Exhibit) => {
  cache.exhibits.unshift(exhibit);
  syncWithServer('exhibits', cache.exhibits);
};

export const updateExhibit = (updatedExhibit: Exhibit) => {
  const index = cache.exhibits.findIndex(e => e.id === updatedExhibit.id);
  if (index !== -1) {
    cache.exhibits[index] = updatedExhibit;
    syncWithServer('exhibits', cache.exhibits);
  }
};

export const deleteExhibit = (id: string) => {
  cache.exhibits = cache.exhibits.filter(e => e.id !== id);
  syncWithServer('exhibits', cache.exhibits);
};

// --- COLLECTIONS CRUD ---
export const getCollections = (): Collection[] => cache.collections;

export const saveCollection = (collection: Collection) => {
    cache.collections.unshift(collection);
    syncWithServer('collections', cache.collections);
};

export const updateCollection = (updatedCollection: Collection) => {
    const index = cache.collections.findIndex(c => c.id === updatedCollection.id);
    if (index !== -1) {
        cache.collections[index] = updatedCollection;
        syncWithServer('collections', cache.collections);
    }
};

export const deleteCollection = (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    syncWithServer('collections', cache.collections);
};

// --- MESSAGES / NOTIFICATIONS ---
export const getMessages = (): Message[] => cache.messages;

export const saveMessage = (msg: Message) => {
    cache.messages.push(msg);
    syncWithServer('messages', cache.messages);
};

export const markMessagesRead = (sender: string, receiver: string) => {
    let hasChanges = false;
    cache.messages.forEach(m => {
        if (m.sender === sender && m.receiver === receiver && !m.isRead) {
            m.isRead = true;
            hasChanges = true;
        }
    });
    if (hasChanges) syncWithServer('messages', cache.messages);
};

export const getNotifications = (): Notification[] => cache.notifications;

export const saveNotification = (notif: Notification) => {
    cache.notifications.unshift(notif);
    syncWithServer('notifications', cache.notifications);
}

export const markNotificationsRead = (recipient: string) => {
    let hasChanges = false;
    cache.notifications.forEach(n => {
        if (n.recipient === recipient && !n.isRead) {
            n.isRead = true;
            hasChanges = true;
        }
    });
    if (hasChanges) syncWithServer('notifications', cache.notifications);
}

// --- GUESTBOOK ---
export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;

export const saveGuestbookEntry = (entry: GuestbookEntry) => {
    cache.guestbook.push(entry);
    syncWithServer('guestbook', cache.guestbook);
};