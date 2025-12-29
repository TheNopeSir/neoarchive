
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutGrid, User, PlusCircle, Search, Bell, X, Package, Grid, RefreshCw, Sun, Moon, Zap, FolderPlus, ArrowLeft, Check, Folder, Plus, Layers, Monitor, Bookmark, Sparkles
} from 'lucide-react';

import MatrixRain from './components/MatrixRain';
import CRTOverlay from './components/CRTOverlay';
import MatrixLogin from './components/MatrixLogin';
import ExhibitCard from './components/ExhibitCard';
import UserProfileView from './components/UserProfileView';
import ExhibitDetailPage from './components/ExhibitDetailPage';
import MyCollection from './components/MyCollection';
import RetroLoader from './components/RetroLoader';
import CollectionCard from './components/CollectionCard';
import PixelSnow from './components/PixelSnow';
import ActivityView from './components/ActivityView';
import SEO from './components/SEO';
import HallOfFame from './components/HallOfFame';
import CollectionDetailPage from './components/CollectionDetailPage';
import DirectChat from './components/DirectChat';
import CreateArtifactView from './components/CreateArtifactView';
import CreateCollectionView from './components/CreateCollectionView';
import CreateWishlistItemView from './components/CreateWishlistItemView';
import WishlistCard from './components/WishlistCard';
import SocialListView from './components/SocialListView';
import SearchView from './components/SearchView';

