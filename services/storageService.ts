

import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry } from '../types';
import { INITIAL_EXHIBITS, MOCK_COLLECTIONS, MOCK_NOTIFICATIONS, MOCK_MESSAGES, MOCK_USER } from '../constants';
import { supabase } from './supabaseClient';

// Локальный кэш для быстрого отображения (Optimistic UI)
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

// --- SLUG GENERATOR ---
const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start
        .replace(/-+$/, '');            // Trim - from end
};

// --- DATA MAPPING HELPERS (Supabase snake_case <-> App camelCase) ---

const mapExhibitFromDB = (row: any): Exhibit => ({
    id: row.id,
    slug: row.slug || row.id, // Fallback to ID if no slug
    title: row.title,
    description: row.description,
    imageUrls: row.image_urls || [],
    videoUrl: row.video_url,
    category: row.category,
    owner: row.owner,
    timestamp: row.timestamp,
    likes: row.likes,
    likedBy: row.liked_by || [],
    views: row.views,
    condition: row.condition,
    quality: row.quality,
    specs: row.specs || {},
    comments: row.comments || []
});

const mapExhibitToDB = (item: Exhibit) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    image_urls: item.imageUrls,
    video_url: item.videoUrl,
    category: item.category,
    owner: item.owner,
    timestamp: item.timestamp,
    likes: item.likes,
    liked_by: item.likedBy,
    views: item.views,
    condition: item.condition,
    quality: item.quality,
    specs: item.specs,
    comments: item.comments
});

const mapCollectionFromDB = (row: any): Collection => ({
    id: row.id,
    slug: row.slug || row.id,
    title: row.title,
    description: row.description,
    owner: row.owner,
    coverImage: row.cover_image,
    exhibitIds: row.exhibit_ids || [],
    timestamp: row.timestamp
});

const mapCollectionToDB = (item: Collection) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    owner: item.owner,
    cover_image: item.coverImage,
    exhibit_ids: item.exhibitIds,
    timestamp: item.timestamp
});

// --- CORE LOAD FUNCTION ---

const loadFromSupabase = async () => {
    try {
        console.log("☁️ [Storage] Syncing with Cloud Database...");
        
        // 1. Exhibits
        const { data: exData, error: exError } = await supabase.from('exhibits').select('*').order('timestamp', { ascending: false });
        if (!exError && exData) {
            cache.exhibits = exData.map(mapExhibitFromDB);
        }

        // 2. Collections
        const { data: colData, error: colError } = await supabase.from('collections').select('*');
        if (!colError && colData) {
            cache.collections = colData.map(mapCollectionFromDB);
        }

        // 3. Notifications
        const { data: notifData, error: notifError } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(50);
        if (!notifError && notifData) {
            cache.notifications = notifData.map((row: any) => ({
                id: row.id,
                type: row.type,
                actor: row.actor,
                recipient: row.recipient,
                targetId: row.target_id,
                targetPreview: row.target_preview,
                timestamp: row.timestamp,
                isRead: row.is_read
            }));
        }

        // 4. Guestbook
        const { data: gbData, error: gbError } = await supabase.from('guestbook').select('*').order('timestamp', { ascending: false });
        if (!gbError && gbData) {
            cache.guestbook = gbData.map((row: any) => ({
                id: row.id,
                author: row.author,
                targetUser: row.target_user,
                text: row.text,
                timestamp: row.timestamp,
                isRead: row.is_read
            }));
        }
        
        cache.isLoaded = true;
        console.log("✅ [Storage] Cloud Sync Complete");

    } catch (e) {
        console.error("🔴 [Storage] Sync Failed:", e);
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
      await loadFromSupabase();
  }
};

export const getFullDatabase = () => {
    return { ...cache, timestamp: new Date().toISOString() };
};

// --- AUTH HELPERS ---

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
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, tagline } }
    });
    if (error) throw new Error(error.message);
    if (data.user) return mapSupabaseUser(data.user);
    throw new Error("Ошибка регистрации");
};

export const loginUser = async (login: string, password: string): Promise<UserProfile> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: login, password });
    if (error) throw new Error("Неверный логин или пароль");
    if (data.user) return mapSupabaseUser(data.user);
    throw new Error("Пользователь не найден");
};

