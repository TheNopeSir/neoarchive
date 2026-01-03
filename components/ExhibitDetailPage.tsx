
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Heart, Share2, MessageSquare, Trash2, 
  ArrowLeft, Eye, BookmarkPlus, Send, MessageCircle, Play, CornerDownRight, Edit2, Link2, Sparkles, Video, Pin
} from 'lucide-react';
import { Exhibit, Comment, UserProfile } from '../types';
import { getArtifactTier, TIER_CONFIG, TRADE_STATUS_CONFIG, getSimilarArtifacts } from '../constants';
import { getUserAvatar } from '../services/storageService';
import ExhibitCard from './ExhibitCard';

interface ExhibitDetailPageProps {
  exhibit: Exhibit;
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  onBack: () => void;
  onShare: (id: string) => void;
  onFavorite: (id: string) => void;
  onLike: (id: string) => void;
  isFavorited: boolean;
  isLiked: boolean;
  onPostComment: (id: string, text: string, parentId?: string) => void;
  onCommentLike: (commentId: string) => void;
  onDeleteComment: (exhibitId: string, commentId: string) => void;
  onAuthorClick: (author: string) => void;
  onFollow: (username: string) => void;
  onMessage: (username: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (exhibit: Exhibit) => void;
  onAddToCollection?: (id: string) => void;
  onExhibitClick: (item: Exhibit) => void;
  isFollowing: boolean;
  currentUser: string;
  currentUserProfile?: UserProfile | null;
  isAdmin: boolean;
  users: UserProfile[];
  allExhibits?: Exhibit[];
  highlightCommentId?: string; // New prop for smart notifications
}

const getEmbedUrl = (url: string) => {
    if (!url) return null;
    let embedUrl = url;
    try {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes('rutube.ru')) {
            const videoId = url.split('/video/')[1]?.split('/')[0];
            if (videoId) embedUrl = `https://rutube.ru/play/embed/${videoId}`;
        }
    } catch (e) { return null; }
    return embedUrl;
};

const renderTextWithMentions = (text: string, onUserClick: (u: string) => void) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
        if (part.startsWith('@')) {
            const username = part.slice(1);
            return <span key={i} onClick={(e) => { e.stopPropagation(); onUserClick(username); }} className="text-blue-400 cursor-pointer hover:underline font-bold">{part}</span>;
        }
        return part;
    });
};

