
import React, { useState } from 'react';
import { Heart, Eye, Image as ImageIcon } from 'lucide-react';
import { Exhibit } from '../types';
import { getArtifactTier, TIER_CONFIG } from '../constants';
import { getUserAvatar } from '../services/storageService';

interface ExhibitCardProps {
  item: Exhibit;
  theme: 'dark' | 'light';
  onClick: (item: Exhibit) => void;
  isLiked: boolean;
  onLike: (e: React.MouseEvent) => void;
  onAuthorClick: (author: string) => void;
}

const ExhibitCard: React.FC<ExhibitCardProps> = ({ item, theme, onClick, isLiked, onLike, onAuthorClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const tier = getArtifactTier(item);
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;
  const isCursed = tier === 'CURSED';

  return (
    <div 
      onClick={() => onClick(item)}
      className={`group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-300 hover:-translate-y-2 flex flex-col h-full ${
        theme === 'dark' ? `bg-dark-surface border-white/10 hover:border-green-500/50 ${config.shadow}` : 'bg-white border-black/5 hover:border-black/20 shadow-lg'
      } ${isCursed ? 'animate-pulse' : ''}`}
    >
      <div className="relative aspect-square overflow-hidden bg-black/20">
        {/* Skeleton / Placeholder */}
        {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 animate-pulse">
                <ImageIcon size={24} className="text-white/20" />
            </div>
        )}
        
        {/* Lazy Loaded Image */}
        <img 
            src={item.imageUrls[0]} 
            alt={item.title} 
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
        />
        
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[8px] font-pixel text-white border border-white/10 uppercase">{item.category}</div>
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[8px] font-pixel font-bold shadow-xl border border-white/10 ${config.badge}`}>
            <Icon size={10} /> {config.name}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className={`text-sm font-bold font-pixel mb-1 line-clamp-2 leading-tight ${isCursed ? 'text-red-500' : ''}`}>{item.title}</h3>
        <div className="mt-1 font-mono text-[10px] opacity-60">
            <span className="truncate uppercase">{item.condition || item.quality}</span>
        </div>
        
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-dashed border-white/10">
            <div onClick={(e) => { e.stopPropagation(); onAuthorClick(item.owner); }} className="flex items-center gap-2 group/author">
                <img src={getUserAvatar(item.owner)} className="w-5 h-5 rounded-full border border-white/20" />
                <span className="text-[10px] font-pixel opacity-50 group-hover/author:opacity-100 transition-opacity">@{item.owner}</span>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[10px] opacity-40">
                    <Eye size={12} /> <span>{item.views}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onLike(e); }} className={`flex items-center gap-1 text-[10px] transition-all hover:scale-110 ${isLiked ? 'text-green-400' : 'opacity-40'}`}>
                    <Heart size={14} fill={isLiked ? "currentColor" : "none"} /> <span>{item.likes}</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ExhibitCard;
