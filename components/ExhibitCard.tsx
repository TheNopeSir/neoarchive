
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, ThumbsUp, Eye, User } from 'lucide-react';
import { Exhibit } from '../types';

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
  similarExhibits,
  theme, 
  onClick,
  isLiked,
  isFavorited,
  onLike,
  onFavorite,
  onAuthorClick
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Safeguard against missing array/objects
  const images = Array.isArray(item.imageUrls) ? item.imageUrls : [];
  const specs = (item.specs && typeof item.specs === 'object') ? item.specs : {};

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const safeImageSrc = images.length > 0 ? images[currentImageIndex] : 'https://placehold.co/400x300?text=No+Image';

  return (
    <article 
      onClick={() => onClick(item)}
      className={`group relative cursor-pointer border rounded-lg p-3 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full ${
        theme === 'dark' 
        ? 'border-dark-dim bg-dark-surface hover:border-dark-primary shadow-lg' 
        : 'border-light-dim bg-white hover:border-light-accent shadow-md'
      }`}
    >
      {/* Changed aspect-square to aspect-[3/4] for more photo space */}
      <div className="relative aspect-[3/4] overflow-hidden rounded bg-black mb-3 group/image">
         <img 
           src={safeImageSrc} 
           alt={item.title} 
           className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-all duration-500" 
         />
         
         {images.length > 1 && (
           <>
             <button 
               onClick={handlePrevImage}
               className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity z-10 ${
                 theme === 'dark' ? 'bg-black/50 text-white hover:bg-black' : 'bg-white/50 text-black hover:bg-white'
               }`}
             >
               <ChevronLeft size={16} />
             </button>
             <button 
               onClick={handleNextImage}
               className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity z-10 ${
                 theme === 'dark' ? 'bg-black/50 text-white hover:bg-black' : 'bg-white/50 text-black hover:bg-white'
               }`}
             >
               <ChevronRight size={16} />
             </button>
             
             <div className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[9px] font-bold rounded bg-black/60 text-white backdrop-blur-sm">
               {currentImageIndex + 1}/{images.length}
             </div>
           </>
         )}

         <div className={`absolute top-2 left-2 px-1.5 py-0.5 text-[9px] font-bold rounded tracking-widest uppercase ${
            theme === 'dark' ? 'bg-black/60 text-white' : 'bg-white/80 text-black'
         }`}>
           {item.category}
         </div>
      </div>

      <div className="flex-1 flex flex-col">
        <h3 className={`text-sm font-bold truncate mb-2 leading-tight ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
            {item.title}
        </h3>

        <div className={`grid grid-cols-2 gap-1 mb-3 text-[10px] font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
           {Object.entries(specs).slice(0, 4).map(([key, val]) => (
             <div key={key} className="flex flex-col">
                <span className="opacity-50 text-[9px] uppercase">{key}</span>
                <span className={`font-bold truncate ${theme === 'dark' ? 'text-dark-primary' : 'text-light-primary'}`}>{val}</span>
             </div>
           ))}
        </div>
        
        <div className="flex-1"></div>

        <div className={`mt-2 pt-2 border-t border-dashed ${theme === 'dark' ? 'border-dark-dim/30' : 'border-light-dim/50'}`}>
            
            <div 
                className={`flex items-center gap-2 mb-2 text-xs cursor-pointer group/author ${theme === 'dark' ? 'text-dark-dim' : 'text-light-dim'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onAuthorClick(item.owner);
                }}
            >
                <div className={`w-5 h-5 rounded-full overflow-hidden border group-hover/author:border-current transition-colors ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                    <img src={`https://ui-avatars.com/api/?name=${item.owner}&background=random`} alt={item.owner} />
                </div>
                <span className={`font-bold group-hover/author:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>@{item.owner}</span>
            </div>
            
            <div className="flex items-center justify-end gap-3">
               <button 
                  onClick={onLike}
                  className={`flex items-center gap-1 text-[10px] font-bold transition-all hover:scale-110 ${
                    isLiked 
                      ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') 
                      : (theme === 'dark' ? 'text-dark-dim hover:text-white' : 'text-light-dim hover:text-black')
                  }`}
               >
                   <ThumbsUp size={12} fill={isLiked ? "currentColor" : "none"} />
                   <span>{item.likes}</span>
               </button>
               
               <button 
                  onClick={onFavorite}
                  className={`flex items-center gap-1 text-[10px] font-bold transition-all hover:scale-110 ${
                    isFavorited 
                      ? (theme === 'dark' ? 'text-dark-primary' : 'text-light-accent') 
                      : (theme === 'dark' ? 'text-dark-dim hover:text-white' : 'text-light-dim hover:text-black')
                  }`}
               >
                   <Heart size={12} fill={isFavorited ? "currentColor" : "none"} />
               </button>

                <div className={`flex items-center gap-1 text-[10px] opacity-70 ${
                    theme === 'dark' ? 'text-dark-dim' : 'text-light-dim'
                }`}>
                    <Eye size={12} /> {item.views}
                </div>
            </div>
        </div>
      </div>
    </article>
  );
};

export default ExhibitCard;
