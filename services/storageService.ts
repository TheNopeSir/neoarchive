
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
// BUMP VERSION TO CLEAR CACHE
const CACHE_VERSION = '2.5.0-ForceClear'; 
let isOfflineMode = false;

// --- EXPORTS ---
export const isOffline = () => isOfflineMode;

// Helper for Consistent Avatars
export const getUserAvatar = (username: string): string => {
    const user = cache.users.find(u => u.username === username);
    if (user && user.avatarUrl && !user.avatarUrl.includes('ui-avatars.com')) {
        return user.avatarUrl;
    }
    // Deterministic generation based on username hash
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const color = "00000".substring(0, 6 - c.length) + c;
    return `https://ui-avatars.com/api/?name=${username}&background=${color}&color=fff&bold=true`;
};

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
        const payload = {
            version: CACHE_VERSION,
            data: cache
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) { console.error("Cache Error", e); }
};

const loadFromLocalCache = (): boolean => {
    const json = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (json) {
        try {
            const parsed = JSON.parse(json);
            if (!parsed.version || parsed.version !== CACHE_VERSION) {
                console.log(`♻️ [Cache] Version mismatch (${parsed.version} vs ${CACHE_VERSION}). Clearing cache.`);
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

// --- STORAGE MANAGEMENT (NEW) ---

export const getStorageEstimate = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      if (usage !== undefined && quota !== undefined) {
        return {
          usage,
          quota,
          percentage: (usage / quota) * 100
        };
      }
    } catch (e) {
      console.warn("Storage estimate failed", e);
    }
  }
  return null;
};

export const clearLocalCache = () => {
    try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        // Optional: clear image cache if utilizing specific cache names
        if ('caches' in window) {
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
            });
        }
        window.location.reload();
    } catch(e) {
        console.error("Failed to clear cache", e);
    }
};

export const autoCleanStorage = async () => {
    const estimate = await getStorageEstimate();
    if (estimate && estimate.percentage > 95) {
        console.warn("⚠️ Storage critical (>95%). Auto-cleaning cache...");
        // Keep user session if possible, but clear data
        const sessionUser = localStorage.getItem(SESSION_USER_KEY);
        localStorage.clear();
        if (sessionUser) localStorage.setItem(SESSION_USER_KEY, sessionUser);
        
        window.location.reload(); 
    }
};

// --- PREFERENCES LOGIC ---
export const updateUserPreference = async (username: string, category: string, weight: number) => {
    const userIndex = cache.users.findIndex(u => u.username === username);
    if (userIndex === -1) return;

    const user = cache.users[userIndex];
    const currentPrefs = user.preferences || {};
    const newWeight = (currentPrefs[category] || 0) + weight;
    
    // Update local state
    const updatedUser = { 
        ...user, 
        preferences: { ...currentPrefs, [category]: newWeight } 
    };
    cache.users[userIndex] = updatedUser;
    
    // Save (Debounced save logic would be better in real app, but direct for now)
    saveToLocalCache();
    // We don't await the DB update to keep UI snappy
    supabase.from('users').upsert({ username: user.username, data: updatedUser });
};

// --- IMAGE COMPRESSION UTILITY ---
export const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1080;
                const MAX_HEIGHT = 1080;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const fileToBase64 = compressImage;

// --- CLOUD SYNC HELPERS ---

const toDbPayload = (item: any) => {
    return {
        id: item.id,
        data: item,
        timestamp: new Date().toISOString()
    };
};

const fetchTable = async <T>(tableName: string): Promise<T[]> => {
    const { data, error } = await supabase
        .from(tableName)
        .select('data');

    if (error) return [];

    const items = (data || [])
        .map((row: any) => row.data)
        .filter((item: any) => item !== null && item !== undefined);

    return items;
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
    return Array.from(map.values()).sort((a, b) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tB - tA;
    });
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
    if (messages.length > 0) cache.messages = mergeData(cache.messages, messages, []).sort((a,b) => a.timestamp.localeCompare(b.timestamp)); 
    if (guestbook.length > 0) cache.guestbook = mergeData(cache.guestbook, guestbook, []);
    
    saveToLocalCache();
};

