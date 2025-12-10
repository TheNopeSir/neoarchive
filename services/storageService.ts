import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry } from '../types';
import { INITIAL_EXHIBITS, MOCK_COLLECTIONS, MOCK_NOTIFICATIONS, MOCK_MESSAGES, MOCK_USER } from '../constants';
import { supabase } from './supabaseClient';

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
    email: "admin@neoarchive.net",
    tagline: "Admin Construct",
    avatarUrl: "https://ui-avatars.com/api/?name=Admin&background=000&color=fff",
    joinedDate: "01.01.1999",
    following: [],
    password: "trinityisall1",
    isAdmin: true
};

const DEFAULT_USER: UserProfile = { ...MOCK_USER, email: 'neo@matrix.com' };

// --- CORE SERVER SYNC FUNCTIONS ---

// Optimized: Only send what changed
const manageServerData = async (
    action: 'create' | 'update' | 'delete', 
    collection: string, 
    item?: any, 
    id?: string
) => {
    try {
        const response = await fetch(`${API_URL}/data/manage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, collection, item, id })
        });
        if (!response.ok) {
            console.error("Server sync failed");
        }
    } catch (e) {
        console.error("Network error during sync:", e);
    }
};

const loadFromServer = async () => {
    try {
        const res = await fetch(`${API_URL}/db`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        
        // Smart Seeding
        if (data.exhibits && data.exhibits.length > 0) {
            cache.exhibits = data.exhibits;
        } else {
            console.log("⚠️ [Storage] Server exhibits empty, seeding initial data...");
            cache.exhibits = INITIAL_EXHIBITS;
            await fetch(`${API_URL}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'exhibits', data: INITIAL_EXHIBITS })});
        }

        if (data.collections && data.collections.length > 0) {
            cache.collections = data.collections;
        } else {
            cache.collections = MOCK_COLLECTIONS;
             await fetch(`${API_URL}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'collections', data: MOCK_COLLECTIONS })});
        }

        if (data.notifications && data.notifications.length > 0) {
            cache.notifications = data.notifications;
        } else {
            cache.notifications = MOCK_NOTIFICATIONS;
             await fetch(`${API_URL}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'notifications', data: MOCK_NOTIFICATIONS })});
        }

        if (data.messages && data.messages.length > 0) {
            cache.messages = data.messages;
        } else {
            cache.messages = MOCK_MESSAGES;
             await fetch(`${API_URL}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'messages', data: MOCK_MESSAGES })});
        }

        cache.guestbook = data.guestbook || [];
        
        // Load mock users to cache, but we will mostly rely on Supabase for current user
        if (!data.users || !Array.isArray(data.users) || data.users.length === 0) {
            cache.users = [DEFAULT_USER, ADMIN_USER];
             await fetch(`${API_URL}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'users', data: cache.users })});
        } else {
            cache.users = data.users;
            if (!cache.users.find(u => u.username === 'truester')) {
                cache.users.push(ADMIN_USER);
                manageServerData('create', 'users', ADMIN_USER);
            }
        }

        cache.isLoaded = true;
    } catch (e) {
        console.warn("Server offline or unreachable", e);
        cache.exhibits = INITIAL_EXHIBITS;
        cache.collections = MOCK_COLLECTIONS;
        cache.notifications = MOCK_NOTIFICATIONS;
        cache.messages = MOCK_MESSAGES;
        cache.users = [DEFAULT_USER, ADMIN_USER];
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

// --- AUTHENTICATION (SUPABASE) ---

// Helper to map Supabase User to UserProfile
const mapSupabaseUser = (sbUser: any): UserProfile => {
    return {
        username: sbUser.user_metadata?.username || sbUser.email?.split('@')[0] || 'Unknown',
        email: sbUser.email || '',
        tagline: sbUser.user_metadata?.tagline || 'Новый пользователь',
        avatarUrl: `https://ui-avatars.com/api/?name=${sbUser.user_metadata?.username || 'U'}&background=random`,
        joinedDate: new Date(sbUser.created_at).toLocaleDateString('ru-RU'),
        following: [],
        achievements: [],
        isAdmin: false
    };
};

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    await initializeDatabase(); 
    
    // Supabase Registration
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username,
                tagline
            }
        }
    });

    if (error) {
        console.error("Supabase SignUp Error:", error);
        throw new Error(error.message);
    }

    if (data.user) {
        // We create a local profile copy for caching purposes immediately
        const newUser = mapSupabaseUser(data.user);
        
        // Optional: Save to local mock DB so other users can "see" this new user in lists
        // In a real app, you'd have a 'profiles' table in Supabase
        cache.users.push(newUser);
        manageServerData('create', 'users', newUser);
        
        return newUser;
    }
    
    throw new Error("Неизвестная ошибка регистрации");
};

