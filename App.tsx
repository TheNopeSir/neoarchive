
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, User, PlusCircle, Search, Bell, Menu, 
  LogOut, FolderPlus, ArrowLeft, ImageIcon, X, FolderOpen,
  Plus, Terminal, ChevronDown, Trash2, Camera, Video,
  MessageCircle, Send, Package, Grid, Settings, RefreshCw,
  Sun, Moon, Check, Edit2, Zap
} from 'lucide-react';

import MatrixRain from './components/MatrixRain';
import CRTOverlay from './components/CRTOverlay';
import MatrixLogin from './components/MatrixLogin';
import ExhibitCard from './components/ExhibitCard';
import UserProfileView from './components/UserProfileView';
import ExhibitDetailPage from './components/ExhibitDetailPage';
import HallOfFame from './components/HallOfFame';
import MyCollection from './components/MyCollection';
import StorageMonitor from './components/StorageMonitor';
import RetroLoader from './components/RetroLoader';
import CollectionCard from './components/CollectionCard';
import PixelSnow from './components/PixelSnow';
import ActivityView from './components/ActivityView';

import * as db from './services/storageService';
import { 
  UserProfile, Exhibit, Collection, ViewState, 
  Notification, Message, GuestbookEntry, UserStatus 
} from './types';
import { 
  DefaultCategory, CATEGORY_SPECS_TEMPLATES, SUBCATEGORY_SPECS, 
  CATEGORY_CONDITIONS, SUBCATEGORY_CONDITIONS, COMMON_SPEC_VALUES, 
  CATEGORY_SUBCATEGORIES, calculateArtifactScore 
} from './constants';
import { moderateContent } from './services/geminiService';

// Helpers
const generateSpecsForCategory = (cat: string, subcat?: string) => {
    let template = CATEGORY_SPECS_TEMPLATES[cat] || [];
    if (subcat && SUBCATEGORY_SPECS[cat] && SUBCATEGORY_SPECS[cat][subcat]) {
        template = SUBCATEGORY_SPECS[cat][subcat];
    }
    const specs: Record<string, string> = {};
    template.forEach(key => specs[key] = '');
    return specs;
};

const getConditionsList = (cat: string, subcat?: string) => {
    if (subcat && SUBCATEGORY_CONDITIONS[subcat]) return SUBCATEGORY_CONDITIONS[subcat];
    return CATEGORY_CONDITIONS[cat] || CATEGORY_CONDITIONS[DefaultCategory.MISC];
};

const getDefaultCondition = (cat: string, subcat?: string) => {
    const list = getConditionsList(cat, subcat);
    return list[0] || 'Good';
};

// Default empty collection state
const EMPTY_COLLECTION: Partial<Collection> = {
  title: '',
  description: '',
  coverImage: '',
  exhibitIds: []
};

// Default empty exhibit state
const EMPTY_EXHIBIT: Partial<Exhibit> = {
    category: DefaultCategory.PHONES,
    subcategory: '',
    specs: {},
    imageUrls: [],
    condition: ''
};

