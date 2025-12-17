
import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, PlusSquare, Sun, Moon, ChevronDown, LogOut, Search, Database, Trash2, 
  Activity, Bell, FilePlus, FolderPlus, Grid, Share2, Award, Crown, 
  ChevronLeft, ChevronRight, Camera, Edit2, Save, Check, Send, 
  Video, Image as ImageIcon, WifiOff, Download, Box, Package, User,
  X, ArrowLeft, Upload, Home, PlusCircle, Heart, MessageSquare, MessageCircle, FolderOpen,
  Settings, Loader, RefreshCw
} from 'lucide-react';
import MatrixRain from './components/MatrixRain';
import CRTOverlay from './components/CRTOverlay';
import ExhibitCard from './components/ExhibitCard';
import RetroLoader from './components/RetroLoader';
import ExhibitDetailPage from './components/ExhibitDetailPage';
import ErrorBoundary from './components/ErrorBoundary';
import MatrixLogin from './components/MatrixLogin';
import HallOfFame from './components/HallOfFame';
import MyCollection from './components/MyCollection';
import StorageMonitor from './components/StorageMonitor';
import UserProfileView from './components/UserProfileView';
import CollectionCard from './components/CollectionCard';
import { Exhibit, ViewState, Comment, UserProfile, Collection, Notification, Message, GuestbookEntry, UserStatus } from './types';
import { DefaultCategory, CATEGORY_SPECS_TEMPLATES, SUBCATEGORY_SPECS, CATEGORY_CONDITIONS, SUBCATEGORY_CONDITIONS, COMMON_SPEC_VALUES, CATEGORY_SUBCATEGORIES, calculateArtifactScore } from './constants';
import { moderateContent, moderateImage } from './services/geminiService';
import * as db from './services/storageService';
import { compressImage, isOffline, getUserAvatar, autoCleanStorage, updateUserPreference } from './services/storageService';
import useSwipe from './hooks/useSwipe';

// Helper to generate specs based on category AND subcategory
const generateSpecsForCategory = (cat: string, subcat?: string) => {
    let template = CATEGORY_SPECS_TEMPLATES[cat] || [];
    if (subcat && SUBCATEGORY_SPECS[cat] && SUBCATEGORY_SPECS[cat][subcat]) {
        template = SUBCATEGORY_SPECS[cat][subcat];
    }
    const specs: Record<string, string> = {};
    template.forEach(key => specs[key] = '');
    return specs;
};

// Helper to get default condition for category/subcategory
const getDefaultCondition = (cat: string, subcat?: string) => {
    if (subcat && SUBCATEGORY_CONDITIONS[subcat]) {
        return SUBCATEGORY_CONDITIONS[subcat][0];
    }
    const conditions = CATEGORY_CONDITIONS[cat] || CATEGORY_CONDITIONS[DefaultCategory.MISC];
    return conditions[0];
};

const getConditionsList = (cat: string, subcat?: string) => {
    if (subcat && SUBCATEGORY_CONDITIONS[subcat]) return SUBCATEGORY_CONDITIONS[subcat];
    return CATEGORY_CONDITIONS[cat] || CATEGORY_CONDITIONS[DefaultCategory.MISC];
};

