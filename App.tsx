
import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  PlusSquare, 
  Heart, 
  User, 
  Radio, 
  X,
  Sun,
  Moon,
  ChevronDown,
  Plus,
  Minus,
  Upload,
  Video,
  LogOut,
  FolderOpen,
  Bell,
  Users,
  CheckCircle,
  FolderPlus,
  Home,
  MessageSquare,
  Search,
  Mail,
  Send,
  Database,
  ShieldAlert,
  Trash2,
  Image as ImageIcon,
  UserPlus,
  Settings,
  Download,
  FileJson,
  ArrowUp,
  ArrowDown,
  RefreshCw, // Safe icon
  RotateCcw,  // Safe icon
  BookOpen // For Guestbook
} from 'lucide-react';
import MatrixRain from './components/MatrixRain';
import CRTOverlay from './components/CRTOverlay';
import ExhibitCard from './components/ExhibitCard';
import RetroLoader from './components/RetroLoader';
import AuthForm from './components/AuthForm';
import ExhibitDetailPage from './components/ExhibitDetailPage';
import { DefaultCategory, Exhibit, ViewState, Comment, UserProfile, Collection, Notification, Message, GuestbookEntry } from './types';
import { CATEGORY_SPECS_TEMPLATES } from './constants';
import { moderateContent } from './services/geminiService';
import * as db from './services/storageService';

const POPULAR_CATEGORIES = [DefaultCategory.PHONES, DefaultCategory.GAMES, DefaultCategory.MAGAZINES, DefaultCategory.MUSIC];
const OTHER_CATEGORIES = Object.values(DefaultCategory).filter(c => !POPULAR_CATEGORIES.includes(c));