const ExhibitDetailPage: React.FC<ExhibitDetailPageProps> = ({
  exhibit, theme, onBack, onShare, onFavorite, onLike, isFavorited, isLiked, onPostComment, onCommentLike, onDeleteComment, onAuthorClick, onFollow, onMessage, onDelete, onEdit, onAddToCollection, onExhibitClick, isFollowing, currentUser, currentUserProfile, isAdmin, users, allExhibits, highlightCommentId
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string, author: string } | null>(null);
  
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);

  const isWinamp = theme === 'winamp';

  // Construct media slides: Images + Video
  const slides = useMemo(() => {
      const media: Array<{type: 'image' | 'video', url: string}> = [];
      const imageUrls = Array.isArray(exhibit.imageUrls) && exhibit.imageUrls.length > 0 ? exhibit.imageUrls : ['https://placehold.co/600x400?text=NO+IMAGE'];
      
      // First Image
      media.push({ type: 'image', url: imageUrls[0] });
      
      // Video (if exists, placed second)
      if (exhibit.videoUrl) {
          const embed = getEmbedUrl(exhibit.videoUrl);
          if (embed) media.push({ type: 'video', url: embed });
      }

      // Rest of images
      if (imageUrls.length > 1) {
          imageUrls.slice(1).forEach(url => media.push({ type: 'image', url }));
      }
      return media;
  }, [exhibit.imageUrls, exhibit.videoUrl]);

  const specs = exhibit.specs || {};
  const comments = exhibit.comments || [];
  
  const tierKey = getArtifactTier(exhibit);
  const tier = TIER_CONFIG[tierKey];
  const TierIcon = tier.icon;
  const isCursed = tierKey === 'CURSED';

  const tradeStatus = exhibit.tradeStatus || 'NONE';
  const tradeConfig = TRADE_STATUS_CONFIG[tradeStatus];

  const nonEmptySpecs = Object.entries(specs).filter(([_, val]) => !!val);
  const isOwner = currentUser === exhibit.owner;

  useEffect(() => {
      setCurrentSlideIndex(0);
  }, [exhibit.id]);

  // Smart Scrolling for Notifications
  useEffect(() => {
      if (highlightCommentId) {
          setTimeout(() => {
              const el = document.getElementById(`comment-${highlightCommentId}`);
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('animate-pulse');
                  setTimeout(() => el.classList.remove('animate-pulse'), 2000);
              }
          }, 500); // Slight delay for rendering
      }
  }, [highlightCommentId, comments]);

  const similarArtifacts = useMemo(() => {
      if (!allExhibits) return [];
      return getSimilarArtifacts(exhibit, allExhibits);
  }, [exhibit, allExhibits]);

  const linkedArtifacts = useMemo(() => {
      if (!exhibit.relatedIds || !allExhibits) return [];
      return allExhibits.filter(e => exhibit.relatedIds?.includes(e.id));
  }, [exhibit.relatedIds, allExhibits]);

  useEffect(() => {
      if (mentionQuery !== null) {
          const query = mentionQuery.toLowerCase();
          setFilteredUsers(users.filter(u => u.username.toLowerCase().includes(query)).slice(0, 5));
      } else {
          setFilteredUsers([]);
      }
  }, [mentionQuery, users]);

  const handleShare = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`NeoArchive Artifact: ${exhibit.title}`);
    const media = encodeURIComponent(slides[currentSlideIndex].url);
    
    switch(platform) {
        case 'tg': window.open(`https://t.me/share/url?url=${url}&text=${text}`); break;
        case 'wa': window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`); break;
        case 'pin': window.open(`https://pinterest.com/pin/create/button/?url=${url}&media=${media}&description=${text}`); break;
        case 'copy': navigator.clipboard.writeText(window.location.href); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); break;
    }
    setShowShareMenu(false);
  };

  const handleReply = (comment: Comment) => {
      setReplyTo({ id: comment.id, author: comment.author });
      setCommentText(`@${comment.author} `);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setCommentText(text);
      const lastWord = text.split(' ').pop();
      if (lastWord && lastWord.startsWith('@')) setMentionQuery(lastWord.slice(1));
      else setMentionQuery(null);
  };

  const selectMention = (username: string) => {
      const words = commentText.split(' ');
      words.pop(); 
      const newText = [...words, `@${username} `].join(' ');
      setCommentText(newText);
      setMentionQuery(null);
  };

  return (
    <div className={`w-full min-h-full pb-20 animate-in slide-in-from-right-8 fade-in duration-500 ${isWinamp ? 'font-mono text-gray-300' : theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
      
      {/* Winamp-style Header Bar */}
      {isWinamp && (
          <div className="bg-[#282828] border-t border-l border-[#505050] border-b border-r border-[#101010] p-1 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 px-2 bg-gradient-to-r from-[#000080] to-[#000040] w-full">
                  <span className="text-[10px] text-white font-pixel tracking-widest">{exhibit.title.toUpperCase()} /// KBPS: 320</span>
              </div>
          </div>
      )}

      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
        <button onClick={onBack} className={`flex items-center gap-2 font-pixel text-[10px] opacity-70 hover:opacity-100 uppercase tracking-widest ${isWinamp ? 'text-[#00ff00]' : ''}`}><ArrowLeft size={14} /> НАЗАД</button>
        <div className="flex gap-4">
          {(isOwner || isAdmin) && onEdit && (
              <button onClick={() => onEdit(exhibit)} className="text-purple-400 hover:text-purple-300 transition-all flex items-center gap-2 font-pixel text-[10px] uppercase">
                  <Edit2 size={14} /> ИЗМЕНИТЬ
              </button>
          )}
          {(isOwner || isAdmin) && onDelete && ( 
              <button 
                onClick={() => onDelete(exhibit.id)} 
                className="text-red-500 hover:text-red-400 transition-all flex items-center gap-2 font-pixel text-[10px] uppercase"
              >
                  <Trash2 size={14} /> УДАЛИТЬ
              </button>
          )}
          <div className="relative">
            <button onClick={() => setShowShareMenu(!showShareMenu)} className={`flex items-center gap-2 opacity-70 hover:opacity-100 transition-all ${shareCopied ? 'text-green-500' : ''}`}><Share2 size={18} /></button>
            {showShareMenu && (
                <div className="absolute right-0 top-8 w-48 bg-dark-surface border border-white/10 rounded-xl shadow-2xl z-50 p-2 animate-in slide-in-from-top-2">
                    <button onClick={() => handleShare('tg')} className="w-full text-left p-3 hover:bg-white/5 rounded-lg text-xs font-pixel flex items-center gap-3"><Send size={14} className="text-blue-400"/> TELEGRAM</button>
                    <button onClick={() => handleShare('wa')} className="w-full text-left p-3 hover:bg-white/5 rounded-lg text-xs font-pixel flex items-center gap-3"><MessageCircle size={14} className="text-green-500"/> WHATSAPP</button>
                    <button onClick={() => handleShare('pin')} className="w-full text-left p-3 hover:bg-white/5 rounded-lg text-xs font-pixel flex items-center gap-3"><Pin size={14} className="text-red-500"/> PINTEREST</button>
                    <button onClick={() => handleShare('copy')} className="w-full text-left p-3 hover:bg-white/5 rounded-lg text-xs font-pixel flex items-center gap-3"><Share2 size={14}/> COPY LINK</button>
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="space-y-4">
          {/* Main Media Container */}
          <div className={`relative aspect-square md:aspect-video w-full overflow-hidden border transition-all duration-500 ${isWinamp ? 'bg-black border-[#505050]' : (theme === 'dark' ? 'rounded-2xl border-white/10 bg-black' : 'rounded-2xl border-black/10 bg-white')} ${isCursed ? 'shadow-[0_0_30px_red]' : ''}`}>
             
             {slides[currentSlideIndex].type === 'image' ? (
                 <>
                    {/* Blurred Background */}
                    <div className="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-110" style={{backgroundImage: `url(${slides[currentSlideIndex].url})`}} />
                    <img src={slides[currentSlideIndex].url} alt={exhibit.title} className="relative z-10 w-full h-full object-contain" />
                 </>
             ) : (
                 <iframe src={slides[currentSlideIndex].url} className="w-full h-full relative z-10" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
             )}

             {slides.length > 1 && (
               <>
                 <button onClick={() => setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors z-20"><ChevronLeft size={24}/></button>
                 <button onClick={() => setCurrentSlideIndex(prev => (prev + 1) % slides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors z-20"><ChevronRight size={24}/></button>
               </>
             )}
          </div>
          
          {/* Thumbnails */}
          {slides.length > 1 && (
            <div className="flex gap-3 overflow-x-auto py-2 scrollbar-hide snap-x">
               {slides.map((media, idx) => ( 
                   <button 
                    key={idx} 
                    onClick={() => setCurrentSlideIndex(idx)} 
                    className={`snap-start relative w-20 h-20 flex-shrink-0 border-2 overflow-hidden transition-all flex items-center justify-center bg-black ${currentSlideIndex === idx ? (isWinamp ? 'border-[#00ff00]' : 'border-green-500 scale-105 shadow-lg') : 'border-transparent opacity-50'} ${!isWinamp ? 'rounded-xl' : ''}`}
                   >
                       {media.type === 'video' ? <Video size={24} className="text-white"/> : <img src={media.url} className="w-full h-full object-cover" />}
                   </button> 
               ))}
            </div>
          )}
        </div>

        <div className={`p-6 border ${isWinamp ? 'bg-[#191919] border-[#505050]' : (theme === 'dark' ? 'bg-dark-surface border-white/10 rounded-3xl' : 'bg-white border-black/10 shadow-xl rounded-3xl')}`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
               <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={`px-2 py-1 text-[9px] font-pixel font-bold uppercase ${isWinamp ? 'bg-[#00ff00] text-black' : 'bg-green-500 text-black rounded'}`}>{exhibit.category}</span>
                      <span className={`px-2 py-1 text-[9px] font-bold font-pixel border flex items-center gap-1 uppercase ${isWinamp ? 'border-[#00ff00] text-[#00ff00]' : `${tier.bgColor} ${tier.color} rounded`}`}><TierIcon size={10} /> {tier.name}</span>
                      {tradeStatus !== 'NONE' && (
                          <span className={`px-2 py-1 text-[9px] font-bold font-pixel border flex items-center gap-1 uppercase ${tradeConfig.color} ${tradeConfig.bg} ${!isWinamp ? 'rounded' : ''}`}>
                              {tradeConfig.icon && React.createElement(tradeConfig.icon, { size: 10 })} {tradeConfig.badge}
                          </span>
                      )}
                  </div>
                  <h1 className={`text-2xl md:text-4xl font-bold font-pixel leading-tight mb-4 ${isCursed ? 'text-red-500 italic' : (isWinamp ? 'text-[#00ff00]' : '')}`}>{exhibit.title}</h1>
               </div>
               
               <div className={`flex items-center gap-2 p-2 border ${isWinamp ? 'border-[#505050] bg-black' : (theme === 'dark' ? 'bg-black/40 border-white/5 rounded-2xl' : 'bg-gray-50 border-black/5 rounded-2xl')}`}>
                  <button onClick={() => onLike(exhibit.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95 ${isLiked ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                    <span className="text-sm font-bold font-mono">{exhibit.likes}</span>
                  </button>
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
                <div className={`flex items-center gap-2 mb-6 p-2 rounded-2xl border ${isWinamp ? 'bg-black border-[#505050]' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex -space-x-3 ml-2">
                        {exhibit.likedBy.slice(0, 5).map(name => (
                            <img key={name} src={getUserAvatar(name)} title={`@${name}`} onClick={() => onAuthorClick(name)} className="w-8 h-8 rounded-full border-2 border-black cursor-pointer hover:scale-110 transition-transform" />
                        ))}
                    </div>
                    <span className="text-[10px] font-pixel opacity-40 uppercase ml-2">Оценили это</span>
                </div>
            )}

            <div className={`flex items-center justify-between p-4 mb-6 border ${isWinamp ? 'bg-black border-[#505050]' : (theme === 'dark' ? 'bg-black/30 border-white/5 rounded-2xl' : 'bg-gray-100 border-black/5 rounded-2xl')}`}>
               <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onAuthorClick(exhibit.owner)}>
                  <div className="w-12 h-12 rounded-full border-2 border-green-500/50 p-0.5"><img src={getUserAvatar(exhibit.owner)} className="w-full h-full object-cover rounded-full" /></div>
                  <div><div className={`font-bold font-pixel text-xs transition-colors ${isWinamp ? 'text-[#00ff00]' : 'group-hover:text-green-500'}`}>@{exhibit.owner}</div><div className="text-[10px] opacity-40 font-mono uppercase">{exhibit.timestamp}</div></div>
               </div>
               {!isOwner && ( <button onClick={() => onFollow(exhibit.owner)} className={`px-4 py-2 text-[10px] font-bold font-pixel border transition-all ${isFollowing ? 'border-white/10 opacity-40' : 'bg-green-500 text-black border-green-500'} ${!isWinamp ? 'rounded-xl' : ''}`}>{isFollowing ? 'ПОДПИСАН' : 'ПОДПИСАТЬСЯ'}</button> )}
            </div>

            <div className="prose prose-sm max-w-none mb-8 border-l-2 border-green-500/20 pl-4"><p className={`font-mono text-sm leading-relaxed whitespace-pre-wrap ${isWinamp ? 'text-[#00ff00] opacity-80' : 'opacity-80'}`}>{exhibit.description}</p></div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
               {nonEmptySpecs.map(([key, val]) => ( <div key={key} className={`p-3 border ${isWinamp ? 'bg-black border-[#505050]' : 'bg-black/20 border-white/5 rounded-xl'}`}><div className="text-[9px] uppercase opacity-40 mb-1 font-pixel tracking-widest">{key}</div><div className="font-bold font-mono text-sm">{val}</div></div> ))}
               {exhibit.condition && ( <div className={`p-3 border ${isWinamp ? 'bg-black border-[#505050]' : 'bg-black/20 border-white/5 rounded-xl'}`}><div className="text-[9px] uppercase opacity-40 mb-1 font-pixel tracking-widest">СОСТОЯНИЕ</div><div className="font-black font-mono text-sm text-green-400 uppercase">{exhibit.condition}</div></div> )}
            </div>

            {/* Linked Artifacts */}
            {linkedArtifacts.length > 0 && (
                <div className={`mb-8 p-4 border ${isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-white/5 border-white/10 rounded-2xl'}`}>
                    <h3 className="font-pixel text-[10px] opacity-70 uppercase tracking-widest mb-4 flex items-center gap-2"><Link2 size={14}/> СВЯЗАННЫЕ ЭКСПОНАТЫ</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {linkedArtifacts.map(link => (
                            <div key={link.id} onClick={() => onExhibitClick(link)} className="group cursor-pointer">
                                <div className="aspect-square rounded-lg overflow-hidden border border-white/10 relative">
                                    <img src={link.imageUrls[0]} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                </div>
                                <div className="mt-2 text-[10px] font-bold truncate">{link.title}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="pt-8 border-t border-white/10">
               <h3 className="font-pixel text-sm mb-6 flex items-center gap-2"><MessageSquare size={16} /> ПРОТОКОЛ КОММЕНТАРИЕВ ({comments.length})</h3>
               
               <div className="space-y-4 mb-8">
                  {comments.length === 0 ? ( <div className="text-center py-10 opacity-30 text-xs font-pixel uppercase tracking-widest">ЛОГИ ПУСТЫ</div> ) : ( 
                    comments.map(c => {
                        const isCommentLiked = c.likedBy && c.likedBy.includes(currentUser);
                        const isAuthor = c.author === currentUser;
                        return ( 
                          <div 
                            key={c.id} 
                            id={`comment-${c.id}`} // Hook for smart scrolling
                            className={`p-4 border transition-all ${isWinamp ? 'bg-black border-[#505050]' : 'rounded-2xl bg-white/5 border-white/5 hover:border-white/10'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <img src={getUserAvatar(c.author)} className="w-6 h-6 rounded-full cursor-pointer" onClick={() => onAuthorClick(c.author)} />
                                    <div>
                                        <div onClick={() => onAuthorClick(c.author)} className="font-bold cursor-pointer text-green-500 font-pixel text-[10px] leading-none">@{c.author}</div>
                                        <div className="text-[9px] opacity-30 font-mono leading-none mt-1">{c.timestamp}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => onCommentLike(c.id)} className={`flex items-center gap-1 text-[10px] transition-colors ${isCommentLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                                        <Heart size={12} fill={isCommentLiked ? "currentColor" : "none"} /> {c.likes > 0 && c.likes}
                                    </button>
                                    <button onClick={() => handleReply(c)} className="text-gray-500 hover:text-white transition-colors" title="Ответить">
                                        <CornerDownRight size={14} />
                                    </button>
                                    {(isAuthor || isAdmin) && (
                                        <button onClick={() => onDeleteComment(exhibit.id, c.id)} className="text-gray-500 hover:text-red-500 transition-colors" title="Удалить">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="font-mono text-sm opacity-80 pl-8">{renderTextWithMentions(c.text, onAuthorClick)}</p>
                          </div> 
                        );
                    }) 
                  )}
               </div>

               <div className="flex flex-col gap-2 relative">
                  {mentionQuery !== null && filteredUsers.length > 0 && (
                      <div className="absolute bottom-full mb-2 left-0 w-64 bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                          {filteredUsers.map(u => (
                              <button 
                                key={u.username}
                                onClick={() => selectMention(u.username)}
                                className="w-full flex items-center gap-2 p-2 hover:bg-white/10 text-left transition-colors"
                              >
                                  <img src={u.avatarUrl} className="w-6 h-6 rounded-full" />
                                  <div className="flex flex-col">
                                      <span className="font-bold text-xs">@{u.username}</span>
                                      <span className="text-[9px] opacity-50 truncate">{u.tagline}</span>
                                  </div>
                              </button>
                          ))}
                      </div>
                  )}

                  {replyTo && (
                      <div className="flex items-center justify-between text-xs font-mono bg-white/5 p-2 rounded-lg border border-white/10">
                          <span className="opacity-70">Ответ для <span className="text-green-500 font-bold">@{replyTo.author}</span></span>
                          <button onClick={() => { setReplyTo(null); setCommentText(''); }} className="hover:text-red-500"><Trash2 size={12}/></button>
                      </div>
                  )}
                  <div className="flex gap-3">
                      <input 
                          type="text" 
                          value={commentText} 
                          onChange={handleCommentChange} 
                          placeholder={replyTo ? `Ответ @${replyTo.author}...` : "ВВЕСТИ ДАННЫЕ В ПРОТОКОЛ... (@ для упоминания)"}
                          className={`flex-1 bg-black/40 border border-white/10 px-4 py-3 font-mono text-sm focus:outline-none focus:border-green-500 transition-colors ${!isWinamp ? 'rounded-xl' : ''}`} 
                          onKeyDown={(e) => { 
                              if(e.key === 'Enter' && commentText.trim()) { 
                                  onPostComment(exhibit.id, commentText, replyTo?.id); 
                                  setCommentText(''); 
                                  setReplyTo(null);
                                  setMentionQuery(null);
                              } 
                          }} 
                      />
                      <button 
                          onClick={() => { 
                              if(commentText.trim()) { 
                                  onPostComment(exhibit.id, commentText, replyTo?.id); 
                                  setCommentText(''); 
                                  setReplyTo(null);
                                  setMentionQuery(null);
                              } 
                          }} 
                          className={`bg-green-500 text-black p-3 hover:scale-105 active:scale-95 transition-all ${!isWinamp ? 'rounded-xl' : ''}`}
                      >
                          <Send size={20} />
                      </button>
                  </div>
               </div>
            </div>
        </div>

        {similarArtifacts.length > 0 && (
            <div className="mt-12">
                <h3 className="font-pixel text-[10px] opacity-50 mb-4 flex items-center gap-2 tracking-[0.2em] uppercase"><Sparkles size={14} className="text-purple-400" /> РЕКОМЕНДУЕМЫЕ ОБЪЕКТЫ (AI MATCH)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {similarArtifacts.map(sim => (
                        <ExhibitCard 
                            key={sim.id} 
                            item={sim} 
                            theme={theme}
                            onClick={() => onExhibitClick(sim)}
                            isLiked={sim.likedBy?.includes(currentUser)}
                            onLike={() => {}}
                            onAuthorClick={onAuthorClick}
                        />
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default ExhibitDetailPage;
