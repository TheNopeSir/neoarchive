
import React, { useState } from 'react';
import { Trophy, TrendingUp, Users, RefreshCw, Swords, Shield, Star, Flame } from 'lucide-react';
import { UserProfile, Exhibit } from '../types';
import ExhibitCard from './ExhibitCard';
import { getUserAvatar } from '../services/storageService';

interface CommunityHubProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    users: UserProfile[];
    exhibits: Exhibit[];
    onExhibitClick: (item: Exhibit) => void;
    onUserClick: (username: string) => void;
    onBack?: () => void;
}

const CommunityHub: React.FC<CommunityHubProps> = ({ theme, users, exhibits, onExhibitClick, onUserClick, onBack }) => {
    const [tab, setTab] = useState<'TRENDS' | 'TRADE' | 'DUELS' | 'GUILDS'>('TRENDS');
    const isWinamp = theme === 'winamp';

    // Mock Data Helpers
    const trendingExhibits = exhibits.sort((a,b) => (b.likes + b.views) - (a.likes + a.views)).slice(0, 6);
    const tradeExhibits = exhibits.filter(e => e.tradeStatus && e.tradeStatus !== 'NONE').slice(0, 6);
    const topUsers = users.sort((a,b) => (b.followers?.length || 0) - (a.followers?.length || 0)).slice(0, 5);

    const renderTabButton = (id: typeof tab, icon: any, label: string) => (
        <button 
            onClick={() => setTab(id)}
            className={`flex flex-col items-center gap-1 p-3 flex-1 transition-all border-b-2 ${
                tab === id 
                ? (isWinamp ? 'border-[#00ff00] text-[#00ff00]' : 'border-green-500 text-green-500 font-bold') 
                : 'border-transparent opacity-50 hover:opacity-100'
            }`}
        >
            {React.createElement(icon, { size: 20 })}
            <span className="text-[9px] font-pixel uppercase">{label}</span>
        </button>
    );

    return (
        <div className={`max-w-4xl mx-auto pb-32 animate-in fade-in ${isWinamp ? 'font-mono text-gray-300' : ''}`}>
            {/* Header */}
            <div className={`p-6 mb-6 ${isWinamp ? 'bg-[#282828] border-b border-[#505050]' : 'border-b border-white/10'}`}>
                <h1 className={`text-2xl font-pixel font-bold flex items-center gap-3 ${isWinamp ? 'text-[#00ff00]' : ''}`}>
                    <Users size={28} /> СООБЩЕСТВО
                </h1>
                <p className="text-xs opacity-60 mt-1 font-mono">Центр обмена, рейтинги и гильдии коллекционеров.</p>
            </div>

            {/* Navigation */}
            <div className="flex mb-8 border-b border-white/10 sticky top-16 bg-black/80 backdrop-blur-md z-30">
                {renderTabButton('TRENDS', TrendingUp, 'Тренды')}
                {renderTabButton('TRADE', RefreshCw, 'Обмен')}
                {renderTabButton('DUELS', Swords, 'Дуэли')}
                {renderTabButton('GUILDS', Shield, 'Гильдии')}
            </div>

            {/* Content Area */}
            <div className="px-4">
                {tab === 'TRENDS' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        {/* Top Collectors */}
                        <div className={`p-4 rounded-2xl border ${isWinamp ? 'bg-black border-[#505050]' : 'bg-gradient-to-r from-yellow-900/10 to-transparent border-yellow-500/20'}`}>
                            <h3 className="font-pixel text-xs mb-4 flex items-center gap-2 text-yellow-500 uppercase tracking-widest"><Trophy size={14}/> Топ Коллекционеров</h3>
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                {topUsers.map((u, i) => (
                                    <div key={u.username} onClick={() => onUserClick(u.username)} className="flex flex-col items-center gap-2 cursor-pointer group min-w-[80px]">
                                        <div className="relative">
                                            <img src={u.avatarUrl || getUserAvatar(u.username)} className="w-14 h-14 rounded-full border-2 border-yellow-500/50 group-hover:scale-110 transition-transform"/>
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center rounded-full">#{i+1}</div>
                                        </div>
                                        <span className="text-[10px] font-bold truncate max-w-[80px]">@{u.username}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hot Items */}
                        <div>
                            <h3 className="font-pixel text-xs mb-4 flex items-center gap-2 text-red-400 uppercase tracking-widest"><Flame size={14}/> Сейчас популярно</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {trendingExhibits.map(item => (
                                    <ExhibitCard 
                                        key={item.id}
                                        item={item}
                                        theme={theme}
                                        onClick={onExhibitClick}
                                        isLiked={false}
                                        onLike={() => {}}
                                        onAuthorClick={onUserClick}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'TRADE' && (
                    <div className="animate-in slide-in-from-right-4">
                        <div className="mb-6 p-4 border border-blue-500/30 bg-blue-500/5 rounded-xl text-center">
                            <h3 className="font-pixel text-sm text-blue-400 mb-1">РЫНОК АРТЕФАКТОВ</h3>
                            <p className="text-[10px] opacity-60">Предметы, доступные для обмена или продажи пользователями.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {tradeExhibits.length === 0 ? (
                                <div className="col-span-full text-center py-10 opacity-50 font-mono text-xs">Рынок пуст</div>
                            ) : (
                                tradeExhibits.map(item => (
                                    <ExhibitCard 
                                        key={item.id}
                                        item={item}
                                        theme={theme}
                                        onClick={onExhibitClick}
                                        isLiked={false}
                                        onLike={() => {}}
                                        onAuthorClick={onUserClick}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}

                {tab === 'DUELS' && (
                    <div className="animate-in slide-in-from-right-4 text-center py-10 space-y-6">
                        <Swords size={48} className="mx-auto opacity-50" />
                        <div>
                            <h2 className="font-pixel text-lg mb-2">АРЕНА ДУЭЛЕЙ</h2>
                            <p className="font-mono text-xs opacity-60 max-w-md mx-auto">
                                Вызывайте других коллекционеров на битву. Сравните редкость предметов.
                                <br/><span className="text-yellow-500">(Модуль в разработке)</span>
                            </p>
                        </div>
                        <button className="px-6 py-3 border border-white/20 rounded-full font-pixel text-xs hover:bg-white/10 uppercase tracking-widest">
                            Бросить вызов
                        </button>
                    </div>
                )}

                {tab === 'GUILDS' && (
                    <div className="animate-in slide-in-from-right-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['Retro Gamers', 'Vinyl Heads', 'Cyberpunks', 'Apple Cult'].map(guild => (
                                <div key={guild} className={`p-6 border rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all ${isWinamp ? 'bg-black border-[#505050]' : 'bg-white/5 border-white/10'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center text-black font-bold text-lg">
                                            {guild[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold font-pixel">{guild}</h3>
                                            <p className="text-[10px] opacity-60 font-mono">124 Участника</p>
                                        </div>
                                    </div>
                                    <button className="px-3 py-1 text-[9px] border rounded uppercase opacity-50 hover:opacity-100">Вступить</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunityHub;
