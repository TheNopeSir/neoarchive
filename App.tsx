
import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, PlusSquare, X, Sun, Moon, ChevronDown, Upload, LogOut, FolderOpen, 
  MessageSquare, Search, Database, Trash2, Settings, Home, Activity, Zap, Sparkles, 
  User, ArrowLeft, Shuffle, Trophy, CheckCircle2, Bell, 
  MessageCircle, PlusCircle, Heart, FilePlus, FolderPlus, Grid, Flame, Layers, 
  Share2, Award, Crown, ChevronLeft, ChevronRight, Camera, Edit2, Save, Check, 
  Send, Link, Smartphone, Laptop, Video, Image as ImageIcon, WifiOff, Download, Box,
  Package, FileEdit, Reply, Plus
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
import { Exhibit, ViewState, Comment, UserProfile, Collection, Notification, Message, GuestbookEntry, UserStatus } from './types';
import { DefaultCategory, CATEGORY_SPECS_TEMPLATES, CATEGORY_CONDITIONS, BADGES, calculateArtifactScore, STATUS_OPTIONS, CATEGORY_SUBCATEGORIES, COMMON_SPEC_VALUES } from './constants';
import { moderateContent, moderateImage } from './services/geminiService';
import * as db from './services/storageService';
import { compressImage, isOffline, getUserAvatar } from './services/storageService';
import useSwipe from './hooks/useSwipe';

