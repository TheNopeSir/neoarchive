
import React from 'react';
import { FolderOpen, Share2, Heart, Layers } from 'lucide-react';
import { Collection } from '../types';
import { getUserAvatar } from '../services/storageService';

interface CollectionCardProps {
    col: Collection;
    theme: 'dark' | 'light';
    onClick: (col: Collection) => void;
    onShare: (col: Collection) => void;
    isLiked?: boolean;
    onLike?: (e: React.MouseEvent) => void;
}

const CollectionCard: React.FC<CollectionCardProps> = ({ col, theme, onClick, onShare, isLiked, onLike }) => {
    return (
      <div 
         onClick={() => onClick(col)}
         className={`group relative aspect-[4/5] md:aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
             theme === 'dark' 
             ? 'border-white/10 bg-dark-surface hover:border-green-500/30' 
             : 'border-black/5 bg-white hover:border-black/20'
         }`}
      >
          {/* Background Image with Zoom Effect */}
          <div className="absolute inset-0 overflow-hidden">
            <img 
                src={col.coverImage} 
                alt={col.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
            />
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-between p-5">
              
              {/* Top Badge */}
              <div className="flex justify-between items-start">
                  <div className="px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-pixel text-white/90 flex items-center gap-1.5 uppercase tracking-widest">
                      <Layers size={10} className="text-blue-400"/> КОЛЛЕКЦИЯ
                  </div>
              </div>

              {/* Bottom Content */}
              <div className="space-y-3">
                  <div>
                      <h3 className="text-white font-pixel text-lg md:text-xl font-bold leading-tight mb-1 drop-shadow-md line-clamp-2">{col.title}</h3>
                      <p className="text-[10px] font-mono text-white/60 line-clamp-1">{col.description || 'Без описания'}</p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      {/* Author Info */}
                      <div className="flex items-center gap-2">
                          <img src={getUserAvatar(col.owner)} className="w-6 h-6 rounded-full border border-white/30" />
                          <span className="text-[10px] font-mono text-white/80 font-bold truncate max-w-[80px]">@{col.owner}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                          {onLike && (
                              <button
                                  onClick={(e) => { e.stopPropagation(); onLike(e); }}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-sm border transition-colors ${isLiked ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}
                              >
                                  <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                                  <span className="text-[10px] font-bold">{col.likes || 0}</span>
                              </button>
                          )}
                          <div className="w-[1px] h-4 bg-white/20" />
                          <div className="px-2 py-1 bg-white/10 rounded-lg text-[10px] font-bold text-white backdrop-blur-sm">
                              {col.exhibitIds.length}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    );
};

export default CollectionCard;
