
import { Exhibit, TierType, TradeStatus, WishlistPriority } from './types';
import { Zap, Flame, Award, User, Circle, Moon, MinusCircle, EyeOff, MessageCircle, Ghost, Terminal, Upload, Star, MessageSquare, Layers, Search, RefreshCw, DollarSign, Gift, Lock, Crown } from 'lucide-react';

export const DefaultCategory = {
  PHONES: 'ТЕЛЕФОНЫ',
  GAMES: 'ИГРЫ',
  MAGAZINES: 'ЖУРНАЛЫ',
  MUSIC: 'МУЗЫКА',
  VIDEO: 'ВИДЕО',
  TOYS: 'ИГРУШКИ',
  COMPUTERS: 'КОМПЬЮТЕРЫ',
  CAMERAS: 'КАМЕРЫ',
  MISC: 'ПРОЧЕЕ'
} as const;

export const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
    [DefaultCategory.PHONES]: ['Смартфоны', 'Кнопочные телефоны', 'Раскладушки', 'Слайдеры', 'КПК', 'Стационарные', 'Пейджеры'],
    [DefaultCategory.GAMES]: ['Картриджи (8-bit/16-bit)', 'Диски (CD/DVD/BD)', 'Портативные консоли', 'Стационарные консоли', 'Аксессуары', 'Аркадные автоматы'],
    [DefaultCategory.MAGAZINES]: ['Игровые', 'Компьютерные', 'Технические', 'Музыкальные', 'Комиксы', 'Каталоги', 'Постеры'],
    [DefaultCategory.MUSIC]: ['Аудиокассеты', 'Винил (LP/EP)', 'CD', 'MiniDisc', 'Плееры (Портатив)', 'Hi-Fi Компоненты', 'Катушки'],
    [DefaultCategory.VIDEO]: ['VHS', 'DVD', 'Blu-ray', 'Видеоплееры', 'Проекторы', 'Video CD'],
    [DefaultCategory.TOYS]: ['Action Figures', 'Конструкторы', 'Мягкие игрушки', 'Роботы', 'Настольные игры', 'Тамагочи/Электроника', 'Моделизм'],
    [DefaultCategory.COMPUTERS]: ['Ретро ПК', 'Ноутбуки', 'Комплектующие', 'Периферия', 'Носители (Floppy/ZIP)'],
    [DefaultCategory.CAMERAS]: ['Пленочные', 'Цифровые (Early Digital)', 'Polaroid/Instax', 'Видеокамеры', 'Объективы'],
    [DefaultCategory.MISC]: ['Часы', 'Калькуляторы', 'Мерч', 'Упаковка', 'Реклама', 'Другое']
};

export const CATEGORY_SPECS_TEMPLATES: Record<string, string[]> = {
  [DefaultCategory.PHONES]: ['Бренд', 'Модель', 'Год выпуска', 'Стандарт связи', 'Тип корпуса'],
  [DefaultCategory.GAMES]: ['Платформа', 'Название', 'Регион', 'Год', 'Комплектация'],
  [DefaultCategory.MAGAZINES]: ['Название', 'Номер', 'Год', 'Издательство', 'Язык'],
  [DefaultCategory.MUSIC]: ['Исполнитель', 'Альбом', 'Год', 'Носитель', 'Состояние'],
  [DefaultCategory.VIDEO]: ['Название', 'Год', 'Носитель', 'Режиссер', 'Издатель'],
  [DefaultCategory.TOYS]: ['Название', 'Серия', 'Бренд', 'Год', 'Материал'],
  [DefaultCategory.COMPUTERS]: ['Бренд', 'Модель', 'Процессор', 'ОЗУ', 'Год'],
  [DefaultCategory.CAMERAS]: ['Бренд', 'Модель', 'Тип', 'Матрица/Пленка', 'Год'],
  [DefaultCategory.MISC]: ['Название', 'Производитель', 'Год', 'Описание']
};

