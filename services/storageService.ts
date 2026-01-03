
import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry, WishlistItem, Guild, Duel, GuildMessage, TradeRequest } from '../types';

// Internal Cache (In-Memory)
let cache = {
    exhibits: [] as Exhibit[],
    collections: [] as Collection[],
    notifications: [] as Notification[],
    messages: [] as Message[],
    users: [] as UserProfile[],
    guestbook: [] as GuestbookEntry[],
    wishlist: [] as WishlistItem[],
    guilds: [] as Guild[],
    guildMessages: {} as Record<string, GuildMessage[]>, // Cache by GuildID
    duels: [] as Duel[],
    tradeRequests: [] as TradeRequest[],
    deletedIds: [] as string[],
    isLoaded: false
};

const DB_NAME = 'NeoArchiveDB';
const STORE_NAME = 'client_cache';
const CACHE_KEY = 'neo_archive_v4'; 
const SESSION_USER_KEY = 'neo_active_user';
const CACHE_VERSION = '5.2.0-Community'; 

let isOfflineMode = false;
let liveUpdateInterval: any = null; 
const API_BASE = '/api';

// --- OBSERVER PATTERN ---
type ChangeListener = () => void;
const listeners: ChangeListener[] = [];

export const subscribe = (listener: ChangeListener) => {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
    };
};

const notifyListeners = () => {
    listeners.forEach(l => l());
};

const idb = {
    open: (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 3);
            request.onupgradeneeded = (e) => {
                const db = (e.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    put: async (key: string, value: any) => {
        const db = await idb.open();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(value, key);
            tx.oncomplete = () => resolve(true);
        });
    },
    get: async (key: string) => {
        const db = await idb.open();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(key);
            req.onsuccess = () => resolve(req.result);
        });
    },
    clear: async () => {
        const db = await idb.open();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        notifyListeners();
    }
};

export const isOffline = () => isOfflineMode;

export const getUserAvatar = (username: string): string => {
    const user = cache.users.find(u => u.username === username);
    if (user?.avatarUrl && !user.avatarUrl.includes('ui-avatars.com')) return user.avatarUrl;
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    const color = (hash & 0x00FFFFFF).toString(16).toUpperCase().padStart(6, '0');
    return `https://ui-avatars.com/api/?name=${username}&background=${color}&color=fff&bold=true`;
};

const slugify = (text: string): string => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/-+$/, '');

const saveToLocalCache = async () => {
    try {
        await idb.put(CACHE_KEY, { version: CACHE_VERSION, data: cache });
    } catch (e) { console.error("Cache Save Error", e); }
};

const loadFromCache = async (): Promise<boolean> => {
    try {
        const stored: any = await idb.get(CACHE_KEY);
        if (stored && (stored.version === CACHE_VERSION || stored.data)) {
            const data = stored.data || stored;
            cache = { ...cache, ...data, isLoaded: true };
            return true;
        }
    } catch (e) { return false; }
    return false;
};

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error("Timeout")), 60000);
    try {
        const options: RequestInit = { 
            method, 
            headers: { 'Content-Type': 'application/json' }, 
            signal: controller.signal 
        };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        clearTimeout(timeoutId);
        if (!res.ok) {
            let errorMsg = `API Error ${res.status}`;
            try {
                const json = await res.json();
                if (json.error) errorMsg = json.error;
            } catch (e) { }
            throw new Error(errorMsg);
        }
        return await res.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError' || error.message === 'Timeout') {
            throw new Error("Сервер долго не отвечает. Попробуйте позже (Timeout).");
        }
        throw error;
    }
};

const checkSuperAdmin = (user: UserProfile) => {
    if (user.email && user.email.toLowerCase().trim() === 'kennyornope@gmail.com') {
        user.isAdmin = true;
    }
};

export const loadFeedBatch = async (page: number, limit: number = 10): Promise<Exhibit[]> => {
    try {
        const items: Exhibit[] = await apiCall(`/feed?page=${page}&limit=${limit}`);
        if (items && items.length > 0) {
            const currentIds = new Set(cache.exhibits.map(e => e.id));
            const newItems = items.filter(item => !currentIds.has(item.id));
            cache.exhibits = [...cache.exhibits, ...newItems].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            await saveToLocalCache();
            notifyListeners(); 
            return items;
        }
        return [];
    } catch (e) {
        const start = (page - 1) * limit;
        const end = start + limit;
        if (cache.exhibits.length >= start) {
            return cache.exhibits.slice(start, end);
        }
        return [];
    }
};