export const updateUserProfile = async (user: UserProfile) => {
    // Обновляем метаданные в Supabase Auth
    const { error } = await supabase.auth.updateUser({
        data: { tagline: user.tagline, avatar_url: user.avatarUrl } // Note: avatar_url key for standard metadata
    });
    
    // Обновляем локальный кэш
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    else cache.users.push(user);

    // Обновляем сессию
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

export const saveExhibit = async (exhibit: Exhibit) => {
  // Generate Slug
  const baseSlug = slugify(exhibit.title);
  const uniqueSuffix = Date.now().toString().slice(-4);
  exhibit.slug = `${baseSlug}-${uniqueSuffix}`;

  // Optimistic Update
  cache.exhibits.unshift(exhibit);
  
  // Async Cloud Save
  const { error } = await supabase.from('exhibits').insert(mapExhibitToDB(exhibit));
  if (error) console.error("Cloud Save Error (Exhibit):", error);
};

export const updateExhibit = async (updatedExhibit: Exhibit) => {
  const index = cache.exhibits.findIndex(e => e.id === updatedExhibit.id);
  if (index !== -1) {
    cache.exhibits[index] = updatedExhibit;
    
    const { error } = await supabase.from('exhibits')
        .update(mapExhibitToDB(updatedExhibit))
        .eq('id', updatedExhibit.id);
        
    if (error) console.error("Cloud Update Error (Exhibit):", error);
  }
};

export const deleteExhibit = async (id: string) => {
  cache.exhibits = cache.exhibits.filter(e => e.id !== id);
  const { error } = await supabase.from('exhibits').delete().eq('id', id);
  if (error) console.error("Cloud Delete Error:", error);
};

// --- COLLECTIONS CRUD ---

export const getCollections = (): Collection[] => cache.collections;

export const saveCollection = async (collection: Collection) => {
    // Generate Slug
    const baseSlug = slugify(collection.title);
    const uniqueSuffix = Date.now().toString().slice(-4);
    collection.slug = `${baseSlug}-${uniqueSuffix}`;

    cache.collections.unshift(collection);
    const { error } = await supabase.from('collections').insert(mapCollectionToDB(collection));
    if (error) console.error("Cloud Save Error (Collection):", error);
};

export const updateCollection = async (updatedCollection: Collection) => {
    const index = cache.collections.findIndex(c => c.id === updatedCollection.id);
    if (index !== -1) {
        cache.collections[index] = updatedCollection;
        const { error } = await supabase.from('collections')
            .update(mapCollectionToDB(updatedCollection))
            .eq('id', updatedCollection.id);
        if (error) console.error("Cloud Update Error (Collection):", error);
    }
};

export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) console.error("Cloud Delete Error:", error);
};

// --- NOTIFICATIONS & GUESTBOOK ---

export const getNotifications = (): Notification[] => cache.notifications;

export const saveNotification = async (notif: Notification) => {
    cache.notifications.unshift(notif);
    const dbNotif = {
        id: notif.id,
        type: notif.type,
        actor: notif.actor,
        recipient: notif.recipient,
        target_id: notif.targetId,
        target_preview: notif.targetPreview,
        timestamp: notif.timestamp,
        is_read: notif.isRead
    };
    await supabase.from('notifications').insert(dbNotif);
};

export const markNotificationsRead = async (recipient: string) => {
    cache.notifications.forEach(n => {
        if (n.recipient === recipient) n.isRead = true;
    });
    // Batch update via logic is hard, doing by recipient is easier
    await supabase.from('notifications').update({ is_read: true }).eq('recipient', recipient);
};

export const getGuestbook = (): GuestbookEntry[] => cache.guestbook;

export const saveGuestbookEntry = async (entry: GuestbookEntry) => {
    cache.guestbook.push(entry);
    const dbEntry = {
        id: entry.id,
        author: entry.author,
        target_user: entry.targetUser,
        text: entry.text,
        timestamp: entry.timestamp,
        is_read: entry.isRead
    };
    await supabase.from('guestbook').insert(dbEntry);
};

// Messages are local-only for now in this demo (or use similar logic)
export const getMessages = (): Message[] => cache.messages;
export const saveMessage = (msg: Message) => cache.messages.push(msg);
export const markMessagesRead = (sender: string, receiver: string) => {
    cache.messages.forEach(m => {
        if (m.sender === sender && m.receiver === receiver) m.isRead = true;
    });
};