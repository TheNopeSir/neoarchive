
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

const DEFAULT_USER: UserProfile = { ...MOCK_USER, email: 'neo@matrix.com' };
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
            cache = { ...cache, ...data, isLoaded: true };
            return true;
        } catch (e) { return false; }
    }
    return false;
};

// --- API COMMUNICATIONS ---
const API_URL = '/api';

// Generic Fetch Wrapper
const apiCall = async (endpoint: string, method: string, data?: any) => {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: data ? JSON.stringify(data) : undefined
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e) {
        console.error(`🔴 API Call Failed [${endpoint}]:`, e);
        return null;
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

  // 1. Load optimistic cache
  loadFromLocalCache();

  // 2. Fetch full sync from Server (Postgres or File)
  try {
      const serverData = await apiCall('/sync', 'GET');
      if (serverData) {
          cache.exhibits = serverData.exhibits || [];
          cache.collections = serverData.collections || [];
          cache.notifications = serverData.notifications || [];
          cache.messages = serverData.messages || [];
          cache.guestbook = serverData.guestbook || [];
          cache.users = serverData.users || [];
          
          if (cache.exhibits.length === 0 && cache.collections.length === 0) {
               // First run fallback
               console.log("⚠️ No server data, applying defaults");
               cache.exhibits = [...INITIAL_EXHIBITS];
               cache.collections = [...MOCK_COLLECTIONS];
               cache.notifications = [...MOCK_NOTIFICATIONS];
               cache.messages = [...MOCK_MESSAGES];
               // Sync defaults back to server
               cache.exhibits.forEach(e => apiCall('/exhibits', 'POST', e));
          }
          
          cache.isLoaded = true;
          saveToLocalCache();
      }
  } catch (e) {
      console.warn("⚠️ Server unreachable, running in offline mode");
      if (!cache.isLoaded) {
          cache.exhibits = [...INITIAL_EXHIBITS];
          cache.collections = [...MOCK_COLLECTIONS];
          cache.isLoaded = true;
      }
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
        password, // In a real app, hash this!
        isAdmin: false
    };
    
    const res = await apiCall('/auth/register', 'POST', user);
    if (!res) throw new Error("Server Error");
    
    // Update local cache
    cache.users.push(user);
    saveToLocalCache();
    
    return user;
};

export const loginUser = async (login: string, password: string): Promise<UserProfile> => {
    // In this simple implementation, we check the cache which is synced with the server
    // In a real production app, this should be a POST /auth/login call returning a token
    const user = cache.users.find(u => (u.email === login || u.username === login) && u.password === password);
    if (user) return user;
    
    // Force sync check if not found locally
    const serverData = await apiCall('/sync', 'GET');
    if (serverData && serverData.users) {
        const found = serverData.users.find((u: UserProfile) => (u.email === login || u.username === login) && u.password === password);
        if (found) return found;
    }

    throw new Error("Неверный логин или пароль");
};

export const updateUserProfile = async (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    saveToLocalCache();
    await apiCall('/users/update', 'POST', user);
};

// --- CRUD OPERATIONS ---

export const getExhibits = (): Exhibit[] => cache.exhibits;

export const saveExhibit = async (exhibit: Exhibit) => {
  exhibit.slug = `${slugify(exhibit.title)}-${Date.now().toString().slice(-4)}`;
  cache.exhibits.unshift(exhibit);
  saveToLocalCache();
  await apiCall('/exhibits', 'POST', exhibit);
};

export const updateExhibit = async (updatedExhibit: Exhibit) => {
  const index = cache.exhibits.findIndex(e => e.id === updatedExhibit.id);
  if (index !== -1) {
    cache.exhibits[index] = updatedExhibit;
    saveToLocalCache();
    await apiCall('/exhibits', 'POST', updatedExhibit);
  }
};

export const deleteExhibit = async (id: string) => {
  cache.exhibits = cache.exhibits.filter(e => e.id !== id);
  saveToLocalCache();
  await apiCall(`/exhibits/${id}`, 'DELETE');
};

export const getCollections = (): Collection[] => cache.collections;

export const saveCollection = async (collection: Collection) => {
    collection.slug = `${slugify(collection.title)}-${Date.now().toString().slice(-4)}`;
    cache.collections.unshift(collection);
    saveToLocalCache();
    await apiCall('/collections', 'POST', collection);
};

export const updateCollection = async (updatedCollection: Collection) => {
    const index = cache.collections.findIndex(c => c.id === updatedCollection.id);
    if (index !== -1) {
        cache.collections[index] = updatedCollection;
        saveToLocalCache();
        await apiCall('/collections', 'POST', updatedCollection);
    }
};

export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    saveToLocalCache();
    await apiCall(`/collections/${id}`, 'DELETE');
};

export const getNotifications = (): Notification[] => cache.notifications;

export const saveNotification = async (notif: Notification) => {
    cache.notifications.unshift(notif);
    saveToLocalCache();
    await apiCall('/notifications', 'POST', notif);
};

export const markNotificationsRead = async (recipient: string) => {
    cache.notifications.forEach(n => {
        if (n.recipient === recipient) {
             n.isRead = true;
             // Send update to server for each modified notif (simplified)
             apiCall('/notifications', 'POST', n);
        }
    });
    saveToLocalCache();
};

export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;

export const saveGuestbookEntry = async (entry: GuestbookEntry) => {
    cache.guestbook.push(entry);
    saveToLocalCache();
    await apiCall('/guestbook', 'POST', entry);
};

export const getMessages = (): Message[] => cache.messages;

export const saveMessage = async (msg: Message) => {
    cache.messages.push(msg);
    saveToLocalCache();
    await apiCall('/messages', 'POST', msg);
};

export const markMessagesRead = (sender: string, receiver: string) => {
    cache.messages.forEach(m => {
        if (m.sender === sender && m.receiver === receiver) {
            m.isRead = true;
            apiCall('/messages', 'POST', m);
        }
    });
    saveToLocalCache();
};