// --- INITIALIZATION ---
export const initializeDatabase = async (): Promise<UserProfile | null> => {
    loadFromLocalCache();

    try {
        console.log("☁️ [Sync] Connecting to NeoArchive Cloud (Supabase)...");
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timed out')), 5000)
        );

        await Promise.race([performCloudSync(), timeoutPromise]);
        
        cache.isLoaded = true;
        isOfflineMode = false;
        console.log("✅ [Sync] Cloud synchronization complete.");
    } catch (e: any) {
        console.warn("⚠️ [Sync] Cloud unavailable, switching to OFFLINE MODE.", e.message);
        isOfflineMode = true;
    }

    const localActiveUser = localStorage.getItem(SESSION_USER_KEY);
    if (localActiveUser) {
        const cachedUser = cache.users.find(u => u.username === localActiveUser);
        if (cachedUser) {
            console.log("🟢 [Auth] Restored via local active session");
            return cachedUser;
        }
    }

    let session = null;
    try {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
    } catch (err) {}
  
    if (session?.user) {
        const username = session.user.user_metadata?.username;
        if (username) {
            const userProfile = cache.users.find(u => u.username === username);
            if (userProfile) return userProfile;
            
            return {
                username: username,
                email: session.user.email || '',
                tagline: 'Restored Session',
                avatarUrl: `https://ui-avatars.com/api/?name=${username}`,
                joinedDate: new Date().toLocaleDateString(),
                following: [],
                achievements: [],
                preferences: {}
            };
        }
    }
    return null;
};

export const backgroundSync = async (): Promise<boolean> => {
    if (isOfflineMode) return false;
    try {
        await performCloudSync();
        return true;
    } catch (e) {
        return false;
    }
};

export const getFullDatabase = () => ({ ...cache, timestamp: new Date().toISOString() });

// --- AUTH & CRUD ---
export const registerUser = async (username: string, password: string, tagline: string, email: string, telegram?: string, avatarUrl?: string): Promise<UserProfile> => {
    const usernameExists = cache.users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (usernameExists) {
        // If it's a telegram login, we might want to return the existing user instead of throwing error if password matches or if it's external auth flow
        const existing = cache.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if(existing && telegram && existing.telegram === telegram) return existing;
        if(!telegram) throw new Error("НИКНЕЙМ УЖЕ ЗАНЯТ! ВЫБЕРИТЕ ДРУГОЙ.");
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
    });

    if (error) throw new Error(error.message);
    // Note: In real world, email confirmation is needed. For demo/TG, we proceed nicely.

    const isSuperAdmin = email === 'admin@neoarchive.net';
    const userProfile: UserProfile = {
        username: isSuperAdmin ? 'TheArchitect' : username,
        email,
        tagline: isSuperAdmin ? 'System Administrator' : tagline,
        avatarUrl: avatarUrl || getUserAvatar(username),
        joinedDate: new Date().toLocaleString('ru-RU'),
        following: [],
        achievements: isSuperAdmin ? ['HELLO_WORLD', 'LEGEND', 'THE_ONE'] : ['HELLO_WORLD'],
        isAdmin: isSuperAdmin,
        telegram: telegram,
        preferences: {},
        password: password // Storing for convenience in this client-side demo only
    };

    cache.users.push(userProfile);
    saveToLocalCache();
    await supabase.from('users').upsert({ username: userProfile.username, data: userProfile });
    
    return userProfile;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
    if (email === 'admin@neoarchive.net' && password === 'neo_super_secret') {
        const adminProfile: UserProfile = {
            username: 'TheArchitect',
            email: 'admin@neoarchive.net',
            tagline: 'System Root',
            avatarUrl: getUserAvatar('TheArchitect'),
            joinedDate: '01.01.1999',
            following: [],
            achievements: ['LEGEND', 'THE_ONE'],
            isAdmin: true,
            status: 'ONLINE',
            preferences: {}
        };
        cache.users = cache.users.filter(u => u.username !== 'TheArchitect');
        cache.users.push(adminProfile);
        saveToLocalCache();
        return adminProfile;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Fallback to local search if offline or network error
    if (error || !data.user) {
        const localUser = cache.users.find(u => u.email === email && u.password === password);
        if (localUser) return localUser;
        if (error) throw new Error(error.message);
        throw new Error("Login failed");
    }

    const username = data.user.user_metadata?.username;
    if (!username) throw new Error("User profile corrupted");

    let userProfile: UserProfile | undefined = cache.users.find(u => u.username === username);

    if (!userProfile) {
        const { data: userData } = await supabase.from('users').select('data').eq('username', username).single();
        if (userData && userData.data) {
            const fetchedProfile = userData.data as UserProfile;
            cache.users.push(fetchedProfile);
            saveToLocalCache();
            userProfile = fetchedProfile;
        } else {
             const newProfile: UserProfile = {
                username,
                email: data.user.email || email,
                tagline: 'Welcome back',
                avatarUrl: getUserAvatar(username),
                joinedDate: new Date().toLocaleString('ru-RU'),
                following: [],
                achievements: [],
                preferences: {}
            };
            await supabase.from('users').upsert({ username, data: newProfile });
            cache.users.push(newProfile);
            saveToLocalCache();
            userProfile = newProfile;
        }
    }

    if (!userProfile) throw new Error("Unable to load user profile.");
    return userProfile;
};

