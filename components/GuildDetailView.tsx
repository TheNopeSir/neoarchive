
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Users, Shield, BookOpen, Share2, LogOut, Trash2, UserMinus, Send, MessageSquare, Package, Info, RefreshCw } from 'lucide-react';
import { Guild, UserProfile, GuildMessage } from '../types';
import { getUserAvatar, leaveGuild, kickFromGuild, deleteGuild, sendGuildMessage, loadGuildMessages, getGuildMessages, getGuildArtifacts } from '../services/storageService';
import ExhibitCard from './ExhibitCard';

interface GuildDetailViewProps {
    guild: Guild;
    currentUser: UserProfile;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onBack: () => void;
    onUserClick: (username: string) => void;
}

const GuildDetailView: React.FC<GuildDetailViewProps> = ({ 
    guild, currentUser, theme, onBack, onUserClick 
}) => {
    const [activeTab, setActiveTab] = useState<'INFO' | 'CHAT' | 'STASH' | 'MEMBERS'>('INFO');
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<GuildMessage[]>([]);
    const [inviteCopied, setInviteCopied] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatIntervalRef = useRef<any>(null);

    const isLeader = guild.leader === currentUser.username;
    const isWinamp = theme === 'winamp';
    const stash = getGuildArtifacts(guild.id);

    // Initial load and polling for chat
    useEffect(() => {
        if (activeTab === 'CHAT') {
            loadGuildMessages(guild.id).then(setMessages);
            chatIntervalRef.current = setInterval(() => {
                setMessages(getGuildMessages(guild.id)); // Get from cache which is updated by global poller ideally, but we force check here
                loadGuildMessages(guild.id).then(setMessages); // Brute force fetch for now to ensure freshness
            }, 3000);
        } else {
            if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
        }
        return () => { if (chatIntervalRef.current) clearInterval(chatIntervalRef.current); };
    }, [activeTab, guild.id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleCopyInvite = () => {
        const code = guild.inviteCode || 'ERROR';
        navigator.clipboard.writeText(code);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
    };

    const handleLeave = async () => {
        if (isLeader) {
            alert('Лидер не может покинуть гильдию. Удалите её или передайте права.');
            return;
        }
        if (confirm('Покинуть гильдию?')) {
            const success = await leaveGuild(guild.id, currentUser.username);
            if(success) onBack();
        }
    };

    const handleDelete = async () => {
        if (confirm('Удалить гильдию? Все данные будут стерты.')) {
            await deleteGuild(guild.id);
            onBack();
        }
    };

    const handleKick = async (member: string) => {
        if (confirm(`Исключить @${member}?`)) {
            await kickFromGuild(guild.id, member);
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        await sendGuildMessage(guild.id, currentUser.username, chatInput);
        setChatInput('');
        setMessages(getGuildMessages(guild.id)); // Optimistic update
    };

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 border-b-2 transition-all ${activeTab === id ? (isWinamp ? 'border-[#00ff00] text-[#00ff00]' : 'border-green-500 text-green-500 font-bold') : 'border-transparent opacity-50 hover:opacity-100'}`}
        >
            <Icon size={16} />
            <span className="text-[10px] font-pixel uppercase">{label}</span>
        </button>
    );

    return (
        <div className={`max-w-4xl mx-auto animate-in fade-in pb-32 pt-4 px-4 h-full flex flex-col ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={onBack} className={`flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    <ArrowLeft size={16} /> НАЗАД
                </button>
                <h2 className={`font-pixel text-sm uppercase tracking-widest ${isWinamp ? 'text-[#00ff00]' : ''}`}>{guild.name}</h2>
            </div>

            {/* Banner/Info Card */}
            <div className={`p-6 rounded-3xl border mb-6 relative overflow-hidden ${isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-gradient-to-br from-gray-900 to-black border-white/10'}`}>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 flex-shrink-0">
                        {guild.bannerUrl ? <img src={guild.bannerUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-green-900 text-green-400 text-2xl font-bold">{guild.name[0]}</div>}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className={`text-xl font-pixel font-bold ${isWinamp ? 'text-[#00ff00]' : 'text-white'}`}>{guild.name}</h1>
                            {guild.isPrivate && <Shield size={14} className="text-yellow-500" />}
                        </div>
                        <p className="opacity-60 text-xs font-mono line-clamp-2">{guild.description}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleCopyInvite} className="p-3 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/40 border border-blue-600/30 transition-all" title="Копировать код">
                            <Share2 size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={`flex border-b mb-6 ${isWinamp ? 'border-[#505050]' : 'border-white/10'}`}>
                <TabButton id="INFO" label="Инфо" icon={Info} />
                <TabButton id="CHAT" label="Мейнфрейм" icon={MessageSquare} />
                <TabButton id="STASH" label="Склад" icon={Package} />
                <TabButton id="MEMBERS" label="Узлы" icon={Users} />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[300px]">
                
                {/* INFO TAB */}
                {activeTab === 'INFO' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className={`p-6 rounded-2xl border ${isWinamp ? 'bg-black border-[#505050]' : 'bg-white/5 border-white/10'}`}>
                            <h3 className="font-pixel text-sm mb-4 flex items-center gap-2 text-yellow-500"><BookOpen size={16}/> ПРОТОКОЛ (ПРАВИЛА)</h3>
                            <p className="font-mono text-sm opacity-80 whitespace-pre-wrap">{guild.rules || "Правила не установлены лидером."}</p>
                        </div>
                        <div className={`p-6 rounded-2xl border ${isWinamp ? 'bg-black border-[#505050]' : 'bg-white/5 border-white/10'}`}>
                            <h3 className="font-pixel text-sm mb-4 flex items-center gap-2"><Info size={16}/> СТАТИСТИКА</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[10px] opacity-50 uppercase">Участников</div>
                                    <div className="text-xl font-bold">{guild.members.length}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] opacity-50 uppercase">Артефактов</div>
                                    <div className="text-xl font-bold">{stash.length}</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center">
                             {!isLeader ? (
                                <button onClick={handleLeave} className="text-red-500 flex items-center gap-2 text-xs font-bold hover:underline"><LogOut size={14}/> ПОКИНУТЬ СЕТЬ</button>
                             ) : (
                                <button onClick={handleDelete} className="text-red-500 flex items-center gap-2 text-xs font-bold hover:underline"><Trash2 size={14}/> УНИЧТОЖИТЬ СЕТЬ</button>
                             )}
                        </div>
                    </div>
                )}

                {/* CHAT TAB */}
                {activeTab === 'CHAT' && (
                    <div className="flex flex-col h-[60vh] animate-in slide-in-from-right-4">
                        <div className={`flex-1 border rounded-t-xl overflow-y-auto p-4 space-y-4 ${isWinamp ? 'bg-black border-[#505050]' : 'bg-black/20 border-white/10'}`}>
                            {messages.length === 0 && <div className="text-center opacity-30 text-xs py-10 font-mono">Канал связи установлен. Сообщений нет.</div>}
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex gap-3 ${msg.author === currentUser.username ? 'flex-row-reverse' : ''}`}>
                                    <div onClick={() => onUserClick(msg.author)} className="cursor-pointer w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/20">
                                        <img src={getUserAvatar(msg.author)} className="w-full h-full object-cover"/>
                                    </div>
                                    <div className={`max-w-[80%] rounded-xl p-3 text-xs font-mono ${msg.author === currentUser.username ? 'bg-green-900/50 text-green-100' : 'bg-white/5'}`}>
                                        <div className="font-bold mb-1 opacity-50">{msg.author}</div>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <div className={`p-2 border-x border-b rounded-b-xl flex gap-2 ${isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-white/5 border-white/10'}`}>
                            <input 
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="Ввести данные..."
                                className="flex-1 bg-transparent border-none outline-none font-mono text-sm px-2"
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button onClick={handleSendMessage} className="p-2 bg-green-500 text-black rounded hover:opacity-90"><Send size={16}/></button>
                        </div>
                    </div>
                )}

                {/* STASH TAB */}
                {activeTab === 'STASH' && (
                    <div className="animate-in slide-in-from-right-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {stash.length === 0 && <div className="col-span-full text-center opacity-30 py-10 font-mono text-xs">Склад пуст</div>}
                            {stash.map(item => (
                                <ExhibitCard 
                                    key={item.id} 
                                    item={item} 
                                    theme={theme} 
                                    onClick={() => {}} 
                                    isLiked={false} 
                                    onLike={() => {}} 
                                    onAuthorClick={onUserClick}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* MEMBERS TAB */}
                {activeTab === 'MEMBERS' && (
                    <div className="space-y-2 animate-in slide-in-from-right-4">
                        {guild.members.map(member => (
                            <div key={member} className={`flex items-center justify-between p-3 rounded-xl border ${isWinamp ? 'border-[#505050] bg-[#191919]' : 'border-white/10 bg-white/5'}`}>
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick(member)}>
                                    <img src={getUserAvatar(member)} className="w-10 h-10 rounded-full border border-white/20" />
                                    <div>
                                        <div className={`font-bold text-sm ${isWinamp ? 'text-[#00ff00]' : ''}`}>@{member}</div>
                                        <div className="text-[10px] opacity-50 uppercase">{member === guild.leader ? 'ЛИДЕР' : 'УЧАСТНИК'}</div>
                                    </div>
                                </div>
                                {isLeader && member !== currentUser.username && (
                                    <button onClick={() => handleKick(member)} className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors" title="Исключить">
                                        <UserMinus size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
};

export default GuildDetailView;
