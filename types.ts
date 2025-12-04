
export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface Exhibit {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  videoUrl?: string; 
  category: string; 
  owner: string;
  timestamp: string;
  likes: number;
  likedBy?: string[]; // New: List of users who liked this
  views: number;
  rating: number; // 1-5 scale
  condition?: Condition; 
  quality: string;
  specs: Record<string, string>;
  comments: Comment[];
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  owner: string;
  coverImage: string;
  exhibitIds: string[]; // IDs of exhibits in this collection
  timestamp: string;
}

export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'GUESTBOOK';

export interface Notification {
  id: string;
  type: NotificationType;
  actor: string; // Username who triggered it
  targetId?: string; // ID of exhibit (if applicable)
  targetPreview?: string; // Text preview
  timestamp: string;
  isRead: boolean;
}

export interface Message {
    id: string;
    sender: string;
    receiver: string;
    text: string;
    timestamp: string;
    isRead: boolean;
}

export interface GuestbookEntry {
    id: string;
    author: string;
    targetUser: string;
    text: string;
    timestamp: string;
}

// Renamed to DefaultCategory to indicate these are presets, not strict enums
export enum DefaultCategory {
  PHONES = 'ТЕЛЕФОНЫ',
  GAMES = 'ИГРЫ',
  MAGAZINES = 'ЖУРНАЛЫ',
  MUSIC = 'МУЗЫКА',
  COMPUTERS = 'КОМПЬЮТЕРЫ',
  CAMERAS = 'КАМЕРЫ',
  MISC = 'ПРОЧЕЕ'
}

export enum Condition {
  MINT = 'ИДЕАЛ',
  GOOD = 'ХОРОШЕЕ',
  FAIR = 'ПОТЕРТОЕ',
  BROKEN = 'СЛОМАНО'
}

export interface UserProfile {
  username: string;
  tagline: string;
  avatarUrl: string;
  joinedDate: string;
  following: string[]; // List of usernames
  // Auth simulation fields
  password?: string;
  isAdmin?: boolean;
}

// Consolidated Views: 
// FEED (Global + Subs), PROFILE (My Items + Favorites), COMMS (Notifs + Messages), SETTINGS
export type ViewState = 'AUTH' | 'FEED' | 'PROFILE' | 'CREATE' | 'EXHIBIT' | 'COLLECTIONS' | 'COLLECTION_DETAIL' | 'COMMS' | 'ADMIN' | 'SETTINGS';
