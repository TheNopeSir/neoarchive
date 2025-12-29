
import React, { useState } from 'react';
import { Search, Image as ImageIcon, Crown, Star, Flame, Circle } from 'lucide-react';
import { WishlistItem } from '../types';
import { WISHLIST_PRIORITY_CONFIG } from '../constants';

interface WishlistCardProps {
  item: WishlistItem;
  theme: 'dark' | 'light' | 'xp';
  onDelete?: (id: string) => void;
}

const WishlistCard: React.FC<WishlistCardProps> = ({ item, theme, onDelete }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const priorityConfig = WISHLIST_PRIORITY_CONFIG[item.priority];
  const isXP = theme === 'xp';
  const isGrail = item.priority === 'GRAIL';

  return (
    <div 
      className={`relative group flex flex-col h-full transition-all duration-300 hover:-translate-y-1
        ${isXP 
          ? 'rounded border-2 border-dashed border-[#0058EE] bg-white/50 hover:bg-white' 
          : `rounded-2xl overflow-hidden border-2 border-dashed ${theme === 'dark' ? 'border-white/20 bg-white/5 hover:border-purple-500/50' : 'border-black/10 bg-black/5 hover:border-black/30'}`
        }
        ${isGrail ? 'shadow-[0_0_15px_rgba(234,179,8,0.3)] border-yellow-500/50' : ''}
      `}
    >
      <div className={`relative aspect-square overflow-hidden bg-black/10 flex items-center justify-center ${!isXP ? 'rounded-t-2xl' : ''}`}>
        {item.referenceImageUrl ? (
            <img 
                src={item.referenceImageUrl} 
                alt={item.title} 
                className={`w-full h-full object-cover transition-all duration-500 opacity-60 group-hover:opacity-80 grayscale group-hover:grayscale-0`} 
            />
        ) : (
            <Search size={32} className="opacity-20" />
        )}
        
        {/* Priority Badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg flex items-center gap-1 text-[8px] font-pixel font-bold shadow-xl border border-white/10 ${priorityConfig.color} bg-black/80 backdrop-blur-md`}>
            {React.createElement(priorityConfig.icon, { size: 10 })} {item.priority}
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[8px] font-pixel text-white border border-white/10 uppercase">
            {item.category}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className={`text-xs font-bold font-pixel mb-1 line-clamp-2 uppercase tracking-widest ${isGrail ? 'text-yellow-500' : 'opacity-80'}`}>
            {item.title}
        </h3>
        
        {item.notes && (
            <p className="text-[9px] font-mono opacity-50 line-clamp-3 mt-2 italic">
                "{item.notes}"
            </p>
        )}

        {onDelete && (
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                className="mt-auto pt-4 text-[9px] text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-center hover:underline"
            >
                УДАЛИТЬ ИЗ СПИСКА
            </button>
        )}
      </div>
    </div>
  );
};

export default WishlistCard;
