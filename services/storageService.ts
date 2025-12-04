
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
        
        cache.exhibits = data.exhibits || INITIAL_EXHIBITS;
        cache.collections = data.collections || MOCK_COLLECTIONS;
        cache.notifications = data.notifications || MOCK_NOTIFICATIONS;
        cache.messages = data.messages || MOCK_MESSAGES;
        cache.guestbook = data.guestbook || [];
        
        if (!data.users || !Array.isArray(data.users)) {
            cache.users = [];
        } else {
            cache.users = data.users;
        }

        cache.isLoaded = true;
    } catch (e) {
        console.warn("Server offline or unreachable", e);
        cache.exhibits = INITIAL_EXHIBITS;
        cache.users = [MOCK_USER];
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
        isAdmin: username === 'truester'
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

// --- MESSAGES / NOTIFICATIONS ---
export const getMessages = (): Message[] => cache.messages;

export const saveMessage = (msg: Message) => {
    cache.messages.push(msg);
    syncWithServer('messages', cache.messages);
};

export const getNotifications = (): Notification[] => cache.notifications;

// --- GUESTBOOK ---
export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;

export const saveGuestbookEntry = (entry: GuestbookEntry) => {
    cache.guestbook.push(entry);
    syncWithServer('guestbook', cache.guestbook);
};