export const logoutUser = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_USER_KEY);
};

export const updateUserProfile = async (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    else cache.users.push(user);
    saveToLocalCache();
    await supabase.from('users').upsert({ username: user.username, data: user });
};

export const getExhibits = (): Exhibit[] => cache.exhibits;

export const saveExhibit = async (exhibit: Exhibit) => {
  exhibit.slug = `${slugify(exhibit.title)}-${Date.now().toString().slice(-4)}`;
  const existingIdx = cache.exhibits.findIndex(e => e.id === exhibit.id);
  if (existingIdx !== -1) {
      cache.exhibits[existingIdx] = exhibit;
  } else {
      cache.exhibits.unshift(exhibit);
  }
  saveToLocalCache();
  await supabase.from('exhibits').upsert(toDbPayload(exhibit));
};

export const updateExhibit = async (updatedExhibit: Exhibit) => {
  const index = cache.exhibits.findIndex(e => e.id === updatedExhibit.id);
  if (index !== -1) {
    cache.exhibits[index] = updatedExhibit;
    saveToLocalCache();
    await supabase.from('exhibits').upsert(toDbPayload(updatedExhibit));
  }
};

export const deleteExhibit = async (id: string) => {
  cache.exhibits = cache.exhibits.filter(e => e.id !== id);
  cache.notifications = cache.notifications.filter(n => n.targetId !== id);
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
    if (index !== -1) {
        cache.collections[index] = updatedCollection;
        saveToLocalCache();
        await supabase.from('collections').upsert(toDbPayload(updatedCollection));
    }
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
    let hasUpdates = false;
    const toUpdate: Notification[] = [];
    cache.notifications.forEach(n => {
        if (n.recipient === recipient && !n.isRead) {
             n.isRead = true;
             toUpdate.push(n);
             hasUpdates = true;
        }
    });
    if (hasUpdates) {
        saveToLocalCache();
        if (toUpdate.length > 0) {
            const payload = toUpdate.map(n => toDbPayload(n));
            await supabase.from('notifications').upsert(payload);
        }
    }
};

export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;

export const saveGuestbookEntry = async (entry: GuestbookEntry) => {
    cache.guestbook.push(entry);
    saveToLocalCache();
    await supabase.from('guestbook').upsert(toDbPayload(entry));
};

export const updateGuestbookEntry = async (entry: GuestbookEntry) => {
    const idx = cache.guestbook.findIndex(g => g.id === entry.id);
    if (idx !== -1) {
        cache.guestbook[idx] = entry;
        saveToLocalCache();
        await supabase.from('guestbook').upsert(toDbPayload(entry));
    }
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
    const toUpdate: Message[] = [];
    cache.messages.forEach(m => {
        if (m.sender === sender && m.receiver === receiver && !m.isRead) {
            m.isRead = true;
            toUpdate.push(m);
        }
    });
    saveToLocalCache();
    if (toUpdate.length > 0) {
        const payload = toUpdate.map(m => toDbPayload(m));
        await supabase.from('messages').upsert(payload);
    }
};
