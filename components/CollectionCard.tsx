import React from 'react';
import { FolderOpen, Share2 } from 'lucide-react';
import { Collection } from '../types';

interface CollectionCardProps {
    col: Collection;
    theme: 'dark' | 'light';
    onClick: (col: Collection) => void;
    onShare: (col: Collection) => void;
}

const CollectionCard: React.FC<CollectionCardProps> = ({ col, theme, onClick, onShare }) => {
    return (
      <div 
         key={col.id} 
         onClick={() => onClick(col)}
         className={`group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border-2 transition-transform hover:-translate-y-1 ${
             theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'
         }`}
      >
          <img src={col.coverImage} alt={col.title} className="w-full h-full object-cover transition-transform group-hover:scale-105"/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4">
              <div className="font-pixel text-[10px] text-white/70 mb-1 flex items-center gap-1">
                  <FolderOpen size={10}/> КОЛЛЕКЦИЯ
              </div>
              <h3 className="text-white font-pixel text-sm md:text-lg font-bold leading-tight mb-1">{col.title}</h3>
              <div className="flex justify-between items-end">
                  <span className="text-[10px] font-mono text-white/60">@{col.owner}</span>
                  <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-white/20 backdrop-blur rounded text-[9px] font-bold text-white">
                          {col.exhibitIds.length} ITEMS
                      </span>
                      <button
                          onClick={(e) => { e.stopPropagation(); onShare(col); }}
                          className="bg-white/20 p-1.5 rounded hover:bg-white/40 text-white transition-colors"
                          title="Поделиться"
                      >
                          <Share2 size={12} />
                      </button>
                  </div>
              </div>
          </div>
      </div>
    );
};

export default CollectionCard;