export const startLiveUpdates = () => {
    if (liveUpdateInterval) return;
    console.log("📡 [System] Starting live feed updates...");
    liveUpdateInterval = setInterval(async () => {
        if (isOfflineMode) return;
        try {
            const latestItems: Exhibit[] = await apiCall(`/feed?page=1&limit=10`);
            let hasUpdates = false;
            if (latestItems && latestItems.length > 0) {
                const currentIds = new Set(cache.exhibits.map(e => e.id));
                const newItems = latestItems.filter(item => !currentIds.has(item.id));
                if (newItems.length > 0) {
                    console.log(`✨ [LiveSync] Incoming: ${newItems.length} new artifacts`);
                    cache.exhibits = [...newItems, ...cache.exhibits].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    hasUpdates = true;
                }
            }
            const activeUser = localStorage.getItem(SESSION_USER_KEY);
            if (activeUser) {
                try {
                    const notifs: Notification[] = await apiCall(`/notifications?username=${activeUser}`);
                    if (notifs && notifs.length > 0) {
                        const currentNotifIds = new Set(cache.notifications.map(n => n.id));
                        const newNotifs = notifs.filter(n => !currentNotifIds.has(n.id));
                        if (newNotifs.length > 0) {
                            cache.notifications = [...newNotifs, ...cache.notifications].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                            hasUpdates = true;
                        }
                    }
                } catch(e) {}
            }
            if (hasUpdates) { await saveToLocalCache(); notifyListeners(); }
        } catch (e) { console.warn("[LiveSync] Pulse skipped:", e); }
    }, 8000); 
};

export const stopLiveUpdates = () => {
    if (liveUpdateInterval) { clearInterval(liveUpdateInterval); liveUpdateInterval = null; }
};

const performCloudSync = async () => {
    const activeUser = localStorage.getItem(SESSION_USER_KEY);
    try {
        const initData = await apiCall(activeUser ? `/sync?username=${activeUser}&priority=high` : '/sync?priority=high');
        let hasUpdates = false;
        if (initData.users) { cache.users = initData.users; cache.users.forEach(u => checkSuperAdmin(u)); hasUpdates = true; }
        if (initData.notifications) { cache.notifications = initData.notifications; hasUpdates = true; }
        if (initData.guilds) { cache.guilds = initData.guilds; hasUpdates = true; }
        if (initData.messages) {
            const msgMap = new Map(cache.messages.map(m => [m.id, m]));
            (initData.messages as Message[]).forEach(m => msgMap.set(m.id, m));
            cache.messages = Array.from(msgMap.values()).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
            hasUpdates = true;
        }
        if (initData.exhibits) {
            const serverMap = new Map((initData.exhibits as Exhibit[]).map(e => [e.id, e]));
            cache.exhibits.forEach(e => { if(!serverMap.has(e.id) && !cache.deletedIds.includes(e.id)) serverMap.set(e.id, e); });
            cache.deletedIds.forEach(id => { if(serverMap.has(id)) serverMap.delete(id); });
            cache.exhibits = Array.from(serverMap.values()).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            hasUpdates = true;
        }
        if (initData.collections) {
             const colServerMap = new Map((initData.collections as Collection[]).map(c => [c.id, c]));
             cache.collections.forEach(c => { if(!colServerMap.has(c.id) && !cache.deletedIds.includes(c.id)) colServerMap.set(c.id, c); });
             cache.deletedIds.forEach(id => { if(colServerMap.has(id)) colServerMap.delete(id); });
             cache.collections = Array.from(colServerMap.values());
             hasUpdates = true;
        }
        if (initData.wishlist) {
            const wlMap = new Map((initData.wishlist as WishlistItem[]).map(w => [w.id, w]));
            cache.wishlist.forEach(w => { if (!wlMap.has(w.id) && !cache.deletedIds.includes(w.id)) wlMap.set(w.id, w); });
            cache.deletedIds.forEach(id => { if(wlMap.has(id)) wlMap.delete(id); });
            cache.wishlist = Array.from(wlMap.values());
            hasUpdates = true;
        }
        if (initData.tradeRequests) {
            const trMap = new Map((initData.tradeRequests as TradeRequest[]).map(t => [t.id, t]));
            cache.tradeRequests.forEach(t => { if (!trMap.has(t.id)) trMap.set(t.id, t); });
            cache.tradeRequests = Array.from(trMap.values());
            hasUpdates = true;
        }
        if (initData.guestbook) { cache.guestbook = initData.guestbook; hasUpdates = true; }
        if (hasUpdates) { await saveToLocalCache(); notifyListeners(); }
        isOfflineMode = false;
    } catch (e) { isOfflineMode = true; }
};

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    await loadFromCache();
    cache.users.forEach(u => checkSuperAdmin(u));
    if (cache.exhibits.length === 0 && cache.collections.length === 0) {
        await Promise.race([performCloudSync(), new Promise(resolve => setTimeout(resolve, 3000))]);
    } else { performCloudSync(); }
    const localActiveUser = localStorage.getItem(SESSION_USER_KEY);
    if (localActiveUser) {
        const user = cache.users.find(u => u.username === localActiveUser);
        if (user) { checkSuperAdmin(user); return user; }
    }
    return null;
};

export const forceSync = performCloudSync;
export const getFullDatabase = () => ({ ...cache });

// --- AUTH & USER ---
const checkAndAddHelloAchievement = async (user: UserProfile) => {
    if (!user.achievements) user.achievements = [];
    if (!user.achievements.some(a => a.id === 'HELLO_WORLD')) {
        user.achievements.push({ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true });
        await apiCall('/users/update', 'POST', user);
    }
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
    const res = await apiCall('/auth/login', 'POST', { email, password });
    if (res.success && res.user) {
        checkSuperAdmin(res.user);
        await checkAndAddHelloAchievement(res.user);
        localStorage.setItem(SESSION_USER_KEY, res.user.username);
        const idx = cache.users.findIndex(u => u.username === res.user.username);
        if (idx !== -1) cache.users[idx] = res.user; else cache.users.push(res.user);
        await saveToLocalCache();
        notifyListeners();
        return res.user;
    }
    throw new Error(res.error || "Login failed");
};

export const recoverPassword = async (email: string) => {
    const res = await apiCall('/auth/recover', 'POST', { email });
    if (res.success) return res;
    throw new Error(res.error || "Recovery failed");
};

export const loginViaTelegram = async (user: any) => {
    const res = await apiCall('/auth/telegram', 'POST', user);
    if (res.success && res.user) {
        checkSuperAdmin(res.user);
        await checkAndAddHelloAchievement(res.user);
        localStorage.setItem(SESSION_USER_KEY, res.user.username);
        const idx = cache.users.findIndex(u => u.username === res.user.username);
        if (idx !== -1) cache.users[idx] = res.user; else cache.users.push(res.user);
        await saveToLocalCache();
        notifyListeners();
        return res.user;
    }
    throw new Error(res.error || "Telegram login failed");
};

export const registerUser = async (username: string, password: string, tagline: string, email: string) => {
    const profile = { username, email, tagline, avatarUrl: getUserAvatar(username), joinedDate: new Date().toLocaleString(), following: [], followers: [], achievements: [{id:'HELLO_WORLD', current:1, target:1, unlocked:true}], password, isAdmin: false };
    checkSuperAdmin(profile);
    const res = await apiCall('/auth/register', 'POST', { username, email, password, data: profile });
    if (res.success) return profile;
    throw new Error(res.error || "Registration failed");
};

export const toggleFollow = async (currentUsername: string, targetUsername: string) => {
    const current = cache.users.find(u => u.username === currentUsername);
    let target = cache.users.find(u => u.username === targetUsername);
    if (!current || !target) return;
    if (!current.following) current.following = [];
    if (!target.followers) target.followers = [];
    const isFollowing = current.following.includes(targetUsername);
    if (isFollowing) {
        current.following = current.following.filter(u => u !== targetUsername);
        target.followers = target.followers.filter(u => u !== currentUsername);
    } else {
        current.following = [...current.following, targetUsername];
        target.followers = [...target.followers, currentUsername];
    }
    await saveToLocalCache();
    notifyListeners();
    apiCall('/users/update', 'POST', current).catch(() => {});
    apiCall('/users/update', 'POST', target).catch(() => {});
};

export const updateUserProfile = async (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    await saveToLocalCache();
    notifyListeners();
    await apiCall('/users/update', 'POST', user);
};

const syncItem = async (endpoint: string, item: any) => apiCall(endpoint, 'POST', item).catch((e) => console.warn(`Sync failed for ${endpoint}:`, e.message));

// --- CRUD ---
export const saveExhibit = async (ex: Exhibit) => { ex.slug = `${slugify(ex.title)}-${Date.now().toString().slice(-4)}`; cache.exhibits.unshift(ex); await saveToLocalCache(); notifyListeners(); await syncItem('/exhibits', ex); };
export const updateExhibit = async (ex: Exhibit) => { const idx = cache.exhibits.findIndex(e => e.id === ex.id); if (idx !== -1) cache.exhibits[idx] = ex; await saveToLocalCache(); notifyListeners(); await syncItem('/exhibits', ex); };
export const deleteExhibit = async (id: string) => { cache.exhibits = cache.exhibits.filter(e => e.id !== id); if (!cache.deletedIds.includes(id)) cache.deletedIds.push(id); await saveToLocalCache(); notifyListeners(); await apiCall(`/exhibits/${id}`, 'DELETE').catch(()=>{}); };