export default function App() {
  // System State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [view, setView] = useState<ViewState>('AUTH');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Data State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);

  // Navigation & Filter State
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [viewedProfileUsername, setViewedProfileUsername] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ВСЕ');
  const [feedMode, setFeedMode] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');
  
  // Collection Management State
  const [newCollection, setNewCollection] = useState<Partial<Collection>>(EMPTY_COLLECTION);
  const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false); // Modal state

  // Exhibit Management State
  const [newExhibit, setNewExhibit] = useState<Partial<Exhibit>>(EMPTY_EXHIBIT);
  const [editingExhibitId, setEditingExhibitId] = useState<string | null>(null);

  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('ONLINE');
  const [editTelegram, setEditTelegram] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [guestbookInput, setGuestbookInput] = useState('');
  const guestbookInputRef = useRef<HTMLInputElement>(null);
  const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');

  // Chat State
  const [chatPartner, setChatPartner] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  // Initialization
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
          const activeUser = await db.initializeDatabase();
          if (activeUser) {
            setUser(activeUser);
            setView('FEED');
            refreshData();
          } else {
            setView('AUTH');
          }
      } catch (e) {
          console.error("Init failed", e);
          setView('AUTH');
      } finally {
          setIsLoading(false);
      }
    };
    init();

    // Auto-refresh interval
    const interval = setInterval(() => {
        if (view !== 'AUTH') db.backgroundSync().then(refreshData);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    const data = db.getFullDatabase();
    setExhibits(data.exhibits);
    setCollections(data.collections);
    setNotifications(data.notifications);
    setMessages(data.messages);
    setGuestbook(data.guestbook);
    
    if (user) {
       const updatedUser = data.users.find(u => u.username === user.username);
       if (updatedUser) setUser(updatedUser);
    }
  };

  const handleManualSync = async () => {
      setIsSyncing(true);
      await db.forceSync();
      refreshData();
      setTimeout(() => setIsSyncing(false), 800);
  };

  // --- NAVIGATION HANDLERS ---

  const handleLogin = (u: UserProfile) => {
    setUser(u);
    setView('FEED');
    refreshData();
  };

  const handleLogout = async () => {
    await db.logoutUser();
    setUser(null);
    setView('AUTH');
  };

  const handleBack = () => {
    if (['CREATE_ARTIFACT', 'CREATE_COLLECTION', 'EDIT_COLLECTION'].includes(view)) {
        setView('MY_COLLECTION');
    } else if (view === 'EXHIBIT') {
        setSelectedExhibit(null);
        setView('FEED');
    } else if (view === 'COLLECTION_DETAIL') {
        setSelectedCollection(null);
        setIsAddingToCollection(false); // Close modal if open
        setView('FEED');
    } else if (view === 'DIRECT_CHAT') {
        setChatPartner(null);
        setView('ACTIVITY');
    } else {
        setView('FEED');
    }
  };

  const handleExhibitClick = (item: Exhibit) => {
    // Increment view count logic
    if (user) db.updateUserPreference(user.username, item.category, 0.1);
    
    // Optimistic update for views
    const updated = { ...item, views: item.views + 1 };
    db.updateExhibit(updated); // Background
    
    setSelectedExhibit(updated);
    setView('EXHIBIT');
  };

  const handleCollectionClick = (col: Collection) => {
      setSelectedCollection(col);
      setView('COLLECTION_DETAIL');
  };

  const handleAuthorClick = (author: string) => {
    setViewedProfileUsername(author);
    setView('USER_PROFILE');
  };

  const handleLike = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const ex = exhibits.find(e => e.id === id);
    if (!ex || !user) return;
    
    // Weight update for interest
    if (!ex.likedBy?.includes(user.username)) {
         db.updateUserPreference(user.username, ex.category, 0.5); // Strong signal
    }

    const isLiked = ex.likedBy?.includes(user.username);
    const updated = {
        ...ex,
        likes: isLiked ? Math.max(0, ex.likes - 1) : ex.likes + 1,
        likedBy: isLiked ? (ex.likedBy?.filter(u => u !== user.username) || []) : [...(ex.likedBy || []), user.username]
    };
    
    // Optimistic UI update
    setExhibits(prev => prev.map(item => item.id === id ? updated : item));
    if (selectedExhibit?.id === id) setSelectedExhibit(updated);
    
    await db.updateExhibit(updated);
    
    // Send notification if liking someone else's post
    if (!isLiked && ex.owner !== user.username) {
         db.saveNotification({
             id: crypto.randomUUID(),
             type: 'LIKE',
             actor: user.username,
             recipient: ex.owner,
             targetId: ex.id,
             targetPreview: ex.title,
             timestamp: new Date().toLocaleString(),
             isRead: false
         });
    }
  };

  // --- COLLECTION MANAGEMENT ---
  
  const handleAddArtifactToCollection = async (exhibitId: string) => {
      if (!selectedCollection) return;
      const updatedCollection = {
          ...selectedCollection,
          exhibitIds: [...selectedCollection.exhibitIds, exhibitId]
      };
      await db.updateCollection(updatedCollection);
      setSelectedCollection(updatedCollection);
      refreshData();
  };

  const handleCollectionCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const b64 = await db.fileToBase64(e.target.files[0]);
        if (view === 'EDIT_COLLECTION' && collectionToEdit) {
            setCollectionToEdit({ ...collectionToEdit, coverImage: b64 });
        } else {
            setNewCollection({ ...newCollection, coverImage: b64 });
        }
    }
  };

  const handleCreateCollection = async () => {
    if (!user || !newCollection.title) return;
    setIsLoading(true);
    const col: Collection = {
        id: crypto.randomUUID(),
        title: newCollection.title || 'Untitled',
        description: newCollection.description || '',
        owner: user.username,
        coverImage: newCollection.coverImage || '',
        exhibitIds: [],
        timestamp: new Date().toLocaleString()
    };
    await db.saveCollection(col);
    refreshData();
    setIsLoading(false);
    setView('MY_COLLECTION');
    setNewCollection(EMPTY_COLLECTION);
  };

  const handleSaveCollection = async () => {
      if (!collectionToEdit) return;
      setIsLoading(true);
      await db.updateCollection(collectionToEdit);
      refreshData();
      setIsLoading(false);
      setView('MY_COLLECTION');
  };

  const handleDeleteCollection = async () => {
      if (!collectionToEdit) return;
      if (confirm('Delete collection?')) {
          await db.deleteCollection(collectionToEdit.id);
          refreshData();
          setView('MY_COLLECTION');
      }
  };

  // --- ARTIFACT MANAGEMENT (CREATE/EDIT) ---
  // ... (Code reused from previous versions for image upload, save, etc.)
  const handleStartCreateArtifact = () => {
      setNewExhibit({
          category: DefaultCategory.PHONES,
          subcategory: '',
          specs: generateSpecsForCategory(DefaultCategory.PHONES),
          condition: getDefaultCondition(DefaultCategory.PHONES),
          imageUrls: []
      });
      setEditingExhibitId(null);
      setView('CREATE_ARTIFACT');
  };
  const handleEditExhibit = (item: Exhibit) => {
      setEditingExhibitId(item.id);
      setNewExhibit({ ...item });
      setView('CREATE_ARTIFACT');
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const b64 = await db.fileToBase64(e.target.files[0]);
              setNewExhibit(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), b64] }));
          } catch(err) { alert("Error uploading image"); }
      }
  };
  const removeImage = (index: number) => {
      setNewExhibit(prev => ({ ...prev, imageUrls: prev.imageUrls?.filter((_, i) => i !== index) }));
  };
  const handleSaveExhibit = async (isDraft = false) => {
      if (!user) return;
      if (!newExhibit.title) { alert("Title required"); return; }
      if (!isDraft && (!newExhibit.imageUrls || newExhibit.imageUrls.length === 0)) { alert("Image required for publication"); return; }
      setIsLoading(true);
      if (!isDraft) {
          const modCheck = await moderateContent(`${newExhibit.title} ${newExhibit.description || ''}`);
          if (!modCheck.allowed) {
              alert(`Content Warning: ${modCheck.reason}`);
              setIsLoading(false);
              return;
          }
      }
      const ex: Exhibit = {
          id: editingExhibitId || crypto.randomUUID(),
          title: newExhibit.title,
          description: newExhibit.description || '',
          imageUrls: newExhibit.imageUrls || [],
          videoUrl: newExhibit.videoUrl,
          category: newExhibit.category || DefaultCategory.MISC,
          subcategory: newExhibit.subcategory,
          condition: newExhibit.condition,
          specs: newExhibit.specs || {},
          owner: user.username,
          timestamp: new Date().toLocaleString(),
          likes: editingExhibitId ? exhibits.find(e => e.id === editingExhibitId)?.likes || 0 : 0,
          likedBy: editingExhibitId ? exhibits.find(e => e.id === editingExhibitId)?.likedBy || [] : [],
          views: editingExhibitId ? exhibits.find(e => e.id === editingExhibitId)?.views || 0 : 0,
          comments: editingExhibitId ? exhibits.find(e => e.id === editingExhibitId)?.comments || [] : [],
          quality: newExhibit.quality || 'Standard',
          isDraft: isDraft
      };
      if (editingExhibitId) await db.updateExhibit(ex);
      else await db.saveExhibit(ex);
      refreshData();
      setIsLoading(false);
      setView('MY_COLLECTION');
  };
  const handleDeleteExhibit = async (id: string) => {
      if(confirm("Delete artifact?")) {
          await db.deleteExhibit(id);
          refreshData();
          handleBack();
      }
  };

  // --- CHAT SYSTEM ---
  
  const handleOpenChat = (partner: string) => {
      if (!user) return;
      setChatPartner(partner);
      db.markMessagesRead(partner, user.username);
      setMessages([...db.getMessages()]);
      setView('DIRECT_CHAT');
  };

  const handleSendMessage = async () => {
      if (!user || !chatPartner || !chatInput.trim()) return;
      const msg: Message = {
          id: crypto.randomUUID(),
          sender: user.username,
          receiver: chatPartner,
          text: chatInput,
          timestamp: new Date().toLocaleString(),
          isRead: false
      };
      await db.saveMessage(msg);
      setMessages([...db.getMessages(), msg]); 
      setChatInput('');
  };

  // --- FEED & SEARCH ALGORITHM ---
  
  // 1. Filter by Search & Category
  let displayExhibits = exhibits.filter(e => {
      if (e.isDraft) return false;
      if (selectedCategory !== 'ВСЕ' && e.category !== selectedCategory) return false;
      if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
  });

  // 2. Split into "Following" and "Recommendations" if in default feed
  let followingExhibits: Exhibit[] = [];
  let recommendedExhibits: Exhibit[] = [];

  if (user && !searchQuery && selectedCategory === 'ВСЕ') {
      followingExhibits = displayExhibits.filter(e => user.following.includes(e.owner));
      recommendedExhibits = displayExhibits.filter(e => !user.following.includes(e.owner));
      
      // Sort Recommendations by Score (Interest)
      recommendedExhibits.sort((a,b) => calculateArtifactScore(b, user.preferences) - calculateArtifactScore(a, user.preferences));
      
      // Sort Following by Newest
      followingExhibits.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
  } else {
      // Just fallback to score sort if filtering
      recommendedExhibits = displayExhibits.sort((a,b) => calculateArtifactScore(b, user?.preferences) - calculateArtifactScore(a, user?.preferences));
  }

  // --- RENDER ---
  
  if (view === 'AUTH') {
    return (
      <>
        <MatrixRain theme={theme} />
        <CRTOverlay />
        <MatrixLogin theme={theme} onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${theme === 'dark' ? 'bg-black text-gray-200' : 'bg-gray-100 text-gray-900'}`}>
        <MatrixRain theme={theme} />
        <PixelSnow theme={theme} />
        <CRTOverlay />
        
        {/* Header */}
        <header className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-colors duration-300 ${theme === 'dark' ? 'bg-black/80 border-dark-dim' : 'bg-white/80 border-light-dim'}`}>
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                     <div className="font-pixel text-xl font-bold tracking-widest cursor-pointer group" onClick={() => setView('FEED')}>
                         NEO_ARCHIVE
                     </div>
                     {/* Search Bar Desktop */}
                     <div className={`hidden md:flex items-center px-3 py-1.5 rounded-full border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                         <Search size={14} className="opacity-50 mr-2" />
                         <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="SEARCH_DB..." 
                            className="bg-transparent border-none outline-none text-xs font-mono w-48" 
                         />
                         {searchQuery && <button onClick={() => setSearchQuery('')}><X size={12}/></button>}
                     </div>
                 </div>

                 <div className="flex items-center gap-3 md:gap-6">
                     <button onClick={handleManualSync} disabled={isSyncing} className={`${isSyncing ? 'animate-spin' : ''}`}>
                         <RefreshCw size={16} />
                     </button>
                     <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                         {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
                     </button>
                     
                     <div className="flex items-center gap-4">
                         <button onClick={() => setView('MY_COLLECTION')} title="My Collection" className={`opacity-70 hover:opacity-100 ${view === 'MY_COLLECTION' ? 'text-green-500' : ''}`}>
                             <FolderPlus size={20} />
                         </button>
                         <button onClick={() => setView('ACTIVITY')} title="Activity" className={`opacity-70 hover:opacity-100 ${view === 'ACTIVITY' ? 'text-green-500' : ''} relative`}>
                             <Bell size={20} />
                             {notifications.some(n => !n.isRead && n.recipient === user?.username) && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
                         </button>
                         {user && (
                            <div 
                                className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden cursor-pointer border border-transparent hover:border-green-500 transition-all"
                                onClick={() => { setViewedProfileUsername(user.username); setView('USER_PROFILE'); }}
                            >
                                <img src={user.avatarUrl} alt="me" className="w-full h-full object-cover" />
                            </div>
                         )}
                     </div>
                 </div>
            </div>
        </header>

        {/* Main Content Area */}
        <main className="pt-20 pb-24 px-4 max-w-6xl mx-auto min-h-screen relative z-10">
            
            {(view === 'FEED' || view === 'SEARCH') && (
                <div className="space-y-6 animate-in fade-in">
                    {/* Categories Bar */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                         <button onClick={() => setSelectedCategory('ВСЕ')} className={`px-4 py-2 rounded font-pixel text-[10px] font-bold whitespace-nowrap border ${selectedCategory === 'ВСЕ' ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') : 'border-gray-500/50 opacity-70'}`}>ВСЕ</button>
                         {Object.values(DefaultCategory).map(cat => (
                             <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded font-pixel text-[10px] font-bold whitespace-nowrap border ${selectedCategory === cat ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') : 'border-gray-500/50 opacity-70'}`}>{cat}</button>
                         ))}
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-gray-500/20 pb-2">
                        <div className="flex gap-4">
                            <button onClick={() => setFeedMode('ARTIFACTS')} className={`flex items-center gap-2 font-pixel text-xs ${feedMode === 'ARTIFACTS' ? 'font-bold underline' : 'opacity-50'}`}><Grid size={14} /> АРТЕФАКТЫ</button>
                            <button onClick={() => setFeedMode('COLLECTIONS')} className={`flex items-center gap-2 font-pixel text-xs ${feedMode === 'COLLECTIONS' ? 'font-bold underline' : 'opacity-50'}`}><FolderPlus size={14} /> КОЛЛЕКЦИИ</button>
                        </div>
                        {view === 'FEED' && (
                             <button onClick={() => setView('CREATE_HUB')} className={`px-3 py-1 rounded font-bold font-pixel text-xs flex items-center gap-2 ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}>
                                 <PlusCircle size={14} /> ДОБАВИТЬ
                             </button>
                        )}
                    </div>
                    
                    {feedMode === 'ARTIFACTS' ? (
                        <div className="space-y-8">
                            {/* FOLLOWING SECTION */}
                            {followingExhibits.length > 0 && (
                                <div>
                                    <div className="font-pixel text-xs opacity-50 mb-4 flex items-center gap-2">
                                        <Zap size={12} className="text-yellow-500"/> ПОДПИСКИ
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                        {followingExhibits.map(item => (
                                             <ExhibitCard 
                                                key={item.id} 
                                                item={item} 
                                                theme={theme}
                                                similarExhibits={[]}
                                                onClick={handleExhibitClick}
                                                isLiked={item.likedBy?.includes(user?.username || '') || false}
                                                isFavorited={false}
                                                onLike={(e) => handleLike(item.id, e)}
                                                onFavorite={() => {}}
                                                onAuthorClick={handleAuthorClick}
                                             />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* RECOMMENDED SECTION */}
                            {recommendedExhibits.length > 0 && (
                                <div>
                                    <div className="font-pixel text-xs opacity-50 mb-4 flex items-center gap-2">
                                        <Grid size={12} className="text-blue-500"/> ВАМ МОЖЕТ ПОНРАВИТЬСЯ
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                        {recommendedExhibits.map(item => (
                                             <ExhibitCard 
                                                key={item.id} 
                                                item={item} 
                                                theme={theme}
                                                similarExhibits={[]}
                                                onClick={handleExhibitClick}
                                                isLiked={item.likedBy?.includes(user?.username || '') || false}
                                                isFavorited={false}
                                                onLike={(e) => handleLike(item.id, e)}
                                                onFavorite={() => {}}
                                                onAuthorClick={handleAuthorClick}
                                             />
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {followingExhibits.length === 0 && recommendedExhibits.length === 0 && (
                                <div className="text-center opacity-50 font-mono py-10">НИЧЕГО НЕ НАЙДЕНО</div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {collections.map(col => (
                                <CollectionCard 
                                    key={col.id}
                                    col={col}
                                    theme={theme}
                                    onClick={handleCollectionClick}
                                    onShare={() => {}} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === 'CREATE_HUB' && (
                <div className="max-w-md mx-auto space-y-4 animate-in fade-in pt-10">
                    <button onClick={handleBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs"><ArrowLeft size={16} /> НАЗАД</button>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <button onClick={handleStartCreateArtifact} className="p-6 border-2 rounded-lg flex flex-col items-center gap-4 hover:bg-white/5 transition-colors"><Package size={32} /><span className="font-pixel text-sm font-bold">СОЗДАТЬ АРТЕФАКТ</span></button>
                        <button onClick={() => setView('CREATE_COLLECTION')} className="p-6 border-2 rounded-lg flex flex-col items-center gap-4 hover:bg-white/5 transition-colors"><FolderPlus size={32} /><span className="font-pixel text-sm font-bold">СОЗДАТЬ КОЛЛЕКЦИЮ</span></button>
                    </div>
                </div>
            )}

            {/* EXHIBIT CREATION/EDITING LOGIC REMAINS SAME */}
            {view === 'CREATE_ARTIFACT' && (
                 <div className="max-w-2xl mx-auto animate-in fade-in pb-20">
                     <button onClick={handleBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs mb-6"><ArrowLeft size={16} /> НАЗАД</button>
                     <h2 className="font-pixel text-xl mb-6 flex items-center gap-2"><PlusCircle /> {editingExhibitId ? 'РЕДАКТИРОВАНИЕ' : 'НОВЫЙ АРТЕФАКТ'}</h2>
                     <div className={`p-6 rounded-xl border-2 space-y-6 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                         <div><label className="block text-[10px] font-pixel uppercase opacity-70 mb-1">НАЗВАНИЕ *</label><input value={newExhibit.title || ''} onChange={e => setNewExhibit({...newExhibit, title: e.target.value})} className="w-full bg-transparent border-b-2 p-2 font-mono text-sm focus:outline-none" placeholder="Например: Nokia 3310" /></div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-[10px] font-pixel uppercase opacity-70 mb-1">КАТЕГОРИЯ</label>
                                 <div className="relative">
                                     <select value={newExhibit.category} onChange={e => { const cat = e.target.value; setNewExhibit({ ...newExhibit, category: cat, subcategory: '', specs: generateSpecsForCategory(cat), condition: getDefaultCondition(cat) }); }} className={`w-full appearance-none bg-transparent border-b-2 p-2 font-mono text-sm focus:outline-none ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>{Object.values(DefaultCategory).map(c => <option key={c} value={c}>{c}</option>)}</select>
                                     <ChevronDown className="absolute right-2 top-3 opacity-50 pointer-events-none" size={14} />
                                 </div>
                             </div>
                             <div>
                                 <label className="block text-[10px] font-pixel uppercase opacity-70 mb-1">ПОДКАТЕГОРИЯ</label>
                                 <div className="relative">
                                     <select value={newExhibit.subcategory || ''} onChange={e => { const sub = e.target.value; setNewExhibit({ ...newExhibit, subcategory: sub, specs: generateSpecsForCategory(newExhibit.category || DefaultCategory.MISC, sub), condition: getDefaultCondition(newExhibit.category || DefaultCategory.MISC, sub) }); }} className={`w-full appearance-none bg-transparent border-b-2 p-2 font-mono text-sm focus:outline-none ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}><option value="">- Выберите -</option>{CATEGORY_SUBCATEGORIES[newExhibit.category || DefaultCategory.MISC]?.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                     <ChevronDown className="absolute right-2 top-3 opacity-50 pointer-events-none" size={14} />
                                 </div>
                             </div>
                         </div>
                         <div><label className="block text-[10px] font-pixel uppercase opacity-70 mb-1">ОПИСАНИЕ</label><textarea value={newExhibit.description || ''} onChange={e => setNewExhibit({...newExhibit, description: e.target.value})} className="w-full bg-transparent border-2 p-2 font-mono text-sm h-32 rounded focus:outline-none" placeholder="История предмета..." /></div>
                         <div>
                             <label className="block text-[10px] font-pixel uppercase opacity-70 mb-2">ИЗОБРАЖЕНИЯ</label>
                             <div className="flex flex-wrap gap-4">
                                 {newExhibit.imageUrls?.map((url, idx) => (<div key={idx} className="relative w-20 h-20 border rounded overflow-hidden group"><img src={url} className="w-full h-full object-cover" /><button onClick={() => removeImage(idx)} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button></div>))}
                                 <label className="w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors opacity-50 hover:opacity-100"><Camera size={24} /><span className="text-[9px] mt-1">ADD</span><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label>
                             </div>
                         </div>
                         <div><label className="block text-[10px] font-pixel uppercase opacity-70 mb-1">ВИДЕО</label><div className="flex items-center gap-2 border-b-2 p-2"><Video size={16} className="opacity-50" /><input value={newExhibit.videoUrl || ''} onChange={e => setNewExhibit({...newExhibit, videoUrl: e.target.value})} className="w-full bg-transparent font-mono text-sm focus:outline-none" placeholder="https://..." /></div></div>
                         <div><label className="block text-[10px] font-pixel uppercase opacity-70 mb-1">СОСТОЯНИЕ</label><div className="flex flex-wrap gap-2">{getConditionsList(newExhibit.category || DefaultCategory.MISC, newExhibit.subcategory).map(c => (<button key={c} onClick={() => setNewExhibit({...newExhibit, condition: c})} className={`px-3 py-1 rounded text-[10px] font-bold border transition-colors ${newExhibit.condition === c ? (theme === 'dark' ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : 'border-gray-500 opacity-50 hover:opacity-100'}`}>{c}</button>))}</div></div>
                         <div><label className="block text-[10px] font-pixel uppercase opacity-70 mb-2">ХАРАКТЕРИСТИКИ</label><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Object.keys(newExhibit.specs || {}).map(key => (<div key={key}><label className="text-[9px] opacity-60 mb-0.5 block">{key}</label><input value={newExhibit.specs?.[key] || ''} onChange={e => setNewExhibit({...newExhibit, specs: { ...newExhibit.specs, [key]: e.target.value }})} list={`suggestions-${key}`} className="w-full bg-transparent border-b p-1 font-mono text-xs focus:outline-none" />{COMMON_SPEC_VALUES[key] && (<datalist id={`suggestions-${key}`}>{COMMON_SPEC_VALUES[key].map(v => <option key={v} value={v} />)}</datalist>)}</div>))}</div></div>
                         <div className="flex gap-4 pt-4"><button onClick={() => handleSaveExhibit(false)} disabled={isLoading} className={`flex-1 py-3 font-bold font-pixel uppercase rounded transition-colors ${theme === 'dark' ? 'bg-dark-primary text-black hover:bg-white' : 'bg-light-accent text-white hover:bg-black'}`}>{isLoading ? 'СОХРАНЕНИЕ...' : 'ОПУБЛИКОВАТЬ'}</button><button onClick={() => handleSaveExhibit(true)} disabled={isLoading} className="px-4 py-3 border rounded hover:bg-white/10 font-bold font-pixel uppercase text-xs">В ЧЕРНОВИК</button></div>
                     </div>
                 </div>
            )}

            {/* USER PROFILE (UNCHANGED LOGIC) */}
            {view === 'USER_PROFILE' && (
                <UserProfileView 
                    user={user!}
                    viewedProfileUsername={viewedProfileUsername}
                    exhibits={exhibits}
                    collections={collections}
                    guestbook={guestbook}
                    theme={theme}
                    onBack={handleBack}
                    onLogout={handleLogout}
                    onFollow={async (username) => {
                         if (!user) return;
                         const isFollowing = user.following.includes(username);
                         const newFollowing = isFollowing ? user.following.filter(u => u !== username) : [...user.following, username];
                         const updatedUser = { ...user, following: newFollowing };
                         setUser(updatedUser);
                         await db.updateUserProfile(updatedUser);
                    }}
                    onChat={handleOpenChat}
                    onExhibitClick={handleExhibitClick}
                    onLike={(id, e) => handleLike(id, e)}
                    onFavorite={() => {}}
                    onAuthorClick={handleAuthorClick}
                    onCollectionClick={handleCollectionClick} 
                    onShareCollection={() => {}}
                    onViewHallOfFame={() => setView('HALL_OF_FAME')}
                    onGuestbookPost={async () => {
                         if (!user || !guestbookInput.trim()) return;
                         const entry: GuestbookEntry = { id: crypto.randomUUID(), author: user.username, targetUser: viewedProfileUsername, text: guestbookInput, timestamp: new Date().toLocaleString(), isRead: false };
                         await db.saveGuestbookEntry(entry);
                         setGuestbookInput('');
                         refreshData();
                    }}
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
                    onSaveProfile={async () => {
                          if (!user) return;
                          const updatedUser: UserProfile = { ...user, tagline: editTagline, status: editStatus, telegram: editTelegram, password: editPassword ? editPassword : user.password };
                          await db.updateUserProfile(updatedUser);
                          setUser(updatedUser);
                          setIsEditingProfile(false);
                          setEditPassword('');
                    }}
                    onProfileImageUpload={async (e) => {
                          if (e.target.files && e.target.files[0] && user) {
                              const b64 = await db.fileToBase64(e.target.files[0]);
                              const updated = { ...user, avatarUrl: b64 };
                              await db.updateUserProfile(updated);
                              setUser(updated);
                          }
                    }}
                    guestbookInput={guestbookInput}
                    setGuestbookInput={setGuestbookInput}
                    guestbookInputRef={guestbookInputRef}
                    profileTab={profileTab}
                    setProfileTab={setProfileTab}
                />
            )}

            {/* EXHIBIT DETAIL (UNCHANGED) */}
            {view === 'EXHIBIT' && selectedExhibit && (
                <ExhibitDetailPage 
                    exhibit={selectedExhibit}
                    theme={theme}
                    onBack={handleBack}
                    onShare={() => {}}
                    onFavorite={() => {}}
                    onLike={(id) => handleLike(id)}
                    isFavorited={false}
                    isLiked={selectedExhibit.likedBy?.includes(user?.username || '') || false}
                    onPostComment={async (id, text) => {
                          if (!user) return;
                          const ex = exhibits.find(e => e.id === id);
                          if (!ex) return;
                          const newComment = { id: crypto.randomUUID(), author: user.username, text, timestamp: new Date().toLocaleString(), likes: 0, likedBy: [] };
                          const updatedEx = { ...ex, comments: [...(ex.comments || []), newComment] };
                          await db.updateExhibit(updatedEx);
                          refreshData();
                          if (selectedExhibit?.id === id) setSelectedExhibit(updatedEx);
                    }}
                    onAuthorClick={handleAuthorClick}
                    onFollow={() => {}}
                    onMessage={handleOpenChat}
                    currentUser={user?.username || ''}
                    isAdmin={user?.isAdmin || false}
                    isFollowing={user?.following.includes(selectedExhibit.owner) || false}
                    onDelete={handleDeleteExhibit}
                    onEdit={handleEditExhibit}
                />
            )}
            
            {/* COLLECTION DETAIL + ADD ARTIFACT MODAL */}
            {view === 'COLLECTION_DETAIL' && selectedCollection && (
                <div className="animate-in fade-in pb-20 relative">
                     <button onClick={handleBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs mb-6"><ArrowLeft size={16} /> НАЗАД</button>
                     <div className="mb-8 relative rounded-xl overflow-hidden border-2 border-gray-500/30 aspect-[21/9]"><img src={selectedCollection.coverImage} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-6"><h1 className="text-3xl font-pixel font-bold text-white mb-2">{selectedCollection.title}</h1><p className="text-white/80 font-mono text-sm max-w-2xl mb-4">{selectedCollection.description}</p><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-white/70 text-xs font-mono cursor-pointer hover:text-white" onClick={() => handleAuthorClick(selectedCollection.owner)}><User size={14} /> @{selectedCollection.owner}</div>{user?.username === selectedCollection.owner && <button onClick={() => { setCollectionToEdit(selectedCollection); setView('EDIT_COLLECTION'); }} className="p-2 bg-white/20 hover:bg-white/40 text-white rounded"><Edit2 size={16} /></button>}</div></div></div>
                     
                     {/* ADD ARTIFACT BUTTON */}
                     {user?.username === selectedCollection.owner && (
                         <div className="mb-6 flex justify-end">
                             <button onClick={() => setIsAddingToCollection(true)} className={`px-4 py-2 rounded font-bold font-pixel text-xs flex items-center gap-2 ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}>
                                 <Plus size={16} /> ДОБАВИТЬ АРТЕФАКТ
                             </button>
                         </div>
                     )}

                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {exhibits.filter(e => selectedCollection.exhibitIds.includes(e.id)).map(item => (
                            <ExhibitCard key={item.id} item={item} theme={theme} similarExhibits={[]} onClick={handleExhibitClick} isLiked={item.likedBy?.includes(user?.username || '') || false} isFavorited={false} onLike={(e) => handleLike(item.id, e)} onFavorite={() => {}} onAuthorClick={handleAuthorClick} />
                        ))}
                     </div>

                     {/* ADD MODAL */}
                     {isAddingToCollection && (
                         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                             <div className={`w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border-2 p-6 ${theme === 'dark' ? 'bg-black border-dark-dim' : 'bg-white border-light-dim'}`}>
                                 <div className="flex justify-between items-center mb-4">
                                     <h2 className="font-pixel text-lg">ВЫБЕРИТЕ АРТЕФАКТ</h2>
                                     <button onClick={() => setIsAddingToCollection(false)}><X size={20}/></button>
                                 </div>
                                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                     {exhibits.filter(e => e.owner === user?.username && !selectedCollection.exhibitIds.includes(e.id)).map(item => (
                                         <div key={item.id} onClick={() => handleAddArtifactToCollection(item.id)} className="cursor-pointer opacity-70 hover:opacity-100 hover:scale-105 transition-all">
                                             <div className="aspect-square bg-gray-500/20 rounded mb-2 overflow-hidden"><img src={item.imageUrls[0]} className="w-full h-full object-cover" /></div>
                                             <div className="font-bold text-xs truncate">{item.title}</div>
                                         </div>
                                     ))}
                                     {exhibits.filter(e => e.owner === user?.username && !selectedCollection.exhibitIds.includes(e.id)).length === 0 && (
                                         <div className="col-span-full text-center opacity-50 py-10 font-mono text-sm">НЕТ ДОСТУПНЫХ АРТЕФАКТОВ</div>
                                     )}
                                 </div>
                             </div>
                         </div>
                     )}
                </div>
            )}

            {view === 'MY_COLLECTION' && user && (
                 <MyCollection 
                    theme={theme}
                    user={user}
                    exhibits={exhibits.filter(e => e.owner === user.username)}
                    collections={collections.filter(c => c.owner === user.username)}
                    onBack={handleBack}
                    onExhibitClick={handleExhibitClick}
                    onCollectionClick={(c) => { setCollectionToEdit(c); setView('EDIT_COLLECTION'); }}
                    onLike={(id, e) => handleLike(id, e)}
                 />
            )}

            {view === 'HALL_OF_FAME' && user && (
                <HallOfFame 
                    theme={theme}
                    achievedIds={user.achievements || []}
                    onBack={handleBack}
                />
            )}

            {(view === 'CREATE_COLLECTION' || view === 'EDIT_COLLECTION') && (
                <div className="max-w-xl mx-auto animate-in fade-in">
                     <button onClick={handleBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs mb-6"><ArrowLeft size={16} /> НАЗАД</button>
                     <h2 className="font-pixel text-xl mb-6 flex items-center gap-2"><FolderPlus /> {view === 'EDIT_COLLECTION' ? 'РЕДАКТИРОВАТЬ КОЛЛЕКЦИЮ' : 'НОВАЯ КОЛЛЕКЦИЯ'}</h2>
                     <div className={`p-6 rounded-xl border-2 space-y-6 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                          <div><label className="block text-[10px] font-pixel uppercase opacity-70 mb-1">НАЗВАНИЕ</label><input value={view === 'EDIT_COLLECTION' ? collectionToEdit?.title || '' : newCollection.title || ''} onChange={e => view === 'EDIT_COLLECTION' ? setCollectionToEdit((prev: any) => ({...prev!, title: e.target.value})) : setNewCollection((prev: any) => ({...prev, title: e.target.value}))} className="w-full bg-transparent border-b-2 p-2 font-mono text-sm focus:outline-none" placeholder="Моя ретро полка" /></div>
                          <div><label className="block text-[10px] font-pixel uppercase opacity-70 mb-1">ОПИСАНИЕ</label><textarea value={view === 'EDIT_COLLECTION' ? collectionToEdit?.description || '' : newCollection.description || ''} onChange={e => view === 'EDIT_COLLECTION' ? setCollectionToEdit((prev: any) => ({...prev!, description: e.target.value})) : setNewCollection((prev: any) => ({...prev, description: e.target.value}))} className="w-full bg-transparent border-2 p-2 font-mono text-sm h-24 rounded focus:outline-none" placeholder="О чем эта коллекция?" /></div>
                          <div><label className="block text-[10px] font-pixel uppercase opacity-70 mb-2">ОБЛОЖКА</label><div className="relative aspect-video rounded border-2 border-dashed overflow-hidden group flex items-center justify-center cursor-pointer hover:bg-white/5">{(view === 'EDIT_COLLECTION' ? collectionToEdit?.coverImage : newCollection.coverImage) ? (<img src={view === 'EDIT_COLLECTION' ? collectionToEdit?.coverImage : newCollection.coverImage} className="w-full h-full object-cover" />) : (<div className="text-center opacity-50"><ImageIcon size={32} className="mx-auto mb-2" /><span className="text-xs">ЗАГРУЗИТЬ ОБЛОЖКУ</span></div>)}<input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleCollectionCoverUpload} /></div></div>
                          <div className="flex gap-4 pt-4"><button onClick={view === 'EDIT_COLLECTION' ? handleSaveCollection : handleCreateCollection} disabled={isLoading} className={`flex-1 py-3 font-bold font-pixel uppercase rounded transition-colors ${theme === 'dark' ? 'bg-dark-primary text-black hover:bg-white' : 'bg-light-accent text-white hover:bg-black'}`}>{isLoading ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}</button>{view === 'EDIT_COLLECTION' && (<button onClick={handleDeleteCollection} className="px-4 py-3 border border-red-500 text-red-500 rounded hover:bg-red-500/10 font-bold font-pixel uppercase text-xs">УДАЛИТЬ</button>)}</div>
                     </div>
                </div>
            )}
            
            {/* NEW ACTIVITY VIEW */}
            {view === 'ACTIVITY' && user && (
                <ActivityView 
                    notifications={notifications}
                    messages={messages}
                    currentUser={user}
                    theme={theme}
                    onAuthorClick={handleAuthorClick}
                    onExhibitClick={(id) => { const e = exhibits.find(x => x.id === id); if(e) handleExhibitClick(e); }}
                    onChatClick={handleOpenChat}
                />
            )}
            
            {view === 'DIRECT_CHAT' && chatPartner && (
                <div className="max-w-2xl mx-auto h-[calc(100vh-160px)] flex flex-col animate-in fade-in">
                    <div className="flex items-center gap-3 border-b border-gray-500/30 pb-4 mb-4"><button onClick={handleBack}><ArrowLeft size={20}/></button><div className="w-8 h-8 rounded-full overflow-hidden bg-gray-500"><img src={db.getUserAvatar(chatPartner)} /></div><span className="font-bold font-pixel">@{chatPartner}</span></div>
                    <div className="flex-1 overflow-y-auto space-y-4 p-2 scrollbar-hide flex flex-col-reverse">
                        {[...messages].sort((a,b) => b.timestamp.localeCompare(a.timestamp)).filter(m => (m.sender === user?.username && m.receiver === chatPartner) || (m.sender === chatPartner && m.receiver === user?.username)).map(m => (
                            <div key={m.id} className={`flex ${m.sender === user?.username ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] p-3 rounded-xl text-sm font-mono ${m.sender === user?.username ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') : (theme === 'dark' ? 'bg-white/10' : 'bg-black/5')}`}>{m.text}<div className="text-[9px] opacity-50 text-right mt-1">{m.timestamp.split(',')[1]}</div></div></div>
                        ))}
                    </div>
                    <div className="pt-4 flex gap-2"><input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-transparent border rounded-full px-4 py-2 font-mono text-sm focus:outline-none focus:border-green-500" placeholder="Сообщение..." /><button onClick={handleSendMessage} className="p-2 rounded-full bg-green-500 text-black hover:bg-green-400 transition-colors"><Send size={18} /></button></div>
                </div>
            )}

            {view === 'SETTINGS' && (
                <div className="max-w-md mx-auto">
                    <StorageMonitor theme={theme} />
                </div>
            )}

        </main>
        
        {/* Navigation Bar Mobile */}
        <nav className={`fixed bottom-0 left-0 right-0 h-16 border-t md:hidden flex justify-around items-center z-50 ${theme === 'dark' ? 'bg-black border-dark-dim' : 'bg-white border-light-dim'}`}>
            <button onClick={() => { if(view !== 'FEED') { setView('FEED'); window.scrollTo(0,0); } }} className={`flex flex-col items-center gap-1 ${view === 'FEED' ? 'text-green-500' : 'opacity-50'}`}>
                <LayoutGrid size={20} />
                <span className="text-[9px] font-pixel">FEED</span>
            </button>
            <button onClick={() => { setView('SEARCH'); window.scrollTo(0,0); }} className={`flex flex-col items-center gap-1 ${view === 'SEARCH' ? 'text-green-500' : 'opacity-50'}`}>
                <Search size={20} />
                <span className="text-[9px] font-pixel">FIND</span>
            </button>
            <button onClick={() => setView('CREATE_HUB')} className={`p-3 -mt-6 rounded-full border-2 ${theme === 'dark' ? 'bg-black border-green-500 text-green-500' : 'bg-white border-green-600 text-green-600'}`}>
                <PlusCircle size={24} />
            </button>
            <button onClick={() => setView('ACTIVITY')} className={`flex flex-col items-center gap-1 ${view === 'ACTIVITY' ? 'text-green-500' : 'opacity-50'}`}>
                <Bell size={20} />
                <span className="text-[9px] font-pixel">NOTIF</span>
            </button>
            <button onClick={() => { if(user) { setViewedProfileUsername(user.username); setView('USER_PROFILE'); } }} className={`flex flex-col items-center gap-1 ${view === 'USER_PROFILE' ? 'text-green-500' : 'opacity-50'}`}>
                <User size={20} />
                <span className="text-[9px] font-pixel">ME</span>
            </button>
        </nav>
    </div>
  );
}
