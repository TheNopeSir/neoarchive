import React, { useMemo } from 'react';
import { Box, Grid, Sparkles, UserCheck } from 'lucide-react';
import { Exhibit, Collection, UserProfile, ViewState } from '../../types';
import ExhibitCard from '../ExhibitCard';
import CollectionCard from '../CollectionCard';
import RetroLoader from '../RetroLoader';
import { DefaultCategory, calculateArtifactScore } from '../../constants';

interface FeedViewProps {
    theme: 'dark' | 'light';
    feedMode: 'ARTIFACTS' | 'COLLECTIONS';
    setFeedMode: (v: 'ARTIFACTS' | 'COLLECTIONS') => void;
    selectedCategory: string;
    setSelectedCategory: (v: string) => void;
    exhibits: Exhibit[];
    collections: Collection[];
    user: UserProfile | null;
    visibleCount: number;
    loadMoreRef: React.RefObject<HTMLDivElement>;
    onExhibitClick: (item: Exhibit) => void;
    onLike: (id: string, e?: React.MouseEvent) => void;
    onFavorite: (id: string, e?: React.MouseEvent) => void;
    onAuthorClick: (author: string) => void;
    onCollectionClick: (col: Collection) => void;
    onShareCollection: (col: Collection) => void;
    setView: (v: ViewState) => void;
    updateHash: (path: string) => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

const FeedView: React.FC<FeedViewProps> = ({ 
    theme, feedMode, setFeedMode, selectedCategory, setSelectedCategory, exhibits, collections, user, visibleCount, loadMoreRef, 
    onExhibitClick, onLike, onFavorite, onAuthorClick, onCollectionClick, onShareCollection, setView, updateHash 
}) => {

    const { followedItems, recommendedItems } = useMemo(() => {
        let allItems = exhibits.filter(ex => !ex.isDraft && (selectedCategory === 'ВСЕ' || ex.category === selectedCategory));
        
        if (!user) return { followedItems: [], recommendedItems: shuffleArray(allItems) };

        const followed = allItems.filter(item => user.following.includes(item.owner));
        const others = allItems.filter(item => !user.following.includes(item.owner) && item.owner !== user.username);
        
        return {
            followedItems: followed.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), // Newest first
            recommendedItems: shuffleArray(others) // Random freshness
        };
    }, [exhibits, selectedCategory, user]);

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in">
            <div className="flex items-center justify-center gap-4 mb-8">
                <button 
                    onClick={() => { setFeedMode('ARTIFACTS'); if(window.location.hash !== '#/feed') { setView('FEED'); updateHash('/feed'); }}}
                    className={`px-4 py-2 font-pixel text-xs md:text-sm rounded-full transition-all ${
                        feedMode === 'ARTIFACTS' 
                        ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') 
                        : 'opacity-50 hover:opacity-100'
                    }`}
                >
                    АРТЕФАКТЫ
                </button>
                <button 
                    onClick={() => setFeedMode('COLLECTIONS')}
                    className={`px-4 py-2 font-pixel text-xs md:text-sm rounded-full transition-all ${
                        feedMode === 'COLLECTIONS' 
                        ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white') 
                        : 'opacity-50 hover:opacity-100'
                    }`}
                >
                    КОЛЛЕКЦИИ
                </button>
            </div>

            {feedMode === 'ARTIFACTS' && (
                <>
                <div className="flex overflow-x-auto gap-2 pb-4 mb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:justify-center">
                    <button 
                        onClick={() => { setSelectedCategory('ВСЕ'); updateHash('/feed'); }}
                        className={`px-3 py-1 rounded text-xs font-pixel whitespace-nowrap border flex-shrink-0 ${
                            selectedCategory === 'ВСЕ'
                            ? (theme === 'dark' ? 'bg-dark-surface border-dark-primary text-dark-primary' : 'bg-white border-light-accent text-light-accent')
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                    >
                        [ ВСЕ ]
                    </button>
                    {Object.values(DefaultCategory).map((cat: string) => (
                        <button
                            key={cat}
                            onClick={() => { setSelectedCategory(cat); updateHash('/feed'); }}
                            className={`px-3 py-1 rounded text-xs font-pixel whitespace-nowrap border flex-shrink-0 ${
                                selectedCategory === cat
                                ? (theme === 'dark' ? 'bg-dark-surface border-dark-primary text-dark-primary' : 'bg-white border-light-accent text-light-accent')
                                : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {followedItems.length === 0 && recommendedItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <Box size={48} className="mb-4 opacity-50" />
                        <p className="font-mono text-sm mb-6">Эта полка пока что пустует...</p>
                        <button 
                            onClick={() => { setSelectedCategory('ВСЕ'); updateHash('/feed'); }}
                            className={`px-6 py-3 rounded font-pixel text-[10px] md:text-xs font-bold border transition-all hover:scale-105 ${
                                theme === 'dark' 
                                ? 'border-dark-primary text-dark-primary hover:bg-dark-primary hover:text-black' 
                                : 'border-light-accent text-light-accent hover:bg-light-accent hover:text-white'
                            }`}
                        >
                            ВЕРНУТЬСЯ В ОБЩУЮ ЛЕНТУ
                        </button>
                    </div>
                )}

                {/* Followed Items Section */}
                {followedItems.length > 0 && (
                    <div className="mb-10">
                        <h3 className="font-pixel text-xs opacity-70 mb-4 flex items-center gap-2">
                            <UserCheck size={14} /> ПОДПИСКИ
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {followedItems.slice(0, visibleCount).map((item: Exhibit) => (
                                <ExhibitCard 
                                    key={item.id} 
                                    item={item} 
                                    theme={theme}
                                    similarExhibits={[]}
                                    onClick={onExhibitClick}
                                    isLiked={item.likedBy?.includes(user?.username || '') || false}
                                    isFavorited={false}
                                    onLike={(e) => onLike(item.id, e)}
                                    onFavorite={(e) => onFavorite(item.id, e)}
                                    onAuthorClick={onAuthorClick}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations Divider */}
                {recommendedItems.length > 0 && followedItems.length > 0 && (
                    <div className="relative flex items-center justify-center mb-10 opacity-70">
                        <div className={`absolute w-full border-t border-dashed ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}></div>
                        <div className={`relative px-4 font-pixel text-[10px] uppercase tracking-widest flex items-center gap-2 ${theme === 'dark' ? 'bg-black text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                            <Sparkles size={12} /> ВАМ МОЖЕТ БЫТЬ ИНТЕРЕСНО
                        </div>
                    </div>
                )}

                {/* Recommended / All Items */}
                {recommendedItems.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {recommendedItems.slice(0, visibleCount).map((item: Exhibit) => (
                            <ExhibitCard 
                                key={item.id} 
                                item={item} 
                                theme={theme}
                                similarExhibits={[]}
                                onClick={onExhibitClick}
                                isLiked={item.likedBy?.includes(user?.username || '') || false}
                                isFavorited={false}
                                onLike={(e) => onLike(item.id, e)}
                                onFavorite={(e) => onFavorite(item.id, e)}
                                onAuthorClick={onAuthorClick}
                            />
                        ))}
                    </div>
                )}
                
                <div ref={loadMoreRef} className="h-20 w-full flex items-center justify-center mt-8">
                        {(followedItems.length + recommendedItems.length) > visibleCount && <RetroLoader />}
                </div>
                </>
            )}

            {feedMode === 'COLLECTIONS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map(c => <CollectionCard key={c.id} col={c} theme={theme} onClick={onCollectionClick} onShare={onShareCollection} />)}
                </div>
            )}
        </div>
    );
};

export default FeedView;