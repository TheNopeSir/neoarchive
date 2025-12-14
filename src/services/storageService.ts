
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
const CACHE_VERSION = '2.5.3-QuotaFix'; 
let isOfflineMode = false;

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
    return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
};

const parseRuDate = (dateStr: string): number => {
    if (!dateStr) return 0;
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.getTime();
        const [datePart, timePart] = dateStr.split(', ');
        if (!datePart || !timePart) return 0;
        const [day, month, year] = datePart.split('.').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
    } catch (e) { return 0; }
};

const saveToLocalCache = () => {
    try {
        const payload = { version: CACHE_VERSION, data: cache };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (e: any) { 
        console.warn("⚠️ [Storage] Cache save failed (Quota Exceeded?):", e.name); 
        // We do not throw here to prevent app crash. The app continues in-memory.
    }
};

const loadFromLocalCache = (): boolean => {
    const json = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (json) {
        try {
            const parsed = JSON.parse(json);
            if (!parsed.version || parsed.version !== CACHE_VERSION) {
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
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return false; 
        }
    }
    return false;
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
                // Aggressive compression: 800px max, 0.5 quality
                const MAX_WIDTH = 800; 
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
                else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.5); 
                    resolve(dataUrl);
                } else { reject(new Error("Canvas context is null")); }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const fileToBase64 = compressImage;

const toDbPayload = (item: any) => ({ id: item.id, data: item, timestamp: new Date().toISOString() });

const fetchTable = async <T>(tableName: string): Promise<T[]> => {
    const { data, error } = await supabase.from(tableName).select('data');
    if (error) return [];
    return (data || []).map((row: any) => row.data).filter((item: any) => item !== null && item !== undefined);
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
    return Array.from(map.values()).sort((a, b) => parseRuDate(b.timestamp || '') - parseRuDate(a.timestamp || ''));
};

const performCloudSync = async () => {
    const [users, exhibits, collections, notifications, messages, guestbook] = 
        await Promise.all([
            fetchTable<UserProfile>('users'),
            fetchTable<Exhibit>('exhibits'),
            fetchTable<Collection>('collections'),
            fetchTable<Notification>('notifications'),
            fetchTable<Message>('messages'),
            fetchTable<GuestbookEntry>('guestbook')
        ]) as [UserProfile[], Exhibit[], Collection[], Notification[], Message[], GuestbookEntry[]];

    if (users.length > 0) cache.users = mergeUsers(cache.users, users);
    if (exhibits.length > 0) cache.exhibits = mergeData(cache.exhibits, exhibits, cache.deletedIds);
    if (collections.length > 0) cache.collections = mergeData(cache.collections, collections, cache.deletedIds);
    if (notifications.length > 0) cache.notifications = mergeData(cache.notifications, notifications, []);
    if (messages.length > 0) cache.messages = mergeData(cache.messages, messages, []).sort((a,b) => parseRuDate(a.timestamp) - parseRuDate(b.timestamp)); 
    if (guestbook.length > 0) cache.guestbook = mergeData(cache.guestbook, guestbook, []);
    saveToLocalCache();
};

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    loadFromLocalCache();
    try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
        await Promise.race([performCloudSync(), timeoutPromise]);
        cache.isLoaded = true;
        isOfflineMode = false;
    } catch (e: any) {
        console.warn("Offline Mode Active");
        isOfflineMode = true;
    }
    const localActiveUser = localStorage.getItem(SESSION_USER_KEY);
    if (localActiveUser) {
        const cachedUser = cache.users.find(u => u.username === localActiveUser);
        if (cachedUser) return cachedUser;
    }
    return null;
};

export const backgroundSync = async (): Promise<boolean> => {
    if (isOfflineMode) return false;
    try { await performCloudSync(); return true; } catch (e) { return false; }
};

export const getFullDatabase = () => ({ ...cache, timestamp: new Date().toISOString() });

export const getSystemStats = () => ({
    totalUsers: cache.users.length || 1,
    onlineUsers: Math.floor(Math.random() * ((cache.users.length || 1) / 2)) + 1
});

