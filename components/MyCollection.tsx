import React, { useState } from 'react';
import { ArrowLeft, Box, Filter } from 'lucide-react';
import { Exhibit, UserProfile } from '../types';
import ExhibitCard from './ExhibitCard';
import { DefaultCategory } from '../constants';

interface MyCollectionProps {
    theme: 'dark' | 'light';
    user: UserProfile;
    exhibits: Exhibit[];
    onBack: () => void;
    onExhibitClick: (item: Exhibit) => void;
}

const MyCollection: React.FC<MyCollectionProps> = ({ theme, user, exhibits, onBack, onExhibitClick }) => {
    const [activeCategory, setActiveCategory] = useState<string>('ALL');

    // Get categories that actually have items
    const userCategories = [...new Set(exhibits.map(e => e.category))];
    
    const filteredExhibits = activeCategory === 'ALL' 
        ? exhibits 
        : exhibits.filter(e => e.category === activeCategory);

    return (
        <div className="min-h-screen animate-in fade-in pb-20">
            {/* Header */}
            <div className={`sticky top-14 z-30 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between ${
                theme === 'dark' ? 'bg-black/80 border-dark-dim' : 'bg-white/80 border-light-dim'
            }`}>
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="hover:opacity-70">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-pixel text-sm md:text-lg font-bold">МОЯ ПОЛКА</h1>
                        <p className="font-mono text-[9px] opacity-60">{exhibits.length} ПРЕДМЕТОВ</p>
                    </div>
                </div>
                <div className="p-2 border rounded-full opacity-50">
                    <Box size={20} />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
                
                {/* Sidebar / Top Navigation for Categories */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="flex overflow-x-auto md:flex-col gap-2 pb-2 md:pb-0 scrollbar-hide sticky top-32">
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
                            if (count === 0) return null; // Hide empty categories

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

                {/* Shelf Grid */}
                <div className="flex-1">
                    {filteredExhibits.length === 0 ? (
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
                                            isLiked={false}
                                            isFavorited={false}
                                            onLike={(e) => { e.stopPropagation(); }}
                                            onFavorite={(e) => { e.stopPropagation(); }}
                                            onAuthorClick={() => {}}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyCollection;