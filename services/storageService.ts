
import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry, WishlistItem, Guild, Duel, TradeRequest, TradeRequestStatus, TradeType, NotificationType } from '../types';

// INTERNAL IN-MEMORY CACHE
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

const CACHE_STORAGE_KEY = 'neo_archive_db_cache_v3'; // v3: forced cache reset
const CACHE_VERSION = 'neo_archive_cache_version';
const SESSION_USER_KEY = 'neo_active_user';
const API_BASE = '/api';

// Проверка версии кэша - очищаем старые данные при обновлении
const checkCacheVersion = () => {
    const currentVersion = '3';
    const storedVersion = localStorage.getItem(CACHE_VERSION);
    if (storedVersion !== currentVersion) {
        console.log(`[Cache] Version mismatch (${storedVersion} -> ${currentVersion}), clearing old data...`);
        // Очищаем старые версии кэша
        localStorage.removeItem('neo_archive_db_cache_v2');
        localStorage.removeItem('neo_archive_db_cache_v1');
        localStorage.removeItem('neo_archive_db_cache');
        localStorage.setItem(CACHE_VERSION, currentVersion);
    }
};

// Вызываем при загрузке модуля
checkCacheVersion(); 

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

// --- PERSISTENCE HELPERS ---

// Ограничения для кэша
const CACHE_LIMITS = {
    exhibits: 50,      // максимум экспонатов в кэше
    notifications: 30, // максимум уведомлений
    messages: 50,      // максимум сообщений
    guestbook: 30,     // максимум записей гостевой
};

// Очистка кэша от старых данных
const trimCache = () => {
    // Оставляем только последние N элементов для каждого типа
    if (cache.exhibits.length > CACHE_LIMITS.exhibits) {
        // Сохраняем черновики и последние N
        const drafts = cache.exhibits.filter(e => e.isDraft);
        const rest = cache.exhibits.filter(e => !e.isDraft).slice(0, CACHE_LIMITS.exhibits - drafts.length);
        cache.exhibits = [...drafts, ...rest];
    }
    if (cache.notifications.length > CACHE_LIMITS.notifications) {
        cache.notifications = cache.notifications.slice(0, CACHE_LIMITS.notifications);
    }
    if (cache.messages.length > CACHE_LIMITS.messages) {
        cache.messages = cache.messages.slice(-CACHE_LIMITS.messages);
    }
    if (cache.guestbook.length > CACHE_LIMITS.guestbook) {
        cache.guestbook = cache.guestbook.slice(-CACHE_LIMITS.guestbook);
    }
};

const saveCacheToLocal = () => {
    try {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
        // QuotaExceededError - localStorage переполнен
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
            console.warn("⚠️ localStorage quota exceeded, trimming cache...");
            trimCache();
            try {
                localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
                console.log("✅ Cache saved after trimming");
            } catch (e2) {
                // Всё ещё не помещается - очищаем полностью
                console.error("❌ Cache still too large, clearing...");
                localStorage.removeItem(CACHE_STORAGE_KEY);
            }
        } else {
            console.error("Cache save failed", e);
        }
    }
};

const loadCacheFromLocal = () => {
    try {
        const stored = localStorage.getItem(CACHE_STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            cache = { ...cache, ...data };
            // Превентивная очистка при загрузке
            trimCache();
            notifyListeners();
        }
    } catch (e) {
        console.error("Cache load failed", e);
        // Если кэш повреждён - удаляем
        localStorage.removeItem(CACHE_STORAGE_KEY);
    }
};

