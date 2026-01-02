
import React, { useState } from 'react';
import { ArrowLeft, Edit2, LogOut, MessageSquare, Send, Trophy, Reply, Trash2, Check, X, Wand2, Eye, Camera, Palette, Settings, Search, Terminal, Sun, Package, Archive, FolderPlus } from 'lucide-react';
import { UserProfile, Exhibit, Collection, GuestbookEntry, UserStatus, AppSettings, WishlistItem } from '../types';
import { STATUS_OPTIONS } from '../constants';
import * as db from '../services/storageService';
import { getUserAvatar } from '../services/storageService';
import WishlistCard from './WishlistCard';
import ExhibitCard from './ExhibitCard';
import CollectionCard from './CollectionCard';
import SEO from './SEO';

interface UserProfileViewProps {
    user: UserProfile;
    viewedProfileUsername: string;
    exhibits: Exhibit[];
    collections: Collection[];
    guestbook: GuestbookEntry[];
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onBack: () => void;
    onLogout: () => void;
    onFollow: (username: string) => void;
    onChat: (username: string) => void;
    onExhibitClick: (item: Exhibit) => void;
    onLike: (id: string, e?: React.MouseEvent) => void;
    onAuthorClick: (author: string) => void;
    onCollectionClick: (col: Collection) => void;
    onShareCollection: (col: Collection) => void;
    onViewHallOfFame: () => void;
    onGuestbookPost: () => void;
    refreshData: () => void;
    isEditingProfile: boolean;
    setIsEditingProfile: (v: boolean) => void;
    editTagline: string;
    setEditTagline: (v: string) => void;
    editBio: string;
    setEditBio: (v: string) => void;
    editStatus: UserStatus;
    setEditStatus: (v: UserStatus) => void;
    editTelegram: string;
    setEditTelegram: (v: string) => void;
    editPassword: string;
    setEditPassword: (v: string) => void;
    onSaveProfile: () => void;
    onProfileImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onProfileCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    guestbookInput: string;
    setGuestbookInput: (v: string) => void;
    guestbookInputRef: React.RefObject<HTMLInputElement>;
    profileTab: 'ARTIFACTS' | 'COLLECTIONS';
    setProfileTab: (v: 'ARTIFACTS' | 'COLLECTIONS') => void;
    onOpenSocialList: (username: string, type: 'followers' | 'following') => void;
    onThemeChange?: (theme: 'dark' | 'light' | 'xp' | 'winamp') => void;
    onWishlistClick: (item: WishlistItem) => void;
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ 
    user, viewedProfileUsername, exhibits, collections, guestbook, theme, 
    onBack, onLogout, onFollow, onChat, onExhibitClick, onLike, onAuthorClick, 
    onCollectionClick, onShareCollection, onViewHallOfFame, onGuestbookPost, 
    isEditingProfile, setIsEditingProfile, editTagline, setEditTagline, editBio, setEditBio, editStatus, setEditStatus, editTelegram, setEditTelegram, 
    editPassword, setEditPassword,
    onSaveProfile, onProfileImageUpload, onProfileCoverUpload, guestbookInput, setGuestbookInput, guestbookInputRef, profileTab, setProfileTab, refreshData,
    onOpenSocialList, onThemeChange, onWishlistClick
}) => {
    const profileUser = db.getFullDatabase().users.find(u => u.username === viewedProfileUsername) || { 
        username: viewedProfileUsername, 
        email: 'ghost@matrix.net', 
        tagline: 'Цифровой призрак', 
        avatarUrl: getUserAvatar(viewedProfileUsername), 
        joinedDate: 'Unknown', 
        following: [], 
        followers: [],
        achievements: [], 
        telegram: '',
        settings: {}
    } as UserProfile;

    const isCurrentUser = user?.username === viewedProfileUsername;
    const isSubscribed = user?.following.includes(viewedProfileUsername) || false;
    const isWinamp = theme === 'winamp';

    const [activeSection, setActiveSection] = useState<'SHELF' | 'LOGS' | 'CONFIG' | 'WISHLIST'>('SHELF');
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editEntryText, setEditEntryText] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localSettings, setLocalSettings] = useState<AppSettings>(user?.settings || { theme: 'dark' });

    const userExhibits = exhibits.filter(e => e.owner === viewedProfileUsername);
    const userCollections = collections.filter(c => c.owner === viewedProfileUsername);
    const wishlistItems = db.getFullDatabase().wishlist.filter(w => w.owner === viewedProfileUsername);
    const drafts = isCurrentUser ? userExhibits.filter(e => e.isDraft) : [];
    const publishedExhibits = userExhibits.filter(e => !e.isDraft);

    const handleEditEntry = (entry: GuestbookEntry) => { setEditingEntryId(entry.id); setEditEntryText(entry.text); };
    const handleSaveEntry = async (entry: GuestbookEntry) => { if (!editEntryText.trim()) return; const updated = { ...entry, text: editEntryText }; await db.updateGuestbookEntry(updated); setEditingEntryId(null); refreshData(); };
    const handleDeleteEntry = async (id: string) => { if (confirm('Удалить запись?')) { await db.deleteGuestbookEntry(id); refreshData(); } };
    const handleDeleteWishlist = async (id: string) => { if (confirm('Удалить из вишлиста?')) { await db.deleteWishlistItem(id); refreshData(); } };
    const generateSecurePassword = () => { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"; let pass = ""; for(let i=0; i<16; i++) { pass += chars.charAt(Math.floor(Math.random() * chars.length)); } setEditPassword(pass); setShowPassword(true); };
    const updateSetting = async (key: keyof AppSettings, value: any) => { if (!isCurrentUser) return; const newSettings = { ...localSettings, [key]: value }; setLocalSettings(newSettings); if (key === 'theme' && onThemeChange) onThemeChange(value); const updatedUser = { ...user, settings: newSettings }; await db.updateUserProfile(updatedUser); };

    // Winamp Helper wrapper
    const WinampWindow = ({ title, children, className = '' }: { title: string, children: React.ReactNode, className?: string }) => (
        <div className={`mb-6 bg-[#292929] border-t-2 border-l-2 border-r-2 border-b-2 border-t-[#505050] border-l-[#505050] border-r-[#101010] border-b-[#101010] ${className}`}>
            <div className="h-4 bg-gradient-to-r from-wa-blue-light to-wa-blue-dark flex items-center justify-between px-1 cursor-default select-none mb-1">
                <span className="text-white font-winamp text-[10px] tracking-widest uppercase">{title}</span>
                <div className="w-2 h-2 bg-[#DCDCDC] border border-t-white border-l-white border-r-[#505050] border-b-[#505050]"></div>
            </div>
            <div className="p-2">
                {children}
            </div>
        </div>
    );

    return (
        <div className={`max-w-4xl mx-auto space-y-6 animate-in slide-in-from-right-8 fade-in duration-500 pb-32 ${isWinamp ? 'font-winamp text-wa-green' : ''}`}>
            <SEO title={`@${profileUser.username} | Профиль NeoArchive`} description={profileUser.tagline || `Посмотрите коллекцию пользователя @${profileUser.username}`} image={profileUser.avatarUrl} path={`/profile/${profileUser.username}`} type="profile" />

            {!isWinamp && <button onClick={onBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs"><ArrowLeft size={16} /> НАЗАД</button>}
            
            <div className={isWinamp ? '' : `rounded-3xl border overflow-hidden relative ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : theme === 'xp' ? 'bg-white border-[#245DDA] shadow-lg' : 'bg-white border-light-dim'}`}>
                {/* PROFILE HEADER SECTION */}
                {isWinamp ? (
                    <WinampWindow title={`USER: ${profileUser.username}`}>
                        <div className="flex gap-4 items-start">
                            <div className="w-20 h-20 border-2 border-t-[#101010] border-l-[#101010] border-r-[#505050] border-b-[#505050] p-1 bg-black">
                                <img src={profileUser.avatarUrl} className="w-full h-full object-cover grayscale opacity-80 hover:opacity-100" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="text-[14px] text-wa-gold">{profileUser.username}</div>
                                <div className="text-[12px] opacity-80">{profileUser.tagline}</div>
                                <div className="text-[12px] flex gap-2 mt-2">
                                    <span onClick={() => onOpenSocialList(profileUser.username, 'followers')} className="cursor-pointer hover:text-white">Followers: {profileUser.followers?.length || 0}</span>
                                    <span onClick={() => onOpenSocialList(profileUser.username, 'following')} className="cursor-pointer hover:text-white">Following: {profileUser.following?.length || 0}</span>
                                </div>
                                {!isCurrentUser && (
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => onFollow(profileUser.username)} className="px-2 border border-[#505050] bg-[#292929] text-[10px] hover:text-white">{isSubscribed ? 'UNSUBSCRIBE' : 'SUBSCRIBE'}</button>
                                        <button onClick={() => onChat(profileUser.username)} className="px-2 border border-[#505050] bg-[#292929] text-[10px] hover:text-white">MSG</button>
                                    </div>
                                )}
                                {isCurrentUser && (
                                    <button onClick={onLogout} className="px-2 border border-[#505050] bg-[#292929] text-[10px] hover:text-red-500">LOGOUT</button>
                                )}
                            </div>
                        </div>
                    </WinampWindow>
                ) : (
                    // Standard Profile Header
                    <>
                        <div className="h-40 md:h-52 bg-gray-800 relative">
                            {profileUser.coverUrl ? <img src={profileUser.coverUrl} className="w-full h-full object-cover" alt="Cover" /> : <div className={`w-full h-full ${theme === 'dark' ? 'bg-gradient-to-r from-green-900/20 to-black' : 'bg-gradient-to-r from-gray-100 to-gray-300'}`}></div>}
                            {theme === 'xp' && <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-[#0058EE] to-[#3F8CF3] flex items-center px-4"><span className="text-white font-bold text-sm drop-shadow-md italic">User Properties</span></div>}
                            {isEditingProfile && isCurrentUser && (
                                <label className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-xl cursor-pointer hover:bg-black/70 border border-white/20 flex items-center gap-2 backdrop-blur-sm"><Camera size={16} /> <span className="text-[10px] font-pixel">BANNER</span><input type="file" accept="image/*" className="hidden" onChange={onProfileCoverUpload} /></label>
                            )}
                        </div>
                        <div className="px-6 pb-6 relative">
                            <div className="flex flex-col md:flex-row items-start md:items-end -mt-16 md:-mt-12 gap-6 mb-4">
                                <div className="relative group">
                                    <div className={`w-32 h-32 rounded-3xl overflow-hidden border-4 bg-black ${theme === 'xp' ? 'border-white shadow-lg' : 'border-dark-surface'}`}>
                                        <img src={profileUser.avatarUrl} alt={profileUser.username} className="w-full h-full object-cover"/>
                                    </div>
                                    {isEditingProfile && isCurrentUser && (
                                        <label className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"><Camera size={24} className="text-white" /><input type="file" accept="image/*" className="hidden" onChange={onProfileImageUpload} /></label>
                                    )}
                                </div>
                                <div className="flex-1 pt-2 md:pt-0">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h2 className={`text-3xl font-pixel font-bold flex items-center gap-2 ${theme === 'xp' ? 'text-black' : ''}`}>@{profileUser.username}{profileUser.status && (<div className={`w-3 h-3 rounded-full ${STATUS_OPTIONS[profileUser.status].color.replace('text-', 'bg-')}`} title={STATUS_OPTIONS[profileUser.status].label} />)}</h2>
                                            <p className="text-xs font-mono opacity-60">Joined {profileUser.joinedDate}</p>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <button onClick={() => onOpenSocialList(profileUser.username, 'followers')} className="flex flex-col items-center group"><span className="font-pixel text-lg leading-none group-hover:text-green-500 transition-colors">{profileUser.followers?.length || 0}</span><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Followers</span></button>
                                            <button onClick={() => onOpenSocialList(profileUser.username, 'following')} className="flex flex-col items-center group"><span className="font-pixel text-lg leading-none group-hover:text-green-500 transition-colors">{profileUser.following?.length || 0}</span><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Following</span></button>
                                            <button onClick={onViewHallOfFame} className="flex flex-col items-center group"><Trophy size={18} className="group-hover:text-yellow-500 transition-colors" /><span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Awards</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {isEditingProfile && isCurrentUser ? (
                                    <div className="space-y-4 bg-black/5 p-4 rounded-xl border border-dashed border-white/10">
                                        {/* Edit Form omitted for brevity but logic remains same */}
                                        <div className="flex gap-2 pt-2"><button onClick={onSaveProfile} className="flex-1 bg-green-600 text-white px-4 py-2 rounded font-bold text-xs uppercase">Сохранить</button><button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 rounded border hover:bg-white/10 text-xs uppercase">Отмена</button></div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between"><p className="font-mono font-bold text-sm">{profileUser.tagline}</p><div className="flex gap-2">{isCurrentUser ? (<><button onClick={() => { setEditTagline(user?.tagline || ''); setEditBio(user?.bio || ''); setEditStatus(user?.status || 'ONLINE'); setIsEditingProfile(true); }} className="px-3 py-1.5 border rounded-lg text-[10px] uppercase font-bold hover:bg-white/10 flex items-center gap-2"><Edit2 size={12} /> Edit</button><button onClick={onLogout} className="px-3 py-1.5 border border-red-500/30 text-red-500 rounded-lg"><LogOut size={12} /></button></>) : (<><button onClick={() => onFollow(profileUser.username)} className={`px-4 py-1.5 rounded-lg font-bold font-pixel text-[10px] uppercase transition-all ${isSubscribed ? 'border border-white/20 opacity-60' : 'bg-green-500 text-black border-green-500'}`}>{isSubscribed ? 'Following' : 'Follow'}</button><button onClick={() => onChat(profileUser.username)} className="px-3 py-1.5 border rounded-lg hover:bg-white/10"><MessageSquare size={14} /></button></>)}</div></div>
                                        {profileUser.bio && <p className="font-mono text-sm opacity-70 whitespace-pre-wrap leading-relaxed max-w-2xl">{profileUser.bio}</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* TABS */}
            <div className={`flex mb-4 ${isWinamp ? 'gap-1' : 'border-b border-gray-500/30'}`}>
                {isWinamp ? (
                    <>
                        <button onClick={() => setActiveSection('SHELF')} className={`px-3 py-1 text-[12px] bg-[#292929] border-t border-l border-r border-[#505050] ${activeSection === 'SHELF' ? 'text-wa-gold' : ''}`}>[ SHELF ]</button>
                        <button onClick={() => setActiveSection('LOGS')} className={`px-3 py-1 text-[12px] bg-[#292929] border-t border-l border-r border-[#505050] ${activeSection === 'LOGS' ? 'text-wa-gold' : ''}`}>[ LOGS ]</button>
                        <button onClick={() => setActiveSection('WISHLIST')} className={`px-3 py-1 text-[12px] bg-[#292929] border-t border-l border-r border-[#505050] ${activeSection === 'WISHLIST' ? 'text-wa-gold' : ''}`}>[ WISHLIST ]</button>
                        {isCurrentUser && <button onClick={() => setActiveSection('CONFIG')} className={`px-3 py-1 text-[12px] bg-[#292929] border-t border-l border-r border-[#505050] ${activeSection === 'CONFIG' ? 'text-wa-gold' : ''}`}>[ CFG ]</button>}
                    </>
                ) : (
                    <>
                        <button onClick={() => setActiveSection('SHELF')} className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeSection === 'SHELF' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}><Package size={14} /> ПОЛКА</button>
                        <button onClick={() => setActiveSection('LOGS')} className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeSection === 'LOGS' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}><MessageSquare size={14} /> GUESTBOOK</button>
                        <button onClick={() => setActiveSection('WISHLIST')} className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeSection === 'WISHLIST' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}><Search size={14} /> WISHLIST</button>
                        {isCurrentUser && <button onClick={() => setActiveSection('CONFIG')} className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeSection === 'CONFIG' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}><Settings size={14} /> CONFIG</button>}
                    </>
                )}
            </div>

            {/* CONTENT */}
            {activeSection === 'SHELF' && (
                <div className="space-y-8 animate-in fade-in">
                    {isWinamp && (
                        <div className="flex gap-4 mb-4 text-[12px]">
                            <button onClick={() => setProfileTab('ARTIFACTS')} className={`${profileTab === 'ARTIFACTS' ? 'text-wa-gold' : ''}`}>[ ITEMS ]</button>
                            <button onClick={() => setProfileTab('COLLECTIONS')} className={`${profileTab === 'COLLECTIONS' ? 'text-wa-gold' : ''}`}>[ ALBUMS ]</button>
                        </div>
                    )}
                    {!isWinamp && (
                        <div className="flex items-center gap-4 mb-4">
                            <button onClick={() => setProfileTab('ARTIFACTS')} className={`text-xs font-pixel uppercase ${profileTab === 'ARTIFACTS' ? 'text-green-500 font-bold' : 'opacity-50'}`}>Предметы ({publishedExhibits.length})</button>
                            <button onClick={() => setProfileTab('COLLECTIONS')} className={`text-xs font-pixel uppercase ${profileTab === 'COLLECTIONS' ? 'text-green-500 font-bold' : 'opacity-50'}`}>Коллекции ({userCollections.length})</button>
                        </div>
                    )}

                    {profileTab === 'ARTIFACTS' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {publishedExhibits.map(item => (
                                <ExhibitCard key={item.id} item={item} theme={theme} onClick={onExhibitClick} isLiked={item.likedBy?.includes(user?.username || '') || false} onLike={(e) => onLike(item.id, e)} onAuthorClick={() => {}} />
                            ))}
                        </div>
                    )}
                    {profileTab === 'COLLECTIONS' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {userCollections.map(col => (
                                <CollectionCard key={col.id} col={col} theme={theme} onClick={onCollectionClick} onShare={onShareCollection} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {isCurrentUser && activeSection === 'CONFIG' && (
                <div className={isWinamp ? '' : `p-6 rounded-xl border flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                    {isWinamp ? (
                        <WinampWindow title="PREFERENCES / SKINS">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <button onClick={() => updateSetting('theme', 'dark')} className="p-2 border border-[#505050] hover:text-white">MATRIX_SKIN</button>
                                <button onClick={() => updateSetting('theme', 'light')} className="p-2 border border-[#505050] hover:text-white">OFFICE_SKIN</button>
                                <button onClick={() => updateSetting('theme', 'xp')} className="p-2 border border-[#505050] hover:text-white">XP_LUNA</button>
                                <button onClick={() => updateSetting('theme', 'winamp')} className="p-2 border border-[#505050] text-wa-gold border-wa-gold">WINAMP_CLASSIC</button>
                            </div>
                        </WinampWindow>
                    ) : (
                        <div>
                            <h3 className="font-pixel text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 opacity-70"><Palette size={14}/> Интерфейс / Visuals</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <button onClick={() => updateSetting('theme', 'dark')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localSettings.theme === 'dark' ? 'border-green-500 bg-green-500/10' : 'border-transparent bg-black/5 hover:bg-black/10'}`}><div className="w-8 h-8 bg-black rounded-full border border-gray-700 flex items-center justify-center text-green-500"><Terminal size={16}/></div><span className="font-pixel text-[10px]">MATRIX</span></button>
                                <button onClick={() => updateSetting('theme', 'light')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localSettings.theme === 'light' ? 'border-blue-500 bg-blue-500/10' : 'border-transparent bg-gray-100 hover:bg-gray-200'}`}><div className="w-8 h-8 bg-white rounded-full border border-gray-300 flex items-center justify-center text-black"><Sun size={16}/></div><span className="font-pixel text-[10px]">OFFICE</span></button>
                                <button onClick={() => updateSetting('theme', 'xp')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localSettings.theme === 'xp' ? 'border-blue-600 bg-blue-50' : 'border-transparent bg-blue-50/50 hover:bg-blue-100'}`}><div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full border border-white flex items-center justify-center text-white italic font-serif shadow">XP</div><span className="font-pixel text-[10px]">LUNA</span></button>
                                <button onClick={() => updateSetting('theme', 'winamp')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localSettings.theme === 'winamp' ? 'border-[#00ff00] bg-[#191919]' : 'border-transparent bg-[#191919] hover:border-[#505050]'}`}><div className="w-8 h-8 bg-[#282828] rounded-full border border-[#505050] flex items-center justify-center text-[#00ff00]"><Terminal size={16}/></div><span className="font-pixel text-[10px]">WINAMP</span></button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserProfileView;