export const registerUser = async (username: string, password: string, tagline: string, email: string, telegram?: string): Promise<UserProfile> => {
    const userProfile: UserProfile = { username, email, tagline, telegram, avatarUrl: getUserAvatar(username), joinedDate: new Date().toLocaleString('ru-RU'), following: [], achievements: ['HELLO_WORLD'], isAdmin: false, status: 'ONLINE' };
    cache.users.push(userProfile);
    saveToLocalCache();
    await supabase.from('users').upsert({ username, data: userProfile });
    return userProfile;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
    const user = cache.users.find(u => u.email === email || u.username === email); 
    if (user) return user;
    throw new Error("Пользователь не найден в локальном кэше");
};

export const logoutUser = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_USER_KEY);
};

export const updateUserProfile = async (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user; else cache.users.push(user);
    saveToLocalCache();
    await supabase.from('users').upsert({ username: user.username, data: user });
};

export const getExhibits = (): Exhibit[] => cache.exhibits;
export const saveExhibit = async (exhibit: Exhibit) => {
  exhibit.slug = `${slugify(exhibit.title)}-${Date.now().toString().slice(-4)}`;
  const existingIdx = cache.exhibits.findIndex(e => e.id === exhibit.id);
  if (existingIdx !== -1) cache.exhibits[existingIdx] = exhibit; else cache.exhibits.unshift(exhibit);
  saveToLocalCache();
  await supabase.from('exhibits').upsert(toDbPayload(exhibit));
};
export const updateExhibit = async (updatedExhibit: Exhibit) => {
  const index = cache.exhibits.findIndex(e => e.id === updatedExhibit.id);
  if (index !== -1) { cache.exhibits[index] = updatedExhibit; saveToLocalCache(); await supabase.from('exhibits').upsert(toDbPayload(updatedExhibit)); }
};
export const deleteExhibit = async (id: string) => {
  cache.exhibits = cache.exhibits.filter(e => e.id !== id);
  cache.deletedIds.push(id); 
  saveToLocalCache();
  await supabase.from('exhibits').delete().eq('id', id);
};

export const getCollections = (): Collection[] => cache.collections;
export const saveCollection = async (collection: Collection) => {
    collection.slug = `${slugify(collection.title)}-${Date.now().toString().slice(-4)}`;
    cache.collections.unshift(collection);
    saveToLocalCache();
    await supabase.from('collections').upsert(toDbPayload(collection));
};
export const updateCollection = async (updatedCollection: Collection) => {
    const index = cache.collections.findIndex(c => c.id === updatedCollection.id);
    if (index !== -1) { cache.collections[index] = updatedCollection; saveToLocalCache(); await supabase.from('collections').upsert(toDbPayload(updatedCollection)); }
};
export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    cache.deletedIds.push(id);
    saveToLocalCache();
    await supabase.from('collections').delete().eq('id', id);
};

export const getNotifications = (): Notification[] => cache.notifications;
export const saveNotification = async (notif: Notification) => {
    cache.notifications.unshift(notif);
    saveToLocalCache();
    await supabase.from('notifications').upsert(toDbPayload(notif));
};
export const markNotificationsRead = async (recipient: string) => {
    cache.notifications.forEach(n => { if(n.recipient === recipient) n.isRead = true; });
    saveToLocalCache();
};

export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;
export const saveGuestbookEntry = async (entry: GuestbookEntry) => {
    cache.guestbook.push(entry);
    saveToLocalCache();
    await supabase.from('guestbook').upsert(toDbPayload(entry));
};
export const updateGuestbookEntry = async (entry: GuestbookEntry) => {
    const idx = cache.guestbook.findIndex(g => g.id === entry.id);
    if (idx !== -1) { cache.guestbook[idx] = entry; saveToLocalCache(); await supabase.from('guestbook').upsert(toDbPayload(entry)); }
};
export const deleteGuestbookEntry = async (id: string) => {
    cache.guestbook = cache.guestbook.filter(g => g.id !== id);
    saveToLocalCache();
    await supabase.from('guestbook').delete().eq('id', id);
};

export const getMessages = (): Message[] => cache.messages;
export const saveMessage = async (msg: Message) => {
    cache.messages.push(msg);
    saveToLocalCache();
    await supabase.from('messages').upsert(toDbPayload(msg));
};
export const markMessagesRead = async (sender: string, receiver: string) => {
    cache.messages.forEach(m => { if(m.sender === sender && m.receiver === receiver) m.isRead = true; });
    saveToLocalCache();
};
    