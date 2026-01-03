
import React, { useState } from 'react';
import { X, RefreshCw, ArrowRightLeft, Lock, Check } from 'lucide-react';
import { Exhibit, UserProfile } from '../types';
import { sendTradeRequest } from '../services/storageService';

interface TradeOfferModalProps {
    targetItem: Exhibit;
    currentUser: UserProfile;
    userInventory: Exhibit[];
    onClose: () => void;
}

const TradeOfferModal: React.FC<TradeOfferModalProps> = ({ targetItem, currentUser, userInventory, onClose }) => {
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleItem = (id: string) => {
        setSelectedItems(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSendOffer = async () => {
        if (selectedItems.length === 0) return alert("Выберите хотя бы один предмет для обмена!");
        
        setIsSubmitting(true);
        try {
            await sendTradeRequest({
                recipient: targetItem.owner,
                offeredItemIds: selectedItems,
                targetItemId: targetItem.id
            });
            alert("Предложение отправлено!");
            onClose();
        } catch (e) {
            alert("Ошибка отправки");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-6 animate-in zoom-in-95 duration-200">
            <div className="w-full max-w-5xl h-[80vh] bg-[#1e1e1e] border-4 border-[#3c3c3c] rounded-lg flex flex-col shadow-2xl overflow-hidden font-sans text-[#b0b0b0]">
                
                {/* Header */}
                <div className="bg-[#2d2d2d] p-3 flex justify-between items-center border-b border-black">
                    <div className="flex items-center gap-2">
                        <RefreshCw size={20} className="text-[#999]" />
                        <span className="font-bold text-[#ebebeb] uppercase tracking-wide">Торговый Терминал</span>
                    </div>
                    <button onClick={onClose} className="hover:text-white"><X size={24} /></button>
                </div>

                {/* Main Content - Split View */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#161616]">
                    
                    {/* Left: My Offer */}
                    <div className="flex-1 flex flex-col border-r border-[#3c3c3c] min-h-0">
                        <div className="bg-[#262626] p-2 text-center border-b border-[#3c3c3c]">
                            <h3 className="text-[#5e98d9] font-bold text-sm uppercase">ВАШЕ ПРЕДЛОЖЕНИЕ</h3>
                            <p className="text-[10px] opacity-60">Выберите предметы из инвентаря</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start custom-scrollbar">
                            {userInventory.filter(i => !i.isDraft).map(item => (
                                <div 
                                    key={item.id}
                                    onClick={() => toggleItem(item.id)}
                                    className={`relative aspect-square bg-[#1e1e1e] border-2 cursor-pointer group transition-all ${selectedItems.includes(item.id) ? 'border-[#5e98d9]' : 'border-[#3c3c3c] hover:border-[#505050]'}`}
                                >
                                    <img src={item.imageUrls[0]} className="w-full h-full object-cover p-1" />
                                    {selectedItems.includes(item.id) && (
                                        <div className="absolute top-1 right-1 bg-[#5e98d9] text-black rounded-full p-0.5"><Check size={12} strokeWidth={4}/></div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[9px] p-1 truncate text-center text-[#d1d1d1]">
                                        {item.title}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 bg-[#262626] border-t border-[#3c3c3c] text-center text-xs">
                            Выбрано предметов: <span className="text-[#5e98d9] font-bold">{selectedItems.length}</span>
                        </div>
                    </div>

                    {/* Middle Icon (Desktop only) */}
                    <div className="hidden md:flex flex-col justify-center items-center px-2 bg-[#1e1e1e]">
                        <ArrowRightLeft size={24} className="text-[#505050]" />
                    </div>

                    {/* Right: Receiving */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="bg-[#262626] p-2 text-center border-b border-[#3c3c3c]">
                            <h3 className="text-[#86b45d] font-bold text-sm uppercase">ВЫ ПОЛУЧАЕТЕ</h3>
                            <p className="text-[10px] opacity-60">Предмет от @{targetItem.owner}</p>
                        </div>
                        <div className="flex-1 p-8 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                            <div className="w-48 aspect-square border-4 border-[#86b45d] bg-[#1e1e1e] relative shadow-[0_0_30px_rgba(134,180,93,0.2)]">
                                <img src={targetItem.imageUrls[0]} className="w-full h-full object-cover p-2" />
                                <div className="absolute bottom-0 left-0 right-0 bg-[#86b45d] text-black font-bold text-xs p-2 text-center uppercase truncate">
                                    {targetItem.title}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-[#1e1e1e] border-t border-[#3c3c3c] text-center text-[10px] text-[#707070]">
                            Внимание: После подтверждения обмена права владения будут переданы автоматически.
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-[#2d2d2d] p-4 flex justify-end gap-4 border-t border-black">
                    <button onClick={onClose} className="px-6 py-3 bg-[#3c3c3c] hover:bg-[#4a4a4a] text-[#ebebeb] font-bold rounded uppercase text-sm">
                        Отмена
                    </button>
                    <button 
                        onClick={handleSendOffer}
                        disabled={isSubmitting || selectedItems.length === 0}
                        className={`px-8 py-3 font-bold rounded uppercase text-sm flex items-center gap-2 ${selectedItems.length > 0 ? 'bg-[#5e98d9] text-black hover:bg-[#7ab0ee]' : 'bg-[#3c3c3c] text-[#707070] cursor-not-allowed'}`}
                    >
                        {isSubmitting ? 'Отправка...' : 'Отправить предложение'}
                        {!isSubmitting && <Lock size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TradeOfferModal;
