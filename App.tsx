import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FolderPlus, ImageIcon } from 'lucide-react';
import MatrixLogin from './components/MatrixLogin';
import MatrixRain from './components/MatrixRain';
import CRTOverlay from './components/CRTOverlay';
import UserProfileView from './components/UserProfileView';
import MyCollection from './components/MyCollection';
import HallOfFame from './components/HallOfFame';
import StorageMonitor from './components/StorageMonitor';
import ExhibitDetailPage from './components/ExhibitDetailPage';
import * as db from './services/storageService';
import { UserProfile, Exhibit, Collection, ViewState, Notification, Message, GuestbookEntry, UserStatus } from './types';
import PixelSnow from './components/PixelSnow';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>('AUTH');
  const [isLoading, setIsLoading] = useState(false);

  // Data State
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  
  // Selection State
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [viewedProfileUsername, setViewedProfileUsername] = useState<string>('');
  
  // Edit/Create State
  const [newCollection, setNewCollection] = useState<Partial<Collection>>({ title: '', description: '', exhibitIds: [] });
  const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('ONLINE');
  const [editTelegram, setEditTelegram] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [guestbookInput, setGuestbookInput] = useState('');
  const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');

  const guestbookInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
        setIsLoading(true);
        const currentUser = await db.initializeDatabase();
        if (currentUser) {
            setUser(currentUser);
            setView('PROFILE');
            setViewedProfileUsername(currentUser.username);
        } else {
            setView('AUTH');
        }
        refreshData();
        setIsLoading(false);
    };
    init();
  }, []);

  const refreshData = () => {
      setExhibits(db.getExhibits());
      setCollections(db.getCollections());
      setNotifications(db.getNotifications());
      setMessages(db.getMessages());
      setGuestbook(db.getGuestbook());
  };

  const handleLogin = (u: UserProfile, remember: boolean) => {
      setUser(u);
      setView('PROFILE');
      setViewedProfileUsername(u.username);
      refreshData();
  };

  const handleLogout = async () => {
      await db.logoutUser();
      setUser(null);
      setView('AUTH');
  };

  const handleBack = () => {
      if (view === 'CREATE_COLLECTION' || view === 'EDIT_COLLECTION') {
          setView('MY_COLLECTION');
          return;
      }
      if (view === 'EXHIBIT') {
          setSelectedExhibit(null);
          setView('PROFILE'); 
          return;
      }
      if (view === 'HALL_OF_FAME') {
          setView('PROFILE');
          return;
      }
      if (view === 'USER_PROFILE') {
           setView('PROFILE');
           setViewedProfileUsername(user?.username || '');
           return;
      }
      if (user) setView('PROFILE');
      else setView('AUTH');
  };

  const handleCreateCollection = async () => {
      if (!user || !newCollection.title) return;
      setIsLoading(true);
      const col: Collection = {
          id: Date.now().toString(),
          title: newCollection.title!,
          description: newCollection.description || '',
          owner: user.username,
          coverImage: newCollection.coverImage || 'https://placehold.co/600x400?text=COLLECTION',
          exhibitIds: [],
          timestamp: new Date().toLocaleString()
      };
      await db.saveCollection(col);
      setCollections(db.getCollections());
      setNewCollection({ title: '', description: '', exhibitIds: [] });
      setIsLoading(false);
      setView('MY_COLLECTION');
  };

  const handleSaveCollection = async () => {
      if (!collectionToEdit) return;
      setIsLoading(true);
      await db.updateCollection(collectionToEdit);
      setCollections(db.getCollections());
      setCollectionToEdit(null);
      setIsLoading(false);
      setView('MY_COLLECTION');
  };

  const handleDeleteCollection = async () => {
      if (!collectionToEdit) return;
      if (confirm('Delete collection?')) {
          setIsLoading(true);
          await db.deleteCollection(collectionToEdit.id);
          setCollections(db.getCollections());
          setCollectionToEdit(null);
          setIsLoading(false);
          setView('MY_COLLECTION');
      }
  };

  const handleCollectionCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const base64 = await db.compressImage(e.target.files[0]);
          if (collectionToEdit) {
              setCollectionToEdit({ ...collectionToEdit, coverImage: base64 });
          }
      }
  };

  const handleNewCollectionCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const base64 = await db.compressImage(e.target.files[0]);
          setNewCollection(prev => ({ ...prev, coverImage: base64 }));
      }
  };

  const handleSaveProfile = async () => {
      if (!user) return;
      const updatedUser = { 
          ...user, 
          tagline: editTagline, 
          status: editStatus, 
          telegram: editTelegram,
          password: editPassword ? editPassword : user.password 
      };
      await db.updateUserProfile(updatedUser);
      setUser(updatedUser);
      setIsEditingProfile(false);
      setEditPassword('');
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && user) {
          const base64 = await db.compressImage(e.target.files[0]);
          const updatedUser = { ...user, avatarUrl: base64 };
          await db.updateUserProfile(updatedUser);
          setUser(updatedUser);
      }
  };

  const handleLike = (id: string) => {
      const exhibit = exhibits.find(e => e.id === id);
      if (exhibit && user) {
          const isLiked = exhibit.likedBy?.includes(user.username);
          let updated: Exhibit;
          if (isLiked) {
             updated = { ...exhibit, likes: exhibit.likes - 1, likedBy: exhibit.likedBy?.filter(u => u !== user.username) };
          } else {
             updated = { ...exhibit, likes: exhibit.likes + 1, likedBy: [...(exhibit.likedBy || []), user.username] };
          }
          db.updateExhibit(updated).then(refreshData);
      }
  };
  
  const handleFollow = (username: string) => {
      if (!user) return;
      const isFollowing = user.following.includes(username);
      let newFollowing = isFollowing 
        ? user.following.filter(u => u !== username)
        : [...user.following, username];
      
      const updatedUser = { ...user, following: newFollowing };
      db.updateUserProfile(updatedUser).then(() => {
          setUser(updatedUser);
      });
  };

  const handlePostComment = async (id: string, text: string) => {
      if (!user) return;
      const exhibit = exhibits.find(e => e.id === id);
      if (exhibit) {
          const newComment = {
              id: Date.now().toString(),
              author: user.username,
              text,
              timestamp: new Date().toLocaleString(),
              likes: 0,
              likedBy: []
          };
          const updated = { ...exhibit, comments: [...exhibit.comments, newComment] };
          await db.updateExhibit(updated);
          refreshData();
          if (selectedExhibit && selectedExhibit.id === id) {
              setSelectedExhibit(updated);
          }
      }
  };

  const handleGuestbookPost = async () => {
      if (!user || !guestbookInput.trim()) return;
      const entry: GuestbookEntry = {
          id: Date.now().toString(),
          author: user.username,
          targetUser: viewedProfileUsername,
          text: guestbookInput,
          timestamp: new Date().toLocaleString(),
          isRead: false
      };
      await db.saveGuestbookEntry(entry);
      setGuestbookInput('');
      refreshData();
  };

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
    <div className={`min-h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-gray-200' : 'bg-gray-100 text-gray-900'}`}>
        <MatrixRain theme={theme} />
        <PixelSnow theme={theme} />
        <CRTOverlay />
        
        <div className="relative z-10 container mx-auto p-4 md:p-6 pb-24">
            
            {(view === 'CREATE_COLLECTION' || view === 'EDIT_COLLECTION') && (
                <div className="max-w-xl mx-auto animate-in fade-in">
                     <button onClick={handleBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs mb-6"><ArrowLeft size={16} /> НАЗАД</button>
                     <h2 className="font-pixel text-xl mb-6 flex items-center gap-2"><FolderPlus /> {view === 'EDIT_COLLECTION' ? 'РЕДАКТИРОВАТЬ КОЛЛЕКЦИЮ' : 'НОВАЯ КОЛЛЕКЦИЯ'}</h2>
                     <div className={`p-6 rounded-xl border-2 space-y-6 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                          <div>
                            <label className="block text-[10px] font-pixel uppercase opacity-70 mb-1">НАЗВАНИЕ</label>
                            <input 
                                value={view === 'EDIT_COLLECTION' ? collectionToEdit?.title || '' : newCollection.title || ''} 
                                onChange={e => view === 'EDIT_COLLECTION' ? setCollectionToEdit((prev: any) => ({...prev!, title: e.target.value})) : setNewCollection(prev => ({...prev, title: e.target.value}))} 
                                className="w-full bg-transparent border-b-2 p-2 font-mono text-sm focus:outline-none" 
                                placeholder="Моя ретро полка" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-pixel uppercase opacity-70 mb-1">ОПИСАНИЕ</label>
                            <textarea 
                                value={view === 'EDIT_COLLECTION' ? collectionToEdit?.description || '' : newCollection.description || ''} 
                                onChange={e => view === 'EDIT_COLLECTION' ? setCollectionToEdit((prev: any) => ({...prev!, description: e.target.value})) : setNewCollection(prev => ({...prev, description: e.target.value}))} 
                                className="w-full bg-transparent border-2 p-2 font-mono text-sm h-24 rounded focus:outline-none" 
                                placeholder="О чем эта коллекция?" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-pixel uppercase opacity-70 mb-2">ОБЛОЖКА</label>
                            <div className="relative aspect-video rounded border-2 border-dashed overflow-hidden group flex items-center justify-center cursor-pointer hover:bg-white/5">
                                {(view === 'EDIT_COLLECTION' ? collectionToEdit?.coverImage : newCollection.coverImage) ? (
                                    <img src={view === 'EDIT_COLLECTION' ? collectionToEdit?.coverImage : newCollection.coverImage} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center opacity-50"><ImageIcon size={32} className="mx-auto mb-2" /><span className="text-xs">ЗАГРУЗИТЬ ОБЛОЖКУ</span></div>
                                )}
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={view === 'EDIT_COLLECTION' ? handleCollectionCoverUpload : handleNewCollectionCoverUpload} />
                            </div>
                          </div>
                          <div className="flex gap-4 pt-4">
                              <button 
                                onClick={view === 'EDIT_COLLECTION' ? handleSaveCollection : handleCreateCollection} 
                                disabled={isLoading} 
                                className={`flex-1 py-3 font-bold font-pixel uppercase rounded transition-colors ${theme === 'dark' ? 'bg-dark-primary text-black hover:bg-white' : 'bg-light-accent text-white hover:bg-black'}`}
                              >
                                  {isLoading ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
                              </button>
                              {view === 'EDIT_COLLECTION' && (
                                  <button onClick={handleDeleteCollection} className="px-4 py-3 border border-red-500 text-red-500 rounded hover:bg-red-500/10 font-bold font-pixel uppercase text-xs">УДАЛИТЬ</button>
                              )}
                          </div>
                     </div>
                </div>
            )}

            {view === 'PROFILE' && user && (
                <UserProfileView 
                    user={user}
                    viewedProfileUsername={viewedProfileUsername}
                    exhibits={exhibits}
                    collections={collections}
                    guestbook={guestbook}
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onLogout={handleLogout}
                    onFollow={handleFollow}
                    onChat={(username) => console.log('Chat with', username)}
                    onExhibitClick={(ex) => { setSelectedExhibit(ex); setView('EXHIBIT'); }}
                    onLike={(id) => handleLike(id)}
                    onFavorite={(id) => console.log('Fav', id)}
                    onAuthorClick={(author) => { setViewedProfileUsername(author); setView('USER_PROFILE'); }}
                    onCollectionClick={(col) => { setCollectionToEdit(col); setView('EDIT_COLLECTION'); }}
                    onShareCollection={() => {}}
                    onViewHallOfFame={() => setView('HALL_OF_FAME')}
                    onGuestbookPost={handleGuestbookPost}
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
                    onSaveProfile={handleSaveProfile}
                    onProfileImageUpload={handleProfileImageUpload}
                    guestbookInput={guestbookInput}
                    setGuestbookInput={setGuestbookInput}
                    guestbookInputRef={guestbookInputRef}
                    profileTab={profileTab}
                    setProfileTab={setProfileTab}
                />
            )}

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
                    onFollow={handleFollow}
                    onChat={(username) => console.log('Chat', username)}
                    onExhibitClick={(ex) => { setSelectedExhibit(ex); setView('EXHIBIT'); }}
                    onLike={(id) => handleLike(id)}
                    onFavorite={(id) => console.log('Fav', id)}
                    onAuthorClick={(author) => { setViewedProfileUsername(author); setView('USER_PROFILE'); }}
                    onCollectionClick={(col) => {}}
                    onShareCollection={() => {}}
                    onViewHallOfFame={() => setView('HALL_OF_FAME')}
                    onGuestbookPost={handleGuestbookPost}
                    refreshData={refreshData}
                    isEditingProfile={false}
                    setIsEditingProfile={() => {}}
                    editTagline=""
                    setEditTagline={() => {}}
                    editStatus="ONLINE"
                    setEditStatus={() => {}}
                    editTelegram=""
                    setEditTelegram={() => {}}
                    editPassword=""
                    setEditPassword={() => {}}
                    onSaveProfile={() => {}}
                    onProfileImageUpload={() => {}}
                    guestbookInput={guestbookInput}
                    setGuestbookInput={setGuestbookInput}
                    guestbookInputRef={guestbookInputRef}
                    profileTab={profileTab}
                    setProfileTab={setProfileTab}
                />
            )}

            {view === 'MY_COLLECTION' && user && (
                <MyCollection 
                    theme={theme}
                    user={user}
                    exhibits={exhibits.filter(e => e.owner === user.username)}
                    collections={collections.filter(c => c.owner === user.username)}
                    onBack={handleBack}
                    onExhibitClick={(ex) => { setSelectedExhibit(ex); setView('EXHIBIT'); }}
                    onCollectionClick={(col) => { setCollectionToEdit(col); setView('EDIT_COLLECTION'); }}
                    onLike={handleLike}
                />
            )}

            {view === 'EXHIBIT' && selectedExhibit && user && (
                <ExhibitDetailPage 
                    exhibit={selectedExhibit}
                    theme={theme}
                    onBack={handleBack}
                    onShare={() => {}}
                    onFavorite={() => {}}
                    onLike={(id) => handleLike(id)}
                    isFavorited={false}
                    isLiked={selectedExhibit.likedBy?.includes(user.username) || false}
                    onPostComment={handlePostComment}
                    onAuthorClick={(author) => { setViewedProfileUsername(author); setView('USER_PROFILE'); }}
                    onFollow={handleFollow}
                    onMessage={(u) => console.log(u)}
                    isFollowing={user.following.includes(selectedExhibit.owner)}
                    currentUser={user.username}
                    isAdmin={user.isAdmin || false}
                />
            )}
            
            {view === 'HALL_OF_FAME' && user && (
                <HallOfFame 
                    theme={theme}
                    achievedIds={user.achievements || []}
                    onBack={handleBack}
                />
            )}

            {(view === 'PROFILE' || view === 'MY_COLLECTION') && <div className="mt-8"><StorageMonitor theme={theme} /></div>}
        </div>
    </div>
  );
}