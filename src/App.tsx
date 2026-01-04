import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutGrid, List as ListIcon, Search, Bell, Zap, Menu, Plus, 
  User as UserIcon, LogOut, Camera, Sparkles, Heart, Radar, Home 
} from 'lucide-react';
import { 
  UserProfile, Exhibit, Collection, Notification, Message, 
  WishlistItem, GuestbookEntry, Guild, ViewState, AppSettings, UserStatus 
} from '../types';
import * as db from '../services/storageService';
import { DefaultCategory } from '../constants';
import useSwipe from '../hooks/useSwipe';

// Components
import MatrixLogin from '../components/MatrixLogin';
import ExhibitDetailPage from '../components/ExhibitDetailPage';
import UserProfileView from '../components/UserProfileView';
import MyCollection from '../components/MyCollection';
import ActivityView from '../components/ActivityView';
import SearchView from '../components/SearchView';
import CreateArtifactView from '../components/CreateArtifactView';
import CreateCollectionView from '../components/CreateCollectionView';
import CollectionDetailPage from '../components/CollectionDetailPage';
import DirectChat from '../components/DirectChat';
import HallOfFame from '../components/HallOfFame';
import CreateWishlistItemView from '../components/CreateWishlistItemView';
import WishlistDetailView from '../components/WishlistDetailView';
import CommunityHub from '../components/CommunityHub';
import GuildDetailView from '../components/GuildDetailView';
import UserWishlistView from '../components/UserWishlistView';
import SocialListView from '../components/SocialListView';
import ExhibitCard from '../components/ExhibitCard';
import WishlistCard from '../components/WishlistCard';
import CollectionCard from '../components/CollectionCard';
import MatrixRain from '../components/MatrixRain';
import PixelSnow from '../components/PixelSnow';
import CRTOverlay from '../components/CRTOverlay';
import StorageMonitor from '../components/StorageMonitor';
import SEO from '../components/SEO';