export const saveCollection = async (c: Collection) => { c.slug = `${slugify(c.title)}-${Date.now().toString().slice(-4)}`; cache.collections.unshift(c); await saveToLocalCache(); notifyListeners(); await syncItem('/collections', c); };
export const updateCollection = async (c: Collection) => { const idx = cache.collections.findIndex(col => col.id === c.id); if (idx !== -1) cache.collections[idx] = c; await saveToLocalCache(); notifyListeners(); await syncItem('/collections', c); };
export const deleteCollection = async (id: string) => { cache.collections = cache.collections.filter(c => c.id !== id); if (!cache.deletedIds.includes(id)) cache.deletedIds.push(id); await saveToLocalCache(); notifyListeners(); await apiCall(`/collections/${id}`, 'DELETE').catch(()=>{}); };

export const saveWishlistItem = async (item: WishlistItem) => { cache.wishlist.unshift(item); await saveToLocalCache(); notifyListeners(); await syncItem('/wishlist', item); };
export const deleteWishlistItem = async (id: string) => { cache.wishlist = cache.wishlist.filter(w => w.id !== id); if (!cache.deletedIds.includes(id)) cache.deletedIds.push(id); await saveToLocalCache(); notifyListeners(); await apiCall(`/wishlist/${id}`, 'DELETE').catch(()=>{}); };

export const saveMessage = async (msg: Message) => { if (!cache.messages.some(m => m.id === msg.id)) { cache.messages.push(msg); cache.messages.sort((a,b) => a.timestamp.localeCompare(b.timestamp)); await saveToLocalCache(); notifyListeners(); syncItem('/messages', msg); } };

export const markNotificationsRead = async (username: string) => {
    let hasUpdates = false;
    cache.notifications.forEach(n => { if (n.recipient === username && !n.isRead) { n.isRead = true; hasUpdates = true; syncItem('/notifications', n); } });
    if (hasUpdates) { await saveToLocalCache(); notifyListeners(); }
};

export const saveGuestbookEntry = async (e: GuestbookEntry) => { cache.guestbook.push(e); await saveToLocalCache(); notifyListeners(); await syncItem('/guestbook', e); };
export const updateGuestbookEntry = async (e: GuestbookEntry) => { const idx = cache.guestbook.findIndex(g => g.id === e.id); if (idx !== -1) cache.guestbook[idx] = e; await saveToLocalCache(); notifyListeners(); await syncItem('/guestbook', e); };
export const deleteGuestbookEntry = async (id: string) => { cache.guestbook = cache.guestbook.filter(g => g.id !== id); await saveToLocalCache(); notifyListeners(); apiCall(`/guestbook/${id}`, 'DELETE').catch(()=>{}); };

// -- TRADES --
export const sendTradeRequest = async (request: TradeRequest) => {
    cache.tradeRequests.unshift(request);
    
    // Create Notification for receiver
    const notif: Notification = {
        id: crypto.randomUUID(),
        type: 'TRADE_OFFER',
        actor: request.sender,
        recipient: request.receiver,
        timestamp: new Date().toLocaleString(),
        isRead: false,
        targetPreview: 'Новое предложение обмена'
    };
    cache.notifications.unshift(notif);
    
    await saveToLocalCache();
    notifyListeners();
    await syncItem('/trade_requests', request);
    await syncItem('/notifications', notif);
};

export const respondToTradeRequest = async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
    const trade = cache.tradeRequests.find(t => t.id === requestId);
    if (!trade) return;

    trade.status = status;
    await syncItem('/trade_requests', trade);

    if (status === 'ACCEPTED') {
        // Swap Ownership logic
        // 1. Items from Sender -> Receiver
        trade.offeredItems.forEach(itemId => {
            const item = cache.exhibits.find(e => e.id === itemId);
            if (item) {
                item.owner = trade.receiver;
                item.tradeStatus = 'NONE';
                updateExhibit(item);
            }
        });

        // 2. Items from Receiver -> Sender
        trade.requestedItems.forEach(itemId => {
            const item = cache.exhibits.find(e => e.id === itemId);
            if (item) {
                item.owner = trade.sender;
                item.tradeStatus = 'NONE';
                updateExhibit(item);
            }
        });

        // Notify Sender
        const notif: Notification = {
            id: crypto.randomUUID(),
            type: 'TRADE_ACCEPTED',
            actor: trade.receiver,
            recipient: trade.sender,
            timestamp: new Date().toLocaleString(),
            isRead: false,
            targetPreview: 'Обмен принят!'
        };
        cache.notifications.unshift(notif);
        await syncItem('/notifications', notif);
    }

    await saveToLocalCache();
    notifyListeners();
};

