import React, { useState, useEffect } from 'react';
import { Home, Search, Plus, LayoutGrid } from 'lucide-react';
import { UserProfile, Exhibit, Collection, ViewState, Message, Notification, GuestbookEntry, WishlistItem, Guild } from '../types';
import * as db from '../services/storageService';
import AuthForm from '../components/AuthForm';
import MatrixLogin from '../components/MatrixLogin';
import UserProfileView from '../components/UserProfileView';
import ExhibitDetailPage from '../components/ExhibitDetailPage';
import CollectionDetailPage from '../components/CollectionDetailPage';
import CreateArtifactView from '../components/CreateArtifactView';
import CreateCollectionView from '../components/CreateCollectionView';
import CreateWishlistItemView from '../components/CreateWishlistItemView';
import WishlistDetailView from '../components/WishlistDetailView';
import ActivityView from '../components/ActivityView';
import DirectChat from '../components/DirectChat';
import SearchView from '../components/SearchView';
import SocialListView from '../components/SocialListView';
import CommunityHub from '../components/CommunityHub';
import MyCollection from '../components/MyCollection';
import GuildDetailView from '../components/GuildDetailView';
import UserWishlistView from '../components/UserWishlistView';
import HallOfFame from '../components/HallOfFame';
import ExhibitCard from '../components/ExhibitCard';
import RetroLoader from '../components/RetroLoader';
import MatrixRain from '../components/MatrixRain';
import PixelSnow from '../components/PixelSnow';
import CRTOverlay from '../components/CRTOverlay';
import StorageMonitor from '../components/StorageMonitor';
import SEO from '../components/SEO';

