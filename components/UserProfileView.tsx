import React, { useState } from 'react';
import { ArrowLeft, Edit2, LogOut, MessageSquare, Send, Trophy, Reply, Trash2, Check, X, Wand2, Eye, EyeOff, Users, Palette, Settings, Volume2, Bell, Shield, Database, Monitor, Sun, Moon, Terminal } from 'lucide-react';
import { UserProfile, Exhibit, Collection, GuestbookEntry, UserStatus, AppSettings } from '../types';
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
    theme: 'dark' | 'light' | 'xp';
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
    onOpenSocialList: (username: string, type: 'followers' | 'following') => void;
    onThemeChange?: (theme: 'dark' | 'light' | 'xp') => void;
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ 
    user, viewedProfileUsername, exhibits, collections, guestbook, theme, 
    onBack, onLogout, onFollow, onChat, onExhibitClick, onLike, onAuthorClick, 
    onCollectionClick, onShareCollection, onViewHallOfFame, onGuestbookPost, 
    isEditingProfile, setIsEditingProfile, editTagline, setEditTagline, editStatus, setEditStatus, editTelegram, setEditTelegram, 
    editPassword, setEditPassword,
    onSaveProfile, onProfileImageUpload, guestbookInput, setGuestbookInput, guestbookInputRef, profileTab, setProfileTab, refreshData,
    onOpenSocialList, onThemeChange
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

    // View State: 'LOGS' (Guestbook) or 'CONFIG' (Settings)
    const [activeSection, setActiveSection] = useState<'LOGS' | 'CONFIG'>('LOGS');

    // Guestbook Edit State
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editEntryText, setEditEntryText] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Settings State
    const [localSettings, setLocalSettings] = useState<AppSettings>(user?.settings || {
        theme: 'dark',
        notificationsEnabled: true,
        soundEnabled: true,
        publicProfile: true,
        showEmail: false
    });

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

    const updateSetting = async (key: keyof AppSettings, value: any) => {
        if (!isCurrentUser) return;
        
        const newSettings = { ...localSettings, [key]: value };
        setLocalSettings(newSettings);
        
        // Immediate Theme Effect
        if (key === 'theme' && onThemeChange) {
            onThemeChange(value);
        }

        // Save to DB
        const updatedUser = { ...user, settings: newSettings };
        await db.updateUserProfile(updatedUser);
        // We don't necessarily need to trigger a full app refresh for settings unless critical
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
            <div className={`p-6 rounded-xl border-2 flex flex-col md:flex-row items-center gap-6 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : theme === 'xp' ? 'bg-white border-[#245DDA] shadow-lg rounded-t-lg' : 'bg-white border-light-dim'}`}>
                {theme === 'xp' && <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-[#0058EE] to-[#3F8CF3] rounded-t-lg flex items-center px-4"><span className="text-white font-bold text-sm drop-shadow-md italic">User Properties</span></div>}
                
                <div className={`relative ${theme === 'xp' ? 'mt-6' : ''}`}>
                    <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 ${theme === 'xp' ? 'border-[#245DDA]' : 'border-green-500/30'}`}>
                        <img src={profileUser.avatarUrl} alt={profileUser.username || ''} className="w-full h-full object-cover"/>
                    </div>
                    {isCurrentUser && (
                        <label className="absolute bottom-0 right-0 bg-gray-800 p-2 rounded-full cursor-pointer hover:bg-gray-700 text-white border border-gray-600">
                            <Edit2 size={14} />
                            <input type="file" accept="image/*" className="hidden" onChange={onProfileImageUpload} />
                        </label>
                    )}
                </div>
                <div className={`flex-1 text-center md:text-left space-y-2 ${theme === 'xp' ? 'mt-6' : ''}`}>
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
                            <div className="flex items-center justify-center md:justify-start gap-4">
                                <h2 className={`text-2xl font-pixel font-bold ${theme === 'xp' ? 'text-black' : ''}`}>@{profileUser.username}</h2>
                                {isCurrentUser && (
                                    <button onClick={onLogout} className="text-red-500 opacity-50 hover:opacity-100" title="ВЫХОД"><LogOut size={18}/></button>
                                )}
                            </div>
                            <p className="font-mono opacity-70 flex items-center justify-center md:justify-start gap-2">
                                {profileUser.tagline}
                                {isCurrentUser && (
                                    <button onClick={() => { setEditTagline(user?.tagline || ''); setEditStatus(user?.status || 'ONLINE'); setEditTelegram(user?.telegram || ''); setEditPassword(''); setIsEditingProfile(true); }} className="opacity-50 hover:opacity-100"><Edit2 size={12} /></button>
                                )}
                            </p>
                            
                            <div className="flex items-center justify-center md:justify-start gap-6 pt-2 pb-2">
                                <button onClick={() => onOpenSocialList(profileUser.username, 'followers')} className="flex flex-col items-center md:items-start group">
                                    <span className="font-pixel text-lg leading-none group-hover:text-green-500 transition-colors">{profileUser.followers?.length || 0}</span>
                                    <span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Followers</span>
                                </button>
                                <button onClick={() => onOpenSocialList(profileUser.username, 'following')} className="flex flex-col items-center md:items-start group">
                                    <span className="font-pixel text-lg leading-none group-hover:text-green-500 transition-colors">{profileUser.following?.length || 0}</span>
                                    <span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Following</span>
                                </button>
                                <button onClick={onViewHallOfFame} className="flex flex-col items-center md:items-start group">
                                    <Trophy size={18} className="group-hover:text-yellow-500 transition-colors" />
                                    <span className="text-[9px] font-pixel opacity-50 uppercase group-hover:opacity-100">Achievements</span>
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

            {/* TAB NAVIGATION */}
            <div className="flex mb-4 border-b border-gray-500/30">
                <button 
                    onClick={() => setActiveSection('LOGS')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeSection === 'LOGS' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}
                >
                    <MessageSquare size={14} /> GUESTBOOK
                </button>
                {isCurrentUser && (
                    <button 
                        onClick={() => setActiveSection('CONFIG')}
                        className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeSection === 'CONFIG' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}
                    >
                        <Settings size={14} /> CONFIG
                    </button>
                )}
            </div>

            {/* SETTINGS PANEL */}
            {isCurrentUser && activeSection === 'CONFIG' && (
                <div className={`p-6 rounded-xl border flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 ${theme === 'dark' ? 'bg-dark-surface border-dark-dim' : theme === 'xp' ? 'bg-white border-[#245DDA] shadow-lg' : 'bg-white border-light-dim'}`}>
                    
                    {/* Visuals Section */}
                    <div>
                        <h3 className={`font-pixel text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${theme === 'xp' ? 'text-blue-800' : 'opacity-70'}`}>
                            <Palette size={14}/> Интерфейс / Visuals
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button onClick={() => updateSetting('theme', 'dark')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localSettings.theme === 'dark' ? 'border-green-500 bg-green-500/10' : 'border-transparent bg-black/5 hover:bg-black/10'}`}>
                                <div className="w-8 h-8 bg-black rounded-full border border-gray-700 flex items-center justify-center text-green-500"><Terminal size={16}/></div>
                                <span className="font-pixel text-[10px]">MATRIX</span>
                            </button>
                            <button onClick={() => updateSetting('theme', 'light')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localSettings.theme === 'light' ? 'border-blue-500 bg-blue-500/10' : 'border-transparent bg-gray-100 hover:bg-gray-200'}`}>
                                <div className="w-8 h-8 bg-white rounded-full border border-gray-300 flex items-center justify-center text-black"><Sun size={16}/></div>
                                <span className="font-pixel text-[10px]">OFFICE</span>
                            </button>
                            <button onClick={() => updateSetting('theme', 'xp')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${localSettings.theme === 'xp' ? 'border-blue-600 bg-blue-50' : 'border-transparent bg-blue-50/50 hover:bg-blue-100'}`}>
                                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full border border-white flex items-center justify-center text-white italic font-serif shadow">XP</div>
                                <span className="font-pixel text-[10px]">LUNA</span>
                            </button>
                        </div>
                    </div>

                    <div className="w-full h-[1px] bg-gray-500/20" />

                    {/* Preferences Section */}
                    <div>
                        <h3 className={`font-pixel text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${theme === 'xp' ? 'text-blue-800' : 'opacity-70'}`}>
                            <Settings size={14}/> Предпочтения / Preferences
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Bell size={18} className="opacity-70" />
                                    <div>
                                        <div className="font-bold text-xs font-pixel">Уведомления</div>
                                        <div className="text-[10px] opacity-50 font-mono">Получать оповещения о лайках и комментариях</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => updateSetting('notificationsEnabled', !localSettings.notificationsEnabled)}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${localSettings.notificationsEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${localSettings.notificationsEnabled ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Volume2 size={18} className="opacity-70" />
                                    <div>
                                        <div className="font-bold text-xs font-pixel">Звуковые эффекты</div>
                                        <div className="text-[10px] opacity-50 font-mono">UI звуки интерфейса (Beta)</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => updateSetting('soundEnabled', !localSettings.soundEnabled)}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${localSettings.soundEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${localSettings.soundEnabled ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Shield size={18} className="opacity-70" />
                                    <div>
                                        <div className="font-bold text-xs font-pixel">Приватный профиль</div>
                                        <div className="text-[10px] opacity-50 font-mono">Скрыть коллекции от неподписанных пользователей</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => updateSetting('publicProfile', !localSettings.publicProfile)}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${!localSettings.publicProfile ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${!localSettings.publicProfile ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-[1px] bg-gray-500/20" />

                    {/* Data Section */}
                    <div>
                        <h3 className={`font-pixel text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${theme === 'xp' ? 'text-blue-800' : 'opacity-70'}`}>
                            <Database size={14}/> Данные / Data
                        </h3>
                        <button 
                            onClick={() => {
                                if(confirm("Это удалит локальный кэш изображений и данных для освобождения места. Вы не выйдете из аккаунта. Продолжить?")) {
                                    db.clearLocalCache();
                                }
                            }}
                            className="w-full py-3 border border-red-500/50 text-red-500 hover:bg-red-500/10 rounded-xl font-pixel text-xs flex items-center justify-center gap-2 transition-all"
                        >
                            <Trash2 size={16} /> ОЧИСТИТЬ ЛОКАЛЬНЫЙ КЭШ
                        </button>
                    </div>

                </div>
            )}

            {/* GUESTBOOK PANEL */}
            {activeSection === 'LOGS' && (
                <div className={`pt-4 border-t border-dashed ${theme === 'xp' ? 'border-blue-800/30' : 'border-gray-500/30'}`}>
                    <h3 className={`font-pixel text-sm mb-4 ${theme === 'xp' ? 'text-black' : ''}`}>GUESTBOOK_PROTOCOL</h3>
                    <div className="space-y-4 mb-4">
                        {guestbook.filter(g => g.targetUser === profileUser.username).length === 0 ? (
                            <div className="text-center py-8 opacity-30 font-mono text-xs uppercase">ЗАПИСЕЙ НЕТ</div>
                        ) : (
                            guestbook.filter(g => g.targetUser === profileUser.username).map(entry => {
                                const canModify = user && (user.username === entry.author || isCurrentUser);
                                const isEditing = editingEntryId === entry.id;

                                return (
                                    <div key={entry.id} className={`p-3 border rounded text-xs relative group ${theme === 'xp' ? 'bg-white border-blue-200 text-black shadow-sm' : 'border-gray-500/30'}`}>
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
                                                        <button onClick={() => handleEditEntry(entry)} className="flex items-center gap-1 opacity-50 hover:opacity-100 text-[9px] transition-opacity hover:Yellow-500">
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
                            })
                        )}
                    </div>
                    {user && (
                        <div className="flex gap-2">
                            <input ref={guestbookInputRef} value={guestbookInput} onChange={e => setGuestbookInput(e.target.value)} placeholder={`Написать @${profileUser.username}...`} className={`flex-1 bg-transparent border-b p-2 font-mono text-sm focus:outline-none ${theme === 'xp' ? 'text-black border-blue-300 placeholder-gray-500' : ''}`} />
                            <button onClick={onGuestbookPost} className="p-2 border rounded hover:bg-white/10"><Send size={16} /></button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserProfileView;