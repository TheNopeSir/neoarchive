
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutGrid, User, PlusCircle, Search, Bell, X, Package, Grid, RefreshCw, Sun, Moon, Zap, FolderPlus, ArrowLeft, Check, Folder
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

import * as db from './services/storageService';
import { UserProfile, Exhibit, Collection, ViewState, Notification, Message, GuestbookEntry } from './types';
import { DefaultCategory, calculateArtifactScore } from './constants';
import useSwipe from './hooks/useSwipe';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [view, setView] = useState<ViewState>('AUTH');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
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

  // Pagination
  const [feedPage, setFeedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Social/Edit State
  const [socialListType, setSocialListType] = useState<'followers' | 'following'>('followers');
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

  // --- SWIPE LOGIC ---
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (view === 'MY_COLLECTION') setView('FEED');
      else if (view === 'FEED') setView('ACTIVITY');
    },
    onSwipeRight: () => {
      if (view === 'ACTIVITY') setView('FEED');
      else if (view === 'FEED') setView('MY_COLLECTION');
    },
  });

  const refreshData = useCallback(() => {
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
  }, [user]);

  useEffect(() => {
    const safetyTimer = setTimeout(() => { setIsInitializing(false); setShowSplash(false); }, 5000);
    const init = async () => {
      try {
          const activeUser = await db.initializeDatabase();
          if (activeUser) { 
              setUser(activeUser); 
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
  
  const handleAddItemToCollection = async (collectionId: string) => {
      if (!isAddingToCollection || !user) return;
      const collection = collections.find(c => c.id === collectionId);
      if (!collection) return;
      
      // Avoid duplicates
      if (!collection.exhibitIds.includes(isAddingToCollection)) {
          const updatedCollection = {
              ...collection,
              exhibitIds: [...collection.exhibitIds, isAddingToCollection]
          };
          await db.updateCollection(updatedCollection);
          
          // Optimistic update
          setCollections(prev => prev.map(c => c.id === collectionId ? updatedCollection : c));
      }
      setIsAddingToCollection(null);
  };

  const filteredExhibits = exhibits.filter(e => {
      if (e.isDraft && e.owner !== user?.username) return false;
      if (selectedCategory !== 'ВСЕ' && e.category !== selectedCategory) return false;
      if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
  });

  const followingExhibits = user ? filteredExhibits.filter(e => user.following.includes(e.owner)) : [];
  const recommendedExhibits = filteredExhibits.sort((a,b) => calculateArtifactScore(b, user?.preferences) - calculateArtifactScore(a, user?.preferences));

  const handleSaveArtifact = async (artifactData: Partial<Exhibit>) => {
      if (!user || !artifactData.title) return;
      const ex: Exhibit = { 
        id: crypto.randomUUID(), 
        title: artifactData.title, 
        description: artifactData.description || '', 
        category: artifactData.category || DefaultCategory.MISC, 
        subcategory: artifactData.subcategory, 
        imageUrls: artifactData.imageUrls || [], 
        owner: user.username, 
        timestamp: new Date().toISOString(), 
        likes: 0, 
        likedBy: [], 
        views: 0, 
        specs: artifactData.specs || {}, 
        comments: [], 
        isDraft: artifactData.isDraft, 
        quality: 'MINT' 
      };
      await db.saveExhibit(ex);
      setView('FEED');
      refreshData();
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
        <div className="relative z-10 text-center animate-pulse">
          <div className="font-pixel text-4xl tracking-[1em] mb-4 drop-shadow-[0_0_15px_#4ade80]">NEOARCHIVE</div>
          <RetroLoader text="SYNCHRONIZING_NODE" size="lg" />
        </div>
        <CRTOverlay />
      </div>
    );
  }

  const swipeProps = (view === 'FEED' || view === 'MY_COLLECTION' || view === 'ACTIVITY') ? swipeHandlers : {};

  return (
    <div 
        {...swipeProps}
        className={`min-h-screen transition-colors duration-500 font-sans ${theme === 'dark' ? 'bg-black text-gray-200' : 'bg-gray-100 text-gray-900'} ${view === 'AUTH' ? 'overflow-hidden' : ''}`}
    >
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
                      <button onClick={async () => { await db.forceSync(); refreshData(); }} className="p-2 hover:bg-white/10 rounded-xl transition-all">
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
                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
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
                    
                    {feedMode === 'ARTIFACTS' ? (
                        <div className="space-y-10">
                            {followingExhibits.length > 0 && (
                                <div>
                                    <h2 className="font-pixel text-[10px] opacity-50 mb-4 flex items-center gap-2 tracking-[0.2em] uppercase"><Zap size={14} className="text-yellow-500" /> ПОДПИСКИ</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                                        {followingExhibits.map(item => (
                                            <ExhibitCard key={item.id} item={item} theme={theme} onClick={handleExhibitClick} isLiked={item.likedBy?.includes(user?.username || '')} onLike={(e) => handleLike(item.id, e)} onAuthorClick={(author) => { setViewedProfileUsername(author); setView('USER_PROFILE'); }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <h2 className="font-pixel text-[10px] opacity-50 mb-4 flex items-center gap-2 tracking-[0.2em] uppercase"><Grid size={14} className="text-green-500" /> ВСЕ АРТЕФАКТЫ</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                                    {recommendedExhibits.map(item => (
                                        <ExhibitCard key={item.id} item={item} theme={theme} onClick={handleExhibitClick} isLiked={item.likedBy?.includes(user?.username || '')} onLike={(e) => handleLike(item.id, e)} onAuthorClick={(author) => { setViewedProfileUsername(author); setView('USER_PROFILE'); }} />
                                    ))}
                                </div>
                            </div>
                            {isLoadingMore && (
                                <div className="flex justify-center py-10"><RetroLoader text="SYNCHRONIZING..." /></div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {collections.map(col => ( <CollectionCard key={col.id} col={col} theme={theme} onClick={(c) => { setSelectedCollection(c); setView('COLLECTION_DETAIL'); }} onShare={() => {}} /> ))}
                        </div>
                    )}
                </div>
            )}

            {view === 'CREATE_ARTIFACT' && (
              <CreateArtifactView theme={theme} onBack={() => setView('FEED')} onSave={handleSaveArtifact} />
            )}

            {view === 'EXHIBIT' && selectedExhibit && (
                <ExhibitDetailPage 
                    exhibit={selectedExhibit} theme={theme} onBack={() => setView('FEED')} onShare={() => {}} onFavorite={() => {}} onLike={(id) => handleLike(id)} isFavorited={false} isLiked={selectedExhibit.likedBy?.includes(user?.username || '')} onPostComment={async (id, text) => { if (!user) return; const ex = exhibits.find(e => e.id === id); if (!ex) return; const newComment = { id: crypto.randomUUID(), author: user.username, text, timestamp: new Date().toISOString(), likes: 0, likedBy: [] }; const updatedEx = { ...ex, comments: [...(ex.comments || []), newComment] }; await db.updateExhibit(updatedEx); refreshData(); if (selectedExhibit?.id === id) setSelectedExhibit(updatedEx); }} onAuthorClick={(a) => { setViewedProfileUsername(a); setView('USER_PROFILE'); }} onFollow={handleFollow} onMessage={(u) => { setViewedProfileUsername(u); setView('DIRECT_CHAT'); }} currentUser={user?.username || ''} isAdmin={user?.isAdmin || false} isFollowing={user?.following.includes(selectedExhibit.owner) || false} onAddToCollection={(id) => setIsAddingToCollection(id)}
                />
            )}
            
            {view === 'COLLECTION_DETAIL' && selectedCollection && (
                <CollectionDetailPage
                    collection={selectedCollection}
                    artifacts={exhibits.filter(e => (selectedCollection.exhibitIds || []).includes(e.id))}
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onExhibitClick={handleExhibitClick}
                    onAuthorClick={(a) => { setViewedProfileUsername(a); setView('USER_PROFILE'); }}
                    currentUser={user?.username || ''}
                />
            )}

            {view === 'DIRECT_CHAT' && user && viewedProfileUsername && (
                <DirectChat 
                    theme={theme} 
                    currentUser={user} 
                    partnerUsername={viewedProfileUsername} 
                    messages={messages.filter(m => (m.sender === user.username && m.receiver === viewedProfileUsername) || (m.sender === viewedProfileUsername && m.receiver === user.username))} 
                    onBack={() => setView('ACTIVITY')} 
                    onSendMessage={handleSendMessage} 
                />
            )}

            {view === 'USER_PROFILE' && user && (
                <UserProfileView user={user} viewedProfileUsername={viewedProfileUsername} exhibits={exhibits} collections={collections} guestbook={guestbook} theme={theme} onBack={() => setView('FEED')} onLogout={() => { db.logoutUser(); setUser(null); setView('AUTH'); }} onFollow={handleFollow} onChat={(u) => { setViewedProfileUsername(u); setView('DIRECT_CHAT'); }} onExhibitClick={handleExhibitClick} onLike={handleLike} onAuthorClick={(a) => setViewedProfileUsername(a)} onCollectionClick={(c) => { setSelectedCollection(c); setView('COLLECTION_DETAIL'); }} onShareCollection={() => {}} onViewHallOfFame={() => setView('HALL_OF_FAME')} onGuestbookPost={() => {}} refreshData={refreshData} isEditingProfile={isEditingProfile} setIsEditingProfile={setIsEditingProfile} editTagline={editTagline} setEditTagline={setEditTagline} editStatus={editStatus} setEditStatus={setEditStatus} editTelegram={editTelegram} setEditTelegram={setEditTelegram} editPassword={editPassword} setEditPassword={setEditPassword} onSaveProfile={async () => { if(!user) return; const updated = { ...user, tagline: editTagline, status: editStatus, telegram: editTelegram }; if(editPassword) updated.password = editPassword; await db.updateUserProfile(updated); setUser(updated); setIsEditingProfile(false); }} onProfileImageUpload={async (e) => { if(e.target.files && e.target.files[0] && user) { const b64 = await db.fileToBase64(e.target.files[0]); const updated = { ...user, avatarUrl: b64 }; setUser(updated); await db.updateUserProfile(updated); } }} guestbookInput={guestbookInput} setGuestbookInput={setGuestbookInput} guestbookInputRef={guestbookInputRef} profileTab={profileTab} setProfileTab={setProfileTab} onOpenSocialList={(u, t) => { setViewedProfileUsername(u); setSocialListType(t); setView('SOCIAL_LIST'); }} />
            )}

            {view === 'ACTIVITY' && user && (
                <ActivityView notifications={notifications} messages={messages} currentUser={user} theme={theme} onAuthorClick={(a) => { setViewedProfileUsername(a); setView('USER_PROFILE'); }} onExhibitClick={(id) => { const e = exhibits.find(x => x.id === id); if(e) handleExhibitClick(e); }} onChatClick={(u) => { setViewedProfileUsername(u); setView('DIRECT_CHAT'); }} />
            )}
            
            {view === 'MY_COLLECTION' && user && (
                <MyCollection theme={theme} user={user} exhibits={exhibits.filter(e => e.owner === user.username)} collections={collections.filter(c => c.owner === user.username)} onBack={() => setView('FEED')} onExhibitClick={handleExhibitClick} onCollectionClick={(c) => { setSelectedCollection(c); setView('COLLECTION_DETAIL'); }} onLike={handleLike} />
            )}

        </main>
        
        {/* ADD TO COLLECTION MODAL */}
        {isAddingToCollection && user && (
            <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4">
                <div className={`w-full max-w-md p-6 rounded-2xl border ${theme === 'dark' ? 'bg-dark-surface border-white/10' : 'bg-white border-black/10'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-pixel text-sm uppercase flex items-center gap-2"><FolderPlus size={16} /> Добавить в коллекцию</h3>
                        <button onClick={() => setIsAddingToCollection(null)} className="opacity-50 hover:opacity-100"><X size={20}/></button>
                    </div>
                    
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto mb-4 scrollbar-hide">
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
          <nav className="fixed bottom-0 left-0 right-0 h-20 border-t border-white/10 backdrop-blur-2xl md:hidden flex justify-around items-center z-50 bg-black/60 px-4 pb-safe">
              <button onClick={() => setView('FEED')} className={`p-2 transition-all ${view === 'FEED' ? 'text-green-500 scale-125' : 'opacity-40'}`}><LayoutGrid size={24} /></button>
              <button onClick={() => setView('MY_COLLECTION')} className={`p-2 transition-all ${view === 'MY_COLLECTION' ? 'text-green-500 scale-125' : 'opacity-40'}`}><Package size={24} /></button>
              <div className="relative -top-5"><button onClick={() => setView('CREATE_ARTIFACT')} className="bg-green-500 text-black w-14 h-14 rounded-full shadow-[0_0_20px_rgba(74,222,128,0.5)] border-4 border-black flex items-center justify-center transition-all"><PlusCircle size={32} /></button></div>
              <button onClick={() => setView('ACTIVITY')} className={`p-2 transition-all ${view === 'ACTIVITY' ? 'text-green-500 scale-125' : 'opacity-40'} relative`}><Bell size={24} />{notifications.some(n => !n.isRead && n.recipient === user?.username) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-black" />}</button>
              <button onClick={() => { if(user) { setViewedProfileUsername(user.username); setView('USER_PROFILE'); } }} className={`p-2 transition-all ${view === 'USER_PROFILE' ? 'text-green-500 scale-125' : 'opacity-40'}`}><User size={24} /></button>
          </nav>
        )}
    </div>
  );
}
