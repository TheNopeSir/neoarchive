
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  LayoutGrid, User, PlusCircle, Search, Bell, X, Package, Grid, RefreshCw, Sun, Moon, Zap, FolderPlus, ArrowLeft, Check, Folder, Plus, Layers, Monitor, Bookmark, Sparkles, ChevronDown, Filter, Radar, Globe, Play, Square as SquareIcon, SkipBack, SkipForward, Menu
} from 'lucide-react';

import MatrixRain from './components/MatrixRain';
import CRTOverlay from './components/CRTOverlay';
import MatrixLogin from './components/MatrixLogin';
import ExhibitCard from './components/ExhibitCard';
import UserProfileView from './components/UserProfileView';
import ExhibitDetailPage from './components/ExhibitDetailPage';
import MyCollection from './components/MyCollection';
import CommunityHub from './components/CommunityHub'; 
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
import WishlistDetailView from './components/WishlistDetailView';
import SocialListView from './components/SocialListView';
import SearchView from './components/SearchView';

import * as db from './services/storageService';
import { UserProfile, Exhibit, Collection, ViewState, Notification, Message, GuestbookEntry, Comment, WishlistItem } from './types';
import { DefaultCategory, CATEGORY_SUBCATEGORIES, calculateArtifactScore } from './constants';
import useSwipe from './hooks/useSwipe';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'xp' | 'winamp'>('dark');
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
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<WishlistItem | null>(null);
  const [viewedProfileUsername, setViewedProfileUsername] = useState<string>('');
  
  // Advanced Notification State
  const [highlightCommentId, setHighlightCommentId] = useState<string | undefined>(undefined);

  // Filtering State
  const [selectedCategory, setSelectedCategory] = useState<string>('ВСЕ');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('ВСЕ');

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
  const [editBio, setEditBio] = useState(''); 
  const [editStatus, setEditStatus] = useState<any>('ONLINE');
  const [editTelegram, setEditTelegram] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');
  const [guestbookInput, setGuestbookInput] = useState('');
  const guestbookInputRef = useRef<HTMLInputElement>(null);

  // --- NAVIGATION HELPER ---
  const navigateTo = (newView: ViewState, params?: { username?: string; item?: Exhibit; collection?: Collection; wishlistItem?: WishlistItem; highlightCommentId?: string }) => {
      if (params?.username) setViewedProfileUsername(params.username);
      if (params?.item) {
          setSelectedExhibit(params.item);
          // Highlight specific comment if passed
          setHighlightCommentId(params.highlightCommentId);
      }
      if (params?.collection) setSelectedCollection(params.collection);
      if (params?.wishlistItem) setSelectedWishlistItem(params.wishlistItem);

      setNavigationStack(prev => [...prev, view]);
      setView(newView);

      // Simple URL updates (omitted comprehensive mapping for brevity)
      let path = '/';
      if (newView === 'USER_PROFILE') path = `/u/${params?.username || viewedProfileUsername}`;
      else if (newView === 'EXHIBIT') path = `/artifact/${params?.item?.id || selectedExhibit?.id}`;
      else if (newView === 'COMMUNITY_HUB') path = '/community';
      
      window.history.pushState({ view: newView }, '', path);
      window.scrollTo(0, 0);
  };

  const handleBack = () => {
      if (navigationStack.length > 0) {
          const prevView = navigationStack[navigationStack.length - 1];
          setNavigationStack(prev => prev.slice(0, -1));
          setView(prevView);
          window.history.back();
      } else if (view !== 'FEED') {
          setView('FEED');
          window.history.pushState({ view: 'FEED' }, '', '/');
      }
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
        if (event.state && event.state.view) {
            setView(event.state.view);
        } else {
            setView('FEED');
        }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const globalSwipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (view === 'FEED') {
          navigateTo('COMMUNITY_HUB');
      } else if (view === 'COMMUNITY_HUB') {
          navigateTo('ACTIVITY');
      } else if (view === 'ACTIVITY') {
          if (user) navigateTo('USER_PROFILE', { username: user.username });
      }
    },
    onSwipeRight: () => {
        if (view !== 'FEED') handleBack();
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
    const unsubscribe = db.subscribe(() => { refreshData(); });
    return () => unsubscribe();
  }, [refreshData]);

  useEffect(() => {
    const safetyTimer = setTimeout(() => { setIsInitializing(false); setShowSplash(false); }, 6000); 
    const init = async () => {
      try {
          const activeUser = await db.initializeDatabase();
          refreshData(); 
          if (activeUser) { 
              setUser(activeUser);
              if (activeUser.settings?.theme) setTheme(activeUser.settings.theme);
              setView('FEED'); 
          } else { setView('AUTH'); }
      } catch (e) { setView('AUTH'); } 
      finally { clearTimeout(safetyTimer); setIsInitializing(false); setTimeout(() => setShowSplash(false), 300); }
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
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 800) loadMore();
    };
    if (view === 'FEED') {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [view, loadMore]);

  const handleExhibitClick = async (item: Exhibit) => {
    // Unique View Counting Logic
    const sessionKey = `neo_viewed_${item.id}`;
    const hasViewed = sessionStorage.getItem(sessionKey);
    
    let updatedItem = item;

    if (!hasViewed) {
        // Increment view count
        updatedItem = { ...item, views: (item.views || 0) + 1 };
        // Optimistic UI update
        setExhibits(prev => prev.map(e => e.id === item.id ? updatedItem : e));
        // Mark as viewed in session
        sessionStorage.setItem(sessionKey, '1');
        // Persist
        await db.updateExhibit(updatedItem);
    }

    navigateTo('EXHIBIT', { item: updatedItem });
  };

  const handleLike = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const ex = exhibits.find(e => e.id === id);
    if (!ex || !user) return;
    const isLiked = ex.likedBy?.includes(user.username);
    const updated = { ...ex, likes: isLiked ? Math.max(0, ex.likes - 1) : ex.likes + 1, likedBy: isLiked ? ex.likedBy.filter(u => u !== user.username) : [...(ex.likedBy || []), user.username] };
    setExhibits(prev => prev.map(item => item.id === id ? updated : item));
    if (selectedExhibit?.id === id) setSelectedExhibit(updated);
    await db.updateExhibit(updated);
  };

  const handleCollectionLike = async (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const col = collections.find(c => c.id === id);
      if (!col || !user) return;
      const isLiked = col.likedBy?.includes(user.username);
      const updated = { ...col, likes: isLiked ? Math.max(0, (col.likes || 0) - 1) : (col.likes || 0) + 1, likedBy: isLiked ? (col.likedBy || []).filter(u => u !== user.username) : [...(col.likedBy || []), user.username] };
      setCollections(prev => prev.map(c => c.id === id ? updated : c));
      await db.updateCollection(updated);
  };
  
  const handleCommentLike = async (commentId: string) => {
      if (!selectedExhibit || !user) return;
      const updatedComments = selectedExhibit.comments.map(c => {
          if (c.id === commentId) {
              const isLiked = c.likedBy?.includes(user.username);
              return { ...c, likes: isLiked ? Math.max(0, c.likes - 1) : c.likes + 1, likedBy: isLiked ? (c.likedBy || []).filter(u => u !== user.username) : [...(c.likedBy || []), user.username] };
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
      const newComment: Comment = { id: crypto.randomUUID(), author: user.username, text, timestamp: new Date().toISOString(), likes: 0, likedBy: [], parentId };
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
      if (!collection.exhibitIds.includes(isAddingToCollection)) {
          const updatedCollection = { ...collection, exhibitIds: [...collection.exhibitIds, isAddingToCollection] };
          await db.updateCollection(updatedCollection);
          setCollections(prev => prev.map(c => c.id === collectionId ? updatedCollection : c));
      }
      setIsAddingToCollection(null);
  };

  const baseFilteredExhibits = useMemo(() => exhibits.filter(e => {
      if (e.isDraft && e.owner !== user?.username) return false;
      const catMatch = selectedCategory === 'ВСЕ' || e.category === selectedCategory;
      const subcatMatch = selectedSubcategory === 'ВСЕ' || e.subcategory === selectedSubcategory;
      return catMatch && subcatMatch;
  }), [exhibits, user, selectedCategory, selectedSubcategory]);

  const followingExhibits = user ? baseFilteredExhibits.filter(e => user.following.includes(e.owner)) : [];
  const globalExhibits = user ? baseFilteredExhibits.filter(e => !user.following.includes(e.owner) && e.owner !== user.username).sort((a,b) => calculateArtifactScore(b, user.preferences) - calculateArtifactScore(a, user.preferences)) : [];
  
  // MERGED WISHLIST SORTING
  const sortedWishlist = useMemo(() => {
      const priorityWeights = { 'GRAIL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return [...wishlist].sort((a,b) => priorityWeights[b.priority] - priorityWeights[a.priority]);
  }, [wishlist]);

  const handleSaveArtifact = async (artifactData: Partial<Exhibit>) => {
      if (!user || !artifactData.title) return;
      if (artifactData.id) {
          const existing = exhibits.find(e => e.id === artifactData.id);
          if (existing) {
              const updated = { ...existing, ...artifactData };
              await db.updateExhibit(updated as Exhibit);
              if (selectedExhibit?.id === updated.id) setSelectedExhibit(updated as Exhibit);
          }
      } else {
          const ex: Exhibit = { id: crypto.randomUUID(), title: artifactData.title, description: artifactData.description || '', category: artifactData.category || DefaultCategory.MISC, subcategory: artifactData.subcategory, imageUrls: artifactData.imageUrls || [], videoUrl: artifactData.videoUrl, owner: user.username, timestamp: new Date().toISOString(), likes: 0, likedBy: [], views: 0, specs: artifactData.specs || {}, comments: [], isDraft: artifactData.isDraft, condition: artifactData.condition, quality: 'MINT', tradeStatus: artifactData.tradeStatus || 'NONE', relatedIds: artifactData.relatedIds || [], price: artifactData.price, currency: artifactData.currency, tradeRequest: artifactData.tradeRequest };
          await db.saveExhibit(ex);
      }
      navigateTo('FEED');
      refreshData();
  };

  const handleSaveCollection = async (data: Partial<Collection>) => {
      if (!user || !data.title) return;
      if (data.id) {
          const existing = collections.find(c => c.id === data.id);
          if (existing) {
              const updated = { ...existing, ...data };
              await db.updateCollection(updated as Collection);
              if (selectedCollection?.id === data.id) setSelectedCollection(updated as Collection);
          }
      } else {
          const newCol: Collection = { id: crypto.randomUUID(), title: data.title!, description: data.description || '', owner: user.username, coverImage: data.coverImage || '', exhibitIds: data.exhibitIds || [], timestamp: new Date().toISOString(), likes: 0, likedBy: [] };
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
      if(confirm('Удалить артефакт?')) {
          await db.deleteExhibit(id);
          setExhibits(prev => prev.filter(e => e.id !== id));
          if (selectedExhibit?.id === id) handleBack();
      }
  };

  const handleDeleteWishlist = async (id: string) => {
      if(!user) return;
      if(confirm('Удалить запрос?')) {
          await db.deleteWishlistItem(id);
          setWishlist(prev => prev.filter(w => w.id !== id));
          if(selectedWishlistItem?.id === id) handleBack();
      }
  };

  const handleSendMessage = async (text: string) => {
      if (!user || !viewedProfileUsername || !text.trim()) return;
      const msg: Message = { id: crypto.randomUUID(), sender: user.username, receiver: viewedProfileUsername, text, timestamp: new Date().toISOString(), isRead: false };
      setMessages(prev => [...prev, msg].sort((a,b) => a.timestamp.localeCompare(b.timestamp)));
      await db.saveMessage(msg);
      refreshData();
  };

  const seoData = { title: "NeoArchive", desc: "Digital Collection", image: "", path: "/" }; 

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

  const swipeProps = view !== 'AUTH' ? globalSwipeHandlers : {};
  let bgClass = '';
  if (theme === 'dark') bgClass = 'bg-black text-gray-200';
  else if (theme === 'light') bgClass = 'bg-gray-100 text-gray-900';
  else if (theme === 'xp') bgClass = 'bg-gradient-to-b from-[#628dce] via-[#85aaee] to-[#e2e1d6] text-black font-sans';
  else if (theme === 'winamp') bgClass = 'bg-[#202020] text-[#00EA00] font-winamp winamp-scroll'; // Authentic Winamp BG and Font

  return (
    <div {...swipeProps} className={`min-h-screen transition-colors duration-500 ${theme === 'xp' ? 'font-sans' : ''} ${bgClass} ${view === 'AUTH' ? 'overflow-hidden' : ''}`}>
        <SEO title={seoData.title} description={seoData.desc} image={seoData.image} path={seoData.path} />
        {theme !== 'xp' && theme !== 'winamp' && <MatrixRain theme={theme} />}
        {theme !== 'xp' && theme !== 'winamp' && <PixelSnow theme={theme} />}
        <CRTOverlay />
        
        {view !== 'AUTH' && (
          <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
              theme === 'winamp' 
              ? 'bg-gradient-to-r from-wa-blue-light to-wa-blue-dark border-b-2 border-b-[#101010] h-8 text-white select-none shadow-md' 
              : theme === 'dark' 
              ? 'bg-black/60 border-b border-white/10 backdrop-blur-xl h-16' 
              : theme === 'xp' 
              ? 'bg-gradient-to-b from-[#245DDA] to-[#2055C8] border-b-2 border-[#003c74] shadow-md h-16' 
              : 'bg-white/80 border-b border-white/10 backdrop-blur-xl h-16'
          }`}>
              <div className="max-w-7xl mx-auto px-2 h-full flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      {theme === 'winamp' ? (
                          // WINAMP HEADER
                          <div className="flex items-center gap-2 w-full" onClick={() => navigateTo('FEED')}>
                              <div className="w-3 h-3 bg-[#DCDCDC] border border-t-white border-l-white border-r-[#505050] border-b-[#505050]"></div>
                              <span className="font-winamp text-[14px] tracking-widest text-white drop-shadow-[1px_1px_0_#000]">NEOARCHIVE MAIN WINDOW</span>
                          </div>
                      ) : (
                          // STANDARD HEADER
                          <>
                            <div className={`font-pixel text-lg font-black tracking-widest cursor-pointer group ${theme === 'xp' ? 'text-white italic drop-shadow-[1px_1px_1px_rgba(0,0,0,0.5)]' : ''}`} onClick={() => navigateTo('FEED')}>
                                NEO<span className={`${theme === 'xp' ? 'text-white' : 'text-green-500'} transition-colors group-hover:text-white`}>ARCHIVE</span>
                            </div>
                            <button onClick={() => navigateTo('COMMUNITY_HUB')} className={`hidden md:flex items-center px-4 py-1.5 rounded-2xl transition-all ${theme === 'dark' ? 'hover:bg-white/10 text-white/70' : 'hover:bg-black/10'}`}>
                                <Globe size={14} className="mr-2"/> <span className="font-pixel text-xs">COMMUNITY</span>
                            </button>
                            <button onClick={() => navigateTo('SEARCH')} className={`flex items-center px-4 py-1.5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : theme === 'xp' ? 'bg-white text-black border-blue-800 shadow-inner' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}>
                                <Search size={14} className={`${theme === 'xp' ? 'opacity-100 text-blue-600' : 'opacity-40'} mr-2`} />
                                <span className="text-xs font-mono opacity-50 hidden md:inline">ПОИСК ПО БАЗЕ...</span>
                            </button>
                          </>
                      )}
                  </div>
                  
                  {theme === 'winamp' ? (
                      // WINAMP CONTROLS (FAKE)
                      <div className="flex gap-1">
                          <div className="w-3 h-3 bg-[#DCDCDC] border border-t-white border-l-white border-r-[#505050] border-b-[#505050] flex items-center justify-center text-[8px] text-black font-bold cursor-pointer hover:bg-white">_</div>
                          <div className="w-3 h-3 bg-[#DCDCDC] border border-t-white border-l-white border-r-[#505050] border-b-[#505050] flex items-center justify-center text-[8px] text-black font-bold cursor-pointer hover:bg-white">X</div>
                      </div>
                  ) : (
                      // STANDARD CONTROLS
                      <div className="flex items-center gap-2 md:gap-4">
                          <button onClick={() => setShowCreateMenu(true)} className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl font-bold font-pixel text-[10px] tracking-widest hover:scale-105 transition-transform mr-2 ${theme === 'xp' ? 'bg-gradient-to-b from-[#3c9c2a] to-[#4cb630] border border-[#265e18] text-white shadow-md' : 'bg-green-500 text-black shadow-[0_0_15px_rgba(74,222,128,0.4)]'}`}>
                              <PlusCircle size={14} /> ДОБАВИТЬ
                          </button>
                          <button onClick={async () => { await db.forceSync(); refreshData(); }} className={`hidden md:block p-2 rounded-xl transition-all ${theme === 'xp' ? 'text-white hover:bg-white/20' : 'hover:bg-white/10'}`}><RefreshCw size={18} /></button>
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
                  )}
              </div>
          </header>
        )}

        <main className={`${theme === 'winamp' ? 'pt-10 pb-20' : 'pt-20 pb-28'} px-4 max-w-7xl mx-auto min-h-screen relative z-10 transition-all duration-700 ${!isInitializing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            
            {view === 'AUTH' && <MatrixLogin theme={theme === 'xp' || theme === 'winamp' ? 'light' : theme} onLogin={(u) => { setUser(u); if(u.settings?.theme) setTheme(u.settings.theme); navigateTo('FEED'); refreshData(); }} />}

            {view === 'SEARCH' && (
                <div key="SEARCH" className="animate-in fade-in duration-300">
                    <SearchView theme={theme} exhibits={exhibits} collections={collections} users={db.getFullDatabase().users} onBack={handleBack} onExhibitClick={handleExhibitClick} onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })} onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })} onLike={handleLike} currentUser={user} />
                </div>
            )}

            {view === 'FEED' && (
                <div key="FEED" className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    {/* Winamp doesn't need big tabs, it needs small buttons or a playlist switch */}
                    {theme === 'winamp' ? (
                        <div className="flex gap-1 mb-4 border-b border-[#505050] pb-2">
                             <button onClick={() => setFeedMode('ARTIFACTS')} className={`px-2 py-1 text-[12px] font-winamp ${feedMode === 'ARTIFACTS' ? 'text-wa-gold' : 'text-wa-green'} hover:text-white`}>[ ARTIFACTS ]</button>
                             <button onClick={() => setFeedMode('COLLECTIONS')} className={`px-2 py-1 text-[12px] font-winamp ${feedMode === 'COLLECTIONS' ? 'text-wa-gold' : 'text-wa-green'} hover:text-white`}>[ COLLECTIONS ]</button>
                             <button onClick={() => setFeedMode('WISHLIST')} className={`px-2 py-1 text-[12px] font-winamp ${feedMode === 'WISHLIST' ? 'text-wa-gold' : 'text-wa-green'} hover:text-white`}>[ WISHLIST ]</button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex gap-6 overflow-x-auto scrollbar-hide w-full">
                                <button onClick={() => setFeedMode('ARTIFACTS')} className={`flex-1 md:flex-none flex justify-center items-center gap-2 font-pixel text-[11px] tracking-widest whitespace-nowrap transition-all ${feedMode === 'ARTIFACTS' ? (theme === 'xp' ? 'text-blue-800 border-b-2 border-blue-800 pb-4' : 'text-green-500 border-b-2 border-green-500 pb-4') : 'opacity-40 hover:opacity-100'}`}><Grid size={14} /> АРТЕФАКТЫ</button>
                                <button onClick={() => setFeedMode('COLLECTIONS')} className={`flex-1 md:flex-none flex justify-center items-center gap-2 font-pixel text-[11px] tracking-widest whitespace-nowrap transition-all ${feedMode === 'COLLECTIONS' ? (theme === 'xp' ? 'text-blue-800 border-b-2 border-blue-800 pb-4' : 'text-green-500 border-b-2 border-green-500 pb-4') : 'opacity-40 hover:opacity-100'}`}><FolderPlus size={14} /> КОЛЛЕКЦИИ</button>
                                <button onClick={() => setFeedMode('WISHLIST')} className={`flex-1 md:flex-none flex justify-center items-center gap-2 font-pixel text-[11px] tracking-widest whitespace-nowrap transition-all ${feedMode === 'WISHLIST' ? (theme === 'xp' ? 'text-blue-800 border-b-2 border-blue-800 pb-4' : 'text-green-500 border-b-2 border-green-500 pb-4') : 'opacity-40 hover:opacity-100'}`}><Radar size={14} /> РАДАР (WISHLIST)</button>
                            </div>
                        </div>
                    )}
                    
                    {/* FEED CONTENT */}
                    <div className="min-h-[50vh] transition-all duration-300">
                    {feedMode === 'ARTIFACTS' && (
                        <div key="ARTIFACTS_TAB" className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            {/* Categories for standard themes */}
                            <div className="space-y-4">
                                <div className={`flex gap-2 overflow-x-auto pb-2 scrollbar-hide ${theme === 'winamp' ? 'border-b border-[#505050]' : ''}`}>
                                    <button onClick={() => { setSelectedCategory('ВСЕ'); setSelectedSubcategory('ВСЕ'); }} className={`whitespace-nowrap transition-all ${theme === 'winamp' ? `px-2 py-1 text-[10px] font-winamp ${selectedCategory === 'ВСЕ' ? 'text-wa-gold' : 'text-wa-green'}` : `px-5 py-2 rounded-xl font-pixel text-[10px] font-bold border ${selectedCategory === 'ВСЕ' ? (theme === 'xp' ? 'bg-[#245DDA] text-white border-[#003c74]' : 'bg-green-500 border-green-500 text-black shadow-[0_0_15px_rgba(74,222,128,0.4)]') : (theme === 'xp' ? 'bg-white/50 border-white text-blue-900' : 'border-white/10 opacity-50')}`}`}>
                                        {theme === 'winamp' ? '[ ALL ]' : 'ВСЕ'}
                                    </button>
                                    {Object.values(DefaultCategory).map(cat => (
                                        <button key={cat} onClick={() => { setSelectedCategory(cat); setSelectedSubcategory('ВСЕ'); }} className={`whitespace-nowrap transition-all ${theme === 'winamp' ? `px-2 py-1 text-[10px] font-winamp ${selectedCategory === cat ? 'text-wa-gold' : 'text-wa-green'}` : `px-5 py-2 rounded-xl font-pixel text-[10px] font-bold border ${selectedCategory === cat ? (theme === 'xp' ? 'bg-[#245DDA] text-white border-[#003c74]' : 'bg-green-500 border-green-500 text-black shadow-[0_0_15px_rgba(74,222,128,0.4)]') : (theme === 'xp' ? 'bg-white/50 border-white text-blue-900' : 'border-white/10 opacity-50')}`}`}>
                                            {theme === 'winamp' ? `[ ${cat} ]` : cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                                {globalExhibits.map(item => (
                                    <ExhibitCard key={item.id} item={item} theme={theme} onClick={handleExhibitClick} isLiked={item.likedBy?.includes(user?.username || '')} onLike={(e) => handleLike(item.id, e)} onAuthorClick={(author) => navigateTo('USER_PROFILE', { username: author })} />
                                ))}
                            </div>
                            
                            {isLoadingMore && <div className="flex justify-center py-10"><RetroLoader text="SYNCHRONIZING..." /></div>}
                        </div>
                    )}
                    {feedMode === 'COLLECTIONS' && (
                        <div key="COLLECTIONS_TAB" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4 duration-300">
                            {collections.length === 0 ? <div className="col-span-full text-center opacity-50 py-10 font-mono text-xs">Коллекций пока нет</div> : collections.map(col => ( <CollectionCard key={col.id} col={col} theme={theme} onClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })} onShare={() => {}} isLiked={col.likedBy?.includes(user?.username || '')} onLike={(e) => handleCollectionLike(col.id, e)} /> ))}
                        </div>
                    )}
                    {feedMode === 'WISHLIST' && (
                        <div key="WISHLIST_TAB" className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className={`font-pixel text-[10px] opacity-50 mb-4 flex items-center gap-2 tracking-[0.2em] uppercase ${theme === 'winamp' ? 'font-winamp text-wa-green' : ''}`}><Search size={14} /> Глобальный розыск</h3>
                                {sortedWishlist.length === 0 ? <div className="col-span-full text-center opacity-50 py-10 font-mono text-xs">Список желаемого пуст</div> : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {sortedWishlist.map(item => ( <WishlistCard key={item.id} item={item} theme={theme} onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })} onClick={(item) => navigateTo('WISHLIST_DETAIL', { wishlistItem: item })} /> ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            )}

            {view === 'COMMUNITY_HUB' && (
                <div key="COMMUNITY_HUB" className="animate-in fade-in">
                    <CommunityHub theme={theme} users={db.getFullDatabase().users} exhibits={exhibits} onExhibitClick={handleExhibitClick} onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })} />
                </div>
            )}

            {view === 'CREATE_ARTIFACT' && (
              <div key="CREATE_ARTIFACT" className="animate-in fade-in slide-in-from-bottom-4">
                  <CreateArtifactView theme={theme} onBack={handleBack} onSave={handleSaveArtifact} userArtifacts={user ? exhibits.filter(e => e.owner === user.username && !e.isDraft) : []} />
              </div>
            )}

            {view === 'CREATE_WISHLIST' && (
                <div key="CREATE_WISHLIST" className="animate-in fade-in slide-in-from-bottom-4">
                    <CreateWishlistItemView theme={theme} onBack={handleBack} onSave={handleSaveWishlist} />
                </div>
            )}

            {view === 'EDIT_ARTIFACT' && selectedExhibit && (
               <div key="EDIT_ARTIFACT" className="animate-in fade-in">
                   <CreateArtifactView theme={theme} onBack={handleBack} onSave={handleSaveArtifact} initialData={selectedExhibit} userArtifacts={user ? exhibits.filter(e => e.owner === user.username && !e.isDraft) : []} />
               </div>
            )}

            {(view === 'CREATE_COLLECTION' || view === 'EDIT_COLLECTION') && user && (
                <div key="CREATE_COLLECTION" className="animate-in fade-in">
                    <CreateCollectionView theme={theme} userArtifacts={exhibits.filter(e => e.owner === user.username && !e.isDraft)} initialData={view === 'EDIT_COLLECTION' ? selectedCollection : null} onBack={handleBack} onSave={handleSaveCollection} onDelete={handleDeleteCollection} />
                </div>
            )}

            {view === 'EXHIBIT' && selectedExhibit && (
                <div key={`EXHIBIT_${selectedExhibit.id}`} className="animate-in fade-in zoom-in-95">
                    <ExhibitDetailPage key={selectedExhibit.id} exhibit={selectedExhibit} theme={theme} onBack={handleBack} onShare={() => {}} onFavorite={() => {}} onLike={(id: string) => handleLike(id)} isFavorited={false} isLiked={selectedExhibit.likedBy?.includes(user?.username || '')} onPostComment={handlePostComment} onCommentLike={handleCommentLike} onDeleteComment={handleDeleteComment} onAuthorClick={(a) => navigateTo('USER_PROFILE', { username: a })} onFollow={handleFollow} onMessage={(u) => { setViewedProfileUsername(u); navigateTo('DIRECT_CHAT', { username: u }); }} currentUser={user?.username || ''} isAdmin={user?.isAdmin || false} isFollowing={user?.following.includes(selectedExhibit.owner) || false} onAddToCollection={(id) => setIsAddingToCollection(id)} onEdit={(item: Exhibit) => navigateTo('EDIT_ARTIFACT', { item })} onDelete={(id: string) => handleDeleteArtifact(id)} onExhibitClick={handleExhibitClick} users={db.getFullDatabase().users} allExhibits={exhibits} highlightCommentId={highlightCommentId} />
                </div>
            )}
            
            {view === 'COLLECTION_DETAIL' && selectedCollection && (
                <div key={`COLLECTION_${selectedCollection.id}`} className="animate-in fade-in zoom-in-95">
                    <CollectionDetailPage key={selectedCollection.id} collection={selectedCollection} artifacts={exhibits.filter(e => (selectedCollection.exhibitIds || []).includes(e.id))} theme={theme} onBack={handleBack} onExhibitClick={handleExhibitClick} onAuthorClick={(a) => navigateTo('USER_PROFILE', { username: a })} currentUser={user?.username || ''} onEdit={() => navigateTo('EDIT_COLLECTION')} onDelete={handleDeleteCollection} onLike={handleLike} />
                </div>
            )}

            {view === 'WISHLIST_DETAIL' && selectedWishlistItem && (
                <div key="WISHLIST_DETAIL" className="animate-in fade-in zoom-in-95">
                    <WishlistDetailView item={selectedWishlistItem} theme={theme} onBack={handleBack} onDelete={handleDeleteWishlist} onAuthorClick={(a) => navigateTo('USER_PROFILE', { username: a })} currentUser={user?.username || ''} />
                </div>
            )}

            {view === 'DIRECT_CHAT' && user && viewedProfileUsername && (
                <div key="DIRECT_CHAT" className="animate-in fade-in">
                    <DirectChat theme={theme} currentUser={user} partnerUsername={viewedProfileUsername} messages={messages.filter(m => (m.sender === user.username && m.receiver === viewedProfileUsername) || (m.sender === viewedProfileUsername && m.receiver === user.username))} onBack={handleBack} onSendMessage={handleSendMessage} />
                </div>
            )}

            {view === 'SOCIAL_LIST' && viewedProfileUsername && (
                <div key="SOCIAL_LIST" className="animate-in fade-in">
                    <SocialListView type={socialListType} username={viewedProfileUsername} currentUserUsername={user?.username} theme={theme} onBack={handleBack} onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })} />
                </div>
            )}

            {view === 'USER_PROFILE' && user && (
                <div key={`PROFILE_${viewedProfileUsername}`} className="animate-in slide-in-from-right-4 fade-in duration-300">
                    <UserProfileView key={viewedProfileUsername} user={user} viewedProfileUsername={viewedProfileUsername} exhibits={exhibits} collections={collections} guestbook={guestbook} theme={theme} onBack={handleBack} onLogout={() => { db.logoutUser(); setUser(null); navigateTo('AUTH'); }} onFollow={handleFollow} onChat={(u) => { setViewedProfileUsername(u); navigateTo('DIRECT_CHAT', { username: u }); }} onExhibitClick={handleExhibitClick} onLike={handleLike} onAuthorClick={(a) => { navigateTo('USER_PROFILE', { username: a }); }} onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })} onShareCollection={() => {}} onViewHallOfFame={() => navigateTo('HALL_OF_FAME')} onGuestbookPost={() => {}} refreshData={refreshData} isEditingProfile={isEditingProfile} setIsEditingProfile={setIsEditingProfile} editTagline={editTagline} setEditTagline={setEditTagline} editBio={editBio} setEditBio={setEditBio} editStatus={editStatus} setEditStatus={setEditStatus} editTelegram={editTelegram} setEditTelegram={setEditTelegram} editPassword={editPassword} setEditPassword={setEditPassword} onSaveProfile={async () => { if(!user) return; const updated = { ...user, tagline: editTagline, bio: editBio, status: editStatus, telegram: editTelegram }; if(editPassword) updated.password = editPassword; await db.updateUserProfile(updated); setUser(updated); setIsEditingProfile(false); }} onProfileImageUpload={async (e: React.ChangeEvent<HTMLInputElement>) => { if(e.target.files && e.target.files[0] && user) { const b64 = await db.fileToBase64(e.target.files[0]); const updated = { ...user, avatarUrl: b64 }; setUser(updated); await db.updateUserProfile(updated); } }} onProfileCoverUpload={async (e: React.ChangeEvent<HTMLInputElement>) => { if(e.target.files && e.target.files[0] && user) { const b64 = await db.fileToBase64(e.target.files[0]); const updated = { ...user, coverUrl: b64 }; setUser(updated); await db.updateUserProfile(updated); } }} guestbookInput={guestbookInput} setGuestbookInput={setGuestbookInput} guestbookInputRef={guestbookInputRef} profileTab={profileTab} setProfileTab={setProfileTab} onOpenSocialList={(u, t) => { setViewedProfileUsername(u); setSocialListType(t); navigateTo('SOCIAL_LIST', { username: u }); }} onThemeChange={(t) => setTheme(t)} onWishlistClick={(item) => navigateTo('WISHLIST_DETAIL', { wishlistItem: item })} />
                </div>
            )}

            {view === 'HALL_OF_FAME' && user && (
                <div key="HALL_OF_FAME" className="animate-in fade-in">
                    <HallOfFame theme={theme} achievements={user.achievements || []} onBack={handleBack} />
                </div>
            )}

            {view === 'ACTIVITY' && user && (
                <div key="ACTIVITY" className="animate-in fade-in">
                    <ActivityView 
                        notifications={notifications} 
                        messages={messages} 
                        currentUser={user} 
                        theme={theme} 
                        onAuthorClick={(a) => navigateTo('USER_PROFILE', { username: a })} 
                        onExhibitClick={(id, commentId) => { 
                            const e = exhibits.find(x => x.id === id); 
                            if(e) navigateTo('EXHIBIT', { item: e, highlightCommentId: commentId }); 
                        }} 
                        onChatClick={(u) => { setViewedProfileUsername(u); navigateTo('DIRECT_CHAT', { username: u }); }} 
                    />
                </div>
            )}
            
            {view === 'MY_COLLECTION' && user && (
                <div key="MY_COLLECTION" className="animate-in slide-in-from-right-4 fade-in duration-300">
                    {/* Pass all exhibits so MyCollection can determine Favorites */}
                    <MyCollection theme={theme} user={user} exhibits={exhibits.filter(e => e.owner === user.username)} allExhibits={exhibits} collections={collections.filter(c => c.owner === user.username)} onBack={handleBack} onExhibitClick={handleExhibitClick} onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })} onLike={handleLike} />
                </div>
            )}

        </main>

        {showCreateMenu && (
            <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowCreateMenu(false)}>
                <div className={`w-full max-w-sm p-6 rounded-3xl border-2 transform transition-all scale-100 ${theme === 'dark' ? 'bg-[#09090b] border-white/10 shadow-[0_0_50px_rgba(74,222,128,0.2)]' : 'bg-white border-black/10 shadow-2xl'}`} onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-pixel text-sm uppercase tracking-widest flex items-center gap-2"><PlusCircle size={16}/> СОЗДАТЬ НОВУЮ ЗАПИСЬ</h3>
                        <button onClick={() => setShowCreateMenu(false)} className="opacity-50 hover:opacity-100 hover:rotate-90 transition-all"><X size={20}/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => { navigateTo('CREATE_ARTIFACT'); setShowCreateMenu(false); }} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all hover:scale-105 active:scale-95 group ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-green-500/50 hover:bg-green-500/10' : 'bg-gray-50 border-black/5 hover:border-black/20'}`}>
                            <div className="w-12 h-12 rounded-full bg-green-500 text-black flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_#4ade80] transition-shadow"><Package size={24} /></div><span className="font-pixel text-[10px] font-bold tracking-widest">АРТЕФАКТ</span>
                        </button>
                        <button onClick={() => { navigateTo('CREATE_COLLECTION'); setShowCreateMenu(false); }} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all hover:scale-105 active:scale-95 group ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-blue-500/50 hover:bg-blue-500/10' : 'bg-gray-50 border-black/5 hover:border-black/20'}`}>
                            <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_#3b82f6] transition-shadow"><Layers size={24} /></div><span className="font-pixel text-[10px] font-bold tracking-widest">КОЛЛЕКЦИЮ</span>
                        </button>
                        <button onClick={() => { navigateTo('CREATE_WISHLIST'); setShowCreateMenu(false); }} className={`col-span-2 flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all hover:scale-105 active:scale-95 group ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-purple-500/50 hover:bg-purple-500/10' : 'bg-gray-50 border-black/5 hover:border-black/20'}`}>
                            <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-shadow"><Search size={24} /></div><span className="font-pixel text-[10px] font-bold tracking-widest">WISHLIST / РАДАР</span>
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        {isAddingToCollection && user && (
            <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4">
                <div className={`w-full max-w-md p-6 rounded-2xl border ${theme === 'dark' ? 'bg-dark-surface border-white/10' : 'bg-white border-black/10'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-pixel text-sm uppercase flex items-center gap-2"><FolderPlus size={16} /> Добавить в коллекцию</h3>
                        <button onClick={() => setIsAddingToCollection(null)} className="opacity-50 hover:opacity-100"><X size={20}/></button>
                    </div>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto mb-4 scrollbar-hide">
                         <button onClick={() => { setIsAddingToCollection(null); navigateTo('CREATE_COLLECTION'); }} className="w-full text-left p-4 rounded-xl border border-dashed border-white/20 hover:bg-white/5 flex items-center justify-center gap-2 mb-4 text-green-500"><PlusCircle size={16} /> <span className="font-pixel text-xs">СОЗДАТЬ НОВУЮ</span></button>
                        {collections.filter(c => c.owner === user.username).length === 0 ? <div className="text-center py-8 opacity-50 font-mono text-xs">Нет коллекций</div> : collections.filter(c => c.owner === user.username).map(col => { const isAdded = col.exhibitIds.includes(isAddingToCollection); return ( <button key={col.id} onClick={() => handleAddItemToCollection(col.id)} disabled={isAdded} className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all ${isAdded ? 'border-green-500/50 bg-green-500/10 opacity-50 cursor-default' : 'border-white/5 hover:bg-white/5 hover:border-white/20'}`}><div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-gray-800 overflow-hidden"><img src={col.coverImage} className="w-full h-full object-cover" /></div><span className="font-pixel text-xs">{col.title}</span></div>{isAdded && <Check size={16} className="text-green-500" />}</button> ); })}
                    </div>
                </div>
            </div>
        )}
        
        {view !== 'AUTH' && (
          <nav className={`fixed bottom-0 left-0 right-0 h-16 border-t backdrop-blur-2xl md:hidden flex justify-around items-center z-50 px-4 pb-safe 
            ${theme === 'winamp' 
              ? 'bg-[#292929] border-t border-[#505050] text-[#00EA00]' 
              : theme === 'dark' 
              ? 'border-white/10 bg-black/60' 
              : theme === 'xp' 
              ? 'bg-[#245DDA]/90 border-[#003c74]' 
              : 'bg-white/80 border-black/10'}`}>
              
              {/* Controls Style for Winamp */}
              {theme === 'winamp' ? (
                  <>
                    <button onClick={() => navigateTo('FEED')} className={`p-2 rounded active:scale-95 active:bg-[#1a1a1a] border border-[#505050] ${view === 'FEED' ? 'text-wa-gold border-wa-gold' : ''}`}><SkipBack size={20} /></button>
                    <button onClick={() => navigateTo('COMMUNITY_HUB')} className={`p-2 rounded active:scale-95 active:bg-[#1a1a1a] border border-[#505050] ${view === 'COMMUNITY_HUB' ? 'text-wa-gold border-wa-gold' : ''}`}><Play size={20} /></button>
                    <button onClick={() => setShowCreateMenu(true)} className={`p-2 rounded active:scale-95 active:bg-[#1a1a1a] border border-[#505050] text-wa-gold`}><PlusCircle size={20} /></button>
                    <button onClick={() => navigateTo('ACTIVITY')} className={`p-2 rounded active:scale-95 active:bg-[#1a1a1a] border border-[#505050] ${view === 'ACTIVITY' ? 'text-wa-gold border-wa-gold' : ''} relative`}>
                        <SquareIcon size={20} fill={view === 'ACTIVITY' ? 'currentColor' : 'none'} />
                        {notifications.some(n => !n.isRead && n.recipient === user?.username) && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
                    </button>
                    <button onClick={() => { if(user) navigateTo('USER_PROFILE', { username: user.username }); }} className={`p-2 rounded active:scale-95 active:bg-[#1a1a1a] border border-[#505050] ${view === 'USER_PROFILE' ? 'text-wa-gold border-wa-gold' : ''}`}><SkipForward size={20} /></button>
                  </>
              ) : (
                  <>
                    <button onClick={() => navigateTo('FEED')} className={`p-2 transition-all ${view === 'FEED' ? (theme === 'xp' ? 'text-white scale-125' : 'text-green-500 scale-125') : 'opacity-40'}`}><LayoutGrid size={24} className={theme === 'xp' ? 'text-white' : ''} /></button>
                    <button onClick={() => navigateTo('COMMUNITY_HUB')} className={`p-2 transition-all ${view === 'COMMUNITY_HUB' ? (theme === 'xp' ? 'text-white scale-125' : 'text-green-500 scale-125') : 'opacity-40'}`}><Globe size={24} className={theme === 'xp' ? 'text-white' : ''} /></button>
                    <div className="relative -top-5"><button onClick={() => setShowCreateMenu(true)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${theme === 'xp' ? 'bg-green-600 border-4 border-[#245DDA] shadow-lg text-white font-serif italic' : 'bg-green-500 text-black shadow-[0_0_20px_rgba(74,222,128,0.5)] border-4 border-black'}`}><PlusCircle size={32} /></button></div>
                    <button onClick={() => navigateTo('ACTIVITY')} className={`p-2 transition-all ${view === 'ACTIVITY' ? (theme === 'xp' ? 'text-white scale-125' : 'text-green-500 scale-125') : 'opacity-40'} relative`}><Bell size={24} className={theme === 'xp' ? 'text-white' : ''} />{notifications.some(n => !n.isRead && n.recipient === user?.username) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-black animate-pulse" />}</button>
                    <button onClick={() => { if(user) navigateTo('USER_PROFILE', { username: user.username }); }} className={`p-2 transition-all ${view === 'USER_PROFILE' ? (theme === 'xp' ? 'text-white scale-125' : 'text-green-500 scale-125') : 'opacity-40'}`}><User size={24} className={theme === 'xp' ? 'text-white' : ''} /></button>
                  </>
              )}
          </nav>
        )}
    </div>
  );
}
