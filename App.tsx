
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, User, PlusCircle, Search, Bell, X, Package, Grid, RefreshCw, Sun, Moon, Zap, FolderPlus, ArrowLeft,
  MessageSquare, Send, Image as ImageIcon, Plus, Trash2, Edit3, ChevronRight, BookmarkPlus, Camera, Layers, Archive, History,
  Check, Wand2, Eye, EyeOff, Shield, Settings, Info, Trophy, Save
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

import * as db from './services/storageService';
import { UserProfile, Exhibit, Collection, ViewState, Notification, Message, GuestbookEntry } from './types';
import { DefaultCategory, calculateArtifactScore, CATEGORY_SUBCATEGORIES, CATEGORY_SPECS_TEMPLATES, CATEGORY_CONDITIONS } from './constants';

const SkeletonCard = () => (
    <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden animate-pulse">
        <div className="aspect-square bg-white/10" />
        <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 bg-white/10 rounded" />
            <div className="h-3 w-1/2 bg-white/10 rounded" />
        </div>
    </div>
);

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [view, setView] = useState<ViewState>('AUTH');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [viewedProfileUsername, setViewedProfileUsername] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ВСЕ');
  const [feedMode, setFeedMode] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');

  // Social list state
  const [socialListType, setSocialListType] = useState<'followers' | 'following'>('followers');

  // Item States
  const [newArtifact, setNewArtifact] = useState<Partial<Exhibit>>({ title: '', description: '', category: DefaultCategory.PHONES, specs: {}, imageUrls: [] });
  const [newCollection, setNewCollection] = useState<Partial<Collection>>({ title: '', description: '', exhibitIds: [] });
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  // Modal states
  const [isAddingToCollection, setIsAddingToCollection] = useState<string | null>(null);

  // Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editStatus, setEditStatus] = useState<any>('ONLINE');
  const [editTelegram, setEditTelegram] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');
  const [guestbookInput, setGuestbookInput] = useState('');
  const guestbookInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const safetyTimer = setTimeout(() => { setIsInitializing(false); setShowSplash(false); }, 4000);
    const init = async () => {
      try {
          const activeUser = await db.initializeDatabase();
          if (activeUser) { 
            setUser(activeUser); 
            setView('FEED'); 
          } 
          else { setView('AUTH'); }
      } catch (e) { setView('AUTH'); } 
      finally { 
          clearTimeout(safetyTimer); 
          refreshData();
          setIsInitializing(false); 
          setTimeout(() => setShowSplash(false), 300); 
      }
    };
    init();
  }, []);

  // Poll for data updates when active
  useEffect(() => {
    if (view !== 'AUTH' && !isInitializing) {
        const interval = setInterval(refreshData, 10000);
        return () => clearInterval(interval);
    }
  }, [view, isInitializing]);

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

  const handleManualRefresh = async () => {
      setIsLoadingFeed(true);
      await db.forceSync();
      refreshData();
      setTimeout(() => setIsLoadingFeed(false), 800);
  };

  const handleExhibitClick = (item: Exhibit) => {
    const updated = { ...item, views: (item.views || 0) + 1 };
    db.updateExhibit(updated);
    setSelectedExhibit(updated);
    setView('EXHIBIT');
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

  const handleFollow = async (username: string) => {
      if(!user) return;
      await db.toggleFollow(user.username, username);
      refreshData();
  };

  const filteredExhibits = exhibits.filter(e => {
      if (e.isDraft) return false;
      if (selectedCategory !== 'ВСЕ' && e.category !== selectedCategory) return false;
      if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
  });

  let followingExhibits: Exhibit[] = [];
  let recommendedExhibits: Exhibit[] = [];

  if (user && !searchQuery && selectedCategory === 'ВСЕ') {
      followingExhibits = filteredExhibits.filter(e => user.following.includes(e.owner));
      recommendedExhibits = filteredExhibits.filter(e => !user.following.includes(e.owner));
      recommendedExhibits.sort((a,b) => calculateArtifactScore(b, user.preferences) - calculateArtifactScore(a, user.preferences));
      followingExhibits.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
  } else {
      recommendedExhibits = filteredExhibits.sort((a,b) => calculateArtifactScore(b, user?.preferences) - calculateArtifactScore(a, user?.preferences));
  }

  const handleOpenSocial = (username: string, type: 'followers' | 'following') => {
      setViewedProfileUsername(username);
      setSocialListType(type);
      setView('SOCIAL_LIST');
  };

  const handleSaveArtifact = async (asDraft: boolean = false) => {
      if (!user || !newArtifact.title) return;
      const exhibit: Exhibit = {
          id: crypto.randomUUID(),
          title: newArtifact.title || 'Untitled',
          description: newArtifact.description || '',
          category: newArtifact.category || DefaultCategory.MISC,
          subcategory: newArtifact.subcategory,
          imageUrls: newArtifact.imageUrls || [],
          owner: user.username,
          timestamp: new Date().toLocaleString(),
          likes: 0,
          likedBy: [],
          views: 0,
          specs: newArtifact.specs || {},
          comments: [],
          isDraft: asDraft,
          quality: 'MINT'
      };
      await db.saveExhibit(exhibit);
      setNewArtifact({ title: '', description: '', category: DefaultCategory.PHONES, specs: {}, imageUrls: [] });
      setView('FEED');
      refreshData();
  };

  const handleSaveCollection = async () => {
    if (!user || !newCollection.title) return;
    const collection: Collection = {
        id: crypto.randomUUID(),
        title: newCollection.title,
        description: newCollection.description || '',
        owner: user.username,
        coverImage: newCollection.coverImage || 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
        exhibitIds: newCollection.exhibitIds || [],
        timestamp: new Date().toLocaleString()
    };
    await db.saveCollection(collection);
    setNewCollection({ title: '', description: '', exhibitIds: [] });
    setView('FEED');
    refreshData();
  };

  const handleUpdateCollection = async () => {
      if (!user || !editingCollection) return;
      await db.updateCollection(editingCollection);
      setEditingCollection(null);
      setView('FEED');
      refreshData();
  };

  const handleAddToCollection = async (collectionId: string) => {
    if (!isAddingToCollection) return;
    const collection = collections.find(c => c.id === collectionId);
    if (collection && !collection.exhibitIds.includes(isAddingToCollection)) {
        const updated = { ...collection, exhibitIds: [...collection.exhibitIds, isAddingToCollection] };
        await db.updateCollection(updated);
        refreshData();
    }
    setIsAddingToCollection(null);
  };

  if (showSplash) {
    return (
      <div className={`fixed inset-0 z-[1000] bg-black flex items-center justify-center text-green-500 overflow-hidden transition-opacity duration-700 ${!isInitializing ? 'opacity-0 scale-105 pointer-events-none' : ''}`}>
        <MatrixRain theme="dark" />
        <div className="relative z-10 text-center animate-pulse">
          <div className="font-pixel text-4xl tracking-[1em] mb-4 drop-shadow-[0_0_15px_#4ade80]">NEOARCHIVE</div>
          <RetroLoader text="SYNCHRONIZING_NODE" size="lg" />
        </div>
        <CRTOverlay />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${theme === 'dark' ? 'bg-black text-gray-200' : 'bg-gray-100 text-gray-900'} ${view === 'AUTH' ? 'overflow-hidden' : ''}`}>
        <SEO title="NeoArchive | Цифровая полка коллекционера" />
        <MatrixRain theme={theme} />
        <PixelSnow theme={theme} />
        <CRTOverlay />
        
        {view !== 'AUTH' && (
          <header className={`fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-xl transition-all duration-300 ${theme === 'dark' ? 'bg-black/60' : 'bg-white/80'}`}>
              <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                      <div className="font-pixel text-lg font-black tracking-widest cursor-pointer group" onClick={() => setView('FEED')}>
                          NEO<span className="text-green-500 transition-colors group-hover:text-white">ARCHIVE</span>
                      </div>
                      <div className={`hidden md:flex items-center px-4 py-1.5 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                          <Search size={14} className="opacity-40 mr-2" />
                          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="SEARCH_DATABASE..." className="bg-transparent border-none outline-none text-xs font-mono w-64" />
                          {searchQuery && <button onClick={() => setSearchQuery('')}><X size={12}/></button>}
                      </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-4">
                      <button onClick={handleManualRefresh} disabled={isLoadingFeed} className={`p-2 hover:bg-white/10 rounded-xl transition-all ${isLoadingFeed ? 'animate-spin' : ''}`}>
                          <RefreshCw size={18} />
                      </button>
                      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 hover:bg-white/10 rounded-xl">
                          {theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
                      </button>
                      <button onClick={() => setView('ACTIVITY')} className="relative p-2 hover:bg-white/10 rounded-xl">
                          <Bell size={20} />
                          {notifications.some(n => !n.isRead && n.recipient === user?.username) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-black animate-pulse" />}
                      </button>
                      {user && (
                          <div className="w-10 h-10 rounded-full border-2 border-green-500/30 p-0.5 cursor-pointer hover:scale-105 transition-all" onClick={() => { setViewedProfileUsername(user.username); setView('USER_PROFILE'); }}>
                              <img src={user.avatarUrl} className="w-full h-full object-cover rounded-full" />
                          </div>
                      )}
                  </div>
              </div>
          </header>
        )}

        <main className={`pt-20 pb-28 px-4 max-w-7xl mx-auto min-h-screen relative z-10 transition-all duration-700 ${!isInitializing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            
            {view === 'AUTH' && <MatrixLogin theme={theme} onLogin={(u) => { setUser(u); setView('FEED'); refreshData(); }} />}

            {(view === 'FEED' || view === 'SEARCH') && (
                <div className="space-y-8 animate-in fade-in zoom-in-95">
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide no-scrollbar mask-fade-right">
                         <button onClick={() => setSelectedCategory('ВСЕ')} className={`px-5 py-2 rounded-xl font-pixel text-[10px] font-bold whitespace-nowrap border transition-all ${selectedCategory === 'ВСЕ' ? 'bg-green-500 border-green-500 text-black shadow-[0_0_15px_rgba(74,222,128,0.4)]' : 'border-white/10 opacity-50'}`}>ВСЕ</button>
                         {Object.values(DefaultCategory).map(cat => (
                             <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2 rounded-xl font-pixel text-[10px] font-bold whitespace-nowrap border transition-all ${selectedCategory === cat ? 'bg-green-500 border-green-500 text-black shadow-[0_0_15px_rgba(74,222,128,0.4)]' : 'border-white/10 opacity-50'}`}>{cat}</button>
                         ))}
                    </div>
                    
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex gap-6">
                            <button onClick={() => setFeedMode('ARTIFACTS')} className={`flex items-center gap-2 font-pixel text-[11px] tracking-widest ${feedMode === 'ARTIFACTS' ? 'text-green-500 border-b-2 border-green-500 pb-4' : 'opacity-40 hover:opacity-100 transition-all'}`}><Grid size={14} /> АРТЕФАКТЫ</button>
                            <button onClick={() => setFeedMode('COLLECTIONS')} className={`flex items-center gap-2 font-pixel text-[11px] tracking-widest ${feedMode === 'COLLECTIONS' ? 'text-green-500 border-b-2 border-green-500 pb-4' : 'opacity-40 hover:opacity-100 transition-all'}`}><FolderPlus size={14} /> КОЛЛЕКЦИИ</button>
                        </div>
                    </div>
                    
                    {isLoadingFeed ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                            {Array.from({length: 8}).map((_, i) => <SkeletonCard key={i}/>)}
                        </div>
                    ) : feedMode === 'ARTIFACTS' ? (
                        <div className="space-y-10">
                            {followingExhibits.length > 0 && (
                                <div>
                                    <h2 className="font-pixel text-[10px] opacity-50 mb-4 flex items-center gap-2 tracking-[0.2em] uppercase">
                                        <Zap size={14} className="text-yellow-500" /> ПОДПИСКИ
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                                        {followingExhibits.map(item => (
                                            <ExhibitCard key={item.id} item={item} theme={theme} onClick={handleExhibitClick} isLiked={item.likedBy?.includes(user?.username || '')} onLike={(e) => handleLike(item.id, e)} onAuthorClick={(author) => { setViewedProfileUsername(author); setView('USER_PROFILE'); }} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h2 className="font-pixel text-[10px] opacity-50 mb-4 flex items-center gap-2 tracking-[0.2em] uppercase">
                                    <Grid size={14} className="text-green-500" /> {followingExhibits.length > 0 ? 'РЕКОМЕНДАЦИИ' : 'ВСЕ АРТЕФАКТЫ'}
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                                    {recommendedExhibits.map(item => (
                                        <ExhibitCard key={item.id} item={item} theme={theme} onClick={handleExhibitClick} isLiked={item.likedBy?.includes(user?.username || '')} onLike={(e) => handleLike(item.id, e)} onAuthorClick={(author) => { setViewedProfileUsername(author); setView('USER_PROFILE'); }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {collections.map(col => ( <CollectionCard key={col.id} col={col} theme={theme} onClick={(c) => { setSelectedCollection(c); setView('COLLECTION_DETAIL'); }} onShare={() => {}} /> ))}
                        </div>
                    )}
                </div>
            )}

            {view === 'EXHIBIT' && selectedExhibit && (
                <ExhibitDetailPage 
                    exhibit={selectedExhibit} theme={theme} onBack={() => setView('FEED')} onShare={() => {}} onFavorite={() => {}} onLike={(id) => handleLike(id)} isFavorited={false} isLiked={selectedExhibit.likedBy?.includes(user?.username || '')} onPostComment={async (id, text) => { if (!user) return; const ex = exhibits.find(e => e.id === id); if (!ex) return; const newComment = { id: crypto.randomUUID(), author: user.username, text, timestamp: new Date().toLocaleString(), likes: 0, likedBy: [] }; const updatedEx = { ...ex, comments: [...(ex.comments || []), newComment] }; await db.updateExhibit(updatedEx); refreshData(); if (selectedExhibit?.id === id) setSelectedExhibit(updatedEx); }} onAuthorClick={(a) => { setViewedProfileUsername(a); setView('USER_PROFILE'); }} onFollow={handleFollow} onMessage={(u) => { setViewedProfileUsername(u); setView('DIRECT_CHAT'); }} currentUser={user?.username || ''} isAdmin={user?.isAdmin || false} isFollowing={user?.following.includes(selectedExhibit.owner) || false}
                    onAddToCollection={(id) => setIsAddingToCollection(id)}
                />
            )}

            {view === 'CREATE_HUB' && (
                <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
                    <h2 className="text-2xl font-pixel font-bold mb-8 flex items-center gap-4"><PlusCircle size={32} className="text-green-500" /> СОЗДАНИЕ</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div onClick={() => { setView('CREATE_ARTIFACT'); setNewArtifact({ title: '', description: '', category: DefaultCategory.PHONES, specs: {}, imageUrls: [] }); }} className="p-8 border-2 border-white/10 rounded-3xl bg-white/5 hover:border-green-500 hover:bg-green-500/5 transition-all cursor-pointer group flex flex-col items-center text-center">
                             <ImageIcon size={48} className="mb-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all text-green-500" />
                             <h3 className="font-pixel text-sm mb-2">АРТЕФАКТ</h3>
                             <p className="font-mono text-[10px] opacity-40">ОДИНОЧНЫЙ ЭКСПОНАТ В БАЗЕ</p>
                         </div>
                         <div onClick={() => { setView('CREATE_COLLECTION'); setNewCollection({ title: '', description: '', exhibitIds: [] }); }} className="p-8 border-2 border-white/10 rounded-3xl bg-white/5 hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer group flex flex-col items-center text-center">
                             <FolderPlus size={48} className="mb-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all text-blue-500" />
                             <h3 className="font-pixel text-sm mb-2">КОЛЛЕКЦИЯ</h3>
                             <p className="font-mono text-[10px] opacity-40">ТЕМАТИЧЕСКАЯ ГРУППА АРТЕФАКТОВ</p>
                         </div>
                    </div>
                </div>
            )}

            {view === 'CREATE_ARTIFACT' && (
                <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 pb-20">
                    <button onClick={() => setView('CREATE_HUB')} className="flex items-center gap-2 opacity-50 font-pixel text-[10px] tracking-widest uppercase hover:opacity-100 transition-all"><ArrowLeft size={14}/> НАЗАД</button>
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-green-500/10 text-green-500 flex items-center justify-center rounded-2xl"><ImageIcon size={24}/></div><div><h2 className="font-pixel text-lg font-black uppercase">НОВЫЙ АРТЕФАКТ</h2><p className="text-[10px] font-mono opacity-40">ЗАГРУЗКА ДАННЫХ В СЕТЬ</p></div></div>
                    <div className="space-y-6">
                        <div className="group relative border-2 border-dashed border-white/10 rounded-3xl p-10 flex flex-col items-center justify-center bg-white/5 hover:border-green-500 transition-all cursor-pointer">
                            <input type="file" multiple accept="image/*" onChange={async (e) => { if(e.target.files && user) { const b64s = await Promise.all(Array.from(e.target.files).map(f => db.fileToBase64(f))); setNewArtifact(p => ({ ...p, imageUrls: [...(p.imageUrls || []), ...b64s] })); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <Camera size={40} className="mb-4 opacity-20 group-hover:opacity-100 transition-all text-green-500" />
                            <p className="font-pixel text-[10px] tracking-widest opacity-50 group-hover:opacity-100 uppercase">ЗАГРУЗИТЬ ИЗОБРАЖЕНИЯ</p>
                        </div>
                        {newArtifact.imageUrls && newArtifact.imageUrls.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                                {newArtifact.imageUrls.map((url, i) => (
                                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden group">
                                        <img src={url} className="w-full h-full object-cover" />
                                        <button onClick={() => setNewArtifact(p => ({ ...p, imageUrls: p.imageUrls?.filter((_, idx) => idx !== i) }))} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20}/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <input value={newArtifact.title} onChange={e => setNewArtifact(p => ({ ...p, title: e.target.value }))} placeholder="НАЗВАНИЕ ЭКСПОНАТА" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-pixel text-xs tracking-widest focus:border-green-500 transition-all outline-none" />
                        <textarea value={newArtifact.description} onChange={e => setNewArtifact(p => ({ ...p, description: e.target.value }))} placeholder="ПОДРОБНОЕ ОПИСАНИЕ И ИСТОРИЯ..." rows={4} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm focus:border-green-500 transition-all outline-none resize-none" />
                        <div className="grid grid-cols-2 gap-4">
                            <select value={newArtifact.category} onChange={e => setNewArtifact(p => ({ ...p, category: e.target.value }))} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-pixel text-[10px] tracking-widest appearance-none outline-none focus:border-green-500">
                                {Object.values(DefaultCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <select value={newArtifact.condition} onChange={e => setNewArtifact(p => ({ ...p, condition: e.target.value }))} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-pixel text-[10px] tracking-widest appearance-none outline-none focus:border-green-500">
                                <option value="">СОСТОЯНИЕ</option>
                                {(CATEGORY_CONDITIONS[newArtifact.category || DefaultCategory.MISC] || ['НОВЫЙ', 'БУ']).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => handleSaveArtifact(true)} className="flex-1 py-4 border border-white/10 rounded-2xl font-pixel text-[10px] tracking-widest uppercase hover:bg-white/5 transition-all">В ЧЕРНОВИК</button>
                            <button onClick={() => handleSaveArtifact(false)} className="flex-[2] py-4 bg-green-500 text-black rounded-2xl font-pixel text-[10px] tracking-widest uppercase font-black shadow-[0_0_20px_rgba(74,222,128,0.4)]">ОПУБЛИКОВАТЬ</button>
                        </div>
                    </div>
                </div>
            )}

            {view === 'CREATE_COLLECTION' && (
                <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 pb-20">
                    <button onClick={() => setView('CREATE_HUB')} className="flex items-center gap-2 opacity-50 font-pixel text-[10px] tracking-widest uppercase hover:opacity-100 transition-all"><ArrowLeft size={14}/> НАЗАД</button>
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-blue-500/10 text-blue-500 flex items-center justify-center rounded-2xl"><FolderPlus size={24}/></div><div><h2 className="font-pixel text-lg font-black uppercase">НОВАЯ КОЛЛЕКЦИЯ</h2><p className="text-[10px] font-mono opacity-40">ГРУППИРОВКА АРТЕФАКТОВ</p></div></div>
                    <div className="space-y-6">
                        <input value={newCollection.title} onChange={e => setNewCollection(p => ({ ...p, title: e.target.value }))} placeholder="ЗАГОЛОВОК КОЛЛЕКЦИИ" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-pixel text-xs tracking-widest focus:border-blue-500 transition-all outline-none" />
                        <textarea value={newCollection.description} onChange={e => setNewCollection(p => ({ ...p, description: e.target.value }))} placeholder="О ЧЕМ ЭТА КОЛЛЕКЦИЯ?" rows={3} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm focus:border-blue-500 transition-all outline-none resize-none" />
                        <div>
                            <h3 className="font-pixel text-[10px] opacity-40 mb-4 uppercase tracking-[0.2em]">ВЫБЕРИТЕ ВАШИ АРТЕФАКТЫ</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {exhibits.filter(e => e.owner === user?.username && !e.isDraft).map(ex => (
                                    <div key={ex.id} onClick={() => setNewCollection(p => ({ ...p, exhibitIds: p.exhibitIds?.includes(ex.id) ? p.exhibitIds.filter(id => id !== ex.id) : [...(p.exhibitIds || []), ex.id] }))} className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${newCollection.exhibitIds?.includes(ex.id) ? 'border-blue-500 scale-95 shadow-lg' : 'border-white/5 opacity-50'}`}>
                                        <img src={ex.imageUrls[0]} className="w-full h-full object-cover" />
                                        {newCollection.exhibitIds?.includes(ex.id) && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><Check size={32} className="text-white drop-shadow-md" /></div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleSaveCollection} className="w-full py-5 bg-blue-500 text-white rounded-2xl font-pixel text-[10px] tracking-widest uppercase font-black shadow-[0_0_20px_rgba(59,130,246,0.4)]">СОЗДАТЬ КОЛЛЕКЦИЮ</button>
                    </div>
                </div>
            )}

            {view === 'EDIT_COLLECTION' && editingCollection && (
                <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 pb-20">
                    <button onClick={() => setView('COLLECTION_DETAIL')} className="flex items-center gap-2 opacity-50 font-pixel text-[10px] tracking-widest uppercase hover:opacity-100 transition-all"><ArrowLeft size={14}/> ОТМЕНА</button>
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-purple-500/10 text-purple-500 flex items-center justify-center rounded-2xl"><Edit3 size={24}/></div><div><h2 className="font-pixel text-lg font-black uppercase">РЕДАКТОР КОЛЛЕКЦИИ</h2><p className="text-[10px] font-mono opacity-40">ОБНОВЛЕНИЕ ДАННЫХ УЗЛА</p></div></div>
                    <div className="space-y-6">
                        <input value={editingCollection.title} onChange={e => setEditingCollection(p => p ? ({ ...p, title: e.target.value }) : null)} placeholder="ЗАГОЛОВОК КОЛЛЕКЦИИ" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-pixel text-xs tracking-widest focus:border-purple-500 transition-all outline-none" />
                        <textarea value={editingCollection.description} onChange={e => setEditingCollection(p => p ? ({ ...p, description: e.target.value }) : null)} placeholder="О ЧЕМ ЭТА КОЛЛЕКЦИЯ?" rows={3} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm focus:border-purple-500 transition-all outline-none resize-none" />
                        <div>
                            <h3 className="font-pixel text-[10px] opacity-40 mb-4 uppercase tracking-[0.2em]">ВЫБЕРИТЕ ВАШИ АРТЕФАКТЫ</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {exhibits.filter(e => e.owner === user?.username && !e.isDraft).map(ex => (
                                    <div key={ex.id} onClick={() => setEditingCollection(p => {
                                        if(!p) return null;
                                        const ids = p.exhibitIds.includes(ex.id) ? p.exhibitIds.filter(id => id !== ex.id) : [...p.exhibitIds, ex.id];
                                        return { ...p, exhibitIds: ids };
                                    })} className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${editingCollection.exhibitIds.includes(ex.id) ? 'border-purple-500 scale-95 shadow-lg' : 'border-white/5 opacity-50'}`}>
                                        <img src={ex.imageUrls[0]} className="w-full h-full object-cover" />
                                        {editingCollection.exhibitIds.includes(ex.id) && <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center"><Check size={32} className="text-white drop-shadow-md" /></div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleUpdateCollection} className="w-full py-5 bg-purple-500 text-white rounded-2xl font-pixel text-[10px] tracking-widest uppercase font-black shadow-[0_0_20px_rgba(168,85,247,0.4)]">ОБНОВИТЬ КОЛЛЕКЦИЮ</button>
                    </div>
                </div>
            )}

            {view === 'COLLECTION_DETAIL' && selectedCollection && (
                <CollectionDetailPage 
                    collection={selectedCollection} artifacts={exhibits.filter(e => selectedCollection.exhibitIds.includes(e.id))} theme={theme} onBack={() => setView('FEED')} onExhibitClick={handleExhibitClick} onAuthorClick={(a) => { setViewedProfileUsername(a); setView('USER_PROFILE'); }} currentUser={user?.username || ''}
                    onEdit={() => { setEditingCollection(selectedCollection); setView('EDIT_COLLECTION'); }}
                />
            )}

            {view === 'USER_PROFILE' && user && (
                <UserProfileView 
                    user={user} viewedProfileUsername={viewedProfileUsername} exhibits={exhibits} collections={collections} guestbook={guestbook} theme={theme} onBack={() => setView('FEED')} onLogout={() => { db.logoutUser(); setUser(null); setView('AUTH'); }} onFollow={handleFollow} onChat={(u) => { setViewedProfileUsername(u); setView('DIRECT_CHAT'); }} onExhibitClick={handleExhibitClick} onLike={handleLike} onAuthorClick={(a) => setViewedProfileUsername(a)} onCollectionClick={(c) => { setSelectedCollection(c); setView('COLLECTION_DETAIL'); }} onShareCollection={() => {}} onViewHallOfFame={() => setView('HALL_OF_FAME')} onGuestbookPost={() => {}} refreshData={refreshData} isEditingProfile={isEditingProfile} setIsEditingProfile={setIsEditingProfile} editTagline={editTagline} setEditTagline={setEditTagline} editStatus={editStatus} setEditStatus={setEditStatus} editTelegram={editTelegram} setEditTelegram={setEditTelegram} editPassword={editPassword} setEditPassword={setEditPassword} onSaveProfile={async () => { if(!user) return; const updated = { ...user, tagline: editTagline, status: editStatus, telegram: editTelegram }; if(editPassword) updated.password = editPassword; await db.updateUserProfile(updated); setUser(updated); setIsEditingProfile(false); }} onProfileImageUpload={async (e) => { if(e.target.files && e.target.files[0] && user) { const b64 = await db.fileToBase64(e.target.files[0]); const updated = { ...user, avatarUrl: b64 }; setUser(updated); await db.updateUserProfile(updated); } }} guestbookInput={guestbookInput} setGuestbookInput={setGuestbookInput} guestbookInputRef={guestbookInputRef} profileTab={profileTab} setProfileTab={setProfileTab}
                    onOpenSocialList={handleOpenSocial}
                />
            )}

            {view === 'SOCIAL_LIST' && viewedProfileUsername && (
                <div className="max-w-xl mx-auto animate-in fade-in pb-20 pt-4">
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => setView('USER_PROFILE')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={20}/></button>
                        <div>
                            <h1 className="font-pixel text-lg font-bold uppercase tracking-widest">{socialListType === 'followers' ? 'ПОДПИСЧИКИ' : 'ПОДПИСКИ'}</h1>
                            <p className="text-[10px] font-mono opacity-50">@{viewedProfileUsername}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {(socialListType === 'followers' 
                            ? db.getFullDatabase().users.find(u => u.username === viewedProfileUsername)?.followers || []
                            : db.getFullDatabase().users.find(u => u.username === viewedProfileUsername)?.following || []
                        ).map(name => (
                            <div key={name} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-black/10 hover:shadow-lg'}`}>
                                <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setViewedProfileUsername(name); setView('USER_PROFILE'); }}>
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-green-500/20"><img src={db.getUserAvatar(name)} className="w-full h-full object-cover" /></div>
                                    <div><div className="font-pixel text-xs font-bold">@{name}</div><div className="text-[9px] font-mono opacity-40 uppercase">NODE ACTIVE</div></div>
                                </div>
                                <button onClick={() => { setViewedProfileUsername(name); setView('DIRECT_CHAT'); }} className="p-3 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-black transition-all"><MessageSquare size={18} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'HALL_OF_FAME' && user && (
                <HallOfFame theme={theme} achievements={user.achievements} onBack={() => setView('USER_PROFILE')} />
            )}

            {view === 'ACTIVITY' && user && (
                <ActivityView notifications={notifications} messages={messages} currentUser={user} theme={theme} onAuthorClick={(a) => { setViewedProfileUsername(a); setView('USER_PROFILE'); }} onExhibitClick={(id) => { const e = exhibits.find(x => x.id === id); if(e) handleExhibitClick(e); }} onChatClick={(u) => { setViewedProfileUsername(u); setView('DIRECT_CHAT'); }} />
            )}
            
            {view === 'MY_COLLECTION' && user && (
                <MyCollection theme={theme} user={user} exhibits={exhibits.filter(e => e.owner === user.username)} collections={collections.filter(c => c.owner === user.username)} onBack={() => setView('FEED')} onExhibitClick={handleExhibitClick} onCollectionClick={(c) => { setSelectedCollection(c); setView('COLLECTION_DETAIL'); }} onLike={handleLike} />
            )}

            {view === 'DIRECT_CHAT' && user && viewedProfileUsername && (
                <DirectChat theme={theme} currentUser={user} partnerUsername={viewedProfileUsername} messages={messages.filter(m => (m.sender === user.username && m.receiver === viewedProfileUsername) || (m.sender === viewedProfileUsername && m.receiver === user.username))} onBack={() => setView('FEED')} onSendMessage={async (text) => { const msg: Message = { id: crypto.randomUUID(), sender: user.username, receiver: viewedProfileUsername, text, timestamp: new Date().toLocaleString(), isRead: false }; await db.saveMessage(msg); refreshData(); }} />
            )}

        </main>

        {/* Collection Selector Modal */}
        {isAddingToCollection && user && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className={`w-full max-w-md p-6 rounded-3xl border ${theme === 'dark' ? 'bg-dark-surface border-white/10' : 'bg-white border-black/10'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-pixel text-sm uppercase">ДОБАВИТЬ В КОЛЛЕКЦИЮ</h3>
                        <button onClick={() => setIsAddingToCollection(null)} className="p-2 opacity-50 hover:opacity-100"><X size={20}/></button>
                    </div>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
                        {collections.filter(c => c.owner === user.username).length === 0 ? (
                            <p className="text-center font-mono text-xs opacity-50 py-10">У ВАС НЕТ КОЛЛЕКЦИЙ</p>
                        ) : (
                            collections.filter(c => c.owner === user.username).map(col => (
                                <button 
                                    key={col.id} 
                                    onClick={() => handleAddToCollection(col.id)}
                                    className={`w-full p-4 rounded-2xl border text-left flex items-center gap-4 transition-all hover:scale-[1.02] ${theme === 'dark' ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-black/5 bg-gray-50 hover:bg-gray-100'}`}
                                >
                                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"><img src={col.coverImage} className="w-full h-full object-cover" /></div>
                                    <div className="flex-1">
                                        <div className="font-pixel text-[10px] font-bold truncate uppercase">{col.title}</div>
                                        <div className="text-[9px] font-mono opacity-40">{col.exhibitIds.length} ITEMS</div>
                                    </div>
                                    <Plus size={20} className="text-green-500" />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}
        
        {view !== 'AUTH' && (
          <nav className="fixed bottom-0 left-0 right-0 h-20 border-t border-white/10 backdrop-blur-2xl md:hidden flex justify-around items-center z-50 bg-black/60 px-4 pb-safe">
              <button onClick={() => setView('FEED')} className={`p-2 transition-all ${view === 'FEED' ? 'text-green-500 scale-125' : 'opacity-40'}`}><LayoutGrid size={24} /></button>
              <button onClick={() => setView('MY_COLLECTION')} className={`p-2 transition-all ${view === 'MY_COLLECTION' ? 'text-green-500 scale-125' : 'opacity-40'}`}><Package size={24} /></button>
              
              <div className="relative -top-5">
                  <button onClick={() => setView('CREATE_HUB')} className="bg-green-500 text-black w-14 h-14 rounded-full shadow-[0_0_20px_rgba(74,222,128,0.5)] border-4 border-black flex items-center justify-center active:scale-90 transition-all">
                      <PlusCircle size={32} />
                  </button>
              </div>

              <button onClick={() => setView('ACTIVITY')} className={`p-2 transition-all ${view === 'ACTIVITY' ? 'text-green-500 scale-125' : 'opacity-40'} relative`}><Bell size={24} />{notifications.some(n => !n.isRead && n.recipient === user?.username) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-black" />}</button>
              <button onClick={() => { if(user) { setViewedProfileUsername(user.username); setView('USER_PROFILE'); } }} className={`p-2 transition-all ${view === 'USER_PROFILE' ? 'text-green-500 scale-125' : 'opacity-40'}`}><User size={24} /></button>
          </nav>
        )}
    </div>
  );
}
