import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, PlusSquare, X, Sun, Moon, ChevronDown, Upload, LogOut, FolderOpen, 
  MessageSquare, Search, Database, Trash2, Settings, Home, Activity, Zap, Sparkles, 
  User, ArrowLeft, Shuffle, Trophy, Star, SlidersHorizontal, CheckCircle2, Bell, 
  MessageCircle, PlusCircle, Heart, FilePlus, FolderPlus, Grid, Flame, Layers, 
  Share2, Award, Crown, ChevronLeft, ChevronRight, Camera, Edit2, Save, Check, 
  Send, Link, Smartphone, Laptop, Video, Image as ImageIcon, WifiOff, Download
} from 'lucide-react';
import MatrixRain from './components/MatrixRain';
import CRTOverlay from './components/CRTOverlay';
import ExhibitCard from './components/ExhibitCard';
import RetroLoader from './components/RetroLoader';
import ExhibitDetailPage from './components/ExhibitDetailPage';
import ErrorBoundary from './components/ErrorBoundary';
import MatrixLogin from './components/MatrixLogin';
import HallOfFame from './components/HallOfFame';
import { Exhibit, ViewState, Comment, UserProfile, Collection, Notification, Message, GuestbookEntry, UserStatus } from './types';
import { DefaultCategory, CATEGORY_SPECS_TEMPLATES, CATEGORY_CONDITIONS, BADGES, calculateArtifactScore, STATUS_OPTIONS } from './constants';
import { moderateContent, moderateImage } from './services/geminiService';
import * as db from './services/storageService';
import { fileToBase64, isOffline } from './services/storageService';

const POPULAR_CATEGORIES = [DefaultCategory.PHONES, DefaultCategory.GAMES, DefaultCategory.MAGAZINES, DefaultCategory.MUSIC];

// Helper to generate specs based on category
const generateSpecsForCategory = (cat: string) => {
    const template = CATEGORY_SPECS_TEMPLATES[cat] || [];
    const specs: Record<string, string> = {};
    template.forEach(key => specs[key] = '');
    return specs;
};

// Helper to get default condition for category
const getDefaultCondition = (cat: string) => {
    const conditions = CATEGORY_CONDITIONS[cat] || CATEGORY_CONDITIONS[DefaultCategory.MISC];
    return conditions[0];
};

const HeroSection: React.FC<{ theme: 'dark' | 'light'; user: UserProfile | null }> = ({ theme, user }) => (
    <div className={`hidden md:block relative mb-6 p-6 rounded-lg border-2 border-dashed overflow-hidden group ${
        theme === 'dark' 
        ? 'border-dark-dim bg-dark-surface/50 hover:border-dark-primary transition-colors' 
        : 'border-light-dim bg-white/50 hover:border-light-accent transition-colors'
    }`}>
        <div className={`absolute top-0 left-0 w-1 h-full opacity-50 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-light-accent'}`}></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className={`text-xl md:text-3xl lg:text-4xl font-pixel mb-2 break-words ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    NEO_ARCHIVE
                </h1>
                <p className={`font-mono text-xs md:text-sm max-w-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Цифровой ковчег для сохранения артефактов прошлого в облачной вечности.
                </p>
            </div>
        </div>
        {/* Decorative scanline inside hero */}
        <div className={`absolute inset-0 pointer-events-none opacity-5 bg-gradient-to-r from-transparent via-current to-transparent animate-[shimmer_2s_infinite] ${
            theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'
        }`} />
    </div>
);

const MobileNavigation: React.FC<{
    theme: 'dark' | 'light';
    view: ViewState;
    setView: (v: ViewState) => void;
    updateHash: (path: string) => void;
    hasNotifications: boolean;
    username: string;
    onResetFeed: () => void;
    onProfileClick: () => void;
}> = ({ theme, view, setView, updateHash, hasNotifications, username, onResetFeed, onProfileClick }) => {
    const navItems = [
        { id: 'FEED', icon: Home, label: 'ГЛАВНАЯ', action: () => { onResetFeed(); setView('FEED'); updateHash('/feed'); } },
        { id: 'SEARCH', icon: Search, label: 'ПОИСК', action: () => { setView('SEARCH'); } },
        { id: 'ADD', icon: PlusCircle, label: 'ДОБАВИТЬ', action: () => { setView('CREATE_HUB'); }, highlight: true },
        { id: 'ACTIVITY', icon: Bell, label: 'АКТИВНОСТЬ', action: () => { setView('ACTIVITY'); }, hasBadge: hasNotifications },
        { id: 'PROFILE', icon: User, label: 'ПРОФИЛЬ', action: onProfileClick }
    ];

    return (
        <div className={`md:hidden fixed bottom-0 left-0 w-full z-50 border-t pb-safe ${
            theme === 'dark' ? 'bg-black/95 border-dark-dim text-gray-400' : 'bg-white/95 border-light-dim text-gray-500'
        }`}>
            <div className="flex justify-around items-center h-16">
                {navItems.map(item => {
                    const isActive = view === item.id || (item.id === 'PROFILE' && view === 'USER_PROFILE') || (item.id === 'ADD' && ['CREATE_HUB', 'CREATE_ARTIFACT', 'CREATE_COLLECTION'].includes(view));
                    return (
                        <button 
                            key={item.id}
                            onClick={item.action}
                            className={`flex flex-col items-center justify-center w-full h-full gap-1 relative ${
                                isActive 
                                ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') 
                                : ''
                            }`}
                        >
                            <item.icon 
                                size={item.highlight ? 28 : 22} 
                                strokeWidth={item.highlight ? 2 : 1.5}
                                className={item.highlight ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') : ''}
                            />
                            {!item.highlight && <span className="text-[9px] font-pixel">{item.label}</span>}
                            {item.hasBadge && (
                                <span className="absolute top-3 right-6 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            )}
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
        <div className="text-3xl md:text-5xl animate-pulse font-bold tracking-widest text-shadow-glow">
            ACCESS GRANTED
        </div>
        <div className="font-mono text-xs md:text-sm opacity-80 flex flex-col gap-1">
            <span className="animate-[fade_0.5s_ease-in-out_infinite]">DECRYPTING USER DATA...</span>
            <span className="text-[10px] opacity-60">KEY: RSA-4096-VERIFIED</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-64 h-3 border-2 border-green-900 p-0.5 mx-auto rounded relative overflow-hidden bg-green-900/20">
           <div 
             className="h-full bg-green-500 animate-[width_2.5s_cubic-bezier(0.4,0,0.2,1)_forwards]" 
             style={{width: '0%', boxShadow: '0 0 10px #22c55e'}}
           ></div>
        </div>

        <div className="font-mono text-[10px] opacity-50 mt-4 animate-pulse">
           ESTABLISHING SECURE CONNECTION TO MATRIX...
        </div>
      </div>
      <style>{`
        @keyframes width {
          0% { width: 5%; }
          30% { width: 45%; }
          60% { width: 55%; }
          80% { width: 90%; }
          100% { width: 100%; }
        }
        .text-shadow-glow {
            text-shadow: 0 0 10px #22c55e, 0 0 20px #22c55e;
        }
      `}</style>
    </div>
);

// Install Banner Component
const InstallBanner: React.FC<{ theme: 'dark' | 'light'; onInstall: () => void; onClose: () => void }> = ({ theme, onInstall, onClose }) => (
    <div className={`fixed top-14 left-0 w-full z-40 p-2 flex justify-center animate-in slide-in-from-top-2`}>
        <div className={`flex items-center gap-3 p-3 rounded border-2 shadow-lg backdrop-blur-md max-w-sm w-full justify-between ${
            theme === 'dark' 
            ? 'bg-black/90 border-dark-primary text-white shadow-dark-primary/20' 
            : 'bg-white/90 border-light-accent text-black shadow-light-accent/20'
        }`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded border ${
                    theme === 'dark' ? 'border-dark-primary bg-dark-primary/20' : 'border-light-accent bg-light-accent/20'
                }`}>
                    <Download size={20} className="animate-bounce" />
                </div>
                <div>
                    <h3 className="font-pixel text-[10px] font-bold">SYSTEM UPDATE</h3>
                    <p className="font-mono text-[9px] opacity-80">Установить приложение?</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={onInstall}
                    className={`px-3 py-1 font-pixel text-[9px] font-bold uppercase border hover:bg-current hover:text-black transition-colors ${
                        theme === 'dark' ? 'border-dark-primary text-dark-primary' : 'border-light-accent text-light-accent'
                    }`}
                >
                    INSTALL
                </button>
                <button onClick={onClose} className="opacity-50 hover:opacity-100">
                    <X size={16} />
                </button>
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
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Data State
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);

  // UI State
  const [selectedCategory, setSelectedCategory] = useState<string>('ВСЕ');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [viewedProfile, setViewedProfile] = useState<string | null>(null);
  const [activityTab, setActivityTab] = useState<'UPDATES' | 'DIALOGS'>('UPDATES');
  const [badgeIndex, setBadgeIndex] = useState(0);
  
  // Pagination State
  const [visibleCount, setVisibleCount] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('ONLINE');
  const [editTelegram, setEditTelegram] = useState('');
  const [guestbookInput, setGuestbookInput] = useState('');

  // Feed State
  const [feedMode, setFeedMode] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');

  // Search/Profile Tab State
  const [searchMode, setSearchMode] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');
  const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');

  // Chat State
  const [chatPartner, setChatPartner] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  // Collection Editing
  const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);

  // Session tracking
  const [viewedExhibitsSession, setViewedExhibitsSession] = useState<Set<string>>(new Set());

  // Create Modal State
  const [newExhibit, setNewExhibit] = useState<Partial<Exhibit>>({
    category: DefaultCategory.PHONES,
    specs: generateSpecsForCategory(DefaultCategory.PHONES),
    condition: getDefaultCondition(DefaultCategory.PHONES),
    imageUrls: []
  });
  
  // Create Collection State
  const [newCollection, setNewCollection] = useState<{title: string, description: string, coverImage: string}>({ 
      title: '', 
      description: '', 
      coverImage: '' 
  });

  const refreshData = () => {
      console.log("🔄 [App] Refreshing data from cache...");
      setExhibits([...db.getExhibits()]);
      setCollections([...db.getCollections()]);
      setNotifications([...db.getNotifications()]);
      setMessages([...db.getMessages()]);
      setGuestbook([...db.getGuestbook()]);
  };

  // Initialize & PWA Install Listener
  useEffect(() => {
    window.onerror = (msg, url, lineNo, columnNo, error) => {
      console.error('🔴 [Global Error]:', msg, error);
      return false;
    };

    // PWA Install Prompt Listener
    const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const init = async () => {
        try {
            const restoredUser = await db.initializeDatabase();
            if (restoredUser) {
                 console.log("🟢 [App] Session restored for:", restoredUser.username);
                 setUser(restoredUser);
                 refreshData();
                 // If specifically asking for feed or empty hash, ensure we are in FEED view to prevent Auth flash
                 if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#/feed') {
                     setView('FEED');
                     if(window.location.hash !== '#/feed') updateHash('/feed');
                 }
            } else {
                 setView('AUTH');
            }
        } catch (e: any) {
            console.error("Init failed", e);
            setView('AUTH');
        } finally {
            setIsInitializing(false);
        }
    };
    init();

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Handle Install Click
  const handleInstallClick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setShowInstallBanner(false);
      }
  };

  // --- HASH ROUTING ---
  useEffect(() => {
      const handleHashChange = () => {
          // STRICT GATEKEEPING: If no user, force AUTH view regardless of hash
          if (!user) {
              if (view !== 'AUTH') setView('AUTH');
              return;
          }
          
          const hash = window.location.hash;
          if (hash.startsWith('#/exhibit/')) {
              const param = hash.split('/')[2];
              const item = exhibits.find(e => e.slug === param || e.id === param);
              if (item) {
                  setSelectedExhibit(item);
                  setView('EXHIBIT');
              }
          } else if (hash.startsWith('#/collection/')) {
              const param = hash.split('/')[2];
              const col = collections.find(c => c.slug === param || c.id === param);
              if (col) {
                  setSelectedCollection(col);
                  setView('COLLECTION_DETAIL');
              }
          } else if (hash.startsWith('#/profile/')) {
              const username = hash.split('/')[2];
              if (username) {
                  setViewedProfile(username);
                  setView('USER_PROFILE');
              }
          } else if (hash === '#/feed' || hash === '') {
              if (view !== 'AUTH') setView('FEED');
          }
      };

      if (!isInitializing && exhibits.length > 0) {
          handleHashChange();
      }

      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
  }, [exhibits, collections, user, isInitializing, view]); // ADD VIEW TO DEPS

  const updateHash = (path: string) => {
      window.history.pushState(null, '', `#${path}`);
  };

  // Reset pagination
  useEffect(() => {
      setVisibleCount(12);
  }, [selectedCategory, feedMode, searchQuery, view]);

  // Infinite Scroll
  useEffect(() => {
      if (view !== 'FEED' || feedMode !== 'ARTIFACTS') return;

      const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
              setTimeout(() => {
                  setVisibleCount(prev => prev + 8);
              }, 800);
          }
      }, { threshold: 0.1 });

      if (loadMoreRef.current) {
          observer.observe(loadMoreRef.current);
      }

      return () => observer.disconnect();
  }, [view, feedMode, visibleCount]); 

  const handleLogin = (loggedInUser: UserProfile, remember: boolean) => {
      // Start Transition
      setIsLoginTransition(true);
      
      if (remember) {
          localStorage.setItem('neo_active_user', loggedInUser.username);
      }

      // Delay View Switch for Animation
      setTimeout(() => {
          setUser(loggedInUser);
          setView('FEED');
          updateHash('/feed');
          refreshData();
          setIsLoginTransition(false); // End Transition
      }, 2500);
  };

  const handleLogout = async () => {
      try {
          // Fire and forget logout to prevent blocking UI
          db.logoutUser().catch(e => console.warn("Background logout error", e));
      } finally {
          setUser(null);
          setView('AUTH');
          // Clear hash silently to avoid triggering hashchange before view update propagates
          window.history.pushState(null, '', ' ');
      }
  };

  // ... (Rest of component functions remain largely same, just ensuring references are correct)
  // To save space, I'm including the full return block logic which relies on updated state

  const handleShuffle = () => {
      const shuffled = [...exhibits].sort(() => Math.random() - 0.5);
      setExhibits(shuffled);
  };

  const handleExhibitClick = (item: Exhibit) => {
      if (!item) return;
      if (!viewedExhibitsSession.has(item.id)) {
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

  const handleCollectionClick = (col: Collection) => {
      setSelectedCollection(col);
      setView('COLLECTION_DETAIL');
      updateHash(`/collection/${col.slug || col.id}`);
  };

  const handleAuthorClick = (author: string) => {
      setViewedProfile(author);
      setProfileTab('ARTIFACTS'); 
      setBadgeIndex(0); 
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

  const handleCreateExhibit = async () => {
     if (!newExhibit.title || newExhibit.title.length < 3) {
         alert('ОШИБКА: ЗАГОЛОВОК ДОЛЖЕН БЫТЬ НЕ МЕНЕЕ 3 СИМВОЛОВ');
         return;
     }
     if (!newExhibit.description || newExhibit.description.length < 10) {
         alert('ОШИБКА: ОПИСАНИЕ ДОЛЖНО БЫТЬ НЕ МЕНЕЕ 10 СИМВОЛОВ');
         return;
     }
     if (!newExhibit.imageUrls || newExhibit.imageUrls.length === 0) {
         alert('ОШИБКА: НЕОБХОДИМО ЗАГРУЗИТЬ МИНИМУМ ОДНО ИЗОБРАЖЕНИЕ');
         return;
     }
     setIsLoading(true);

     const contentToCheck = `${newExhibit.title} ${newExhibit.description}`;
     const modResult = await moderateContent(contentToCheck);
     if (!modResult.allowed) {
         setIsLoading(false);
         alert(`ОТКАЗАНО: ${modResult.reason || 'НАРУШЕНИЕ ПРАВИЛ СООБЩЕСТВА'}`);
         return;
     }

     const exhibit: Exhibit = {
         id: Date.now().toString(),
         title: newExhibit.title,
         description: newExhibit.description || '',
         imageUrls: newExhibit.imageUrls,
         videoUrl: newExhibit.videoUrl, 
         category: newExhibit.category || DefaultCategory.MISC,
         owner: user?.username || 'Guest',
         timestamp: new Date().toLocaleString('ru-RU'),
         likes: 0,
         likedBy: [],
         views: 0,
         specs: newExhibit.specs || {},
         comments: [],
         quality: newExhibit.quality || 'Не указано',
         condition: newExhibit.condition || getDefaultCondition(newExhibit.category || DefaultCategory.MISC)
     };

     await db.saveExhibit(exhibit); 
     setExhibits(db.getExhibits());
     
     setNewExhibit({ 
         category: DefaultCategory.PHONES, 
         specs: generateSpecsForCategory(DefaultCategory.PHONES),
         condition: getDefaultCondition(DefaultCategory.PHONES),
         imageUrls: [],
         videoUrl: ''
     });
     setIsLoading(false);
     setView('FEED');
     updateHash('/feed');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const modResult = await moderateImage(file);
        if (!modResult.allowed) {
            alert(`ОШИБКА ФАЙЛА: ${modResult.reason}`);
            return;
        }
        try {
            const base64 = await fileToBase64(file);
            setNewExhibit(prev => ({
                ...prev,
                imageUrls: [...(prev.imageUrls || []), base64]
            }));
        } catch (err: any) {
            alert("Ошибка загрузки изображения");
        }
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const modResult = await moderateImage(file);
          if (!modResult.allowed) {
              alert(`ОШИБКА ФАЙЛА: ${modResult.reason}`);
              return;
          }
          try {
              const base64 = await fileToBase64(file);
              setEditAvatarUrl(base64);
              if (user) {
                  const updatedUser = { ...user, avatarUrl: base64 };
                  setUser(updatedUser);
                  db.updateUserProfile(updatedUser);
              }
          } catch (err: any) {
              alert("Ошибка загрузки изображения");
          }
      }
  };
  
  const handleNewCollectionCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const modResult = await moderateImage(file);
          if (!modResult.allowed) {
              alert(`ОШИБКА ФАЙЛА: ${modResult.reason}`);
              return;
          }
          try {
              const base64 = await fileToBase64(file);
              setNewCollection(prev => ({ ...prev, coverImage: base64 }));
          } catch(err: any) {
              alert("Ошибка загрузки обложки");
          }
      }
  };

  const handleCollectionCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && collectionToEdit) {
          const file = e.target.files[0];
          const modResult = await moderateImage(file);
          if (!modResult.allowed) {
              alert(`ОШИБКА ФАЙЛА: ${modResult.reason}`);
              return;
          }
          try {
              const base64 = await fileToBase64(file);
              setCollectionToEdit({...collectionToEdit, coverImage: base64});
          } catch(err: any) {
              alert("Ошибка загрузки");
          }
      }
  };

  const removeImage = (index: number) => {
    setNewExhibit(prev => ({
        ...prev,
        imageUrls: (prev.imageUrls || []).filter((_, i) => i !== index)
    }));
  };

  const handleCreateCollection = async () => {
      if (!newCollection.title || newCollection.title.length < 3) {
          alert('ВВЕДИТЕ КОРРЕКТНОЕ НАЗВАНИЕ КОЛЛЕКЦИИ (МИН. 3 СИМВОЛА)');
          return;
      }
      if (!newCollection.coverImage) {
          alert('ОШИБКА: ЗАГРУЗИТЕ ОБЛОЖКУ КОЛЛЕКЦИИ');
          return;
      }
      setIsLoading(true);
      const modResult = await moderateContent(`${newCollection.title} ${newCollection.description || ''}`);
      if (!modResult.allowed) {
         setIsLoading(false);
         alert(`ОТКАЗАНО: ${modResult.reason}`);
         return;
      }
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
      setCollections(db.getCollections());
      setNewCollection({ title: '', description: '', coverImage: '' });
      setIsLoading(false);
      setCollectionToEdit(newCol);
      setView('EDIT_COLLECTION'); 
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

  const handlePostComment = (id: string, text: string) => {
      if (!text.trim()) return;
      const exIndex = exhibits.findIndex(x => x.id === id);
      if (exIndex === -1) return;
      const updatedExhibits = [...exhibits];
      const ex = { ...updatedExhibits[exIndex] }; 
      const username = user?.username || 'Guest';
      const newComment: Comment = {
          id: Date.now().toString(),
          author: username,
          text: text,
          timestamp: new Date().toLocaleString('ru-RU')
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
      if (selectedExhibit && selectedExhibit.id === id) {
          setSelectedExhibit(ex);
      }
  };

  const handleSaveProfile = () => {
      if (!user) return;
      const updatedUser: UserProfile = {
          ...user,
          tagline: editTagline,
          avatarUrl: editAvatarUrl || user.avatarUrl,
          status: editStatus,
          telegram: editTelegram
      };
      db.updateUserProfile(updatedUser);
      setUser(updatedUser);
      setIsEditingProfile(false);
  };

  const handleGuestbookPost = async () => {
      if (!guestbookInput.trim() || !user || !viewedProfile) return;
      const modResult = await moderateContent(guestbookInput);
      if(!modResult.allowed) {
          alert(modResult.reason || "Запрещено");
          return;
      }
      const entry: GuestbookEntry = {
          id: Date.now().toString(),
          author: user.username,
          targetUser: viewedProfile,
          text: guestbookInput,
          timestamp: new Date().toLocaleString('ru-RU'),
          isRead: false
      };
      db.saveGuestbookEntry(entry);
      setGuestbook([...guestbook, entry]);
      if (viewedProfile !== user.username) {
         const notif: Notification = {
             id: Date.now().toString(),
             type: 'GUESTBOOK',
             actor: user.username,
             recipient: viewedProfile,
             targetPreview: guestbookInput.substring(0, 20) + '...',
             timestamp: new Date().toLocaleString('ru-RU'),
             isRead: false
         };
         db.saveNotification(notif);
         setNotifications(prev => [notif, ...prev]);
      }
      setGuestbookInput('');
  };

  const handleFollow = (targetUser: string) => {
      if (!user) return;
      const isFollowing = user.following.includes(targetUser);
      let updatedFollowing = [...user.following];
      if (isFollowing) {
          updatedFollowing = updatedFollowing.filter(u => u !== targetUser);
      } else {
          updatedFollowing.push(targetUser);
          if (targetUser !== user.username) {
             const notif: Notification = {
                 id: Date.now().toString(),
                 type: 'FOLLOW',
                 actor: user.username,
                 recipient: targetUser,
                 timestamp: new Date().toLocaleString('ru-RU'),
                 isRead: false
             };
             db.saveNotification(notif);
             setNotifications(prev => [notif, ...prev]);
          }
      }
      const updatedUser = { ...user, following: updatedFollowing };
      setUser(updatedUser);
      db.updateUserProfile(updatedUser);
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      alert(`ДОБАВЛЕНО В ИЗБРАННОЕ [ID: ${id}]`);
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
      const updatedMessages = db.getMessages();
      setMessages([...updatedMessages]);
      setView('DIRECT_CHAT');
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
          if (!collectionToEdit.title || collectionToEdit.title.length < 3) {
              alert('НАЗВАНИЕ ДОЛЖНО БЫТЬ НЕ МЕНЕЕ 3 СИМВОЛОВ');
              return;
          }
          if (!collectionToEdit.coverImage || collectionToEdit.coverImage.includes('placehold.co')) {
               alert('ОБЯЗАТЕЛЬНО: ЗАГРУЗИТЕ ОБЛОЖКУ КОЛЛЕКЦИИ');
               return;
          }
          db.updateCollection(collectionToEdit);
          setCollections(db.getCollections());
          setSelectedCollection(collectionToEdit);
          setView('COLLECTION_DETAIL');
      }
  };

  const handleDeleteCollection = () => {
      if(collectionToEdit) {
          if (window.confirm("УДАЛИТЬ КОЛЛЕКЦИЮ?")) {
              db.deleteCollection(collectionToEdit.id);
              refreshData();
              setView('FEED');
          }
      }
  }
  
  const handleOpenUpdates = () => {
      setActivityTab('UPDATES');
      if (user) {
          db.markNotificationsRead(user.username);
          const updatedNotifs = db.getNotifications();
          setNotifications([...updatedNotifs]);
      }
  };

  const getUserAchievements = (username: string) => {
      const userExhibits = exhibits.filter(e => e.owner === username);
      const totalLikes = userExhibits.reduce((acc, curr) => acc + curr.likes, 0);
      const userComments = exhibits.flatMap(e => e.comments).filter(c => c.author === username);
      const badges: string[] = ['HELLO_WORLD']; 
      if (userExhibits.length >= 5) badges.push('UPLOADER');
      if (totalLikes >= 100) badges.push('INFLUENCER');
      if (userComments.length >= 5) badges.push('CRITIC');
      if (collections.some(c => c.owner === username)) badges.push('COLLECTOR');
      const hasLegendary = userExhibits.some(e => calculateArtifactScore(e) > 20000);
      if (hasLegendary) badges.push('LEGEND');
      return badges;
  };

  const renderCollectionCard = (col: Collection) => (
      <div 
         key={col.id} 
         onClick={() => handleCollectionClick(col)}
         className={`group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border-2 transition-transform hover:-translate-y-1 ${
             theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'
         }`}
      >
          <img src={col.coverImage} alt={col.title} className="w-full h-full object-cover transition-transform group-hover:scale-105"/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4">
              <div className="font-pixel text-xs text-white/70 mb-1 flex items-center gap-1">
                  <FolderOpen size={12}/> КОЛЛЕКЦИЯ
              </div>
              <h3 className="text-white font-pixel text-lg font-bold leading-tight mb-1">{col.title}</h3>
              <div className="flex justify-between items-end">
                  <span className="text-xs font-mono text-white/60">@{col.owner}</span>
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur rounded text-xs font-bold text-white">
                      {col.exhibitIds.length} ITEMS
                  </span>
              </div>
          </div>
      </div>
  );

  const renderContentArea = () => {
    switch (view) {
      case 'AUTH':
          return <MatrixLogin theme={theme} onLogin={handleLogin} />;
          
      case 'HALL_OF_FAME':
          return (
              <HallOfFame 
                  theme={theme} 
                  achievedIds={user ? getUserAchievements(user.username) : []} 
                  onBack={() => setView('FEED')} 
              />
          );

      case 'DIRECT_CHAT':
          if (!chatPartner || !user) return <div onClick={() => setView('FEED')}>Error: No Chat Partner</div>;
          const conversation = messages.filter(m => 
              (m.sender === user.username && m.receiver === chatPartner) ||
              (m.sender === chatPartner && m.receiver === user.username)
          ).sort((a,b) => a.id.localeCompare(b.id));

          return (
              <div className="max-w-2xl mx-auto animate-in fade-in h-[80vh] flex flex-col">
                  <button onClick={() => setView('ACTIVITY')} className="flex items-center gap-2 mb-4 hover:underline opacity-70 font-pixel text-xs">
                     <ArrowLeft size={16} /> НАЗАД
                  </button>
                  <div className={`flex items-center gap-4 p-4 border-b ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                      <div className="w-10 h-10 rounded-full bg-gray-500 overflow-hidden">
                          <img src={`https://ui-avatars.com/api/?name=${chatPartner}&background=random`} alt={chatPartner || ''} />
                      </div>
                      <div>
                          <h2 className="font-pixel text-lg">@{chatPartner}</h2>
                          <p className="font-mono text-xs opacity-50">Private Link Encrypted</p>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {conversation.length === 0 && (
                          <div className="text-center opacity-40 font-mono text-xs py-10">Начало зашифрованного соединения...</div>
                      )}
                      {conversation.map(msg => {
                          const isMe = msg.sender === user.username;
                          return (
                              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[70%] p-3 rounded-lg font-mono text-sm ${
                                      isMe 
                                      ? (theme === 'dark' ? 'bg-dark-primary text-black rounded-tr-none' : 'bg-light-accent text-white rounded-tr-none')
                                      : (theme === 'dark' ? 'bg-dark-surface text-white rounded-tl-none' : 'bg-white text-black border rounded-tl-none')
                                  }`}>
                                      {msg.text}
                                      <div className={`text-[9px] mt-1 opacity-60 text-right ${isMe ? 'text-black' : 'text-current'}`}>
                                          {msg.timestamp}
                                          {isMe && <span className="ml-1 opacity-70">{msg.isRead ? '✓✓' : '✓'}</span>}
                                      </div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>

                  <div className="p-4 border-t border-dashed border-gray-500/30 flex gap-2">
                      <input 
                         value={chatInput} 
                         onChange={e => setChatInput(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                         placeholder="Сообщение..."
                         className="flex-1 bg-transparent border rounded p-2 focus:outline-none font-mono text-sm"
                      />
                      <button onClick={handleSendMessage} className={`p-2 rounded ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}>
                          <Send size={20} />
                      </button>
                  </div>
              </div>
          );

      case 'SEARCH':
          return (
              <div className="max-w-4xl mx-auto animate-in fade-in">
                  <div className={`relative w-full flex items-center border-b-2 px-2 gap-2 mb-4 ${
                       theme === 'dark' ? 'border-dark-primary' : 'border-light-accent'
                   }`}>
                       <Search size={20} className="opacity-50" />
                       <input 
                         type="text"
                         placeholder="ПОИСК ПО БАЗЕ ДАННЫХ..."
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         autoFocus
                         className="bg-transparent w-full py-4 focus:outline-none font-pixel text-base md:text-lg tracking-wide"
                       />
                       {searchQuery && (
                           <button onClick={() => setSearchQuery('')}><X size={20}/></button>
                       )}
                   </div>

                   <div className="flex gap-4 mb-8">
                       <button 
                         onClick={() => setSearchMode('ARTIFACTS')}
                         className={`pb-1 text-xs md:text-sm font-pixel transition-colors ${
                             searchMode === 'ARTIFACTS' 
                             ? (theme === 'dark' ? 'border-b-2 border-dark-primary text-dark-primary' : 'border-b-2 border-light-accent text-light-accent')
                             : 'opacity-50'
                         }`}
                       >
                           [ АРТЕФАКТЫ ]
                       </button>
                       <button 
                         onClick={() => setSearchMode('COLLECTIONS')}
                         className={`pb-1 text-xs md:text-sm font-pixel transition-colors ${
                             searchMode === 'COLLECTIONS' 
                             ? (theme === 'dark' ? 'border-b-2 border-dark-primary text-dark-primary' : 'border-b-2 border-light-accent text-light-accent')
                             : 'opacity-50'
                         }`}
                       >
                           [ КОЛЛЕКЦИИ ]
                       </button>
                   </div>

                   {searchMode === 'COLLECTIONS' && (
                       <div className="animate-in fade-in slide-in-from-bottom-2">
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                               {collections
                                  .filter(c => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                  .map(renderCollectionCard)
                               }
                           </div>
                           {collections.length === 0 && (
                               <div className="text-center opacity-50 font-mono py-10">КОЛЛЕКЦИИ НЕ НАЙДЕНЫ</div>
                           )}
                       </div>
                   )}

                   {searchMode === 'ARTIFACTS' && (
                       <div className="animate-in fade-in slide-in-from-bottom-2">
                           {!searchQuery && (
                               <>
                                   <h3 className="font-pixel text-xs opacity-70 mb-4 flex items-center gap-2">
                                       <Grid size={14}/> КАТЕГОРИИ
                                   </h3>
                                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                                       {Object.values(DefaultCategory).map((cat: string) => (
                                           <button 
                                              key={cat}
                                              onClick={() => {
                                                  setSelectedCategory(cat);
                                                  setView('FEED');
                                                  updateHash('/feed');
                                              }}
                                              className={`p-4 border rounded hover:scale-105 transition-transform flex flex-col items-center gap-2 justify-center text-center h-20 ${
                                                  theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'
                                              }`}
                                           >
                                               <span className="font-pixel text-[10px] md:text-xs font-bold">{cat}</span>
                                           </button>
                                       ))}
                                   </div>
                               </>
                           )}

                           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                               {(searchQuery 
                                 ? exhibits.filter(ex => ex.title.toLowerCase().includes(searchQuery.toLowerCase()) || ex.description.toLowerCase().includes(searchQuery.toLowerCase()))
                                 : exhibits.sort((a, b) => calculateArtifactScore(b) - calculateArtifactScore(a)).slice(0, 4)
                               ).map((item: Exhibit) => (
                                    <ExhibitCard 
                                        key={item.id} 
                                        item={item} 
                                        theme={theme}
                                        similarExhibits={[]}
                                        onClick={handleExhibitClick}
                                        isLiked={false}
                                        isFavorited={false}
                                        onLike={(e) => toggleLike(item.id, e)}
                                        onFavorite={(e) => toggleFavorite(item.id, e)}
                                        onAuthorClick={handleAuthorClick}
                                    />
                               ))}
                           </div>
                       </div>
                   )}
              </div>
          );

      case 'CREATE_HUB':
          return (
              <div className="max-w-2xl mx-auto animate-in fade-in h-[70vh] flex flex-col justify-center">
                  <h2 className="text-xl font-pixel mb-8 text-center uppercase">Выберите тип загрузки</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <button 
                        onClick={() => setView('CREATE_ARTIFACT')}
                        className={`group p-8 rounded-xl border-2 border-dashed transition-all hover:-translate-y-2 flex flex-col items-center justify-center gap-4 ${
                            theme === 'dark' ? 'border-dark-dim hover:border-dark-primary bg-dark-surface' : 'border-light-dim hover:border-light-accent bg-white'
                        }`}
                      >
                          <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}>
                              <FilePlus size={32} />
                          </div>
                          <div className="text-center">
                              <h3 className="font-pixel text-base font-bold">АРТЕФАКТ</h3>
                              <p className="font-mono text-xs opacity-70 mt-2">Загрузить единичный объект</p>
                          </div>
                      </button>

                      <button 
                        onClick={() => setView('CREATE_COLLECTION')}
                        className={`group p-8 rounded-xl border-2 border-dashed transition-all hover:-translate-y-2 flex flex-col items-center justify-center gap-4 ${
                            theme === 'dark' ? 'border-dark-dim hover:border-yellow-500 bg-dark-surface' : 'border-light-dim hover:border-orange-500 bg-white'
                        }`}
                      >
                           <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-yellow-500 text-black' : 'bg-orange-500 text-white'}`}>
                              <FolderPlus size={32} />
                          </div>
                          <div className="text-center">
                              <h3 className="font-pixel text-base font-bold">КОЛЛЕКЦИЯ</h3>
                              <p className="font-mono text-xs opacity-70 mt-2">Создать подборку предметов</p>
                          </div>
                      </button>
                  </div>
              </div>
          );
      
      case 'EDIT_COLLECTION':
          if (!collectionToEdit) return <div>Error</div>;
          const myExhibits = exhibits.filter(e => e.owner === user?.username);

          return (
              <div className="max-w-2xl mx-auto animate-in fade-in pb-32">
                  <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-2">
                        <button onClick={handleBack} className="hover:underline font-pixel text-xs"><ArrowLeft size={16}/></button>
                        <h2 className="text-lg font-pixel">РЕДАКТОР КОЛЛЕКЦИИ</h2>
                     </div>
                     <button onClick={handleDeleteCollection} className="text-red-500 p-2 border border-red-500 rounded hover:bg-red-500/10 transition-colors">
                         <Trash2 size={16} />
                     </button>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="relative w-full aspect-[3/1] bg-gray-800 rounded-lg overflow-hidden border border-dashed border-gray-500 group">
                          {collectionToEdit.coverImage ? (
                              <img src={collectionToEdit.coverImage} className="w-full h-full object-cover" />
                          ) : (
                              <div className="flex items-center justify-center w-full h-full text-xs font-mono opacity-50">NO COVER</div>
                          )}
                          <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                              <div className="flex flex-col items-center gap-2 text-white">
                                  <Upload size={24} />
                                  <span className="font-pixel text-[10px]">CHANGE COVER</span>
                              </div>
                              <input type="file" accept="image/*" className="hidden" onChange={handleCollectionCoverUpload} />
                          </label>
                      </div>

                      <div className="space-y-1">
                         <label className="text-[10px] font-pixel uppercase opacity-70">НАЗВАНИЕ * (МИН. 3)</label>
                         <input 
                           className="w-full bg-transparent border-b p-2 font-pixel text-lg focus:outline-none"
                           value={collectionToEdit.title}
                           onChange={e => setCollectionToEdit({...collectionToEdit, title: e.target.value})}
                         />
                      </div>
                      
                      <div className="space-y-1">
                         <label className="text-[10px] font-pixel uppercase opacity-70">ОПИСАНИЕ</label>
                         <textarea 
                           className="w-full bg-transparent border p-2 font-mono text-sm rounded h-24 focus:outline-none"
                           value={collectionToEdit.description}
                           onChange={e => setCollectionToEdit({...collectionToEdit, description: e.target.value})}
                         />
                      </div>

                      <div>
                          <label className="text-[10px] font-pixel uppercase opacity-70 block mb-2">СОСТАВ КОЛЛЕКЦИИ</label>
                          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border p-2 rounded">
                              {myExhibits.map(ex => {
                                  const isSelected = collectionToEdit.exhibitIds.includes(ex.id);
                                  return (
                                      <div 
                                        key={ex.id}
                                        onClick={() => {
                                            const newIds = isSelected 
                                                ? collectionToEdit.exhibitIds.filter(id => id !== ex.id)
                                                : [...collectionToEdit.exhibitIds, ex.id];
                                            setCollectionToEdit({...collectionToEdit, exhibitIds: newIds});
                                        }}
                                        className={`p-2 border rounded cursor-pointer flex items-center gap-2 transition-colors ${
                                            isSelected 
                                            ? (theme === 'dark' ? 'bg-dark-primary text-black border-dark-primary' : 'bg-light-accent text-white border-light-accent')
                                            : 'opacity-60 hover:opacity-100'
                                        }`}
                                      >
                                          <div className={`w-4 h-4 border flex items-center justify-center ${theme === 'dark' ? 'border-black' : 'border-white'}`}>
                                              {isSelected && <Check size={12} strokeWidth={4} />}
                                          </div>
                                          <div className="truncate font-mono text-xs">{ex.title}</div>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>

                      <button onClick={handleSaveCollection} className="w-full py-4 font-bold font-pixel bg-green-500 text-black uppercase">
                          СОХРАНИТЬ ИЗМЕНЕНИЯ
                      </button>
                  </div>
              </div>
          );

      case 'CREATE_COLLECTION':
          return (
              <div className="max-w-xl mx-auto animate-in fade-in">
                 <button onClick={() => setView('CREATE_HUB')} className="mb-6 flex items-center gap-2 font-pixel text-xs opacity-60 hover:opacity-100">
                     <ArrowLeft size={16} /> НАЗАД
                 </button>
                 <h2 className="text-lg font-pixel mb-6">НОВАЯ КОЛЛЕКЦИЯ</h2>
                 <div className={`p-6 rounded border space-y-6 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                     <div className="relative w-full aspect-[3/1] bg-gray-800 rounded-lg overflow-hidden border border-dashed border-gray-500 group">
                          {newCollection.coverImage ? (
                              <img src={newCollection.coverImage} className="w-full h-full object-cover" />
                          ) : (
                              <div className="flex flex-col items-center justify-center w-full h-full text-xs font-mono opacity-50 gap-2">
                                  <Camera size={24} />
                                  <span>ЗАГРУЗИТЬ ОБЛОЖКУ *</span>
                              </div>
                          )}
                          <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                              <input type="file" accept="image/*" className="hidden" onChange={handleNewCollectionCoverUpload} />
                              <div className="text-white font-pixel text-xs">ВЫБРАТЬ ФОТО</div>
                          </label>
                      </div>

                     <div>
                         <label className="text-xs font-pixel uppercase opacity-70">НАЗВАНИЕ ПОДБОРКИ *</label>
                         <input 
                           className="w-full bg-transparent border-b p-2 focus:outline-none font-pixel text-base mt-1"
                           placeholder="Например: Мои консоли"
                           value={newCollection.title}
                           onChange={e => setNewCollection({...newCollection, title: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="text-xs font-pixel uppercase opacity-70">ОПИСАНИЕ</label>
                         <textarea 
                           className="w-full bg-transparent border p-2 focus:outline-none font-mono text-sm mt-1 rounded h-32"
                           placeholder="О чем эта коллекция?"
                           value={newCollection.description}
                           onChange={e => setNewCollection({...newCollection, description: e.target.value})}
                         />
                     </div>
                     <button 
                        onClick={handleCreateCollection}
                        disabled={isLoading}
                        className={`w-full py-3 mt-4 font-pixel font-bold uppercase tracking-widest ${
                            theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                        }`}
                     >
                        {isLoading ? '...' : 'СОЗДАТЬ И ДОБАВИТЬ ПРЕДМЕТЫ'}
                     </button>
                 </div>
              </div>
          );

      case 'CREATE_ARTIFACT':
        return (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
             <div className="flex items-center gap-2 mb-6">
                 <button onClick={() => setView('CREATE_HUB')} className="md:hidden"><ChevronDown className="rotate-90" /></button>
                 <button onClick={() => setView('FEED')} className="hidden md:block"><ChevronDown className="rotate-90" /></button>
                 <h2 className="text-lg md:text-xl font-pixel">ЗАГРУЗКА АРТЕФАКТА</h2>
             </div>
             
             <div className={`p-6 rounded border space-y-6 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                 <div className="space-y-1">
                     <label className="text-[10px] font-pixel uppercase opacity-70">НАЗВАНИЕ * (МИН. 3)</label>
                     <input 
                       className="w-full bg-transparent border-b p-2 focus:outline-none font-pixel text-base md:text-lg"
                       placeholder="Например: Sony Walkman"
                       value={newExhibit.title || ''}
                       onChange={e => setNewExhibit({...newExhibit, title: e.target.value})}
                     />
                 </div>

                 <div className="space-y-1">
                     <label className="text-[10px] font-pixel uppercase opacity-70">КАТЕГОРИЯ</label>
                     <div className="hidden md:flex flex-wrap gap-2 pt-2">
                         {Object.values(DefaultCategory).map((cat: string) => (
                             <button
                                key={cat}
                                onClick={() => {
                                    setNewExhibit({
                                        ...newExhibit, 
                                        category: cat, 
                                        specs: generateSpecsForCategory(cat),
                                        condition: getDefaultCondition(cat)
                                    });
                                }}
                                className={`px-3 py-1 rounded text-[10px] font-pixel tracking-wider border ${
                                    newExhibit.category === cat 
                                    ? (theme === 'dark' ? 'bg-dark-primary text-black border-dark-primary' : 'bg-light-accent text-white border-light-accent')
                                    : 'opacity-50 hover:opacity-100'
                                }`}
                             >
                                 {cat}
                             </button>
                         ))}
                     </div>
                     <div className="md:hidden relative mt-1">
                         <select
                             value={newExhibit.category || DefaultCategory.MISC}
                             onChange={(e) => {
                                 const cat = e.target.value;
                                 setNewExhibit({
                                     ...newExhibit, 
                                     category: cat, 
                                     specs: generateSpecsForCategory(cat),
                                     condition: getDefaultCondition(cat)
                                 });
                             }}
                             className={`w-full p-2 border rounded font-pixel text-xs appearance-none cursor-pointer uppercase ${
                                 theme === 'dark' 
                                 ? 'bg-black text-white border-dark-dim focus:border-dark-primary' 
                                 : 'bg-white text-black border-light-dim focus:border-light-accent'
                             }`}
                         >
                             {Object.values(DefaultCategory).map((cat: string) => (
                                 <option key={cat} value={cat}>{cat}</option>
                             ))}
                         </select>
                         <ChevronDown 
                             size={16} 
                             className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                                 theme === 'dark' ? 'text-dark-dim' : 'text-light-dim'
                             }`} 
                         />
                     </div>
                 </div>

                 {/* Condition Selector */}
                 <div className="space-y-1">
                     <label className="text-[10px] font-pixel uppercase opacity-70">СОСТОЯНИЕ / GRADE</label>
                     <div className="relative">
                         <select 
                            value={newExhibit.condition || ''}
                            onChange={(e) => setNewExhibit({...newExhibit, condition: e.target.value})}
                            className={`w-full p-2 border rounded font-pixel text-xs appearance-none cursor-pointer ${
                                theme === 'dark' 
                                ? 'bg-black text-white border-dark-dim focus:border-dark-primary' 
                                : 'bg-white text-black border-light-dim focus:border-light-accent'
                            }`}
                         >
                             {(CATEGORY_CONDITIONS[newExhibit.category || DefaultCategory.MISC] || []).map(cond => (
                                 <option key={cond} value={cond}>{cond}</option>
                             ))}
                         </select>
                         <ChevronDown 
                             size={16} 
                             className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                                 theme === 'dark' ? 'text-dark-dim' : 'text-light-dim'
                             }`} 
                         />
                     </div>
                 </div>

                 {/* Image Upload Section */}
                 <div className="space-y-1">
                    <label className="text-[10px] font-pixel uppercase opacity-70">ИЗОБРАЖЕНИЯ (МИН. 1) *</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {(newExhibit.imageUrls || []).map((url, idx) => (
                             <div key={idx} className="relative w-20 h-20 border rounded overflow-hidden group">
                                 <img src={url} alt="preview" className="w-full h-full object-cover" />
                                 <button 
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                    <X size={12} />
                                 </button>
                             </div>
                        ))}
                        
                        <label className={`w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:opacity-70 transition-opacity ${
                            theme === 'dark' ? 'border-dark-dim bg-dark-surface' : 'border-light-dim bg-white'
                        }`}>
                            <ImageIcon size={20} className="opacity-50" />
                            <span className="text-[8px] font-pixel mt-1 opacity-50">ГАЛЕРЕЯ</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleImageUpload}
                            />
                        </label>

                        <label className={`w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:opacity-70 transition-opacity ${
                            theme === 'dark' ? 'border-dark-dim bg-dark-surface' : 'border-light-dim bg-white'
                        }`}>
                            <Camera size={20} className="opacity-50" />
                            <span className="text-[8px] font-pixel mt-1 opacity-50">КАМЕРА</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment"
                                className="hidden" 
                                onChange={handleImageUpload}
                            />
                        </label>
                    </div>
                 </div>

                 <div className="space-y-1">
                     <label className="text-[10px] font-pixel uppercase opacity-70 flex items-center gap-2">
                         <Video size={12} /> ВИДЕО (URL)
                     </label>
                     <input 
                       className={`w-full bg-transparent border-b p-2 focus:outline-none font-mono text-sm ${
                           theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'
                       }`}
                       placeholder="YouTube / Direct Link (Optional)"
                       value={newExhibit.videoUrl || ''}
                       onChange={e => setNewExhibit({...newExhibit, videoUrl: e.target.value})}
                     />
                     <div className="text-[9px] opacity-40 font-mono">Поддерживается 1 видеофайл или ссылка</div>
                 </div>

                 {/* Dynamic Specs Fields */}
                 <div className="space-y-3">
                     <label className="text-[10px] font-pixel uppercase opacity-70 block border-b pb-1">ХАРАКТЕРИСТИКИ</label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {newExhibit.specs && Object.keys(newExhibit.specs).length > 0 ? (
                             Object.keys(newExhibit.specs).map(key => (
                                 <div key={key} className="space-y-1">
                                     <label className="text-[10px] font-mono uppercase opacity-60 truncate block">{key}</label>
                                     <input 
                                         className={`w-full bg-transparent border rounded p-2 text-sm focus:outline-none font-mono ${
                                             theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'
                                         }`}
                                         placeholder="..."
                                         value={newExhibit.specs?.[key] || ''}
                                         onChange={e => {
                                             setNewExhibit({
                                                 ...newExhibit,
                                                 specs: { ...newExhibit.specs, [key]: e.target.value }
                                             });
                                         }}
                                     />
                                 </div>
                             ))
                         ) : (
                             <div className="col-span-2 text-center opacity-50 text-xs py-4 font-mono">
                                 Выберите категорию для заполнения характеристик
                             </div>
                         )}
                     </div>
                 </div>

                 <div className="space-y-1">
                     <label className="text-[10px] font-pixel uppercase opacity-70">ОПИСАНИЕ * (МИН. 10)</label>
                     <textarea 
                       className="w-full bg-transparent border p-2 focus:outline-none font-mono text-sm min-h-[100px] rounded"
                       value={newExhibit.description || ''}
                       onChange={e => setNewExhibit({...newExhibit, description: e.target.value})}
                       placeholder="Детальное описание артефакта..."
                     />
                 </div>

                 <button 
                    onClick={handleCreateExhibit}
                    disabled={isLoading}
                    className={`w-full py-3 mt-4 font-pixel font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${
                        theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                    }`}
                 >
                    {isLoading ? '...' : 'СОХРАНИТЬ'} <Database size={18} />
                 </button>
             </div>
          </div>
        );
      
      case 'ACTIVITY':
          const myNotifications = notifications.filter(n => n.recipient === user?.username);
          return (
              <div className="max-w-2xl mx-auto animate-in fade-in">
                  <div className="flex justify-center mb-6 border-b border-gray-500/30">
                      <button 
                        onClick={handleOpenUpdates}
                        className={`px-6 py-3 font-pixel text-xs font-bold border-b-2 transition-colors relative ${
                            activityTab === 'UPDATES' 
                            ? (theme === 'dark' ? 'border-dark-primary text-dark-primary' : 'border-light-accent text-light-accent') 
                            : 'border-transparent opacity-50'
                        }`}
                      >
                          ОБНОВЛЕНИЯ
                          {myNotifications.some(n => !n.isRead) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                      </button>
                      <button 
                        onClick={() => setActivityTab('DIALOGS')}
                        className={`px-6 py-3 font-pixel text-xs font-bold border-b-2 transition-colors relative ${
                            activityTab === 'DIALOGS' 
                            ? (theme === 'dark' ? 'border-dark-primary text-dark-primary' : 'border-light-accent text-light-accent') 
                            : 'border-transparent opacity-50'
                        }`}
                      >
                          ДИАЛОГИ
                          {messages.some(m => m.receiver === user?.username && !m.isRead) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                      </button>
                  </div>

                  {activityTab === 'UPDATES' && (
                      <div className="space-y-4">
                          {myNotifications.length === 0 ? (
                              <div className="text-center opacity-50 font-mono py-10">НЕТ НОВЫХ УВЕДОМЛЕНИЙ</div>
                          ) : (
                              myNotifications.map(notif => (
                                  <div key={notif.id} className={`p-4 rounded border flex items-start gap-4 ${
                                      theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'
                                  } ${!notif.isRead ? 'border-l-4 border-l-red-500' : ''}`}>
                                      <div className="mt-1">
                                          {notif.type === 'LIKE' && <Heart className="text-red-500" size={16} />}
                                          {notif.type === 'COMMENT' && <MessageSquare className="text-blue-500" size={16} />}
                                          {notif.type === 'FOLLOW' && <User className="text-green-500" size={16} />}
                                          {notif.type === 'GUESTBOOK' && <MessageCircle className="text-yellow-500" size={16} />}
                                      </div>
                                      <div className="flex-1">
                                          <div className="font-pixel text-xs opacity-50 mb-1 flex justify-between">
                                              <span>{notif.timestamp}</span>
                                              {!notif.isRead && <span className="text-red-500 font-bold">NEW</span>}
                                          </div>
                                          <div className="font-mono text-sm">
                                              <span className="font-bold cursor-pointer hover:underline" onClick={() => handleAuthorClick(notif.actor)}>@{notif.actor}</span>
                                              {notif.type === 'LIKE' && ' оценил ваш артефакт.'}
                                              {notif.type === 'COMMENT' && ' прокомментировал: '}
                                              {notif.type === 'FOLLOW' && ' подписался на вас.'}
                                              {notif.type === 'GUESTBOOK' && ' написал в гостевой книге.'}
                                          </div>
                                          {notif.targetPreview && (
                                              <div className="mt-2 text-xs opacity-70 italic border-l-2 pl-2 border-current">
                                                  "{notif.targetPreview}"
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  )}

                  {activityTab === 'DIALOGS' && (
                       <div className="space-y-4">
                          {messages.length === 0 ? (
                              <div className="text-center opacity-50 font-mono py-10">НЕТ АКТИВНЫХ КАНАЛОВ СВЯЗИ</div>
                          ) : (
                              [...new Set(messages.filter(m => m.sender === user?.username || m.receiver === user?.username).map(m => m.sender === user?.username ? m.receiver : m.sender))].map(partner => {
                                  const unreadCount = messages.filter(m => m.sender === partner && m.receiver === user?.username && !m.isRead).length;
                                  return (
                                  <div 
                                    key={partner} 
                                    onClick={() => handleOpenChat(partner)}
                                    className={`p-4 rounded border flex items-center gap-4 cursor-pointer transition-all hover:translate-x-1 ${
                                      theme === 'dark' ? 'bg-dark-surface border-dark-dim hover:border-dark-primary' : 'bg-white border-light-dim hover:border-light-accent'
                                    }`}
                                  >
                                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-500 relative">
                                          <img src={`https://ui-avatars.com/api/?name=${partner}&background=random`} alt="Avatar" />
                                          {unreadCount > 0 && (
                                              <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-black animate-pulse"></div>
                                          )}
                                      </div>
                                      <div className="flex-1">
                                          <div className="flex justify-between items-baseline mb-1">
                                              <span className="font-pixel text-sm font-bold">@{partner}</span>
                                              {unreadCount > 0 && <span className="text-[10px] font-bold bg-red-500 text-white px-2 rounded-full">{unreadCount} NEW</span>}
                                          </div>
                                          <div className="font-mono text-xs opacity-80 truncate">Нажмите для перехода в чат</div>
                                      </div>
                                  </div>
                              )})
                          )}
                      </div>
                  )}
              </div>
          );

      case 'USER_PROFILE':
         const profileUsername = viewedProfile || user?.username;
         if (!profileUsername) return <div>User not found</div>;
         
         const profileUser = db.getFullDatabase().users.find(u => u.username === profileUsername) || {
             username: profileUsername,
             email: 'ghost@matrix.net',
             tagline: 'Цифровой призрак',
             avatarUrl: `https://ui-avatars.com/api/?name=${profileUsername}`,
             joinedDate: 'Unknown',
             following: [],
             achievements: [],
             telegram: ''
         } as UserProfile;

         const profileArtifacts = exhibits.filter(e => e.owner === profileUsername);
         const profileCollections = collections.filter(c => c.owner === profileUsername);
         const isCurrentUser = user?.username === profileUsername;
         const isSubscribed = user?.following.includes(profileUsername) || false;

         return (
             <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-32">
                 <button onClick={() => setView('FEED')} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs">
                     <ArrowLeft size={16} /> НАЗАД
                  </button>
                 
                 <div className={`p-6 rounded-xl border-2 flex flex-col md:flex-row items-center gap-6 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                     <div className="relative">
                         <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-gray-500">
                             <img src={profileUser.avatarUrl} alt={profileUser.username || ''} className="w-full h-full object-cover"/>
                         </div>
                         {isCurrentUser && (
                             <label className="absolute bottom-0 right-0 bg-gray-800 p-2 rounded-full cursor-pointer hover:bg-gray-700 text-white border border-gray-600">
                                 <Edit2 size={14} />
                                 <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} />
                             </label>
                         )}
                     </div>

                     <div className="flex-1 text-center md:text-left space-y-2">
                         {isEditingProfile && isCurrentUser ? (
                             <div className="space-y-2 max-w-sm">
                                 <input 
                                     value={editTagline}
                                     onChange={e => setEditTagline(e.target.value)}
                                     placeholder="Статус..."
                                     className="w-full bg-transparent border-b p-1 font-mono text-sm"
                                 />
                                 <input 
                                     value={editTelegram}
                                     onChange={e => setEditTelegram(e.target.value)}
                                     placeholder="Telegram (без @)"
                                     className="w-full bg-transparent border-b p-1 font-mono text-sm"
                                 />
                                 <div className="flex gap-2">
                                     {(Object.keys(STATUS_OPTIONS) as UserStatus[]).map(s => (
                                         <button 
                                            key={s} 
                                            onClick={() => setEditStatus(s)}
                                            className={`p-1 rounded border ${editStatus === s ? 'border-green-500 bg-green-500/20' : 'border-transparent'}`}
                                            title={STATUS_OPTIONS[s].label}
                                         >
                                             {React.createElement(STATUS_OPTIONS[s].icon, { size: 16 })}
                                         </button>
                                     ))}
                                 </div>
                                 <div className="flex gap-2 justify-center md:justify-start">
                                     <button onClick={handleSaveProfile} className="bg-green-600 text-white px-3 py-1 rounded text-xs">OK</button>
                                     <button onClick={() => setIsEditingProfile(false)} className="bg-gray-600 text-white px-3 py-1 rounded text-xs">CANCEL</button>
                                 </div>
                             </div>
                         ) : (
                             <>
                                 <h2 className="text-2xl font-pixel font-bold">@{profileUser.username}</h2>
                                 <p className="font-mono opacity-70 flex items-center justify-center md:justify-start gap-2">
                                     {profileUser.tagline}
                                     {isCurrentUser && (
                                         <button onClick={() => { 
                                             setEditTagline(user?.tagline || ''); 
                                             setEditStatus(user?.status || 'ONLINE');
                                             setEditTelegram(user?.telegram || '');
                                             setIsEditingProfile(true); 
                                         }} className="opacity-50 hover:opacity-100">
                                             <Edit2 size={12} />
                                         </button>
                                     )}
                                 </p>
                                 {profileUser.status && (
                                     <div className={`flex items-center gap-1 text-xs font-bold ${STATUS_OPTIONS[profileUser.status].color} justify-center md:justify-start`}>
                                         {React.createElement(STATUS_OPTIONS[profileUser.status].icon, { size: 12 })}
                                         {STATUS_OPTIONS[profileUser.status].label}
                                     </div>
                                 )}
                                 {profileUser.telegram && (
                                     <a 
                                        href={`https://t.me/${profileUser.telegram.replace('@', '')}`}
                                        target="_blank"
                                        rel="nofollow noreferrer"
                                        className={`flex items-center gap-1 text-xs font-bold justify-center md:justify-start hover:underline ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
                                     >
                                        <Send size={12} /> Telegram
                                     </a>
                                 )}
                             </>
                         )}

                         <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-mono pt-2">
                             <div><span className="font-bold">{profileArtifacts.length}</span> Артефактов</div>
                             <div><span className="font-bold">{profileUser.following.length}</span> Подписок</div>
                         </div>
                         
                         {!isCurrentUser && (
                             <div className="flex gap-2 justify-center md:justify-start pt-2">
                                 <button 
                                     onClick={() => handleFollow(profileUser.username)}
                                     className={`px-4 py-2 rounded font-bold font-pixel text-xs ${
                                         isSubscribed 
                                         ? 'border border-gray-500 opacity-70' 
                                         : (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white')
                                     }`}
                                 >
                                     {isSubscribed ? 'ПОДПИСАН' : 'ПОДПИСАТЬСЯ'}
                                 </button>
                                 <button onClick={() => handleOpenChat(profileUser.username)} className="px-4 py-2 rounded border hover:bg-white/10">
                                     <MessageSquare size={16} />
                                 </button>
                             </div>
                         )}

                         {/* Mobile Logout Button (Visible only to owner) */}
                         {isCurrentUser && (
                             <div className="flex justify-center md:justify-start pt-2">
                                 <button 
                                     onClick={handleLogout}
                                     className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-500/10 text-xs font-pixel font-bold transition-colors"
                                 >
                                     <LogOut size={14} /> ВЫЙТИ ИЗ СИСТЕМЫ
                                 </button>
                             </div>
                         )}
                     </div>
                 </div>
                 
                 {profileUser.achievements && profileUser.achievements.length > 0 && (
                     <div className="flex gap-2 flex-wrap justify-center md:justify-start">
                         {profileUser.achievements.map(badgeId => {
                             const b = BADGES[badgeId as keyof typeof BADGES];
                             if(!b) return null;
                             return (
                                 <div key={badgeId} className={`px-2 py-1 rounded text-[10px] font-bold text-white ${b.color} flex items-center gap-1`} title={b.desc}>
                                      {b.label}
                                 </div>
                             )
                         })}
                     </div>
                 )}

                 <button 
                    onClick={() => setView('HALL_OF_FAME')}
                    className="w-full py-3 border border-dashed border-gray-500/30 text-xs font-pixel opacity-70 hover:opacity-100 flex items-center justify-center gap-2"
                 >
                     <Trophy size={14} /> ОТКРЫТЬ ЗАЛ СЛАВЫ
                 </button>
                 
                 <div className="flex gap-4 border-b border-gray-500/30">
                     <button 
                         onClick={() => setProfileTab('ARTIFACTS')}
                         className={`pb-2 font-pixel text-xs ${profileTab === 'ARTIFACTS' ? 'border-b-2 border-current font-bold' : 'opacity-50'}`}
                     >
                         АРТЕФАКТЫ
                     </button>
                     <button 
                         onClick={() => setProfileTab('COLLECTIONS')}
                         className={`pb-2 font-pixel text-xs ${profileTab === 'COLLECTIONS' ? 'border-b-2 border-current font-bold' : 'opacity-50'}`}
                     >
                         КОЛЛЕКЦИИ
                     </button>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                     {profileTab === 'ARTIFACTS' && profileArtifacts.map(item => (
                         <ExhibitCard 
                             key={item.id} 
                             item={item} 
                             theme={theme}
                             similarExhibits={[]}
                             onClick={handleExhibitClick}
                             isLiked={item.likedBy?.includes(user?.username || '') || false}
                             isFavorited={false}
                             onLike={(e) => toggleLike(item.id, e)}
                             onFavorite={(e) => toggleFavorite(item.id, e)}
                             onAuthorClick={() => {}}
                         />
                     ))}
                     {profileTab === 'COLLECTIONS' && profileCollections.map(renderCollectionCard)}
                 </div>
                 
                 <div className="pt-8 border-t border-dashed border-gray-500/30">
                     <h3 className="font-pixel text-sm mb-4">GUESTBOOK_PROTOCOL</h3>
                     <div className="space-y-4 mb-4">
                         {guestbook.filter(g => g.targetUser === profileUser.username).map(entry => (
                             <div key={entry.id} className="p-3 border rounded border-gray-500/30 text-xs">
                                 <div className="flex justify-between mb-1">
                                     <span className="font-bold font-pixel cursor-pointer" onClick={() => handleAuthorClick(entry.author)}>@{entry.author}</span>
                                     <span className="opacity-50">{entry.timestamp}</span>
                                 </div>
                                 <p className="font-mono">{entry.text}</p>
                             </div>
                         ))}
                     </div>
                     {user && (
                         <div className="flex gap-2">
                             <input 
                                 value={guestbookInput}
                                 onChange={e => setGuestbookInput(e.target.value)}
                                 placeholder={`Написать @${profileUser.username}...`}
                                 className="flex-1 bg-transparent border-b p-2 font-mono text-sm focus:outline-none"
                             />
                             <button onClick={handleGuestbookPost} className="p-2 border rounded hover:bg-white/10">
                                 <Send size={16} />
                             </button>
                         </div>
                     )}
                 </div>
             </div>
         );

      case 'EXHIBIT':
        return selectedExhibit ? (
            <ExhibitDetailPage 
                exhibit={selectedExhibit}
                theme={theme}
                onBack={handleBack}
                onShare={(id: string) => { /* handled internally */ }}
                onFavorite={(id: string) => toggleFavorite(id)}
                onLike={(id: string) => toggleLike(id)}
                isFavorited={false}
                isLiked={selectedExhibit.likedBy?.includes((user?.username as string) || '') || false}
                onPostComment={handlePostComment}
                onAuthorClick={handleAuthorClick}
                onFollow={handleFollow}
                onMessage={handleOpenChat}
                onDelete={user?.username === selectedExhibit.owner || user?.isAdmin ? handleDeleteExhibit : undefined}
                onEdit={() => {/* TODO */}}
                isFollowing={user?.following.includes(selectedExhibit.owner) || false}
                currentUser={user?.username || ''}
                isAdmin={user?.isAdmin || false}
            />
        ) : <div>Error: No exhibit selected</div>;

      case 'COLLECTION_DETAIL':
          if (!selectedCollection) return <div>Error</div>;
          const colExhibits = exhibits.filter(e => selectedCollection.exhibitIds.includes(e.id));
          return (
              <div className="max-w-4xl mx-auto animate-in fade-in pb-32">
                  <button onClick={handleBack} className="flex items-center gap-2 mb-6 hover:underline opacity-70 font-pixel text-xs">
                     <ArrowLeft size={16} /> НАЗАД
                  </button>
                  <div className="relative aspect-[3/1] rounded-xl overflow-hidden mb-8 group">
                      <img src={selectedCollection.coverImage} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-6">
                          <h1 className="text-xl md:text-3xl font-pixel text-white mb-2">{selectedCollection.title}</h1>
                          <p className="text-white/80 font-mono text-sm max-w-2xl">{selectedCollection.description}</p>
                          {user?.username === selectedCollection.owner && (
                              <button 
                                onClick={() => handleEditCollection(selectedCollection)}
                                className="absolute top-4 right-4 bg-white/20 p-2 rounded hover:bg-white/40 text-white"
                              >
                                  <Edit2 size={16} />
                              </button>
                          )}
                      </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {colExhibits.map(item => (
                          <ExhibitCard 
                             key={item.id} 
                             item={item} 
                             theme={theme}
                             similarExhibits={[]}
                             onClick={handleExhibitClick}
                             isLiked={item.likedBy?.includes(user?.username || '') || false}
                             isFavorited={false}
                             onLike={(e) => toggleLike(item.id, e)}
                             onFavorite={(e) => toggleFavorite(item.id, e)}
                             onAuthorClick={handleAuthorClick}
                          />
                      ))}
                  </div>
              </div>
          );

      case 'FEED':
      default:
         return (
             <div className="max-w-7xl mx-auto animate-in fade-in">
                 <div className="flex items-center justify-center gap-4 mb-8">
                     <button 
                         onClick={() => setFeedMode('ARTIFACTS')}
                         className={`px-4 py-2 font-pixel text-sm rounded-full transition-all ${
                             feedMode === 'ARTIFACTS' 
                             ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') 
                             : 'opacity-50 hover:opacity-100'
                         }`}
                     >
                         АРТЕФАКТЫ
                     </button>
                     <button 
                         onClick={() => setFeedMode('COLLECTIONS')}
                         className={`px-4 py-2 font-pixel text-sm rounded-full transition-all ${
                             feedMode === 'COLLECTIONS' 
                             ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') 
                             : 'opacity-50 hover:opacity-100'
                         }`}
                     >
                         КОЛЛЕКЦИИ
                     </button>
                 </div>

                 {feedMode === 'ARTIFACTS' && (
                     <>
                        <div className="flex overflow-x-auto gap-2 pb-4 mb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:justify-center">
                            <button 
                                onClick={() => { setSelectedCategory('ВСЕ'); updateHash('/feed'); }}
                                className={`px-3 py-1 rounded text-xs font-pixel whitespace-nowrap border flex-shrink-0 ${
                                    selectedCategory === 'ВСЕ'
                                    ? (theme === 'dark' ? 'bg-dark-surface border-dark-primary text-dark-primary' : 'bg-white border-light-accent text-light-accent')
                                    : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                            >
                                [ ВСЕ ]
                            </button>
                            {Object.values(DefaultCategory).map((cat: string) => (
                                <button
                                    key={cat}
                                    onClick={() => { setSelectedCategory(cat); updateHash('/feed'); }}
                                    className={`px-3 py-1 rounded text-xs font-pixel whitespace-nowrap border flex-shrink-0 ${
                                        selectedCategory === cat
                                        ? (theme === 'dark' ? 'bg-dark-surface border-dark-primary text-dark-primary' : 'bg-white border-light-accent text-light-accent')
                                        : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                             {exhibits
                                .filter(ex => selectedCategory === 'ВСЕ' || ex.category === selectedCategory)
                                .slice(0, visibleCount)
                                .map((item: Exhibit) => (
                                    <ExhibitCard 
                                        key={item.id} 
                                        item={item} 
                                        theme={theme}
                                        similarExhibits={[]}
                                        onClick={handleExhibitClick}
                                        isLiked={item.likedBy?.includes(user?.username || '') || false}
                                        isFavorited={false}
                                        onLike={(e) => toggleLike(item.id, e)}
                                        onFavorite={(e) => toggleFavorite(item.id, e)}
                                        onAuthorClick={handleAuthorClick}
                                    />
                                ))
                             }
                        </div>
                        
                        <div ref={loadMoreRef} className="h-20 w-full flex items-center justify-center mt-8">
                             {exhibits.length > visibleCount && <RetroLoader />}
                        </div>
                     </>
                 )}

                 {feedMode === 'COLLECTIONS' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {collections.map(renderCollectionCard)}
                     </div>
                 )}
             </div>
         );
    }
  };

  if (isInitializing) return <div className="h-screen bg-black flex items-center justify-center text-green-500 font-pixel"><RetroLoader size="lg" text="SYSTEM BOOT" /></div>;

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans selection:bg-green-500 selection:text-black ${
      theme === 'dark' ? 'bg-black text-gray-200' : 'bg-gray-100 text-gray-800'
    }`}>
      <MatrixRain theme={theme} />
      {theme === 'dark' && <CRTOverlay />}

      {/* LOGIN TRANSITION OVERLAY */}
      {isLoginTransition && <LoginTransition />}

      {/* PWA INSTALL BANNER */}
      {showInstallBanner && (
          <InstallBanner 
              theme={theme} 
              onInstall={handleInstallClick} 
              onClose={() => setShowInstallBanner(false)} 
          />
      )}
      
      {view !== 'AUTH' && (
        <header className={`hidden md:flex sticky top-0 z-50 backdrop-blur-md border-b ${theme === 'dark' ? 'bg-black/80 border-dark-dim' : 'bg-white/80 border-light-dim'}`}>
            <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between w-full">
                <div 
                    onClick={() => { setView('FEED'); setFeedMode('ARTIFACTS'); setSelectedCategory('ВСЕ'); updateHash('/feed'); }}
                    className="font-pixel text-lg font-bold cursor-pointer flex items-center gap-2"
                >
                    <Terminal size={20} className={theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'} />
                    <span>NEO_ARCHIVE</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input 
                           value={searchQuery}
                           onChange={(e) => { setSearchQuery(e.target.value); if(view !== 'SEARCH') setView('SEARCH'); }}
                           placeholder="ПОИСК..."
                           className={`w-64 bg-transparent border rounded-full px-3 py-1 text-xs font-pixel focus:outline-none focus:w-full transition-all ${
                               theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'
                           }`}
                        />
                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"/>
                    </div>

                    <button 
                        onClick={() => setView('CREATE_HUB')} 
                        className={`p-2 rounded-full transition-transform hover:scale-110 ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}
                        title="Добавить"
                    >
                        <PlusSquare size={20} />
                    </button>
                    
                    <button 
                        onClick={() => setView('ACTIVITY')} 
                        className="relative p-2 opacity-70 hover:opacity-100"
                        title="Активность"
                    >
                        <Bell size={20} />
                        {(notifications.some(n => n.recipient === user?.username && !n.isRead) || messages.some(m => m.receiver === user?.username && !m.isRead)) && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        )}
                    </button>

                    <button 
                         onClick={() => {
                             if (user) {
                                 setViewedProfile(user.username);
                                 setView('USER_PROFILE');
                                 updateHash(`/profile/${user.username}`);
                             }
                         }}
                         className="w-8 h-8 rounded-full bg-gray-500 overflow-hidden border border-transparent hover:border-current transition-all"
                         title="Профиль"
                    >
                        <img src={`https://ui-avatars.com/api/?name=${user?.username || 'Guest'}&background=random`} alt="User" />
                    </button>

                    <button onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} className="opacity-50 hover:opacity-100">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    
                    <button onClick={handleLogout} className="opacity-50 hover:opacity-100 text-red-500" title="Выход">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
      )}
      
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-6">
         {view === 'FEED' && <HeroSection theme={theme} user={user} />}
         {renderContentArea()}
      </main>

      {view !== 'AUTH' && user && (
          <MobileNavigation 
              theme={theme}
              view={view}
              setView={setView}
              updateHash={updateHash}
              hasNotifications={notifications.some(n => n.recipient === user?.username && !n.isRead) || messages.some(m => m.receiver === user?.username && !m.isRead)}
              username={user.username}
              onResetFeed={() => { setFeedMode('ARTIFACTS'); setSelectedCategory('ВСЕ'); }}
              onProfileClick={() => {
                   setViewedProfile(user.username);
                   setView('USER_PROFILE');
                   updateHash(`/profile/${user.username}`);
              }}
          />
      )}

      {view !== 'AUTH' && (
          <footer className="hidden md:block mt-20 py-10 text-center font-mono text-xs opacity-40 border-t border-dashed border-gray-500/30">
              <p>NEO_ARCHIVE SYSTEM // EST. 2025 by <a href='https://t.me/truester1337'>Truester<a/> </p>
          </footer>
      )}
    </div>
  );
}