const App = () => {
  // State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>('AUTH');
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light' | 'xp' | 'winamp'>('dark');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Data State
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // Selection State
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedUserUsername, setSelectedUserUsername] = useState<string | null>(null);
  const [activeChatPartner, setActiveChatPartner] = useState<string | null>(null);
  const [selectedSocialList, setSelectedSocialList] = useState<{ type: 'followers' | 'following', username: string } | null>(null);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<WishlistItem | null>(null);
  const [highlightCommentId, setHighlightCommentId] = useState<string | undefined>(undefined);

  // Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editStatus, setEditStatus] = useState<any>('ONLINE');
  const [editTelegram, setEditTelegram] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [guestbookInput, setGuestbookInput] = useState('');
  const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');

  // Initialization
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const currentUser = await db.initializeDatabase();
      if (currentUser) {
        setUser(currentUser);
        setTheme(currentUser.settings?.theme || 'dark');
        setView('FEED');
        refreshData();
        db.startLiveUpdates();
      } else {
        setView('AUTH');
      }
      setIsLoading(false);
    };
    init();

    const unsubscribe = db.subscribe(() => {
       refreshData();
    });
    return () => {
        unsubscribe();
        db.stopLiveUpdates();
    };
  }, []);

  const refreshData = () => {
      const data = db.getFullDatabase();
      setExhibits(data.exhibits);
      setCollections(data.collections);
      setUsers(data.users);
      setNotifications(data.notifications);
      setMessages(data.messages);
      setGuestbook(data.guestbook);
      setWishlist(data.wishlist);
      
      // Update current user reference if it changed
      if (user) {
          const updatedUser = data.users.find(u => u.username === user.username);
          if (updatedUser) setUser(updatedUser);
      }
  };

  // Navigation Helper
  const navigateTo = (newView: ViewState, params?: any) => {
    setIsMenuOpen(false);
    
    if (newView === 'EXHIBIT' && params?.item) {
        setSelectedExhibit(params.item);
        setHighlightCommentId(params.commentId);
    }
    if (newView === 'COLLECTION_DETAIL' && params?.collection) setSelectedCollection(params.collection);
    if (newView === 'USER_PROFILE' && params?.username) setSelectedUserUsername(params.username);
    if (newView === 'DIRECT_CHAT' && params?.username) setActiveChatPartner(params.username);
    if (newView === 'SOCIAL_LIST' && params) setSelectedSocialList(params);
    if (newView === 'GUILD_DETAIL' && params?.guild) setSelectedGuild(params.guild);
    if (newView === 'WISHLIST_DETAIL' && params?.item) setSelectedWishlistItem(params.item);
    if (newView === 'USER_WISHLIST' && params?.username) setSelectedUserUsername(params.username);
    if (newView === 'EDIT_ARTIFACT' && params?.item) setSelectedExhibit(params.item);
    if (newView === 'EDIT_COLLECTION' && params?.collection) setSelectedCollection(params.collection);

    setView(newView);
    window.scrollTo(0, 0);
  };

  // Handlers
  const handleLogin = (u: UserProfile, remember: boolean) => {
      setUser(u);
      setTheme(u.settings?.theme || 'dark');
      setView('FEED');
      db.startLiveUpdates();
  };

  const handleLogout = () => {
      db.logoutUser();
      setUser(null);
      setView('AUTH');
      db.stopLiveUpdates();
  };

  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><RetroLoader text="INITIALIZING MATRIX..." size="lg" /></div>;

  return (
    <div className={`min-h-screen transition-colors duration-500 ${theme === 'light' ? 'bg-[#e0e0e0] text-black' : theme === 'xp' ? 'bg-[#ECE9D8] font-sans' : 'bg-[#050505] text-gray-200'}`}>
        <SEO title={user ? `NeoArchive | @${user.username}` : "NeoArchive"} />
        <MatrixRain theme={theme === 'dark' || theme === 'winamp' ? 'dark' : 'light'} />
        <PixelSnow theme={theme === 'dark' || theme === 'winamp' ? 'dark' : 'light'} />
        <CRTOverlay />
        
        {/* Main Content Area */}
        <main className={`pb-20 ${theme === 'winamp' ? 'p-2' : ''}`}>
             {view === 'AUTH' && <MatrixLogin theme={theme === 'dark' ? 'dark' : 'light'} onLogin={handleLogin} />}
             
             {view === 'FEED' && (
                 <div className="max-w-4xl mx-auto pt-4 px-4 pb-24">
                     <div className="flex items-center justify-between mb-6">
                         <h1 className="text-2xl font-pixel font-bold">ЛЕНТА</h1>
                         <button onClick={() => navigateTo('COMMUNITY_HUB')} className="text-xs font-pixel uppercase opacity-70 hover:opacity-100 border px-3 py-1 rounded">Community Hub</button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {exhibits.filter(e => !e.isDraft).map(item => (
                             <ExhibitCard 
                                key={item.id} 
                                item={item} 
                                theme={theme}
                                onClick={(i) => navigateTo('EXHIBIT', { item: i })}
                                isLiked={item.likedBy?.includes(user?.username || '')}
                                onLike={(e) => { e.stopPropagation(); db.updateExhibit({...item, likes: item.likes + 1, likedBy: [...(item.likedBy || []), user?.username || '']}); }}
                                onAuthorClick={(author) => navigateTo('USER_PROFILE', { username: author })}
                             />
                         ))}
                     </div>
                 </div>
             )}

             {view === 'USER_PROFILE' && selectedUserUsername && (
                 <UserProfileView 
                    user={user!}
                    viewedProfileUsername={selectedUserUsername}
                    exhibits={exhibits}
                    collections={collections}
                    guestbook={guestbook}
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onLogout={handleLogout}
                    onFollow={(u) => db.toggleFollow(user!.username, u)}
                    onChat={(u) => navigateTo('DIRECT_CHAT', { username: u })}
                    onExhibitClick={(item) => navigateTo('EXHIBIT', { item })}
                    onLike={(id) => { /* logic handled inside */ }}
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })}
                    onShareCollection={() => {}}
                    onViewHallOfFame={() => navigateTo('HALL_OF_FAME')}
                    onGuestbookPost={(text) => db.saveGuestbookEntry({ id: crypto.randomUUID(), author: user!.username, targetUser: selectedUserUsername, text, timestamp: new Date().toISOString(), isRead: false })}
                    refreshData={refreshData}
                    isEditingProfile={isEditingProfile}
                    setIsEditingProfile={setIsEditingProfile}
                    editTagline={editTagline}
                    setEditTagline={setEditTagline}
                    editBio={editBio}
                    setEditBio={setEditBio}
                    editStatus={editStatus}
                    setEditStatus={setEditStatus}
                    editTelegram={editTelegram}
                    setEditTelegram={setEditTelegram}
                    editPassword={editPassword}
                    setEditPassword={setEditPassword}
                    onSaveProfile={() => { 
                        if (user) {
                             const updated = { 
                                 ...user, 
                                 tagline: editTagline, 
                                 bio: editBio, 
                                 status: editStatus, 
                                 telegram: editTelegram,
                                 password: editPassword || user.password
                             };
                             db.updateUserProfile(updated);
                             setIsEditingProfile(false); 
                             setEditPassword('');
                        }
                    }}
                    onProfileImageUpload={() => {}}
                    onProfileCoverUpload={() => {}}
                    guestbookInput={guestbookInput}
                    setGuestbookInput={setGuestbookInput}
                    guestbookInputRef={{ current: null }}
                    profileTab={profileTab}
                    setProfileTab={setProfileTab}
                    onOpenSocialList={(u, t) => navigateTo('SOCIAL_LIST', { type: t, username: u })}
                    onThemeChange={setTheme}
                    onWishlistClick={(item) => navigateTo('WISHLIST_DETAIL', { item })}
                 />
             )}
             
             {view === 'EXHIBIT' && selectedExhibit && (
                 <ExhibitDetailPage 
                    exhibit={selectedExhibit}
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onShare={() => {}}
                    onFavorite={() => {}}
                    onLike={(id) => {
                        const item = exhibits.find(e => e.id === id);
                        if (item && user) {
                            const isLiked = item.likedBy?.includes(user.username);
                            const updated = {
                                ...item,
                                likes: isLiked ? item.likes - 1 : item.likes + 1,
                                likedBy: isLiked ? item.likedBy.filter(u => u !== user.username) : [...(item.likedBy || []), user.username]
                            };
                            db.updateExhibit(updated);
                            setSelectedExhibit(updated);
                        }
                    }}
                    isFavorited={false}
                    isLiked={selectedExhibit.likedBy?.includes(user?.username || '') || false}
                    onPostComment={(id, text, parent) => { 
                        const newComment: any = { id: crypto.randomUUID(), author: user!.username, text, timestamp: new Date().toISOString(), likes: 0, likedBy: [], parentId: parent };
                        const updated = { ...selectedExhibit, comments: [...(selectedExhibit.comments || []), newComment] };
                        db.updateExhibit(updated);
                        setSelectedExhibit(updated);
                    }}
                    onCommentLike={() => {}}
                    onDeleteComment={() => {}}
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onFollow={() => {}}
                    onMessage={() => {}}
                    onDelete={(id) => { db.deleteExhibit(id); setView('FEED'); }}
                    onEdit={(e) => navigateTo('EDIT_ARTIFACT', { item: e })}
                    onAddToCollection={() => {}}
                    onExhibitClick={(item) => navigateTo('EXHIBIT', { item })}
                    isFollowing={false}
                    currentUser={user!.username}
                    currentUserProfile={user}
                    isAdmin={user!.isAdmin || false}
                    users={users}
                    allExhibits={exhibits}
                    highlightCommentId={highlightCommentId}
                 />
             )}

             {view === 'CREATE_ARTIFACT' && (
                 <CreateArtifactView 
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onSave={(data) => { db.saveExhibit({...data, id: crypto.randomUUID(), owner: user!.username, timestamp: new Date().toISOString(), likes: 0, views: 0} as Exhibit); setView('FEED'); }}
                    userArtifacts={exhibits.filter(e => e.owner === user!.username)}
                 />
             )}

             {view === 'EDIT_ARTIFACT' && selectedExhibit && (
                 <CreateArtifactView
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onSave={(data) => { db.updateExhibit(data as Exhibit); setView('FEED'); }}
                    initialData={selectedExhibit}
                    userArtifacts={exhibits.filter(e => e.owner === user!.username)}
                 />
             )}

             {view === 'SEARCH' && (
                 <SearchView 
                    theme={theme}
                    exhibits={exhibits}
                    collections={collections}
                    users={users}
                    onBack={() => setView('FEED')}
                    onExhibitClick={(item) => navigateTo('EXHIBIT', { item })}
                    onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onLike={() => {}}
                    currentUser={user}
                 />
             )}

             {view === 'MY_COLLECTION' && (
                 <MyCollection 
                    theme={theme}
                    user={user!}
                    exhibits={exhibits.filter(e => e.owner === user!.username)}
                    allExhibits={exhibits}
                    collections={collections.filter(c => c.owner === user!.username)}
                    onBack={() => setView('FEED')}
                    onExhibitClick={(item) => navigateTo('EXHIBIT', { item })}
                    onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })}
                    onLike={() => {}}
                 />
             )}
             
             {view === 'DIRECT_CHAT' && activeChatPartner && (
                 <DirectChat 
                    theme={theme}
                    currentUser={user!}
                    partnerUsername={activeChatPartner}
                    messages={messages.filter(m => (m.sender === user!.username && m.receiver === activeChatPartner) || (m.sender === activeChatPartner && m.receiver === user!.username))}
                    onBack={() => setView('FEED')}
                    onSendMessage={(text) => db.saveMessage({ id: crypto.randomUUID(), sender: user!.username, receiver: activeChatPartner, text, timestamp: new Date().toISOString(), isRead: false })}
                 />
             )}

             {view === 'COMMUNITY_HUB' && (
                 <CommunityHub 
                    theme={theme}
                    users={users}
                    exhibits={exhibits}
                    onExhibitClick={(item) => navigateTo('EXHIBIT', { item })}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onBack={() => setView('FEED')}
                    onGuildClick={(g) => navigateTo('GUILD_DETAIL', { guild: g })}
                    currentUser={user}
                 />
             )}

             {view === 'GUILD_DETAIL' && selectedGuild && (
                 <GuildDetailView 
                    guild={selectedGuild}
                    currentUser={user!}
                    theme={theme}
                    onBack={() => navigateTo('COMMUNITY_HUB')}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                 />
             )}

             {view === 'HALL_OF_FAME' && (
                 <HallOfFame 
                    theme={theme}
                    achievements={user!.achievements || []}
                    onBack={() => setView('FEED')}
                 />
             )}

             {view === 'CREATE_COLLECTION' && (
                 <CreateCollectionView 
                    theme={theme}
                    userArtifacts={exhibits.filter(e => e.owner === user!.username)}
                    onBack={() => setView('FEED')}
                    onSave={(data) => { db.saveCollection({...data, id: crypto.randomUUID(), owner: user!.username, timestamp: new Date().toISOString()} as Collection); setView('FEED'); }}
                 />
             )}
             
             {view === 'COLLECTION_DETAIL' && selectedCollection && (
                 <CollectionDetailPage 
                    collection={selectedCollection}
                    artifacts={exhibits.filter(e => selectedCollection.exhibitIds.includes(e.id))}
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onExhibitClick={(item) => navigateTo('EXHIBIT', { item })}
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    currentUser={user!.username}
                    onEdit={() => navigateTo('EDIT_COLLECTION', { collection: selectedCollection })}
                    onDelete={(id) => { db.deleteCollection(id); setView('FEED'); }}
                    onLike={() => {}}
                 />
             )}

             {view === 'EDIT_COLLECTION' && selectedCollection && (
                 <CreateCollectionView
                    theme={theme}
                    userArtifacts={exhibits.filter(e => e.owner === user!.username)}
                    initialData={selectedCollection}
                    onBack={() => setView('FEED')}
                    onSave={(data) => { db.updateCollection({...data, owner: user!.username} as Collection); setView('FEED'); }}
                    onDelete={(id) => { db.deleteCollection(id); setView('FEED'); }}
                 />
             )}

             {view === 'SOCIAL_LIST' && selectedSocialList && (
                 <SocialListView 
                    type={selectedSocialList.type}
                    username={selectedSocialList.username}
                    currentUserUsername={user!.username}
                    theme={theme}
                    onBack={() => navigateTo('USER_PROFILE', { username: selectedSocialList.username })}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                 />
             )}

             {view === 'CREATE_WISHLIST' && (
                 <CreateWishlistItemView 
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onSave={(data) => { db.saveWishlistItem({...data, owner: user!.username}); setView('FEED'); }}
                 />
             )}

             {view === 'WISHLIST_DETAIL' && selectedWishlistItem && (
                 <WishlistDetailView 
                    item={selectedWishlistItem}
                    theme={theme}
                    onBack={() => setView('FEED')}
                    onDelete={(id) => { db.deleteWishlistItem(id); setView('FEED'); }}
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    currentUser={user!.username}
                 />
             )}

             {view === 'USER_WISHLIST' && selectedUserUsername && (
                 <UserWishlistView 
                    ownerUsername={selectedUserUsername}
                    currentUser={user}
                    wishlistItems={wishlist.filter(w => w.owner === selectedUserUsername)}
                    theme={theme}
                    onBack={() => navigateTo('USER_PROFILE', { username: selectedUserUsername })}
                    onItemClick={(item) => navigateTo('WISHLIST_DETAIL', { item })}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                 />
             )}
             
             {view === 'ACTIVITY' && (
                 <ActivityView 
                    notifications={notifications}
                    messages={messages}
                    currentUser={user!}
                    theme={theme}
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onExhibitClick={(id, commentId) => { 
                        const item = exhibits.find(e => e.id === id); 
                        if (item) navigateTo('EXHIBIT', { item, commentId });
                    }}
                    onChatClick={(u) => navigateTo('DIRECT_CHAT', { username: u })}
                 />
             )}

        </main>
        
        {/* Bottom Nav */}
        {user && view !== 'DIRECT_CHAT' && (
            <div className={`fixed bottom-0 left-0 w-full z-40 border-t ${theme === 'dark' ? 'bg-black/90 border-white/10' : theme === 'winamp' ? 'bg-[#292929] border-[#505050]' : 'bg-white border-black/10'}`}>
                <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                    <button onClick={() => setView('FEED')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'FEED' ? 'text-green-500' : 'opacity-50'}`}>
                        <Home size={24} />
                    </button>
                    <button onClick={() => setView('SEARCH')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'SEARCH' ? 'text-green-500' : 'opacity-50'}`}>
                        <Search size={24} />
                    </button>
                    <div className="relative -top-6">
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)} 
                            className={`w-14 h-14 rounded-full flex items-center justify-center border-4 shadow-lg transition-transform hover:scale-105 active:scale-95 ${theme === 'winamp' ? 'bg-black border-[#00ff00] text-[#00ff00]' : 'bg-green-500 border-black text-black'}`}
                        >
                            <Plus size={28} strokeWidth={3} />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col gap-2 animate-in slide-in-from-bottom-4 fade-in">
                                <button onClick={() => navigateTo('CREATE_ARTIFACT')} className="px-4 py-2 bg-black/90 text-white rounded-full whitespace-nowrap border border-white/20 text-xs font-bold hover:bg-green-500 hover:text-black">
                                    АРТЕФАКТ
                                </button>
                                <button onClick={() => navigateTo('CREATE_COLLECTION')} className="px-4 py-2 bg-black/90 text-white rounded-full whitespace-nowrap border border-white/20 text-xs font-bold hover:bg-green-500 hover:text-black">
                                    КОЛЛЕКЦИЯ
                                </button>
                                <button onClick={() => navigateTo('CREATE_WISHLIST')} className="px-4 py-2 bg-black/90 text-white rounded-full whitespace-nowrap border border-white/20 text-xs font-bold hover:bg-purple-500 hover:text-white">
                                    ЖЕЛАНИЕ
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={() => navigateTo('MY_COLLECTION')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'MY_COLLECTION' ? 'text-green-500' : 'opacity-50'}`}>
                        <LayoutGrid size={24} />
                    </button>
                    <button onClick={() => navigateTo('USER_PROFILE', { username: user.username })} className={`flex flex-col items-center justify-center w-full h-full ${view === 'USER_PROFILE' && selectedUserUsername === user.username ? 'text-green-500' : 'opacity-50'}`}>
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-current">
                            <img src={user.avatarUrl} className="w-full h-full object-cover" />
                        </div>
                    </button>
                </div>
            </div>
        )}
        
        <StorageMonitor theme={theme} />
    </div>
  );
};

export default App;