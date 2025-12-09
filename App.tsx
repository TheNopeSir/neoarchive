import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  PlusSquare, 
  X,
  Sun,
  Moon,
  ChevronDown,
  Upload,
  LogOut,
  FolderOpen,
  MessageSquare,
  Search,
  Database,
  Trash2,
  Settings,
  Home,
  Activity,
  Zap,
  Sparkles,
  User,
  ArrowLeft,
  Shuffle,
  Trophy,
  Star,
  SlidersHorizontal,
  CheckCircle2,
  Bell,
  MessageCircle,
  PlusCircle,
  Heart,
  FilePlus,
  FolderPlus,
  Grid,
  Flame,
  Layers,
  Share2,
  Award,
  Crown,
  ChevronLeft,
  ChevronRight,
  Camera,
  Edit2,
  Save,
  Check,
  Send,
  Link,
  Smartphone,
  Laptop,
  Video
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
import { fileToBase64 } from './services/storageService';

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

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [view, setView] = useState<ViewState>('AUTH'); // Start at Auth
  const [user, setUser] = useState<UserProfile | null>(null);
  
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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

  // Session tracking for unique views
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

  // Initialize & Global Error Handling
  useEffect(() => {
    window.onerror = (msg, url, lineNo, columnNo, error) => {
      console.error('🔴 [Global Error]:', msg, 'at', lineNo, ':', columnNo, error);
      return false;
    };

    const init = async () => {
        await db.initializeDatabase(); // Ensure DB is loaded first

        // Check Local Storage (Remember Me) OR Session Storage (One time)
        const savedUserStr = localStorage.getItem('neo_user') || sessionStorage.getItem('neo_user');
        
        if (savedUserStr) {
             const savedUser = JSON.parse(savedUserStr);
             console.log("🟢 [App] Restoring session for:", savedUser.username);
             setUser(savedUser);
             setView('FEED');
             refreshData();
        } else {
             setView('AUTH');
        }
    };
    init();
  }, []);

  // Reset pagination when context changes
  useEffect(() => {
      setVisibleCount(12);
  }, [selectedCategory, feedMode, searchQuery, view]);

  // Infinite Scroll Handler
  useEffect(() => {
      if (view !== 'FEED' || feedMode !== 'ARTIFACTS') return;

      const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
              // Simulate retro loading delay
              setTimeout(() => {
                  setVisibleCount(prev => prev + 8);
              }, 800);
          }
      }, { threshold: 0.1 });

      if (loadMoreRef.current) {
          observer.observe(loadMoreRef.current);
      }

      return () => observer.disconnect();
  }, [view, feedMode, visibleCount]); // Re-bind if count changes to ensure fresh ref logic

  const refreshData = () => {
      console.log("🔄 [App] Refreshing data...");
      setExhibits([...db.getExhibits()]);
      setCollections([...db.getCollections()]);
      setNotifications([...db.getNotifications()]);
      setMessages([...db.getMessages()]);
      setGuestbook([...db.getGuestbook()]);
  };

  const handleLogin = (loggedInUser: UserProfile, remember: boolean) => {
      setUser(loggedInUser);
      
      if (remember) {
        localStorage.setItem('neo_user', JSON.stringify(loggedInUser));
        sessionStorage.removeItem('neo_user'); // Clear session if exists
      } else {
        sessionStorage.setItem('neo_user', JSON.stringify(loggedInUser));
        localStorage.removeItem('neo_user'); // Clear local if exists
      }
      
      setView('FEED');
      refreshData();
  };

  const handleLogout = () => {
      console.log("🔴 [App] Logging out");
      localStorage.removeItem('neo_user');
      sessionStorage.removeItem('neo_user');
      setUser(null);
      setView('AUTH');
  };

  const handleShuffle = () => {
      const shuffled = [...exhibits].sort(() => Math.random() - 0.5);
      setExhibits(shuffled);
  };

  const handleExhibitClick = (item: Exhibit) => {
      if (!item) return;
      
      // Handle Unique View Counting
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
  };

  const handleCollectionClick = (col: Collection) => {
      setSelectedCollection(col);
      setView('COLLECTION_DETAIL');
  };

  const handleAuthorClick = (author: string) => {
      setViewedProfile(author);
      setProfileTab('ARTIFACTS'); // Reset to default
      setBadgeIndex(0); // Reset carousel
      setIsEditingProfile(false); // Reset edit state
      setView('USER_PROFILE');
  };

  const handleBack = () => {
      setSelectedExhibit(null);
      setSelectedCollection(null);
      setView('FEED');
      refreshData();
  };

  const handleCreateExhibit = async () => {
     // STRICT VALIDATION
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

     // Content Moderation (Text)
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
         videoUrl: newExhibit.videoUrl, // Save video URL
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

     db.saveExhibit(exhibit);
     setExhibits(db.getExhibits());
     
     // Reset
     setNewExhibit({ 
         category: DefaultCategory.PHONES, 
         specs: generateSpecsForCategory(DefaultCategory.PHONES),
         condition: getDefaultCondition(DefaultCategory.PHONES),
         imageUrls: [],
         videoUrl: ''
     });
     setIsLoading(false);
     setView('FEED');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        // Image Moderation
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
            console.error("Image upload failed", err);
            alert("Ошибка загрузки изображения");
        }
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          // Image Moderation
          const modResult = await moderateImage(file);
          if (!modResult.allowed) {
              alert(`ОШИБКА ФАЙЛА: ${modResult.reason}`);
              return;
          }

          try {
              const base64 = await fileToBase64(file);
              setEditAvatarUrl(base64);
          } catch (err: any) {
              console.error("Profile image upload failed", err);
              alert("Ошибка загрузки изображения");
          }
      }
  };
  
  const handleNewCollectionCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];

          // Image Moderation
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

          // Image Moderation
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
      // STRICT VALIDATION
      if (!newCollection.title || newCollection.title.length < 3) {
          alert('ВВЕДИТЕ КОРРЕКТНОЕ НАЗВАНИЕ КОЛЛЕКЦИИ (МИН. 3 СИМВОЛА)');
          return;
      }
      if (!newCollection.coverImage) {
          alert('ОШИБКА: ЗАГРУЗИТЕ ОБЛОЖКУ КОЛЛЕКЦИИ');
          return;
      }

      setIsLoading(true);

      // Content Moderation
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
      
      // PERSIST TO DB
      db.saveCollection(newCol);
      setCollections(db.getCollections());
      
      setNewCollection({ title: '', description: '', coverImage: '' });
      setIsLoading(false);
      
      // Go directly to edit mode to add items
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

          // Trigger Notification
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

      // Trigger Notification
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
          avatarUrl: editAvatarUrl,
          status: editStatus
      };
      db.updateUserProfile(updatedUser);
      setUser(updatedUser);
      setIsEditingProfile(false);
  };

  const handleGuestbookPost = async () => {
      if (!guestbookInput.trim() || !user || !viewedProfile) return;

      // Moderation
      const modResult = await moderateContent(guestbookInput);
      if(!modResult.allowed) {
          alert(modResult.reason);
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
      setGuestbook([...guestbook, entry]); // Optimistic update
      
      // Trigger Notification
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
          
          // Trigger Notification
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
      if (!user) return;
      alert(`ДОБАВЛЕНО В ИЗБРАННОЕ [ID: ${id}]`);
  };
  
  const handleDeleteExhibit = (id: string) => {
      db.deleteExhibit(id);
      refreshData();
      handleBack();
  };

  // Chat Functionality
  const handleOpenChat = (partnerUsername: string) => {
      if (!user) return;
      setChatPartner(partnerUsername);
      // Mark as read
      db.markMessagesRead(partnerUsername, user.username);
      // Refresh messages locally to reflect read status
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
          // Mandatory checks
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

  // --- Dynamic Achievement Calculation ---
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
          // Chat rendering logic...
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
                          <img src={`https://ui-avatars.com/api/?name=${chatPartner}&background=random`} />
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
          // Search logic...
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

                   {/* Search Mode Toggles */}
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

                   {/* CONTENT: COLLECTIONS */}
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

                   {/* CONTENT: ARTIFACTS */}
                   {searchMode === 'ARTIFACTS' && (
                       <div className="animate-in fade-in slide-in-from-bottom-2">
                           {!searchQuery && (
                               <>
                                   <h3 className="font-pixel text-xs opacity-70 mb-4 flex items-center gap-2">
                                       <Grid size={14}/> КАТЕГОРИИ
                                   </h3>
                                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                                       {Object.values(DefaultCategory).map(cat => (
                                           <button 
                                              key={cat}
                                              onClick={() => {
                                                  setSelectedCategory(cat);
                                                  setView('FEED');
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
                               ).map(item => (
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
                      {/* Cover Image */}
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
                     {/* Cover Upload for new collection */}
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
                         {Object.values(DefaultCategory).map(cat => (
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
                             {Object.values(DefaultCategory).map(cat => (
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
                            <Camera size={24} className="opacity-50" />
                            <span className="text-[8px] font-pixel mt-1 opacity-50">ФОТО</span>
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

                 {/* Video Upload Section */}
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
                              // Unique conversations (group by partner)
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
         // Render user profile...
         return (
             <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-32">
                 {/* ...Profile rendering logic including achievements, follow button, guestbook... */}
                 <button onClick={() => setView('FEED')} className="flex items-center gap-2 mb-4 hover:underline opacity-70 font-pixel text-xs">
                     <ArrowLeft size={16} /> НАЗАД В ЛЕНТУ
                 </button>

                 <div className={`p-6 rounded-lg border-2 border-dashed flex flex-col md:flex-row items-start gap-6 relative ${
                     theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'
                 }`}>
                     {isEditingProfile ? (
                         // EDIT MODE
                         <div className="w-100 space-y-4 w-full">
                             <h3 className="font-pixel text-sm font-bold border-b pb-2">РЕДАКТИРОВАНИЕ ПРОФИЛЯ</h3>
                             <div>
                                 <label className="text-[10px] uppercase font-bold opacity-60">Ссылка на аватар</label>
                                 <div className="flex gap-2">
                                     <input 
                                         value={editAvatarUrl}
                                         onChange={(e) => setEditAvatarUrl(e.target.value)}
                                         className="flex-1 bg-transparent border-b p-2 font-mono text-sm"
                                     />
                                     <label className="p-2 border rounded cursor-pointer hover:bg-white/10">
                                         <Upload size={16} />
                                         <input type="file" className="hidden" accept="image/*" onChange={handleProfileImageUpload} />
                                     </label>
                                 </div>
                             </div>
                             {/* ...Rest of profile edit form... */}
                             <div>
                                 <label className="text-[10px] uppercase font-bold opacity-60">Статус (Слоган)</label>
                                 <input 
                                     value={editTagline}
                                     onChange={(e) => setEditTagline(e.target.value)}
                                     className="w-full bg-transparent border-b p-2 font-mono text-sm"
                                 />
                             </div>
                             <div>
                                 <label className="text-[10px] uppercase font-bold opacity-60">Текущий статус</label>
                                 <div className="flex flex-wrap gap-2 mt-2">
                                     {Object.entries(STATUS_OPTIONS).map(([key, config]) => (
                                         <button
                                             key={key}
                                             onClick={() => setEditStatus(key as UserStatus)}
                                             className={`px-3 py-1 rounded text-xs flex items-center gap-2 border ${
                                                 editStatus === key ? `border-current ${config.color}` : 'opacity-50 border-transparent'
                                             }`}
                                         >
                                             <config.icon size={12} /> {config.label}
                                         </button>
                                     ))}
                                 </div>
                             </div>
                             <div className="flex gap-2 mt-4">
                                 <button onClick={handleSaveProfile} className="bg-green-600 text-white px-4 py-2 rounded font-pixel text-xs flex items-center gap-2"><Save size={14}/> СОХРАНИТЬ</button>
                                 <button onClick={() => setIsEditingProfile(false)} className="bg-gray-600 text-white px-4 py-2 rounded font-pixel text-xs">ОТМЕНА</button>
                             </div>
                         </div>
                     ) : (
                         // VIEW MODE
                         <>
                            {/* ...Profile View... */}
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-current flex-shrink-0">
                                    <img src={viewedProfile === user?.username ? user.avatarUrl : `https://ui-avatars.com/api/?name=${viewedProfile}&background=random`} alt={viewedProfile} className="w-full h-full object-cover"/>
                                </div>
                                {/* Status Indicator */}
                                <div className={`absolute bottom-0 right-0 p-1 rounded-full border-2 ${theme === 'dark' ? 'bg-black border-black' : 'bg-white border-white'} ${STATUS_OPTIONS[viewedProfile === user?.username ? user.status! : 'ONLINE']?.color}`}>
                                    {/* Simplified Icon */}
                                    <User size={16} fill="currentColor" />
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-left overflow-hidden w-full">
                                <div className="flex flex-col md:flex-row items-center justify-between mb-2">
                                    <h2 className="text-xl md:text-2xl font-pixel truncate">@{viewedProfile}</h2>
                                    {viewedProfile === user?.username && (
                                        <div className="flex gap-2">
                                            <button onClick={() => {
                                                setIsEditingProfile(true);
                                                setEditTagline(user?.tagline || '');
                                                setEditAvatarUrl(user?.avatarUrl || '');
                                                setEditStatus(user?.status || 'ONLINE');
                                            }} className="p-2 opacity-50 hover:opacity-100">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => setView('SETTINGS')} className="p-2 opacity-50 hover:opacity-100">
                                                <Settings size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* ... Stats ... */}
                                <p className="opacity-60 font-mono text-xs mb-4 uppercase tracking-wider">{viewedProfile === user?.username ? user?.tagline : "Цифровой Архивариус"}</p>
                                
                                <div className="flex gap-4 justify-center md:justify-start text-xs font-mono font-bold">
                                    <div className="flex flex-col items-center md:items-start">
                                        <span className="text-base font-pixel">{exhibits.filter(e => e.owner === viewedProfile).length}</span>
                                        <span className="opacity-50 font-pixel text-[10px]">АРТЕФАКТОВ</span>
                                    </div>
                                    <div className="flex flex-col items-center md:items-start">
                                        <span className="text-base font-pixel">{exhibits.filter(e => e.owner === viewedProfile).reduce((acc, curr) => acc + curr.likes, 0)}</span>
                                        <span className="opacity-50 font-pixel text-[10px]">РЕПУТАЦИЯ</span>
                                    </div>
                                    <div className="flex flex-col items-center md:items-start">
                                        <span className="text-base font-pixel">{getUserAchievements(viewedProfile || '').length}</span>
                                        <span className="opacity-50 font-pixel text-[10px]">НАГРАДЫ</span>
                                    </div>
                                </div>
                            </div>
                         
                            <div className="flex flex-col gap-2">
                                {viewedProfile !== user?.username && (
                                    <>
                                        <button 
                                            onClick={() => handleFollow(viewedProfile || '')}
                                            className={`w-full px-6 py-2 rounded font-pixel text-xs font-bold uppercase tracking-widest transition-all ${
                                                user?.following.includes(viewedProfile || '') 
                                                ? 'bg-transparent border border-current opacity-60' 
                                                : (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white')
                                            }`}
                                        >
                                            {user?.following.includes(viewedProfile || '') ? 'ОТПИСАТЬСЯ' : 'ПОДПИСАТЬСЯ'}
                                        </button>
                                        <button 
                                            onClick={() => handleOpenChat(viewedProfile || '')}
                                            className="w-full px-6 py-2 rounded font-pixel text-xs font-bold uppercase tracking-widest border border-current hover:bg-white/10"
                                        >
                                            НАПИСАТЬ
                                        </button>
                                    </>
                                )}
                            </div>
                         </>
                     )}
                 </div>

                 {/* Achievements Section - COVER FLOW */}
                 <div className="relative mt-8">
                    {/* ... (Same as before) ... */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-pixel text-xs flex items-center gap-2 opacity-70">
                            <Trophy size={14} /> ЗАЛ СЛАВЫ
                        </h3>
                        <button onClick={() => setView('HALL_OF_FAME')} className="text-[10px] font-pixel hover:underline">ВСЕ НАГРАДЫ</button>
                    </div>
                    
                    {getUserAchievements(viewedProfile || '').length === 0 ? (
                        <div className="text-center w-full py-8 opacity-40 font-mono text-xs border border-dashed rounded">НЕТ ТРОФЕЕВ</div>
                    ) : (
                        <div className="flex items-center justify-center gap-4 py-2 overflow-hidden h-64 relative">
                             <button 
                                onClick={() => setBadgeIndex((p) => (p - 1 + getUserAchievements(viewedProfile || '').length) % getUserAchievements(viewedProfile || '').length)}
                                className="z-20 p-2 rounded-full bg-black/50 hover:bg-black text-white absolute left-0 md:relative"
                             >
                                 <ChevronLeft size={20} />
                             </button>

                             <div className="flex items-center justify-center relative w-64 h-full">
                                {getUserAchievements(viewedProfile || '').map((badgeId, index) => {
                                    const badge = BADGES[badgeId as keyof typeof BADGES] || { label: badgeId, desc: '', color: 'bg-gray-500', icon: 'Star' };
                                    
                                    const length = getUserAchievements(viewedProfile || '').length;
                                    const isCurrent = index === badgeIndex;
                                    const isPrev = index === (badgeIndex - 1 + length) % length;
                                    const isNext = index === (badgeIndex + 1) % length;

                                    let cardStyle = "absolute transition-all duration-500 ease-out flex flex-col items-center ";
                                    
                                    if (isCurrent) {
                                        cardStyle += "z-20 scale-125 opacity-100 translate-x-0 top-10";
                                    } else if (isPrev) {
                                        cardStyle += "z-10 scale-75 opacity-40 -translate-x-24 blur-[1px] cursor-pointer hover:opacity-70 top-12";
                                    } else if (isNext) {
                                        cardStyle += "z-10 scale-75 opacity-40 translate-x-24 blur-[1px] cursor-pointer hover:opacity-70 top-12";
                                    } else {
                                        cardStyle += "z-0 scale-0 opacity-0 pointer-events-none";
                                    }

                                    return (
                                        <div 
                                            key={badgeId} 
                                            className={cardStyle}
                                            onClick={() => {
                                                if(isPrev) setBadgeIndex((badgeIndex - 1 + length) % length);
                                                if(isNext) setBadgeIndex((badgeIndex + 1) % length);
                                            }}
                                        >
                                            <div className={`w-20 h-24 ${badge.color} rounded-t-lg shadow-2xl flex items-center justify-center relative border-b-4 border-black/20 z-10`}>
                                                <Star size={32} className="text-white drop-shadow-md" /> 
                                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-50"></div>
                                            </div>
                                            <div className="w-24 h-4 bg-gray-800 rounded-[50%] shadow-xl translate-y-2 opacity-50 blur-sm"></div>
                                            
                                            <div className={`mt-6 text-center transition-all duration-300 ${isCurrent ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4'}`}>
                                                <div className={`font-pixel text-sm font-bold whitespace-nowrap ${theme === 'dark' ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-black'} drop-shadow-md`}>{badge.label}</div>
                                                <div className={`font-mono text-[10px] mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{badge.desc}</div>
                                            </div>
                                        </div>
                                    )
                                })}
                             </div>

                             <button 
                                onClick={() => setBadgeIndex((p) => (p + 1) % getUserAchievements(viewedProfile || '').length)}
                                className="z-20 p-2 rounded-full bg-black/50 hover:bg-black text-white absolute right-0 md:relative"
                             >
                                 <ChevronRight size={20} />
                             </button>
                        </div>
                    )}
                </div>

                 {/* Tabs: Artifacts vs Collections */}
                 {/* ... (Same as before) ... */}
                 <div className="flex gap-6 border-b border-opacity-30 border-current mb-6 mt-8">
                      <button 
                        onClick={() => setProfileTab('ARTIFACTS')}
                        className={`pb-2 font-pixel text-xs md:text-sm transition-colors ${
                             profileTab === 'ARTIFACTS' 
                             ? (theme === 'dark' ? 'border-b-2 border-dark-primary text-dark-primary' : 'border-b-2 border-light-accent text-light-accent')
                             : 'opacity-50'
                        }`}
                      >
                           АРТЕФАКТЫ ({exhibits.filter(e => e.owner === viewedProfile).length})
                      </button>
                      <button 
                        onClick={() => setProfileTab('COLLECTIONS')}
                        className={`pb-2 font-pixel text-xs md:text-sm transition-colors ${
                             profileTab === 'COLLECTIONS' 
                             ? (theme === 'dark' ? 'border-b-2 border-dark-primary text-dark-primary' : 'border-b-2 border-light-accent text-light-accent')
                             : 'opacity-50'
                        }`}
                      >
                           КОЛЛЕКЦИИ ({collections.filter(c => c.owner === viewedProfile).length})
                      </button>
                 </div>

                 {/* ... Artifacts / Collections Lists ... */}
                 {profileTab === 'ARTIFACTS' && (
                     exhibits.filter(e => e.owner === viewedProfile).length === 0 ? (
                         <div className="text-center py-10 opacity-50 font-mono">АРХИВ ПУСТ</div>
                     ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {exhibits.filter(e => e.owner === viewedProfile).map(ex => (
                                <ExhibitCard 
                                    key={ex.id}
                                    item={ex}
                                    theme={theme}
                                    similarExhibits={[]}
                                    onClick={handleExhibitClick}
                                    isLiked={ex.likedBy?.includes(user?.username || '') || false}
                                    isFavorited={false}
                                    onLike={(e) => toggleLike(ex.id, e)}
                                    onFavorite={(e) => toggleFavorite(ex.id, e)}
                                    onAuthorClick={handleAuthorClick}
                                />
                            ))}
                        </div>
                     )
                 )}

                 {profileTab === 'COLLECTIONS' && (
                     collections.filter(c => c.owner === viewedProfile).length === 0 ? (
                         <div className="text-center py-10 opacity-50 font-mono">НЕТ КОЛЛЕКЦИЙ</div>
                     ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {collections.filter(c => c.owner === viewedProfile).map(renderCollectionCard)}
                         </div>
                     )
                 )}

                 {/* GUESTBOOK SECTION */}
                 <div className="mt-12 border-t pt-8 border-dashed border-gray-500/30">
                     <h3 className="font-pixel text-sm mb-6 flex items-center gap-2">
                        <MessageCircle size={16} /> ГОСТЕВАЯ КНИГА
                     </h3>

                     {/* Input */}
                     <div className="flex gap-2 mb-6">
                         <input 
                            value={guestbookInput}
                            onChange={(e) => setGuestbookInput(e.target.value)}
                            placeholder={viewedProfile === user?.username ? "Напишите статус..." : `Оставьте сообщение для @${viewedProfile}...`}
                            className="flex-1 bg-transparent border-b p-2 font-mono text-sm outline-none focus:border-current"
                         />
                         <button onClick={handleGuestbookPost} className="p-2 border rounded hover:bg-white/10">
                             <Send size={16} />
                         </button>
                     </div>

                     {/* Entries */}
                     <div className="space-y-4">
                         {guestbook.filter(g => g.targetUser === viewedProfile).length === 0 ? (
                             <div className="text-center text-xs opacity-40 font-mono">Здесь пока тихо...</div>
                         ) : (
                             guestbook.filter(g => g.targetUser === viewedProfile).map(entry => (
                                 <div key={entry.id} className="p-3 border rounded text-sm bg-white/5">
                                     <div className="flex justify-between items-baseline mb-1">
                                         <span 
                                            onClick={() => handleAuthorClick(entry.author)}
                                            className="font-bold cursor-pointer hover:underline font-pixel text-xs text-blue-400"
                                         >
                                             @{entry.author}
                                         </span>
                                         <span className="text-[10px] opacity-40 font-mono">{entry.timestamp}</span>
                                     </div>
                                     <p className="font-mono opacity-80 break-words">{entry.text}</p>
                                 </div>
                             ))
                         )}
                     </div>
                 </div>
             </div>
         );

      case 'COLLECTION_DETAIL':
        // Collection Detail Logic...
        if (!selectedCollection) return <div onClick={handleBack}>Error: Missing Data</div>;
        const collectionExhibits = exhibits.filter(ex => selectedCollection.exhibitIds.includes(ex.id));
        const isCollectionOwner = selectedCollection.owner === user?.username;
        return (
            <div className="max-w-4xl mx-auto animate-in fade-in pb-32">
                 {/* ... Header and Content ... */}
                 <button onClick={handleBack} className="flex items-center gap-2 mb-6 hover:underline opacity-70 font-pixel text-xs">
                     <ArrowLeft size={16} /> НАЗАД
                 </button>

                 <div className={`relative aspect-[3/1] w-full rounded-xl overflow-hidden mb-8 border-2 ${
                     theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'
                 }`}>
                     <img src={selectedCollection.coverImage} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/60 flex flex-col justify-end p-8">
                         <div className="font-pixel text-white/70 text-xs mb-2 uppercase tracking-widest flex items-center gap-2">
                             <Layers size={14}/> КОЛЛЕКЦИЯ
                         </div>
                         <h1 className="text-2xl md:text-4xl font-pixel text-white mb-2">{selectedCollection.title}</h1>
                         <p className="text-white/80 font-mono max-w-xl text-sm">{selectedCollection.description}</p>
                     </div>
                 </div>

                 <div className="flex items-center justify-between mb-8 border-b pb-4 border-opacity-30 border-current">
                     <div className="flex items-center gap-3" onClick={() => handleAuthorClick(selectedCollection.owner)}>
                          <div className="w-10 h-10 rounded-full bg-gray-500 overflow-hidden">
                             <img src={`https://ui-avatars.com/api/?name=${selectedCollection.owner}&background=random`} />
                          </div>
                          <div>
                              <div className="font-pixel text-sm">@{selectedCollection.owner}</div>
                              <div className="font-mono text-xs opacity-50">{selectedCollection.timestamp}</div>
                          </div>
                     </div>
                     <div className="flex gap-2">
                         {isCollectionOwner && (
                             <button 
                                onClick={() => handleEditCollection(selectedCollection)}
                                className="px-4 py-2 border rounded font-pixel text-xs uppercase hover:bg-white/10"
                             >
                                 РЕДАКТИРОВАТЬ
                             </button>
                         )}
                         <button className="opacity-60 hover:opacity-100"><Share2/></button>
                     </div>
                 </div>
                 {/* ... Items Grid ... */}
                 <h3 className="font-pixel text-base mb-4 opacity-80">СОДЕРЖИМОЕ ({collectionExhibits.length})</h3>
                 {collectionExhibits.length === 0 ? (
                     <div className="py-10 text-center font-mono opacity-50 border-2 border-dashed rounded">
                         В ЭТОЙ КОЛЛЕКЦИИ ПОКА ПУСТО
                     </div>
                 ) : (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {collectionExhibits.map(ex => (
                                <ExhibitCard 
                                    key={ex.id}
                                    item={ex}
                                    theme={theme}
                                    similarExhibits={[]}
                                    onClick={handleExhibitClick}
                                    isLiked={ex.likedBy?.includes(user?.username || '') || false}
                                    isFavorited={false}
                                    onLike={(e) => toggleLike(ex.id, e)}
                                    onFavorite={(e) => toggleFavorite(ex.id, e)}
                                    onAuthorClick={handleAuthorClick}
                                />
                        ))}
                     </div>
                 )}
            </div>
        );

      case 'SETTINGS':
          // Settings Logic...
          return (
              <div className="max-w-2xl mx-auto p-4 animate-in fade-in pb-32">
                  <h2 className="text-lg md:text-xl font-pixel mb-6 border-b pb-2">НАСТРОЙКИ</h2>
                  <div className={`p-4 rounded border mb-6 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                      <div className="flex items-center justify-between font-pixel text-sm">
                          <span>ТЕМА ИНТЕРФЕЙСА</span>
                          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 border rounded">
                              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                          </button>
                      </div>
                      <div className="mt-4 border-t pt-4">
                        <button onClick={db.resetDatabase} className="text-red-500 font-bold border border-red-500 p-2 rounded w-full flex justify-center gap-2 font-pixel text-sm">
                            <Trash2 size={16}/> СБРОС СИСТЕМЫ
                        </button>
                      </div>
                  </div>
                  <button onClick={handleLogout} className="w-full text-center text-red-500 font-pixel text-sm mt-8 opacity-70 hover:opacity-100">
                       [ВЫХОД ИЗ СИСТЕМЫ]
                  </button>
              </div>
          );

      case 'EXHIBIT':
        // Exhibit Logic...
        if (!selectedExhibit) {
             return (
                 <div className="p-10 text-center border-2 border-red-500">
                     <h2 className="text-red-500 font-pixel text-xl">ERROR: EXHIBIT DATA LOST</h2>
                     <button onClick={() => setView('FEED')} className="mt-4 bg-white text-black px-4 py-2 font-pixel">RETURN TO FEED</button>
                 </div>
             );
        }
        const isSelectedLiked = selectedExhibit.likedBy?.includes(user?.username || 'Guest') || false;

        return (
            <ExhibitDetailPage 
              exhibit={selectedExhibit} 
              theme={theme} 
              onBack={handleBack}
              onShare={(_id: string) => window.alert(`LINK COPIED`)}
              onFavorite={toggleFavorite}
              onLike={toggleLike}
              isFavorited={false}
              isLiked={isSelectedLiked}
              onPostComment={handlePostComment}
              onAuthorClick={handleAuthorClick}
              onFollow={handleFollow}
              onMessage={(username) => handleOpenChat(username)}
              onDelete={handleDeleteExhibit}
              onEdit={(ex: Exhibit) => {}}
              isFollowing={user?.following?.includes(selectedExhibit.owner) || false}
              currentUser={user?.username || ''}
              isAdmin={user?.isAdmin || false}
            />
        );

      case 'FEED':
      default:
        const filteredExhibits = exhibits.filter(ex => {
            const matchesCategory = selectedCategory === 'ВСЕ' || ex.category === selectedCategory;
            return matchesCategory;
        });

        // --- Logic for Feed Ordering (Following vs Recommendations) ---
        const followingList: string[] = user?.following || [];
        const hasFollowing = followingList.length > 0;
        
        // Split logic: If user follows people, show those first, then others.
        let displayExhibits = filteredExhibits;

        // If in "Collections" mode
        if (feedMode === 'COLLECTIONS') {
             return (
                <div className="space-y-6 animate-in fade-in pb-32">
                     {/* Header */}
                     <div className={`sticky top-0 z-40 pt-2 pb-2 backdrop-blur-md ${theme === 'dark' ? 'bg-dark-bg' : 'bg-light-bg'}`}>
                         <div className="flex items-center gap-4 mb-4">
                             <h2 className="text-xl font-pixel">ЛЕНТА КОЛЛЕКЦИЙ</h2>
                             <div className="flex gap-2 ml-auto">
                                 <button onClick={() => setFeedMode('ARTIFACTS')} className="opacity-50 hover:opacity-100 font-pixel text-xs">[АРТЕФАКТЫ]</button>
                                 <button className="font-bold border-b-2 border-current font-pixel text-xs">[КОЛЛЕКЦИИ]</button>
                             </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {collections.map(renderCollectionCard)}
                         </div>
                    </div>
                </div>
             )
        }

        // Artifacts Mode
        return (
          <div className="space-y-6 animate-in fade-in pb-32">
            {/* ... Feed Header ... */}
            <div className={`sticky top-0 z-40 pt-2 pb-2 border-b border-dashed border-gray-500/30 ${theme === 'dark' ? 'bg-dark-bg' : 'bg-light-bg'}`}>
               
               <div className="flex flex-col gap-2 my-1">
                   {/* Mobile Optimized Header Layout */}
                   <div className="flex items-center gap-2">
                       <div className={`relative flex-1 flex items-center border-b-2 px-2 gap-2 ${
                           theme === 'dark' ? 'border-dark-primary' : 'border-light-accent'
                       }`}>
                           <Search size={14} className="opacity-50" />
                           <input 
                             type="text"
                             placeholder="ПОИСК..."
                             onClick={() => setView('SEARCH')} 
                             readOnly
                             className="bg-transparent w-full py-1.5 focus:outline-none font-pixel text-[10px] tracking-wide cursor-pointer"
                           />
                           
                           <div className={`h-4 w-px mx-1 ${theme === 'dark' ? 'bg-dark-dim' : 'bg-light-dim'}`}></div>

                           <button 
                             onClick={() => setIsFilterOpen(!isFilterOpen)}
                             className="flex items-center gap-1 opacity-70 hover:opacity-100 font-pixel text-[10px] uppercase"
                           >
                               <SlidersHorizontal size={12} /> <span className="whitespace-nowrap max-w-[100px] truncate">{selectedCategory === 'ВСЕ' ? 'ФИЛЬТР' : selectedCategory}</span>
                           </button>
                       </div>
                   </div>

                   {/* Toggle Feed Mode */}
                   <div className="flex justify-between items-center text-[10px] font-pixel uppercase tracking-widest px-1">
                        <div className="flex gap-4">
                            <button className="font-bold border-b-2 border-current">АРТЕФАКТЫ</button>
                            <button onClick={() => setFeedMode('COLLECTIONS')} className="opacity-50 hover:opacity-100">КОЛЛЕКЦИИ</button>
                        </div>
                   </div>
               </div>

               {/* Expanded Filters */}
               {isFilterOpen && (
                   <div className="flex flex-wrap gap-2 py-2 animate-in slide-in-from-top-2">
                       <button 
                           onClick={() => setSelectedCategory('ВСЕ')}
                           className={`px-3 py-1 text-[10px] font-pixel border rounded ${selectedCategory === 'ВСЕ' ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') : 'opacity-50'}`}
                       >
                           ВСЕ
                       </button>
                       {Object.values(DefaultCategory).map(cat => (
                           <button 
                               key={cat}
                               onClick={() => setSelectedCategory(cat)}
                               className={`px-3 py-1 text-[10px] font-pixel border rounded ${selectedCategory === cat ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') : 'opacity-50'}`}
                           >
                               {cat}
                           </button>
                       ))}
                   </div>
               )}
            </div>
            
            {/* GRID */}
            {displayExhibits.length === 0 ? (
                <div className="text-center py-20 font-mono opacity-50 border-2 border-dashed rounded">
                    НЕТ ДАННЫХ В ЭТОМ СЕКТОРЕ
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {displayExhibits.slice(0, visibleCount).map(item => (
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
            )}
            
            {/* Load More Trigger (Conditional) */}
            {displayExhibits.length > visibleCount && (
                <div ref={loadMoreRef} className="py-8 flex justify-center opacity-50">
                    <RetroLoader text="ЗАГРУЗКА ДАННЫХ..." />
                </div>
            )}
          </div>
        );
    }
  };

  const MobileNav = () => (
      <div className={`md:hidden fixed bottom-0 left-0 w-full border-t z-50 px-6 py-3 flex justify-between items-center ${
          theme === 'dark' ? 'bg-black/90 border-dark-dim text-gray-400' : 'bg-white/90 border-light-dim text-gray-600'
      }`}>
          <button onClick={() => setView('FEED')} className={`flex flex-col items-center gap-1 ${view === 'FEED' ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') : ''}`}>
              <Home size={20} />
          </button>
          <button onClick={() => setView('SEARCH')} className={`flex flex-col items-center gap-1 ${view === 'SEARCH' ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') : ''}`}>
              <Search size={20} />
          </button>
          <button onClick={() => setView('CREATE_HUB')} className={`flex flex-col items-center gap-1 -translate-y-4 p-3 rounded-full border-2 shadow-lg ${
              theme === 'dark' ? 'bg-black border-dark-primary text-dark-primary' : 'bg-white border-light-accent text-light-accent'
          }`}>
              <PlusSquare size={24} />
          </button>
          <button onClick={() => setView('ACTIVITY')} className={`relative flex flex-col items-center gap-1 ${view === 'ACTIVITY' ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') : ''}`}>
              <Activity size={20} />
              {notifications.some(n => n.recipient === user?.username && !n.isRead) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
          </button>
          <button onClick={() => {
              setView('USER_PROFILE');
              setViewedProfile(user?.username || null);
              setProfileTab('ARTIFACTS');
          }} className={`flex flex-col items-center gap-1 ${view === 'USER_PROFILE' && viewedProfile === user?.username ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') : ''}`}>
              <User size={20} />
          </button>
      </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans selection:bg-green-500 selection:text-black ${
        theme === 'dark' ? 'bg-dark-bg text-gray-200' : 'bg-light-bg text-gray-800'
    }`}>
      <MatrixRain theme={theme} />
      <CRTOverlay />

      {/* Main Container */}
      <main className="container mx-auto p-4 md:p-6 pb-24 relative z-10 min-h-screen flex flex-col">
          {/* Header for Desktop */}
          <header className="hidden md:flex justify-between items-center mb-8 border-b border-dashed border-gray-500/30 pb-4">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('FEED')}>
                  <Terminal size={24} className={theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'}/>
                  <span className="font-pixel text-lg font-bold">NEO_ARCHIVE_V2</span>
              </div>
              
              {user && (
                  <div className="flex items-center gap-6">
                      <nav className="flex gap-4 font-pixel text-xs">
                          <button onClick={() => setView('FEED')} className={`hover:text-green-500 ${view === 'FEED' ? 'underline' : ''}`}>[ЛЕНТА]</button>
                          <button onClick={() => setView('CREATE_HUB')} className={`hover:text-green-500 ${view.includes('CREATE') ? 'underline' : ''}`}>[ЗАГРУЗИТЬ]</button>
                          <button onClick={() => setView('ACTIVITY')} className={`hover:text-green-500 flex items-center gap-1 ${view === 'ACTIVITY' ? 'underline' : ''}`}>
                              [АКТИВНОСТЬ] 
                              {notifications.some(n => n.recipient === user?.username && !n.isRead) && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                          </button>
                          <button onClick={() => {
                                setView('USER_PROFILE'); 
                                setViewedProfile(user.username);
                          }} className={`hover:text-green-500 ${view === 'USER_PROFILE' && viewedProfile === user.username ? 'underline' : ''}`}>[ПРОФИЛЬ]</button>
                      </nav>
                      <div className="flex items-center gap-3 pl-6 border-l border-gray-500/30">
                          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="opacity-50 hover:opacity-100">
                              {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
                          </button>
                          <button onClick={handleLogout} className="opacity-50 hover:opacity-100 hover:text-red-500"><LogOut size={18}/></button>
                      </div>
                  </div>
              )}
          </header>

          {/* Conditional Hero (Only show on Feed) */}
          {view === 'FEED' && <HeroSection theme={theme} user={user} />}

          {/* Dynamic Content */}
          <div className="flex-1">
             {renderContentArea()}
          </div>
      </main>

      {/* Mobile Navigation */}
      {user && view !== 'AUTH' && <MobileNav />}
    </div>
  );
}