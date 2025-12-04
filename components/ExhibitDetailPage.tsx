import React, { useState, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Heart, Share2, 
  MessageSquare, Send, Video, ThumbsUp, UserPlus, UserCheck,
  Mail, Trash, Edit // Standard icons
} from 'lucide-react';
import { Exhibit } from '../types';

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
  onAuthorClick: (username: string) => void;
  onFollow: (username: string) => void;
  onMessage: (username: string) => void;
  onDelete: (id: string) => void;
  onEdit: (exhibit: Exhibit) => void;
  isFollowing: boolean;
  currentUser: string;
  isAdmin: boolean;
}

const ExhibitDetailPage: React.FC<ExhibitDetailPageProps> = ({
  exhibit,
  theme,
  onBack,
  onShare,
  onFavorite,
  onLike,
  isFavorited,
  isLiked,
  onPostComment,
  onAuthorClick,
  onFollow,
  onMessage,
  onDelete,
  onEdit,
  isFollowing,
  currentUser,
  isAdmin
}) => {
  // CRASH PROTECTION: If exhibit is null, don't render anything
  if (!exhibit) return <div className="p-10 text-center opacity-50">ОБЪЕКТ НЕ НАЙДЕН</div>;

  // Safe defaults to prevent "map of undefined" errors
  const images = Array.isArray(exhibit.imageUrls) ? exhibit.imageUrls : [];
  const specs = (exhibit.specs && typeof exhibit.specs === 'object') ? exhibit.specs : {};
  const comments = Array.isArray(exhibit.comments) ? exhibit.comments : [];
  const owner = exhibit.owner || 'Unknown';
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoomState, setZoomState] = useState({ show: false, x: 0, y: 0 });
  const [mobileScale, setMobileScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [commentInput, setCommentInput] = useState('');

  const pinchDiff = useRef<number>(0);
  const touchStartRef = useRef<{x: number, y: number} | null>(null);
  const lastTouchRef = useRef<{x: number, y: number} | null>(null);

  const isOwner = currentUser === owner;
  const canModify = isOwner || isAdmin;

  const renderRating = (rating: number = 0, max: number = 5) => {
    return (
      <div className={`flex gap-1 text-sm tracking-tighter ${theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'}`}>
        {[...Array(max)].map((_, i) => (
           <span key={i} className={i < rating ? "opacity-100" : "opacity-20"}>
             ■
           </span>
        ))}
      </div>
    );
  };

  const renderVideoPlayer = (url?: string) => {
      if (!url) return null;
      let embedUrl = url;
      // Simple parse to avoid crash
      try {
        if (url.includes('youtube.com/watch?v=')) {
            embedUrl = `https://www.youtube.com/embed/${url.split('v=')[1]?.split('&')[0]}`;
        } else if (url.includes('youtu.be/')) {
            embedUrl = `https://www.youtube.com/embed/${url.split('youtu.be/')[1]}`;
        } else if (url.includes('rutube.ru/video/')) {
            embedUrl = `https://rutube.ru/play/embed/${url.split('/video/')[1]?.split('/')[0]}`;
        }
      } catch(e) {
          return null;
      }
      return (
        <iframe 
          src={embedUrl} 
          title="Video Player" 
          className="w-full h-full" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen 
        />
      );
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (images.length === 0) return;
    setCurrentImageIndex(prev => (prev + 1) % images.length);
    setMobileScale(1); setPan({ x: 0, y: 0 });
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (images.length === 0) return;
    setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
    setMobileScale(1); setPan({ x: 0, y: 0 });
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomState({ show: true, x, y });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      pinchDiff.current = dist;
    } else if (e.touches.length === 1) {
       const t = e.touches[0];
       touchStartRef.current = { x: t.clientX, y: t.clientY };
       lastTouchRef.current = { x: t.clientX, y: t.clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();
      const currentDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      if (pinchDiff.current > 0) {
        const diff = currentDist - pinchDiff.current;
        const newScale = Math.min(Math.max(1, mobileScale + diff * 0.005), 4);
        setMobileScale(newScale);
        pinchDiff.current = currentDist;
      }
    } else if (e.touches.length === 1 && mobileScale > 1) {
       if (e.cancelable) e.preventDefault();
       const t = e.touches[0];
       if (lastTouchRef.current) {
          const dx = t.clientX - lastTouchRef.current.x;
          const dy = t.clientY - lastTouchRef.current.y;
          setPan(p => ({ x: p.x + dx, y: p.y + dy }));
          lastTouchRef.current = { x: t.clientX, y: t.clientY };
       }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
      if (mobileScale <= 1.1 && e.changedTouches.length === 1 && touchStartRef.current) {
          const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
          const diffX = touchStartRef.current.x - touchEnd.x;
          if (Math.abs(diffX) > 50) {
              if (diffX > 0) handleNextImage(); else handlePrevImage();
          }
      }
      touchStartRef.current = null;
      lastTouchRef.current = null;
  };

  const handleDeleteConfirm = () => {
      if (window.confirm("ВЫ УВЕРЕНЫ? ДАННЫЕ БУДУТ СТЕРТЫ ИЗ АРХИВА.")) {
          onDelete(exhibit.id);
      }
  };

  const safeImageSrc = images.length > 0 && images[currentImageIndex] 
    ? images[currentImageIndex] 
    : 'https://placehold.co/400x300?text=NO+DATA';

  return (
    <div className={`animate-in fade-in slide-in-from-right-8 duration-300 pb-20 ${
       theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
    }`}>
      {/* Top Nav Bar */}
      <div className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between ${
        theme === 'dark' ? 'bg-dark-bg/90 border-dark-dim' : 'bg-light-surface/90 border-light-dim'
      }`}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold hover:opacity-70 transition-opacity">
          <ChevronLeft size={20} /> НАЗАД
        </button>
        <div className="flex items-center gap-4">
             {canModify && (
                 <div className="flex gap-2">
                     {isOwner && (
                        <button onClick={() => onEdit(exhibit)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs font-bold border border-blue-400/30 px-2 py-1 rounded">
                            <Edit size={14}/> ПРАВИТЬ
                        </button>
                     )}
                     <button onClick={handleDeleteConfirm} className="text-red-500 hover:text-red-400 flex items-center gap-1 text-xs font-bold border border-red-500/30 px-2 py-1 rounded">
                         <Trash size={14}/> {isAdmin && !isOwner ? 'FORCE DEL' : 'УДАЛИТЬ'}
                     </button>
                 </div>
             )}
             <div className="text-xs font-mono uppercase opacity-50 tracking-widest hidden sm:block">
                ID: {exhibit.id}
             </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
          
          <div className="relative w-full aspect-[4/3] md:aspect-[16/9] bg-black group select-none overflow-hidden flex items-center justify-center mb-4 md:mb-8 md:rounded-b-lg shadow-2xl">
             <div 
               className="w-full h-full relative"
               onMouseMove={handleImageMouseMove}
               onMouseLeave={() => setZoomState({ ...zoomState, show: false })}
               onTouchStart={handleTouchStart}
               onTouchMove={handleTouchMove}
               onTouchEnd={handleTouchEnd}
               style={{ touchAction: mobileScale > 1 ? 'none' : 'pan-y' }}
             >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-black/70 backdrop-blur rounded-full text-white text-xs font-bold md:hidden">
                    {images.length > 0 ? `${currentImageIndex + 1} / ${images.length}` : '0 / 0'}
                </div>

                {exhibit.videoUrl && currentImageIndex === images.length ? (
                   renderVideoPlayer(exhibit.videoUrl)
                ) : (
                   <img 
                      src={safeImageSrc} 
                      alt={exhibit.title} 
                      className={`w-full h-full object-contain transition-transform duration-100 ${zoomState.show ? 'cursor-crosshair' : 'cursor-default'}`}
                      style={{
                        transformOrigin: zoomState.show ? `${zoomState.x}% ${zoomState.y}%` : 'center',
                        transform: zoomState.show 
                           ? "scale(2)" 
                           : `translate(${pan.x}px, ${pan.y}px) scale(${mobileScale})`
                      }}
                    />
                )}
             </div>

             {(images.length > 1 || exhibit.videoUrl) && !zoomState.show && (
                 <>
                   <button onClick={handlePrevImage} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all">
                     <ChevronLeft size={24} />
                   </button>
                   <button onClick={handleNextImage} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all">
                     <ChevronRight size={24} />
                   </button>
                 </>
             )}
          </div>

          <div className="px-4 mb-8">
             <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-center">
                 {images.map((img, idx) => (
                    <div 
                        key={idx}
                        onClick={() => { setCurrentImageIndex(idx); setMobileScale(1); }}
                        className={`w-16 h-16 flex-shrink-0 rounded border-2 overflow-hidden cursor-pointer transition-all ${
                            idx === currentImageIndex 
                              ? (theme === 'dark' ? 'border-dark-primary opacity-100' : 'border-light-accent opacity-100')
                              : 'border-transparent opacity-40 hover:opacity-80'
                        }`}
                    >
                        <img src={img} className="w-full h-full object-cover" alt="" />
                    </div>
                 ))}
                 {exhibit.videoUrl && (
                    <div 
                        onClick={() => { setCurrentImageIndex(images.length); setMobileScale(1); }}
                        className={`w-16 h-16 flex-shrink-0 rounded border-2 overflow-hidden cursor-pointer flex items-center justify-center bg-gray-900 ${
                            currentImageIndex === images.length
                              ? (theme === 'dark' ? 'border-dark-primary text-dark-primary' : 'border-light-accent text-light-accent')
                              : 'border-transparent text-gray-500'
                        }`}
                    >
                        <Video size={24} />
                    </div>
                 )}
             </div>
          </div>

          <div className="px-4 md:px-0 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="md:col-span-2 space-y-6">
                 <div>
                    <div className={`inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider border rounded mb-2 ${
                        theme === 'dark' ? 'border-dark-dim text-dark-dim' : 'border-light-dim text-light-dim'
                    }`}>
                        {exhibit.category}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-pixel leading-tight mb-4">{exhibit.title}</h1>
                    
                    <div className="flex items-center gap-4 border-b pb-6 border-opacity-20 border-gray-500">
                        <div className="flex gap-1 items-center mr-4">
                           {renderRating(exhibit.rating)}
                        </div>
                        
                        <button 
                            onClick={() => onLike(exhibit.id)}
                            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded transition-colors ${
                                isLiked 
                                ? (theme === 'dark' ? 'bg-dark-primary/20 text-dark-primary' : 'bg-light-accent/20 text-light-accent')
                                : 'hover:bg-gray-500/10'
                            }`}
                        >
                            <ThumbsUp size={16} fill={isLiked ? "currentColor" : "none"}/> {exhibit.likes}
                        </button>

                        <button 
                            onClick={() => onFavorite(exhibit.id)}
                            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded transition-colors ${
                                isFavorited
                                ? (theme === 'dark' ? 'bg-dark-primary/20 text-dark-primary' : 'bg-light-accent/20 text-light-accent')
                                : 'hover:bg-gray-500/10'
                            }`}
                        >
                            <Heart size={16} fill={isFavorited ? "currentColor" : "none"}/>
                        </button>

                        <button 
                            onClick={() => onShare(exhibit.id)}
                            className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded hover:bg-gray-500/10 transition-colors ml-auto"
                        >
                            <Share2 size={16} /> <span className="hidden sm:inline">ПОДЕЛИТЬСЯ</span>
                        </button>
                    </div>
                 </div>

                 <div className={`p-6 rounded border-l-4 leading-relaxed ${
                    theme === 'dark' ? 'bg-dark-surface border-dark-primary' : 'bg-light-surface border-light-accent'
                 }`}>
                    <h3 className="font-bold text-xs uppercase mb-3 opacity-50 tracking-widest">[ОПИСАНИЕ ОБЪЕКТА]</h3>
                    <p className="whitespace-pre-wrap">{exhibit.description}</p>
                 </div>
              </div>

              <div className="md:col-span-1 flex flex-col md:block gap-6 md:gap-8">
                  <div className="order-1 md:order-none">
                    {Object.keys(specs).length > 0 && (
                        <div>
                            <h4 className="font-bold uppercase tracking-wider mb-4 text-sm opacity-80">Характеристики</h4>
                            <div className={`rounded overflow-hidden border text-sm ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                                {Object.entries(specs).map(([key, val], idx) => (
                                    <div 
                                        key={key} 
                                        className={`flex justify-between p-3 border-b last:border-0 ${
                                            idx % 2 === 0 
                                            ? (theme === 'dark' ? 'bg-white/5' : 'bg-gray-50')
                                            : 'bg-transparent'
                                        } ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}
                                    >
                                        <span className="opacity-60 font-bold text-xs uppercase">{key}</span>
                                        <span className="font-mono text-right">{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {exhibit.quality && (
                        <div className={`mt-4 p-4 rounded border text-sm ${theme === 'dark' ? 'border-dark-dim bg-yellow-900/10' : 'border-light-dim bg-yellow-50'}`}>
                            <div className="font-bold uppercase text-xs mb-1 opacity-70">Состояние / Детали</div>
                            <div>{exhibit.quality}</div>
                        </div>
                    )}
                  </div>

                  <div className={`order-2 md:order-none p-5 rounded border ${theme === 'dark' ? 'border-dark-dim bg-dark-surface' : 'border-light-dim bg-white shadow-sm'}`}>
                      <div className="flex items-center gap-4 mb-4 cursor-pointer group" onClick={() => onAuthorClick(owner)}>
                          <div className={`w-12 h-12 rounded-full overflow-hidden border-2 group-hover:scale-105 transition-transform ${theme === 'dark' ? 'border-dark-primary' : 'border-light-accent'}`}>
                              <img src={`https://ui-avatars.com/api/?name=${owner}&background=random`} alt={owner} className="w-full h-full object-cover" />
                          </div>
                          <div>
                              <div className="text-[10px] uppercase opacity-50 font-bold">Владелец</div>
                              <div className="font-bold text-lg leading-none hover:underline">@{owner}</div>
                          </div>
                      </div>
                      
                      {owner !== currentUser && (
                         <div className="grid grid-cols-2 gap-2 mb-4">
                             <button 
                                 onClick={() => onFollow(owner)}
                                 className={`py-2 text-xs font-bold uppercase rounded flex items-center justify-center gap-2 transition-all ${
                                     isFollowing 
                                        ? (theme === 'dark' ? 'bg-transparent border border-dark-primary text-dark-primary' : 'bg-transparent border border-light-accent text-light-accent')
                                        : (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white')
                                 }`}
                             >
                                 {isFollowing ? <UserCheck size={14}/> : <UserPlus size={14}/>}
                                 {isFollowing ? 'В ПОДПИСКАХ' : 'ПОДПИСАТЬСЯ'}
                             </button>
                             <button
                                onClick={() => onMessage(owner)}
                                className={`py-2 text-xs font-bold uppercase rounded flex items-center justify-center gap-2 transition-all border ${
                                    theme === 'dark' ? 'border-dark-dim hover:bg-white/10' : 'border-light-dim hover:bg-gray-100'
                                }`}
                             >
                                <Mail size={14} /> ЛС
                             </button>
                         </div>
                      )}

                      <div className="text-xs space-y-2 opacity-70">
                          <div className="flex justify-between border-b border-gray-500/20 pb-2">
                              <span>Дата загрузки:</span>
                              <span className="font-mono">{exhibit.timestamp}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-500/20 pb-2">
                              <span>Просмотров:</span>
                              <span className="font-mono">{exhibit.views}</span>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="md:col-span-2 pt-6 border-t md:border-0 border-gray-500/20">
                    <h3 className="flex items-center gap-2 font-bold mb-4 uppercase tracking-wider">
                        <MessageSquare size={18} /> КОММЕНТАРИИ ({comments.length})
                    </h3>
                    
                    <div className="space-y-4 mb-6">
                        {comments.length === 0 && (
                            <div className="opacity-50 text-sm italic py-4">Тишина в эфире...</div>
                        )}
                        {comments.map(comment => (
                            <div key={comment.id} className={`p-3 rounded border text-sm ${theme === 'dark' ? 'border-dark-dim bg-black/20' : 'border-light-dim bg-gray-50'}`}>
                                <div className="flex justify-between mb-1">
                                    <span 
                                        className={`font-bold cursor-pointer hover:underline ${theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'}`}
                                        onClick={() => onAuthorClick(comment.author)}
                                    >
                                        @{comment.author}
                                    </span>
                                    <span className="opacity-40 text-xs">{comment.timestamp}</span>
                                </div>
                                <p>{comment.text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input 
                            value={commentInput}
                            onChange={e => setCommentInput(e.target.value)}
                            placeholder="Оставить запись..."
                            className={`flex-1 bg-transparent border-b p-3 focus:outline-none ${
                                theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'
                            }`}
                            onKeyDown={e => e.key === 'Enter' && (onPostComment(exhibit.id, commentInput), setCommentInput(''))}
                        />
                        <button 
                            onClick={() => { onPostComment(exhibit.id, commentInput); setCommentInput(''); }}
                            disabled={!commentInput.trim()}
                            className={`px-4 rounded font-bold transition-all ${
                                theme === 'dark' ? 'bg-dark-primary text-black hover:opacity-80' : 'bg-light-accent text-white hover:opacity-80'
                            } disabled:opacity-50`}
                        >
                            <Send size={18} />
                        </button>
                    </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ExhibitDetailPage;