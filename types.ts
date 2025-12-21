
export interface Comment {
  id: string;
  parentId?: string; // For replies
  author: string;
  text: string;
  timestamp: string;
  likes: number;
  likedBy: string[];
}

export type TierType = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'CURSED';

export interface Exhibit {
  id: string;
  slug?: string;
  title: string;
  description: string;
  imageUrls: string[];
  videoUrl?: string; 
  category: string; 
  subcategory?: string;
  owner: string;
  timestamp: string;
  likes: number;
  likedBy: string[]; 
  views: number;
  condition?: string;
  quality: string;
  specs: Record<string, string>;
  comments: Comment[];
  isDraft?: boolean;
}

export interface Collection {
  id: string;
  slug?: string;
  title: string;
  description: string;
  owner: string;
  coverImage: string;
  exhibitIds: string[];
  timestamp: string;
}

export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'GUESTBOOK' | 'LIKE_COMMENT' | 'MENTION';

export interface Notification {
  id: string;
  type: NotificationType;
  actor: string;
  recipient: string;
  targetId?: string;
  targetPreview?: string;
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

export interface AchievementProgress {
  id: string;
  current: number;
  target: number;
  unlocked: boolean;
}

export interface UserProfile {
  username: string;
  email: string;
  tagline: string;
  status?: UserStatus;
  avatarUrl: string;
  joinedDate: string;
  following: string[];
  followers: string[]; 
  achievements: AchievementProgress[]; 
  preferences?: Record<string, number>;
  password?: string;
  isAdmin?: boolean;
  telegram?: string;
}

export type ViewState = 'AUTH' | 'FEED' | 'PROFILE' | 'USER_PROFILE' | 'CREATE_HUB' | 'CREATE_ARTIFACT' | 'CREATE_COLLECTION' | 'EDIT_COLLECTION' | 'EXHIBIT' | 'COLLECTIONS' | 'COLLECTION_DETAIL' | 'ADMIN' | 'SETTINGS' | 'ACTIVITY' | 'SEARCH' | 'HALL_OF_FAME' | 'DIRECT_CHAT' | 'MY_COLLECTION' | 'SOCIAL_LIST';
