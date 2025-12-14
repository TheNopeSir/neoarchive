import React, { useState, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  Share2, 
  MessageSquare, 
  Trash2, 
  Edit,
  Send,
  ArrowLeft,
  Eye,
  Check,
  Video,
  Reply
} from 'lucide-react';
import { Exhibit } from '../types';
import { getArtifactTier, TIER_CONFIG } from '../constants';
import useSwipe from '../hooks/useSwipe';
import { getUserAvatar } from '../services/storageService';
import SEO from './SEO';

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
  onLikeComment?: (exhibitId: string, commentId: string) => void;
  onAuthorClick: (author: string) => void;
  onFollow: (username: string) => void;
  onMessage: (username: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (exhibit: Exhibit) => void;
  isFollowing: boolean;
  currentUser: string;
  isAdmin: boolean;
}

export default function ExhibitDetailPage({
  exhibit,
  theme,
  onBack,
  onShare,
  onFavorite,
  onLike,
  isFavorited,
  isLiked,
  onPostComment,
  onLikeComment,
  onAuthorClick,
  onFollow,
  onMessage,
  onDelete,
  onEdit,
  isFollowing,
  currentUser,
  isAdmin
}: ExhibitDetailPageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  
  // Safe access to arrays
  const images = Array.isArray(exhibit.imageUrls) ? exhibit.imageUrls : ['https://placehold.co/600x400?text=NO+IMAGE'];
  const specs = exhibit.specs || {};
  const comments = exhibit.comments || [];
  
  // Calculate tier via shared logic
  const tierKey = getArtifactTier(exhibit);
  const tier = TIER_CONFIG[tierKey];
  const TierIcon = tier.icon;

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const swipeHandlers = useSwipe({
      onSwipeLeft: handleNextImage,
      onSwipeRight: handlePrevImage
  });

  const handleNativeShare = async () => {
      const urlToShare = window.location.href; 
      const shareData = {
          title: `NeoArchive: ${exhibit.title}`,
          text: exhibit.description,
          url: urlToShare
      };

      if (navigator.share) {
          try {
              await navigator.share(shareData);
          } catch (err) {
              console.warn('Share cancelled', err);
          }
      } else {
          try {
              await navigator.clipboard.writeText(urlToShare);
              setShareCopied(true);
              setTimeout(() => setShareCopied(false), 2000);
          } catch (err) {
              console.error('Clipboard failed', err);
          }
      }
  };

  const handleReply = (author: string) => {
      setCommentText(`@${author} `);
      if (commentInputRef.current) {
          commentInputRef.current.focus();
      }
  };

  const isOwner = currentUser === exhibit.owner;
  const canDelete = isOwner || isAdmin;

  const getEmbedUrl = (url: string) => {
      if (!url) return null;
      const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(youtubeRegex);
      return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };
  const embedUrl = getEmbedUrl(exhibit.videoUrl || '');

  return (
    <div className={`w-full min-h-full pb-20 animate-in fade-in duration-300 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
      
      <SEO 
        title={`${exhibit.title} | ${exhibit.category} | NeoArchive`}
        description={exhibit.description}
        image={images[0]}
        type="article"
        path={`/exhibit/${exhibit.slug || exhibit.id}`}
      />

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed border-opacity-20 border-gray-500">
        <button 
          onClick={onBack}
          className={`flex items-center gap-2 font-bold hover:underline font-pixel text-xs ${theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'}`}
        >
          <ArrowLeft size={16} /> НАЗАД
        </button>
        
        <div className="flex gap-4">
          {isOwner && onEdit && (
              <button onClick={() => onEdit(exhibit)} className={`hover:scale-110 transition-transform ${theme === 'dark' ? 'text-yellow-400' : 'text-orange-500'}`} title="EDIT">
                  <Edit size={18} />
              </button>
          )}
          {canDelete && onDelete && (
             <button onClick={() => onDelete(exhibit.id)} className="text-red-500 hover:text-red-400" title={isAdmin ? "ADMIN DELETE" : "DELETE"}>
                <Trash2 size={18} />
             </button>
          )}
          <button 
            onClick={handleNativeShare} 
            className={`flex items-center gap-2 opacity-70 hover:opacity-100 transition-all ${shareCopied ? 'text-green-500' : ''}`}
            title="Поделиться"
          >
            {shareCopied ? <Check size={18} /> : <Share2 size={18} />}
            {shareCopied && <span className="font-pixel text-[10px]">COPIED!</span>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Media */}
        <div className="space-y-4">
          <div 
            className={`relative w-full aspect-square md:aspect-[4/3] rounded-lg overflow-hidden border-2 shadow-2xl flex items-center justify-center ${
                theme === 'dark' ? 'border-dark-dim bg-black' : 'border-light-dim bg-gray-100'
            } ${tier.name === 'LEGENDARY' ? 'shadow-yellow-500/20 border-yellow-500/50' : ''}`}
            {...swipeHandlers}
          >
             <div 
                className="absolute inset-0 bg-cover bg-center blur-xl opacity-50 scale-110" 
                style={{ backgroundImage: `url(${images[currentImageIndex]})` }}
             ></div>

             <img 
               src={images[currentImageIndex]} 
               alt={exhibit.title} 
               className="relative z-10 w-full h-full object-contain max-h-[80vh]"
             />
             
             {images.length > 1 && (
               <>
                 <button 
                   onClick={handlePrevImage}
                   className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black transition-colors z-20 backdrop-blur-md"
                 >
                   <ChevronLeft />
                 </button>
                 <button 
                   onClick={handleNextImage}
                   className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black transition-colors z-20 backdrop-blur-md"
                 >
                   <ChevronRight />
                 </button>
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold font-mono z-20">
                   {currentImageIndex + 1} / {images.length}
                 </div>
               </>
             )}
          </div>
          
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
               {images.map((img, idx) => (
                 <button 
                   key={idx}
                   onClick={() => setCurrentImageIndex(idx)}
                   className={`relative w-16 h-16 flex-shrink-0 border-2 rounded overflow-hidden ${
                      currentImageIndex === idx 
                        ? (theme === 'dark' ? 'border-dark-primary' : 'border-light-accent') 
                        : 'border-transparent opacity-50 hover:opacity-100'
                   }`}
                 >
                   <img src={img} className="w-full h-full object-cover" />
                 </button>
               ))}
            </div>
          )}

          {exhibit.videoUrl && (
             <div className={`mt-4 border-2 border-dashed p-1 rounded-lg ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                 <div className="font-pixel text-[10px] mb-2 px-1 flex items-center gap-2 opacity-70">
                     <Video size={12} /> VIDEO_SOURCE
                 </div>
                 <div className="relative aspect-video w-full bg-black rounded overflow-hidden">
                     {embedUrl ? (
                         <iframe 
                           src={embedUrl} 
                           className="w-full h-full" 
                           frameBorder="0" 
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                           allowFullScreen
                         />
                     ) : (
                         <video 
                           src={exhibit.videoUrl} 
                           controls 
                           className="w-full h-full"
                         >
                            Your browser does not support the video tag.
                         </video>
                     )}
                 </div>
             </div>
          )}
        </div>

        {/* Right Column: Info */}
        <div className="flex flex-col h-full">
            <div className="flex items-start justify-between">
               <div className="flex-1 mr-2 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className={`inline-block px-2 py-0.5 text-[9px] font-pixel rounded border ${
                          theme === 'dark' ? 'bg-dark-primary text-black border-dark-primary' : 'bg-light-accent text-white border-light-accent'
                      }`}>
                          {exhibit.category}
                      </div>
                      
                      <div className={`inline-block px-2 py-0.5 text-[9px] font-bold font-pixel rounded border flex items-center gap-1 ${tier.bgColor} border-current ${tier.color}`}>
                          <TierIcon size={10} /> {tier.name}
                      </div>
                  </div>
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold font-pixel mb-2 leading-tight break-words">
                    {exhibit.title}
                  </h1>
               </div>
               
               <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <button 
                     onClick={() => onLike(exhibit.id)}
                     className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all active:scale-95 ${
                        isLiked 
                          ? (theme === 'dark' ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-red-600 text-red-600 bg-red-600/10')
                          : 'border-gray-500/30 opacity-70 hover:opacity-100'
                     }`}
                  >
                     <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                     <span className="text-xs font-bold mt-1 font-mono">{exhibit.likes}</span>
                  </button>
                  <div className={`flex flex-col items-center justify-center p-2 rounded-lg border opacity-70 ${
                      theme === 'dark' ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-500'
                  }`}>
                      <Eye size={18} />
                      <span className="text-[10px] font-bold mt-1 font-mono">{exhibit.views}</span>
                  </div>
               </div>
            </div>

            {/* Author Block */}
            <div className={`flex items-center justify-between p-3 my-4 rounded border ${
                theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'
            }`}>
               <div className="flex items-center gap-3 cursor-pointer" onClick={() => onAuthorClick(exhibit.owner)}>
                  <div className="w-8 h-8 rounded-full bg-gray-500 overflow-hidden flex-shrink-0 border border-gray-500">
                     <img src={getUserAvatar(exhibit.owner)} alt="avatar" />
                  </div>
                  <div className="overflow-hidden">
                     <div className="font-bold font-pixel text-xs truncate">@{exhibit.owner}</div>
                     <div className="text-[10px] opacity-50 font-mono">{exhibit.timestamp}</div>
                  </div>
               </div>
               {!isOwner && (
                 <button 
                   onClick={() => onFollow(exhibit.owner)}
                   className={`px-3 py-1 text-[10px] font-bold border rounded hover:opacity-80 transition-opacity font-pixel whitespace-nowrap ${
                      isFollowing 
                        ? (theme === 'dark' ? 'bg-transparent border-dark-dim text-dark-dim' : 'bg-gray-200 border-gray-300 text-gray-500')
                        : (theme === 'dark' ? 'bg-dark-primary text-black border-dark-primary' : 'bg-light-accent text-white border-light-accent')
                   }`}
                 >
                   {isFollowing ? 'ПОДПИСАН' : 'ПОДПИСАТЬСЯ'}
                 </button>
               )}
            </div>

            {/* Description */}
            <div className={`prose max-w-none mb-6 ${theme === 'dark' ? 'prose-invert' : ''}`}>
               <p className="font-mono text-xs md:text-sm leading-relaxed whitespace-pre-line opacity-90 break-words">
                 {exhibit.description}
               </p>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
               {Object.entries(specs).map(([key, val]) => (
                 <div key={key} className={`p-2 border rounded ${theme === 'dark' ? 'border-dark-dim bg-black/20' : 'border-light-dim bg-gray-50'}`}>
                    <div className="text-[9px] uppercase opacity-50 mb-1 font-mono tracking-wider truncate">{key}</div>
                    <div className="font-bold font-mono text-xs truncate">{val as string}</div>
                 </div>
               ))}
               <div className={`p-2 border rounded ${theme === 'dark' ? 'border-dark-dim bg-black/20' : 'border-light-dim bg-gray-50'}`}>
                    <div className="text-[9px] uppercase opacity-50 mb-1 font-mono tracking-wider truncate">СОСТОЯНИЕ</div>
                    <div className="font-bold font-mono text-xs truncate">{exhibit.condition || 'НЕ УКАЗАНО'}</div>
               </div>
            </div>

            {/* Comments Section */}
            <div className="mt-auto pt-4 border-t border-dashed border-gray-500/30">
               <h3 className="font-pixel text-sm mb-4 flex items-center gap-2">
                 <MessageSquare size={14} /> КОММЕНТАРИИ ({comments.length})
               </h3>
               
               <div className="space-y-3 mb-6 max-h-52 overflow-y-auto pr-2">
                  {comments.length === 0 ? (
                    <div className="text-center py-4 opacity-50 text-xs font-mono">НЕТ ЗАПИСЕЙ В ПРОТОКОЛЕ</div>
                  ) : (
                    comments.map(comment => {
                      const isCommentLiked = comment.likedBy?.includes(currentUser);
                      return (
                        <div key={comment.id} className={`p-2 rounded text-xs ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                           <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => onAuthorClick(comment.author)}>
                                      <img src={getUserAvatar(comment.author)} alt={comment.author} />
                                  </div>
                                  <span 
                                    onClick={() => onAuthorClick(comment.author)}
                                    className={`font-bold cursor-pointer hover:underline font-pixel text-[9px] ${theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'}`}
                                  >
                                    @{comment.author}
                                  </span>
                                  <span className="text-[9px] opacity-40 font-mono">{comment.timestamp}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {/* Reply Button */}
                                <button 
                                    onClick={() => handleReply(comment.author)}
                                    className="opacity-50 hover:opacity-100 transition-opacity"
                                    title="Ответить"
                                >
                                    <Reply size={10} />
                                </button>

                                {/* Like Comment Button */}
                                {onLikeComment && (
                                    <button 
                                        onClick={() => onLikeComment(exhibit.id, comment.id)}
                                        className={`flex items-center gap-1 opacity-70 hover:opacity-100 ${isCommentLiked ? 'text-red-500' : ''}`}
                                    >
                                        <Heart size={10} fill={isCommentLiked ? "currentColor" : "none"} />
                                        {comment.likes > 0 && <span className="text-[9px]">{comment.likes}</span>}
                                    </button>
                                )}
                              </div>
                           </div>
                           <p className="opacity-80 font-mono break-words ml-6">{comment.text}</p>
                        </div>
                      )
                    })
                  )}
               </div>

               <div className="flex gap-2">
                  <input 
                    ref={commentInputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Внести данные в протокол..."
                    onKeyDown={(e) => {
                         if(e.key === 'Enter' && commentText.trim()) {
                             onPostComment(exhibit.id, commentText);
                             setCommentText('');
                         }
                    }}
                    className={`flex-1 bg-transparent border-b-2 py-2 px-2 focus:outline-none font-mono text-xs md:text-sm ${
                       theme === 'dark' 
                         ? 'border-dark-dim focus:border-dark-primary placeholder-dark-dim' 
                         : 'border-light-dim focus:border-light-accent placeholder-light-dim'
                    }`}
                  />
                  <button 
                     onClick={() => {
                        if(commentText.trim()) {
                           onPostComment(exhibit.id, commentText);
                           setCommentText('');
                        }
                     }}
                     className={`p-2 rounded-lg transition-transform hover:scale-105 ${
                        theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                     }`}
                  >
                     <Send size={16} />
                  </button>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
}