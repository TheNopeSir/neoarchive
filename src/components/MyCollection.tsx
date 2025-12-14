import React, { useState } from 'react';
import { ArrowLeft, Box, FolderOpen, Share2 } from 'lucide-react';
import { Exhibit, UserProfile, Collection } from '../types';
import ExhibitCard from './ExhibitCard';
import { DefaultCategory } from '../constants';

interface MyCollectionProps {
    theme: 'dark' | 'light';
    user: UserProfile;
    exhibits: Exhibit[];
    collections?: Collection[];
    onBack: () => void;
    onExhibitClick: (item: Exhibit) => void;
    onCollectionClick?: (col: Collection) => void;
    onLike: (id: string, e?: React.MouseEvent) => void;
}

const MyCollection: React.FC<MyCollectionProps> = ({ theme, user, exhibits, collections = [], onBack, onExhibitClick, onCollectionClick, onLike }) => {
    const [activeTab, setActiveTab] = useState<'ITEMS' | 'COLLECTIONS'>('ITEMS');
    const [activeCategory, setActiveCategory] = useState<string>('ALL');

    const filteredExhibits = activeCategory === 'ALL' 
        ? exhibits 
        : exhibits.filter(e => e.category === activeCategory);

    const handleShareShelf = () => {
        const url = `${window.location.origin}/#/profile/${user.username}`;
        if (navigator.share) {
            navigator.share({
                title: `NeoArchive: Полка @${user.username}`,
                url: url
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(url).then(() => alert('Ссылка на полку скопирована!'));
        }
    };

    const handleShareCollection = (col: Collection, e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/#/collection/${col.slug || col.id}`;
        if (navigator.share) {
            navigator.share({
                title: `NeoArchive: ${col.title}`,
                text: col.description,
                url: url
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(url).then(() => alert('Ссылка на коллекцию скопирована!'));
        }
    };

    return (
        <div className="min-h-screen animate-in fade-in pb-24">
            {/* Header */}
            <div className={`sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between shadow-lg ${
                theme === 'dark' ? 'bg-dark-bg border-dark-dim' : 'bg-light-bg border-light-dim'
            }`}>
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="hover:opacity-70">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-pixel text-sm md:text-lg font-bold">МОЯ ПОЛКА</h1>
                        <p className="font-mono text-[9px] opacity-60">
                            {activeTab === 'ITEMS' ? `${exhibits.length} ПРЕДМЕТОВ` : `${collections.length} КОЛЛЕКЦИЙ`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleShareShelf}
                        className={`p-2 rounded border opacity-70 hover:opacity-100 ${theme === 'dark' ? 'border-dark-dim bg-dark-surface' : 'border-light-dim bg-white'}`}
                        title="Поделиться полкой"
                    >
                        <Share2 size={16} />
                    </button>
                    <div className="w-px bg-gray-500/30 mx-1"></div>
                    <button 
                        onClick={() => setActiveTab('ITEMS')}
                        className={`p-2 rounded border ${activeTab === 'ITEMS' ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'opacity-50'}`}
                    >
                        <Box size={16} />
                    </button>
                    <button 
                        onClick={() => setActiveTab('COLLECTIONS')}
                        className={`p-2 rounded border ${activeTab === 'COLLECTIONS' ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'opacity-50'}`}
                    >
                        <FolderOpen size={16} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
                
                {/* Categories */}
                {activeTab === 'ITEMS' && (
                    <div className="w-full md:w-64 flex-shrink-0">
                        <div className="flex overflow-x-auto md:flex-col gap-2 pb-2 md:pb-0 scrollbar-hide sticky top-20">
                            <button
                                onClick={() => setActiveCategory('ALL')}
                                className={`px-4 py-2 rounded font-pixel text-[10px] text-left border transition-all whitespace-nowrap ${
                                    activeCategory === 'ALL'
                                    ? (theme === 'dark' ? 'bg-dark-primary text-black border-dark-primary' : 'bg-light-accent text-white border-light-accent')
                                    : 'border-transparent opacity-60 hover:opacity-100 hover:bg-gray-500/10'
                                }`}
                            >
                                [ ВСЕ ПРЕДМЕТЫ ]
                            </button>
                            
                            {Object.values(DefaultCategory).map(cat => {
                                const count = exhibits.filter(e => e.category === cat).length;
                                if (count === 0) return null;

                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-4 py-2 rounded font-pixel text-[10px] text-left border transition-all whitespace-nowrap flex justify-between items-center ${
                                            activeCategory === cat
                                            ? (theme === 'dark' ? 'bg-dark-surface border-dark-primary text-dark-primary' : 'bg-white border-light-accent text-light-accent')
                                            : 'border-transparent opacity-60 hover:opacity-100 hover:bg-gray-500/10'
                                        }`}
                                    >
                                        <span>{cat}</span>
                                        <span className="font-mono opacity-50 ml-2">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1">
                    {activeTab === 'ITEMS' ? (
                        filteredExhibits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                <Box size={48} className="mb-4" />
                                <p className="font-mono text-xs">ПОЛКА ПУСТА</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                {filteredExhibits.map((item) => (
                                    <div key={item.id} className="relative group">
                                        {/* Shelf Underline visual */}
                                        <div className={`absolute bottom-0 left-[-10px] right-[-10px] h-3 z-0 rounded-sm transform translate-y-1/2 ${
                                            theme === 'dark' 
                                            ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-black shadow-lg' 
                                            : 'bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 shadow-lg'
                                        }`}></div>
                                        
                                        <div className="relative z-10 transform transition-transform duration-300 group-hover:-translate-y-2">
                                            <ExhibitCard 
                                                item={item}
                                                similarExhibits={[]}
                                                theme={theme}
                                                onClick={onExhibitClick}
                                                isLiked={item.likedBy?.includes(user.username) || false} 
                                                isFavorited={false}
                                                onLike={(e) => onLike(item.id, e)}
                                                onFavorite={(e) => { e.stopPropagation(); }}
                                                onAuthorClick={() => {}}
                                            />
                                            {item.isDraft && (
                                                <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[9px] font-bold px-2 py-1 rounded z-20">
                                                    DRAFT
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        /* COLLECTIONS TAB */
                        collections.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                <FolderOpen size={48} className="mb-4" />
                                <p className="font-mono text-xs">НЕТ СОЗДАННЫХ КОЛЛЕКЦИЙ</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {collections.map(col => (
                                    <div 
                                        key={col.id}
                                        onClick={() => onCollectionClick && onCollectionClick(col)}
                                        className={`group relative aspect-[2/1] rounded-xl overflow-hidden cursor-pointer border-2 transition-transform hover:-translate-y-1 ${
                                            theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'
                                        }`}
                                    >
                                        <img src={col.coverImage} alt={col.title} className="w-full h-full object-cover"/>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4">
                                            <h3 className="text-white font-pixel text-lg font-bold leading-tight mb-1">{col.title}</h3>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-mono text-white/60">{col.exhibitIds.length} ITEMS</span>
                                                <button
                                                    onClick={(e) => handleShareCollection(col, e)}
                                                    className="bg-white/20 p-2 rounded hover:bg-white/40 text-white transition-colors"
                                                    title="Поделиться коллекцией"
                                                >
                                                    <Share2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyCollection;