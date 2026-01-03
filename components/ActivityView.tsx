
import React, { useState } from 'react';
import { Bell, MessageCircle, ChevronDown, ChevronUp, User, Heart, MessageSquare, UserPlus, BookOpen, CheckCheck, RefreshCw, X, Check } from 'lucide-react';
import { Notification, Message, UserProfile, Exhibit, TradeRequest } from '../types';
import { getUserAvatar, markNotificationsRead, getFullDatabase, respondToTradeRequest } from '../services/storageService';

interface ActivityViewProps {
    notifications: Notification[];
    messages: Message[];
    currentUser: UserProfile;
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onAuthorClick: (username: string) => void;
    onExhibitClick: (id: string, commentId?: string) => void;
    onChatClick: (username: string) => void;
}

const ActivityView: React.FC<ActivityViewProps> = ({ 
    notifications, messages, currentUser, theme, 
    onAuthorClick, onExhibitClick, onChatClick 
}) => {
    const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'MESSAGES' | 'TRADES'>('NOTIFICATIONS');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const myNotifs = notifications.filter(n => n.recipient === currentUser.username);
    const myMessages = messages.filter(m => m.sender === currentUser.username || m.receiver === currentUser.username);
    const db = getFullDatabase();
    
    // Trade Requests where I am Receiver (Incoming) or Sender (Outgoing)
    const myTrades = db.tradeRequests.filter(t => t.receiver === currentUser.username || t.sender === currentUser.username);
    const incomingTrades = myTrades.filter(t => t.receiver === currentUser.username && t.status === 'PENDING');
    const historyTrades = myTrades.filter(t => !(t.receiver === currentUser.username && t.status === 'PENDING'));

    const handleMarkAllRead = () => {
        markNotificationsRead(currentUser.username);
    };

    const handleTradeResponse = async (id: string, status: 'ACCEPTED' | 'DECLINED') => {
        if(confirm(status === 'ACCEPTED' ? 'Принять обмен? Это действие необратимо. Владельцы предметов будут изменены.' : 'Отклонить предложение?')) {
            await respondToTradeRequest(id, status);
        }
    };

    const groupedNotifs = myNotifs.reduce((acc, notif) => {
        const key = notif.targetId 
            ? `${notif.type}_${notif.targetId}` 
            : `${notif.type}_${new Date(notif.timestamp).toDateString()}`;
        
        if (!acc[key]) acc[key] = [];
        acc[key].push(notif);
        return acc;
    }, {} as Record<string, Notification[]>);

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'LIKE': return <Heart size={14} className="text-red-500" />;
            case 'COMMENT': return <MessageSquare size={14} className="text-blue-500" />;
            case 'FOLLOW': return <UserPlus size={14} className="text-green-500" />;
            case 'GUESTBOOK': return <BookOpen size={14} className="text-yellow-500" />;
            case 'TRADE_OFFER': return <RefreshCw size={14} className="text-purple-500" />;
            default: return <Bell size={14} />;
        }
    };

    const renderNotificationGroup = (key: string, group: Notification[]) => {
        const first = group[0];
        const isExpanded = expandedGroups[key];
        const count = group.length;
        const hasUnread = group.some(n => !n.isRead);
        const uniqueActors = Array.from(new Set(group.map(n => n.actor)));
        
        let title = '';
        if (first.type === 'LIKE') title = `Понравился ваш артефакт "${first.targetPreview}"`;
        else if (first.type === 'COMMENT') title = `Новые комментарии к "${first.targetPreview}"`;
        else if (first.type === 'FOLLOW') title = `Новые подписчики`;
        else if (first.type === 'GUESTBOOK') title = `Записи в гостевой книге`;
        else if (first.type === 'TRADE_OFFER') title = `Предложение обмена`;
        else if (first.type === 'TRADE_ACCEPTED') title = `Обмен завершен!`;

        const actorText = uniqueActors.length === 1 
            ? <span className="font-bold">@{uniqueActors[0]}</span>
            : <span className="font-bold">@{uniqueActors[0]} и еще {uniqueActors.length - 1}</span>;

        return (
            <div key={key} className={`border rounded mb-3 overflow-hidden transition-all ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : theme === 'winamp' ? 'border-[#505050] bg-[#191919] text-[#00ff00]' : 'border-gray-200 bg-white'} ${hasUnread ? 'border-l-4 border-l-green-500' : 'opacity-70'}`}>
                <div 
                    onClick={() => toggleGroup(key)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${theme === 'dark' ? 'border-gray-600 bg-gray-800' : theme === 'winamp' ? 'border-[#505050] bg-black' : 'border-gray-300 bg-gray-100'}`}>
                            {getIconForType(first.type)}
                        </div>
                        <div>
                            <div className="text-xs font-mono opacity-50 mb-0.5">{first.timestamp.split(',')[0]}</div>
                            <div className="text-sm">
                                {actorText} <span className="opacity-70">{title}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {count > 1 && <span className="text-[10px] bg-green-500 text-black px-1.5 rounded-full font-bold">+{count}</span>}
                        {hasUnread && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>

                {isExpanded && (
                    <div className={`border-t ${theme === 'dark' ? 'border-gray-700 bg-black/20' : theme === 'winamp' ? 'border-[#505050] bg-black' : 'border-gray-200 bg-gray-50'}`}>
                        {group.map(notif => (
                            <div key={notif.id} className={`p-3 flex items-center gap-3 hover:bg-white/5 border-b border-dashed border-gray-500/20 last:border-0 ${!notif.isRead ? 'bg-green-500/5' : ''}`}>
                                <div onClick={() => onAuthorClick(notif.actor)} className="cursor-pointer w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                    <img src={getUserAvatar(notif.actor)} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 text-xs">
                                    <span onClick={() => onAuthorClick(notif.actor)} className="font-bold cursor-pointer hover:underline">@{notif.actor}</span>
                                    <span className="opacity-70 ml-2">{notif.timestamp}</span>
                                    {notif.targetId && notif.type !== 'TRADE_OFFER' && (
                                        <button 
                                            onClick={() => onExhibitClick(notif.targetId!, notif.contextId)}
                                            className="ml-auto float-right text-[10px] font-pixel border px-2 py-0.5 rounded opacity-50 hover:opacity-100"
                                        >
                                            VIEW
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const groupedMessages = Object.entries(myMessages.reduce((acc, m) => {
         const partner = m.sender === currentUser.username ? m.receiver : m.sender;
         if (!acc[partner] || new Date(m.timestamp) > new Date(acc[partner].timestamp)) acc[partner] = m;
         return acc;
    }, {} as Record<string, Message>)) as [string, Message][];

    return (
        <div className={`max-w-2xl mx-auto animate-in fade-in pb-20 ${theme === 'winamp' ? 'font-mono text-gray-300' : ''}`}>
            <div className={`flex mb-6 border-b ${theme === 'winamp' ? 'border-[#505050]' : 'border-gray-500/30'}`}>
                <button 
                    onClick={() => setActiveTab('NOTIFICATIONS')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'NOTIFICATIONS' ? (theme === 'winamp' ? 'border-b-2 border-[#00ff00] text-[#00ff00]' : 'border-b-2 border-green-500 text-green-500 font-bold') : 'opacity-50 hover:opacity-100'}`}
                >
                    <Bell size={14} /> УВЕДОМЛЕНИЯ
                    {myNotifs.some(n => !n.isRead) && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>}
                </button>
                <button 
                    onClick={() => setActiveTab('MESSAGES')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'MESSAGES' ? (theme === 'winamp' ? 'border-b-2 border-[#00ff00] text-[#00ff00]' : 'border-b-2 border-green-500 text-green-500 font-bold') : 'opacity-50 hover:opacity-100'}`}
                >
                    <MessageCircle size={14} /> СООБЩЕНИЯ
                    {myMessages.some(m => !m.isRead && m.receiver === currentUser.username) && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>}
                </button>
                <button 
                    onClick={() => setActiveTab('TRADES')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'TRADES' ? (theme === 'winamp' ? 'border-b-2 border-[#00ff00] text-[#00ff00]' : 'border-b-2 border-green-500 text-green-500 font-bold') : 'opacity-50 hover:opacity-100'}`}
                >
                    <RefreshCw size={14} /> ТРЕЙДЫ
                    {incomingTrades.length > 0 && <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"/>}
                </button>
            </div>

            <div className="space-y-4">
                {activeTab === 'NOTIFICATIONS' && (
                    <div>
                        {myNotifs.length > 0 && (
                            <div className="flex justify-end mb-4">
                                <button onClick={handleMarkAllRead} className="flex items-center gap-2 text-[10px] font-pixel opacity-50 hover:opacity-100">
                                    <CheckCheck size={14}/> ПРОЧИТАТЬ ВСЕ
                                </button>
                            </div>
                        )}
                        {Object.keys(groupedNotifs).length === 0 ? (
                            <div className="text-center opacity-50 font-mono py-10">НЕТ НОВЫХ СОБЫТИЙ</div>
                        ) : (
                            (Object.entries(groupedNotifs) as [string, Notification[]][])
                                .sort(([,a], [,b]) => b[0].timestamp.localeCompare(a[0].timestamp))
                                .map(([key, group]) => renderNotificationGroup(key, group))
                        )}
                    </div>
                )}

                {activeTab === 'MESSAGES' && (
                    <div className="space-y-2">
                        {groupedMessages.length === 0 ? (
                             <div className="text-center opacity-50 font-mono py-10">СПИСОК СООБЩЕНИЙ ПУСТ</div>
                        ) : (
                            groupedMessages
                                .sort(([,a], [,b]) => b.timestamp.localeCompare(a.timestamp))
                                .map(([partner, lastMsg]) => (
                                    <div key={partner} onClick={() => onChatClick(partner)} className={`p-4 border rounded cursor-pointer hover:bg-white/5 flex gap-4 items-center transition-colors ${!lastMsg.isRead && lastMsg.receiver === currentUser.username ? 'border-green-500 bg-green-500/5' : (theme === 'dark' ? 'border-gray-700' : theme === 'winamp' ? 'border-[#505050] bg-[#191919]' : 'border-gray-200')}`}>
                                        <div className={`w-12 h-12 rounded-full overflow-hidden border ${theme === 'winamp' ? 'border-[#505050]' : 'border-gray-600'}`}>
                                            <img src={getUserAvatar(partner)} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm flex justify-between mb-1">
                                                @{partner} 
                                                <span className="opacity-50 font-normal text-[10px] font-mono">{lastMsg.timestamp.split(',')[1] || lastMsg.timestamp}</span>
                                            </div>
                                            <div className={`text-xs font-mono truncate ${!lastMsg.isRead && lastMsg.receiver === currentUser.username ? 'text-green-500 font-bold' : 'opacity-70'}`}>
                                                {lastMsg.sender === currentUser.username ? 'Вы: ' : ''}{lastMsg.text}
                                            </div>
                                        </div>
                                        <ChevronDown size={16} className="opacity-50 -rotate-90" />
                                    </div>
                                ))
                        )}
                    </div>
                )}

                {activeTab === 'TRADES' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        {/* INCOMING */}
                        <div>
                            <h3 className="font-pixel text-xs opacity-50 mb-4 uppercase tracking-widest">ВХОДЯЩИЕ ЗАПРОСЫ ({incomingTrades.length})</h3>
                            {incomingTrades.length === 0 ? (
                                <div className="text-xs font-mono opacity-30 italic">Нет новых предложений</div>
                            ) : (
                                incomingTrades.map(trade => {
                                    // Resolve Items
                                    const offered = db.exhibits.filter(e => trade.offeredItems.includes(e.id));
                                    const requested = db.exhibits.filter(e => trade.requestedItems.includes(e.id));
                                    return (
                                        <div key={trade.id} className="border border-purple-500/50 bg-purple-500/5 p-4 rounded-xl mb-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="font-bold text-sm">От: <span className="text-green-500">@{trade.sender}</span></div>
                                                <div className="text-[10px] opacity-50">{trade.timestamp}</div>
                                            </div>
                                            
                                            <div className="flex gap-4 items-center mb-4">
                                                <div className="flex-1 border border-dashed border-white/20 p-2 rounded">
                                                    <div className="text-[9px] uppercase opacity-50 mb-1">ПРЕДЛАГАЕТ ВАМ:</div>
                                                    <div className="flex gap-1 overflow-x-auto">
                                                        {offered.map(i => <img key={i.id} src={i.imageUrls[0]} className="w-10 h-10 object-cover rounded border border-white/10" title={i.title} />)}
                                                    </div>
                                                </div>
                                                <RefreshCw size={16} className="text-gray-500"/>
                                                <div className="flex-1 border border-dashed border-white/20 p-2 rounded">
                                                    <div className="text-[9px] uppercase opacity-50 mb-1">ХОЧЕТ ЗАБРАТЬ:</div>
                                                    <div className="flex gap-1 overflow-x-auto">
                                                        {requested.map(i => <img key={i.id} src={i.imageUrls[0]} className="w-10 h-10 object-cover rounded border border-white/10" title={i.title} />)}
                                                    </div>
                                                </div>
                                            </div>

                                            {trade.message && (
                                                <div className="bg-black/20 p-2 rounded text-xs font-mono mb-4 italic">"{trade.message}"</div>
                                            )}

                                            <div className="flex gap-2">
                                                <button onClick={() => handleTradeResponse(trade.id, 'ACCEPTED')} className="flex-1 bg-green-500 text-black font-bold py-2 rounded text-xs uppercase flex items-center justify-center gap-2 hover:bg-green-400">
                                                    <Check size={14}/> ПРИНЯТЬ
                                                </button>
                                                <button onClick={() => handleTradeResponse(trade.id, 'DECLINED')} className="flex-1 bg-red-500/20 text-red-500 border border-red-500 py-2 rounded text-xs uppercase flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white">
                                                    <X size={14}/> ОТКЛОНИТЬ
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* HISTORY */}
                        <div className="pt-6 border-t border-white/10">
                            <h3 className="font-pixel text-xs opacity-50 mb-4 uppercase tracking-widest">ИСТОРИЯ</h3>
                            {historyTrades.length === 0 ? <div className="text-xs font-mono opacity-30 italic">Пусто</div> : (
                                historyTrades.map(trade => (
                                    <div key={trade.id} className="p-3 border border-white/5 rounded-lg mb-2 flex justify-between items-center opacity-70">
                                        <div className="text-xs">
                                            {trade.sender === currentUser.username ? `Вы предложили @${trade.receiver}` : `От @${trade.sender}`}
                                        </div>
                                        <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${trade.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                            {trade.status}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityView;