import * as db from './services/storageService';
import { UserProfile, Exhibit, Collection, ViewState, Notification, Message, GuestbookEntry, Comment, WishlistItem } from './types';
import { DefaultCategory, calculateArtifactScore } from './constants';
import useSwipe from './hooks/useSwipe';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'xp'>('dark');
  const [view, setView] = useState<ViewState>('AUTH');
  const [navigationStack, setNavigationStack] = useState<ViewState[]>([]);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [viewedProfileUsername, setViewedProfileUsername] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ВСЕ');
  const [feedMode, setFeedMode] = useState<'ARTIFACTS' | 'COLLECTIONS' | 'WISHLIST'>('ARTIFACTS');

  // Pagination
  const [feedPage, setFeedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Social/Edit State
  const [socialListType, setSocialListType] = useState<'followers' | 'following'>('followers');
  const [isAddingToCollection, setIsAddingToCollection] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editStatus, setEditStatus] = useState<any>('ONLINE');
  const [editTelegram, setEditTelegram] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');
  const [guestbookInput, setGuestbookInput] = useState('');
  const guestbookInputRef = useRef<HTMLInputElement>(null);

  // --- NAVIGATION HELPER ---
  const navigateTo = (newView: ViewState, params?: { username?: string; item?: Exhibit; collection?: Collection }) => {
      // 1. Update Data State
      if (params?.username) setViewedProfileUsername(params.username);
      if (params?.item) setSelectedExhibit(params.item);
      if (params?.collection) setSelectedCollection(params.collection);

      // 2. Update Navigation Stack
      setNavigationStack(prev => [...prev, view]);

      // 3. Update Visual View
      setView(newView);

      // 4. Update URL (Clean History API)
      let path = '/';
      if (newView === 'USER_PROFILE') path = `/u/${params?.username || viewedProfileUsername}`;
      else if (newView === 'EXHIBIT') path = `/artifact/${params?.item?.id || selectedExhibit?.id}`;
      else if (newView === 'COLLECTION_DETAIL') path = `/collection/${params?.collection?.id || selectedCollection?.id}`;
      else if (newView === 'ACTIVITY') path = '/activity';
      else if (newView === 'MY_COLLECTION') path = '/my-collection';
      else if (newView === 'HALL_OF_FAME') path = '/hall-of-fame';
      else if (newView === 'CREATE_ARTIFACT') path = '/create';
      else if (newView === 'SEARCH') path = '/search';
      else if (newView === 'FEED') path = '/';
      
      window.history.pushState({ view: newView }, '', path);
  };

  const handleBack = () => {
      if (navigationStack.length > 0) {
          const prevView = navigationStack[navigationStack.length - 1];
          setNavigationStack(prev => prev.slice(0, -1));
          setView(prevView);
          window.history.back(); // Sync browser back button
      } else if (view !== 'FEED') {
          setView('FEED');
          window.history.pushState({ view: 'FEED' }, '', '/');
      }
  };

  // Browser Back Button Handler
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
        if (event.state && event.state.view) {
            setView(event.state.view);
            // We don't update navigationStack here closely because it's complex to sync perfectly 
            // with browser history stack without a router lib, but this handles basic Back button usage.
        } else {
            // Fallback to Feed if history state is empty
            setView('FEED');
        }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- SWIPE LOGIC ---
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      // Swipe Left (<--) means "Next Tab" in order:
      // FEED -> MY_COLLECTION -> ACTIVITY -> USER_PROFILE
      if (view === 'FEED') {
          navigateTo('MY_COLLECTION');
      } else if (view === 'MY_COLLECTION') {
          navigateTo('ACTIVITY');
      } else if (view === 'ACTIVITY') {
          if (user) navigateTo('USER_PROFILE', { username: user.username });
      }
    },
    onSwipeRight: () => {
      // Swipe Right (-->) is standard "Back" gesture or "Previous Tab"
      handleBack();
    },
  });

  const refreshData = useCallback(() => {
    const data = db.getFullDatabase();
    setExhibits(data.exhibits);
    setCollections(data.collections);
    setWishlist(data.wishlist);
    setNotifications(data.notifications);
    setMessages(data.messages);
    setGuestbook(data.guestbook);
    if (user) {
       const updatedUser = data.users.find(u => u.username === user.username);
       if (updatedUser) setUser(updatedUser);
    }
  }, [user]);

  useEffect(() => {
    const safetyTimer = setTimeout(() => { setIsInitializing(false); setShowSplash(false); }, 5000);
    const init = async () => {
      try {
          const activeUser = await db.initializeDatabase();
          if (activeUser) { 
              setUser(activeUser);
              
              // Apply saved theme preference
              if (activeUser.settings?.theme) {
                  setTheme(activeUser.settings.theme);
              }

              // Simple URL parsing for initial load could go here
              setView('FEED'); 
              refreshData();
          } 
          else { setView('AUTH'); }
      } catch (e) { 
          setView('AUTH'); 
      } 
      finally { 
          clearTimeout(safetyTimer); 
          setIsInitializing(false); 
          setTimeout(() => setShowSplash(false), 300); 
      }
    };
    init();
  }, []);

  const loadMore = useCallback(async () => {
      if (isLoadingMore || !hasMore || feedMode !== 'ARTIFACTS') return;
      setIsLoadingMore(true);
      const nextPage = feedPage + 1;
      const items = await db.loadFeedBatch(nextPage, 12);
      if (items.length < 12) setHasMore(false);
      setFeedPage(nextPage);
      refreshData();
      setIsLoadingMore(false);
  }, [feedPage, hasMore, isLoadingMore, feedMode, refreshData]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 800) {
        loadMore();
      }
    };
    if (view === 'FEED') {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [view, loadMore]);

  const handleExhibitClick = (item: Exhibit) => {
    const updated = { ...item, views: (item.views || 0) + 1 };
    db.updateExhibit(updated);
    navigateTo('EXHIBIT', { item: updated });
  };

  const handleLike = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const ex = exhibits.find(e => e.id === id);
    if (!ex || !user) return;
    const isLiked = ex.likedBy?.includes(user.username);
    const updated = { 
        ...ex, 
        likes: isLiked ? Math.max(0, ex.likes - 1) : ex.likes + 1, 
        likedBy: isLiked ? ex.likedBy.filter(u => u !== user.username) : [...(ex.likedBy || []), user.username] 
    };
    setExhibits(prev => prev.map(item => item.id === id ? updated : item));
    if (selectedExhibit?.id === id) setSelectedExhibit(updated);
    await db.updateExhibit(updated);
  };

  // --- NEW: Handle Collection Like ---
  const handleCollectionLike = async (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const col = collections.find(c => c.id === id);
      if (!col || !user) return;
      
      const isLiked = col.likedBy?.includes(user.username);
      const updated = {
          ...col,
          likes: isLiked ? Math.max(0, (col.likes || 0) - 1) : (col.likes || 0) + 1,
          likedBy: isLiked ? (col.likedBy || []).filter(u => u !== user.username) : [...(col.likedBy || []), user.username]
      };
      
      setCollections(prev => prev.map(c => c.id === id ? updated : c));
      await db.updateCollection(updated);
  };
  
  const handleCommentLike = async (commentId: string) => {
      if (!selectedExhibit || !user) return;
      
      const updatedComments = selectedExhibit.comments.map(c => {
          if (c.id === commentId) {
              const isLiked = c.likedBy?.includes(user.username);
              const updatedComment = {
                  ...c,
                  likes: isLiked ? Math.max(0, c.likes - 1) : c.likes + 1,
                  likedBy: isLiked ? (c.likedBy || []).filter(u => u !== user.username) : [...(c.likedBy || []), user.username]
              };
              return updatedComment;
          }
          return c;
      });
      
      const updatedEx = { ...selectedExhibit, comments: updatedComments };
      setSelectedExhibit(updatedEx);
      setExhibits(prev => prev.map(e => e.id === selectedExhibit.id ? updatedEx : e));
      await db.updateExhibit(updatedEx);
  };

  const handleDeleteComment = async (exhibitId: string, commentId: string) => {
      if (!user) return;
      const ex = exhibits.find(e => e.id === exhibitId);
      if (!ex) return;
      
      const updatedComments = ex.comments.filter(c => c.id !== commentId);
      const updatedEx = { ...ex, comments: updatedComments };
      
      await db.updateExhibit(updatedEx);
      setExhibits(prev => prev.map(e => e.id === exhibitId ? updatedEx : e));
      if (selectedExhibit?.id === exhibitId) setSelectedExhibit(updatedEx);
  };

  const handlePostComment = async (id: string, text: string, parentId?: string) => {
      if (!user) return;
      const ex = exhibits.find(e => e.id === id);
      if (!ex) return;
      
      const newComment: Comment = { 
          id: crypto.randomUUID(), 
          author: user.username, 
          text, 
          timestamp: new Date().toISOString(), 
          likes: 0, 
          likedBy: [],
          parentId: parentId
      };
      
      const updatedEx = { ...ex, comments: [...(ex.comments || []), newComment] };
      await db.updateExhibit(updatedEx);
      
      refreshData();
      if (selectedExhibit?.id === id) setSelectedExhibit(updatedEx);
  };

  const handleFollow = async (username: string) => {
      if(!user) return;
      await db.toggleFollow(user.username, username);
      refreshData();
  };
  
  const handleAddItemToCollection = async (collectionId: string) => {
      if (!isAddingToCollection || !user) return;
      const collection = collections.find(c => c.id === collectionId);
      if (!collection) return;
      
      // Ensure we only add owned items to owned collections (Constraint check)
      const artifact = exhibits.find(e => e.id === isAddingToCollection);
      if (!artifact || artifact.owner !== user.username) {
          alert("Нельзя добавлять чужие артефакты в свои коллекции.");
          setIsAddingToCollection(null);
          return;
      }
      
      if (!collection.exhibitIds.includes(isAddingToCollection)) {
          const updatedCollection = {
              ...collection,
              exhibitIds: [...collection.exhibitIds, isAddingToCollection]
          };
          await db.updateCollection(updatedCollection);
          setCollections(prev => prev.map(c => c.id === collectionId ? updatedCollection : c));
      }
      setIsAddingToCollection(null);
  };

  // Base filter for all feeds
  const baseFilteredExhibits = exhibits.filter(e => {
      if (e.isDraft && e.owner !== user?.username) return false;
      if (selectedCategory !== 'ВСЕ' && e.category !== selectedCategory) return false;
      return true;
  });

  // SUBSCRIPTION FEED: Only people I follow
  const followingExhibits = user ? baseFilteredExhibits.filter(e => user.following.includes(e.owner)) : [];

  // GLOBAL FEED: Everyone ELSE (Exclude following, exclude myself) - Instagram Logic
  const globalExhibits = user ? baseFilteredExhibits.filter(e => 
      !user.following.includes(e.owner) && 
      e.owner !== user.username
  ).sort((a,b) => calculateArtifactScore(b, user.preferences) - calculateArtifactScore(a, user.preferences)) : [];

  const handleSaveArtifact = async (artifactData: Partial<Exhibit>) => {
      if (!user || !artifactData.title) return;
      
      // Update Existing
      if (artifactData.id) {
          const existing = exhibits.find(e => e.id === artifactData.id);
          if (existing) {
              const updated: Exhibit = {
                  ...existing,
                  ...artifactData,
                  // Ensure mandatory fields aren't lost if not passed in partial
                  imageUrls: artifactData.imageUrls || existing.imageUrls,
                  specs: artifactData.specs || existing.specs,
                  title: artifactData.title || existing.title,
                  category: artifactData.category || existing.category,
                  tradeStatus: artifactData.tradeStatus || existing.tradeStatus,
                  relatedIds: artifactData.relatedIds || existing.relatedIds
              };
              await db.updateExhibit(updated);
              if (selectedExhibit?.id === updated.id) setSelectedExhibit(updated);
          }
      } else {
          // Create New
          const ex: Exhibit = { 
            id: crypto.randomUUID(), 
            title: artifactData.title, 
            description: artifactData.description || '', 
            category: artifactData.category || DefaultCategory.MISC, 
            subcategory: artifactData.subcategory, 
            imageUrls: artifactData.imageUrls || [], 
            videoUrl: artifactData.videoUrl, 
            owner: user.username, 
            timestamp: new Date().toISOString(), 
            likes: 0, 
            likedBy: [], 
            views: 0, 
            specs: artifactData.specs || {}, 
            comments: [], 
            isDraft: artifactData.isDraft, 
            quality: 'MINT',
            tradeStatus: artifactData.tradeStatus || 'NONE',
            relatedIds: artifactData.relatedIds || []
          };
          await db.saveExhibit(ex);
      }
      
      navigateTo('FEED');
      refreshData();
  };

  const handleSaveCollection = async (data: Partial<Collection>) => {
      if (!user || !data.title) return;
      
      if (data.id) {
          // Update existing
          const existing = collections.find(c => c.id === data.id);
          if (existing) {
              const updated = { ...existing, ...data };
              await db.updateCollection(updated as Collection);
              if (selectedCollection?.id === data.id) setSelectedCollection(updated as Collection);
          }
      } else {
          // Create new
          const newCol: Collection = {
              id: crypto.randomUUID(),
              title: data.title!,
              description: data.description || '',
              owner: user.username,
              coverImage: data.coverImage || '',
              exhibitIds: data.exhibitIds || [],
              timestamp: new Date().toISOString(),
              likes: 0, // Init likes
              likedBy: [] // Init likedBy
          };
          await db.saveCollection(newCol);
      }
      navigateTo('FEED');
      refreshData();
  };

  const handleSaveWishlist = async (data: WishlistItem) => {
      if (!user) return;
      await db.saveWishlistItem({ ...data, owner: user.username });
      navigateTo('FEED');
      refreshData();
  };

  const handleDeleteCollection = async (id: string) => {
      if(!user) return;
      await db.deleteCollection(id); 
      setCollections(prev => prev.filter(c => c.id !== id));
      navigateTo('FEED');
  };

  const handleDeleteArtifact = async (id: string) => {
      if(!user) return;
      if(confirm('Удалить артефакт безвозвратно?')) {
          await db.deleteExhibit(id);
          setExhibits(prev => prev.filter(e => e.id !== id));
          // Remove from collections locally
          setCollections(prev => prev.map(c => ({
              ...c,
              exhibitIds: c.exhibitIds.filter(eid => eid !== id)
          })));
          // If currently viewing deleted item, go back
          if (selectedExhibit?.id === id) {
              handleBack();
          }
      }
  };

  const handleSendMessage = async (text: string) => {
      if (!user || !viewedProfileUsername || !text.trim()) return;
      const msg: Message = { 
          id: crypto.randomUUID(), 
          sender: user.username, 
          receiver: viewedProfileUsername, 
          text, 
          timestamp: new Date().toISOString(), 
          isRead: false 
      };
      setMessages(prev => [...prev, msg].sort((a,b) => a.timestamp.localeCompare(b.timestamp)));
      await db.saveMessage(msg);
      refreshData();
  };

  if (showSplash) {
    return (
      <div className={`fixed inset-0 z-[1000] bg-black flex items-center justify-center text-green-500 overflow-hidden transition-opacity duration-700 ${!isInitializing ? 'opacity-0 scale-105 pointer-events-none' : ''}`}>
        <MatrixRain theme="dark" />
        <div className="relative z-10 text-center animate-pulse px-4">
          <div className="font-pixel text-2xl md:text-4xl tracking-[0.5em] md:tracking-[1em] mb-4 drop-shadow-[0_0_15px_#4ade80]">NEOARCHIVE</div>
          <RetroLoader text="SYNCHRONIZING_NODE" size="lg" />
        </div>
        <CRTOverlay />
      </div>
    );
  }

  // Swipe logic active on ALL authenticated views to allow "Exit Window" behavior
  const swipeProps = view !== 'AUTH' ? swipeHandlers : {};

  // Background style logic
  let bgClass = '';
  if (theme === 'dark') bgClass = 'bg-black text-gray-200';
  else if (theme === 'light') bgClass = 'bg-gray-100 text-gray-900';
  else if (theme === 'xp') bgClass = 'bg-gradient-to-b from-[#628dce] via-[#85aaee] to-[#e2e1d6] text-black font-sans'; // Bliss-ish gradient

  return (
    <div 
        {...swipeProps}
        className={`min-h-screen transition-colors duration-500 ${theme === 'xp' ? 'font-sans' : 'font-sans'} ${bgClass} ${view === 'AUTH' ? 'overflow-hidden' : ''}`}
    >
        <SEO title="NeoArchive | Цифровая полка коллекционера" />
        {theme !== 'xp' && <MatrixRain theme={theme} />}
        {theme !== 'xp' && <PixelSnow theme={theme} />}
        <CRTOverlay />
        
        {view !== 'AUTH' && (
          <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${theme === 'dark' ? 'bg-black/60 border-b border-white/10 backdrop-blur-xl' : theme === 'xp' ? 'bg-gradient-to-b from-[#245DDA] to-[#2055C8] border-b-2 border-[#003c74] shadow-md' : 'bg-white/80 border-b border-white/10 backdrop-blur-xl'}`}>
              <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                      <div className={`font-pixel text-lg font-black tracking-widest cursor-pointer group ${theme === 'xp' ? 'text-white italic drop-shadow-[1px_1px_1px_rgba(0,0,0,0.5)]' : ''}`} onClick={() => navigateTo('FEED')}>
                          NEO<span className={`${theme === 'xp' ? 'text-white' : 'text-green-500'} transition-colors group-hover:text-white`}>ARCHIVE</span>
                      </div>
                      
                      {/* NEW SEARCH BUTTON (Mobile & Desktop) */}
                      <button 
                        onClick={() => navigateTo('SEARCH')}
                        className={`flex items-center px-4 py-1.5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : theme === 'xp' ? 'bg-white text-black border-blue-800 shadow-inner' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}
                      >
                          <Search size={14} className={`${theme === 'xp' ? 'opacity-100 text-blue-600' : 'opacity-40'} mr-2`} />
                          <span className="text-xs font-mono opacity-50 hidden md:inline">ПОИСК ПО БАЗЕ...</span>
                      </button>
                  </div>

                  <div className="flex items-center gap-2 md:gap-4">
                      {/* CREATE BUTTON FOR DESKTOP */}
                      <button 
                          onClick={() => setShowCreateMenu(true)} 
                          className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl font-bold font-pixel text-[10px] tracking-widest hover:scale-105 transition-transform mr-2 ${theme === 'xp' ? 'bg-gradient-to-b from-[#3c9c2a] to-[#4cb630] border border-[#265e18] text-white shadow-md' : 'bg-green-500 text-black shadow-[0_0_15px_rgba(74,222,128,0.4)]'}`}
                      >
                          <PlusCircle size={14} /> ДОБАВИТЬ
                      </button>

                      <button onClick={async () => { await db.forceSync(); refreshData(); }} className={`hidden md:block p-2 rounded-xl transition-all ${theme === 'xp' ? 'text-white hover:bg-white/20' : 'hover:bg-white/10'}`}>
                          <RefreshCw size={18} />
                      </button>
                      <button onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'xp' : 'dark')} className={`hidden md:block p-2 rounded-xl ${theme === 'xp' ? 'text-white hover:bg-white/20' : 'hover:bg-white/10'}`}>
                          {theme === 'dark' ? <Sun size={20}/> : theme === 'light' ? <Monitor size={20} /> : <Moon size={20}/>}
                      </button>
                      <button onClick={() => navigateTo('ACTIVITY')} className={`hidden md:block relative p-2 rounded-xl ${theme === 'xp' ? 'text-white hover:bg-white/20' : 'hover:bg-white/10'}`}>
                          <Bell size={20} />
                          {notifications.some(n => !n.isRead && n.recipient === user?.username) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-black animate-pulse" />}
                      </button>
                      {user && (
                          <div className={`hidden md:block w-10 h-10 rounded-full p-0.5 cursor-pointer hover:scale-105 transition-all ${theme === 'xp' ? 'border-2 border-white/50' : 'border-2 border-green-500/30'}`} onClick={() => navigateTo('USER_PROFILE', { username: user.username })}>
                              <img src={user.avatarUrl} className="w-full h-full object-cover rounded-full" />
                          </div>
                      )}
                  </div>
              </div>
          </header>
        )}

        <main className={`pt-20 pb-28 px-4 max-w-7xl mx-auto min-h-screen relative z-10 transition-all duration-700 ${!isInitializing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            
            {view === 'AUTH' && <MatrixLogin theme={theme === 'xp' ? 'light' : theme} onLogin={(u) => { 
                setUser(u); 
                // Apply User Preference Theme
                if(u.settings?.theme) setTheme(u.settings.theme);
                navigateTo('FEED'); 
                refreshData(); 
            }} />}

            {view === 'SEARCH' && (
                <SearchView 
                    theme={theme}
                    exhibits={exhibits}
                    collections={collections}
                    users={db.getFullDatabase().users}
                    onBack={handleBack}
                    onExhibitClick={handleExhibitClick}
                    onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onLike={handleLike}
                    currentUser={user}
                />
            )}

            {view === 'FEED' && (
                <div className="space-y-8 animate-in fade-in zoom-in-95">
                    {/* Only show categories for ARTIFACTS mode */}
                    {feedMode === 'ARTIFACTS' && (
                        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                             <button onClick={() => setSelectedCategory('ВСЕ')} className={`px-5 py-2 rounded-xl font-pixel text-[10px] font-bold whitespace-nowrap border transition-all ${selectedCategory === 'ВСЕ' ? (theme === 'xp' ? 'bg-[#245DDA] text-white border-[#003c74]' : 'bg-green-500 border-green-500 text-black shadow-[0_0_15px_rgba(74,222,128,0.4)]') : (theme === 'xp' ? 'bg-white/50 border-white text-blue-900' : 'border-white/10 opacity-50')}`}>ВСЕ</button>
                             {Object.values(DefaultCategory).map(cat => (
                                 <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2 rounded-xl font-pixel text-[10px] font-bold whitespace-nowrap border transition-all ${selectedCategory === cat ? (theme === 'xp' ? 'bg-[#245DDA] text-white border-[#003c74]' : 'bg-green-500 border-green-500 text-black shadow-[0_0_15px_rgba(74,222,128,0.4)]') : (theme === 'xp' ? 'bg-white/50 border-white text-blue-900' : 'border-white/10 opacity-50')}`}>{cat}</button>
                             ))}
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex gap-6 overflow-x-auto scrollbar-hide">
                            <button onClick={() => setFeedMode('ARTIFACTS')} className={`flex items-center gap-2 font-pixel text-[11px] tracking-widest whitespace-nowrap ${feedMode === 'ARTIFACTS' ? (theme === 'xp' ? 'text-blue-800 border-b-2 border-blue-800 pb-4' : 'text-green-500 border-b-2 border-green-500 pb-4') : 'opacity-40 hover:opacity-100 transition-all'}`}><Grid size={14} /> АРТЕФАКТЫ</button>
                            <button onClick={() => setFeedMode('COLLECTIONS')} className={`flex items-center gap-2 font-pixel text-[11px] tracking-widest whitespace-nowrap ${feedMode === 'COLLECTIONS' ? (theme === 'xp' ? 'text-blue-800 border-b-2 border-blue-800 pb-4' : 'text-green-500 border-b-2 border-green-500 pb-4') : 'opacity-40 hover:opacity-100 transition-all'}`}><FolderPlus size={14} /> КОЛЛЕКЦИИ</button>
                            <button onClick={() => setFeedMode('WISHLIST')} className={`flex items-center gap-2 font-pixel text-[11px] tracking-widest whitespace-nowrap ${feedMode === 'WISHLIST' ? (theme === 'xp' ? 'text-blue-800 border-b-2 border-blue-800 pb-4' : 'text-green-500 border-b-2 border-green-500 pb-4') : 'opacity-40 hover:opacity-100 transition-all'}`}><Sparkles size={14} /> ВИШЛИСТЫ</button>
                        </div>
                    </div>
                    
                    {feedMode === 'ARTIFACTS' && (
                        <div className="space-y-10">
                            {/* SUBSCRIPTIONS FEED */}
                            {followingExhibits.length > 0 && (
                                <div>
                                    <h2 className={`font-pixel text-[10px] opacity-50 mb-4 flex items-center gap-2 tracking-[0.2em] uppercase ${theme === 'xp' ? 'text-black' : ''}`}><Zap size={14} className="text-yellow-500" /> ПОДПИСКИ</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                                        {followingExhibits.map(item => (
                                            <ExhibitCard key={item.id} item={item} theme={theme} onClick={handleExhibitClick} isLiked={item.likedBy?.includes(user?.username || '')} onLike={(e) => handleLike(item.id, e)} onAuthorClick={(author) => navigateTo('USER_PROFILE', { username: author })} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* GLOBAL FEED */}
                            <div>
                                <h2 className={`font-pixel text-[10px] opacity-50 mb-4 flex items-center gap-2 tracking-[0.2em] uppercase ${theme === 'xp' ? 'text-black' : ''}`}><Grid size={14} className={theme === 'xp' ? 'text-blue-600' : 'text-green-500'} /> {followingExhibits.length > 0 ? 'РЕКОМЕНДАЦИИ' : 'ВСЕ АРТЕФАКТЫ'}</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                                    {globalExhibits.map(item => (
                                        <ExhibitCard key={item.id} item={item} theme={theme} onClick={handleExhibitClick} isLiked={item.likedBy?.includes(user?.username || '')} onLike={(e) => handleLike(item.id, e)} onAuthorClick={(author) => navigateTo('USER_PROFILE', { username: author })} />
                                    ))}
                                </div>
                            </div>
                            {isLoadingMore && (
                                <div className="flex justify-center py-10"><RetroLoader text="SYNCHRONIZING..." /></div>
                            )}
                        </div>
                    )}

                    {feedMode === 'COLLECTIONS' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {collections.length === 0 ? <div className="col-span-full text-center opacity-50 py-10 font-mono text-xs">Коллекций пока нет</div> :
                            collections.map(col => ( 
                                <CollectionCard 
                                    key={col.id} 
                                    col={col} 
                                    theme={theme} 
                                    onClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })} 
                                    onShare={() => {}}
                                    isLiked={col.likedBy?.includes(user?.username || '')}
                                    onLike={(e) => handleCollectionLike(col.id, e)}
                                /> 
                            ))}
                        </div>
                    )}

                    {feedMode === 'WISHLIST' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {wishlist.length === 0 ? <div className="col-span-full text-center opacity-50 py-10 font-mono text-xs">Список желаемого пуст</div> :
                            wishlist.map(item => (
                                <WishlistCard 
                                    key={item.id} 
                                    item={item} 
                                    theme={theme}
                                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === 'CREATE_ARTIFACT' && (
              <CreateArtifactView 
                theme={theme} 
                onBack={handleBack} 
                onSave={handleSaveArtifact} 
                // Pass current user's artifacts for linking
                userArtifacts={user ? exhibits.filter(e => e.owner === user.username && !e.isDraft) : []}
              />
            )}

            {view === 'CREATE_WISHLIST' && (
                <CreateWishlistItemView
                    theme={theme}
                    onBack={handleBack}
                    onSave={handleSaveWishlist}
                />
            )}

            {view === 'EDIT_ARTIFACT' && selectedExhibit && (
               <CreateArtifactView 
                theme={theme} 
                onBack={handleBack} 
                onSave={handleSaveArtifact} 
                initialData={selectedExhibit} 
                userArtifacts={user ? exhibits.filter(e => e.owner === user.username && !e.isDraft) : []}
               />
            )}

            {/* CREATE OR EDIT COLLECTION VIEW */}
            {(view === 'CREATE_COLLECTION' || view === 'EDIT_COLLECTION') && user && (
                <CreateCollectionView
                    theme={theme}
                    userArtifacts={exhibits.filter(e => e.owner === user.username && !e.isDraft)}
                    initialData={view === 'EDIT_COLLECTION' ? selectedCollection : null}
                    onBack={handleBack}
                    onSave={handleSaveCollection}
                    onDelete={handleDeleteCollection}
                />
            )}

            {view === 'EXHIBIT' && selectedExhibit && (
                <ExhibitDetailPage 
                    exhibit={selectedExhibit} 
                    theme={theme} 
                    onBack={handleBack} 
                    onShare={() => {}} 
                    onFavorite={() => {}} 
                    onLike={(id: string) => handleLike(id)} 
                    isFavorited={false} 
                    isLiked={selectedExhibit.likedBy?.includes(user?.username || '')} 
                    onPostComment={handlePostComment}
                    onCommentLike={handleCommentLike} 
                    onDeleteComment={handleDeleteComment}
                    onAuthorClick={(a) => navigateTo('USER_PROFILE', { username: a })} 
                    onFollow={handleFollow} 
                    onMessage={(u) => { setViewedProfileUsername(u); navigateTo('DIRECT_CHAT', { username: u }); }} 
                    currentUser={user?.username || ''} 
                    isAdmin={user?.isAdmin || false} 
                    isFollowing={user?.following.includes(selectedExhibit.owner) || false} 
                    onAddToCollection={(id) => setIsAddingToCollection(id)}
                    onEdit={(item: Exhibit) => navigateTo('EDIT_ARTIFACT', { item })}
                    onDelete={(id: string) => handleDeleteArtifact(id)}
                    users={db.getFullDatabase().users}
                    // Pass all exhibits for Similarity Algorithm
                    allExhibits={exhibits}
                />
            )}
            
            {view === 'COLLECTION_DETAIL' && selectedCollection && (
                <CollectionDetailPage
                    collection={selectedCollection}
                    artifacts={exhibits.filter(e => (selectedCollection.exhibitIds || []).includes(e.id))}
                    theme={theme}
                    onBack={handleBack}
                    onExhibitClick={handleExhibitClick}
                    onAuthorClick={(a) => navigateTo('USER_PROFILE', { username: a })}
                    currentUser={user?.username || ''}
                    onEdit={() => navigateTo('EDIT_COLLECTION')}
                    onDelete={handleDeleteCollection}
                />
            )}

            {view === 'DIRECT_CHAT' && user && viewedProfileUsername && (
                <DirectChat 
                    theme={theme} 
                    currentUser={user} 
                    partnerUsername={viewedProfileUsername} 
                    messages={messages.filter(m => (m.sender === user.username && m.receiver === viewedProfileUsername) || (m.sender === viewedProfileUsername && m.receiver === user.username))} 
                    onBack={handleBack} 
                    onSendMessage={handleSendMessage} 
                />
            )}

            {view === 'SOCIAL_LIST' && viewedProfileUsername && (
                <SocialListView 
                    type={socialListType} 
                    username={viewedProfileUsername} 
                    currentUserUsername={user?.username}
                    theme={theme} 
                    onBack={handleBack} 
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })} 
                />
            )}

            {view === 'USER_PROFILE' && user && (
                <UserProfileView 
                    user={user} 
                    viewedProfileUsername={viewedProfileUsername} 
                    exhibits={exhibits} 
                    collections={collections} 
                    // Pass filtered wishlist
                    // In a real app we'd pass the full wishlist or filtered one.
                    // UserProfileView will need to be updated to accept wishlist prop or fetch it.
                    // For now, let's inject it via props in UserProfileView (I will update UserProfileView to read from cache directly or via props)
                    // Wait, I updated UserProfileView signature? No, I need to pass it.
                    // Let's pass it via props or let it filter from full db.
                    // Actually, UserProfileView pulls profileUser from DB.
                    // I need to update UserProfileView to handle wishlist.
                    // I will pass `wishlist` as a prop.
                    // Oops, `UserProfileView` props definition in `App.tsx` needs to match.
                    // I will update UserProfileView to take `wishlist` prop or `exhibits` prop and filter inside? 
                    // No, `wishlist` is a separate array now.
                    // I'll update UserProfileView to filter from `db.getFullDatabase().wishlist`.
                    guestbook={guestbook} 
                    theme={theme} 
                    onBack={handleBack} 
                    onLogout={() => { db.logoutUser(); setUser(null); navigateTo('AUTH'); }} 
                    onFollow={handleFollow} 
                    onChat={(u) => { setViewedProfileUsername(u); navigateTo('DIRECT_CHAT', { username: u }); }} 
                    onExhibitClick={handleExhibitClick} 
                    onLike={handleLike} 
                    onAuthorClick={(a) => { navigateTo('USER_PROFILE', { username: a }); }} 
                    onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })} 
                    onShareCollection={() => {}} 
                    onViewHallOfFame={() => navigateTo('HALL_OF_FAME')} 
                    onGuestbookPost={() => {}} 
                    refreshData={refreshData} 
                    isEditingProfile={isEditingProfile} 
                    setIsEditingProfile={setIsEditingProfile} 
                    editTagline={editTagline} 
                    setEditTagline={setEditTagline} 
                    editStatus={editStatus} 
                    setEditStatus={setEditStatus} 
                    editTelegram={editTelegram} 
                    setEditTelegram={setEditTelegram} 
                    editPassword={editPassword} 
                    setEditPassword={setEditPassword} 
                    onSaveProfile={async () => { if(!user) return; const updated = { ...user, tagline: editTagline, status: editStatus, telegram: editTelegram }; if(editPassword) updated.password = editPassword; await db.updateUserProfile(updated); setUser(updated); setIsEditingProfile(false); }} 
                    onProfileImageUpload={async (e) => { if(e.target.files && e.target.files[0] && user) { const b64 = await db.fileToBase64(e.target.files[0]); const updated = { ...user, avatarUrl: b64 }; setUser(updated); await db.updateUserProfile(updated); } }} 
                    guestbookInput={guestbookInput} 
                    setGuestbookInput={setGuestbookInput} 
                    guestbookInputRef={guestbookInputRef} 
                    profileTab={profileTab} 
                    setProfileTab={setProfileTab} 
                    onOpenSocialList={(u, t) => { setViewedProfileUsername(u); setSocialListType(t); navigateTo('SOCIAL_LIST', { username: u }); }} 
                    onThemeChange={(t) => setTheme(t)}
                />
            )}

            {view === 'HALL_OF_FAME' && user && (
                <HallOfFame 
                    theme={theme} 
                    achievements={user.achievements || []} 
                    onBack={handleBack} 
                />
            )}

            {view === 'ACTIVITY' && user && (
                <ActivityView notifications={notifications} messages={messages} currentUser={user} theme={theme} onAuthorClick={(a) => navigateTo('USER_PROFILE', { username: a })} onExhibitClick={(id) => { const e = exhibits.find(x => x.id === id); if(e) handleExhibitClick(e); }} onChatClick={(u) => { setViewedProfileUsername(u); navigateTo('DIRECT_CHAT', { username: u }); }} />
            )}
            
            {view === 'MY_COLLECTION' && user && (
                <MyCollection theme={theme} user={user} exhibits={exhibits.filter(e => e.owner === user.username)} collections={collections.filter(c => c.owner === user.username)} onBack={handleBack} onExhibitClick={handleExhibitClick} onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })} onLike={handleLike} />
            )}

        </main>

        {/* CREATE MENU MODAL */}
        {showCreateMenu && (
            <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowCreateMenu(false)}>
                <div className={`w-full max-w-sm p-6 rounded-3xl border-2 transform transition-all scale-100 ${theme === 'dark' ? 'bg-[#09090b] border-white/10 shadow-[0_0_50px_rgba(74,222,128,0.2)]' : 'bg-white border-black/10 shadow-2xl'}`} onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-pixel text-sm uppercase tracking-widest flex items-center gap-2"><PlusCircle size={16}/> СОЗДАТЬ НОВУЮ ЗАПИСЬ</h3>
                        <button onClick={() => setShowCreateMenu(false)} className="opacity-50 hover:opacity-100 hover:rotate-90 transition-all"><X size={20}/></button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => { navigateTo('CREATE_ARTIFACT'); setShowCreateMenu(false); }}
                            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all hover:scale-105 active:scale-95 group ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-green-500/50 hover:bg-green-500/10' : 'bg-gray-50 border-black/5 hover:border-black/20'}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-green-500 text-black flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_#4ade80] transition-shadow">
                                <Package size={24} />
                            </div>
                            <span className="font-pixel text-[10px] font-bold tracking-widest">АРТЕФАКТ</span>
                        </button>

                        <button 
                            onClick={() => { navigateTo('CREATE_COLLECTION'); setShowCreateMenu(false); }}
                            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all hover:scale-105 active:scale-95 group ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-blue-500/50 hover:bg-blue-500/10' : 'bg-gray-50 border-black/5 hover:border-black/20'}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_#3b82f6] transition-shadow">
                                <Layers size={24} />
                            </div>
                            <span className="font-pixel text-[10px] font-bold tracking-widest">КОЛЛЕКЦИЮ</span>
                        </button>

                        <button 
                            onClick={() => { navigateTo('CREATE_WISHLIST'); setShowCreateMenu(false); }}
                            className={`col-span-2 flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all hover:scale-105 active:scale-95 group ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-purple-500/50 hover:bg-purple-500/10' : 'bg-gray-50 border-black/5 hover:border-black/20'}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-shadow">
                                <Search size={24} />
                            </div>
                            <span className="font-pixel text-[10px] font-bold tracking-widest">WISHLIST / ИЩУ</span>
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        {/* ADD TO COLLECTION MODAL */}
        {isAddingToCollection && user && (
            <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4">
                <div className={`w-full max-w-md p-6 rounded-2xl border ${theme === 'dark' ? 'bg-dark-surface border-white/10' : 'bg-white border-black/10'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-pixel text-sm uppercase flex items-center gap-2"><FolderPlus size={16} /> Добавить в коллекцию</h3>
                        <button onClick={() => setIsAddingToCollection(null)} className="opacity-50 hover:opacity-100"><X size={20}/></button>
                    </div>
                    
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto mb-4 scrollbar-hide">
                        {/* New Collection Button */}
                         <button 
                            onClick={() => { setIsAddingToCollection(null); navigateTo('CREATE_COLLECTION'); }}
                            className="w-full text-left p-4 rounded-xl border border-dashed border-white/20 hover:bg-white/5 flex items-center justify-center gap-2 mb-4 text-green-500"
                        >
                            <PlusCircle size={16} /> <span className="font-pixel text-xs">СОЗДАТЬ НОВУЮ</span>
                        </button>

                        {collections.filter(c => c.owner === user.username).length === 0 ? (
                            <div className="text-center py-8 opacity-50 font-mono text-xs">Нет коллекций</div>
                        ) : (
                            collections.filter(c => c.owner === user.username).map(col => {
                                const isAdded = col.exhibitIds.includes(isAddingToCollection);
                                return (
                                    <button 
                                        key={col.id} 
                                        onClick={() => handleAddItemToCollection(col.id)}
                                        disabled={isAdded}
                                        className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all ${isAdded ? 'border-green-500/50 bg-green-500/10 opacity-50 cursor-default' : 'border-white/5 hover:bg-white/5 hover:border-white/20'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-gray-800 overflow-hidden"><img src={col.coverImage} className="w-full h-full object-cover" /></div>
                                            <span className="font-pixel text-xs">{col.title}</span>
                                        </div>
                                        {isAdded && <Check size={16} className="text-green-500" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        )}
        
        {view !== 'AUTH' && (
          <nav className={`fixed bottom-0 left-0 right-0 h-20 border-t backdrop-blur-2xl md:hidden flex justify-around items-center z-50 px-4 pb-safe ${theme === 'dark' ? 'border-white/10 bg-black/60' : theme === 'xp' ? 'bg-[#245DDA]/90 border-[#003c74]' : 'bg-white/80 border-black/10'}`}>
              <button onClick={() => navigateTo('FEED')} className={`p-2 transition-all ${view === 'FEED' ? (theme === 'xp' ? 'text-white scale-125' : 'text-green-500 scale-125') : 'opacity-40'}`}><LayoutGrid size={24} className={theme === 'xp' ? 'text-white' : ''} /></button>
              <button onClick={() => navigateTo('MY_COLLECTION')} className={`p-2 transition-all ${view === 'MY_COLLECTION' ? (theme === 'xp' ? 'text-white scale-125' : 'text-green-500 scale-125') : 'opacity-40'}`}><Package size={24} className={theme === 'xp' ? 'text-white' : ''} /></button>
              <div className="relative -top-5"><button onClick={() => setShowCreateMenu(true)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${theme === 'xp' ? 'bg-green-600 border-4 border-[#245DDA] shadow-lg text-white font-serif italic' : 'bg-green-500 text-black shadow-[0_0_20px_rgba(74,222,128,0.5)] border-4 border-black'}`}><PlusCircle size={32} /></button></div>
              <button onClick={() => navigateTo('ACTIVITY')} className={`p-2 transition-all ${view === 'ACTIVITY' ? (theme === 'xp' ? 'text-white scale-125' : 'text-green-500 scale-125') : 'opacity-40'} relative`}><Bell size={24} className={theme === 'xp' ? 'text-white' : ''} />{notifications.some(n => !n.isRead && n.recipient === user?.username) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-black animate-pulse" />}</button>
              <button onClick={() => { if(user) navigateTo('USER_PROFILE', { username: user.username }); }} className={`p-2 transition-all ${view === 'USER_PROFILE' ? (theme === 'xp' ? 'text-white scale-125' : 'text-green-500 scale-125') : 'opacity-40'}`}><User size={24} className={theme === 'xp' ? 'text-white' : ''} /></button>
          </nav>
        )}
    </div>
  );
}
