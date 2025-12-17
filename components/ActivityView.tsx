
import React, { useState } from 'react';
import { Bell, MessageCircle, ChevronDown, ChevronUp, User, Heart, MessageSquare, UserPlus, BookOpen } from 'lucide-react';
import { Notification, Message, UserProfile, Exhibit } from '../types';
import { getUserAvatar } from '../services/storageService';

interface ActivityViewProps {
    notifications: Notification[];
    messages: Message[];
    currentUser: UserProfile;
    theme: 'dark' | 'light';
    onAuthorClick: (username: string) => void;
    onExhibitClick: (id: string) => void;
    onChatClick: (username: string) => void;
}

const ActivityView: React.FC<ActivityViewProps> = ({ 
    notifications, messages, currentUser, theme, 
    onAuthorClick, onExhibitClick, onChatClick 
}) => {
    const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'MESSAGES'>('NOTIFICATIONS');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Filter relevant data
    const myNotifs = notifications.filter(n => n.recipient === currentUser.username);
    const myMessages = messages.filter(m => m.sender === currentUser.username || m.receiver === currentUser.username);

    // Grouping Logic for Notifications
    const groupedNotifs = myNotifs.reduce((acc, notif) => {
        // Group by Type + TargetID (or Date for follows) to combine "Likes on same post"
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
            default: return <Bell size={14} />;
        }
    };

    const renderNotificationGroup = (key: string, group: Notification[]) => {
        const first = group[0];
        const isExpanded = expandedGroups[key];
        const count = group.length;
        const uniqueActors = Array.from(new Set(group.map(n => n.actor)));
        
        let title = '';
        if (first.type === 'LIKE') title = `Понравился ваш артефакт "${first.targetPreview}"`;
        else if (first.type === 'COMMENT') title = `Новые комментарии к "${first.targetPreview}"`;
        else if (first.type === 'FOLLOW') title = `Новые подписчики`;
        else if (first.type === 'GUESTBOOK') title = `Записи в гостевой книге`;

        const actorText = uniqueActors.length === 1 
            ? <span className="font-bold">@{uniqueActors[0]}</span>
            : <span className="font-bold">@{uniqueActors[0]} и еще {uniqueActors.length - 1}</span>;

        return (
            <div key={key} className={`border rounded mb-3 overflow-hidden transition-all ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
                <div 
                    onClick={() => toggleGroup(key)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'}`}>
                            {getIconForType(first.type)}
                        </div>
                        <div>
                            <div className="text-xs font-mono opacity-50 mb-0.5">{first.timestamp.split(',')[0]}</div>
                            <div className="text-sm">
                                {actorText} <span className="opacity-70">{first.type === 'LIKE' ? 'оценил(и)' : first.type === 'FOLLOW' ? 'подписался(лись)' : 'отреагировал(и)'}</span>
                            </div>
                            <div className="text-xs font-pixel opacity-80 mt-1">{title}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {count > 1 && <span className="text-[10px] bg-green-500 text-black px-1.5 rounded-full font-bold">+{count}</span>}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                    <div className={`border-t ${theme === 'dark' ? 'border-gray-700 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
                        {group.map(notif => (
                            <div key={notif.id} className="p-3 flex items-center gap-3 hover:bg-white/5 border-b border-dashed border-gray-500/20 last:border-0">
                                <div onClick={() => onAuthorClick(notif.actor)} className="cursor-pointer w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                    <img src={getUserAvatar(notif.actor)} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 text-xs">
                                    <span onClick={() => onAuthorClick(notif.actor)} className="font-bold cursor-pointer hover:underline">@{notif.actor}</span>
                                    <span className="opacity-70 ml-2">{notif.timestamp}</span>
                                    {notif.targetId && (
                                        <button 
                                            onClick={() => onExhibitClick(notif.targetId!)}
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

    // Group Messages by Partner
    const groupedMessages = Object.entries(myMessages.reduce((acc, m) => {
         const partner = m.sender === currentUser.username ? m.receiver : m.sender;
         if (!acc[partner] || new Date(m.timestamp) > new Date(acc[partner].timestamp)) acc[partner] = m;
         return acc;
    }, {} as Record<string, Message>));

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in pb-20">
            {/* Tabs */}
            <div className="flex mb-6 border-b border-gray-500/30">
                <button 
                    onClick={() => setActiveTab('NOTIFICATIONS')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'NOTIFICATIONS' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}
                >
                    <Bell size={14} /> УВЕДОМЛЕНИЯ
                    {myNotifs.some(n => !n.isRead) && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>}
                </button>
                <button 
                    onClick={() => setActiveTab('MESSAGES')}
                    className={`flex-1 pb-3 text-center font-pixel text-xs transition-colors flex items-center justify-center gap-2 ${activeTab === 'MESSAGES' ? 'border-b-2 border-green-500 text-green-500 font-bold' : 'opacity-50 hover:opacity-100'}`}
                >
                    <MessageCircle size={14} /> СООБЩЕНИЯ
                    {myMessages.some(m => !m.isRead && m.receiver === currentUser.username) && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>}
                </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {activeTab === 'NOTIFICATIONS' && (
                    <div>
                        {Object.keys(groupedNotifs).length === 0 ? (
                            <div className="text-center opacity-50 font-mono py-10">НЕТ НОВЫХ СОБЫТИЙ</div>
                        ) : (
                            Object.entries(groupedNotifs)
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
                                    <div key={partner} onClick={() => onChatClick(partner)} className={`p-4 border rounded cursor-pointer hover:bg-white/5 flex gap-4 items-center transition-colors ${!lastMsg.isRead && lastMsg.receiver === currentUser.username ? 'border-green-500 bg-green-500/5' : (theme === 'dark' ? 'border-gray-700' : 'border-gray-200')}`}>
                                        <div className="w-12 h-12 rounded-full bg-gray-500 overflow-hidden border border-gray-600">
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
            </div>
        </div>
    );
};

export default ActivityView;
