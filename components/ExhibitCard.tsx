import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Heart, Eye } from 'lucide-react';
import { Exhibit } from '../types';
import { getArtifactTier, TIER_CONFIG } from '../constants';
import useSwipe from '../hooks/useSwipe';
import { getUserAvatar } from '../services/storageService';

interface ExhibitCardProps {
  item: Exhibit;
  similarExhibits: Exhibit[];
  theme: 'dark' | 'light';
  onClick: (item: Exhibit) => void;
  isLiked: boolean;
  isFavorited: boolean;
  onLike: (e: React.MouseEvent) => void;
  onFavorite: (e: React.MouseEvent) => void;
  onAuthorClick: (author: string) => void;
}

const ExhibitCard: React.FC<ExhibitCardProps> = ({ 
  item, 
  theme, 
  onClick,
  isLiked,
  onLike,
  onAuthorClick
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  useEffect(() => {
    if (isLiked) {
        setIsLikeAnimating(true);
        const timer = setTimeout(() => setIsLikeAnimating(false), 400);
        return () => clearTimeout(timer);
    }
  }, [isLiked]);

  const images = Array.isArray(item.imageUrls) ? item.imageUrls : [];
  const displayValue = item.condition || item.quality || "АРТЕФАКТ";
  const tier = getArtifactTier(item);
  const tierStyle = TIER_CONFIG[tier];
  const Icon = tierStyle.icon;

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: handleNextImage,
    onSwipeRight: handlePrevImage,
  });

  const handleLikeClick = (e: React.MouseEvent) => {
      setIsLikeAnimating(true);
      onLike(e);
      setTimeout(() => setIsLikeAnimating(false), 400);
  };

  const handleAuthorClickInternal = (e: React.MouseEvent) => {
      e.stopPropagation();
      onAuthorClick(item.owner);
  };

  const safeImageSrc = images.length > 0 ? images[currentImageIndex] : 'https://placehold.co/400x300?text=No+Image';

  return (
    <article 
      onClick={() => onClick(item)}
      className={`group relative cursor-pointer flex flex-col h-full rounded-xl overflow-hidden border-2 transition-all duration-300 hover:-translate-y-2 ${
        theme === 'dark' 
        ? `bg-dark-surface ${tierStyle.borderDark} hover:border-white/50` 
        : `bg-white ${tierStyle.borderLight} hover:border-black/50`
      }`}
    >
      <div 
        className="relative aspect-square w-full bg-black/5 group/image overflow-hidden"
        {...swipeHandlers}
      >
         <img 
           src={safeImageSrc} 
           alt={item.title} 
           className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
         />
         
         <div className={`absolute top-2 left-2 px-2 py-1 text-[8px] md:text-[10px] font-bold rounded backdrop-blur-md border ${
            theme === 'dark' 
            ? 'bg-black/60 text-white border-white/10' 
            : 'bg-white/80 text-black border-black/5'
         }`}>
            {item.category}
         </div>

         <div className={`absolute top-2 right-2 px-1.5 py-1 rounded text-[8px] md:text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg ${tierStyle.badge}`}>
            <Icon size={10} className={tierStyle.name === 'LEGENDARY' ? 'fill-yellow-200' : 'fill-white'} />
            {tierStyle.name}
         </div>
         
         {images.length > 1 && (
           <>
              <button onClick={handlePrevImage} className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/80 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-all backdrop-blur-sm">
                <ChevronLeft size={16} />
              </button>
              <button onClick={handleNextImage} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/80 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-all backdrop-blur-sm">
                <ChevronRight size={16} />
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {images.map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`w-1 h-1 rounded-full ${currentImageIndex === idx ? 'bg-white' : 'bg-white/40'}`}
                      />
                  ))}
              </div>
           </>
         )}
      </div>

      <div className="p-2 md:p-3 flex flex-col flex-1 relative">
         <div className="flex justify-between items-start gap-3 mb-1">
             <h3 className={`text-[10px] md:text-sm font-bold leading-tight line-clamp-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                {item.title}
             </h3>
         </div>

         <div className={`mt-1 font-mono text-[9px] md:text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'}`}>
             <span className="truncate">{displayValue}</span>
         </div>

         <div className="mt-auto pt-3 flex justify-between items-center border-t border-dashed border-opacity-20 border-gray-500">
             {/* VISIBLE ON ALL DEVICES (Removed hidden md:flex) */}
             <div 
               onClick={handleAuthorClickInternal}
               className={`flex text-[10px] truncate max-w-[60%] opacity-60 items-center gap-1 cursor-pointer hover:underline hover:opacity-100 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
             >
                <div className="w-4 h-4 rounded-full bg-gray-500 overflow-hidden flex-shrink-0 border border-gray-500">
                     <img src={getUserAvatar(item.owner)} alt={item.owner} />
                </div>
                @{item.owner}
             </div>
             
             <div className="flex items-center gap-2 w-auto justify-end">
                 <div className={`flex items-center gap-1 text-[9px] md:text-[10px] opacity-60 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Eye size={12} />
                    <span>{item.views}</span>
                 </div>

                 <button 
                    onClick={handleLikeClick}
                    className={`flex items-center gap-1 px-2 py-1 rounded transition-all active:scale-95 group/like relative overflow-hidden ${
                        isLiked 
                        ? (theme === 'dark' ? 'text-red-400 bg-red-400/10' : 'text-red-500 bg-red-50') 
                        : (theme === 'dark' ? 'text-gray-500 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-black hover:bg-black/5')
                    }`}
                 >
                     <Heart 
                        size={14} 
                        className={`transition-all duration-300 ${isLiked ? 'fill-current' : 'group-hover/like:scale-110'} ${isLikeAnimating ? 'scale-150 rotate-[-15deg]' : ''}`} 
                     />
                     <span 
                        key={item.likes}
                        className={`text-[9px] md:text-[10px] font-bold transition-all duration-300 ${isLikeAnimating ? 'text-red-500 scale-110' : ''} animate-[spin_0.1s_ease-out_reverse]`}
                        style={{ animation: isLikeAnimating ? 'none' : undefined }}
                     >
                         {item.likes}
                     </span>
                     {isLikeAnimating && (
                         <span className="absolute inset-0 rounded-full border-2 border-red-500 opacity-0 animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_1]" />
                     )}
                  </button>
             </div>
         </div>
      </div>
    </article>
  );
};

export default ExhibitCard;