// --- API HELPER ---
const API_TIMEOUT = 10000; // 10 секунд таймаут

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    const startTime = Date.now();

    console.log(`[API] ${method} ${endpoint} - starting...`);

    try {
        const headers: any = { 'Content-Type': 'application/json' };
        const options: RequestInit = { method, headers, signal: controller.signal };
        if (body) options.body = JSON.stringify(body);

        const fullPath = `${API_BASE}${endpoint}`;
        const res = await fetch(fullPath, options);

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        console.log(`[API] ${method} ${endpoint} - ${res.status} (${duration}ms)`);

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API Error ${res.status}: ${errText.slice(0, 100)}`);
        }
        return await res.json();
    } catch (e: any) {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        if (e.name === 'AbortError') {
            console.error(`⏱️ API Timeout [${endpoint}]: ${duration}ms (limit: ${API_TIMEOUT}ms)`);
            throw new Error(`Request timeout: ${endpoint}`);
        }
        const message = e.message || String(e);
        console.error(`❌ API Failed [${endpoint}]: ${message} (${duration}ms)`);
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
    console.log('[Init] Starting database initialization...');

    // 1. FAST LOAD
    loadCacheFromLocal();
    console.log('[Init] Local cache loaded');

    const activeUser = localStorage.getItem(SESSION_USER_KEY);
    console.log(`[Init] Active user session: ${activeUser || 'none'}`);

    // 2. BACKGROUND SYNC
    try {
        // Health Check
        try {
            await apiCall('/health');
            console.log('[Init] Backend health check passed');
        } catch(e) {
            console.warn("[Init] Backend offline or proxy error");
        }

        // Fetch global feed
        console.log('[Init] Fetching feed...');
        const feed = await apiCall('/feed');
        if (Array.isArray(feed)) {
            const drafts = cache.exhibits.filter(e => e.isDraft);
            const serverItems = feed.filter(e => !drafts.find(d => d.id === e.id));
            cache.exhibits = [...drafts, ...serverItems];
            console.log(`[SYNC] Loaded ${feed.length} exhibits from server.`);
        }

        // Fetch User Data if logged in
        if (activeUser) {
            console.log(`[Init] Syncing user data for: ${activeUser}`);
            const syncData = await apiCall(`/sync?username=${activeUser}`);
            if (syncData.users && syncData.users.length > 0) {
                const freshUser = syncData.users[0];
                const idx = cache.users.findIndex(u => u.username === freshUser.username);
                if (idx !== -1) cache.users[idx] = freshUser;
                else cache.users.push(freshUser);

                cache.collections = syncData.collections || [];

                try {
                    const notifs = await apiCall(`/notifications?username=${activeUser}`);
                    if (Array.isArray(notifs)) cache.notifications = notifs;
                } catch(e) {
                    console.warn('[Init] Failed to fetch notifications');
                }

                saveCacheToLocal();
                notifyListeners();
                console.log('[Init] Initialization complete with user');
                return freshUser;
            }
        }
    } catch (e) {
        console.warn("[Init] Background sync failed - showing cached data", e);
    }

    saveCacheToLocal();
    notifyListeners();
    const cachedUser = cache.users.find(u => u.username === activeUser) || null;
    console.log(`[Init] Initialization complete. User: ${cachedUser?.username || 'guest'}`);
    return cachedUser;
};

// AUTH
export const loginUser = async (identifier: string, password: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/login', 'POST', { identifier, password });
    localStorage.setItem(SESSION_USER_KEY, user.username);
    
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    else cache.users.push(user);
    
    saveCacheToLocal();
    notifyListeners();
    return user;
};

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/register', 'POST', { username, password, tagline, email });
    localStorage.setItem(SESSION_USER_KEY, user.username);
    cache.users.push(user);
    saveCacheToLocal();
    notifyListeners();
    return user;
};

export const logoutUser = async () => { 
    localStorage.removeItem(SESSION_USER_KEY); 
    notifyListeners(); 
    window.location.reload();
};

export const loginViaTelegram = async (tgUser: any) => { 
    const user = await apiCall('/auth/telegram', 'POST', tgUser);
    localStorage.setItem(SESSION_USER_KEY, user.username);
    cache.users.push(user);
    saveCacheToLocal();
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
    saveCacheToLocal();
};

export const updateExhibit = async (e: Exhibit) => { 
    const idx = cache.exhibits.findIndex(x => x.id === e.id);
    if (idx !== -1) {
        cache.exhibits[idx] = e;
        notifyListeners();
    }
    await apiCall('/exhibits', 'POST', e);
    saveCacheToLocal();
};

export const deleteExhibit = async (id: string) => { 
    cache.exhibits = cache.exhibits.filter(e => e.id !== id); 
    notifyListeners();
    await apiCall(`/exhibits/${id}`, 'DELETE');
    saveCacheToLocal();
};

export const saveCollection = async (c: Collection) => {
    cache.collections.push(c);
    notifyListeners();
    await apiCall('/collections', 'POST', c);
    saveCacheToLocal();
};

export const updateCollection = async (c: Collection) => {
    cache.collections = cache.collections.map(col => col.id === c.id ? c : col);
    notifyListeners();
    await apiCall('/collections', 'POST', c);
    saveCacheToLocal();
};

export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    notifyListeners();
    await apiCall(`/collections/${id}`, 'DELETE');
    saveCacheToLocal();
};

export const saveWishlistItem = async (w: WishlistItem) => {
    cache.wishlist.push(w);
    notifyListeners();
    await apiCall('/wishlist', 'POST', w);
    saveCacheToLocal();
};

export const deleteWishlistItem = async (id: string) => {
    cache.wishlist = cache.wishlist.filter(w => w.id !== id);
    notifyListeners();
    await apiCall(`/wishlist/${id}`, 'DELETE');
    saveCacheToLocal();
};

export const saveGuestbookEntry = async (e: GuestbookEntry) => {
    cache.guestbook.push(e);
    notifyListeners();
    await apiCall('/guestbook', 'POST', e);
    saveCacheToLocal();
};

export const updateGuestbookEntry = async (e: GuestbookEntry) => {
    cache.guestbook = cache.guestbook.map(g => g.id === e.id ? e : g);
    notifyListeners();
    await apiCall('/guestbook', 'POST', e);
    saveCacheToLocal();
};

export const deleteGuestbookEntry = async (id: string) => {
    cache.guestbook = cache.guestbook.filter(g => g.id !== id);
    notifyListeners();
    await apiCall(`/guestbook/${id}`, 'DELETE');
    saveCacheToLocal();
};

export const updateUserProfile = async (u: UserProfile) => {
    const idx = cache.users.findIndex(us => us.username === u.username);
    if (idx !== -1) cache.users[idx] = u;
    notifyListeners();
    await apiCall('/users', 'POST', { id: u.username, ...u });
    saveCacheToLocal();
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
    saveCacheToLocal();
};

// Utils
export const calculateFeedScore = (item: Exhibit, user: UserProfile) => {
    return new Date(item.timestamp).getTime();
};

export const fetchExhibitById = async (id: string) => {
    try {
        const item = await apiCall(`/exhibits/${id}`);
        return item;
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
    localStorage.removeItem(CACHE_STORAGE_KEY);
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
