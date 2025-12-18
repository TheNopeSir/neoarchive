
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, User, PlusCircle, Search, Bell, X, Package, Grid, RefreshCw, Sun, Moon, Zap, FolderPlus, ArrowLeft,
  MessageSquare, Send, Image as ImageIcon, Plus, Trash2, Edit3, ChevronRight, BookmarkPlus, Camera, Layers, Archive, History
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

  // New Item States (Artifact/Collection Creation)
  const [newArtifact, setNewArtifact] = useState<Partial<Exhibit>>({ category: DefaultCategory.PHONES, specs: {}, imageUrls: [] });
  const [newCollection, setNewCollection] = useState<Partial<Collection>>({ exhibitIds: [] });

  // Profile management state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editStatus, setEditStatus] = useState<any>('ONLINE');
  const [editTelegram, setEditTelegram] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');
  const [guestbookInput, setGuestbookInput] = useState('');
  const guestbookInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const safetyTimer = setTimeout(() => { setIsInitializing(false); setTimeout(() => setShowSplash(false), 500); }, 3000);
    const init = async () => {
      try {
          const activeUser = await db.initializeDatabase();
          if (activeUser) { setUser(activeUser); setView('FEED'); refreshData(); } 
          else { setView('AUTH'); }
      } catch (e) { setView('AUTH'); } 
      finally { clearTimeout(safetyTimer); setIsInitializing(false); setTimeout(() => setShowSplash(false), 300); }
    };
    init();
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

  const handleManualRefresh = async () => {
      setIsLoadingFeed(true);
      await db.forceSync();
      refreshData();
      setTimeout(() => setIsLoadingFeed(false), 800);
  };

  const handleExhibitClick = (item: Exhibit) => {
    const updated = { ...item, views: item.views + 1 };
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
        likedBy: isLiked ? ex.likedBy.filter(u => u !== user.username) : [...ex.likedBy, user.username] 
    };
    setExhibits(prev => prev.map(item => item.id === id ? updated : item));
    if (selectedExhibit?.id === id) setSelectedExhibit(updated);
    await db.updateExhibit(updated);
  };

  // Restore Dual Section Feed Logic
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
                    exhibit={selectedExhibit} theme={theme} onBack={() => setView('FEED')} onShare={() => {}} onFavorite={() => {}} onLike={(id) => handleLike(id)} isFavorited={false} isLiked={selectedExhibit.likedBy?.includes(user?.username || '')} onPostComment={async (id, text) => { if (!user) return; const ex = exhibits.find(e => e.id === id); if (!ex) return; const newComment = { id: crypto.randomUUID(), author: user.username, text, timestamp: new Date().toLocaleString(), likes: 0, likedBy: [] }; const updatedEx = { ...ex, comments: [...(ex.comments || []), newComment] }; await db.updateExhibit(updatedEx); refreshData(); if (selectedExhibit?.id === id) setSelectedExhibit(updatedEx); }} onAuthorClick={(a) => { setViewedProfileUsername(a); setView('USER_PROFILE'); }} onFollow={async (u) => { if(!user) return; const following = user.following.includes(u) ? user.following.filter(x => x !== u) : [...user.following, u]; const updated = { ...user, following }; setUser(updated); await db.updateUserProfile(updated); }} onMessage={(u) => { setView('DIRECT_CHAT'); }} currentUser={user?.username || ''} isAdmin={user?.isAdmin || false} isFollowing={user?.following.includes(selectedExhibit.owner) || false}
                />
            )}

            {view === 'CREATE_HUB' && (
                <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
                    <h2 className="text-2xl font-pixel font-bold mb-8 flex items-center gap-4"><PlusCircle size={32} className="text-green-500" /> СОЗДАНИЕ</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div onClick={() => { setView('CREATE_ARTIFACT'); setNewArtifact({ category: DefaultCategory.PHONES, specs: {}, imageUrls: [] }); }} className="p-8 border-2 border-white/10 rounded-3xl bg-white/5 hover:border-green-500 hover:bg-green-500/5 transition-all cursor-pointer group flex flex-col items-center text-center">
                             <ImageIcon size={48} className="mb-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all text-green-500" />
                             <h3 className="font-pixel text-sm mb-2">АРТЕФАКТ</h3>
                             <p className="font-mono text-[10px] opacity-40">ОДИНОЧНЫЙ ЭКСПОНАТ В БАЗЕ</p>
                         </div>
                         <div onClick={() => { setView('CREATE_COLLECTION'); setNewCollection({ exhibitIds: [] }); }} className="p-8 border-2 border-white/10 rounded-3xl bg-white/5 hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer group flex flex-col items-center text-center">
                             <FolderPlus size={48} className="mb-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all text-blue-500" />
                             <h3 className="font-pixel text-sm mb-2">КОЛЛЕКЦИЯ</h3>
                             <p className="font-mono text-[10px] opacity-40">ТЕМАТИЧЕСКАЯ ГРУППА АРТЕФАКТОВ</p>
                         </div>
                    </div>
                </div>
            )}

            {view === 'USER_PROFILE' && user && (
                <UserProfileView 
                    user={user} viewedProfileUsername={viewedProfileUsername} exhibits={exhibits} collections={collections} guestbook={guestbook} theme={theme} onBack={() => setView('FEED')} onLogout={() => { db.logoutUser(); setUser(null); setView('AUTH'); }} onFollow={async (u) => { const following = user.following.includes(u) ? user.following.filter(x => x !== u) : [...user.following, u]; const updated = { ...user, following }; setUser(updated); await db.updateUserProfile(updated); }} onChat={(u) => setView('DIRECT_CHAT')} onExhibitClick={handleExhibitClick} onLike={handleLike} onAuthorClick={(a) => setViewedProfileUsername(a)} onCollectionClick={(c) => { setSelectedCollection(c); setView('COLLECTION_DETAIL'); }} onShareCollection={() => {}} onViewHallOfFame={() => setView('HALL_OF_FAME')} onGuestbookPost={() => {}} refreshData={refreshData} isEditingProfile={isEditingProfile} setIsEditingProfile={setIsEditingProfile} editTagline={editTagline} setEditTagline={setEditTagline} editStatus={editStatus} setEditStatus={setEditStatus} editTelegram={editTelegram} setEditTelegram={setEditTelegram} editPassword={editPassword} setEditPassword={setEditPassword} onSaveProfile={async () => { if(!user) return; const updated = { ...user, tagline: editTagline, status: editStatus, telegram: editTelegram }; if(editPassword) updated.password = editPassword; await db.updateUserProfile(updated); setUser(updated); setIsEditingProfile(false); }} onProfileImageUpload={async (e) => { if(e.target.files && e.target.files[0] && user) { const b64 = await db.fileToBase64(e.target.files[0]); const updated = { ...user, avatarUrl: b64 }; setUser(updated); await db.updateUserProfile(updated); } }} guestbookInput={guestbookInput} setGuestbookInput={setGuestbookInput} guestbookInputRef={guestbookInputRef} profileTab={profileTab} setProfileTab={setProfileTab}
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

            {view === 'ACTIVITY' && user && (
                <ActivityView notifications={notifications} messages={messages} currentUser={user} theme={theme} onAuthorClick={(a) => { setViewedProfileUsername(a); setView('USER_PROFILE'); }} onExhibitClick={(id) => { const e = exhibits.find(x => x.id === id); if(e) handleExhibitClick(e); }} onChatClick={(u) => setView('DIRECT_CHAT')} />
            )}

        </main>
        
        {/* Fixed Mobile Navigation - Restored UI with no labels */}
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
