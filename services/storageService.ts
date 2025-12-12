

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
    isLoaded: false
};

const LOCAL_STORAGE_KEY = 'neo_archive_client_cache';
const SESSION_USER_KEY = 'neo_active_user';
let isOfflineMode = false;

// --- EXPORTS ---
export const isOffline = () => isOfflineMode;

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
            // Ensure arrays exist
            cache = {
                exhibits: data.exhibits || [],
                collections: data.collections || [],
                notifications: data.notifications || [],
                messages: data.messages || [],
                users: data.users || [],
                guestbook: data.guestbook || [],
                isLoaded: true
            };
            return true;
        } catch (e) { return false; }
    }
    return false;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// --- CLOUD SYNC HELPERS ---

// Helper to wrap object for JSONB storage pattern used in this app
const toDbPayload = (item: any) => {
    return {
        id: item.id,
        data: item,
        // We still send timestamp for future use, but won't rely on it for sorting in SQL query
        timestamp: new Date().toISOString()
    };
};

// Helper to fetch and unwrap data with IN-MEMORY sorting
const fetchTable = async <T>(tableName: string): Promise<T[]> => {
    // We removed .order('timestamp') because the column might not exist on the table schema.
    // We will sort in JavaScript instead.
    const { data, error } = await supabase
        .from(tableName)
        .select('data');

    if (error) {
        console.warn(`[Sync] Warning fetching ${tableName}:`, error.message);
        // Return empty array on error so Promise.all doesn't fail for one table
        return [];
    }

    // Unwrap the 'data' column and Filter nulls
    const items = (data || [])
        .map((row: any) => row.data)
        .filter((item: any) => item !== null && item !== undefined);

    // Sort by timestamp descending (Newest first) if timestamp exists in the JSON data
    items.sort((a: any, b: any) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tB - tA; 
    });

    return items;
};

// --- INITIALIZATION ---
export const initializeDatabase = async (): Promise<UserProfile | null> => {
    // 1. Load optimistic cache first (Fastest visual load)
    loadFromLocalCache();

    // 2. Direct Cloud Sync (Supabase)
    try {
        console.log("☁️ [Sync] Connecting to NeoArchive Cloud (Supabase)...");
        
        // Timeout protection (5 seconds)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timed out')), 5000)
        );

        const syncPromise = Promise.all([
            fetchTable<UserProfile>('users'),
            fetchTable<Exhibit>('exhibits'),
            fetchTable<Collection>('collections'),
            fetchTable<Notification>('notifications'),
            fetchTable<Message>('messages'),
            fetchTable<GuestbookEntry>('guestbook')
        ]);

        const [users, exhibits, collections, notifications, messages, guestbook] = 
            await Promise.race([syncPromise, timeoutPromise]) as [UserProfile[], Exhibit[], Collection[], Notification[], Message[], GuestbookEntry[]];

        // Merge logic: prefer cloud data.
        if (users.length > 0) cache.users = users;
        if (exhibits.length > 0) cache.exhibits = exhibits;
        if (collections.length > 0) cache.collections = collections;
        if (notifications.length > 0) cache.notifications = notifications;
        if (messages.length > 0) cache.messages = messages.sort((a,b) => a.timestamp.localeCompare(b.timestamp)); 
        if (guestbook.length > 0) cache.guestbook = guestbook;
        
        cache.isLoaded = true;
        isOfflineMode = false;
        saveToLocalCache();
        console.log("✅ [Sync] Cloud synchronization complete.");
    } catch (e: any) {
        console.warn("⚠️ [Sync] Cloud unavailable, switching to OFFLINE MODE.", e.message);
        isOfflineMode = true;
    }

    // 3. Restore Session
    // 3a. Try Local Storage "Remember Me" session first (Resilience against network issues/reloads)
    const localActiveUser = localStorage.getItem(SESSION_USER_KEY);
    if (localActiveUser) {
        const cachedUser = cache.users.find(u => u.username === localActiveUser);
        if (cachedUser) {
            console.log("🟢 [Auth] Restored via local active session");
            return cachedUser;
        }
    }

    // 3b. Try Supabase Auth Session
    let session = null;
    try {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
    } catch (err) {
        console.warn("⚠️ [Auth] Failed to restore session", err);
    }
  
    if (session?.user) {
        // Just use metadata if available, or find in synced users
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
                achievements: []
            };
        }
    }
    return null;
};

export const getFullDatabase = () => ({ ...cache, timestamp: new Date().toISOString() });

