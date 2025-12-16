
export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  likes: number; // Added
  likedBy: string[]; // Added
}

export interface Exhibit {
  id: string;
  slug?: string; // SEO Friendly URL
  title: string;
  description: string;
  imageUrls: string[];
  videoUrl?: string; 
  category: string; 
  subcategory?: string; // Added
  owner: string;
  timestamp: string;
  likes: number;
  likedBy?: string[]; // List of users who liked this
  views: number;
  // rating removed
  condition?: string;
  quality: string;
  specs: Record<string, string>;
  comments: Comment[];
  isDraft?: boolean; // Added
}

export interface Collection {
  id: string;
  slug?: string; // SEO Friendly URL
  title: string;
  description: string;
  owner: string;
  coverImage: string;
  exhibitIds: string[]; // IDs of exhibits in this collection
  timestamp: string;
}

export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'GUESTBOOK' | 'LIKE_COMMENT'; // Added LIKE_COMMENT

export interface Notification {
  id: string;
  type: NotificationType;
  actor: string; // Username who triggered it
  recipient: string; // Username who receives it
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
    isRead: boolean;
}

export type UserStatus = 'ONLINE' | 'AWAY' | 'DND' | 'INVISIBLE' | 'FREE_FOR_CHAT';

export interface UserProfile {
  username: string;
  email: string; // Required for Auth
  tagline: string;
  status?: UserStatus;
  avatarUrl: string;
  joinedDate: string;
  following: string[]; // List of usernames
  achievements?: string[]; // List of Badge IDs
  preferences?: Record<string, number>; // RECOMMENDATION ENGINE WEIGHTS
  // Auth simulation fields
  password?: string;
  isAdmin?: boolean;
  telegram?: string;
}

// Consolidated Views: 
// FEED (Global + Subs), PROFILE (My Items + Favorites), ACTIVITY (Notifs + Messages), SEARCH, CREATE_HUB, MY_COLLECTION
export type ViewState = 'AUTH' | 'FEED' | 'PROFILE' | 'USER_PROFILE' | 'CREATE_HUB' | 'CREATE_ARTIFACT' | 'CREATE_COLLECTION' | 'EDIT_COLLECTION' | 'EXHIBIT' | 'COLLECTIONS' | 'COLLECTION_DETAIL' | 'ADMIN' | 'SETTINGS' | 'ACTIVITY' | 'SEARCH' | 'HALL_OF_FAME' | 'DIRECT_CHAT' | 'MY_COLLECTION';