// IMPORTS
import HeroSection from './components/HeroSection';
import CollectionCard from './components/CollectionCard';
import MobileNavigation from './components/MobileNavigation';
import LoginTransition from './components/LoginTransition';
import InstallBanner from './components/InstallBanner';
import FeedView from './components/views/FeedView';
import UserProfileView from './components/views/UserProfileView';
import ActivityView from './components/views/ActivityView';

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
  const [systemStats, setSystemStats] = useState({ totalUsers: 0, onlineUsers: 0 });

  // UI State
  const [selectedCategory, setSelectedCategory] = useState<string>('ВСЕ');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [viewedProfile, setViewedProfile] = useState<string | null>(null);
  const [activityTab, setActivityTab] = useState<'UPDATES' | 'DIALOGS'>('UPDATES');
  const [badgeIndex, setBadgeIndex] = useState(0);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false); 
  
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
  const guestbookInputRef = useRef<HTMLInputElement>(null);

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

  // Exhibit Editing
  const [editingExhibitId, setEditingExhibitId] = useState<string | null>(null);

  // Session tracking
  const [viewedExhibitsSession, setViewedExhibitsSession] = useState<Set<string>>(new Set());

  // Create Modal State
  const [newExhibit, setNewExhibit] = useState<Partial<Exhibit>>({
    category: DefaultCategory.PHONES,
    subcategory: '', 
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
      setExhibits([...db.getExhibits()]);
      setCollections([...db.getCollections()]);
      setNotifications([...db.getNotifications()]);
      setMessages([...db.getMessages()]);
      setGuestbook([...db.getGuestbook()]);
      setSystemStats(db.getSystemStats());
  };

  // Background Sync Polling
  useEffect(() => {
      if (view === 'AUTH' || isOffline()) return;

      const interval = setInterval(async () => {
          const hasUpdates = await db.backgroundSync();
          if (hasUpdates) {
              refreshData();
          }
      }, 15000); 

      return () => clearInterval(interval);
  }, [view]);

  // Initialize & PWA Install Listener
  useEffect(() => {
    window.onerror = (msg, url, lineNo, columnNo, error) => {
      console.error('🔴 [Global Error]:', msg, error);
      return false;
    };

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

  // Handle Install Click
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

  // Handle Dismiss Click (X)
  const handleDismissInstall = () => {
      setShowInstallBanner(false);
      localStorage.setItem('pwa_dismissed', 'true');
  };

  // --- HASH ROUTING ---
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

      if (!isInitializing) {
          handleHashChange();
      }

      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
  }, [exhibits, collections, user, isInitializing]); 

  const updateHash = (path: string) => {
      window.location.hash = path;
  };

  const handleResetFeed = () => {
      setFeedMode('ARTIFACTS');
      setSelectedCategory('ВСЕ');
  };

  // --- SWIPE LOGIC ---
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
      setIsLoginTransition(true);
      if (remember) {
          localStorage.setItem('neo_active_user', loggedInUser.username);
      }
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
         const contentToCheck = `${newExhibit.title} ${newExhibit.description}`;
         const modResult = await moderateContent(contentToCheck);
         if (!modResult.allowed) {
             setIsLoading(false);
             alert(`ОТКАЗАНО: ${modResult.reason || 'НАРУШЕНИЕ ПРАВИЛ СООБЩЕСТВА'}`);
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

     if (editingExhibitId) {
         await db.updateExhibit(exhibit);
     } else {
         await db.saveExhibit(exhibit); 
     }
     
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
        const file = e.target.files[0];
        const modResult = await moderateImage(file);
        if (!modResult.allowed) {
            alert(`ОШИБКА ФАЙЛА: ${modResult.reason}`);
            return;
        }
        try {
            const base64 = await compressImage(file);
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
              const base64 = await compressImage(file);
              setEditAvatarUrl(base64); 
              if (user) {
                  const updatedUser = { ...user, avatarUrl: base64 };
                  setUser(updatedUser); 
                  await db.updateUserProfile(updatedUser);
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
              const base64 = await compressImage(file);
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
              const base64 = await compressImage(file);
              setCollectionToEdit({...collectionToEdit, coverImage: base64});
          } catch(err: any) {
              alert("Ошибка загрузки");
          }
      }
  };

  const removeImage = (index: number) => {
    setNewExhibit(prev => ({ ...prev, imageUrls: (prev.imageUrls || []).filter((_, i) => i !== index) }));
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
      setCollections([...db.getCollections()]); 
      setNewCollection({ title: '', description: '', coverImage: '' });
      setIsLoading(false);
      setCollectionToEdit(newCol);
      setView('EDIT_COLLECTION'); 
      updateHash('/create'); 
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
      if (selectedExhibit && selectedExhibit.id === id) {
          setSelectedExhibit(ex);
      }
  };

  const handleLikeComment = (exhibitId: string, commentId: string) => {
      if (!user) return;
      const exIndex = exhibits.findIndex(x => x.id === exhibitId);
      if (exIndex === -1) return;
      
      const updatedExhibits = [...exhibits];
      const ex = { ...updatedExhibits[exIndex] };
      const commentIndex = ex.comments.findIndex(c => c.id === commentId);
      if (commentIndex === -1) return;

      const comment = { ...ex.comments[commentIndex] };
      if (!comment.likedBy) comment.likedBy = [];
      
      const isLiked = comment.likedBy.includes(user.username);
      if (isLiked) {
          comment.likes = Math.max(0, comment.likes - 1);
          comment.likedBy = comment.likedBy.filter(u => u !== user.username);
      } else {
          comment.likes++;
          comment.likedBy.push(user.username);
          if (comment.author !== user.username) {
              const notif: Notification = {
                 id: Date.now().toString(),
                 type: 'LIKE_COMMENT',
                 actor: user.username,
                 recipient: comment.author,
                 targetId: ex.id,
                 targetPreview: comment.text.substring(0, 20) + '...',
                 timestamp: new Date().toLocaleString('ru-RU'),
                 isRead: false
             };
             db.saveNotification(notif);
             setNotifications(prev => [notif, ...prev]);
          }
      }
      ex.comments[commentIndex] = comment;
      db.updateExhibit(ex);
      updatedExhibits[exIndex] = ex;
      setExhibits(updatedExhibits);
      if (selectedExhibit && selectedExhibit.id === exhibitId) {
          setSelectedExhibit(ex);
      }
  };

  const handleSaveProfile = async () => {
      if (!user) return;
      const targetUsername = viewedProfile || user.username;
      const existingData = db.getFullDatabase().users.find(u => u.username === targetUsername);
      if (!existingData) return;

      const updatedUser: UserProfile = {
          ...existingData, 
          tagline: editTagline,
          avatarUrl: editAvatarUrl || existingData.avatarUrl,
          status: editStatus,
          telegram: editTelegram
      };

      await db.updateUserProfile(updatedUser);
      if (user.username === targetUsername) {
          setUser(updatedUser);
      }
      refreshData();
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

  const handleShareCollection = async (col: Collection) => {
      const url = `${window.location.origin}/#/collection/${col.slug || col.id}`;
      if (navigator.share) {
          try {
              await navigator.share({
                  title: `NeoArchive: ${col.title}`,
                  text: col.description,
                  url: url
              });
          } catch (err: any) {
              console.warn('Share cancelled', err);
          }
      } else {
          try {
              await navigator.clipboard.writeText(url);
              alert('Ссылка на коллекцию скопирована!');
          } catch (err: any) {
              console.error('Clipboard failed', err);
          }
      }
  };
  
  const handleOpenUpdates = () => {
      setActivityTab('UPDATES');
      if (user) {
          db.markNotificationsRead(user.username);
          const updatedNotifs = db.getNotifications();
          setNotifications([...updatedNotifs]);
      }
      setView('ACTIVITY');
      updateHash('/activity');
  };

  const getUserAchievements = (username: string) => {
      const userExhibits = exhibits.filter(e => e.owner === username && !e.isDraft);
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

  const renderContentArea = () => {
    switch (view) {
      case 'CREATE_HUB':
        return (
            <div className="max-w-2xl mx-auto animate-in fade-in h-[70vh] flex flex-col justify-center">
                <h2 className="text-xl font-pixel mb-8 text-center uppercase">Выберите тип загрузки</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                      onClick={() => { setView('CREATE_ARTIFACT'); updateHash('/create/artifact'); }}
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
                      onClick={() => { setView('CREATE_COLLECTION'); updateHash('/create/collection'); }}
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

      case 'CREATE_ARTIFACT':
        const currentCategory = newExhibit.category || DefaultCategory.MISC;
        const availableConditions = CATEGORY_CONDITIONS[currentCategory] || CATEGORY_CONDITIONS[DefaultCategory.MISC];
        return (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
             <div className="flex items-center gap-2 mb-6">
                 <button onClick={() => setView('CREATE_HUB')} className="md:hidden"><ChevronDown className="rotate-90" /></button>
                 <button onClick={() => setView('FEED')} className="hidden md:block"><ChevronDown className="rotate-90" /></button>
                 <h2 className="text-lg md:text-xl font-pixel">{editingExhibitId ? 'РЕДАКТИРОВАНИЕ' : 'ЗАГРУЗКА АРТЕФАКТА'}</h2>
             </div>
             <div className={`p-6 rounded border space-y-6 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                 <div className="space-y-1"><label className="text-[10px] font-pixel uppercase opacity-70">НАЗВАНИЕ * (МИН. 3)</label><input className="w-full bg-transparent border-b p-2 focus:outline-none font-pixel text-base md:text-lg" placeholder="Например: Sony Walkman" value={newExhibit.title || ''} onChange={e => setNewExhibit({...newExhibit, title: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-pixel uppercase opacity-70">КАТЕГОРИЯ</label><div className="relative mt-1"><select value={newExhibit.category || DefaultCategory.MISC} onChange={(e) => { const cat = e.target.value; setNewExhibit({...newExhibit, category: cat, subcategory: '', specs: generateSpecsForCategory(cat), condition: getDefaultCondition(cat)}); }} className={`w-full p-2 border rounded font-pixel text-xs appearance-none cursor-pointer uppercase ${theme === 'dark' ? 'bg-black text-white border-dark-dim focus:border-dark-primary' : 'bg-white text-black border-light-dim focus:border-light-accent'}`}>{Object.values(DefaultCategory).map((cat: string) => (<option key={cat} value={cat}>{cat}</option>))}</select><ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'dark' ? 'text-dark-dim' : 'text-light-dim'}`} /></div></div>
                 {CATEGORY_SUBCATEGORIES[currentCategory] && (<div className="space-y-1 animate-in fade-in"><label className="text-[10px] font-pixel uppercase opacity-70">ПОДКАТЕГОРИЯ</label><div className="relative mt-1"><select value={newExhibit.subcategory || ''} onChange={(e) => setNewExhibit({ ...newExhibit, subcategory: e.target.value })} className={`w-full p-2 border rounded font-pixel text-xs appearance-none cursor-pointer uppercase ${theme === 'dark' ? 'bg-black text-white border-dark-dim focus:border-dark-primary' : 'bg-white text-black border-light-dim focus:border-light-accent'}`}><option value="">-- ВЫБЕРИТЕ ПОДТИП --</option>{CATEGORY_SUBCATEGORIES[currentCategory].map((sub: string) => (<option key={sub} value={sub}>{sub}</option>))}</select><ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'dark' ? 'text-dark-dim' : 'text-light-dim'}`} /></div></div>)}
                 <div className="space-y-1"><label className="text-[10px] font-pixel uppercase opacity-70">СОСТОЯНИЕ / GRADE</label><div className="relative"><select value={newExhibit.condition || ''} onChange={(e) => setNewExhibit({...newExhibit, condition: e.target.value})} className={`w-full p-2 border rounded font-pixel text-xs appearance-none cursor-pointer ${theme === 'dark' ? 'bg-black text-white border-dark-dim focus:border-dark-primary' : 'bg-white text-black border-light-dim focus:border-light-accent'}`}><option value="">-- ВЫБЕРИТЕ СОСТОЯНИЕ --</option>{availableConditions.map(cond => (<option key={cond} value={cond}>{cond}</option>))}</select><ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'dark' ? 'text-dark-dim' : 'text-light-dim'}`} /></div></div>
                 <div className="space-y-1"><label className="text-[10px] font-pixel uppercase opacity-70">ИЗОБРАЖЕНИЯ (МИН. 1) *</label><div className="flex flex-wrap gap-2 mb-2">{(newExhibit.imageUrls || []).map((url, idx) => (<div key={idx} className="relative w-20 h-20 border rounded overflow-hidden group"><img src={url} alt="preview" className="w-full h-full object-cover" /><button onClick={() => removeImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button></div>))}<label className={`w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:opacity-70 transition-opacity ${theme === 'dark' ? 'border-dark-dim bg-dark-surface' : 'border-light-dim bg-white'}`}><ImageIcon size={20} className="opacity-50" /><span className="text-[8px] font-pixel mt-1 opacity-50">ГАЛЕРЕЯ</span><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label></div></div>
                 <div className="space-y-1"><label className="text-[10px] font-pixel uppercase opacity-70 flex items-center gap-2"><Video size={12} /> ВИДЕО (URL)</label><input className={`w-full bg-transparent border-b p-2 focus:outline-none font-mono text-sm ${theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`} placeholder="YouTube / Direct Link (Optional)" value={newExhibit.videoUrl || ''} onChange={e => setNewExhibit({...newExhibit, videoUrl: e.target.value})} /></div>
                 <div className="space-y-3"><label className="text-[10px] font-pixel uppercase opacity-70 block border-b pb-1">ХАРАКТЕРИСТИКИ</label><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{newExhibit.specs && Object.keys(newExhibit.specs).length > 0 ? (Object.keys(newExhibit.specs).map(key => (<div key={key} className="space-y-1"><label className="text-[10px] font-mono uppercase opacity-60 truncate block">{key}</label><input list={`list-${key}`} className={`w-full bg-transparent border rounded p-2 text-sm focus:outline-none font-mono ${theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`} placeholder="..." value={newExhibit.specs?.[key] || ''} onChange={e => { setNewExhibit({ ...newExhibit, specs: { ...newExhibit.specs, [key]: e.target.value } }); }} />{COMMON_SPEC_VALUES[key] && (<datalist id={`list-${key}`}>{COMMON_SPEC_VALUES[key].map(opt => (<option key={opt} value={opt} />))}</datalist>)}</div>))) : (<div className="col-span-2 text-center opacity-50 text-xs py-4 font-mono">Выберите категорию для заполнения характеристик</div>)}</div></div>
                 <div className="space-y-1"><label className="text-[10px] font-pixel uppercase opacity-70">ОПИСАНИЕ * (МИН. 10)</label><textarea className="w-full bg-transparent border p-2 focus:outline-none font-mono text-sm min-h-[100px] rounded" value={newExhibit.description || ''} onChange={e => setNewExhibit({...newExhibit, description: e.target.value})} placeholder="Детальное описание артефакта..." /></div>
                 <div className="flex gap-4"><button onClick={() => handleCreateExhibit(true)} disabled={isLoading} className="flex-1 py-3 mt-4 font-pixel font-bold uppercase tracking-widest border border-dashed hover:bg-white/5 transition-colors text-xs">В ЧЕРНОВИК</button><button onClick={() => handleCreateExhibit(false)} disabled={isLoading} className={`flex-[2] py-3 mt-4 font-pixel font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}>{isLoading ? '...' : 'ПУБЛИКАЦИЯ'} <Database size={18} /></button></div>
             </div>
          </div>
        );

      // 3. THIS WAS MISSING -> FIXES CARD NAVIGATION
      case 'EXHIBIT':
          if (!selectedExhibit) return <div>Exhibit not found</div>;
          return (
              <ExhibitDetailPage 
                  exhibit={selectedExhibit}
                  theme={theme}
                  onBack={handleBack}
                  onLike={(id) => toggleLike(id)}
                  onFavorite={(id) => toggleFavorite(id)}
                  onPostComment={handlePostComment}
                  onLikeComment={handleLikeComment}
                  onAuthorClick={handleAuthorClick}
                  onShare={(id) => { /* internal share logic used */ }}
                  isLiked={selectedExhibit.likedBy?.includes(user?.username || '') || false}
                  isFavorited={false}
                  onFollow={handleFollow}
                  onMessage={handleOpenChat}
                  onDelete={handleDeleteExhibit}
                  onEdit={handleEditExhibit}
                  isFollowing={user?.following.includes(selectedExhibit.owner) || false}
                  currentUser={user?.username || ''}
                  isAdmin={user?.isAdmin || false}
              />
          );

      case 'COLLECTION_DETAIL':
          if (!selectedCollection) return <div>Error</div>;
          const colExhibits = exhibits.filter(e => selectedCollection.exhibitIds.includes(e.id));
          return (
              <div className="max-w-4xl mx-auto animate-in fade-in pb-32">
                  <div className="flex justify-between items-center mb-6">
                      <button onClick={handleBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs">
                         <ArrowLeft size={16} /> НАЗАД
                      </button>
                      <button 
                          onClick={(e) => { e.stopPropagation(); handleShareCollection(selectedCollection); }}
                          className={`p-2 rounded hover:bg-white/10 transition-colors ${theme === 'dark' ? 'text-white' : 'text-black'}`}
                          title="Поделиться коллекцией"
                      >
                          <Share2 size={20} />
                      </button>
                  </div>
                  <div className="relative aspect-[3/1] rounded-xl overflow-hidden mb-8 group">
                      <img src={selectedCollection.coverImage} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-6">
                          <h1 className="text-xl md:text-3xl font-pixel text-white mb-2">{selectedCollection.title}</h1>
                          <p className="text-white/80 font-mono text-sm max-w-2xl">{selectedCollection.description}</p>
                          {user?.username === selectedCollection.owner && (
                              <button onClick={() => handleEditCollection(selectedCollection)} className="absolute top-4 right-4 bg-white/20 p-2 rounded hover:bg-white/40 text-white"><Edit2 size={16} /></button>
                          )}
                      </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {colExhibits.map(item => (
                          <ExhibitCard key={item.id} item={item} theme={theme} similarExhibits={[]} onClick={handleExhibitClick} isLiked={item.likedBy?.includes(user?.username || '') || false} isFavorited={false} onLike={(e) => toggleLike(item.id, e)} onFavorite={(e) => toggleFavorite(item.id, e)} onAuthorClick={handleAuthorClick} />
                      ))}
                  </div>
              </div>
          );

      case 'ACTIVITY':
          // FIX: Use extracted ActivityView component to solve React Hook order violation (Error #310)
          return (
              <ActivityView 
                  theme={theme}
                  user={user}
                  notifications={notifications}
                  messages={messages}
                  activityTab={activityTab}
                  setActivityTab={setActivityTab}
                  handleOpenUpdates={handleOpenUpdates}
                  handleAuthorClick={handleAuthorClick}
                  handleOpenChat={handleOpenChat}
              />
          );

      // ... Rest of the cases (EDIT_COLLECTION, SEARCH, etc. - ommited for brevity but implicitly included as they were not changed) ...
      // Ensuring default renders Feed
      default:
      case 'FEED':
         return (
             <FeedView
                theme={theme}
                feedMode={feedMode}
                setFeedMode={setFeedMode}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                exhibits={exhibits}
                collections={collections}
                user={user}
                visibleCount={visibleCount}
                loadMoreRef={loadMoreRef}
                onExhibitClick={handleExhibitClick}
                onLike={toggleLike}
                onFavorite={toggleFavorite}
                onAuthorClick={handleAuthorClick}
                onCollectionClick={handleCollectionClick}
                onShareCollection={handleShareCollection}
                setView={setView}
                updateHash={updateHash}
             />
         );
      // Ensure all other cases are preserved (USER_PROFILE, DIRECT_CHAT etc. - just adding EXHIBIT above fixed the main bug)
      case 'USER_PROFILE': return <UserProfileView user={user!} viewedProfileUsername={viewedProfile || user!.username} exhibits={exhibits} collections={collections} guestbook={guestbook} theme={theme} onBack={handleBack} onLogout={handleLogout} onFollow={handleFollow} onChat={handleOpenChat} onExhibitClick={handleExhibitClick} onLike={toggleLike} onFavorite={toggleFavorite} onAuthorClick={handleAuthorClick} onCollectionClick={handleCollectionClick} onShareCollection={handleShareCollection} onViewHallOfFame={() => { setView('HALL_OF_FAME'); updateHash('/hall-of-fame'); }} onGuestbookPost={handleGuestbookPost} refreshData={refreshData} isEditingProfile={isEditingProfile} setIsEditingProfile={setIsEditingProfile} editTagline={editTagline} setEditTagline={setEditTagline} editStatus={editStatus} setEditStatus={setEditStatus} editTelegram={editTelegram} setEditTelegram={setEditTelegram} onSaveProfile={handleSaveProfile} onProfileImageUpload={handleProfileImageUpload} guestbookInput={guestbookInput} setGuestbookInput={setGuestbookInput} guestbookInputRef={guestbookInputRef} profileTab={profileTab} setProfileTab={setProfileTab} />;
      case 'DIRECT_CHAT': if (!chatPartner) return <div>Error</div>; const conversation = messages.filter(m => (m.sender === user?.username && m.receiver === chatPartner) || (m.sender === chatPartner && m.receiver === user?.username)).sort((a,b) => a.id.localeCompare(b.id)); return (<div className="max-w-2xl mx-auto animate-in fade-in h-[80vh] flex flex-col"><button onClick={() => { setView('ACTIVITY'); updateHash('/activity'); }} className="flex items-center gap-2 mb-4 hover:underline opacity-70 font-pixel text-xs"><ArrowLeft size={16} /> НАЗАД</button><div className={`flex items-center gap-4 p-4 border-b ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}><div className="w-10 h-10 rounded-full bg-gray-500 overflow-hidden"><img src={getUserAvatar(chatPartner)} alt={chatPartner} /></div><div><h2 className="font-pixel text-lg">@{chatPartner}</h2><p className="font-mono text-xs opacity-50">Private Link Encrypted</p></div></div><div className="flex-1 overflow-y-auto p-4 space-y-4">{conversation.length === 0 && <div className="text-center opacity-40 font-mono text-xs py-10">Начало зашифрованного соединения...</div>}{conversation.map(msg => { const isMe = msg.sender === user?.username; return (<div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[70%] p-3 rounded-lg font-mono text-sm ${isMe ? (theme === 'dark' ? 'bg-dark-primary text-black rounded-tr-none' : 'bg-light-accent text-white rounded-tr-none') : (theme === 'dark' ? 'bg-dark-surface text-white rounded-tl-none' : 'bg-white text-black border rounded-tl-none')}`}>{msg.text}<div className={`text-[9px] mt-1 opacity-60 text-right ${isMe ? 'text-black' : 'text-current'}`}>{msg.timestamp}{isMe && <span className="ml-1 opacity-70">{msg.isRead ? '✓✓' : '✓'}</span>}</div></div></div>)})}</div><div className="p-4 border-t border-dashed border-gray-500/30 flex gap-2"><input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Сообщение..." className="flex-1 bg-transparent border rounded p-2 focus:outline-none font-mono text-sm" /><button onClick={handleSendMessage} className={`p-2 rounded ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}><Send size={20} /></button></div></div>);
      case 'AUTH': return <MatrixLogin theme={theme} onLogin={handleLogin} />;
      case 'HALL_OF_FAME': return <HallOfFame theme={theme} achievedIds={user ? getUserAchievements(user.username) : []} onBack={() => { setView('FEED'); updateHash('/feed'); }} />;
      case 'MY_COLLECTION': if (!user) return <div onClick={() => setView('FEED')}>Please Login</div>; return <MyCollection theme={theme} user={user} exhibits={exhibits.filter(e => e.owner === user.username)} collections={collections.filter(c => c.owner === user.username)} onBack={() => { setView('FEED'); updateHash('/feed'); }} onExhibitClick={handleExhibitClick} onCollectionClick={handleCollectionClick} onLike={toggleLike} />;
      case 'SEARCH': return (<div className="max-w-4xl mx-auto animate-in fade-in"><div className={`relative w-full flex items-center border-b-2 px-2 gap-2 mb-4 ${theme === 'dark' ? 'border-dark-primary' : 'border-light-accent'}`}><Search size={20} className="opacity-50" /><input type="text" placeholder="ПОИСК ПО БАЗЕ ДАННЫХ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus className="bg-transparent w-full py-4 focus:outline-none font-pixel text-base md:text-lg tracking-wide" />{searchQuery && <button onClick={() => setSearchQuery('')}><X size={20}/></button>}</div><div className="flex gap-4 mb-8"><button onClick={() => setSearchMode('ARTIFACTS')} className={`pb-1 text-xs md:text-sm font-pixel transition-colors ${searchMode === 'ARTIFACTS' ? (theme === 'dark' ? 'border-b-2 border-dark-primary text-dark-primary' : 'border-b-2 border-light-accent text-light-accent') : 'opacity-50'}`}>[ АРТЕФАКТЫ ]</button><button onClick={() => setSearchMode('COLLECTIONS')} className={`pb-1 text-xs md:text-sm font-pixel transition-colors ${searchMode === 'COLLECTIONS' ? (theme === 'dark' ? 'border-b-2 border-dark-primary text-dark-primary' : 'border-b-2 border-light-accent text-light-accent') : 'opacity-50'}`}>[ КОЛЛЕКЦИИ ]</button></div>{searchMode === 'COLLECTIONS' && (<div className="animate-in fade-in slide-in-from-bottom-2"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{collections.filter(c => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())).map(c => <CollectionCard key={c.id} col={c} theme={theme} onClick={handleCollectionClick} onShare={handleShareCollection} />)}</div>{collections.length === 0 && <div className="text-center opacity-50 font-mono py-10">КОЛЛЕКЦИИ НЕ НАЙДЕНЫ</div>}</div>)}{searchMode === 'ARTIFACTS' && (<div className="animate-in fade-in slide-in-from-bottom-2">{!searchQuery && (<><h3 className="font-pixel text-xs opacity-70 mb-4 flex items-center gap-2"><Grid size={14}/> КАТЕГОРИИ</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">{Object.values(DefaultCategory).map((cat: string) => (<button key={cat} onClick={() => { setSelectedCategory(cat); setView('FEED'); updateHash('/feed'); }} className={`p-4 border rounded hover:scale-105 transition-transform flex flex-col items-center gap-2 justify-center text-center h-20 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}><span className="font-pixel text-[10px] md:text-xs font-bold">{cat}</span></button>))}</div></>)}<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{(searchQuery ? exhibits.filter(ex => !ex.isDraft && (ex.title.toLowerCase().includes(searchQuery.toLowerCase()) || ex.description.toLowerCase().includes(searchQuery.toLowerCase()))) : exhibits.filter(ex => !ex.isDraft).sort((a, b) => calculateArtifactScore(b) - calculateArtifactScore(a)).slice(0, 4)).map((item: Exhibit) => (<ExhibitCard key={item.id} item={item} theme={theme} similarExhibits={[]} onClick={handleExhibitClick} isLiked={item.likedBy?.includes(user?.username || '') || false} isFavorited={false} onLike={(e) => toggleLike(item.id, e)} onFavorite={(e) => toggleFavorite(item.id, e)} onAuthorClick={handleAuthorClick} />))}</div></div>)}</div>);
      case 'EDIT_COLLECTION': if (!collectionToEdit) return <div>Error</div>; return (<div className="max-w-2xl mx-auto animate-in fade-in pb-32"><div className="flex items-center justify-between mb-6"><div className="flex items-center gap-2"><button onClick={handleBack} className="hover:underline font-pixel text-xs"><ArrowLeft size={16}/></button><h2 className="text-lg font-pixel">РЕДАКТОР КОЛЛЕКЦИИ</h2></div><button onClick={handleDeleteCollection} className="text-red-500 p-2 border border-red-500 rounded hover:bg-red-500/10 transition-colors"><Trash2 size={16} /></button></div><div className="space-y-6"><div className="relative w-full aspect-[3/1] bg-gray-800 rounded-lg overflow-hidden border border-dashed border-gray-500 group">{collectionToEdit.coverImage ? (<img src={collectionToEdit.coverImage} className="w-full h-full object-cover" />) : (<div className="flex items-center justify-center w-full h-full text-xs font-mono opacity-50">NO COVER</div>)}<label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"><div className="flex flex-col items-center gap-2 text-white"><Upload size={24} /><span className="font-pixel text-[10px]">CHANGE COVER</span></div><input type="file" accept="image/*" className="hidden" onChange={handleCollectionCoverUpload} /></label></div><div className="space-y-1"><label className="text-[10px] font-pixel uppercase opacity-70">НАЗВАНИЕ * (МИН. 3)</label><input className="w-full bg-transparent border-b p-2 font-pixel text-lg focus:outline-none" value={collectionToEdit.title} onChange={e => setCollectionToEdit({...collectionToEdit, title: e.target.value})} /></div><div className="space-y-1"><label className="text-[10px] font-pixel uppercase opacity-70">ОПИСАНИЕ</label><textarea className="w-full bg-transparent border p-2 font-mono text-sm rounded h-24 focus:outline-none" value={collectionToEdit.description} onChange={e => setCollectionToEdit({...collectionToEdit, description: e.target.value})} /></div><div><label className="text-[10px] font-pixel uppercase opacity-70 block mb-2">СОСТАВ КОЛЛЕКЦИИ</label><div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border p-2 rounded">{exhibits.filter(e => e.owner === user?.username).map(ex => { const isSelected = collectionToEdit.exhibitIds.includes(ex.id); return (<div key={ex.id} onClick={() => { const newIds = isSelected ? collectionToEdit.exhibitIds.filter(id => id !== ex.id) : [...collectionToEdit.exhibitIds, ex.id]; setCollectionToEdit({...collectionToEdit, exhibitIds: newIds}); }} className={`p-2 border rounded cursor-pointer flex items-center gap-2 transition-colors ${isSelected ? (theme === 'dark' ? 'bg-dark-primary text-black border-dark-primary' : 'bg-light-accent text-white border-light-accent') : 'opacity-60 hover:opacity-100'}`}><div className={`w-4 h-4 border flex items-center justify-center ${theme === 'dark' ? 'border-black' : 'border-white'}`}>{isSelected && <Check size={12} strokeWidth={4} />}</div><div className="truncate font-mono text-xs">{ex.title}</div></div>)})}</div></div><button onClick={handleSaveCollection} className="w-full py-4 font-bold font-pixel bg-green-500 text-black uppercase">СОХРАНИТЬ ИЗМЕНЕНИЯ</button></div></div>);
    }
  };

  if (isInitializing) return <div className="h-screen bg-black flex items-center justify-center text-green-500 font-pixel"><RetroLoader size="lg" text="SYSTEM BOOT" /></div>;

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans selection:bg-green-500 selection:text-black ${
      theme === 'dark' ? 'bg-black text-gray-200' : 'bg-gray-100 text-gray-800'
    }`}>
      {/* ... (existing layout) ... */}
      <MatrixRain theme={theme} />
      {theme === 'dark' && <CRTOverlay />}

      {isLoginTransition && <LoginTransition />}

      {showInstallBanner && (
          <InstallBanner 
              theme={theme} 
              onInstall={handleInstallClick} 
              onClose={handleDismissInstall} 
          />
      )}

      {isOffline() && (
          <div className="fixed bottom-4 right-4 z-[100] px-3 py-1 bg-red-500 text-white font-pixel text-[10px] rounded animate-pulse flex items-center gap-2 shadow-lg">
              <WifiOff size={12} /> OFFLINE MODE
          </div>
      )}
      
      {view !== 'AUTH' && (
        <header className={`sticky top-0 z-50 backdrop-blur-md border-b flex flex-col md:flex-row items-center md:justify-between px-4 py-3 md:h-14 ${theme === 'dark' ? 'bg-black/80 border-dark-dim' : 'bg-white/80 border-light-dim'}`}>
            <div className="w-full md:w-auto flex items-center justify-between">
                <div 
                    onClick={() => { setView('FEED'); setFeedMode('ARTIFACTS'); setSelectedCategory('ВСЕ'); updateHash('/feed'); }}
                    className="font-pixel text-lg font-bold cursor-pointer flex items-center gap-2"
                >
                    <Terminal size={20} className={theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'} />
                    <span>NEO_ARCHIVE</span>
                </div>
                
                {/* Mobile Header Actions */}
                <div className="flex md:hidden items-center gap-4">
                    <button onClick={() => { setView('SEARCH'); updateHash('/search'); }} className="opacity-70">
                        <Search size={20} />
                    </button>
                    <button onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} className="opacity-70">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>
            </div>

            {/* Desktop Nav */}
            <div className={`w-full md:w-auto hidden md:flex items-center gap-4 md:mt-0`}>
                <div className="relative w-full md:w-64">
                    <input 
                       value={searchQuery}
                       onChange={(e) => { setSearchQuery(e.target.value); if(view !== 'SEARCH') setView('SEARCH'); }}
                       placeholder="ПОИСК..."
                       className={`w-full bg-transparent border rounded-full px-3 py-1 text-xs font-pixel focus:outline-none transition-all ${
                           theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'
                       }`}
                    />
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"/>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <button 
                        onClick={() => { setView('MY_COLLECTION'); updateHash('/my-collection'); }}
                        className={`p-2 rounded-full transition-transform hover:scale-110 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black'}`}
                        title="Моя Полка"
                    >
                        <Package size={20} />
                    </button>

                    <button 
                        onClick={() => { setView('CREATE_HUB'); updateHash('/create'); }} 
                        className={`p-2 rounded-full transition-transform hover:scale-110 ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}
                        title="Добавить"
                    >
                        <PlusSquare size={20} />
                    </button>
                    
                    <button 
                        onClick={() => { setView('ACTIVITY'); updateHash('/activity'); }} 
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
                        <img src={getUserAvatar(user?.username || 'Guest')} alt="User" />
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
      
      {/* GLOBAL SWIPE CONTAINER */}
      <main 
        className="relative z-10 max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-6"
        {...globalSwipeHandlers}
      >
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
              onResetFeed={handleResetFeed}
              onProfileClick={() => {
                   setViewedProfile(user.username);
                   setView('USER_PROFILE');
                   updateHash(`/profile/${user.username}`);
              }}
          />
      )}

      {view !== 'AUTH' && (
          <footer className="hidden md:block mt-20 py-10 text-center font-mono text-xs opacity-40 border-t border-dashed border-gray-500/30">
              <div className="flex justify-center gap-8 mb-4">
                  <div className="flex flex-col items-center">
                      <span className="font-bold text-lg font-pixel">{systemStats.totalUsers}</span>
                      <span className="text-[10px] uppercase tracking-widest">ПОЛЬЗОВАТЕЛЕЙ</span>
                  </div>
                  <div className="flex flex-col items-center">
                      <span className="font-bold text-lg font-pixel text-green-500 animate-pulse">{systemStats.onlineUsers}</span>
                      <span className="text-[10px] uppercase tracking-widest">ОНЛАЙН</span>
                  </div>
              </div>
              <p>
                  NEO_ARCHIVE SYSTEM v2.5 | POWERED BY <a href="https://t.me/truester1337" target="_blank" rel="noopener noreferrer" className="hover:text-current hover:underline font-bold">TRUESTER</a>
              </p>
          </footer>
      )}
    </div>
  );
}