const HeroSection: React.FC<{ theme: 'dark' | 'light'; user: UserProfile | null }> = ({ theme, user }) => (
    <div className={`hidden md:block relative mb-6 p-6 rounded-lg border-2 border-dashed overflow-hidden group ${theme === 'dark' ? 'border-dark-dim bg-dark-surface/50 hover:border-dark-primary transition-colors' : 'border-light-dim bg-white/50 hover:border-light-accent transition-colors'}`}>
        <div className={`absolute top-0 left-0 w-1 h-full opacity-50 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-light-accent'}`}></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className={`text-sm md:text-2xl lg:text-3xl font-pixel mb-2 break-words ${theme === 'dark' ? 'text-white' : 'text-black'}`}>NEO_ARCHIVE</h1>
                <p className={`font-mono text-[10px] md:text-sm max-w-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Цифровой ковчег для сохранения артефактов прошлого в облачной вечности.</p>
            </div>
        </div>
        <div className={`absolute inset-0 pointer-events-none opacity-5 bg-gradient-to-r from-transparent via-current to-transparent animate-[shimmer_2s_infinite] ${theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'}`} />
    </div>
);

const MobileNavigation: React.FC<{ theme: 'dark' | 'light'; view: ViewState; setView: (v: ViewState) => void; updateHash: (path: string) => void; hasNotifications: boolean; username: string; onResetFeed: () => void; onProfileClick: () => void; }> = ({ theme, view, setView, updateHash, hasNotifications, username, onResetFeed, onProfileClick }) => {
    const navItems = [
        { id: 'FEED', icon: Home, label: 'ГЛАВНАЯ', action: () => { onResetFeed(); setView('FEED'); updateHash('/feed'); } },
        { id: 'MY_COLLECTION', icon: Package, label: 'ПОЛКА', action: () => { setView('MY_COLLECTION'); updateHash('/my-collection'); } },
        { id: 'ADD', icon: PlusCircle, label: 'ДОБАВИТЬ', action: () => { setView('CREATE_HUB'); updateHash('/create'); }, highlight: true },
        { id: 'ACTIVITY', icon: Bell, label: 'АКТИВНОСТЬ', action: () => { setView('ACTIVITY'); updateHash('/activity'); }, hasBadge: hasNotifications },
        { id: 'PROFILE', icon: User, label: 'ПРОФИЛЬ', action: onProfileClick }
    ];
    return (
        <div className={`md:hidden fixed bottom-0 left-0 w-full z-50 border-t pb-safe ${theme === 'dark' ? 'bg-black/95 border-dark-dim text-gray-400' : 'bg-white/95 border-light-dim text-gray-500'}`}>
            <div className="flex justify-around items-center h-16">
                {navItems.map(item => {
                    const isActive = view === item.id || (item.id === 'PROFILE' && view === 'USER_PROFILE') || (item.id === 'ADD' && ['CREATE_HUB', 'CREATE_ARTIFACT', 'CREATE_COLLECTION'].includes(view)) || (item.id === 'ACTIVITY' && ['ACTIVITY', 'DIRECT_CHAT'].includes(view));
                    return (
                        <button key={item.id} onClick={item.action} className={`flex flex-col items-center justify-center w-full h-full gap-1 relative ${isActive ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') : ''}`}>
                            <item.icon size={item.highlight ? 28 : 20} strokeWidth={item.highlight ? 2 : 1.5} className={item.highlight ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') : ''} />
                            {!item.highlight && <span className="text-[8px] font-pixel mt-1">{item.label}</span>}
                            {item.hasBadge && <span className="absolute top-3 right-6 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const LoginTransition: React.FC = () => (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-green-500 font-pixel">
      <div className="space-y-4 text-center p-4">
        <div className="text-3xl md:text-5xl animate-pulse font-bold tracking-widest text-shadow-glow">ACCESS GRANTED</div>
        <div className="font-mono text-xs md:text-sm opacity-80 flex flex-col gap-1"><span className="animate-[fade_0.5s_ease-in-out_infinite]">DECRYPTING USER DATA...</span><span className="text-[10px] opacity-60">KEY: RSA-4096-VERIFIED</span></div>
        <div className="w-64 h-3 border-2 border-green-900 p-0.5 mx-auto rounded relative overflow-hidden bg-green-900/20"><div className="h-full bg-green-500 animate-[width_2.5s_cubic-bezier(0.4,0,0.2,1)_forwards]" style={{width: '0%', boxShadow: '0 0 10px #22c55e'}}></div></div>
        <div className="font-mono text-[10px] opacity-50 mt-4 animate-pulse">ESTABLISHING SECURE CONNECTION TO MATRIX...</div>
      </div>
      <style>{`@keyframes width { 0% { width: 5%; } 30% { width: 45%; } 60% { width: 55%; } 80% { width: 90%; } 100% { width: 100%; } } .text-shadow-glow { text-shadow: 0 0 10px #22c55e, 0 0 20px #22c55e; }`}</style>
    </div>
);

const InstallBanner: React.FC<{ theme: 'dark' | 'light'; onInstall: () => void; onClose: () => void }> = ({ theme, onInstall, onClose }) => (
    <div className={`fixed top-14 left-0 w-full z-40 p-2 flex justify-center animate-in slide-in-from-top-2`}>
        <div className={`flex items-center gap-3 p-3 rounded border-2 shadow-lg backdrop-blur-md max-w-sm w-full justify-between ${theme === 'dark' ? 'bg-black/90 border-dark-primary text-white shadow-dark-primary/20' : 'bg-white/90 border-light-accent text-black shadow-light-accent/20'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded border ${theme === 'dark' ? 'border-dark-primary bg-dark-primary/20' : 'border-light-accent bg-light-accent/20'}`}><Download size={20} className="animate-bounce" /></div>
                <div><h3 className="font-pixel text-[10px] font-bold">SYSTEM UPDATE</h3><p className="font-mono text-[9px] opacity-80">Установить приложение?</p></div>
            </div>
            <div className="flex gap-2">
                <button onClick={onInstall} className={`px-3 py-1 font-pixel text-[9px] font-bold uppercase border hover:bg-current hover:text-black transition-colors ${theme === 'dark' ? 'border-dark-primary text-dark-primary' : 'border-light-accent text-light-accent'}`}>INSTALL</button>
                <button onClick={onClose} className="opacity-50 hover:opacity-100"><X size={16} /></button>
            </div>
        </div>
    </div>
);

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [view, setView] = useState<ViewState>('AUTH'); 
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoginTransition, setIsLoginTransition] = useState(false);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>('ВСЕ');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [viewedProfile, setViewedProfile] = useState<string | null>(null);
  const [activityTab, setActivityTab] = useState<'UPDATES' | 'DIALOGS'>('UPDATES');
  const [showDesktopNotifications, setShowDesktopNotifications] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Feed Pagination
  const [feedPage, setFeedPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [loadingFeed, setLoadingFeed] = useState(false);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('ONLINE');
  const [editTelegram, setEditTelegram] = useState('');
  const [guestbookInput, setGuestbookInput] = useState('');
  const guestbookInputRef = useRef<HTMLInputElement>(null);

  const [feedMode, setFeedMode] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');
  const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');
  const [chatPartner, setChatPartner] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);
  const [editingExhibitId, setEditingExhibitId] = useState<string | null>(null);
  const [viewedExhibitsSession, setViewedExhibitsSession] = useState<Set<string>>(new Set());

  const [newExhibit, setNewExhibit] = useState<Partial<Exhibit>>({
    category: DefaultCategory.PHONES,
    subcategory: '', 
    specs: generateSpecsForCategory(DefaultCategory.PHONES),
    condition: getDefaultCondition(DefaultCategory.PHONES),
    imageUrls: []
  });
  
  const [newCollection, setNewCollection] = useState<{title: string, description: string, coverImage: string}>({ 
      title: '', 
      description: '', 
      coverImage: '' 
  });

  const refreshData = () => {
      // Sync from cache primarily for speed
      setExhibits([...db.getExhibits()]);
      setCollections([...db.getCollections()]);
      setNotifications([...db.getNotifications()]);
      setMessages([...db.getMessages()]);
      setGuestbook([...db.getGuestbook()]);
  };

  const handleManualSync = async () => {
      setIsSyncing(true);
      await db.forceSync();
      refreshData();
      setTimeout(() => setIsSyncing(false), 500);
  };

  useEffect(() => {
      if (view === 'AUTH' || isOffline()) return;
      const interval = setInterval(async () => {
          const hasUpdates = await db.backgroundSync();
          if (hasUpdates) refreshData();
      }, 15000); 
      return () => clearInterval(interval);
  }, [view]);

  // Infinite Scroll Observer for Pagination
  useEffect(() => {
    if (view !== 'FEED') return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && !loadingFeed && exhibits.length > 0) {
           setLoadingFeed(true);
           const nextBatch = await db.loadFeedBatch(feedPage + 1);
           if (nextBatch.length > 0) {
               setFeedPage(prev => prev + 1);
               // Refresh from cache which now contains new items
               setExhibits([...db.getExhibits()]); 
           }
           setLoadingFeed(false);
        }
      },
      { threshold: 1.0, rootMargin: '100px' }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [view, feedPage, loadingFeed, exhibits.length]);

  useEffect(() => {
    autoCleanStorage();
    const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        const isDismissed = localStorage.getItem('pwa_dismissed') === 'true';
        const showCount = parseInt(localStorage.getItem('pwa_show_count') || '0', 10);
        if (!isDismissed && showCount < 2) {
            setShowInstallBanner(true);
            localStorage.setItem('pwa_show_count', (showCount + 1).toString());
        }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    const init = async () => {
        try {
            const restoredUser = await db.initializeDatabase();
            if (restoredUser) {
                 setUser(restoredUser);
                 refreshData();
                 if (!window.location.hash || window.location.hash === '#/') {
                     setView('FEED');
                     updateHash('/feed');
                 }
            } else {
                 setView('AUTH');
            }
        } catch (e: any) {
            setView('AUTH');
        } finally {
            setIsInitializing(false);
        }
    };
    init();
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setShowInstallBanner(false);
          localStorage.setItem('pwa_dismissed', 'true');
      }
  };

  const handleDismissInstall = () => {
      setShowInstallBanner(false);
      localStorage.setItem('pwa_dismissed', 'true');
  };

  useEffect(() => {
      const handleHashChange = () => {
          if (!user) {
              if (view !== 'AUTH') setView('AUTH');
              return;
          }
          const hash = window.location.hash;
          if (hash === '#/activity') { setView('ACTIVITY'); return; }
          if (hash === '#/search') { setView('SEARCH'); return; }
          if (hash === '#/hall-of-fame') { setView('HALL_OF_FAME'); return; }
          if (hash === '#/my-collection') { setView('MY_COLLECTION'); return; }
          if (hash === '#/create') { setView('CREATE_HUB'); return; }
          if (hash === '#/create/artifact') { setView('CREATE_ARTIFACT'); return; }
          if (hash === '#/create/collection') { setView('CREATE_COLLECTION'); return; }
          if (hash === '#/settings') { setView('SETTINGS'); return; }
          if (hash.startsWith('#/chat/')) {
              const partner = hash.split('/')[2];
              if (partner) { setChatPartner(partner); setView('DIRECT_CHAT'); }
              return;
          }
          if (hash.startsWith('#/exhibit/')) {
              const param = hash.split('/')[2];
              const item = exhibits.find(e => e.slug === param || e.id === param);
              if (item) { setSelectedExhibit(item); setView('EXHIBIT'); }
              return;
          } 
          if (hash.startsWith('#/collection/')) {
              const param = hash.split('/')[2];
              const col = collections.find(c => c.slug === param || c.id === param);
              if (col) { setSelectedCollection(col); setView('COLLECTION_DETAIL'); }
              return;
          } 
          if (hash.startsWith('#/profile/')) {
              const username = hash.split('/')[2];
              if (username) { setViewedProfile(username); setView('USER_PROFILE'); }
              return;
          } 
          if (hash === '#/feed' || hash === '' || hash === '#/') {
              setView('FEED');
          }
      };
      if (!isInitializing && exhibits.length > 0) {
          handleHashChange();
      }
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
  }, [exhibits, collections, user, isInitializing]); 

  const updateHash = (path: string) => { window.location.hash = path; };

  const handleResetFeed = () => {
      setFeedMode('ARTIFACTS');
      setSelectedCategory('ВСЕ');
  };

  const handleGlobalSwipeLeft = () => {
      if (view === 'AUTH' || !user) return;
      const order: ViewState[] = ['FEED', 'MY_COLLECTION', 'CREATE_HUB', 'ACTIVITY', 'USER_PROFILE'];
      const idx = order.indexOf(view);
      if (idx !== -1 && idx < order.length - 1) {
          const next = order[idx+1];
          if (next === 'USER_PROFILE') { setViewedProfile(user.username); updateHash(`/profile/${user.username}`); }
          else if (next === 'FEED') { handleResetFeed(); updateHash('/feed'); }
          else if (next === 'MY_COLLECTION') updateHash('/my-collection');
          else if (next === 'CREATE_HUB') updateHash('/create');
          else if (next === 'ACTIVITY') updateHash('/activity');
          setView(next);
      }
  };

  const handleGlobalSwipeRight = () => {
      if (view === 'AUTH' || !user) return;
      const order: ViewState[] = ['FEED', 'MY_COLLECTION', 'CREATE_HUB', 'ACTIVITY', 'USER_PROFILE'];
      const idx = order.indexOf(view);
      if (idx > 0) {
          const prev = order[idx-1];
          if (prev === 'FEED') { handleResetFeed(); updateHash('/feed'); }
          else if (prev === 'MY_COLLECTION') updateHash('/my-collection');
          else if (prev === 'CREATE_HUB') updateHash('/create');
          else if (prev === 'ACTIVITY') updateHash('/activity');
          setView(prev);
      }
  };

  const globalSwipeHandlers = useSwipe({
      onSwipeLeft: handleGlobalSwipeLeft,
      onSwipeRight: handleGlobalSwipeRight
  });

  const handleLogin = (loggedInUser: UserProfile, remember: boolean) => {
      setIsLoginTransition(true);
      if (remember) {
          localStorage.setItem('neo_active_user', loggedInUser.username);
      }
      
      // Force sync during transition so data is ready when animation ends
      db.forceSync().then(() => {
          refreshData();
      }).catch(console.error);

      setTimeout(() => {
          setUser(loggedInUser);
          setView('FEED');
          updateHash('/feed');
          refreshData();
          setIsLoginTransition(false); 
      }, 2500);
  };

  const handleLogout = async () => {
      try {
          db.logoutUser().catch(e => console.warn("Background logout error", e));
      } finally {
          window.location.hash = ''; 
          setUser(null);
          setView('AUTH');
      }
  };

  const handleExhibitClick = (item: Exhibit) => {
      if (!item) return;
      if (!viewedExhibitsSession.has(item.id)) {
          if(user) db.updateUserPreference(user.username, item.category, 0.1);
          const updatedItem = { ...item, views: item.views + 1 };
          db.updateExhibit(updatedItem);
          const exIndex = exhibits.findIndex(x => x.id === item.id);
          if (exIndex !== -1) {
              const updatedList = [...exhibits];
              updatedList[exIndex] = updatedItem;
              setExhibits(updatedList);
          }
          setViewedExhibitsSession(prev => new Set(prev).add(item.id));
          setSelectedExhibit(updatedItem);
      } else {
          setSelectedExhibit(item);
      }
      setView('EXHIBIT');
      updateHash(`/exhibit/${item.slug || item.id}`);
  };

  const handleEditExhibit = (item: Exhibit) => {
      setEditingExhibitId(item.id);
      setNewExhibit({
          title: item.title,
          description: item.description,
          category: item.category,
          subcategory: item.subcategory,
          condition: item.condition,
          imageUrls: item.imageUrls,
          videoUrl: item.videoUrl,
          specs: item.specs || {},
          isDraft: item.isDraft
      });
      setView('CREATE_ARTIFACT');
      updateHash('/create/artifact');
  };

  const handleCollectionClick = (col: Collection) => {
      setSelectedCollection(col);
      setView('COLLECTION_DETAIL');
      updateHash(`/collection/${col.slug || col.id}`);
  };

  const handleAuthorClick = (author: string) => {
      setViewedProfile(author);
      setProfileTab('ARTIFACTS'); 
      setIsEditingProfile(false);
      setView('USER_PROFILE');
      updateHash(`/profile/${author}`);
  };

  const handleBack = () => {
      setSelectedExhibit(null);
      setSelectedCollection(null);
      setView('FEED');
      updateHash('/feed');
      refreshData();
  };

  const toggleLike = (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const exIndex = exhibits.findIndex(x => x.id === id);
      if (exIndex === -1) return;
      const updatedExhibits = [...exhibits];
      const ex = { ...updatedExhibits[exIndex] }; 
      const username = user?.username || 'Guest';
      if (!ex.likedBy) ex.likedBy = [];
      const alreadyLiked = ex.likedBy.includes(username);
      if (alreadyLiked) {
          ex.likes = Math.max(0, ex.likes - 1);
          ex.likedBy = ex.likedBy.filter(u => u !== username);
      } else {
          ex.likes++;
          ex.likedBy.push(username);
          if(user) db.updateUserPreference(user.username, ex.category, 1.0);
          if (ex.owner !== username) {
             const notif: Notification = {
                 id: Date.now().toString(),
                 type: 'LIKE',
                 actor: username,
                 recipient: ex.owner,
                 targetId: ex.id,
                 targetPreview: ex.title,
                 timestamp: new Date().toLocaleString('ru-RU'),
                 isRead: false
             };
             db.saveNotification(notif);
             setNotifications(prev => [notif, ...prev]);
          }
      }
      db.updateExhibit(ex);
      updatedExhibits[exIndex] = ex;
      setExhibits(updatedExhibits);
      if (selectedExhibit && selectedExhibit.id === id) {
          setSelectedExhibit(ex);
      }
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      alert(`ДОБАВЛЕНО В ИЗБРАННОЕ [ID: ${id}]`);
  };

  const handlePostComment = (id: string, text: string) => {
      if (!text.trim()) return;
      const exIndex = exhibits.findIndex(x => x.id === id);
      if (exIndex === -1) return;
      const updatedExhibits = [...exhibits];
      const ex = { ...updatedExhibits[exIndex] }; 
      const username = user?.username || 'Guest';
      if(user) db.updateUserPreference(user.username, ex.category, 2.0);
      const newComment: Comment = {
          id: Date.now().toString(),
          author: username,
          text: text,
          timestamp: new Date().toLocaleString('ru-RU'),
          likes: 0,
          likedBy: []
      };
      ex.comments = [newComment, ...(ex.comments || [])];
      db.updateExhibit(ex);
      updatedExhibits[exIndex] = ex;
      setExhibits(updatedExhibits);
      if (ex.owner !== username) {
         const notif: Notification = {
             id: Date.now().toString(),
             type: 'COMMENT',
             actor: username,
             recipient: ex.owner,
             targetId: ex.id,
             targetPreview: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
             timestamp: new Date().toLocaleString('ru-RU'),
             isRead: false
         };
         db.saveNotification(notif);
         setNotifications(prev => [notif, ...prev]);
      }
      if (selectedExhibit && selectedExhibit.id === id) setSelectedExhibit(ex);
  };

  const handleCreateExhibit = async (isDraft = false) => {
     if (!newExhibit.title || newExhibit.title.length < 3) {
         alert('ОШИБКА: ЗАГОЛОВОК ДОЛЖЕН БЫТЬ НЕ МЕНЕЕ 3 СИМВОЛОВ');
         return;
     }
     if (!newExhibit.description && !isDraft) {
         alert('ОШИБКА: ОПИСАНИЕ ОБЯЗАТЕЛЬНО ДЛЯ ПУБЛИКАЦИИ');
         return;
     }
     if ((!newExhibit.imageUrls || newExhibit.imageUrls.length === 0) && !isDraft) {
         alert('ОШИБКА: НЕОБХОДИМО ЗАГРУЗИТЬ МИНИМУМ ОДНО ИЗОБРАЖЕНИЕ');
         return;
     }
     setIsLoading(true);
     if (!isDraft) {
         const modResult = await moderateContent(`${newExhibit.title} ${newExhibit.description}`);
         if (!modResult.allowed) {
             setIsLoading(false);
             alert(`ОТКАЗАНО: ${modResult.reason || 'НАРУШЕНИЕ ПРАВИЛ'}`);
             return;
         }
     }
     const exhibit: Exhibit = {
         id: editingExhibitId || Date.now().toString(),
         title: newExhibit.title,
         description: newExhibit.description || '',
         imageUrls: newExhibit.imageUrls || [],
         videoUrl: newExhibit.videoUrl, 
         category: newExhibit.category || DefaultCategory.MISC,
         subcategory: newExhibit.subcategory, 
         owner: user?.username || 'Guest',
         timestamp: new Date().toLocaleString('ru-RU'),
         likes: editingExhibitId ? exhibits.find(e => e.id === editingExhibitId)?.likes || 0 : 0,
         likedBy: editingExhibitId ? exhibits.find(e => e.id === editingExhibitId)?.likedBy || [] : [],
         views: editingExhibitId ? exhibits.find(e => e.id === editingExhibitId)?.views || 0 : 0,
         specs: newExhibit.specs || {},
         comments: editingExhibitId ? exhibits.find(e => e.id === editingExhibitId)?.comments || [] : [],
         quality: newExhibit.quality || 'Не указано',
         condition: newExhibit.condition || getDefaultCondition(newExhibit.category || DefaultCategory.MISC),
         isDraft: isDraft
     };
     if (editingExhibitId) await db.updateExhibit(exhibit); else await db.saveExhibit(exhibit);
     setExhibits([...db.getExhibits()]);
     setNewExhibit({ 
         category: DefaultCategory.PHONES, 
         specs: generateSpecsForCategory(DefaultCategory.PHONES),
         condition: getDefaultCondition(DefaultCategory.PHONES),
         imageUrls: [],
         videoUrl: ''
     });
     setEditingExhibitId(null);
     setIsLoading(false);
     if (isDraft) {
         alert('ЧЕРНОВИК СОХРАНЕН');
         setView('MY_COLLECTION');
         updateHash('/my-collection');
     } else {
         setView('FEED');
         updateHash('/feed');
     }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        try {
            const base64 = await compressImage(e.target.files[0]);
            setNewExhibit(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), base64] }));
        } catch (err: any) { alert("Ошибка загрузки изображения"); }
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const base64 = await compressImage(e.target.files[0]);
              setEditAvatarUrl(base64); 
              if (user) {
                  const updatedUser = { ...user, avatarUrl: base64 };
                  setUser(updatedUser); 
                  await db.updateUserProfile(updatedUser);
              }
          } catch (err: any) { alert("Ошибка загрузки изображения"); }
      }
  };
  
  const handleNewCollectionCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const base64 = await compressImage(e.target.files[0]);
              setNewCollection(prev => ({ ...prev, coverImage: base64 }));
          } catch(err: any) { alert("Ошибка загрузки обложки"); }
      }
  };

  const handleCollectionCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && collectionToEdit) {
          try {
              const base64 = await compressImage(e.target.files[0]);
              setCollectionToEdit({...collectionToEdit, coverImage: base64});
          } catch(err: any) { alert("Ошибка загрузки"); }
      }
  };

  const removeImage = (index: number) => {
    setNewExhibit(prev => ({ ...prev, imageUrls: (prev.imageUrls || []).filter((_, i) => i !== index) }));
  };

  const handleCreateCollection = async () => {
      if (!newCollection.title) return;
      setIsLoading(true);
      const newCol: Collection = {
          id: Date.now().toString(),
          title: newCollection.title,
          description: newCollection.description,
          owner: user?.username || 'Guest',
          coverImage: newCollection.coverImage,
          exhibitIds: [],
          timestamp: new Date().toLocaleString('ru-RU')
      };
      await db.saveCollection(newCol);
      setCollections([...db.getCollections()]); 
      setNewCollection({ title: '', description: '', coverImage: '' });
      setIsLoading(false);
      setCollectionToEdit(newCol);
      setView('EDIT_COLLECTION'); 
      updateHash('/create'); 
  };

  const handleDeleteExhibit = (id: string) => {
      db.deleteExhibit(id);
      refreshData();
      handleBack();
  };

  const handleOpenChat = (partnerUsername: string) => {
      if (!user) return;
      setChatPartner(partnerUsername);
      db.markMessagesRead(partnerUsername, user.username);
      setMessages([...db.getMessages()]);
      setView('DIRECT_CHAT');
      updateHash(`/chat/${partnerUsername}`);
  };

  const handleSendMessage = () => {
      if(!chatInput.trim() || !user || !chatPartner) return;
      const newMessage: Message = {
          id: Date.now().toString(),
          sender: user.username,
          receiver: chatPartner,
          text: chatInput,
          timestamp: new Date().toLocaleString('ru-RU'),
          isRead: false
      };
      db.saveMessage(newMessage);
      setMessages([...messages, newMessage]);
      setChatInput('');
  };

  const handleEditCollection = (col: Collection) => {
      setCollectionToEdit(col);
      setView('EDIT_COLLECTION');
  };

  const handleSaveCollection = () => {
      if(collectionToEdit) {
          db.updateCollection(collectionToEdit);
          setCollections(db.getCollections());
          setSelectedCollection(collectionToEdit);
          setView('COLLECTION_DETAIL');
      }
  };

  const handleDeleteCollection = () => {
      if(collectionToEdit && window.confirm("УДАЛИТЬ КОЛЛЕКЦИЮ?")) {
          db.deleteCollection(collectionToEdit.id);
          refreshData();
          setView('FEED');
      }
  };

  const handleShareCollection = async (col: Collection) => {
      const url = `${window.location.origin}/#/collection/${col.slug || col.id}`;
      if (navigator.share) {
          try { await navigator.share({ title: `NeoArchive: ${col.title}`, text: col.description, url: url }); } catch (err: any) {}
      } else {
          try { await navigator.clipboard.writeText(url); alert('Ссылка скопирована!'); } catch (err: any) {}
      }
  };
  
  const handleOpenUpdates = () => {
      setActivityTab('UPDATES');
      if (user) {
          db.markNotificationsRead(user.username);
          setNotifications([...db.getNotifications()]);
      }
      setView('ACTIVITY');
      updateHash('/activity');
  };

  const groupNotifications = (notifs: Notification[]) => {
      const grouped: { [key: string]: Notification & { count: number, ids: string[], isRead: boolean } } = {};
      const sortedNotifs = [...notifs].sort((a, b) => b.id.localeCompare(a.id));
      sortedNotifs.forEach(n => {
          const key = `${n.actor.trim().toLowerCase()}-${n.type}`;
          if (!grouped[key]) {
              grouped[key] = { ...n, count: 1, ids: [n.id], isRead: n.isRead };
          } else {
              grouped[key].count++;
              grouped[key].ids.push(n.id);
              if (!n.isRead) grouped[key].isRead = false;
              if (n.id > grouped[key].id) {
                  grouped[key].id = n.id;
                  grouped[key].timestamp = n.timestamp;
                  grouped[key].targetPreview = n.targetPreview;
              }
          }
      });
      return Object.values(grouped).sort((a,b) => b.id.localeCompare(a.id));
  };

  const renderNotificationText = (n: Notification & { count: number }) => {
      switch (n.type) {
          case 'LIKE': return n.count > 1 ? `оценил ${n.count} артефактов` : 'оценил ваш артефакт';
          case 'COMMENT': return n.count > 1 ? `оставил ${n.count} комментариев` : 'оставил комментарий';
          case 'FOLLOW': return 'теперь читает вас';
          case 'GUESTBOOK': return 'оставил запись в гостевой книге';
          default: return n.targetPreview || 'Новое действие';
      }
  };

  const handleNotificationClick = (n: Notification & { count?: number }) => {
      if (n.count === 1 && n.targetId) {
          const item = exhibits.find(e => e.id === n.targetId);
          if (item) { handleExhibitClick(item); return; }
      }
      handleAuthorClick(n.actor);
  };

  const handleFollow = (targetUser: string) => {
      if (!user) return;
      const isFollowing = user.following.includes(targetUser);
      let updatedFollowing = [...user.following];
      if (isFollowing) updatedFollowing = updatedFollowing.filter(u => u !== targetUser);
      else {
          updatedFollowing.push(targetUser);
          if (targetUser !== user.username) {
             const notif: Notification = { id: Date.now().toString(), type: 'FOLLOW', actor: user.username, recipient: targetUser, timestamp: new Date().toLocaleString('ru-RU'), isRead: false };
             db.saveNotification(notif);
             setNotifications(prev => [notif, ...prev]);
          }
      }
      const updatedUser = { ...user, following: updatedFollowing };
      setUser(updatedUser);
      db.updateUserProfile(updatedUser);
  };

  const handleSaveProfile = async () => {
      if (!user) return;
      const targetUsername = viewedProfile || user.username;
      const existingData = db.getFullDatabase().users.find(u => u.username === targetUsername);
      if (!existingData) return;
      const updatedUser: UserProfile = { ...existingData, tagline: editTagline, avatarUrl: editAvatarUrl || existingData.avatarUrl, status: editStatus, telegram: editTelegram };
      await db.updateUserProfile(updatedUser);
      if (user.username === targetUsername) setUser(updatedUser);
      refreshData();
      setIsEditingProfile(false);
  };

  const handleGuestbookPost = async () => {
      if (!guestbookInput.trim() || !user || !viewedProfile) return;
      const entry: GuestbookEntry = { id: Date.now().toString(), author: user.username, targetUser: viewedProfile, text: guestbookInput, timestamp: new Date().toLocaleString('ru-RU'), isRead: false };
      db.saveGuestbookEntry(entry);
      setGuestbook([...guestbook, entry]);
      if (viewedProfile !== user.username) {
         const notif: Notification = { id: Date.now().toString(), type: 'GUESTBOOK', actor: user.username, recipient: viewedProfile, targetPreview: guestbookInput.substring(0, 20) + '...', timestamp: new Date().toLocaleString('ru-RU'), isRead: false };
         db.saveNotification(notif);
         setNotifications(prev => [notif, ...prev]);
      }
      setGuestbookInput('');
  };

  const userNotifications = user ? notifications.filter(n => n.recipient === user.username) : [];
  const aggregatedNotifications = groupNotifications(userNotifications);

  const renderContentArea = () => {
    if (view === 'AUTH') return <MatrixLogin theme={theme} onLogin={handleLogin} />;
    if (view === 'HALL_OF_FAME') return <HallOfFame theme={theme} achievedIds={user?.achievements || []} onBack={handleBack} />;
    if (view === 'MY_COLLECTION' && user) return <MyCollection theme={theme} user={user} exhibits={exhibits.filter(e => e.owner === user.username)} collections={collections.filter(c => c.owner === user.username)} onBack={handleBack} onExhibitClick={handleExhibitClick} onCollectionClick={handleCollectionClick} onLike={toggleLike} />;
    if (view === 'USER_PROFILE' && viewedProfile) return <UserProfileView user={user!} viewedProfileUsername={viewedProfile} exhibits={exhibits} collections={collections} guestbook={guestbook} theme={theme} onBack={handleBack} onLogout={handleLogout} onFollow={handleFollow} onChat={handleOpenChat} onExhibitClick={handleExhibitClick} onLike={toggleLike} onFavorite={toggleFavorite} onAuthorClick={handleAuthorClick} onCollectionClick={handleCollectionClick} onShareCollection={handleShareCollection} onViewHallOfFame={() => { setView('HALL_OF_FAME'); updateHash('/hall-of-fame'); }} onGuestbookPost={handleGuestbookPost} refreshData={refreshData} isEditingProfile={isEditingProfile} setIsEditingProfile={setIsEditingProfile} editTagline={editTagline} setEditTagline={setEditTagline} editStatus={editStatus} setEditStatus={setEditStatus} editTelegram={editTelegram} setEditTelegram={setEditTelegram} onSaveProfile={handleSaveProfile} onProfileImageUpload={handleProfileImageUpload} guestbookInput={guestbookInput} setGuestbookInput={setGuestbookInput} guestbookInputRef={guestbookInputRef} profileTab={profileTab} setProfileTab={setProfileTab} />;
    
    if (view === 'FEED' || view === 'SEARCH') {
        const filteredExhibits = exhibits.filter(e => {
            if (e.isDraft) return false;
            if (selectedCategory !== 'ВСЕ' && e.category !== selectedCategory) return false;
            if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
        const filteredCollections = collections.filter(c => {
             if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
             return true;
        });

        const sortedFeed = filteredExhibits.sort((a,b) => {
              const scoreA = calculateArtifactScore(a, user?.preferences);
              const scoreB = calculateArtifactScore(b, user?.preferences);
              return scoreB - scoreA;
        });

        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex flex-col gap-4 sticky top-0 bg-transparent z-30 pt-2 pb-2">
                     <div className={`flex items-center gap-2 p-3 rounded border-2 shadow-lg backdrop-blur-md ${theme === 'dark' ? 'bg-black/80 border-dark-dim text-white' : 'bg-white/80 border-light-dim text-black'}`}>
                         <Search size={18} className="opacity-50" />
                         <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ПОИСК..." className="bg-transparent w-full focus:outline-none font-mono text-sm" />
                         {searchQuery && <button onClick={() => setSearchQuery('')}><X size={16}/></button>}
                     </div>
                     <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          <button onClick={() => setSelectedCategory('ВСЕ')} className={`px-4 py-2 rounded whitespace-nowrap font-bold text-xs font-pixel transition-all ${selectedCategory === 'ВСЕ' ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') : 'border border-gray-500/50 opacity-70'}`}>ВСЕ</button>
                          {Object.values(DefaultCategory).map(cat => (
                              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded whitespace-nowrap font-bold text-xs font-pixel transition-all ${selectedCategory === cat ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') : 'border border-gray-500/50 opacity-70'}`}>{cat}</button>
                          ))}
                     </div>
                </div>
                
                <div className="flex gap-4 border-b border-gray-500/30 mb-4">
                    <button onClick={() => setFeedMode('ARTIFACTS')} className={`pb-2 font-pixel text-xs flex items-center gap-2 ${feedMode === 'ARTIFACTS' ? 'border-b-2 border-current font-bold' : 'opacity-50'}`}><Grid size={14} /> АРТЕФАКТЫ</button>
                    <button onClick={() => setFeedMode('COLLECTIONS')} className={`pb-2 font-pixel text-xs flex items-center gap-2 ${feedMode === 'COLLECTIONS' ? 'border-b-2 border-current font-bold' : 'opacity-50'}`}><FolderPlus size={14} /> КОЛЛЕКЦИИ</button>
                </div>

                {feedMode === 'ARTIFACTS' ? (
                    <>
                        {sortedFeed.length === 0 && !loadingFeed ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <Search size={48} className="mb-4" />
                                <span className="font-pixel text-sm">НИЧЕГО НЕ НАЙДЕНО</span>
                                <span className="font-mono text-xs mt-2">База данных пуста или запрос не дал результатов.</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                                {sortedFeed.map(item => <ExhibitCard key={item.id} item={item} theme={theme} similarExhibits={[]} onClick={handleExhibitClick} isLiked={item.likedBy?.includes(user?.username || '') || false} isFavorited={false} onLike={(e) => toggleLike(item.id, e)} onFavorite={(e) => toggleFavorite(item.id, e)} onAuthorClick={handleAuthorClick} />)}
                                <div ref={loadMoreRef} className="h-10 w-full flex justify-center py-4">
                                    {loadingFeed && <Loader className="animate-spin opacity-80 text-green-500" />}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {filteredCollections.map(col => <CollectionCard key={col.id} col={col} theme={theme} onClick={handleCollectionClick} onShare={handleShareCollection} />)}
                    </div>
                )}
            </div>
        );
    }

    if (view === 'CREATE_HUB') {
        return (
            <div className="max-w-md mx-auto space-y-4 animate-in fade-in">
                <button onClick={handleBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs"><ArrowLeft size={16} /> НАЗАД</button>
                <div className="grid grid-cols-2 gap-4 mt-8">
                    <button onClick={() => { setView('CREATE_ARTIFACT'); updateHash('/create/artifact'); }} className="p-6 border-2 rounded-lg flex flex-col items-center gap-4 hover:bg-white/5 transition-colors"><Package size={32} /><span className="font-pixel text-sm font-bold">СОЗДАТЬ АРТЕФАКТ</span></button>
                    <button onClick={() => { setView('CREATE_COLLECTION'); updateHash('/create/collection'); }} className="p-6 border-2 rounded-lg flex flex-col items-center gap-4 hover:bg-white/5 transition-colors"><FolderPlus size={32} /><span className="font-pixel text-sm font-bold">СОЗДАТЬ КОЛЛЕКЦИЮ</span></button>
                </div>
            </div>
        );
    }

    // ... (CREATE_ARTIFACT and CREATE_COLLECTION blocks remain largely the same, included via implicit context or assumed unchanged if not listed)
    // For brevity in this prompt, I assume CREATE_ARTIFACT and CREATE_COLLECTION are maintained.
    // However, since I need to output the FULL FILE content in the XML as per rules, I must include them.
    // I will copy the previous implementation for those blocks to ensure integrity.

    if (view === 'CREATE_ARTIFACT') {
        const conditionOptions = getConditionsList(newExhibit.category || DefaultCategory.MISC, newExhibit.subcategory);
        return (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-32">
                 <button onClick={handleBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs"><ArrowLeft size={16} /> НАЗАД</button>
                 <h2 className="text-xl font-pixel font-bold">{editingExhibitId ? 'РЕДАКТИРОВАНИЕ' : 'НОВЫЙ АРТЕФАКТ'}</h2>
                 <div className="space-y-4">
                     <div><label className="text-[10px] font-pixel uppercase opacity-70 block mb-1">НАЗВАНИЕ</label><input value={newExhibit.title || ''} onChange={e => setNewExhibit({...newExhibit, title: e.target.value})} className="w-full bg-transparent border-b p-2 font-mono" placeholder="Например: Sony Walkman" /></div>
                     <div><label className="text-[10px] font-pixel uppercase opacity-70 block mb-1">КАТЕГОРИЯ</label><div className="relative"><select value={newExhibit.category || DefaultCategory.MISC} onChange={(e) => { const cat = e.target.value; setNewExhibit({ ...newExhibit, category: cat, subcategory: '', specs: generateSpecsForCategory(cat), condition: getDefaultCondition(cat) }); }} className={`w-full p-2 border rounded font-pixel text-xs appearance-none cursor-pointer uppercase ${theme === 'dark' ? 'bg-black text-white border-dark-dim' : 'bg-white text-black border-light-dim'}`}>{Object.values(DefaultCategory).map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" /></div></div>
                     {CATEGORY_SUBCATEGORIES[newExhibit.category || ''] && (<div className="animate-in fade-in"><label className="text-[10px] font-pixel uppercase opacity-70 block mb-1">ПОДКАТЕГОРИЯ</label><div className="relative"><select value={newExhibit.subcategory || ''} onChange={(e) => { const sub = e.target.value; setNewExhibit({ ...newExhibit, subcategory: sub, specs: generateSpecsForCategory(newExhibit.category || DefaultCategory.MISC, sub), condition: getDefaultCondition(newExhibit.category || DefaultCategory.MISC, sub) }); }} className={`w-full p-2 border rounded font-pixel text-xs appearance-none cursor-pointer uppercase ${theme === 'dark' ? 'bg-black text-white border-dark-dim' : 'bg-white text-black border-light-dim'}`}><option value="">-- ВЫБЕРИТЕ ТИП --</option>{CATEGORY_SUBCATEGORIES[newExhibit.category || ''].map((sub: string) => <option key={sub} value={sub}>{sub}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" /></div></div>)}
                     <div><label className="text-[10px] font-pixel uppercase opacity-70 block mb-1">СОСТОЯНИЕ</label><div className="relative"><select value={newExhibit.condition || ''} onChange={(e) => setNewExhibit({...newExhibit, condition: e.target.value})} className={`w-full p-2 border rounded font-pixel text-xs appearance-none cursor-pointer uppercase ${theme === 'dark' ? 'bg-black text-white border-dark-dim' : 'bg-white text-black border-light-dim'}`}>{conditionOptions.map((cond: string) => <option key={cond} value={cond}>{cond}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" /></div></div>
                     <div><label className="text-[10px] font-pixel uppercase opacity-70 block mb-1">ОПИСАНИЕ</label><textarea value={newExhibit.description || ''} onChange={e => setNewExhibit({...newExhibit, description: e.target.value})} className="w-full bg-transparent border p-2 font-mono text-sm h-32 rounded" placeholder="История предмета..." /></div>
                     <div><label className="text-[10px] font-pixel uppercase opacity-70 block mb-2 border-b pb-1">ХАРАКТЕРИСТИКИ</label><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{newExhibit.specs && Object.keys(newExhibit.specs).length > 0 ? (Object.keys(newExhibit.specs).map(key => (<div key={key} className="space-y-1"><label className="text-[10px] font-mono uppercase opacity-60 truncate block">{key}</label><input list={`list-${key}`} className={`w-full bg-transparent border rounded p-2 text-sm focus:outline-none font-mono ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`} value={newExhibit.specs?.[key] || ''} onChange={e => setNewExhibit({ ...newExhibit, specs: { ...newExhibit.specs, [key]: e.target.value } })} />{COMMON_SPEC_VALUES[key] && (<datalist id={`list-${key}`}>{COMMON_SPEC_VALUES[key].map(opt => <option key={opt} value={opt} />)}</datalist>)}</div>))) : (<div className="col-span-2 text-center opacity-50 text-xs py-4 font-mono">Выберите подкатегорию для заполнения точных характеристик</div>)}</div></div>
                     <div><label className="text-[10px] font-pixel uppercase opacity-70 block mb-1">ФОТОГРАФИИ</label><div className="flex gap-2 overflow-x-auto pb-2">{newExhibit.imageUrls?.map((url, i) => (<div key={i} className="relative w-20 h-20 flex-shrink-0"><img src={url} className="w-full h-full object-cover rounded" /><button onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"><X size={10}/></button></div>))}<label className="w-20 h-20 border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-white/5 rounded"><PlusCircle size={24} /><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label></div></div>
                     <button onClick={() => handleCreateExhibit(false)} disabled={isLoading} className="w-full py-3 bg-green-500 text-black font-bold font-pixel rounded">{isLoading ? 'ЗАГРУЗКА...' : 'ОПУБЛИКОВАТЬ'}</button>
                     <button onClick={() => handleCreateExhibit(true)} disabled={isLoading} className="w-full py-3 border border-gray-500 font-bold font-pixel rounded">СОХРАНИТЬ ЧЕРНОВИК</button>
                 </div>
            </div>
        );
    }

    if (view === 'CREATE_COLLECTION' || view === 'EDIT_COLLECTION') {
        const isEdit = view === 'EDIT_COLLECTION';
        const activeCol = isEdit ? collectionToEdit : newCollection;
        const handleUpdate = (field: 'title' | 'description', value: string) => {
             if (isEdit) setCollectionToEdit(prev => prev ? ({ ...prev, [field]: value }) : null);
             else setNewCollection(prev => ({ ...prev, [field]: value }));
        };
        return (
             <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-32">
                 <button onClick={handleBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs"><ArrowLeft size={16} /> НАЗАД</button>
                 <h2 className="text-xl font-pixel font-bold">{isEdit ? 'РЕДАКТИРОВАНИЕ КОЛЛЕКЦИИ' : 'НОВАЯ КОЛЛЕКЦИЯ'}</h2>
                 <div className="space-y-4">
                     <div><label className="text-[10px] font-pixel uppercase opacity-70 block mb-1">НАЗВАНИЕ</label><input value={activeCol?.title || ''} onChange={e => handleUpdate('title', e.target.value)} className="w-full bg-transparent border-b p-2 font-mono" placeholder="Мои лучшие находки" /></div>
                     <div><label className="text-[10px] font-pixel uppercase opacity-70 block mb-1">ОПИСАНИЕ</label><textarea value={activeCol?.description || ''} onChange={e => handleUpdate('description', e.target.value)} className="w-full bg-transparent border p-2 font-mono text-sm h-24 rounded" placeholder="О чем эта подборка?" /></div>
                     <div><label className="text-[10px] font-pixel uppercase opacity-70 block mb-1">ОБЛОЖКА</label><div className="relative aspect-video bg-gray-800 rounded overflow-hidden flex items-center justify-center group">{activeCol?.coverImage ? (<img src={activeCol.coverImage} className="w-full h-full object-cover" />) : (<span className="opacity-50 text-xs">НЕТ ИЗОБРАЖЕНИЯ</span>)}<label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Upload size={24} className="text-white" /><input type="file" accept="image/*" className="hidden" onChange={isEdit ? handleCollectionCoverUpload : handleNewCollectionCoverUpload} /></label></div></div>
                     <button onClick={isEdit ? handleSaveCollection : handleCreateCollection} disabled={isLoading} className="w-full py-3 bg-green-500 text-black font-bold font-pixel rounded">{isLoading ? 'СОХРАНЕНИЕ...' : (isEdit ? 'ОБНОВИТЬ' : 'СОЗДАТЬ')}</button>
                     {isEdit && (<button onClick={handleDeleteCollection} className="w-full py-3 border border-red-500 text-red-500 font-bold font-pixel rounded">УДАЛИТЬ КОЛЛЕКЦИЮ</button>)}
                 </div>
            </div>
        );
    }
    if (view === 'ACTIVITY') {
        return (
            <div className="max-w-2xl mx-auto animate-in fade-in">
                <div className="flex gap-4 border-b border-gray-500/30 mb-6"><button onClick={() => setActivityTab('UPDATES')} className={`pb-2 font-pixel text-xs ${activityTab === 'UPDATES' ? 'border-b-2 border-current font-bold' : 'opacity-50'}`}>УВЕДОМЛЕНИЯ</button><button onClick={() => setActivityTab('DIALOGS')} className={`pb-2 font-pixel text-xs ${activityTab === 'DIALOGS' ? 'border-b-2 border-current font-bold' : 'opacity-50'}`}>СООБЩЕНИЯ</button></div>
                {activityTab === 'UPDATES' ? (<div className="space-y-4">{aggregatedNotifications.length === 0 ? (<div className="text-center opacity-50 py-10 font-mono text-sm">Нет новых событий</div>) : (aggregatedNotifications.map(n => (<div key={n.id} onClick={() => { setShowDesktopNotifications(false); handleNotificationClick(n); }} className={`p-3 border-b border-gray-500/10 cursor-pointer hover:opacity-80 transition-opacity ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}><div className="flex items-center justify-between mb-1"><span className={`font-bold text-xs ${!n.isRead ? 'text-green-500' : ''}`}>@{n.actor}</span><span className="text-[9px] opacity-50">{n.timestamp}</span></div><div className={`text-[10px] font-mono leading-tight ${!n.isRead ? 'text-white' : 'opacity-70'}`}>{renderNotificationText(n)}</div></div>)))}</div>) : (<div className="space-y-2">{(() => { const partners = new Set<string>(); messages.forEach(m => { if(m.sender === user?.username) partners.add(m.receiver); else if(m.receiver === user?.username) partners.add(m.sender); }); if(partners.size === 0) return <div className="text-center opacity-50 py-10 font-mono text-sm">Нет диалогов</div>; return Array.from(partners).map(partner => { const lastMsg = messages.filter(m => (m.sender === partner && m.receiver === user?.username) || (m.sender === user?.username && m.receiver === partner)).sort((a,b) => b.id.localeCompare(a.id))[0]; return (<div key={partner} onClick={() => handleOpenChat(partner)} className="p-4 border rounded cursor-pointer hover:bg-white/5 flex gap-4 items-center"><div className="w-10 h-10 rounded-full bg-gray-500 overflow-hidden flex-shrink-0"><img src={getUserAvatar(partner)} alt={partner} /></div><div className="flex-1 min-w-0"><div className="flex justify-between mb-1"><span className="font-bold font-pixel text-xs">@{partner}</span><span className="text-[10px] opacity-50">{lastMsg.timestamp}</span></div><p className="text-xs font-mono opacity-70 truncate">{lastMsg.sender === user?.username ? 'Вы: ' : ''}{lastMsg.text}</p></div></div>); }); })()}</div>)}
            </div>
        );
    }
    if (view === 'DIRECT_CHAT' && chatPartner) {
        const chatMessages = messages.filter(m => (m.sender === user?.username && m.receiver === chatPartner) || (m.sender === chatPartner && m.receiver === user?.username)).sort((a,b) => a.id.localeCompare(b.id));
        return (<div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)] animate-in fade-in"><div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-500/30"><button onClick={handleBack}><ArrowLeft size={16} /></button><div className="w-8 h-8 rounded-full bg-gray-500 overflow-hidden"><img src={getUserAvatar(chatPartner)} /></div><span className="font-bold font-pixel text-sm">@{chatPartner}</span></div><div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">{chatMessages.length === 0 && <div className="text-center opacity-50 text-xs font-mono mt-10">Начните общение...</div>}{chatMessages.map(m => (<div key={m.id} className={`flex ${m.sender === user?.username ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[70%] p-3 rounded-lg text-xs font-mono ${m.sender === user?.username ? 'bg-green-600 text-white' : 'bg-gray-700 text-white'}`}>{m.text}<div className="text-[9px] opacity-50 text-right mt-1">{m.timestamp}</div></div></div>))}</div><div className="flex gap-2"><input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-transparent border rounded p-2 font-mono text-sm focus:outline-none" placeholder="Сообщение..." /><button onClick={handleSendMessage} className="p-2 bg-green-500 text-black rounded"><Send size={18} /></button></div></div>);
    }
    if (view === 'COLLECTION_DETAIL' && selectedCollection) {
        const collectionItems = exhibits.filter(e => selectedCollection.exhibitIds?.includes(e.id));
        return (<div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-32"><button onClick={handleBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs"><ArrowLeft size={16} /> НАЗАД</button><div className="relative aspect-[3/1] w-full rounded-xl overflow-hidden bg-gray-800"><img src={selectedCollection.coverImage} className="w-full h-full object-cover opacity-60" /><div className="absolute bottom-0 left-0 p-6"><h1 className="text-3xl font-pixel font-bold text-white mb-2">{selectedCollection.title}</h1><p className="text-white/80 font-mono text-sm max-w-xl">{selectedCollection.description}</p></div>{selectedCollection.owner === user?.username && (<button onClick={() => handleEditCollection(selectedCollection)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded hover:bg-black/80"><Edit2 size={16}/></button>)}</div><div className="flex items-center gap-2 mb-4"><div className="w-6 h-6 rounded-full bg-gray-500 overflow-hidden"><img src={getUserAvatar(selectedCollection.owner)} /></div><span className="font-bold font-pixel text-xs">@{selectedCollection.owner}</span><span className="opacity-50 text-xs">• {collectionItems.length} items</span></div><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{collectionItems.map(item => (<ExhibitCard key={item.id} item={item} theme={theme} similarExhibits={[]} onClick={handleExhibitClick} isLiked={item.likedBy?.includes(user?.username || '') || false} isFavorited={false} onLike={(e) => toggleLike(item.id, e)} onFavorite={(e) => toggleFavorite(item.id, e)} onAuthorClick={handleAuthorClick} />))}{selectedCollection.owner === user?.username && (<button onClick={() => alert("Функция добавления предметов в разработке")} className="border-2 border-dashed border-gray-500 rounded-xl flex flex-col items-center justify-center p-4 hover:bg-white/5 opacity-50 hover:opacity-100 min-h-[200px]"><PlusCircle size={32} /><span className="text-xs font-pixel mt-2">ДОБАВИТЬ ПРЕДМЕТ</span></button>)}</div></div>);
    }
    if (view === 'SETTINGS') {
        return (<div className="max-w-2xl mx-auto space-y-6 animate-in fade-in"><button onClick={handleBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs"><ArrowLeft size={16} /> НАЗАД</button><h2 className="text-xl font-pixel font-bold">НАСТРОЙКИ СИСТЕМЫ</h2><div className={`p-4 rounded border ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}><h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Sun size={16} /> ОФОРМЛЕНИЕ</h3><div className="flex items-center justify-between"><span className="text-xs font-mono">ТЕМА ИНТЕРФЕЙСА</span><button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="px-4 py-2 border rounded text-xs font-bold font-pixel uppercase flex items-center gap-2 hover:opacity-80">{theme === 'dark' ? <Sun size={14}/> : <Moon size={14}/>}{theme === 'dark' ? 'LIGHT_MODE' : 'DARK_MODE'}</button></div></div><StorageMonitor theme={theme} /></div>);
    }
    return null;
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-black text-gray-300' : 'bg-gray-50 text-gray-800'} font-sans selection:bg-green-500 selection:text-black`}>
       <MatrixRain theme={theme} />
       <CRTOverlay />
       {isLoginTransition && <LoginTransition />}
       {showInstallBanner && <InstallBanner theme={theme} onInstall={handleInstallClick} onClose={handleDismissInstall} />}
       <div className="relative z-10 max-w-7xl mx-auto min-h-screen flex flex-col" {...globalSwipeHandlers}>
          {view !== 'AUTH' && (
              <header className={`p-4 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md border-b ${theme === 'dark' ? 'bg-black/80 border-dark-dim' : 'bg-white/80 border-light-dim'}`}>
                 <a href="#/feed" onClick={handleResetFeed} className="flex items-center gap-3 group"><div className={`p-2 rounded border transition-colors ${theme === 'dark' ? 'bg-dark-primary text-black border-dark-primary group-hover:bg-white group-hover:text-black' : 'bg-light-accent text-white border-light-accent group-hover:bg-black group-hover:text-white'}`}><Terminal size={20} /></div><span className={`font-pixel text-lg hidden md:block transition-colors ${theme === 'dark' ? 'text-white group-hover:text-dark-primary' : 'text-black group-hover:text-light-accent'}`}>NEO_ARCHIVE</span></a>
                 
                 {/* Desktop Actions */}
                 {user && (
                    <div className="hidden md:flex items-center gap-4 mx-4">
                        <button onClick={() => { setView('CREATE_ARTIFACT'); updateHash('/create/artifact'); }} className="flex items-center gap-2 px-3 py-1 border rounded text-[10px] font-pixel font-bold hover:bg-green-500/10 transition-colors">
                            <PlusSquare size={16} /> АРТЕФАКТ
                        </button>
                        <button onClick={() => { setView('CREATE_COLLECTION'); updateHash('/create/collection'); }} className="flex items-center gap-2 px-3 py-1 border rounded text-[10px] font-pixel font-bold hover:bg-blue-500/10 transition-colors">
                            <FolderPlus size={16} /> КОЛЛЕКЦИЯ
                        </button>
                    </div>
                 )}

                 <div className="flex items-center gap-4">
                     <button onClick={handleManualSync} disabled={isSyncing} className={`p-2 rounded hover:bg-white/5 ${isSyncing ? 'animate-spin' : ''}`}>
                         <RefreshCw size={18} />
                     </button>
                     <div className="relative hidden md:block"><button onClick={() => setShowDesktopNotifications(!showDesktopNotifications)} className="relative p-2"><Bell size={20} className={userNotifications.some(n => !n.isRead) ? "animate-pulse text-green-500" : ""} />{userNotifications.some(n => !n.isRead) && <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full"></span>}</button>{showDesktopNotifications && (<div className={`absolute top-full right-0 mt-2 w-72 rounded border shadow-xl z-50 overflow-hidden ${theme === 'dark' ? 'bg-black border-dark-dim' : 'bg-white border-light-dim'}`}><div className="p-2 border-b border-gray-500/30 text-[10px] font-pixel opacity-70">SYSTEM_ALERTS</div><div className="max-h-64 overflow-y-auto">{aggregatedNotifications.length === 0 ? (<div className="p-4 text-center text-xs font-mono opacity-50">Нет новых событий</div>) : (aggregatedNotifications.map(n => (<div key={n.id} onClick={() => { setShowDesktopNotifications(false); handleNotificationClick(n); }} className={`p-3 border-b border-gray-500/10 cursor-pointer hover:opacity-80 transition-opacity ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}><div className="flex items-center justify-between mb-1"><span className={`font-bold text-xs ${!n.isRead ? 'text-green-500' : ''}`}>@{n.actor}</span><span className="text-[9px] opacity-50">{n.timestamp}</span></div><div className={`text-[10px] font-mono leading-tight ${!n.isRead ? 'text-white' : 'opacity-70'}`}>{renderNotificationText(n)}</div></div>)))}</div><button onClick={handleOpenUpdates} className="w-full py-2 text-center text-[10px] font-pixel border-t border-gray-500/30 hover:bg-white/5">ПОКАЗАТЬ ВСЕ</button></div>)}</div>{user && (<div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('USER_PROFILE'); updateHash(`/profile/${user.username}`); }}><div className="text-right hidden md:block"><div className={`font-pixel text-xs font-bold ${theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'}`}>@{user.username}</div></div><div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden border border-gray-500"><img src={user.avatarUrl} alt="Avatar" /></div></div>)}<button onClick={() => setView('SETTINGS')}><Settings size={20} /></button><button onClick={handleLogout} className="text-red-500"><LogOut size={20} /></button></div>
              </header>
          )}
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
              {view === 'FEED' && <HeroSection theme={theme} user={user} />}
              {view === 'EXHIBIT' && selectedExhibit && (<ExhibitDetailPage exhibit={selectedExhibit} theme={theme} onBack={handleBack} onShare={(id) => handleShareCollection({id, title: selectedExhibit.title, description: selectedExhibit.description, coverImage: selectedExhibit.imageUrls[0]} as Collection)} onFavorite={(id) => toggleFavorite(id)} onLike={(id) => toggleLike(id)} isFavorited={false} isLiked={selectedExhibit.likedBy?.includes(user?.username || '') || false} onPostComment={handlePostComment} onAuthorClick={handleAuthorClick} onFollow={handleFollow} onMessage={handleOpenChat} onDelete={user?.username === selectedExhibit.owner || user?.isAdmin ? handleDeleteExhibit : undefined} onEdit={user?.username === selectedExhibit.owner ? handleEditExhibit : undefined} isFollowing={user?.following.includes(selectedExhibit.owner) || false} currentUser={user?.username || ''} isAdmin={user?.isAdmin || false} />)}
              {view !== 'EXHIBIT' && renderContentArea()}
          </main>
          {view !== 'AUTH' && (<MobileNavigation theme={theme} view={view} setView={setView} updateHash={updateHash} hasNotifications={userNotifications.some(n => !n.isRead)} username={user?.username || ''} onResetFeed={handleResetFeed} onProfileClick={() => { if (user) { setViewedProfile(user.username); setView('USER_PROFILE'); updateHash(`/profile/${user.username}`); } }} />)}
       </div>
    </div>
  );
}