interface CategoryButtonProps {
  label: string;
  isActive: boolean;
  theme: 'dark' | 'light';
  onClick: () => void;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ label, isActive, theme, onClick }) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-1.5 text-xs border rounded transition-colors uppercase font-bold whitespace-nowrap
      ${isActive 
        ? (theme === 'dark' ? 'bg-dark-dim text-white border-dark-primary' : 'bg-light-primary text-white border-light-primary')
        : (theme === 'dark' ? 'border-dark-dim text-dark-dim hover:border-dark-primary hover:text-white' : 'border-light-dim text-light-dim hover:border-light-primary hover:text-black')}
    `}
  >
    {label}
  </button>
);

const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [view, setView] = useState<ViewState>('AUTH'); 
  const [isLoading, setIsLoading] = useState(true);
  const [isModerating, setIsModerating] = useState(false); 
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]); 
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  // Removed local likedExhibits Set, using derived state
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'DATE_DESC' | 'DATE_ASC' | 'POPULAR' | 'RATING'>('DATE_DESC');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [activeFeedTab, setActiveFeedTab] = useState<'GLOBAL' | 'SUBS'>('GLOBAL');
  const [activeProfileTab, setActiveProfileTab] = useState<'OWN' | 'LIKED'>('OWN');
  const [activeCommsTab, setActiveCommsTab] = useState<'NOTIFICATIONS' | 'MESSAGES'>('NOTIFICATIONS');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null); 
  const [messageInput, setMessageInput] = useState('');
  const [guestbookInput, setGuestbookInput] = useState('');
  const [viewedProfile, setViewedProfile] = useState<string | null>(null);
  const [settingsAvatar, setSettingsAvatar] = useState('');
  const [settingsTagline, setSettingsTagline] = useState('');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [selectedExhibitId, setSelectedExhibitId] = useState<string | null>(null);
  const [editingExhibitId, setEditingExhibitId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>(DefaultCategory.PHONES);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemRating, setNewItemRating] = useState(3);
  const [newItemQuality, setNewItemQuality] = useState('');
  const [newItemSpecs, setNewItemSpecs] = useState<{key: string, value: string}[]>(
      CATEGORY_SPECS_TEMPLATES[DefaultCategory.PHONES] 
        ? CATEGORY_SPECS_TEMPLATES[DefaultCategory.PHONES].map(k => ({ key: k, value: '' })) 
        : [{ key: '', value: '' }]
  );
  const [newImages, setNewImages] = useState<string[]>([]);
  const [imageInputMethod, setImageInputMethod] = useState<'UPLOAD' | 'URL'>('UPLOAD');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOtherMenuOpen, setIsOtherMenuOpen] = useState(false);

  const isAdmin = currentUser?.username === 'truester';

  const refreshData = async () => {
      setIsLoading(true);
      await db.initializeDatabase();
      setExhibits([...db.getExhibits()]); 
      setCollections([...db.getCollections()]);
      setNotifications([...db.getNotifications()]);
      setMessages([...db.getMessages()]);
      setGuestbook([...db.getGuestbook()]);
      setIsLoading(false);
      setToastMessage("ДАННЫЕ ОБНОВЛЕНЫ");
  };

  const handleResetToDemo = async () => {
      if(window.confirm("ЭТО УДАЛИТ ВСЕ ТЕКУЩИЕ ДАННЫЕ И ЗАГРУЗИТ DEMO. ПРОДОЛЖИТЬ?")) {
          setIsLoading(true);
          await db.resetDatabase();
      }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        await db.initializeDatabase();
        
        const loadedExhibits = db.getExhibits() || [];
        setExhibits([...loadedExhibits]);
        setCollections([...(db.getCollections() || [])]);
        setNotifications([...(db.getNotifications() || [])]);
        setMessages([...(db.getMessages() || [])]);
        setGuestbook([...(db.getGuestbook() || [])]);

        const savedUser = localStorage.getItem('neo_user');
        if (savedUser) {
            try {
              setCurrentUser(JSON.parse(savedUser));
              setView('FEED');
            } catch (e) {
              console.error("User parse error", e);
            }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setTimeout(() => setIsLoading(false), 1000);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    if (view === 'SETTINGS' && currentUser) {
        setSettingsAvatar(currentUser.avatarUrl || '');
        setSettingsTagline(currentUser.tagline || '');
        setSettingsPassword(currentUser.password || '');
    }
  }, [view, currentUser]);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('neo_user', JSON.stringify(user));
    setView('FEED');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('neo_user');
    setView('AUTH');
  };

  const handleFollow = (targetUser: string) => {
      if (!currentUser) return;
      const isFollowing = currentUser.following.includes(targetUser);
      let updatedFollowing;
      
      if (isFollowing) {
          updatedFollowing = currentUser.following.filter(u => u !== targetUser);
          setToastMessage(`ВЫ ОТПИСАЛИСЬ ОТ ${targetUser}`);
      } else {
          updatedFollowing = [...currentUser.following, targetUser];
          setToastMessage(`ПОДПИСКА НА ${targetUser} ОФОРМЛЕНА`);
      }
      
      const updatedUser = { ...currentUser, following: updatedFollowing };
      setCurrentUser(updatedUser);
      localStorage.setItem('neo_user', JSON.stringify(updatedUser));
      db.updateUserProfile(updatedUser);
  };

  const filteredExhibits = exhibits.filter(e => {
    if (!e) return false;
    const title = e.title || '';
    const desc = e.description || '';
    const owner = e.owner || '';
    const category = e.category || 'MISC';

    const matchCat = selectedCategory === 'ALL' || category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || title.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || owner.toLowerCase().includes(q);

    if (view === 'FEED') {
        if (activeFeedTab === 'SUBS') {
            return matchCat && matchSearch && currentUser?.following.includes(owner);
        }
        return matchCat && matchSearch;
    }

    if (view === 'PROFILE') {
        if (activeProfileTab === 'LIKED') return (e.likedBy?.includes(currentUser?.username || '') || favorites.has(e.id)) && matchSearch;
        return (viewedProfile ? owner === viewedProfile : true) && matchSearch;
    }
    
    const matchCollection = view === 'COLLECTION_DETAIL' 
        ? collections.find(c => c.id === selectedCollectionId)?.exhibitIds.includes(e.id)
        : true;

    return matchCat && matchSearch && matchCollection;
  }).sort((a, b) => {
      if (!a || !b) return 0;
      if (sortOption === 'POPULAR') return (b.likes || 0) - (a.likes || 0);
      if (sortOption === 'RATING') return (b.rating || 0) - (a.rating || 0);
      
      const parseDate = (str: string) => {
          if (!str) return 0;
          try {
            if (str.includes('.')) {
                const parts = str.split(' ')[0].split('.');
                if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
            }
            return new Date(str).getTime();
          } catch (e) { return 0; }
      };
      
      const dateA = parseDate(a.timestamp);
      const dateB = parseDate(b.timestamp);

      if (sortOption === 'DATE_ASC') return dateA - dateB;
      return dateB - dateA;
  });

  const toggleFavorite = (id: string) => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavorites(next);
  };

  // CORRECTED: Single like per user logic
  const handleLike = (id: string) => {
    if (!currentUser) return;
    const list = db.getExhibits();
    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) {
        const item = list[idx];
        const likedBy = item.likedBy || [];
        
        if (likedBy.includes(currentUser.username)) {
            // Unlike
            item.likedBy = likedBy.filter(u => u !== currentUser.username);
            item.likes = Math.max(0, item.likes - 1);
        } else {
            // Like
            item.likedBy = [...likedBy, currentUser.username];
            item.likes = item.likes + 1;
        }
        
        db.updateExhibit(item);
        setExhibits([...db.getExhibits()]);
    }
  };

  const handleShare = (id: string) => {
    const fakeUrl = `https://neoarchive.ru/item/${id}`;
    navigator.clipboard.writeText(fakeUrl);
    setToastMessage("ССЫЛКА СКОПИРОВАНА В БУФЕР");
  };

  const handleProfileClick = (username: string) => {
      setViewedProfile(username);
      setActiveProfileTab('OWN');
      setView('PROFILE');
      window.scrollTo(0, 0);
  };

  // CORRECTED: Count view only once per session
  const handleExhibitClick = (item: Exhibit) => {
    const viewKey = `neo_viewed_${item.id}`;
    const alreadyViewed = sessionStorage.getItem(viewKey);

    if (!alreadyViewed) {
        const list = db.getExhibits();
        const idx = list.findIndex(e => e.id === item.id);
        if (idx !== -1) {
            list[idx].views = (list[idx].views || 0) + 1;
            db.updateExhibit(list[idx]);
            setExhibits([...db.getExhibits()]);
        }
        sessionStorage.setItem(viewKey, 'true');
    }
    
    setSelectedExhibitId(item.id);
    setView('EXHIBIT');
    window.scrollTo(0, 0);
  };

  const handleDeleteExhibit = (id: string) => {
      db.deleteExhibit(id);
      setExhibits([...db.getExhibits()]);
      setView('FEED');
      setToastMessage("ОБЪЕКТ УДАЛЕН ИЗ БАЗЫ ДАННЫХ");
  };

  const handleEditExhibit = (item: Exhibit) => {
      setEditingExhibitId(item.id);
      setNewItemTitle(item.title);
      setNewItemDesc(item.description);
      setNewItemCategory(item.category);
      setNewItemRating(item.rating);
      setNewItemQuality(item.quality);
      setNewImages(item.imageUrls || []);
      setVideoUrl(item.videoUrl || '');
      setNewItemSpecs(item.specs ? Object.entries(item.specs).map(([key, value]) => ({ key, value })) : []);
      setView('CREATE');
  };

  const handlePostComment = async (id: string, text: string) => {
    if (!text.trim() || !currentUser || isModerating) return;
    setIsModerating(true);
    const moderation = await moderateContent(text);
    if (!moderation.allowed) {
        setIsModerating(false);
        setToastMessage(`ОШИБКА: ${moderation.reason || 'НЕДОПУСТИМЫЙ КОНТЕНТ'}`);
        return;
    }
    const newComment: Comment = {
        id: Date.now().toString(),
        author: currentUser.username,
        text: text,
        timestamp: new Date().toLocaleString('ru-RU')
    };
    const list = db.getExhibits();
    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) {
        list[idx].comments = [...(list[idx].comments || []), newComment];
        db.updateExhibit(list[idx]);
        setExhibits([...db.getExhibits()]);
    }
    setIsModerating(false);
    setToastMessage("КОММЕНТАРИЙ ОПУБЛИКОВАН");
  };

  const handleSendMessage = async () => {
      if (!messageInput.trim() || !selectedConversation || !currentUser || isModerating) return;
      setIsModerating(true);
      const moderation = await moderateContent(messageInput);
      if (!moderation.allowed) {
          setIsModerating(false);
          setToastMessage(`ОШИБКА: ${moderation.reason || 'НЕДОПУСТИМЫЙ КОНТЕНТ'}`);
          return;
      }
      const newMessage: Message = {
          id: Date.now().toString(),
          sender: currentUser.username,
          receiver: selectedConversation,
          text: messageInput,
          timestamp: 'Только что',
          isRead: false
      };
      db.saveMessage(newMessage);
      setMessages([...db.getMessages()]);
      setMessageInput('');
      setIsModerating(false);
  };

  const openChat = (username: string) => {
      setSelectedConversation(username);
      setActiveCommsTab('MESSAGES');
      setView('COMMS');
  }

  const handleCategoryChange = (cat: string) => {
      setNewItemCategory(cat);
      if (CATEGORY_SPECS_TEMPLATES[cat]) {
          const newSpecs = CATEGORY_SPECS_TEMPLATES[cat].map(k => ({ key: k, value: '' }));
          setNewItemSpecs(newSpecs);
      }
  };

  const handleSaveExhibit = async () => {
    if (!newItemTitle || !newItemDesc || !currentUser || isModerating) return;
    setIsModerating(true);
    const moderationTitle = await moderateContent(newItemTitle);
    if (!moderationTitle.allowed) {
        setIsModerating(false);
        setToastMessage(`ОШИБКА В ЗАГОЛОВКЕ: ${moderationTitle.reason}`);
        return;
    }
    const moderationDesc = await moderateContent(newItemDesc);
    if (!moderationDesc.allowed) {
        setIsModerating(false);
        setToastMessage(`ОШИБКА В ОПИСАНИИ: ${moderationDesc.reason}`);
        return;
    }
    const finalImages = newImages.length > 0 ? newImages : [`https://picsum.photos/400/300?random=${Date.now()}`];
    const specsObj: Record<string, string> = {};
    newItemSpecs.forEach(s => { if (s.key.trim() && s.value.trim()) { specsObj[s.key.trim()] = s.value.trim(); } });

    if (editingExhibitId) {
        const existing = exhibits.find(e => e.id === editingExhibitId);
        if (existing) {
            const updated: Exhibit = {
                ...existing,
                title: newItemTitle,
                description: newItemDesc,
                imageUrls: finalImages,
                videoUrl: videoUrl.trim() || undefined,
                category: newItemCategory,
                rating: newItemRating,
                quality: newItemQuality || 'Не указано',
                specs: specsObj
            };
            db.updateExhibit(updated);
            setExhibits([...db.getExhibits()]);
            setToastMessage("ДАННЫЕ ОБНОВЛЕНЫ");
        }
    } else {
        const newExhibit: Exhibit = {
          id: Date.now().toString(),
          title: newItemTitle,
          description: newItemDesc,
          imageUrls: finalImages,
          videoUrl: videoUrl.trim() || undefined,
          category: newItemCategory,
          owner: currentUser.username,
          timestamp: new Date().toLocaleString('ru-RU'),
          likes: 0,
          likedBy: [],
          views: 0,
          rating: newItemRating,
          quality: newItemQuality || 'Не указано',
          specs: specsObj,
          comments: []
        };
        db.saveExhibit(newExhibit);
        setExhibits([...db.getExhibits()]);
        setToastMessage("АРТЕФАКТ ДОБАВЛЕН В АРХИВ");
    }
    setEditingExhibitId(null);
    setNewItemTitle(''); setNewItemDesc(''); setNewItemRating(3); setNewItemQuality('');
    setNewImages([]); setVideoUrl(''); setNewItemCategory(DefaultCategory.PHONES);
    setNewItemSpecs(CATEGORY_SPECS_TEMPLATES[DefaultCategory.PHONES].map(k => ({ key: k, value: '' })));
    setIsModerating(false);
    setView('FEED');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const filesArray = Array.from(e.target.files);
          const promises = filesArray.map((file) => db.fileToBase64(file as File));
          try {
              const base64Urls = await Promise.all(promises);
              setNewImages(prev => [...prev, ...base64Urls]);
          } catch (error) {
              setToastMessage("ОШИБКА ЗАГРУЗКИ ФАЙЛА");
          }
      }
  };
  
  const handleUrlAdd = () => { if(imageUrlInput.trim()) { setNewImages(prev => [...prev, imageUrlInput.trim()]); setImageUrlInput(''); } };
  const handleRemoveImage = (index: number) => { setNewImages(prev => prev.filter((_, i) => i !== index)); };
  const handleSpecChange = (index: number, field: 'key' | 'value', text: string) => { const newSpecs = [...newItemSpecs]; newSpecs[index][field] = text; setNewItemSpecs(newSpecs); };
  const handleAddSpec = () => setNewItemSpecs([...newItemSpecs, { key: '', value: '' }]);
  const handleRemoveSpec = (index: number) => { const n = [...newItemSpecs]; n.splice(index, 1); setNewItemSpecs(n); };

  const handleSaveSettings = () => {
      if (!currentUser) return;
      const updatedUser: UserProfile = {
          ...currentUser,
          avatarUrl: settingsAvatar,
          tagline: settingsTagline,
          password: settingsPassword
      };
      db.updateUserProfile(updatedUser);
      setCurrentUser(updatedUser);
      setToastMessage("ПРОФИЛЬ ОБНОВЛЕН");
  };

  const handleExportData = () => {
      const data = db.getFullDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neo_archive_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToastMessage("РЕЗЕРВНАЯ КОПИЯ СОХРАНЕНА");
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!window.confirm("ВНИМАНИЕ: ЭТО ДЕЙСТВИЕ ПЕРЕЗАПИШЕТ ВСЕ ТЕКУЩИЕ ДАННЫЕ. ПРОДОЛЖИТЬ?")) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const success = db.restoreDatabase(event.target?.result as string);
          if (success) {
              alert("ДАННЫЕ ВОССТАНОВЛЕНЫ. ПЕРЕЗАГРУЗКА СИСТЕМЫ...");
              window.location.reload();
          } else {
              setToastMessage("ОШИБКА: НЕКОРРЕКТНЫЙ ФАЙЛ");
          }
      };
      reader.readAsText(file);
  };

  // --- GUESTBOOK HANDLER ---
  const handleSignGuestbook = async () => {
      if (!guestbookInput.trim() || !currentUser || !viewedProfile || isModerating) return;
      setIsModerating(true);
      const moderation = await moderateContent(guestbookInput);
      if (!moderation.allowed) {
          setIsModerating(false);
          setToastMessage(`ОШИБКА: ${moderation.reason}`);
          return;
      }
      
      const newEntry: GuestbookEntry = {
          id: Date.now().toString(),
          author: currentUser.username,
          targetUser: viewedProfile,
          text: guestbookInput,
          timestamp: new Date().toLocaleString('ru-RU')
      };
      
      db.saveGuestbookEntry(newEntry);
      setGuestbook([...db.getGuestbook()]);
      setGuestbookInput('');
      setIsModerating(false);
      setToastMessage("ЗАПИСЬ ДОБАВЛЕНА");
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen font-mono relative flex items-center justify-center ${
        theme === 'dark' ? 'bg-dark-bg text-dark-primary' : 'bg-light-bg text-light-primary'
      }`}>
        <MatrixRain theme={theme} />
        {theme === 'dark' && <CRTOverlay />}
        <RetroLoader size="lg" text="ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ" />
      </div>
    );
  }

  if (view === 'AUTH' || !currentUser) {
    return (
      <div className={`min-h-screen font-mono transition-colors duration-300 relative ${theme === 'dark' ? 'bg-dark-bg text-dark-primary' : 'bg-light-bg text-light-primary'}`}>
         <MatrixRain theme={theme} />
         {theme === 'dark' && <CRTOverlay />}
         <AuthForm theme={theme} onLogin={handleLogin} />
      </div>
    );
  }

  // --- RENDER ---
  return (
    <div className={`min-h-screen font-mono transition-colors duration-300 relative ${
      theme === 'dark' 
        ? 'bg-dark-bg text-dark-primary selection:bg-dark-primary selection:text-black' 
        : 'bg-light-bg text-light-primary selection:bg-light-accent selection:text-white'
    }`}>
      
      <MatrixRain theme={theme} />
      {theme === 'dark' && <CRTOverlay />}

      {isModerating && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-wait">
            <div className={`border p-6 rounded shadow-2xl flex flex-col items-center gap-4 ${theme === 'dark' ? 'bg-dark-surface border-dark-primary' : 'bg-white border-light-accent'}`}>
                <RetroLoader />
                <span className="font-bold animate-pulse uppercase tracking-widest">Анализ контента...</span>
            </div>
        </div>
      )}

      {toastMessage && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 border-2 rounded shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-4 ${
          theme === 'dark' ? 'bg-dark-surface border-dark-primary text-dark-primary' : 'bg-white border-light-accent text-light-accent'
        }`}>
           <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
             <Terminal size={14} />
             {toastMessage}
           </div>
        </div>
      )}

      <div className={`relative z-10 w-full max-w-7xl mx-auto min-h-screen flex flex-col transition-all shadow-xl pb-20 md:pb-0 ${
         theme === 'dark' ? 'bg-black/80 shadow-dark-primary/10' : 'bg-white/90 shadow-gray-400/20'
      }`}>
        
        {/* DESKTOP HEADER */}
        {view !== 'EXHIBIT' && (
        <header className={`hidden md:flex sticky top-0 z-30 backdrop-blur-md border-b-2 px-6 py-4 items-center justify-between gap-4 transition-colors ${
           theme === 'dark' ? 'bg-dark-bg/90 border-dark-dim' : 'bg-light-surface/90 border-light-dim'
        }`}>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-pixel tracking-tighter flex items-center gap-2 cursor-pointer" onClick={() => setView('FEED')}>
              <Terminal size={24} />
              NEO_ARCHIVE
            </h1>
            <nav className="flex gap-2 ml-8">
               {[
                 { id: 'FEED', icon: Home, label: 'ЛЕНТА' },
                 { id: 'COLLECTIONS', icon: FolderOpen, label: 'СБОРНИКИ' },
                 { id: 'CREATE', icon: PlusSquare, label: 'СОЗДАТЬ' },
                 { id: 'COMMS', icon: Bell, label: 'СВЯЗЬ' },
                 { id: 'PROFILE', icon: User, label: 'ПРОФИЛЬ' },
               ].map((tab) => (
                 <button
                   key={tab.id}
                   onClick={() => {
                       setView(tab.id as ViewState);
                       if (tab.id === 'PROFILE') { setViewedProfile(currentUser.username); setActiveProfileTab('OWN'); }
                       if (tab.id === 'FEED') setActiveFeedTab('GLOBAL');
                       if (tab.id === 'CREATE') { setEditingExhibitId(null); }
                   }}
                   className={`
                     flex items-center gap-2 px-3 py-1.5 border rounded transition-all whitespace-nowrap text-xs font-bold
                     ${view === tab.id 
                       ? (theme === 'dark' ? 'bg-dark-primary text-black border-dark-primary' : 'bg-light-accent text-white border-light-accent')
                       : (theme === 'dark' ? 'border-dark-dim text-dark-dim hover:text-dark-primary hover:border-dark-primary' : 'border-light-dim text-light-dim hover:text-light-primary hover:border-light-primary')}
                   `}
                 >
                   <tab.icon size={14} />
                   <span>{tab.label}</span>
                 </button>
               ))}
               
               {isAdmin && (
                   <button 
                    onClick={() => setView('ADMIN')}
                    className="flex items-center gap-2 px-3 py-1.5 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all text-xs font-bold ml-4"
                   >
                       <ShieldAlert size={14} /> ADMIN
                   </button>
               )}
             </nav>
          </div>
          
          <div className="flex gap-2 items-center pl-4 border-l border-gray-500/20">
            <button 
                onClick={() => setView('SETTINGS')}
                className={`p-2 rounded border transition-all ${theme === 'dark' ? 'border-dark-dim hover:bg-dark-dim' : 'border-light-dim hover:bg-light-dim'}`}
                title="Настройки"
            >
                <Settings size={18} />
            </button>
            <button 
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                className={`p-2 rounded border transition-all ${theme === 'dark' ? 'border-dark-dim hover:bg-dark-dim' : 'border-light-dim hover:bg-light-dim'}`}
            >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
                onClick={handleLogout}
                title="Выход"
                className={`p-2 rounded border transition-all ${theme === 'dark' ? 'border-dark-dim hover:bg-red-900/50 hover:text-red-400' : 'border-light-dim hover:bg-red-50 hover:text-red-500'}`}
            >
                <LogOut size={18} />
            </button>
          </div>
        </header>
        )}

        {/* MOBILE TOP BAR */}
        {view !== 'EXHIBIT' && (
            <header className={`md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-md ${
                theme === 'dark' ? 'bg-dark-bg/90 border-dark-dim' : 'bg-light-surface/90 border-light-dim'
            }`}>
                 <h1 className="text-xl font-pixel tracking-tighter flex items-center gap-2" onClick={() => setView('FEED')}>
                    <Terminal size={20} /> NEO
                 </h1>
                 <div className="flex gap-2">
                    {isAdmin && (
                        <button onClick={() => setView('ADMIN')} className="text-red-500"><ShieldAlert size={18} /></button>
                    )}
                    <button onClick={() => setView('SETTINGS')} className={`${theme === 'dark' ? 'text-dark-dim' : 'text-light-dim'}`}><Settings size={18}/></button>
                    <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button onClick={handleLogout}><LogOut size={18}/></button>
                 </div>
            </header>
        )}

        {/* MOBILE BOTTOM NAV */}
        {view !== 'EXHIBIT' && (
            <nav className={`md:hidden fixed bottom-0 left-0 w-full z-50 border-t pb-safe flex justify-around items-center px-2 py-3 backdrop-blur-xl ${
                theme === 'dark' ? 'bg-black/90 border-dark-primary text-dark-dim' : 'bg-white/95 border-light-accent text-light-dim'
            }`}>
                 {[
                     { id: 'FEED', icon: Home, label: 'ЛЕНТА' },
                     { id: 'COLLECTIONS', icon: FolderOpen, label: 'ПАКЕТЫ' },
                     { id: 'CREATE', icon: PlusSquare, label: 'НОВЫЙ' },
                     { id: 'COMMS', icon: Bell, label: 'СВЯЗЬ' },
                     { id: 'PROFILE', icon: User, label: 'Я' },
                 ].map((tab) => (
                     <button 
                        key={tab.id}
                        onClick={() => {
                            setView(tab.id as ViewState);
                            if (tab.id === 'PROFILE') { setViewedProfile(currentUser.username); setActiveProfileTab('OWN'); }
                            if (tab.id === 'FEED') setActiveFeedTab('GLOBAL');
                            if (tab.id === 'CREATE') setEditingExhibitId(null);
                        }}
                        className={`flex flex-col items-center gap-1 p-1 rounded transition-colors ${
                            view === tab.id 
                                ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') 
                                : 'opacity-70'
                        }`}
                     >
                         <tab.icon size={22} strokeWidth={view === tab.id ? 2.5 : 2} />
                         <span className="text-[9px] font-bold tracking-wider">{tab.label}</span>
                     </button>
                 ))}
            </nav>
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          
          {/* --- ADMIN VIEW --- */}
          {view === 'ADMIN' && isAdmin && (
              <div className="space-y-6">
                  {/* ... admin view content ... */}
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-red-500/30">
                      <h2 className="text-2xl font-pixel text-red-500 flex items-center gap-2"><ShieldAlert /> ROOT_ACCESS</h2>
                      <button onClick={db.resetDatabase} className="border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 text-xs font-bold rounded">FACTORY RESET DB</button>
                  </div>
                  <div className={`border rounded p-4 ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                      <h3 className="font-bold mb-4 flex items-center gap-2"><Database size={16}/> DATABASE CONTENTS</h3>
                      <div className="overflow-x-auto">
                          <table className="w-full text-xs font-mono">
                              <thead>
                                  <tr className="opacity-50 text-left border-b border-inherit">
                                      <th className="p-2">ID</th>
                                      <th className="p-2">Title</th>
                                      <th className="p-2">Owner</th>
                                      <th className="p-2">Actions</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {exhibits.map(ex => (
                                      <tr key={ex.id} className="border-b border-inherit last:border-0 hover:bg-red-500/10">
                                          <td className="p-2 opacity-50">{ex.id}</td>
                                          <td className="p-2">{ex.title}</td>
                                          <td className="p-2 font-bold">@{ex.owner}</td>
                                          <td className="p-2">
                                              <button onClick={() => handleDeleteExhibit(ex.id)} className="text-red-500 hover:underline">DELETE</button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {/* --- SETTINGS VIEW --- */}
          {view === 'SETTINGS' && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8">
              {/* ... settings view content ... */}
              <h2 className="text-2xl font-pixel mb-6 flex items-center gap-2">
                <Settings /> СИСТЕМНЫЕ НАСТРОЙКИ
              </h2>
              <div className={`border p-6 rounded-lg space-y-6 mb-8 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim shadow'}`}>
                  <h3 className="text-lg font-bold uppercase border-b pb-2 border-inherit opacity-70">Профиль</h3>
                  <div className="space-y-1">
                      <label className="text-xs font-bold uppercase opacity-70">URL Аватара</label>
                      <input value={settingsAvatar} onChange={e => setSettingsAvatar(e.target.value)} placeholder="https://..." className={`w-full bg-transparent border-b-2 p-2 focus:outline-none ${theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-bold uppercase opacity-70">Статус / Слоган</label>
                      <input value={settingsTagline} onChange={e => setSettingsTagline(e.target.value)} className={`w-full bg-transparent border-b-2 p-2 focus:outline-none ${theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`} />
                  </div>
                   <div className="space-y-1">
                      <label className="text-xs font-bold uppercase opacity-70">Пароль</label>
                      <input type="password" value={settingsPassword} onChange={e => setSettingsPassword(e.target.value)} placeholder="******" className={`w-full bg-transparent border-b-2 p-2 focus:outline-none ${theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`} />
                  </div>
                  <button onClick={handleSaveSettings} className={`px-6 py-3 font-bold uppercase text-xs rounded transition-all w-full md:w-auto ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}> СОХРАНИТЬ ИЗМЕНЕНИЯ </button>
              </div>
              <div className={`border p-6 rounded-lg space-y-6 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim shadow'}`}>
                  <h3 className="text-lg font-bold uppercase border-b pb-2 border-inherit opacity-70 flex items-center gap-2"><Database size={20}/> Резервное копирование</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`p-4 rounded border flex flex-col items-center justify-center gap-2 ${theme === 'dark' ? 'border-dark-dim bg-black/20' : 'border-light-dim bg-gray-50'}`}>
                          <Download size={32} className="opacity-50"/>
                          <div className="text-sm font-bold">ЭКСПОРТ ДАННЫХ</div>
                          <p className="text-[10px] opacity-60 text-center mb-2">Скачать полный дамп базы данных в JSON</p>
                          <button onClick={handleExportData} className={`px-4 py-2 text-xs font-bold rounded ${theme === 'dark' ? 'bg-dark-dim text-white hover:bg-dark-primary hover:text-black' : 'bg-light-dim text-black hover:bg-light-accent hover:text-white'}`}> СКАЧАТЬ .JSON </button>
                      </div>
                      <div className={`p-4 rounded border flex flex-col items-center justify-center gap-2 ${theme === 'dark' ? 'border-dark-dim bg-black/20' : 'border-light-dim bg-gray-50'}`}>
                          <Upload size={32} className="opacity-50"/>
                          <div className="text-sm font-bold">ИМПОРТ ДАННЫХ</div>
                          <p className="text-[10px] opacity-60 text-center mb-2">Восстановить базу из файла резервной копии</p>
                          <label className={`cursor-pointer px-4 py-2 text-xs font-bold rounded flex items-center gap-2 ${theme === 'dark' ? 'bg-dark-dim text-white hover:bg-dark-primary hover:text-black' : 'bg-light-dim text-black hover:bg-light-accent hover:text-white'}`}> <input type="file" hidden accept=".json" onChange={handleImportData} /> <FileJson size={14}/> ВЫБРАТЬ ФАЙЛ </label>
                      </div>
                  </div>
              </div>
            </div>
          )}


          {/* --- VIEW: FEED & PROFILE & COL_DETAIL --- */}
          {(view === 'FEED' || view === 'PROFILE' || view === 'COLLECTION_DETAIL') && (
            <>
                {view === 'COLLECTION_DETAIL' && selectedCollectionId && (
                     <div className="mb-8 border-b border-dashed pb-4">
                        <button onClick={() => setView('COLLECTIONS')} className="text-xs mb-4 flex items-center gap-1 hover:underline"><ChevronDown className="rotate-90"/> НАЗАД К СБОРНИКАМ</button>
                        <h2 className="text-2xl font-bold flex items-center gap-2"><FolderOpen /> {collections.find(c => c.id === selectedCollectionId)?.title}</h2>
                        <div className="text-sm mt-1 opacity-70">{collections.find(c => c.id === selectedCollectionId)?.description}</div>
                    </div>
                )}

                {/* Feed Header with Search */}
                {view === 'FEED' && (
                    <div className="mb-8 space-y-4">
                         {/* Toggle Tabs */}
                         <div className="flex justify-center">
                            <div className={`flex border rounded p-1 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-gray-100 border-light-dim'}`}>
                                <button onClick={() => { setActiveFeedTab('GLOBAL'); setSelectedCategory('ALL'); }} className={`px-6 py-2 text-xs font-bold rounded transition-all ${activeFeedTab === 'GLOBAL' ? (theme === 'dark' ? 'bg-dark-dim text-white' : 'bg-white text-black shadow') : 'opacity-50'}`}>ГЛОБАЛЬНАЯ</button>
                                <button onClick={() => { setActiveFeedTab('SUBS'); setSelectedCategory('ALL'); }} className={`px-6 py-2 text-xs font-bold rounded transition-all flex items-center gap-2 ${activeFeedTab === 'SUBS' ? (theme === 'dark' ? 'bg-dark-dim text-white' : 'bg-white text-black shadow') : 'opacity-50'}`}><Users size={12}/> ПОДПИСКИ</button>
                            </div>
                        </div>

                        {/* Search Bar & Sort */}
                        <div className={`flex flex-col md:flex-row gap-4 p-3 border rounded ${theme === 'dark' ? 'border-dark-dim bg-dark-surface/50' : 'border-light-dim bg-white shadow-sm'}`}>
                             <div className="flex-1 flex items-center gap-2 border-b md:border-b-0 md:border-r border-inherit px-2 pb-2 md:pb-0">
                                 <Search size={18} className="opacity-50"/>
                                 <input 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="ПОИСК ПО АРХИВУ..."
                                    className="bg-transparent w-full focus:outline-none text-sm font-bold"
                                 />
                                 {searchQuery && <button onClick={() => setSearchQuery('')}><X size={14}/></button>}
                             </div>
                             
                             <div className="flex items-center justify-between md:justify-end gap-2 px-2">
                                 <span className="text-[10px] uppercase font-bold opacity-50 whitespace-nowrap">Сортировка:</span>
                                 <select 
                                    value={sortOption}
                                    onChange={e => setSortOption(e.target.value as any)}
                                    className={`bg-transparent text-xs font-bold uppercase focus:outline-none cursor-pointer ${theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'}`}
                                 >
                                     <option value="DATE_DESC">Новые</option>
                                     <option value="DATE_ASC">Старые</option>
                                     <option value="POPULAR">Популярные</option>
                                     <option value="RATING">Рейтинг</option>
                                 </select>
                             </div>
                        </div>
                    </div>
                )}
                
                {/* Profile Header & Toggles */}
                {view === 'PROFILE' && viewedProfile && (
                    <>
                     <div className={`max-w-4xl mx-auto text-center space-y-6 mb-8 animate-in zoom-in-95 duration-300 border rounded-xl p-8 relative overflow-hidden ${theme === 'dark' ? 'border-dark-dim bg-dark-surface/50' : 'border-light-dim bg-white shadow-lg'}`}>
                        {theme === 'dark' && <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(0deg,transparent_24%,rgba(34,197,94,0.3)_25%,rgba(34,197,94,0.3)_26%,transparent_27%,transparent_74%,rgba(34,197,94,0.3)_75%,rgba(34,197,94,0.3)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(34,197,94,0.3)_25%,rgba(34,197,94,0.3)_26%,transparent_27%,transparent_74%,rgba(34,197,94,0.3)_75%,rgba(34,197,94,0.3)_76%,transparent_77%,transparent)] bg-[length:30px_30px]" />}
                        
                        <div className="relative inline-block group">
                            <div className={`w-28 h-28 mx-auto border-4 p-1 rounded-full overflow-hidden transition-colors ${theme === 'dark' ? 'border-dark-primary' : 'border-light-accent'}`}>
                                <img src={currentUser?.username === viewedProfile ? currentUser.avatarUrl : `https://ui-avatars.com/api/?name=${viewedProfile}&background=random`} alt="User" className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500" />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-3xl font-pixel mb-2">{viewedProfile}</h2>
                            <p className="text-sm italic opacity-70 mb-4 font-mono">
                                {viewedProfile === currentUser.username ? `"${currentUser.tagline}"` : '"Исследователь сети"'}
                            </p>
                            
                            {viewedProfile !== currentUser.username ? (
                                <div className="flex justify-center gap-3">
                                    <button onClick={() => handleFollow(viewedProfile)} className={`px-4 py-2 border rounded text-xs font-bold uppercase ${currentUser.following.includes(viewedProfile) ? 'bg-transparent text-current' : (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white')}`}>
                                        {currentUser.following.includes(viewedProfile) ? 'В ПОДПИСКАХ' : 'ПОДПИСАТЬСЯ'}
                                    </button>
                                    <button onClick={() => openChat(viewedProfile)} className="px-4 py-2 border rounded text-xs font-bold uppercase flex items-center gap-2 hover:bg-gray-500/10">
                                        <Mail size={14}/> НАПИСАТЬ
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex justify-center gap-4 text-xs font-bold opacity-60">
                                        <span>{exhibits.filter(e => e.owner === currentUser.username).length} ЭКСПОНАТОВ</span>
                                        <span>{currentUser.following.length} ПОДПИСОК</span>
                                    </div>
                                    <button onClick={() => setView('SETTINGS')} className="mt-2 text-[10px] uppercase font-bold flex items-center gap-1 opacity-50 hover:opacity-100">
                                        <Settings size={12}/> Редактировать профиль
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* NEW GUESTBOOK SECTION FOR PROFILE VIEW */}
                    <div className={`mb-8 border rounded-lg overflow-hidden ${theme === 'dark' ? 'border-dark-dim bg-dark-surface/30' : 'border-light-dim bg-white'}`}>
                        <div className="p-3 border-b border-inherit flex items-center gap-2 bg-opacity-50">
                            <BookOpen size={16}/> <span className="text-xs font-bold uppercase">ГОСТЕВАЯ КНИГА / СТЕНА</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-4 space-y-3">
                            {guestbook.filter(g => g.targetUser === viewedProfile).length === 0 && (
                                <div className="text-xs opacity-50 italic text-center py-4">Здесь пока пусто. Оставьте первую запись.</div>
                            )}
                            {guestbook.filter(g => g.targetUser === viewedProfile).map(entry => (
                                <div key={entry.id} className={`p-2 rounded text-xs ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}>
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold cursor-pointer hover:underline" onClick={() => handleProfileClick(entry.author)}>@{entry.author}</span>
                                        <span className="opacity-50 text-[10px]">{entry.timestamp}</span>
                                    </div>
                                    <div className="break-words">{entry.text}</div>
                                </div>
                            ))}
                        </div>
                        {currentUser && viewedProfile !== currentUser.username && (
                            <div className="p-3 border-t border-inherit flex gap-2">
                                <input 
                                    value={guestbookInput}
                                    onChange={e => setGuestbookInput(e.target.value)}
                                    placeholder="Оставить запись..."
                                    className="flex-1 bg-transparent text-xs p-2 border rounded focus:outline-none border-inherit"
                                />
                                <button onClick={handleSignGuestbook} className={`p-2 rounded ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}><Send size={14}/></button>
                            </div>
                        )}
                    </div>

                    {/* Profile Tabs */}
                    <div className="flex justify-center mb-6">
                         <div className={`flex border-b w-full max-w-md justify-center gap-8 ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                            <button onClick={() => setActiveProfileTab('OWN')} className={`pb-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${activeProfileTab === 'OWN' ? (theme === 'dark' ? 'border-dark-primary text-dark-primary' : 'border-light-accent text-light-accent') : 'border-transparent opacity-50'}`}>Личное</button>
                            <button onClick={() => setActiveProfileTab('LIKED')} className={`pb-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${activeProfileTab === 'LIKED' ? (theme === 'dark' ? 'border-dark-primary text-dark-primary' : 'border-light-accent text-light-accent') : 'border-transparent opacity-50'}`}>Избранное</button>
                         </div>
                    </div>
                    </>
                )}

                {/* Categories */}
                {(view === 'FEED' && activeFeedTab === 'GLOBAL') && (
                    <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start items-center">
                        <CategoryButton label="ВСЕ" isActive={selectedCategory === 'ALL'} theme={theme} onClick={() => { setSelectedCategory('ALL'); setIsOtherMenuOpen(false); }} />
                        {POPULAR_CATEGORIES.map(cat => (
                            <CategoryButton key={cat} label={cat} isActive={selectedCategory === cat} theme={theme} onClick={() => { setSelectedCategory(cat); setIsOtherMenuOpen(false); }} />
                        ))}
                        <div className="relative">
                            <button
                                onClick={() => setIsOtherMenuOpen(!isOtherMenuOpen)}
                                onBlur={() => setTimeout(() => setIsOtherMenuOpen(false), 200)}
                                className={`px-4 py-1.5 text-xs border rounded transition-colors uppercase font-bold flex items-center gap-1 ${isOtherMenuOpen || OTHER_CATEGORIES.includes(selectedCategory as DefaultCategory) ? (theme === 'dark' ? 'bg-dark-dim text-white border-dark-primary' : 'bg-light-primary text-white border-light-primary') : (theme === 'dark' ? 'border-dark-dim text-dark-dim' : 'border-light-dim text-light-dim')}`}
                            >
                                ОСТАЛЬНОЕ <ChevronDown size={12} />
                            </button>
                            {isOtherMenuOpen && (
                                <div className={`absolute top-full left-0 mt-2 w-40 border rounded shadow-xl z-20 flex flex-col p-1 animate-in fade-in zoom-in-95 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                                    {OTHER_CATEGORIES.map(cat => (
                                        <button key={cat} onClick={() => { setSelectedCategory(cat); setIsOtherMenuOpen(false); }} className={`text-left px-3 py-2 text-xs font-bold rounded transition-colors ${selectedCategory === cat ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') : (theme === 'dark' ? 'text-dark-dim hover:bg-dark-dim/50' : 'text-light-dim hover:bg-light-surface')}`}>{cat}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {filteredExhibits.length === 0 && (
                        <div className="col-span-full text-center py-20 opacity-50 flex flex-col items-center">
                            <Search size={48} className="mb-4 opacity-20"/>
                            <div className="mb-4 font-bold">ДАННЫЕ НЕ ОБНАРУЖЕНЫ</div>
                            
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button 
                                    onClick={refreshData} 
                                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded text-xs font-bold uppercase border transition-all hover:scale-105 ${theme === 'dark' ? 'border-dark-primary text-dark-primary hover:bg-dark-primary hover:text-black' : 'border-light-accent text-light-accent hover:bg-light-accent hover:text-white'}`}
                                >
                                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> 
                                    {isLoading ? 'ЗАГРУЗКА...' : 'ОБНОВИТЬ'}
                                </button>

                                <button 
                                    onClick={handleResetToDemo} 
                                    className="flex items-center justify-center gap-2 px-6 py-3 rounded text-xs font-bold uppercase border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-all hover:scale-105"
                                >
                                    <RotateCcw size={16} /> 
                                    ЗАГРУЗИТЬ DEMO
                                </button>
                            </div>
                        </div>
                    )}
                    {filteredExhibits.map((item) => {
                        const similar = exhibits.filter(e => e && e.category === item.category && e.id !== item.id).slice(0, 3);
                        // Safe check for likedBy array
                        const isLiked = item.likedBy?.includes(currentUser?.username || '') ?? false;
                        return (
                            <ExhibitCard 
                                key={item.id} 
                                item={item} 
                                similarExhibits={similar}
                                theme={theme} 
                                onClick={handleExhibitClick} 
                                isLiked={isLiked}
                                isFavorited={favorites.has(item.id)}
                                onLike={(e) => { e.stopPropagation(); handleLike(item.id); }}
                                onFavorite={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                                onAuthorClick={handleProfileClick}
                            />
                        );
                    })}
                </div>
            </>
          )}

          {/* ... OTHER VIEWS (CREATE, COMMS) SAME AS BEFORE ... */}
          {/* I will re-include them to ensure file completeness */}
          {view === 'CREATE' && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8">
              <h2 className="text-2xl font-pixel mb-6 flex items-center gap-2">
                 <PlusSquare /> {editingExhibitId ? 'РЕДАКТИРОВАНИЕ' : 'НОВЫЙ ОБЪЕКТ'}
              </h2>
              <div className={`border p-6 rounded-lg space-y-6 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim shadow-lg'}`}>
                 <div className="space-y-1">
                     <label className="text-xs font-bold uppercase opacity-70">Название</label>
                     <input value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="Например: Nokia 3310" className={`w-full bg-transparent border-b-2 p-2 focus:outline-none ${theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`} />
                 </div>
                 <div className="space-y-2">
                     <label className="text-xs font-bold uppercase opacity-70">Категория</label>
                     <div className="flex flex-wrap gap-2">
                        {Object.values(DefaultCategory).map(cat => (
                            <CategoryButton key={cat} label={cat} isActive={newItemCategory === cat} theme={theme} onClick={() => handleCategoryChange(cat)} />
                        ))}
                     </div>
                 </div>
                 <div className="space-y-2">
                     <label className="text-xs font-bold uppercase opacity-70">Изображения</label>
                     <div className="grid grid-cols-4 gap-2 mb-2">
                         {newImages.map((url, idx) => (
                             <div key={idx} className="relative aspect-square rounded border overflow-hidden group">
                                 <img src={url} alt="" className="w-full h-full object-cover" />
                                 <button onClick={() => handleRemoveImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"> <X size={12} /> </button>
                             </div>
                         ))}
                         {newImages.length < 4 && (
                             <label className={`aspect-square rounded border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:opacity-100 transition-opacity opacity-50 ${theme === 'dark' ? 'border-dark-dim hover:border-dark-primary' : 'border-light-dim hover:border-light-accent'}`}> <input type="file" hidden multiple accept="image/*" onChange={handleFileUpload} /> <Upload size={20} className="mb-1" /> <span className="text-[9px] uppercase font-bold">Upload</span> </label>
                         )}
                     </div>
                     <div className="flex items-center gap-2 mb-2"> <div className={`h-px flex-1 ${theme === 'dark' ? 'bg-dark-dim' : 'bg-light-dim'}`}></div> <span className="text-[10px] opacity-50 uppercase">ИЛИ URL</span> <div className={`h-px flex-1 ${theme === 'dark' ? 'bg-dark-dim' : 'bg-light-dim'}`}></div> </div>
                     <div className="flex gap-2"> <input value={imageUrlInput} onChange={e => setImageUrlInput(e.target.value)} placeholder="https://..." className={`flex-1 bg-transparent border text-xs p-2 rounded focus:outline-none min-w-0 ${theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`} /> <button onClick={handleUrlAdd} className={`px-3 py-1 text-xs font-bold border rounded flex-shrink-0 ${theme === 'dark' ? 'border-dark-dim hover:border-dark-primary' : 'border-light-dim hover:border-light-accent'}`}>OK</button> </div>
                 </div>
                 <div className="space-y-1"> <label className="text-xs font-bold uppercase opacity-70 flex items-center gap-2"><Video size={14}/> Video URL (YouTube/Rutube)</label> <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." className={`w-full bg-transparent border-b-2 p-2 focus:outline-none text-xs font-mono ${theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`} /> </div>
                 <div className="space-y-2"> <label className="text-xs font-bold uppercase opacity-70">Характеристики</label> <div className={`rounded p-3 border space-y-2 ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}> {newItemSpecs.map((spec, idx) => ( <div key={idx} className="flex gap-2 items-center"> <input value={spec.key} onChange={e => handleSpecChange(idx, 'key', e.target.value)} placeholder="Свойство" className={`w-1/3 bg-transparent border-b p-1 text-xs font-bold focus:outline-none min-w-0 ${theme === 'dark' ? 'border-dark-dim focus:border-dark-primary text-dark-primary' : 'border-light-dim focus:border-light-accent text-light-accent'}`} /> <input value={spec.value} onChange={e => handleSpecChange(idx, 'value', e.target.value)} placeholder="Значение" className={`flex-1 bg-transparent border-b p-1 text-xs focus:outline-none min-w-0 ${theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`} /> <button onClick={() => handleRemoveSpec(idx)} className="text-red-500 hover:text-red-400 p-1 flex-shrink-0"><Minus size={14}/></button> </div> ))} <button onClick={handleAddSpec} className={`w-full py-1 text-xs font-bold uppercase border border-dashed rounded flex items-center justify-center gap-2 ${theme === 'dark' ? 'border-dark-dim text-dark-dim hover:text-dark-primary hover:border-dark-primary' : 'border-light-dim text-light-dim hover:text-light-accent hover:border-light-accent'}`}> <Plus size={14}/> Добавить поле </button> </div> </div>
                 <div className="space-y-1"> <label className="text-xs font-bold uppercase opacity-70">Состояние / Детали</label> <input value={newItemQuality} onChange={e => setNewItemQuality(e.target.value)} placeholder="Например: Царапины на корпусе, полный комплект" className={`w-full bg-transparent border-b-2 p-2 focus:outline-none ${theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`} /> </div>
                 <div className="space-y-1"> <label className="text-xs font-bold uppercase opacity-70">Описание</label> <textarea value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} rows={5} className={`w-full bg-transparent border-2 rounded p-2 focus:outline-none ${theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'}`} /> </div>
                 <button onClick={handleSaveExhibit} disabled={isModerating} className={`w-full py-3 font-bold uppercase tracking-widest text-sm rounded transition-all ${theme === 'dark' ? 'bg-dark-primary text-black hover:shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'bg-light-accent text-white hover:bg-emerald-700'}`}> {isModerating ? 'ПРОВЕРКА ДАННЫХ...' : (editingExhibitId ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : 'ОПУБЛИКОВАТЬ В СЕТЬ')} </button>
              </div>
            </div>
          )}

          {view === 'COMMS' && (
              <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-pixel flex items-center gap-3"><Bell size={28}/> ЦЕНТР СВЯЗИ</h2>
                      <div className={`flex border rounded p-0.5 text-xs font-bold ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                          <button onClick={() => setActiveCommsTab('NOTIFICATIONS')} className={`px-4 py-1.5 rounded ${activeCommsTab === 'NOTIFICATIONS' ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') : 'opacity-50'}`}>СИСТЕМА</button>
                          <button onClick={() => setActiveCommsTab('MESSAGES')} className={`px-4 py-1.5 rounded ${activeCommsTab === 'MESSAGES' ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') : 'opacity-50'}`}>ЛИЧНЫЕ</button>
                      </div>
                  </div>
                  {activeCommsTab === 'NOTIFICATIONS' && (
                      <div className="space-y-4">
                          {notifications.length === 0 && <div className="opacity-50 text-center py-10">НЕТ НОВЫХ СИГНАЛОВ</div>}
                          {notifications.map(n => (
                              <div key={n.id} className={`p-4 border-l-4 rounded shadow-sm flex gap-4 ${n.isRead ? 'opacity-50' : 'opacity-100'} ${theme === 'dark' ? 'bg-dark-surface border-dark-primary' : 'bg-white border-light-accent'}`}>
                                  <div className="mt-1"> {n.type === 'LIKE' && <Heart size={18}/>} {n.type === 'COMMENT' && <MessageSquare size={18}/>} {n.type === 'FOLLOW' && <UserPlus size={18}/>} </div>
                                  <div className="flex-1"> <div className="flex justify-between text-xs mb-1 opacity-60"> <span className="font-bold uppercase tracking-wider">{n.type}</span> <span>{n.timestamp}</span> </div> <p className="text-sm"> <span className="font-bold cursor-pointer hover:underline" onClick={() => handleProfileClick(n.actor)}>@{n.actor}</span> {n.type === 'LIKE' && ' оценил ваш объект'} {n.type === 'COMMENT' && ' оставил комментарий'} {n.type === 'FOLLOW' && ' теперь читает вас'} </p> {n.targetPreview && <div className="mt-2 text-xs italic border-l-2 pl-2 border-current opacity-70">"{n.targetPreview}"</div>} </div>
                              </div>
                          ))}
                      </div>
                  )}
                  {activeCommsTab === 'MESSAGES' && (
                      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] border rounded overflow-hidden ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                          <div className={`border-r overflow-y-auto ${theme === 'dark' ? 'border-dark-dim bg-dark-surface' : 'border-light-dim bg-gray-50'}`}>
                              <h3 className="p-3 text-xs font-bold uppercase opacity-50 border-b border-inherit">Диалоги</h3>
                              {Array.from(new Set(messages.flatMap(m => [m.sender, m.receiver]).filter(u => u !== currentUser.username))).map(user => (
                                  <div key={user} onClick={() => setSelectedConversation(user)} className={`p-4 cursor-pointer border-b border-inherit hover:opacity-80 transition-colors flex items-center gap-3 ${selectedConversation === user ? (theme === 'dark' ? 'bg-white/10' : 'bg-white shadow-inner') : ''}`}>
                                     <div className="w-8 h-8 rounded-full bg-gray-500 overflow-hidden"> <img src={`https://ui-avatars.com/api/?name=${user}&background=random`} className="w-full h-full object-cover"/> </div> <div className="font-bold truncate">@{user}</div>
                                  </div>
                              ))}
                              {messages.length === 0 && <div className="p-4 opacity-50 text-xs">Нет сообщений</div>}
                          </div>
                          <div className="md:col-span-2 flex flex-col bg-opacity-50 h-full">
                              {selectedConversation ? (
                                  <>
                                    <div className={`p-3 border-b flex items-center gap-2 ${theme === 'dark' ? 'border-dark-dim bg-black/20' : 'border-light-dim bg-white'}`}> <div className="w-6 h-6 rounded-full overflow-hidden"><img src={`https://ui-avatars.com/api/?name=${selectedConversation}&background=random`} className="w-full h-full"/></div> <span className="font-bold">@{selectedConversation}</span> </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {messages.filter(m => (m.sender === currentUser.username && m.receiver === selectedConversation) || (m.sender === selectedConversation && m.receiver === currentUser.username)).map(m => (
                                            <div key={m.id} className={`flex ${m.sender === currentUser.username ? 'justify-end' : 'justify-start'}`}> <div className={`max-w-[80%] p-3 rounded text-sm ${ m.sender === currentUser.username ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') : (theme === 'dark' ? 'bg-dark-dim text-white' : 'bg-gray-200 text-black') }`}> {m.text} <div className="text-[9px] opacity-50 text-right mt-1">{m.timestamp}</div> </div> </div>
                                        ))}
                                    </div>
                                    <div className="p-3 border-t border-inherit flex gap-2">
                                        <input value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Сообщение..." className="flex-1 bg-transparent p-2 focus:outline-none border rounded border-inherit" />
                                        <button onClick={handleSendMessage} className={`p-2 rounded ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}> <Send size={18}/> </button>
                                    </div>
                                  </>
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-full opacity-50"> <MessageSquare size={48} className="mb-4"/> <div>ВЫБЕРИТЕ СОБЕСЕДНИКА</div> </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default App;
