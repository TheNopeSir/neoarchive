import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry } from '../types';
import { INITIAL_EXHIBITS, MOCK_COLLECTIONS, MOCK_NOTIFICATIONS, MOCK_MESSAGES, MOCK_USER } from '../constants';

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
const API_URL = '/api';

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
            cache = { ...cache, ...data, isLoaded: true };
            return true;
        } catch (e) { return false; }
    }
    return false;
};

// --- API COMMUNICATIONS ---
const apiCall = async (endpoint: string, method: string, data?: any) => {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: data ? JSON.stringify(data) : undefined
        });
        
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `API Error: ${res.statusText}`);
        }
        return await res.json();
    } catch (e) {
        console.error(`🔴 API Call Failed [${endpoint}]:`, e);
        throw e; // Пробрасываем ошибку дальше
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

// --- INITIALIZATION ---
export const initializeDatabase = async () => {
  if (cache.isLoaded) return;

  // 1. Load optimistic cache first for speed
  loadFromLocalCache();

  // 2. Fetch full sync from Server (Postgres)
  try {
      const serverData = await apiCall('/sync', 'GET');
      if (serverData) {
          cache.exhibits = serverData.exhibits || [];
          cache.collections = serverData.collections || [];
          cache.notifications = serverData.notifications || [];
          cache.messages = serverData.messages || [];
          cache.guestbook = serverData.guestbook || [];
          cache.users = serverData.users || [];
          
          cache.isLoaded = true;
          saveToLocalCache();
          console.log("✅ Data synced with Timeweb Cloud");
      }
  } catch (e) {
      console.warn("⚠️ Server unreachable, running in cached mode");
  }
};

export const getFullDatabase = () => ({ ...cache, timestamp: new Date().toISOString() });

// --- AUTH ---

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    const user: UserProfile = {
        username,
        email,
        tagline,
        avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=random`,
        joinedDate: new Date().toLocaleString('ru-RU'),
        following: [],
        achievements: ['HELLO_WORLD'],
        password, 
        isAdmin: false
    };
    
    // Register directly against DB
    const res = await apiCall('/auth/register', 'POST', user);
    
    // Update local cache
    cache.users.push(user);
    saveToLocalCache();
    
    return user;
};

export const loginUser = async (login: string, password: string): Promise<UserProfile> => {
    try {
        // Authenticate against Timeweb DB
        const user = await apiCall('/auth/login', 'POST', { login, password });
        return user;
    } catch (e) {
        throw new Error("Неверный логин или пароль");
    }
};

export const updateUserProfile = async (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    saveToLocalCache();
    await apiCall('/users/update', 'POST', user).catch(console.error);
};

// --- CRUD OPERATIONS (Optimistic UI + API Sync) ---

export const getExhibits = (): Exhibit[] => cache.exhibits;

export const saveExhibit = async (exhibit: Exhibit) => {
  exhibit.slug = `${slugify(exhibit.title)}-${Date.now().toString().slice(-4)}`;
  cache.exhibits.unshift(exhibit);
  saveToLocalCache();
  await apiCall('/exhibits', 'POST', exhibit).catch(console.error);
};

export const updateExhibit = async (updatedExhibit: Exhibit) => {
  const index = cache.exhibits.findIndex(e => e.id === updatedExhibit.id);
  if (index !== -1) {
    cache.exhibits[index] = updatedExhibit;
    saveToLocalCache();
    await apiCall('/exhibits', 'POST', updatedExhibit).catch(console.error);
  }
};

export const deleteExhibit = async (id: string) => {
  cache.exhibits = cache.exhibits.filter(e => e.id !== id);
  saveToLocalCache();
  await apiCall(`/exhibits/${id}`, 'DELETE').catch(console.error);
};

export const getCollections = (): Collection[] => cache.collections;

export const saveCollection = async (collection: Collection) => {
    collection.slug = `${slugify(collection.title)}-${Date.now().toString().slice(-4)}`;
    cache.collections.unshift(collection);
    saveToLocalCache();
    await apiCall('/collections', 'POST', collection).catch(console.error);
};

export const updateCollection = async (updatedCollection: Collection) => {
    const index = cache.collections.findIndex(c => c.id === updatedCollection.id);
    if (index !== -1) {
        cache.collections[index] = updatedCollection;
        saveToLocalCache();
        await apiCall('/collections', 'POST', updatedCollection).catch(console.error);
    }
};

export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    saveToLocalCache();
    await apiCall(`/collections/${id}`, 'DELETE').catch(console.error);
};

export const getNotifications = (): Notification[] => cache.notifications;

export const saveNotification = async (notif: Notification) => {
    cache.notifications.unshift(notif);
    saveToLocalCache();
    await apiCall('/notifications', 'POST', notif).catch(console.error);
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
    // Batch updates not supported yet, loop calls (simple for now)
    toUpdate.forEach(n => apiCall('/notifications', 'POST', n).catch(console.error));
};

export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;

export const saveGuestbookEntry = async (entry: GuestbookEntry) => {
    cache.guestbook.push(entry);
    saveToLocalCache();
    await apiCall('/guestbook', 'POST', entry).catch(console.error);
};

export const getMessages = (): Message[] => cache.messages;

export const saveMessage = async (msg: Message) => {
    cache.messages.push(msg);
    saveToLocalCache();
    await apiCall('/messages', 'POST', msg).catch(console.error);
};

export const markMessagesRead = (sender: string, receiver: string) => {
    const toUpdate: Message[] = [];
    cache.messages.forEach(m => {
        if (m.sender === sender && m.receiver === receiver && !m.isRead) {
            m.isRead = true;
            toUpdate.push(m);
        }
    });
    saveToLocalCache();
    toUpdate.forEach(m => apiCall('/messages', 'POST', m).catch(console.error));
};