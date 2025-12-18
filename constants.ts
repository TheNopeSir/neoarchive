
import { Exhibit, TierType } from './types';
import { Zap, Flame, Award, User, Circle, Moon, MinusCircle, EyeOff, MessageCircle, Ghost, Terminal, Upload, Star, MessageSquare, Layers } from 'lucide-react';

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
    if (item.title === 'вфуфвф' && (item.owner === 'Truester' || item.owner === '@Truester')) return 'CURSED';
    const score = (item.likes * 25) + ((item.comments?.length || 0) * 10) + item.views;
    if (score >= 10000) return 'LEGENDARY';
    if (score >= 2000) return 'EPIC';
    if (score >= 500) return 'RARE';
    return 'COMMON';
};

export const TIER_CONFIG: Record<TierType, any> = {
    COMMON: { name: 'COMMON', color: 'text-gray-500', bgColor: 'bg-gray-500/20', borderDark: 'border-dark-dim', badge: 'bg-gray-500 text-white', icon: User },
    RARE: { name: 'RARE', color: 'text-cyan-500', bgColor: 'bg-cyan-500/20', borderDark: 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]', badge: 'bg-cyan-600 text-white', icon: Award },
    EPIC: { name: 'EPIC', color: 'text-purple-500', bgColor: 'bg-purple-500/20', borderDark: 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]', badge: 'bg-purple-600 text-white', icon: Flame },
    LEGENDARY: { name: 'LEGENDARY', color: 'text-yellow-500', bgColor: 'bg-yellow-500/20', borderDark: 'border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.5)]', badge: 'bg-gradient-to-r from-yellow-600 to-red-600 text-white', icon: Zap },
    CURSED: { name: 'CURSED', color: 'text-red-500', bgColor: 'bg-red-500/20', borderDark: 'border-red-600 shadow-[0_0_30px_rgba(239,68,68,0.7)] animate-pulse-slow', badge: 'bg-red-600 text-white font-black italic', icon: Ghost }
};

export const calculateArtifactScore = (item: Exhibit, userPreferences?: Record<string, number>): number => {
    const likeScore = item.likes * 10;
    const viewScore = item.views * 0.5;
    const prefBoost = userPreferences && userPreferences[item.category] ? userPreferences[item.category] * 100 : 0;
    return likeScore + viewScore + prefBoost;
};
