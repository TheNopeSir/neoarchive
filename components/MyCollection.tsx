
import React from 'react';
import { Package, FolderPlus, ArrowLeft, Plus, Archive } from 'lucide-react';
import { UserProfile, Exhibit, Collection } from '../types';
import ExhibitCard from './ExhibitCard';
import CollectionCard from './CollectionCard';

interface MyCollectionProps {
    theme: 'dark' | 'light';
    user: UserProfile;
    exhibits: Exhibit[];
    collections: Collection[];
    onBack: () => void;
    onExhibitClick: (item: Exhibit) => void;
    onCollectionClick: (col: Collection) => void;
    onLike: (id: string, e?: React.MouseEvent) => void;
}

const MyCollection: React.FC<MyCollectionProps> = ({ 
    theme, 
    user, 
    exhibits, 
    collections, 
    onBack, 
    onExhibitClick, 
    onCollectionClick, 
    onLike 
}) => {
    // Separate drafts and published items
    const drafts = exhibits.filter(e => e.isDraft);
    const published = exhibits.filter(e => !e.isDraft);

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in pb-32">
            <div className="flex items-center justify-between mb-8">
                <button onClick={onBack} className="flex items-center gap-2 hover:underline opacity-70 font-pixel text-xs">
                    <ArrowLeft size={16} /> НАЗАД
                </button>
                <div className="font-pixel text-lg flex items-center gap-2">
                    <Package size={24} />
                    МОЯ ПОЛКА
                </div>
            </div>

            {/* DRAFTS SECTION */}
            {drafts.length > 0 && (
                <div className="mb-10 border-b border-dashed border-gray-500/30 pb-8">
                    <h3 className="font-pixel text-xs mb-4 opacity-70 flex items-center gap-2 uppercase tracking-widest">
                        <Archive size={14}/> Черновики ({drafts.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {drafts.map(item => (
                            <div key={item.id} className="relative group opacity-80 hover:opacity-100">
                                <div className="absolute top-2 right-2 z-10 bg-yellow-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded font-pixel">DRAFT</div>
                                <ExhibitCard 
                                    item={item} 
                                    theme={theme}
                                    similarExhibits={[]}
                                    onClick={onExhibitClick}
                                    isLiked={false}
                                    isFavorited={false}
                                    onLike={(e) => onLike(item.id, e)}
                                    onFavorite={() => {}}
                                    onAuthorClick={() => {}}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ARTIFACTS SECTION - PRIORITY */}
            <div className="mb-12">
                <h3 className="font-pixel text-xs mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <Package size={16} /> Ваши артефакты ({published.length})
                </h3>
                {published.length === 0 ? (
                    <div className={`p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center opacity-50 ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                        <p className="font-mono text-sm uppercase">Ваша полка пуста</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {published.map(item => (
                            <ExhibitCard 
                                key={item.id} 
                                item={item} 
                                theme={theme}
                                similarExhibits={[]}
                                onClick={onExhibitClick}
                                isLiked={item.likedBy?.includes(user.username) || false}
                                isFavorited={false}
                                onLike={(e) => onLike(item.id, e)}
                                onFavorite={() => {}}
                                onAuthorClick={() => {}}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* COLLECTIONS SECTION */}
            <div>
                <h3 className="font-pixel text-xs mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <FolderPlus size={16} /> Коллекции ({collections.length})
                </h3>
                {collections.length === 0 ? (
                    <div className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center opacity-50 ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                        <p className="font-mono text-xs uppercase">Нет созданных коллекций</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {collections.map(c => (
                            <CollectionCard 
                                key={c.id} 
                                col={c} 
                                theme={theme} 
                                onClick={onCollectionClick} 
                                onShare={() => {}} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyCollection;