export const loginUser = async (login: string, password: string): Promise<UserProfile> => {
    await initializeDatabase();
    
    // Supabase Login
    const { data, error } = await supabase.auth.signInWithPassword({
        email: login,
        password: password
    });

    if (error) {
        console.error("Supabase SignIn Error:", error);
        throw new Error("Неверный логин или пароль");
    }

    if (data.user) {
        const userProfile = mapSupabaseUser(data.user);
        
        // Ensure local cache has this user (sync if missing)
        if (!cache.users.find(u => u.username === userProfile.username)) {
            cache.users.push(userProfile);
        }
        
        return userProfile;
    }

    throw new Error("Пользователь не найден");
};

export const updateUserProfile = (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) { cache.users[idx] = user; } else { cache.users.push(user); }
    
    manageServerData('update', 'users', user);
    
    const currentSessionStr = localStorage.getItem('neo_user');
    if (currentSessionStr) {
        const currentSession = JSON.parse(currentSessionStr);
        if (currentSession.username === user.username) {
             localStorage.setItem('neo_user', JSON.stringify(user));
        }
    }
    
    // NOTE: In a full implementation, we should also update Supabase metadata here
    // supabase.auth.updateUser({ data: { tagline: user.tagline } });
};

// --- EXHIBITS CRUD ---
export const getExhibits = (): Exhibit[] => cache.exhibits;

export const saveExhibit = (exhibit: Exhibit) => {
  cache.exhibits.unshift(exhibit);
  manageServerData('create', 'exhibits', exhibit);
};

export const updateExhibit = (updatedExhibit: Exhibit) => {
  const index = cache.exhibits.findIndex(e => e.id === updatedExhibit.id);
  if (index !== -1) {
    cache.exhibits[index] = updatedExhibit;
    manageServerData('update', 'exhibits', updatedExhibit);
  }
};

export const deleteExhibit = (id: string) => {
  cache.exhibits = cache.exhibits.filter(e => e.id !== id);
  manageServerData('delete', 'exhibits', null, id);
};

// --- COLLECTIONS CRUD ---
export const getCollections = (): Collection[] => cache.collections;

export const saveCollection = (collection: Collection) => {
    cache.collections.unshift(collection);
    manageServerData('create', 'collections', collection);
};

export const updateCollection = (updatedCollection: Collection) => {
    const index = cache.collections.findIndex(c => c.id === updatedCollection.id);
    if (index !== -1) {
        cache.collections[index] = updatedCollection;
        manageServerData('update', 'collections', updatedCollection);
    }
};

export const deleteCollection = (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    manageServerData('delete', 'collections', null, id);
};

// --- MESSAGES / NOTIFICATIONS ---
export const getMessages = (): Message[] => cache.messages;

export const saveMessage = (msg: Message) => {
    cache.messages.push(msg);
    manageServerData('create', 'messages', msg);
};

export const markMessagesRead = (sender: string, receiver: string) => {
    // This involves multiple updates, so we loop through cache and send updates
    // In a real DB we would send a query, but here we iterate
    cache.messages.forEach(m => {
        if (m.sender === sender && m.receiver === receiver && !m.isRead) {
            m.isRead = true;
            manageServerData('update', 'messages', m);
        }
    });
};

export const getNotifications = (): Notification[] => cache.notifications;

export const saveNotification = (notif: Notification) => {
    cache.notifications.unshift(notif);
    manageServerData('create', 'notifications', notif);
}

export const markNotificationsRead = (recipient: string) => {
    cache.notifications.forEach(n => {
        if (n.recipient === recipient && !n.isRead) {
            n.isRead = true;
            manageServerData('update', 'notifications', n);
        }
    });
}

// --- GUESTBOOK ---
export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;

export const saveGuestbookEntry = (entry: GuestbookEntry) => {
    cache.guestbook.push(entry);
    manageServerData('create', 'guestbook', entry);
};