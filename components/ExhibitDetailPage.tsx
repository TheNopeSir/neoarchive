
import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Heart, Share2, MessageSquare, Trash2, 
  ArrowLeft, Eye, BookmarkPlus, Send, MessageCircle
} from 'lucide-react';
import { Exhibit } from '../types';
import { getArtifactTier, TIER_CONFIG } from '../constants';
import { getUserAvatar } from '../services/storageService';

interface ExhibitDetailPageProps {
  exhibit: Exhibit;
  theme: 'dark' | 'light';
  onBack: () => void;
  onShare: (id: string) => void;
  onFavorite: (id: string) => void;
  onLike: (id: string) => void;
  isFavorited: boolean;
  isLiked: boolean;
  onPostComment: (id: string, text: string) => void;
  onAuthorClick: (author: string) => void;
  onFollow: (username: string) => void;
  onMessage: (username: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (exhibit: Exhibit) => void;
  onAddToCollection?: (id: string) => void;
  isFollowing: boolean;
  currentUser: string;
  isAdmin: boolean;
}

export default function ExhibitDetailPage({
  exhibit, theme, onBack, onShare, onFavorite, onLike, isFavorited, isLiked, onPostComment, onAuthorClick, onFollow, onMessage, onDelete, onEdit, onAddToCollection, isFollowing, currentUser, isAdmin
}: ExhibitDetailPageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  const images = Array.isArray(exhibit.imageUrls) ? exhibit.imageUrls : ['https://placehold.co/600x400?text=NO+IMAGE'];
  const specs = exhibit.specs || {};
  const comments = exhibit.comments || [];
  
  const tierKey = getArtifactTier(exhibit);
  const tier = TIER_CONFIG[tierKey];
  const TierIcon = tier.icon;
  const isCursed = tierKey === 'CURSED';

  const nonEmptySpecs = Object.entries(specs).filter(([_, val]) => !!val);

  const handleShare = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`NeoArchive Artifact: ${exhibit.title}`);
    const media = encodeURIComponent(images[0]);
    
