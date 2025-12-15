import React from 'react';
import { Trophy, ArrowLeft, Lock } from 'lucide-react';
import { BADGES } from '../constants';

interface HallOfFameProps {
  theme: 'dark' | 'light';
  achievedIds: string[];
  onBack: () => void;
}

const HallOfFame: React.FC<HallOfFameProps> = ({ theme, achievedIds, onBack }) => {
  const allBadges = Object.entries(BADGES);
  const total = allBadges.length;
  const unlocked = achievedIds.length;
  const progress = Math.round((unlocked / total) * 100);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in pb-20">
        <button onClick={onBack} className="flex items-center gap-2 mb-8 hover:underline opacity-70 font-pixel text-xs">
             <ArrowLeft size={16} /> НАЗАД
        </button>

        <div className="text-center mb-10">
            <h1 className="text-2xl md:text-5xl font-pixel font-bold mb-4 flex items-center justify-center gap-2 md:gap-4">
                <Trophy size={32} className="text-yellow-500 md:w-12 md:h-12" /> ЗАЛ СЛАВЫ
            </h1>
            <p className="font-mono text-xs md:text-base opacity-70">Глобальный реестр достижений сети NeoArchive.</p>
        </div>

        {/* Global Progress Bar */}
        <div className="mb-12">
            <div className="flex justify-between font-pixel text-xs mb-2">
                <span>ПРОГРЕСС СИНХРОНИЗАЦИИ</span>
                <span>{progress}%</span>
            </div>
            <div className={`w-full h-4 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                <div 
                    className="h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-200 transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {allBadges.map(([id, badge]) => {
                const isUnlocked = achievedIds.includes(id);
                // Dynamically import Icon (mocked here by checking types in App, but simple fallback)
                
                return (
                    <div 
                        key={id}
                        className={`relative p-4 md:p-6 rounded-xl border-2 flex flex-col items-center text-center transition-all ${
                            isUnlocked 
                             ? (theme === 'dark' ? 'bg-dark-surface border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-white border-orange-400 shadow-lg')
                             : (theme === 'dark' ? 'bg-black/40 border-gray-800 opacity-50 grayscale' : 'bg-gray-100 border-gray-300 opacity-60 grayscale')
                        }`}
                    >
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-4 ${isUnlocked ? badge.color : 'bg-gray-600'} text-white shadow-inner`}>
                             {isUnlocked ? <Trophy size={20} className="md:w-6 md:h-6" /> : <Lock size={20} className="md:w-6 md:h-6" />}
                        </div>
                        <h3 className="font-pixel text-[10px] md:text-sm font-bold mb-1">{badge.label}</h3>
                        <p className="font-mono text-[9px] md:text-[10px] opacity-70">{badge.desc}</p>
                        
                        {!isUnlocked && (
                            <div className="absolute top-2 right-2 text-[8px] font-pixel bg-black text-white px-2 py-1 rounded">LOCKED</div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default HallOfFame;