
import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle, Circle, Send } from 'lucide-react';
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
    const [message, setMessage] = useState('');
    const [step, setStep] = useState<'SELECT' | 'CONFIRM'>('SELECT');

    const toggleItem = (id: string) => {
        if (selectedItems.includes(id)) {
            setSelectedItems(prev => prev.filter(i => i !== id));
        } else {
            if (selectedItems.length >= 4) return alert("Максимум 4 предмета за раз");
            setSelectedItems(prev => [...prev, id]);
        }
    };

    const handleSend = async () => {
        if (selectedItems.length === 0) return alert("Выберите предметы для обмена");
        
        await sendTradeRequest({
            id: crypto.randomUUID(),
            sender: currentUser.username,
            receiver: targetItem.owner,
            offeredItems: selectedItems,
            requestedItems: [targetItem.id],
            status: 'PENDING',
            timestamp: new Date().toLocaleString(),
            message: message
        });
        
        alert("Предложение отправлено!");
        onClose();
    };

    const validInventory = userInventory.filter(item => !item.isDraft);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
            <div className="bg-[#1a1a1a] border border-[#505050] w-full max-w-4xl h-[80vh] flex flex-col rounded-xl overflow-hidden shadow-2xl">
                
                {/* Header */}
                <div className="p-4 border-b border-[#505050] bg-[#101010] flex justify-between items-center">
                    <div className="flex items-center gap-2 text-green-500 font-pixel">
                        <RefreshCw size={20} /> ТОРГОВЫЙ ТЕРМИНАЛ (TF-PROTO)
                    </div>
                    <button onClick={onClose}><X className="text-white hover:text-red-500" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    
                    {/* Left Column: Your Inventory */}
                    <div className="flex-1 flex flex-col border-r border-[#505050] bg-[#151515]">
                        <div className="p-2 text-xs font-mono bg-[#202020] text-center text-gray-400 uppercase">ВАШ ИНВЕНТАРЬ (ВЫБЕРИТЕ ПРЕДМЕТЫ)</div>
                        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-2 content-start custom-scrollbar">
                            {validInventory.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => toggleItem(item.id)}
                                    className={`aspect-square relative border-2 cursor-pointer transition-all rounded overflow-hidden group ${selectedItems.includes(item.id) ? 'border-green-500 opacity-100' : 'border-[#303030] hover:border-white opacity-60'}`}
                                >
                                    <img src={item.imageUrls[0]} className="w-full h-full object-cover" />
                                    {selectedItems.includes(item.id) && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><CheckCircle className="text-green-500 drop-shadow-md"/></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Trade Summary */}
                    <div className="flex-1 flex flex-col bg-[#101010]">
                        <div className="flex-1 p-6 flex flex-col gap-8">
                            
                            {/* You Give */}
                            <div className="flex-1 border border-[#303030] rounded-xl p-4 bg-[#151515]">
                                <h3 className="text-xs font-pixel text-green-500 mb-2 uppercase">ВЫ ПРЕДЛАГАЕТЕ:</h3>
                                <div className="grid grid-cols-4 gap-2 h-20">
                                    {[0,1,2,3].map(i => {
                                        const itemId = selectedItems[i];
                                        const item = validInventory.find(x => x.id === itemId);
                                        return (
                                            <div key={i} className="aspect-square bg-[#050505] border border-[#303030] rounded flex items-center justify-center overflow-hidden">
                                                {item ? <img src={item.imageUrls[0]} className="w-full h-full object-cover" /> : <div className="text-[#303030] text-[10px]">{i+1}</div>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-center"><RefreshCw className="text-gray-500 animate-spin-slow" /></div>

                            {/* You Get */}
                            <div className="flex-1 border border-[#303030] rounded-xl p-4 bg-[#151515]">
                                <h3 className="text-xs font-pixel text-blue-500 mb-2 uppercase">ВЫ ПОЛУЧАЕТЕ:</h3>
                                <div className="flex gap-4">
                                    <div className="w-20 h-20 border border-blue-500/50 rounded overflow-hidden">
                                        <img src={targetItem.imageUrls[0]} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white mb-1">{targetItem.title}</div>
                                        <div className="text-xs text-gray-500">Владелец: @{targetItem.owner}</div>
                                    </div>
                                </div>
                            </div>

                            <textarea 
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Сообщение для владельца (опционально)..."
                                className="w-full bg-[#050505] border border-[#303030] rounded p-2 text-xs font-mono text-white h-20 resize-none outline-none focus:border-green-500"
                            />
                        </div>

                        <div className="p-4 border-t border-[#303030]">
                            <button 
                                onClick={handleSend}
                                disabled={selectedItems.length === 0}
                                className="w-full py-4 bg-green-600 text-black font-pixel font-bold uppercase hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                ОТПРАВИТЬ ПРЕДЛОЖЕНИЕ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TradeOfferModal;