export const TRADE_STATUS_CONFIG: Record<TradeStatus, any> = {
    'NONE': { label: '', color: '', icon: null },
    'FOR_TRADE': { label: 'ОБМЕН', color: 'text-blue-400 border-blue-400 bg-blue-400/10', icon: RefreshCw, badge: 'TRADE' },
    'FOR_SALE': { label: 'ПРОДАЖА', color: 'text-green-400 border-green-400 bg-green-400/10', icon: DollarSign, badge: 'SALE' },
    'GIFT': { label: 'ДАРЮ', color: 'text-pink-400 border-pink-400 bg-pink-400/10', icon: Gift, badge: 'FREE' },
    'NOT_FOR_SALE': { label: 'НЕ ПРОДАЕТСЯ', color: 'text-red-400 border-red-400 bg-red-400/10', icon: Lock, badge: 'KEEPER' },
};

export const WISHLIST_PRIORITY_CONFIG: Record<WishlistPriority, any> = {
    'LOW': { label: 'Интересно', color: 'text-gray-400 border-gray-500', icon: Circle },
    'MEDIUM': { label: 'Нужно', color: 'text-blue-400 border-blue-500', icon: Star },
    'HIGH': { label: 'Очень нужно', color: 'text-orange-400 border-orange-500', icon: Flame },
    'GRAIL': { label: 'GRAIL (Святой Грааль)', color: 'text-yellow-400 border-yellow-500 bg-yellow-500/10 animate-pulse', icon: Crown, glow: true },
};

export const BADGE_CONFIG = {
    'HELLO_WORLD': { label: 'HELLO WORLD', desc: 'Первый вход в систему', color: 'bg-green-500', icon: Terminal, target: 1 },
    'UPLOADER': { label: 'DATA_MINER', desc: 'Загружено артефактов', color: 'bg-blue-500', icon: Upload, target: 5 },
    'INFLUENCER': { label: 'NET_CELEB', desc: 'Лайков получено', color: 'bg-purple-500', icon: Star, target: 50 },
    'CRITIC': { label: 'OBSERVER', desc: 'Оставлено комментариев', color: 'bg-yellow-500', icon: MessageSquare, target: 10 },
    'LEGEND': { label: 'THE_ONE', desc: 'Владелец Легендарного артефакта', color: 'bg-red-500', icon: Zap, target: 1 },
    'COLLECTOR': { label: 'ARCHIVIST', desc: 'Создано коллекций', color: 'bg-orange-500', icon: Layers, target: 3 }
};

export const BADGES = BADGE_CONFIG;

export const STATUS_OPTIONS = {
    'ONLINE': { label: 'В сети', color: 'text-green-500', icon: Circle },
    'AWAY': { label: 'Отошел', color: 'text-yellow-500', icon: Moon },
    'DND': { label: 'Не беспокоить', color: 'text-red-500', icon: MinusCircle },
    'INVISIBLE': { label: 'Невидимка', color: 'text-gray-400', icon: EyeOff },
    'FREE_FOR_CHAT': { label: 'Готов болтать', color: 'text-blue-500', icon: MessageCircle },
};

export const CATEGORY_CONDITIONS: Record<string, string[]> = {
  [DefaultCategory.PHONES]: ['НОВЫЙ (SEALED)', 'LIKE NEW', 'EXC', 'GOOD', 'FAIR', 'PARTS'],
  [DefaultCategory.GAMES]: ['SEALED', 'CIB', 'BOXED', 'LOOSE', 'D.O.A.'],
  [DefaultCategory.MUSIC]: ['MINT', 'NM', 'VG+', 'VG', 'G', 'POOR'],
  [DefaultCategory.MISC]: ['ИДЕАЛ', 'ХОРОШЕЕ', 'ПОТЕРТОЕ', 'СЛОМАНО']
};

export const getArtifactTier = (item: Exhibit): TierType => {
    if (item.title.toUpperCase().includes('CURSED') || (item.title === 'вфуфвф' && (item.owner === 'Truester' || item.owner === '@Truester'))) return 'CURSED';
    
    const score = (item.likes * 25) + ((item.comments?.length || 0) * 10) + item.views;
    if (score >= 10000) return 'LEGENDARY';
    if (score >= 2000) return 'EPIC';
    if (score >= 500) return 'RARE';
    return 'COMMON';
};