// -- GUILDS LOGIC --
export const createGuild = async (guild: Guild) => {
    guild.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    cache.guilds.push(guild);
    const leader = cache.users.find(u => u.username === guild.leader);
    if(leader) { leader.guildId = guild.id; updateUserProfile(leader); }
    await saveToLocalCache();
    notifyListeners();
    await syncItem('/guilds', guild);
};

export const updateGuild = async (guild: Guild) => {
    const idx = cache.guilds.findIndex(g => g.id === guild.id);
    if (idx !== -1) { cache.guilds[idx] = guild; await saveToLocalCache(); notifyListeners(); await syncItem('/guilds', guild); }
};

export const deleteGuild = async (guildId: string) => {
    const guild = cache.guilds.find(g => g.id === guildId);
    if (!guild) return;
    guild.members.forEach(username => { const u = cache.users.find(user => user.username === username); if (u) { u.guildId = undefined; updateUserProfile(u); } });
    cache.guilds = cache.guilds.filter(g => g.id !== guildId);
    await saveToLocalCache();
    notifyListeners();
    await apiCall(`/guilds/${guildId}`, 'DELETE').catch(()=>{});
};

export const joinGuild = async (guildIdOrCode: string, username: string) => {
    let g = cache.guilds.find(g => g.id === guildIdOrCode || g.inviteCode === guildIdOrCode);
    if (!g) return false;
    const u = cache.users.find(u => u.username === username);
    if (g && u && !g.members.includes(username)) {
        if (u.guildId && u.guildId !== g.id) await leaveGuild(u.guildId, username);
        g.members.push(username);
        u.guildId = g.id;
        await updateUserProfile(u);
        await updateGuild(g);
        return true;
    }
    return false;
};

export const leaveGuild = async (guildId: string, username: string) => {
    const g = cache.guilds.find(g => g.id === guildId);
    const u = cache.users.find(u => u.username === username);
    if (g && u) {
        if (g.leader === username) return false; 
        g.members = g.members.filter(m => m !== username);
        u.guildId = undefined;
        await updateUserProfile(u);
        await updateGuild(g);
        return true;
    }
    return false;
};

export const kickFromGuild = async (guildId: string, targetUsername: string) => {
    const g = cache.guilds.find(g => g.id === guildId);
    const u = cache.users.find(u => u.username === targetUsername);
    if (g && u) {
        g.members = g.members.filter(m => m !== targetUsername);
        u.guildId = undefined;
        await updateUserProfile(u);
        await updateGuild(g);
    }
};

// -- GUILD MESSAGING & STASH --
export const loadGuildMessages = async (guildId: string): Promise<GuildMessage[]> => {
    try {
        const msgs = await apiCall(`/guilds/${guildId}/messages`);
        if(msgs) {
            cache.guildMessages[guildId] = msgs;
            notifyListeners();
            return msgs;
        }
        return [];
    } catch(e) { return cache.guildMessages[guildId] || []; }
};

export const sendGuildMessage = async (guildId: string, author: string, text: string) => {
    const msg: GuildMessage = { id: crypto.randomUUID(), guildId, author, text, timestamp: new Date().toISOString() };
    if(!cache.guildMessages[guildId]) cache.guildMessages[guildId] = [];
    cache.guildMessages[guildId].push(msg);
    notifyListeners();
    await apiCall(`/guilds/messages`, 'POST', msg);
};

export const getGuildArtifacts = (guildId: string): Exhibit[] => {
    const guild = cache.guilds.find(g => g.id === guildId);
    if(!guild) return [];
    return cache.exhibits.filter(e => guild.members.includes(e.owner));
};

export const getGuildMessages = (guildId: string) => cache.guildMessages[guildId] || [];

export const logoutUser = () => { localStorage.removeItem(SESSION_USER_KEY); notifyListeners(); };
export const clearLocalCache = async () => { localStorage.removeItem(SESSION_USER_KEY); await idb.clear(); window.location.reload(); };

export const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > 1200 || height > 1200) {
                    if (width > height) { height *= 1200 / width; width = 1200; } 
                    else { width *= 1200 / height; height = 1200; }
                }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
        };
    });
};

export const getStorageEstimate = async () => { if (navigator.storage?.estimate) return await navigator.storage.estimate(); return null; };
