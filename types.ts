
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

export type TradeStatus = 'NONE' | 'FOR_TRADE' | 'FOR_SALE' | 'GIFT' | 'NOT_FOR_SALE';

export type WishlistPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'GRAIL';

export interface WishlistItem {
    id: string;
    title: string;
    category: string;
    owner: string;
    priority: WishlistPriority;
    notes?: string;
    referenceImageUrl?: string; // Image of what user wants
    timestamp: string;
}

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
  tradeStatus?: TradeStatus; 
  price?: number;
  currency?: 'RUB' | 'USD' | 'ETH';
  tradeRequest?: string; // What they want in return
  relatedIds?: string[]; // IDs of connected items within user's collection
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
  likes: number;
  likedBy: string[];
}

export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'GUESTBOOK' | 'LIKE_COMMENT' | 'MENTION' | 'TRADE_OFFER' | 'TRADE_ACCEPTED';

export interface Notification {
  id: string;
  type: NotificationType;
  actor: string;
  recipient: string;
  targetId?: string;
  targetPreview?: string;
  // New field for specific context (e.g., comment ID)
  contextId?: string; 
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

export interface GuildMessage {
    id: string;
    guildId: string;
    author: string;
    text: string;
    timestamp: string;
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

export interface AppSettings {
    theme?: 'dark' | 'light' | 'xp' | 'winamp';
    notificationsEnabled?: boolean;
    soundEnabled?: boolean;
    publicProfile?: boolean;
    showEmail?: boolean;
}

export interface UserProfile {
  username: string;
  email: string;
  tagline: string;
  bio?: string; // Extended biography
  status?: UserStatus;
  avatarUrl: string;
  coverUrl?: string; // Profile Banner
  joinedDate: string;
  following: string[];
  followers: string[]; 
  achievements: AchievementProgress[]; 
  preferences?: Record<string, number>;
  settings?: AppSettings;
  password?: string;
  isAdmin?: boolean;
  telegram?: string;
  guildId?: string;
}

export interface Guild {
    id: string;
    name: string;
    description: string;
    leader: string;
    members: string[];
    bannerUrl?: string; // Avatar/Banner
    rules?: string; // Rules text
    inviteCode?: string; // For invite links
    isPrivate: boolean;
}

export interface Duel {
    id: string;
    challenger: string;
    opponent: string;
    challengerItem: string; // Exhibit ID
    opponentItem?: string; // Exhibit ID
    winner?: string;
    status: 'PENDING' | 'ACTIVE' | 'FINISHED';
    logs: string[];
}

export interface TradeRequest {
    id: string;
    sender: string;
    receiver: string;
    offeredItems: string[]; // IDs of items sender gives
    requestedItems: string[]; // IDs of items sender wants
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
    timestamp: string;
    message?: string;
}

export type ViewState = 'AUTH' | 'FEED' | 'PROFILE' | 'USER_PROFILE' | 'USER_WISHLIST' | 'CREATE_HUB' | 'CREATE_ARTIFACT' | 'CREATE_WISHLIST' | 'EDIT_ARTIFACT' | 'CREATE_COLLECTION' | 'EDIT_COLLECTION' | 'EXHIBIT' | 'COLLECTIONS' | 'COLLECTION_DETAIL' | 'ADMIN' | 'SETTINGS' | 'ACTIVITY' | 'SEARCH' | 'HALL_OF_FAME' | 'DIRECT_CHAT' | 'SOCIAL_LIST' | 'WISHLIST_DETAIL' | 'COMMUNITY_HUB' | 'MY_COLLECTION' | 'GUILD_DETAIL';