export const TIER_CONFIG: Record<TierType, any> = {
    COMMON: { name: 'COMMON', color: 'text-gray-500', bgColor: 'bg-gray-500/20', borderDark: 'border-dark-dim', badge: 'bg-gray-500 text-white', icon: User, shadow: '' },
    RARE: { name: 'RARE', color: 'text-cyan-500', bgColor: 'bg-cyan-500/20', borderDark: 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]', badge: 'bg-cyan-600 text-white', icon: Award, shadow: 'shadow-[0_0_10px_rgba(6,182,212,0.2)]' },
    EPIC: { name: 'EPIC', color: 'text-purple-500', bgColor: 'bg-purple-500/20', borderDark: 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]', badge: 'bg-purple-600 text-white', icon: Flame, shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]' },
    LEGENDARY: { name: 'LEGENDARY', color: 'text-yellow-500', bgColor: 'bg-yellow-500/20', borderDark: 'border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.5)]', badge: 'bg-gradient-to-r from-yellow-600 to-red-600 text-white', icon: Zap, shadow: 'shadow-[0_0_30px_rgba(234,179,8,0.4)]' },
    CURSED: { name: 'CURSED', color: 'text-red-500', bgColor: 'bg-red-500/20', borderDark: 'border-red-600 shadow-[0_0_30px_rgba(239,68,68,0.7)] animate-pulse-slow', badge: 'bg-red-600 text-white font-black italic', icon: Ghost, shadow: 'shadow-[0_0_30px_rgba(220,38,38,0.6)] animate-pulse' }
};

export const calculateArtifactScore = (item: Exhibit, userPreferences?: Record<string, number>): number => {
    const likeScore = item.likes * 10;
    const viewScore = item.views * 0.5;
    const prefBoost = userPreferences && userPreferences[item.category] ? userPreferences[item.category] * 100 : 0;
    return likeScore + viewScore + prefBoost;
};

// --- SMART SIMILARITY ALGORITHM ---
export const getSimilarArtifacts = (current: Exhibit, all: Exhibit[], limit: number = 4): Exhibit[] => {
    if (!current || !all) return [];
    
    // 1. Tokenize current title (remove junk)
    const stopWords = ['the', 'and', 'for', 'with', 'edition', 'version', 'новый', 'продам', 'купил'];
    const currentTokens = current.title.toLowerCase()
        .replace(/[^\w\sа-яё]/gi, '') // remove special chars
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.includes(w));
    
    return all
        .filter(item => item.id !== current.id && !item.isDraft) // Exclude self and drafts
        .map(item => {
            let score = 0;
            
            // 1. Category Match (Base weight: 10)
            if (item.category === current.category) score += 10;
            
            // 2. Subcategory Match (High weight: 25)
            if (item.subcategory && item.subcategory === current.subcategory) score += 25;
            
            // 3. Smart Title Matching (Weight: 15 per match)
            const itemTokens = item.title.toLowerCase().split(/\s+/);
            let matches = 0;
            currentTokens.forEach(token => {
                if (itemTokens.some(t => t.includes(token) || token.includes(t))) {
                    matches++;
                }
            });
            score += (matches * 15);

            // 4. Linked item bonus (if user manually linked them elsewhere)
            if (current.relatedIds?.includes(item.id)) score += 100;

            // 5. Specs overlap (Advanced)
            if (item.specs && current.specs) {
                const brandA = Object.values(current.specs).find(v => ['sony', 'nintendo', 'sega', 'apple', 'nokia'].includes(v.toLowerCase()));
                const brandB = Object.values(item.specs).find(v => ['sony', 'nintendo', 'sega', 'apple', 'nokia'].includes(v.toLowerCase()));
                if (brandA && brandB && brandA.toLowerCase() === brandB.toLowerCase()) {
                    score += 20; // Same Major Brand
                }
            }

            return { item, score };
        })
        .filter(x => x.score > 5) // Must have at least minimal relevance
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(x => x.item);
};