// --- AUTH ---

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    // 1. Auth with Supabase
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
    });

    if (error) throw new Error(error.message);
    // Note: Supabase often requires email confirmation. 
    if (!data.user) throw new Error("Подтвердите email для завершения регистрации");

    // Superadmin Hook (If registered via normal means, this catches it too)
    const isSuperAdmin = email === 'admin@neoarchive.net';

    // 2. Create Profile Object
    const userProfile: UserProfile = {
        username: isSuperAdmin ? 'TheArchitect' : username,
        email,
        tagline: isSuperAdmin ? 'System Administrator' : tagline,
        avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=${isSuperAdmin ? '000000' : 'random'}&color=fff`,
        joinedDate: new Date().toLocaleString('ru-RU'),
        following: [],
        achievements: isSuperAdmin ? ['HELLO_WORLD', 'LEGEND', 'THE_ONE'] : ['HELLO_WORLD'],
        isAdmin: isSuperAdmin
    };

    // 3. Update Cache & Persist
    cache.users.push(userProfile);
    saveToLocalCache();
    // 'users' table usually has 'username' as PK and 'data' as JSONB
    await supabase.from('users').upsert({ username: userProfile.username, data: userProfile });
    
    return userProfile;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
    // 🕵️ BACKDOOR FOR SUPERADMIN (Offline/Emergency Access)
    if (email === 'admin@neoarchive.net' && password === 'neo_super_secret') {
        const adminProfile: UserProfile = {
            username: 'TheArchitect',
            email: 'admin@neoarchive.net',
            tagline: 'System Root',
            avatarUrl: 'https://ui-avatars.com/api/?name=Root&background=000&color=fff',
            joinedDate: '01.01.1999',
            following: [],
            achievements: ['LEGEND', 'THE_ONE'],
            isAdmin: true,
            status: 'ONLINE'
        };
        
        // Remove duplicate if exists in cache
        cache.users = cache.users.filter(u => u.username !== 'TheArchitect');
        cache.users.push(adminProfile);
        saveToLocalCache();
        
        console.log("🔓 [Auth] Superadmin Access Granted");
        return adminProfile;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Login failed");

    const username = data.user.user_metadata?.username;
    if (!username) throw new Error("User profile corrupted");

    // Sync profile check
    // Explicitly define type to allow for undefined initially
    let userProfile: UserProfile | undefined = cache.users.find(u => u.username === username);

    if (!userProfile) {
        // Try fetch specifically in case global sync missed it
        const { data: userData } = await supabase.from('users').select('data').eq('username', username).single();
        if (userData && userData.data) {
            // Explicit cast
            const fetchedProfile = userData.data as UserProfile;
            cache.users.push(fetchedProfile);
            saveToLocalCache();
            userProfile = fetchedProfile;
        } else {
             // Fallback: create default profile if missing from DB
             const newProfile: UserProfile = {
                username,
                email: data.user.email || email,
                tagline: 'Welcome back',
                avatarUrl: `https://ui-avatars.com/api/?name=${username}`,
                joinedDate: new Date().toLocaleString('ru-RU'),
                following: [],
                achievements: []
            };
            await supabase.from('users').upsert({ username, data: newProfile });
            // Add fallback profile to cache to avoid re-creation
            cache.users.push(newProfile);
            saveToLocalCache();
            userProfile = newProfile;
        }
    }

    if (!userProfile) {
        throw new Error("Unable to load user profile after login.");
    }
    
    return userProfile;
};

export const logoutUser = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_USER_KEY);
};

export const updateUserProfile = async (user: UserProfile) => {
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    saveToLocalCache();
    await supabase.from('users').upsert({ username: user.username, data: user });
};

// --- DATA METHODS (Direct Cloud) ---

export const getExhibits = (): Exhibit[] => cache.exhibits;

export const saveExhibit = async (exhibit: Exhibit) => {
  exhibit.slug = `${slugify(exhibit.title)}-${Date.now().toString().slice(-4)}`;
  cache.exhibits.unshift(exhibit);
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
    const toUpdate: Notification[] = [];
    cache.notifications.forEach(n => {
        if (n.recipient === recipient && !n.isRead) {
             n.isRead = true;
             toUpdate.push(n);
        }
    });
    saveToLocalCache();
    // Batch upsert
    if (toUpdate.length > 0) {
        const payload = toUpdate.map(n => toDbPayload(n));
        await supabase.from('notifications').upsert(payload);
    }
};

export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;

export const saveGuestbookEntry = async (entry: GuestbookEntry) => {
    cache.guestbook.push(entry);
    saveToLocalCache();
    await supabase.from('guestbook').upsert(toDbPayload(entry));
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