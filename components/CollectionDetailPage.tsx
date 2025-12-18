
import React from 'react';
import { ArrowLeft, Share2, FolderOpen, Grid, User } from 'lucide-react';
import { Collection, Exhibit } from '../types';
import ExhibitCard from './ExhibitCard';
import { getUserAvatar } from '../services/storageService';

interface CollectionDetailPageProps {
    collection: Collection;
    artifacts: Exhibit[];
    theme: 'dark' | 'light';
    onBack: () => void;
    onExhibitClick: (item: Exhibit) => void;
    onAuthorClick: (author: string) => void;
    currentUser: string;
}

const CollectionDetailPage: React.FC<CollectionDetailPageProps> = ({ 
    collection, artifacts, theme, onBack, onExhibitClick, onAuthorClick, currentUser 
}) => {
    const isOwner = currentUser === collection.owner;

    return (
        <div className="w-full min-h-full pb-20 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <button onClick={onBack} className="flex items-center gap-2 font-pixel text-[10px] opacity-70 hover:opacity-100 uppercase tracking-widest">
                    <ArrowLeft size={14} /> НАЗАД
                </button>
                <div className="flex gap-4">
                    <button className="opacity-70 hover:opacity-100 transition-all"><Share2 size={18} /></button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 mb-12">
                <div className="w-full md:w-1/3 aspect-[4/3] rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl">
                    <img src={collection.coverImage} className="w-full h-full object-cover" alt={collection.title} />
                </div>
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 font-pixel text-[10px] text-blue-500 tracking-widest">
                        <FolderOpen size={14}/> КОЛЛЕКЦИЯ
                    </div>
                    <h1 className="text-3xl md:text-5xl font-pixel font-black leading-tight">{collection.title}</h1>
                    <p className="font-mono text-sm opacity-70 max-w-2xl leading-relaxed">{collection.description || 'Нет описания для этой коллекции.'}</p>
                    
                    <div className="pt-4 flex items-center gap-6">
                        <div onClick={() => onAuthorClick(collection.owner)} className="flex items-center gap-3 cursor-pointer group">
                            <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 p-0.5">
                                <img src={getUserAvatar(collection.owner)} className="w-full h-full object-cover rounded-full" />
                            </div>
                            <div>
                                <div className="font-pixel text-[10px] opacity-40 uppercase">Создатель</div>
                                <div className="font-bold font-pixel text-xs group-hover:text-blue-500 transition-colors">@{collection.owner}</div>
                            </div>
                        </div>
                        <div className="h-10 w-[1px] bg-white/10" />
                        <div>
                            <div className="font-pixel text-[10px] opacity-40 uppercase">Артефактов</div>
                            <div className="font-bold font-pixel text-xs">{artifacts.length} ITEMS</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="font-pixel text-xs opacity-50 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Grid size={14} /> СОСТАВ_ЭКСПОЗИЦИИ
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {artifacts.map(item => (
                        <ExhibitCard 
                            key={item.id} 
                            item={item} 
                            theme={theme} 
                            onClick={onExhibitClick} 
                            isLiked={item.likedBy?.includes(currentUser)} 
                            onLike={() => {}} 
                            onAuthorClick={onAuthorClick} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CollectionDetailPage;