    switch(platform) {
        case 'tg': window.open(`https://t.me/share/url?url=${url}&text=${text}`); break;
        case 'wa': window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`); break;
        case 'pin': window.open(`https://www.pinterest.com/pin/create/button/?url=${url}&media=${media}&description=${text}`); break;
        case 'copy': navigator.clipboard.writeText(window.location.href); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); break;
    }
    setShowShareMenu(false);
  };

  const isOwner = currentUser === exhibit.owner;

  return (
    <div className={`w-full min-h-full pb-20 animate-in fade-in duration-300 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
        <button onClick={onBack} className="flex items-center gap-2 font-pixel text-[10px] opacity-70 hover:opacity-100 uppercase tracking-widest"><ArrowLeft size={14} /> НАЗАД</button>
        <div className="flex gap-4">
          {isOwner && onDelete && ( <button onClick={() => onDelete(exhibit.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button> )}
          <div className="relative">
            <button onClick={() => setShowShareMenu(!showShareMenu)} className={`flex items-center gap-2 opacity-70 hover:opacity-100 transition-all ${shareCopied ? 'text-green-500' : ''}`}><Share2 size={18} /></button>
            {showShareMenu && (
                <div className="absolute right-0 top-8 w-48 bg-dark-surface border border-white/10 rounded-xl shadow-2xl z-50 p-2 animate-in slide-in-from-top-2">
                    <button onClick={() => handleShare('tg')} className="w-full text-left p-3 hover:bg-white/5 rounded-lg text-xs font-pixel flex items-center gap-3"><Send size={14} className="text-blue-400"/> TELEGRAM</button>
                    <button onClick={() => handleShare('wa')} className="w-full text-left p-3 hover:bg-white/5 rounded-lg text-xs font-pixel flex items-center gap-3"><MessageCircle size={14} className="text-green-500"/> WHATSAPP</button>
                    <button onClick={() => handleShare('pin')} className="w-full text-left p-3 hover:bg-white/5 rounded-lg text-xs font-pixel flex items-center gap-3"><Heart size={14} className="text-red-500"/> PINTEREST</button>
                    <button onClick={() => handleShare('copy')} className="w-full text-left p-3 hover:bg-white/5 rounded-lg text-xs font-pixel flex items-center gap-3"><Share2 size={14}/> COPY LINK</button>
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="space-y-4">
          <div className={`relative aspect-square md:aspect-video w-full rounded-2xl overflow-hidden border transition-all duration-500 ${theme === 'dark' ? 'border-white/10 bg-black' : 'border-black/10 bg-white'} ${isCursed ? 'shadow-[0_0_30px_red]' : ''}`}>
             <img src={images[currentImageIndex]} alt={exhibit.title} className="w-full h-full object-contain" />
             {images.length > 1 && (
               <>
                 <button onClick={() => setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors"><ChevronLeft size={24}/></button>
                 <button onClick={() => setCurrentImageIndex(prev => (prev + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors"><ChevronRight size={24}/></button>
               </>
             )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto py-2 scrollbar-hide snap-x">
               {images.map((img, idx) => ( <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`snap-start relative w-20 h-20 flex-shrink-0 border-2 rounded-xl overflow-hidden transition-all ${currentImageIndex === idx ? 'border-green-500 scale-105 shadow-lg' : 'border-transparent opacity-50'}`}><img src={img} className="w-full h-full object-cover" /></button> ))}
            </div>
          )}
        </div>

        <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-dark-surface border-white/10' : 'bg-white border-black/10 shadow-xl'}`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
               <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="px-2 py-1 text-[9px] font-pixel rounded bg-green-500 text-black font-bold uppercase">{exhibit.category}</span>
                      <span className={`px-2 py-1 text-[9px] font-bold font-pixel rounded border flex items-center gap-1 ${tier.bgColor} ${tier.color} uppercase`}><TierIcon size={10} /> {tier.name}</span>
                  </div>
                  <h1 className={`text-2xl md:text-4xl font-bold font-pixel leading-tight mb-4 ${isCursed ? 'text-red-500 italic' : ''}`}>{exhibit.title}</h1>
               </div>
               
               <div className={`flex items-center gap-2 p-2 rounded-2xl border ${theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-gray-50 border-black/5'}`}>
                  <button onClick={() => onLike(exhibit.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95 ${isLiked ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                    <span className="text-sm font-bold font-mono">{exhibit.likes}</span>
                  </button>
                  {/* BUTTON ADD TO COLLECTION: STRICTLY RESTRICTED TO OWNER */}
                  {isOwner && (
                      <>
                        <div className="w-[1px] h-6 bg-white/10" />
                        <button 
                            onClick={() => onAddToCollection?.(exhibit.id)} 
                            className="p-2 opacity-60 hover:opacity-100 transition-all text-blue-400" 
                            title="Добавить в коллекцию"
                        >
                            <BookmarkPlus size={20} />
                        </button>
                      </>
                  )}
                  <div className="w-[1px] h-6 bg-white/10" />
                  <div className="flex items-center gap-2 px-3 py-2 opacity-60"><Eye size={20} /><span className="text-sm font-bold font-mono">{exhibit.views}</span></div>
               </div>
            </div>

            {/* "Who Liked" Section */}
            {exhibit.likedBy && exhibit.likedBy.length > 0 && (
                <div className="flex items-center gap-2 mb-6 p-2 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex -space-x-3 ml-2">
                        {exhibit.likedBy.slice(0, 5).map(name => (
                            <img key={name} src={getUserAvatar(name)} title={`@${name}`} onClick={() => onAuthorClick(name)} className="w-8 h-8 rounded-full border-2 border-black cursor-pointer hover:scale-110 transition-transform" />
                        ))}
                        {exhibit.likedBy.length > 5 && (
                            <div className="w-8 h-8 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-[10px] font-bold">+{exhibit.likedBy.length - 5}</div>
                        )}
                    </div>
                    <span className="text-[10px] font-pixel opacity-40 uppercase ml-2">Оценили это</span>
                </div>
            )}

            <div className={`flex items-center justify-between p-4 mb-6 rounded-2xl border ${theme === 'dark' ? 'bg-black/30 border-white/5' : 'bg-gray-100 border-black/5'}`}>
               <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onAuthorClick(exhibit.owner)}>
                  <div className="w-12 h-12 rounded-full border-2 border-green-500/50 p-0.5"><img src={getUserAvatar(exhibit.owner)} className="w-full h-full object-cover rounded-full" /></div>
                  <div><div className="font-bold font-pixel text-xs group-hover:text-green-500 transition-colors">@{exhibit.owner}</div><div className="text-[10px] opacity-40 font-mono uppercase">{exhibit.timestamp}</div></div>
               </div>
               {!isOwner && ( <button onClick={() => onFollow(exhibit.owner)} className={`px-4 py-2 text-[10px] font-bold font-pixel border rounded-xl transition-all ${isFollowing ? 'border-white/10 opacity-40' : 'bg-green-500 text-black border-green-500'}`}>{isFollowing ? 'ПОДПИСАН' : 'ПОДПИСАТЬСЯ'}</button> )}
            </div>

            <div className="prose prose-sm max-w-none mb-8 border-l-2 border-green-500/20 pl-4"><p className="font-mono text-sm leading-relaxed opacity-80 whitespace-pre-wrap">{exhibit.description}</p></div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
               {nonEmptySpecs.map(([key, val]) => ( <div key={key} className="p-3 bg-black/20 rounded-xl border border-white/5"><div className="text-[9px] uppercase opacity-40 mb-1 font-pixel tracking-widest">{key}</div><div className="font-bold font-mono text-sm">{val}</div></div> ))}
               {exhibit.condition && ( <div className="p-3 bg-black/20 rounded-xl border border-white/5"><div className="text-[9px] uppercase opacity-40 mb-1 font-pixel tracking-widest">СОСТОЯНИЕ</div><div className="font-black font-mono text-sm text-green-400 uppercase">{exhibit.condition}</div></div> )}
            </div>

            <div className="pt-8 border-t border-white/10">
               <h3 className="font-pixel text-sm mb-6 flex items-center gap-2"><MessageSquare size={16} /> ПРОТОКОЛ КОММЕНТАРИЕВ ({comments.length})</h3>
               <div className="space-y-4 mb-8">
                  {comments.length === 0 ? ( <div className="text-center py-10 opacity-30 text-xs font-pixel uppercase tracking-widest">ЛОГИ ПУСТЫ</div> ) : ( 
                    comments.map(c => ( 
                      <div key={c.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex justify-between items-center mb-2"><span onClick={() => onAuthorClick(c.author)} className="font-bold cursor-pointer text-green-500 font-pixel text-[10px]">@{c.author}</span><span className="text-[9px] opacity-30 font-mono">{c.timestamp}</span></div>
                        <p className="font-mono text-sm opacity-80">{c.text}</p>
                      </div> 
                    )) 
                  )}
               </div>
               <div className="flex gap-3">
                  <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="ВВЕСТИ ДАННЫЕ В ПРОТОКОЛ..." className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-green-500 transition-colors" onKeyDown={(e) => { if(e.key === 'Enter' && commentText.trim()) { onPostComment(exhibit.id, commentText); setCommentText(''); } }} />
                  <button onClick={() => { if(commentText.trim()) { onPostComment(exhibit.id, commentText); setCommentText(''); } }} className="bg-green-500 text-black p-3 rounded-xl hover:scale-105 active:scale-95 transition-all"><Send size={20} /></button>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
}
