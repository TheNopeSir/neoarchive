
import React, { useState } from 'react';
import { ArrowLeft, Edit2, LogOut, MessageSquare, Send, Trophy, Reply, Trash2, Check, X, Wand2, Eye, EyeOff } from 'lucide-react';
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
    editPassword: string; // New prop
    setEditPassword: (v: string) => void; // New prop
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
    onBack, onLogout, onFollow, onChat, onExhibitClick, onLike, onFavorite, onAuthorClick, 
    onCollectionClick, onShareCollection, onViewHallOfFame, onGuestbookPost, 
    isEditingProfile, setIsEditingProfile, editTagline, setEditTagline, editStatus, setEditStatus, editTelegram, setEditTelegram, 
    editPassword, setEditPassword,
    onSaveProfile, onProfileImageUpload, guestbookInput, setGuestbookInput, guestbookInputRef, profileTab, setProfileTab, refreshData
}) => {
    const profileUser = db.getFullDatabase().users.find(u => u.username === viewedProfileUsername) || { username: viewedProfileUsername, email: 'ghost@matrix.net', tagline: 'Цифровой призрак', avatarUrl: getUserAvatar(viewedProfileUsername), joinedDate: 'Unknown', following: [], achievements: [], telegram: '' } as UserProfile;
    const profileArtifacts = exhibits.filter(e => e.owner === viewedProfileUsername && !e.isDraft);
    const profileCollections = collections.filter(c => c.owner === viewedProfileUsername);
    const isCurrentUser = user?.username === viewedProfileUsername;
    const isSubscribed = user?.following.includes(viewedProfileUsername) || false;

    // Guestbook Edit State
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editEntryText, setEditEntryText] = useState('');
    const [showPassword, setShowPassword] = useState(false);

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
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-gray-500">
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
                        <div className="space-y-2 max-w-sm">
                            <input value={editTagline} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTagline(e.target.value)} placeholder="Статус..." className="w-full bg-transparent border-b p-1 font-mono text-sm" />
                            <input value={editTelegram} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTelegram(e.target.value)} placeholder="Telegram (без @)" className="w-full bg-transparent border-b p-1 font-mono text-sm" />
                            
                            {/* Password Change Field */}
                            <div className="flex items-center gap-2 border-b p-1">
                                <input 
                                    value={editPassword} 
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditPassword(e.target.value)} 
                                    placeholder="Новый пароль (пусто = без изменений)" 
                                    type={showPassword ? "text" : "password"}
                                    className="w-full bg-transparent font-mono text-sm focus:outline-none" 
                                />
                                <button type="button" onClick={generateSecurePassword} title="Сгенерировать безопасный пароль" className="opacity-50 hover:opacity-100 hover:text-green-500">
                                    <Wand2 size={14} />
                                </button>
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="opacity-50 hover:opacity-100">
                                    {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
                                </button>
                            </div>

                            <div className="flex gap-2">
                                {(Object.keys(STATUS_OPTIONS) as UserStatus[]).map(s => (
                                    <button key={s} onClick={() => setEditStatus(s)} className={`p-1 rounded border ${editStatus === s ? 'border-green-500 bg-green-500/20' : 'border-transparent'}`} title={STATUS_OPTIONS[s].label}>
                                        {React.createElement(STATUS_OPTIONS[s].icon, { size: 16 })}
                                    </button>
                                ))}
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
                                    <button onClick={() => { setEditTagline(user?.tagline || ''); setEditStatus(user?.status || 'ONLINE'); setEditTelegram(user?.telegram || ''); setEditPassword(''); setIsEditingProfile(true); }} className="opacity-50 hover:opacity-100">
                                        <Edit2 size={12} />
                                    </button>
                                )}
                            </p>
                            {profileUser.status && (
                                <div className={`flex items-center gap-1 text-xs font-bold ${STATUS_OPTIONS[profileUser.status].color} justify-center md:justify-start`}>
                                    {React.createElement(STATUS_OPTIONS[profileUser.status].icon, { size: 12 })}
                                    {STATUS_OPTIONS[profileUser.status].label}
                                </div>
                            )}
                            {profileUser.telegram && (
                                <a href={`https://t.me/${profileUser.telegram.replace('@', '')}`} target="_blank" rel="nofollow noreferrer" className={`flex items-center gap-1 text-xs font-bold justify-center md:justify-start hover:underline ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                                    <Send size={12} /> Telegram
                                </a>
                            )}
                        </>
                    )}
                    {!isCurrentUser && (
                        <div className="flex gap-2 justify-center md:justify-start pt-2">
                            <button onClick={() => onFollow(profileUser.username)} className={`px-4 py-2 rounded font-bold font-pixel text-xs ${isSubscribed ? 'border border-gray-500 opacity-70' : (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white')}`}>
                                {isSubscribed ? 'ПОДПИСАН' : 'ПОДПИСАТЬСЯ'}
                            </button>
                            <button onClick={() => onChat(profileUser.username)} className="px-4 py-2 rounded border hover:bg-white/10">
                                <MessageSquare size={16} />
                            </button>
                        </div>
                    )}
                    {isCurrentUser && (
                        <div className="flex justify-center md:justify-start pt-2">
                            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-500/10 text-xs font-pixel font-bold transition-colors">
                                <LogOut size={14} /> ВЫЙТИ ИЗ СИСТЕМЫ
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {profileUser.achievements && profileUser.achievements.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-center md:justify-start">
                    {profileUser.achievements.map(achievement => { 
                        if (!achievement.unlocked) return null;
                        const b = BADGE_CONFIG[achievement.id as keyof typeof BADGE_CONFIG]; 
                        if(!b) return null; 
                        return (<div key={achievement.id} className={`px-2 py-1 rounded text-[10px] font-bold text-white ${b.color} flex items-center gap-1`} title={b.desc}>{b.label}</div>) 
                    })}
                </div>
            )}
            <button onClick={onViewHallOfFame} className="w-full py-3 border border-dashed border-gray-500/30 text-xs font-pixel opacity-70 hover:opacity-100 flex items-center justify-center gap-2">
                <Trophy size={14} /> ОТКРЫТЬ ЗАЛ СЛАВЫ
            </button>
            <div className="flex gap-4 border-b border-gray-500/30">
                <button onClick={() => setProfileTab('ARTIFACTS')} className={`pb-2 font-pixel text-xs ${profileTab === 'ARTIFACTS' ? 'border-b-2 border-current font-bold' : 'opacity-50'}`}>АРТЕФАКТЫ</button>
                <button onClick={() => setProfileTab('COLLECTIONS')} className={`pb-2 font-pixel text-xs ${profileTab === 'COLLECTIONS' ? 'border-b-2 border-current font-bold' : 'opacity-50'}`}>КОЛЛЕКЦИИ</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {profileTab === 'ARTIFACTS' && profileArtifacts.map(item => (
                    <ExhibitCard key={item.id} item={item} theme={theme} onClick={onExhibitClick} isLiked={item.likedBy?.includes(user?.username || '') || false} onLike={(e) => onLike(item.id, e)} onAuthorClick={() => {}} />
                ))}
                {profileTab === 'COLLECTIONS' && profileCollections.map(c => <CollectionCard key={c.id} col={c} theme={theme} onClick={onCollectionClick} onShare={onShareCollection} />)}
            </div>
            <div className="pt-8 border-t border-dashed border-gray-500/30">
                <h3 className="font-pixel text-sm mb-4">GUESTBOOK_PROTOCOL</h3>
                <div className="space-y-4 mb-4">
                    {guestbook.filter(g => g.targetUser === profileUser.username).map(entry => {
                        const canModify = user && (user.username === entry.author || isCurrentUser);
                        const isEditing = editingEntryId === entry.id;

                        return (
                            <div key={entry.id} className="p-3 border rounded border-gray-500/30 text-xs relative group">
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold font-pixel cursor-pointer" onClick={() => onAuthorClick(entry.author)}>@{entry.author}</span>
                                    <span className="opacity-50">{entry.timestamp}</span>
                                </div>
                                
                                {isEditing ? (
                                    <div className="flex gap-2 my-2">
                                        <input 
                                            value={editEntryText} 
                                            onChange={(e) => setEditEntryText(e.target.value)} 
                                            className="flex-1 bg-transparent border-b p-1 font-mono text-xs focus:outline-none"
                                            autoFocus
                                        />
                                        <button onClick={() => handleSaveEntry(entry)} className="text-green-500"><Check size={14}/></button>
                                        <button onClick={() => setEditingEntryId(null)} className="text-red-500"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <p className="font-mono mb-2">{entry.text}</p>
                                )}

                                <div className="flex items-center gap-4">
                                    <button onClick={() => { setGuestbookInput(`@${entry.author} `); guestbookInputRef.current?.focus(); }} className="flex items-center gap-1 opacity-50 hover:opacity-100 text-[9px] transition-opacity">
                                        <Reply size={10} /> ОТВЕТИТЬ
                                    </button>
                                    {canModify && !isEditing && (
                                        <>
                                            {user.username === entry.author && (
                                                <button onClick={() => handleEditEntry(entry)} className="flex items-center gap-1 opacity-50 hover:opacity-100 text-[9px] transition-opacity hover:text-yellow-500">
                                                    <Edit2 size={10} /> ПРАВКА
                                                </button>
                                            )}
                                            <button onClick={() => handleDeleteEntry(entry.id)} className="flex items-center gap-1 opacity-50 hover:opacity-100 text-[9px] transition-opacity hover:text-red-500">
                                                <Trash2 size={10} /> УДАЛИТЬ
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {user && (
                    <div className="flex gap-2">
                        <input ref={guestbookInputRef} value={guestbookInput} onChange={e => setGuestbookInput(e.target.value)} placeholder={`Написать @${profileUser.username}...`} className="flex-1 bg-transparent border-b p-2 font-mono text-sm focus:outline-none" />
                        <button onClick={onGuestbookPost} className="p-2 border rounded hover:bg-white/10"><Send size={16} /></button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfileView;