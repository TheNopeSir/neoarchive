
import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry, WishlistItem, Guild, Duel, TradeRequest, TradeRequestStatus, TradeType, NotificationType } from '../types';

// INTERNAL IN-MEMORY CACHE (НЕ сохраняем в localStorage - только сессия)
let cache = {
    exhibits: [] as Exhibit[],
    collections: [] as Collection[],
    notifications: [] as Notification[],
    messages: [] as Message[],
    users: [] as UserProfile[],
    guestbook: [] as GuestbookEntry[],
    wishlist: [] as WishlistItem[],
    guilds: [] as Guild[],
    duels: [] as Duel[],
    tradeRequests: [] as TradeRequest[],
    lastSync: 0
};

const SESSION_USER_KEY = 'neo_active_user';
const API_BASE = '/api';

// Очистка всех старых кэшей при загрузке
(() => {
    localStorage.removeItem('neo_archive_db_cache_v3');
    localStorage.removeItem('neo_archive_db_cache_v2');
    localStorage.removeItem('neo_archive_db_cache_v1');
    localStorage.removeItem('neo_archive_db_cache');
    localStorage.removeItem('neo_archive_cache_version');
})();

// --- OBSERVER PATTERN ---
type ChangeListener = () => void;
const listeners: ChangeListener[] = [];

type ToastListener = (n: Notification) => void;
const toastListeners: ToastListener[] = [];

export const subscribeToToasts = (listener: ToastListener) => {
    toastListeners.push(listener);
    return () => {
        const index = toastListeners.indexOf(listener);
        if (index > -1) toastListeners.splice(index, 1);
    };
};

export const subscribe = (listener: ChangeListener) => {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
    };
};

const notifyListeners = () => listeners.forEach(l => l());

// --- API HELPER ---
const API_TIMEOUT = 15000;

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
        const headers: any = { 'Content-Type': 'application/json' };
        const options: RequestInit = { method, headers, signal: controller.signal };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(`${API_BASE}${endpoint}`, options);
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API Error ${res.status}: ${errText.slice(0, 100)}`);
        }
        return await res.json();
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            throw new Error(`Request timeout: ${endpoint}`);
        }
        throw e;
    }
};

export const isOffline = () => !navigator.onLine;

export const getUserAvatar = (username: string): string => {
    if (!username) return 'https://ui-avatars.com/api/?name=NA&background=000&color=fff';
    const u = cache.users.find(u => u.username === username);
    if (u?.avatarUrl) return u.avatarUrl;
    return `https://ui-avatars.com/api/?name=${username}&background=random&color=fff&bold=true`;
};

// --- CORE FUNCTIONS ---

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    console.log('[Init] Starting...');
    const activeUser = localStorage.getItem(SESSION_USER_KEY);

    try {
        // Fetch feed
        const feed = await apiCall('/feed');
        if (Array.isArray(feed)) {
            cache.exhibits = feed;
            console.log(`[Init] Loaded ${feed.length} exhibits`);
        }

        // Fetch user data if logged in
        if (activeUser) {
            const syncData = await apiCall(`/sync?username=${activeUser}`);
            if (syncData.users?.length > 0) {
                const user = syncData.users[0];
                cache.users = [user];
                cache.collections = syncData.collections || [];

                try {
                    const notifs = await apiCall(`/notifications?username=${activeUser}`);
                    if (Array.isArray(notifs)) cache.notifications = notifs;
                } catch {}

                notifyListeners();
                console.log('[Init] Complete with user:', user.username);
                return user;
            }
        }
    } catch (e) {
        console.warn("[Init] Sync failed:", e);
    }

    notifyListeners();
    console.log('[Init] Complete as guest');
    return null;
};

// AUTH
export const loginUser = async (identifier: string, password: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/login', 'POST', { identifier, password });
    localStorage.setItem(SESSION_USER_KEY, user.username);
    cache.users = [user];
    notifyListeners();
    return user;
};

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/register', 'POST', { username, password, tagline, email });
    localStorage.setItem(SESSION_USER_KEY, user.username);
    cache.users = [user];
    notifyListeners();
    return user;
};

export const logoutUser = async () => {
    localStorage.removeItem(SESSION_USER_KEY);
    cache.users = [];
    notifyListeners();
    window.location.reload();
};

export const loginViaTelegram = async (tgUser: any) => {
    const user = await apiCall('/auth/telegram', 'POST', tgUser);
    localStorage.setItem(SESSION_USER_KEY, user.username);
    cache.users = [user];
    notifyListeners();
    return user;
};

export const recoverPassword = async (email: string) => {
    return await apiCall('/auth/recover', 'POST', { email });
};

// DATA OPERATIONS
export const getFullDatabase = () => ({ ...cache });

