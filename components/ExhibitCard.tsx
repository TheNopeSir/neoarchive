
import React, { useState } from 'react';
import { Heart, Eye, Image as ImageIcon } from 'lucide-react';
import { Exhibit } from '../types';
import { getArtifactTier, TIER_CONFIG, TRADE_STATUS_CONFIG } from '../constants';
import { getUserAvatar } from '../services/storageService';

interface ExhibitCardProps {
  item: Exhibit;
  theme: 'dark' | 'light' | 'xp' | 'winamp';
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
  
  // Trade Status Logic
  const tradeStatus = item.tradeStatus || 'NONE';
  const tradeConfig = TRADE_STATUS_CONFIG[tradeStatus];

  const isXP = theme === 'xp';
  const isWinamp = theme === 'winamp';

  return (
    <div 
      onClick={() => onClick(item)}
      className={`group cursor-pointer flex flex-col h-full transition-all duration-300 hover:-translate-y-2 
        ${isXP 
          ? 'rounded-t-lg shadow-lg border-2 border-[#0058EE] bg-white' 
          : isWinamp
          ? 'rounded-none border border-[#505050] bg-[#191919] text-[#00ff00]'
          : `rounded-2xl overflow-hidden border-2 ${theme === 'dark' ? `bg-dark-surface border-white/10 hover:border-green-500/50 ${config.shadow}` : 'bg-white border-black/5 hover:border-black/20 shadow-lg'}`
        } 
        ${isCursed ? 'animate-pulse' : ''}`
      }
    >
      {/* XP Window Header */}
      {isXP && (
          <div className="h-6 bg-gradient-to-r from-[#0058EE] to-[#3F8CF3] rounded-t-[4px] flex items-center justify-between px-2 shadow-sm">
             <span className="text-white font-bold text-[10px] drop-shadow-md truncate font-sans">{item.title}</span>
             <div className="flex gap-1">
                 <div className="w-3 h-3 bg-[#D64434] rounded-[2px] border border-white/30 shadow-inner"></div>
             </div>
          </div>
      )}

      <div className={`relative aspect-square overflow-hidden bg-black/20 ${!isXP && !isWinamp ? 'rounded-t-2xl' : ''}`}>
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
        
        {!isXP && <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg backdrop-blur-md text-[8px] font-pixel border uppercase ${isWinamp ? 'bg-black text-[#00ff00] border-[#00ff00]' : 'bg-black/60 text-white border-white/10'}`}>{item.category}</div>}
        
        {/* Tier Badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[8px] font-pixel font-bold shadow-xl border border-white/10 ${config.badge}`}>
            <Icon size={10} /> {config.name}
        </div>

        {/* Trade Status Badge */}
        {tradeStatus !== 'NONE' && (
            <div className={`absolute bottom-2 left-2 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold tracking-wide shadow-lg uppercase border !bg-zinc-900/95 backdrop-blur-md ${tradeConfig.color.replace(/bg-[\w/-]+/, '')}`}>
                {tradeConfig.icon && React.createElement(tradeConfig.icon, { size: 12, strokeWidth: 2.5 })} 
                {tradeConfig.badge}
            </div>
        )}
      </div>

      <div className={`p-4 flex flex-col flex-1 ${isXP ? 'bg-[#ECE9D8]' : ''}`}>
        {!isXP && <h3 className={`text-sm font-bold font-pixel mb-1 line-clamp-2 leading-tight ${isCursed ? 'text-red-500' : ''}`}>{item.title}</h3>}
        <div className={`mt-1 font-mono text-[10px] ${isXP ? 'text-black opacity-80' : isWinamp ? 'text-[#00ff00] opacity-80' : 'opacity-60'}`}>
            <span className="truncate uppercase">{item.condition || item.quality}</span>
            {isXP && <div className="text-[9px] text-gray-600 mt-1 uppercase tracking-wide">{item.category}</div>}
        </div>
        
        <div className={`mt-auto pt-4 flex items-center justify-between border-t border-dashed ${isXP ? 'border-gray-400' : isWinamp ? 'border-[#505050]' : 'border-white/10'}`}>
            <div onClick={(e) => { e.stopPropagation(); onAuthorClick(item.owner); }} className="flex items-center gap-2 group/author">
                <img src={getUserAvatar(item.owner)} className={`w-5 h-5 rounded-full border ${isXP ? 'border-gray-400' : 'border-white/20'}`} />
                <span className={`text-[10px] font-pixel opacity-50 group-hover/author:opacity-100 transition-opacity ${isXP ? 'text-black' : isWinamp ? 'text-[#00ff00]' : ''}`}>@{item.owner}</span>
            </div>
            
            <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1 text-[10px] ${isXP ? 'text-black/60' : 'opacity-40'}`}>
                    <Eye size={12} /> <span>{item.views}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onLike(e); }} className={`flex items-center gap-1 text-[10px] transition-all hover:scale-110 ${isLiked ? 'text-green-400' : (isXP ? 'text-black/60' : 'opacity-40')}`}>
                    <Heart size={14} fill={isLiked ? "currentColor" : "none"} /> <span>{item.likes}</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ExhibitCard;