const App: React.FC = () => {
    // State
    const [user, setUser] = useState<UserProfile | null>(null);
    const [view, setView] = useState<ViewState>('AUTH');
    const [theme, setTheme] = useState<'dark' | 'light' | 'xp' | 'winamp'>('dark');
    
    // Data State
    const [exhibits, setExhibits] = useState<Exhibit[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [guilds, setGuilds] = useState<Guild[]>([]);
    
    // UI State
    const [feedMode, setFeedMode] = useState<'ARTIFACTS' | 'WISHLIST'>('ARTIFACTS');
    const [feedType, setFeedType] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');
    const [feedViewMode, setFeedViewMode] = useState<'GRID' | 'LIST'>('GRID');
    const [selectedCategory, setSelectedCategory] = useState<string>('ВСЕ');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // Selection State
    const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
    const [selectedUserUsername, setSelectedUserUsername] = useState<string | null>(null);
    const [selectedWishlistItem, setSelectedWishlistItem] = useState<WishlistItem | null>(null);
    const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
    const [chatPartner, setChatPartner] = useState<string | null>(null);
    
    // Editing Profile State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editTagline, setEditTagline] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editStatus, setEditStatus] = useState<UserStatus>('ONLINE');
    const [editTelegram, setEditTelegram] = useState('');
    const [editPassword, setEditPassword] = useState('');
    
    // Social List
    const [socialListConfig, setSocialListConfig] = useState<{ type: 'followers' | 'following', username: string } | null>(null);
    
    // Guestbook Input for Profile View
    const [guestbookInput, setGuestbookInput] = useState('');
    const guestbookInputRef = useRef<HTMLInputElement>(null);
    const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');

    // Load Data
    useEffect(() => {
        const init = async () => {
            const loggedInUser = await db.initializeDatabase();
            if (loggedInUser) {
                setUser(loggedInUser);
                if (loggedInUser.settings?.theme) setTheme(loggedInUser.settings.theme);
                setView('FEED');
                db.startLiveUpdates();
            }
            refreshData();
        };
        init();

        const unsubscribe = db.subscribe(() => {
            refreshData();
        });

        return () => {
            unsubscribe();
            db.stopLiveUpdates();
        };
    }, []);

    const refreshData = () => {
        const data = db.getFullDatabase();
        setExhibits(data.exhibits);
        setCollections(data.collections);
        setNotifications(data.notifications);
        setMessages(data.messages);
        setWishlist(data.wishlist);
        setGuestbook(data.guestbook);
        setUsers(data.users);
        setGuilds(data.guilds);
        
        // Refresh current user object if it exists
        if (data.isLoaded) {
            const currentUsername = localStorage.getItem('neo_active_user');
            if (currentUsername) {
                const u = data.users.find(u => u.username === currentUsername);
                if (u) {
                    setUser(u);
                    if (u.settings?.theme) setTheme(u.settings.theme);
                }
            }
        }
    };

    const handleLogin = (u: UserProfile, remember: boolean) => {
        setUser(u);
        if (u.settings?.theme) setTheme(u.settings.theme);
        setView('FEED');
        db.startLiveUpdates();
        // Handle "remember me" logic if needed separately, mostly handled by storage service
    };

    const handleLogout = () => {
        db.logoutUser();
        setUser(null);
        setView('AUTH');
        db.stopLiveUpdates();
    };

    const navigateTo = (v: ViewState, params?: any) => {
        setView(v);
        setIsMenuOpen(false);
        if (v === 'USER_PROFILE' && params?.username) {
            setSelectedUserUsername(params.username);
        }
        if (v === 'SEARCH' || v === 'FEED') {
            window.scrollTo(0,0);
        }
    };

    // Derived Data
    const heroData = useMemo(() => {
        const findOfTheDay = exhibits.length > 0 ? exhibits.reduce((prev, current) => (prev.likes > current.likes) ? prev : current) : null;
        return {
            findOfTheDay,
            totalStats: { items: exhibits.length, users: users.length }
        };
    }, [exhibits, users]);

    const stories = useMemo(() => {
        // Mock stories based on recent uploads from followed users
        if (!user) return [];
        return user.following.map(followedUser => {
            const u = users.find(u => u.username === followedUser);
            const latestItem = exhibits.find(e => e.owner === followedUser);
            return u ? { username: u.username, avatar: u.avatarUrl, latestItem } : null;
        }).filter(Boolean) as any[];
    }, [user, users, exhibits]);

    // Handlers
    const handleExhibitClick = (item: Exhibit) => {
        setSelectedExhibit(item);
        setView('EXHIBIT');
    };

    const handleCollectionClick = (col: Collection) => {
        setSelectedCollection(col);
        setView('COLLECTION_DETAIL');
    };

    const handleLike = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!user) return;
        
        const item = exhibits.find(ex => ex.id === id);
        if (item) {
            const isLiked = item.likedBy?.includes(user.username);
            const updatedItem = {
                ...item,
                likes: isLiked ? item.likes - 1 : item.likes + 1,
                likedBy: isLiked ? item.likedBy.filter(u => u !== user.username) : [...(item.likedBy || []), user.username]
            };
            // Optimistic update
            setExhibits(prev => prev.map(ex => ex.id === id ? updatedItem : ex));
            await db.updateExhibit(updatedItem);
            
            if (!isLiked && item.owner !== user.username) {
                // Send notification
                // In real app, this is done by server or trigger. Here we simulate?
                // Actually storageService sync handles data. Notification creation logic should be in service or backend.
                // For this demo, let's assume backend/service handles notification creation on like if we were fully connected, 
                // or we just update the item.
            }
        }
    };

    const handleFollow = async (targetUsername: string) => {
        if (!user) return;
        await db.toggleFollow(user.username, targetUsername);
    };

    const handleChat = (targetUsername: string) => {
        setChatPartner(targetUsername);
        setView('DIRECT_CHAT');
    };

    const globalSwipeHandlers = useSwipe({
        onSwipeLeft: () => setIsMenuOpen(false),
        onSwipeRight: () => { if (view !== 'AUTH') setIsMenuOpen(true); },
    });

    if (view === 'AUTH') {
        return <MatrixLogin theme={theme === 'dark' || theme === 'winamp' ? 'dark' : 'light'} onLogin={handleLogin} />;
    }

    return (
        <div className={`min-h-screen transition-colors duration-500 overflow-x-hidden ${
            theme === 'dark' ? 'bg-[#050505] text-gray-100' : 
            theme === 'light' ? 'bg-[#f0f0f0] text-gray-900' : 
            theme === 'xp' ? 'bg-[#3A6EA5]' : 
            'bg-[#191919] text-[#00ff00]'
        }`}>
            <SEO title="NeoArchive" />
            <MatrixRain theme={theme === 'dark' || theme === 'winamp' ? 'dark' : 'light'} />
            {theme === 'dark' && <PixelSnow theme="dark" />}
            <CRTOverlay />

            {/* Storage Monitor */}
            <div className="fixed bottom-24 left-4 z-40 w-64 hidden xl:block opacity-50 hover:opacity-100 transition-opacity">
                 <StorageMonitor theme={theme} />
            </div>

            {/* --- FEED VIEW: UPDATED --- */}
            {view === 'FEED' && (
                <div className="pb-24 space-y-6" {...globalSwipeHandlers}>
                    {/* Mobile Header */}
                    <header className="md:hidden flex justify-between items-center px-4 pt-4 sticky top-0 z-30 backdrop-blur-xl bg-transparent">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-black font-pixel text-xs ${theme === 'winamp' ? 'bg-[#292929] text-[#00ff00] border border-[#505050]' : 'bg-green-500'}`}>NA</div>
                            <h1 className={`text-lg font-pixel font-bold tracking-tighter ${theme === 'winamp' ? 'text-[#00ff00]' : ''}`}>NeoArchive</h1>
                        </div>
                        {user && (
                            <div className="flex gap-4">
                                <button onClick={() => navigateTo('ACTIVITY')} className="relative">
                                    <Bell className="opacity-70 hover:opacity-100" />
                                    {notifications.some(n => n.recipient === user.username && !n.isRead) && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                                </button>
                            </div>
                        )}
                    </header>

                    {/* HERO SECTION - Only show in ARTIFACTS mode */}
                    {feedMode === 'ARTIFACTS' && heroData.findOfTheDay && (
                        <div className="px-4 max-w-7xl mx-auto w-full">
                            <div className={`relative w-full aspect-[1.7/1] md:aspect-[2.5/1] rounded-3xl overflow-hidden cursor-pointer group ${theme === 'winamp' ? 'border-2 border-[#505050]' : 'shadow-2xl'}`} onClick={() => handleExhibitClick(heroData.findOfTheDay!)}>
                                <div className="absolute inset-0">
                                    <img src={heroData.findOfTheDay.imageUrls[0]} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                                    <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'light' ? 'from-white/90 via-transparent' : 'from-black/90 via-black/20'} to-transparent`} />
                                </div>
                                <div className="absolute top-4 left-4">
                                    <div className="px-3 py-1 bg-yellow-500 text-black font-pixel text-[10px] font-bold rounded-full flex items-center gap-1 shadow-lg animate-pulse">
                                        <Sparkles size={12} /> НАХОДКА ДНЯ
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full p-6">
                                    <h2 className={`text-2xl md:text-4xl font-pixel font-black mb-1 line-clamp-1 ${theme === 'light' ? 'text-black' : 'text-white'}`}>{heroData.findOfTheDay.title}</h2>
                                    <div className="flex items-center gap-2">
                                        <img src={db.getUserAvatar(heroData.findOfTheDay.owner)} className="w-6 h-6 rounded-full border border-white/50" />
                                        <span className={`text-xs font-mono font-bold ${theme === 'light' ? 'text-black/70' : 'text-white/80'}`}>@{heroData.findOfTheDay.owner}</span>
                                    </div>
                                </div>
                                <div className="absolute top-4 right-4 hidden md:flex flex-col gap-2 items-end">
                                    <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-mono text-white">
                                        TOTAL_ITEMS: <span className="text-green-400">{heroData.totalStats.items}</span>
                                    </div>
                                    <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-mono text-white">
                                        USERS: <span className="text-blue-400">{heroData.totalStats.users}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STORIES CAROUSEL */}
                    {stories.length > 0 && (
                        <div className="px-4 max-w-7xl mx-auto w-full">
                            <h3 className="font-pixel text-[10px] opacity-50 mb-3 flex items-center gap-2 tracking-widest"><Zap size={12} className="text-yellow-500"/> ОБНОВЛЕНИЯ ПОДПИСОК</h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {stories.map((story, i) => (
                                    <div key={i} onClick={() => story.latestItem && handleExhibitClick(story.latestItem)} className="flex flex-col items-center gap-2 cursor-pointer group min-w-[70px]">
                                        <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-green-500 to-blue-500">
                                            <div className={`rounded-full p-[2px] ${theme === 'dark' || theme === 'winamp' ? 'bg-black' : 'bg-white'}`}>
                                                <img src={story.avatar} className="w-14 h-14 rounded-full object-cover" />
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold truncate max-w-[70px]">@{story.username}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* FEED CONTROLS & SEARCH */}
                    <div className={`sticky top-[52px] md:top-[64px] z-20 pt-2 pb-2 transition-all ${theme === 'dark' ? 'bg-dark-bg/95 backdrop-blur-md' : theme === 'winamp' ? 'bg-[#191919] border-b border-[#505050]' : 'bg-light-bg/95 backdrop-blur-md'}`}>
                        <div className="px-4 max-w-7xl mx-auto w-full">
                            {/* Feed Mode Toggle (Artifacts vs Wishlist) */}
                            <div className="flex mb-4 p-1 rounded-xl bg-black/10 dark:bg-white/5 border border-white/10">
                                <button 
                                    onClick={() => setFeedMode('ARTIFACTS')} 
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${feedMode === 'ARTIFACTS' ? 'bg-green-500 text-black shadow-lg' : 'opacity-50 hover:opacity-100'}`}
                                >
                                    <LayoutGrid size={14} /> ЛЕНТА
                                </button>
                                <button 
                                    onClick={() => setFeedMode('WISHLIST')} 
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${feedMode === 'WISHLIST' ? 'bg-purple-500 text-white shadow-lg' : 'opacity-50 hover:opacity-100'}`}
                                >
                                    <Radar size={14} /> ВИШЛИСТ
                                </button>
                            </div>

                            {/* Search Input Trigger */}
                            <div className="mb-4">
                                <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10' : theme === 'winamp' ? 'bg-black border-[#00ff00]' : 'bg-white border-black/10 shadow-sm'}`}>
                                    <Search size={16} className="opacity-50" />
                                    <input 
                                        type="text" 
                                        placeholder={feedMode === 'WISHLIST' ? "Поиск желаемого..." : "Поиск по артефактам, людям..."}
                                        className={`bg-transparent border-none outline-none text-xs w-full font-mono ${theme === 'winamp' ? 'text-[#00ff00] placeholder-green-900' : ''}`}
                                        onFocus={() => navigateTo('SEARCH')} 
                                        readOnly
                                    />
                                    <Camera size={16} className="opacity-50 cursor-pointer hover:opacity-100" onClick={(e) => { e.stopPropagation(); navigateTo('CREATE_WISHLIST'); }} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                {/* Feed Type Toggles (For You / Following) */}
                                <div className={`flex p-1 rounded-xl ${theme === 'dark' ? 'bg-white/5' : theme === 'winamp' ? 'bg-[#292929] border border-[#505050]' : 'bg-black/5'}`}>
                                    <button 
                                        onClick={() => setFeedType('FOR_YOU')} 
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${feedType === 'FOR_YOU' ? (theme === 'winamp' ? 'bg-[#00ff00] text-black' : 'bg-white/20 text-white shadow-lg') : 'opacity-50 hover:opacity-100'}`}
                                    >
                                        FOR YOU
                                    </button>
                                    <button 
                                        onClick={() => setFeedType('FOLLOWING')} 
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${feedType === 'FOLLOWING' ? (theme === 'winamp' ? 'bg-[#00ff00] text-black' : 'bg-white/20 text-white shadow-lg') : 'opacity-50 hover:opacity-100'}`}
                                    >
                                        FOLLOWING
                                    </button>
                                </div>

                                {/* View Mode Toggles */}
                                <div className="flex gap-1">
                                    <button onClick={() => setFeedViewMode('GRID')} className={`p-2 rounded-lg transition-all ${feedViewMode === 'GRID' ? 'bg-white/10 text-green-500' : 'opacity-50'}`}><LayoutGrid size={18}/></button>
                                    <button onClick={() => setFeedViewMode('LIST')} className={`p-2 rounded-lg transition-all ${feedViewMode === 'LIST' ? 'bg-white/10 text-green-500' : 'opacity-50'}`}><ListIcon size={18}/></button>
                                </div>
                            </div>

                            {/* Category Filters */}
                            <div className="flex gap-2 overflow-x-auto pt-4 pb-1 scrollbar-hide">
                                <button 
                                    onClick={() => setSelectedCategory('ВСЕ')}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${selectedCategory === 'ВСЕ' ? 'bg-white text-black border-white' : 'border-current opacity-40 hover:opacity-100'}`}
                                >
                                    ALL
                                </button>
                                {Object.values(DefaultCategory).map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${selectedCategory === cat ? (theme === 'winamp' ? 'bg-[#00ff00] text-black border-[#00ff00]' : 'bg-green-500 text-black border-green-500') : 'border-white/10 opacity-60 hover:opacity-100'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* FEED RENDERER */}
                    <div className="px-4 max-w-7xl mx-auto w-full">
                        {feedMode === 'ARTIFACTS' ? (
                            // --- ARTIFACTS GRID ---
                            exhibits
                                .filter(e => !e.isDraft)
                                .filter(e => selectedCategory === 'ВСЕ' || e.category === selectedCategory)
                                .filter(e => feedType === 'FOR_YOU' ? true : (user?.following?.includes(e.owner) || false))
                                .length === 0 ? (
                                    <div className="text-center py-20 opacity-30 font-mono text-xs border-2 border-dashed border-white/10 rounded-3xl">
                                        НЕТ ДАННЫХ В ПОТОКЕ
                                        <br/>
                                        {feedType === 'FOLLOWING' && "Подпишитесь на кого-нибудь!"}
                                    </div>
                                ) : (
                                    <div className={`grid gap-4 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1'}`}>
                                        {exhibits
                                            .filter(e => !e.isDraft)
                                            .filter(e => selectedCategory === 'ВСЕ' || e.category === selectedCategory)
                                            .filter(e => feedType === 'FOR_YOU' ? true : (user?.following?.includes(e.owner) || false))
                                            .map(item => (
                                                feedViewMode === 'GRID' ? (
                                                    <ExhibitCard 
                                                        key={item.id} 
                                                        item={item} 
                                                        theme={theme}
                                                        onClick={handleExhibitClick}
                                                        isLiked={item.likedBy?.includes(user?.username || '') || false}
                                                        onLike={(e) => handleLike(item.id, e)}
                                                        onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                                                    />
                                                ) : (
                                                    // LIST VIEW CARD (Inline)
                                                    <div 
                                                        key={item.id} 
                                                        onClick={() => handleExhibitClick(item)}
                                                        className={`flex gap-4 p-3 rounded-xl border cursor-pointer hover:scale-[1.01] transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : theme === 'winamp' ? 'bg-[#191919] border-[#505050] text-[#00ff00]' : 'bg-white border-black/10 hover:shadow-md'}`}
                                                    >
                                                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-black/20">
                                                            <img src={item.imageUrls[0]} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-between">
                                                            <div>
                                                                <div className="flex justify-between items-start">
                                                                    <span className="text-[10px] font-pixel opacity-50 uppercase">{item.category}</span>
                                                                    <div className="flex items-center gap-2 text-[10px] opacity-60">
                                                                        <Heart size={12}/> {item.likes}
                                                                    </div>
                                                                </div>
                                                                <h3 className="font-bold font-pixel text-sm mt-1">{item.title}</h3>
                                                                <p className="text-[10px] opacity-60 line-clamp-2 mt-1">{item.description}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <img src={db.getUserAvatar(item.owner)} className="w-5 h-5 rounded-full border border-white/20" />
                                                                <span className="text-[10px] font-bold">@{item.owner}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            ))
                                        }
                                    </div>
                                )
                        ) : (
                            // --- WISHLIST GRID ---
                            wishlist
                                .filter(w => selectedCategory === 'ВСЕ' || w.category === selectedCategory)
                                .filter(w => feedType === 'FOR_YOU' ? true : (user?.following?.includes(w.owner) || false))
                                .length === 0 ? (
                                    <div className="text-center py-20 opacity-30 font-mono text-xs border-2 border-dashed border-white/10 rounded-3xl">
                                        ВИШЛИСТ ПУСТ
                                    </div>
                                ) : (
                                    <div className={`grid gap-4 ${feedViewMode === 'GRID' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1'}`}>
                                        {wishlist
                                            .filter(w => selectedCategory === 'ВСЕ' || w.category === selectedCategory)
                                            .filter(w => feedType === 'FOR_YOU' ? true : (user?.following?.includes(w.owner) || false))
                                            .map(item => (
                                                <WishlistCard 
                                                    key={item.id}
                                                    item={item}
                                                    theme={theme}
                                                    onClick={(i) => { setSelectedWishlistItem(i); navigateTo('WISHLIST_DETAIL'); }}
                                                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                                                />
                                            ))
                                        }
                                    </div>
                                )
                        )}
                    </div>
                </div>
            )}

            {/* Other Views */}
            {view === 'EXHIBIT' && selectedExhibit && user && (
                <ExhibitDetailPage 
                    exhibit={selectedExhibit} 
                    theme={theme}
                    currentUser={user.username}
                    currentUserProfile={user}
                    isLiked={selectedExhibit.likedBy.includes(user.username)}
                    isFavorited={false}
                    isFollowing={user.following.includes(selectedExhibit.owner)}
                    isAdmin={user.isAdmin || false}
                    users={users}
                    allExhibits={exhibits}
                    onBack={() => setView('FEED')}
                    onShare={() => {}}
                    onFavorite={() => {}}
                    onLike={(id) => handleLike(id)}
                    onPostComment={async (id, text, parentId) => {
                        const ex = exhibits.find(e => e.id === id);
                        if(ex) {
                            const newComment = { id: crypto.randomUUID(), text, author: user.username, timestamp: new Date().toLocaleString(), likes: 0, likedBy: [], parentId };
                            const updated = { ...ex, comments: [...(ex.comments || []), newComment] };
                            await db.updateExhibit(updated);
                            refreshData();
                            setSelectedExhibit(updated);
                        }
                    }}
                    onCommentLike={() => {}}
                    onDeleteComment={async (exId, cId) => {
                        const ex = exhibits.find(e => e.id === exId);
                        if(ex) {
                            const updated = { ...ex, comments: ex.comments.filter(c => c.id !== cId) };
                            await db.updateExhibit(updated);
                            refreshData();
                            setSelectedExhibit(updated);
                        }
                    }}
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onFollow={handleFollow}
                    onMessage={handleChat}
                    onDelete={async (id) => { await db.deleteExhibit(id); setView('FEED'); refreshData(); }}
                    onEdit={(e) => { setSelectedExhibit(e); setView('EDIT_ARTIFACT'); }}
                    onAddToCollection={() => {}}
                    onExhibitClick={handleExhibitClick}
                />
            )}

            {view === 'USER_PROFILE' && selectedUserUsername && user && (
                <UserProfileView 
                    user={user}
                    viewedProfileUsername={selectedUserUsername}
                    exhibits={exhibits}
                    collections={collections}
                    guestbook={guestbook}
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onLogout={handleLogout}
                    onFollow={handleFollow}
                    onChat={handleChat}
                    onExhibitClick={handleExhibitClick}
                    onLike={(id, e) => handleLike(id, e)}
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onCollectionClick={handleCollectionClick}
                    onShareCollection={() => {}}
                    onViewHallOfFame={() => navigateTo('HALL_OF_FAME')}
                    onGuestbookPost={async (text) => {
                         const entry: GuestbookEntry = { id: crypto.randomUUID(), author: user.username, targetUser: selectedUserUsername, text, timestamp: new Date().toISOString(), isRead: false };
                         await db.saveGuestbookEntry(entry);
                         refreshData();
                    }}
                    refreshData={refreshData}
                    isEditingProfile={isEditingProfile}
                    setIsEditingProfile={setIsEditingProfile}
                    editTagline={editTagline}
                    setEditTagline={setEditTagline}
                    editBio={editBio}
                    setEditBio={setEditBio}
                    editStatus={editStatus}
                    setEditStatus={setEditStatus}
                    editTelegram={editTelegram}
                    setEditTelegram={setEditTelegram}
                    editPassword={editPassword}
                    setEditPassword={setEditPassword}
                    onSaveProfile={async () => {
                        const u = users.find(u => u.username === user.username);
                        if(u) {
                             const updated = { ...u, tagline: editTagline, bio: editBio, status: editStatus, telegram: editTelegram };
                             if(editPassword) updated.password = editPassword;
                             await db.updateUserProfile(updated);
                             setIsEditingProfile(false);
                             refreshData();
                        }
                    }}
                    onProfileImageUpload={async (e) => {
                         if(e.target.files?.[0]) {
                             const b64 = await db.fileToBase64(e.target.files[0]);
                             const updated = { ...user, avatarUrl: b64 };
                             await db.updateUserProfile(updated);
                             refreshData();
                         }
                    }}
                    onProfileCoverUpload={async (e) => {
                         if(e.target.files?.[0]) {
                             const b64 = await db.fileToBase64(e.target.files[0]);
                             const updated = { ...user, coverUrl: b64 };
                             await db.updateUserProfile(updated);
                             refreshData();
                         }
                    }}
                    guestbookInput={guestbookInput}
                    setGuestbookInput={setGuestbookInput}
                    guestbookInputRef={guestbookInputRef}
                    profileTab={profileTab}
                    setProfileTab={setProfileTab}
                    onOpenSocialList={(u, type) => {
                        setSocialListConfig({ username: u, type });
                        setView('SOCIAL_LIST');
                    }}
                    onThemeChange={(t) => setTheme(t)}
                    onWishlistClick={(item) => { setSelectedWishlistItem(item); navigateTo('WISHLIST_DETAIL'); }}
                />
            )}

            {view === 'MY_COLLECTION' && user && (
                <MyCollection 
                    theme={theme}
                    user={user}
                    exhibits={exhibits.filter(e => e.owner === user.username)}
                    allExhibits={exhibits}
                    collections={collections.filter(c => c.owner === user.username)}
                    onBack={() => setView('FEED')}
                    onExhibitClick={handleExhibitClick}
                    onCollectionClick={handleCollectionClick}
                    onLike={(id, e) => handleLike(id, e)}
                />
            )}

            {view === 'ACTIVITY' && user && (
                <ActivityView 
                    notifications={notifications}
                    messages={messages}
                    currentUser={user}
                    theme={theme}
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onExhibitClick={(id) => {
                         const ex = exhibits.find(e => e.id === id);
                         if(ex) handleExhibitClick(ex);
                    }}
                    onChatClick={handleChat}
                />
            )}
            
            {view === 'SEARCH' && (
                <SearchView 
                    theme={theme}
                    exhibits={exhibits}
                    collections={collections}
                    users={users}
                    onBack={() => setView('FEED')}
                    onExhibitClick={handleExhibitClick}
                    onCollectionClick={handleCollectionClick}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onLike={(id, e) => handleLike(id, e)}
                    currentUser={user}
                />
            )}

            {view === 'CREATE_ARTIFACT' && (
                <CreateArtifactView 
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onSave={async (item) => {
                         if(!user) return;
                         const newItem = { ...item, id: crypto.randomUUID(), owner: user.username, timestamp: new Date().toISOString(), likes: 0, likedBy: [], views: 0, comments: [] };
                         await db.saveExhibit(newItem);
                         refreshData();
                         setView('FEED');
                    }}
                    userArtifacts={exhibits.filter(e => e.owner === user?.username)}
                />
            )}
            
            {view === 'EDIT_ARTIFACT' && selectedExhibit && (
                <CreateArtifactView 
                    theme={theme}
                    initialData={selectedExhibit}
                    onBack={() => setView('EXHIBIT')}
                    onSave={async (item) => {
                         await db.updateExhibit(item);
                         refreshData();
                         setSelectedExhibit(item);
                         setView('EXHIBIT');
                    }}
                    userArtifacts={exhibits.filter(e => e.owner === user?.username)}
                />
            )}

            {view === 'CREATE_COLLECTION' && (
                <CreateCollectionView 
                    theme={theme}
                    userArtifacts={exhibits.filter(e => e.owner === user?.username)}
                    onBack={() => setView('FEED')}
                    onSave={async (col) => {
                         if(!user) return;
                         const newCol = { ...col, id: crypto.randomUUID(), owner: user.username, timestamp: new Date().toISOString() } as Collection;
                         await db.saveCollection(newCol);
                         refreshData();
                         setView('FEED');
                    }}
                />
            )}

            {view === 'COLLECTION_DETAIL' && selectedCollection && user && (
                <CollectionDetailPage 
                    collection={selectedCollection}
                    artifacts={exhibits.filter(e => selectedCollection.exhibitIds.includes(e.id))}
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onExhibitClick={handleExhibitClick}
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    currentUser={user.username}
                    onEdit={() => { /* Edit Collection Logic */ }}
                    onDelete={async (id) => { await db.deleteCollection(id); setView('FEED'); refreshData(); }}
                    onLike={(id, e) => handleLike(id, e)}
                />
            )}

            {view === 'DIRECT_CHAT' && chatPartner && user && (
                <DirectChat 
                    theme={theme}
                    currentUser={user}
                    partnerUsername={chatPartner}
                    messages={messages.filter(m => (m.sender === user.username && m.receiver === chatPartner) || (m.sender === chatPartner && m.receiver === user.username))}
                    onBack={() => setView('FEED')}
                    onSendMessage={async (text) => {
                        const msg: Message = { id: crypto.randomUUID(), sender: user.username, receiver: chatPartner, text, timestamp: new Date().toLocaleString(), isRead: false };
                        await db.saveMessage(msg);
                        refreshData();
                    }}
                />
            )}

            {view === 'HALL_OF_FAME' && user && (
                 <HallOfFame 
                    theme={theme}
                    achievements={user.achievements}
                    onBack={() => setView('USER_PROFILE')}
                 />
            )}

            {view === 'CREATE_WISHLIST' && (
                <CreateWishlistItemView 
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onSave={async (item) => {
                        if(!user) return;
                        const newItem = { ...item, owner: user.username };
                        await db.saveWishlistItem(newItem);
                        refreshData();
                        setView('FEED');
                    }}
                />
            )}

            {view === 'WISHLIST_DETAIL' && selectedWishlistItem && user && (
                <WishlistDetailView 
                    item={selectedWishlistItem}
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onDelete={async (id) => { await db.deleteWishlistItem(id); setView('FEED'); refreshData(); }}
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    currentUser={user.username}
                />
            )}
            
            {view === 'COMMUNITY_HUB' && (
                <CommunityHub 
                    theme={theme}
                    users={users}
                    exhibits={exhibits}
                    onExhibitClick={handleExhibitClick}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onBack={() => setView('FEED')}
                    currentUser={user}
                    onGuildClick={(g) => { setSelectedGuild(g); navigateTo('GUILD_DETAIL'); }}
                />
            )}

            {view === 'GUILD_DETAIL' && selectedGuild && user && (
                <GuildDetailView 
                    guild={selectedGuild}
                    currentUser={user}
                    theme={theme}
                    onBack={() => setView('COMMUNITY_HUB')}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                />
            )}

            {view === 'USER_WISHLIST' && selectedUserUsername && (
                <UserWishlistView 
                    ownerUsername={selectedUserUsername}
                    currentUser={user}
                    wishlistItems={wishlist.filter(w => w.owner === selectedUserUsername)}
                    theme={theme}
                    onBack={() => navigateTo('USER_PROFILE', { username: selectedUserUsername })}
                    onItemClick={(item) => { setSelectedWishlistItem(item); navigateTo('WISHLIST_DETAIL'); }}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                />
            )}
            
            {view === 'SOCIAL_LIST' && socialListConfig && user && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
                     <SocialListView 
                        type={socialListConfig.type}
                        username={socialListConfig.username}
                        currentUserUsername={user.username}
                        theme={theme}
                        onBack={() => navigateTo('USER_PROFILE', { username: selectedUserUsername || socialListConfig.username })}
                        onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                     />
                </div>
            )}

            {/* Bottom Nav */}
            {user && view !== 'AUTH' && view !== 'DIRECT_CHAT' && (
                <div className={`fixed bottom-0 left-0 w-full z-40 border-t ${theme === 'dark' ? 'bg-black/90 border-white/10' : theme === 'winamp' ? 'bg-[#292929] border-[#505050]' : 'bg-white border-black/10'}`}>
                    <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                        <button onClick={() => setView('FEED')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'FEED' ? 'text-green-500' : 'opacity-50'}`}>
                            <Home size={24} />
                        </button>
                        <button onClick={() => setView('SEARCH')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'SEARCH' ? 'text-green-500' : 'opacity-50'}`}>
                            <Search size={24} />
                        </button>
                        <div className="relative -top-6">
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                                className={`w-14 h-14 rounded-full flex items-center justify-center border-4 shadow-lg transition-transform hover:scale-105 active:scale-95 ${theme === 'winamp' ? 'bg-black border-[#00ff00] text-[#00ff00]' : 'bg-green-500 border-black text-black'}`}
                            >
                                <Plus size={28} strokeWidth={3} />
                            </button>
                            {isMenuOpen && (
                                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col gap-2 animate-in slide-in-from-bottom-4 fade-in">
                                    <button onClick={() => navigateTo('CREATE_ARTIFACT')} className="px-4 py-2 bg-black/90 text-white rounded-full whitespace-nowrap border border-white/20 text-xs font-bold hover:bg-green-500 hover:text-black">
                                        АРТЕФАКТ
                                    </button>
                                    <button onClick={() => navigateTo('CREATE_COLLECTION')} className="px-4 py-2 bg-black/90 text-white rounded-full whitespace-nowrap border border-white/20 text-xs font-bold hover:bg-green-500 hover:text-black">
                                        КОЛЛЕКЦИЯ
                                    </button>
                                    <button onClick={() => navigateTo('CREATE_WISHLIST')} className="px-4 py-2 bg-black/90 text-white rounded-full whitespace-nowrap border border-white/20 text-xs font-bold hover:bg-purple-500 hover:text-white">
                                        ЖЕЛАНИЕ
                                    </button>
                                </div>
                            )}
                        </div>
                        <button onClick={() => navigateTo('MY_COLLECTION')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'MY_COLLECTION' ? 'text-green-500' : 'opacity-50'}`}>
                            <LayoutGrid size={24} />
                        </button>
                        <button onClick={() => navigateTo('USER_PROFILE', { username: user.username })} className={`flex flex-col items-center justify-center w-full h-full ${view === 'USER_PROFILE' && selectedUserUsername === user.username ? 'text-green-500' : 'opacity-50'}`}>
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-current">
                                <img src={user.avatarUrl} className="w-full h-full object-cover" />
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;