export const saveExhibit = async (e: Exhibit) => {
    cache.exhibits.unshift(e);
    notifyListeners();
    await apiCall('/exhibits', 'POST', e);
};

export const updateExhibit = async (e: Exhibit) => {
    const idx = cache.exhibits.findIndex(x => x.id === e.id);
    if (idx !== -1) cache.exhibits[idx] = e;
    notifyListeners();
    await apiCall('/exhibits', 'POST', e);
};

export const deleteExhibit = async (id: string) => {
    cache.exhibits = cache.exhibits.filter(e => e.id !== id);
    notifyListeners();
    await apiCall(`/exhibits/${id}`, 'DELETE');
};

export const saveCollection = async (c: Collection) => {
    cache.collections.push(c);
    notifyListeners();
    await apiCall('/collections', 'POST', c);
};

export const updateCollection = async (c: Collection) => {
    cache.collections = cache.collections.map(col => col.id === c.id ? c : col);
    notifyListeners();
    await apiCall('/collections', 'POST', c);
};

export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    notifyListeners();
    await apiCall(`/collections/${id}`, 'DELETE');
};

export const saveWishlistItem = async (w: WishlistItem) => {
    cache.wishlist.push(w);
    notifyListeners();
    await apiCall('/wishlist', 'POST', w);
};

export const deleteWishlistItem = async (id: string) => {
    cache.wishlist = cache.wishlist.filter(w => w.id !== id);
    notifyListeners();
    await apiCall(`/wishlist/${id}`, 'DELETE');
};

export const saveGuestbookEntry = async (e: GuestbookEntry) => {
    cache.guestbook.push(e);
    notifyListeners();
    await apiCall('/guestbook', 'POST', e);
};

export const updateGuestbookEntry = async (e: GuestbookEntry) => {
    cache.guestbook = cache.guestbook.map(g => g.id === e.id ? e : g);
    notifyListeners();
    await apiCall('/guestbook', 'POST', e);
};

export const deleteGuestbookEntry = async (id: string) => {
    cache.guestbook = cache.guestbook.filter(g => g.id !== id);
    notifyListeners();
    await apiCall(`/guestbook/${id}`, 'DELETE');
};

export const updateUserProfile = async (u: UserProfile) => {
    const idx = cache.users.findIndex(us => us.username === u.username);
    if (idx !== -1) cache.users[idx] = u;
    notifyListeners();
    await apiCall('/users', 'POST', { id: u.username, ...u });
};

export const createNotification = async (r:string, t:NotificationType, a:string, id?:string, p?:string) => {
    const notif: Notification = {
        id: crypto.randomUUID(),
        type: t,
        recipient: r,
        actor: a,
        targetId: id,
        targetPreview: p,
        timestamp: new Date().toISOString(),
        isRead: false
    };
    await apiCall('/notifications', 'POST', notif);
};

export const saveMessage = async (m: Message) => {
    cache.messages.push(m);
    notifyListeners();
    await apiCall('/messages', 'POST', m);
};

// Utils
export const calculateFeedScore = (item: Exhibit, user: UserProfile) => {
    return new Date(item.timestamp).getTime();
};

export const fetchExhibitById = async (id: string) => {
    try {
        return await apiCall(`/exhibits/${id}`);
    } catch { return null; }
};

export const fetchCollectionById = async (id: string) => {
    try {
        return await apiCall(`/collections/${id}`);
    } catch { return null; }
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const startLiveUpdates = () => {};
export const stopLiveUpdates = () => {};

export const getStorageEstimate = async (): Promise<StorageEstimate | undefined> => {
    if (navigator.storage && navigator.storage.estimate) {
        return await navigator.storage.estimate();
    }
    return undefined;
};

export const clearLocalCache = async () => {
    localStorage.clear();
    window.location.reload();
};

export const markNotificationsRead = (u:string) => {
    cache.notifications.forEach(n => { if(n.recipient === u) n.isRead = true; });
    notifyListeners();
};

export const toggleFollow = async (me:string, them:string) => {
    const myUser = cache.users.find(u => u.username === me);
    if(myUser) {
        if(myUser.following.includes(them)) {
            myUser.following = myUser.following.filter(u => u !== them);
        } else {
            myUser.following.push(them);
        }
        updateUserProfile(myUser);
    }
};

export const createGuild = async (g:Guild) => {};
export const joinGuild = async (code:string, u:string) => true;
export const leaveGuild = async (gid:string, u:string) => true;
export const kickFromGuild = async (gid:string, u:string) => {};
export const deleteGuild = async (gid:string) => {};
export const getMyTradeRequests = () => ({ incoming: [], outgoing: [], history: [], active: [], actionRequired: [] });
export const sendTradeRequest = async (p: any) => {};
export const acceptTradeRequest = async (id:string) => {};
export const updateTradeStatus = async (id:string, s:string) => {};
export const completeTradeRequest = async (id:string) => {};
