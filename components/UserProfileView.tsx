
import React, { useState } from 'react';
import { ArrowLeft, Edit2, LogOut, MessageSquare, Send, Trophy, Reply, Trash2, Check, X, Wand2, Eye, EyeOff, Users } from 'lucide-react';
import { UserProfile, Exhibit, Collection, GuestbookEntry, UserStatus } from '../types';
import { STATUS_OPTIONS, BADGE_CONFIG } from '../constants';
import * as db from '../services/storageService';
import { getUserAvatar } from '../services/storageService';
import ExhibitCard from './ExhibitCard';
import CollectionCard from './CollectionCard';
import SEO from './SEO';

interface UserProfileViewProps {
    user: UserProfile;
    viewedProfileUsername: string;
    exhibits: Exhibit[];
    collections: Collection[];
    guestbook: GuestbookEntry[];
    theme: 'dark' | 'light';
    onBack: () => void;
    onLogout: () => void;
    onFollow: (username: string) => void;
    onChat: (username: string) => void;
    onExhibitClick: (item: Exhibit) => void;
    onLike: (id: string, e?: React.MouseEvent) => void;
    onFavorite: (id: string, e?: React.MouseEvent) => void;
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
    editStatus: UserStatus;
    setEditStatus: (v: UserStatus) => void;
    editTelegram: string;
    setEditTelegram: (v: string) => void;
    editPassword: string;
    setEditPassword: (v: string) => void;
    onSaveProfile: () => void;
    onProfileImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    guestbookInput: string;
    setGuestbookInput: (v: string) => void;
    guestbookInputRef: React.RefObject<HTMLInputElement>;
    profileTab: 'ARTIFACTS' | 'COLLECTIONS';
    setProfileTab: (v: 'ARTIFACTS' | 'COLLECTIONS') => void;
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ 
    user, viewedProfileUsername, exhibits, collections, guestbook, theme, 
    onBack, onLogout, onFollow, onChat, onExhibitClick, onLike, onAuthorClick, 
    onCollectionClick, onShareCollection, onViewHallOfFame, onGuestbookPost, 
    isEditingProfile, setIsEditingProfile, editTagline, setEditTagline, editStatus, setEditStatus, editTelegram, setEditTelegram, 
    editPassword, setEditPassword,
    onSaveProfile, onProfileImageUpload, guestbookInput, setGuestbookInput, guestbookInputRef, profileTab, setProfileTab, refreshData
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
        telegram: '' 
    } as UserProfile;

    const profileArtifacts = exhibits.filter(e => e.owner === viewedProfileUsername && !e.isDraft);
    const profileCollections = collections.filter(c => c.owner === viewedProfileUsername);
    const isCurrentUser = user?.username === viewedProfileUsername;
    const isSubscribed = user?.following.includes(viewedProfileUsername) || false;

    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editEntryText, setEditEntryText] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showSocialModal, setShowSocialModal] = useState<'followers' | 'following' | null>(null);

    const handleEditEntry = (entry: GuestbookEntry) => {
        setEditingEntryId(entry.id);
        setEditEntryText(entry.text);
    };

    const handleSaveEntry = async (entry: GuestbookEntry) => {
        if (!editEntryText.trim()) return;
        const updated = { ...entry, text: editEntryText };
        await db.updateGuestbookEntry(updated);
        setEditingEntryId(null);
        refreshData();
    };

    const handleDeleteEntry = async (id: string) => {
        if (confirm('Удалить запись?')) {
            await db.deleteGuestbookEntry(id);
            refreshData();
        }
    };

    const generateSecurePassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let pass = "";
        for(let i=0; i<16; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setEditPassword(pass);
        setShowPassword(true);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-32">
            <SEO 
                title={`@${profileUser.username} | Профиль NeoArchive`}
                description={profileUser.tagline || `Посмотрите коллекцию пользователя @${profileUser.username}`}
                image={profileUser.avatarUrl}
                path={`/profile/${profileUser.username}`}
                type="profile"
            />

            <button onClick={onBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs">
                 <ArrowLeft size={16} /> НАЗАД
            </button>
            <div className={`p-6 rounded-xl border-2 flex flex-col md:flex-row items-center gap-6 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
                <div className="relative">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-green-500/30">
                        <img src={profileUser.avatarUrl} alt={profileUser.username || ''} className="w-full h-full object-cover"/>
                    </div>
                    {isCurrentUser && (
                        <label className="absolute bottom-0 right-0 bg-gray-800 p-2 rounded-full cursor-pointer hover:bg-gray-700 text-white border border-gray-600">
                            <Edit2 size={14} />
                            <input type="file" accept="image/*" className="hidden" onChange={onProfileImageUpload} />
                        </label>
                    )}
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                    {isEditingProfile && isCurrentUser ? (
                        <div className="space-y-2 max-w-sm mx-auto md:mx-0">
                            <input value={editTagline} onChange={(e) => setEditTagline(e.target.value)} placeholder="Статус..." className="w-full bg-transparent border-b p-1 font-mono text-sm" />
                            <input value={editTelegram} onChange={(e) => setEditTelegram(e.target.value)} placeholder="Telegram (без @)" className="w-full bg-transparent border-b p-1 font-mono text-sm" />
                            <div className="flex items-center gap-2 border-b p-1">
                                <input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Новый пароль" type={showPassword ? "text" : "password"} className="w-full bg-transparent font-mono text-sm focus:outline-none" />
                                <button type="button" onClick={generateSecurePassword} title="Generate" className="opacity-50 hover:opacity-100 hover:text-green-500"><Wand2 size={14} /></button>
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="opacity-50 hover:opacity-100">{showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
                            </div>
                            <div className="flex gap-2 justify-center md:justify-start">
                                <button onClick={onSaveProfile} className="bg-green-600 text-white px-3 py-1 rounded text-xs">OK</button>
                                <button onClick={() => setIsEditingProfile(false)} className="bg-gray-600 text-white px-3 py-1 rounded text-xs">CANCEL</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-pixel font-bold">@{profileUser.username}</h2>
                            <p className="font-mono opacity-70 flex items-center justify-center md:justify-start gap-2">
                                {profileUser.tagline}
                                {isCurrentUser && (
                                    <button onClick={() => { setEditTagline(user?.tagline || ''); setEditStatus(user?.status || 'ONLINE'); setEditTelegram(user?.telegram || ''); setEditPassword(''); setIsEditingProfile(true); }} className="opacity-50 hover:opacity-100"><Edit2 size={12} /></button>
                                )}
                            </p>
                            
                            <div className="flex items-center justify-center md:justify-start gap-6 pt-2 pb-2">
                                <button onClick={() => setShowSocialModal('followers')} className="flex flex-col items-center md:items-start">
                                    <span className="font-pixel text-lg leading-none">{profileUser.followers?.length || 0}</span>
                                    <span className="text-[9px] font-pixel opacity-50 uppercase">Followers</span>
                                </button>
                                <button onClick={() => setShowSocialModal('following')} className="flex flex-col items-center md:items-start">
                                    <span className="font-pixel text-lg leading-none">{profileUser.following?.length || 0}</span>
                                    <span className="text-[9px] font-pixel opacity-50 uppercase">Following</span>
                                </button>
                            </div>

                            {profileUser.status && (
                                <div className={`flex items-center gap-1 text-xs font-bold ${STATUS_OPTIONS[profileUser.status].color} justify-center md:justify-start`}>
                                    {React.createElement(STATUS_OPTIONS[profileUser.status].icon, { size: 12 })}
                                    {STATUS_OPTIONS[profileUser.status].label}
                                </div>
                            )}
                        </>
                    )}
                    {!isCurrentUser && (
                        <div className="flex gap-2 justify-center md:justify-start pt-2">
                            <button onClick={() => onFollow(profileUser.username)} className={`px-4 py-2 rounded font-bold font-pixel text-xs ${isSubscribed ? 'border border-gray-500 opacity-70' : (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white')}`}>
                                {isSubscribed ? 'ПОДПИСАН' : 'ПОДПИСАТЬСЯ'}
                            </button>
                            <button onClick={() => onChat(profileUser.username)} className="px-4 py-2 rounded border hover:bg-white/10"><MessageSquare size={16} /></button>
                        </div>
                    )}
                </div>
            </div>

            {/* Achievements Section */}
            {profileUser.achievements && profileUser.achievements.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-center md:justify-start">
                    {profileUser.achievements.filter(a => a.unlocked).map(achievement => { 
                        const b = BADGE_CONFIG[achievement.id as keyof typeof BADGE_CONFIG]; 
                        if(!b) return null; 
                        return (<div key={achievement.id} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold text-white ${b.color} flex items-center gap-2 shadow-lg`} title={b.desc}><b.icon size={12}/> {b.label}</div>) 
                    })}
                </div>
            )}

            <div className="flex gap-4 border-b border-gray-500/30">
                <button onClick={() => setProfileTab('ARTIFACTS')} className={`pb-2 font-pixel text-xs ${profileTab === 'ARTIFACTS' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50'}`}>АРТЕФАКТЫ</button>
                <button onClick={() => setProfileTab('COLLECTIONS')} className={`pb-2 font-pixel text-xs ${profileTab === 'COLLECTIONS' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50'}`}>КОЛЛЕКЦИИ</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {profileTab === 'ARTIFACTS' && profileArtifacts.map(item => (
                    <ExhibitCard key={item.id} item={item} theme={theme} onClick={onExhibitClick} isLiked={item.likedBy?.includes(user?.username || '') || false} onLike={(e) => onLike(item.id, e)} onAuthorClick={() => {}} />
                ))}
                {profileTab === 'COLLECTIONS' && profileCollections.map(c => <CollectionCard key={c.id} col={c} theme={theme} onClick={onCollectionClick} onShare={onShareCollection} />)}
            </div>

            {/* Social Modal */}
            {showSocialModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
                    <div className={`w-full max-w-sm rounded-2xl border-2 p-6 ${theme === 'dark' ? 'bg-black border-dark-dim' : 'bg-white border-light-dim'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-pixel text-sm uppercase tracking-widest">{showSocialModal === 'followers' ? 'ПОДПИСЧИКИ' : 'ПОДПИСКИ'}</h2>
                            <button onClick={() => setShowSocialModal(null)}><X size={20}/></button>
                        </div>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                            {(showSocialModal === 'followers' ? profileUser.followers : profileUser.following).map(name => (
                                <div key={name} className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-all">
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => { onAuthorClick(name); setShowSocialModal(null); }}>
                                        <img src={getUserAvatar(name)} className="w-8 h-8 rounded-full border border-white/10" />
                                        <span className="font-pixel text-xs">@{name}</span>
                                    </div>
                                    <button onClick={() => { onChat(name); setShowSocialModal(null); }} className="p-2 opacity-50 hover:opacity-100"><MessageSquare size={14}/></button>
                                </div>
                            ))}
                            {(showSocialModal === 'followers' ? profileUser.followers : profileUser.following).length === 0 && (
                                <div className="text-center py-10 opacity-30 font-mono text-xs">ПУСТО</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileView;
