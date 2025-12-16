
import { Exhibit, UserProfile, Collection, Notification, Message } from './types';
import { Zap, Flame, Award, User, Circle, Moon, MinusCircle, EyeOff, MessageCircle } from 'lucide-react';
import React from 'react';

// Moved from types.ts to ensure runtime availability
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

// 2. Subcategories
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

// 3. Detailed Specs Mapping
// Base templates for main categories
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

// Override templates for specific subcategories for precision
export const SUBCATEGORY_SPECS: Record<string, Record<string, string[]>> = {
    [DefaultCategory.MUSIC]: {
        'Плееры (Портатив)': ['Бренд', 'Модель', 'Тип (Кассетный/CD/MD)', 'Питание (Батарейки)', 'Особенности (Bass Boost etc)', 'Год выхода'],
        'Hi-Fi Компоненты': ['Бренд', 'Модель', 'Тип устройства', 'Питание (V)', 'Страна производства', 'Год'],
        'Винил (LP/EP)': ['Исполнитель', 'Альбом', 'Лейбл', 'Страна издания', 'Год издания', 'RPM (Обороты)', 'Матрица'],
        'Аудиокассеты': ['Исполнитель', 'Альбом', 'Тип пленки (I/II/IV)', 'Лейбл', 'Год издания'],
        'CD': ['Исполнитель', 'Альбом', 'Лейбл', 'Количество дисков', 'Год издания', 'Страна']
    },
    [DefaultCategory.GAMES]: {
        'Стационарные консоли': ['Бренд', 'Модель', 'Регион (PAL/NTSC)', 'Модификации (Чип/ODE)', 'Комплект', 'Год выпуска'],
        'Портативные консоли': ['Бренд', 'Модель', 'Экран (Mod/Orig)', 'Питание', 'Цвет корпуса', 'Год выпуска'],
        'Картриджи (8-bit/16-bit)': ['Платформа', 'Название игры', 'Тип (Лицензия/Пиратка)', 'Регион', 'Сохранение (Батарейка)', 'Коробка/Мануал']
    },
    [DefaultCategory.PHONES]: {
        'Смартфоны': ['Бренд', 'Модель', 'ОС (Symbian/WM/etc)', 'Процессор', 'Экран', 'Камера', 'Год анонса'],
        'Пейджеры': ['Бренд', 'Модель', 'Частота', 'Оператор', 'Строк на экране']
    },
    [DefaultCategory.COMPUTERS]: {
        'Комплектующие': ['Тип (GPU/CPU/Sound)', 'Бренд', 'Модель', 'Интерфейс (AGP/PCI/ISA)', 'Год'],
        'Носители (Floppy/ZIP)': ['Формат', 'Объем', 'Производитель', 'Состояние']
    }
};

export const BADGES = {
    'HELLO_WORLD': { label: 'HELLO WORLD', desc: 'Первый вход в систему', color: 'bg-green-500', icon: 'Terminal' },
    'UPLOADER': { label: 'DATA_MINER', desc: 'Загружено 5+ артефактов', color: 'bg-blue-500', icon: 'Upload' },
    'INFLUENCER': { label: 'NET_CELEB', desc: '100+ Лайков на контенте', color: 'bg-purple-500', icon: 'Star' },
    'CRITIC': { label: 'OBSERVER', desc: 'Оставлено 5+ комментариев', color: 'bg-yellow-500', icon: 'MessageSquare' },
    'LEGEND': { label: 'THE_ONE', desc: 'Владелец Легендарного артефакта', color: 'bg-red-500', icon: 'Zap' },
    'COLLECTOR': { label: 'ARCHIVIST', desc: 'Создана первая коллекция', color: 'bg-orange-500', icon: 'Layers' }
};

export const STATUS_OPTIONS = {
    'ONLINE': { label: 'В сети', color: 'text-green-500', icon: Circle },
    'AWAY': { label: 'Отошел', color: 'text-yellow-500', icon: Moon },
    'DND': { label: 'Не беспокоить', color: 'text-red-500', icon: MinusCircle },
    'INVISIBLE': { label: 'Невидимка', color: 'text-gray-400', icon: EyeOff },
    'FREE_FOR_CHAT': { label: 'Готов болтать', color: 'text-blue-500', icon: MessageCircle },
};

export const MOCK_USER: UserProfile = {
  username: "Neo_User_01",
  email: "neo@matrix.com",
  tagline: "Подключен к сети.",
  status: 'ONLINE',
  avatarUrl: "https://picsum.photos/100/100?grayscale",
  joinedDate: "31.12.1999",
  following: ['Morpheus', 'Trinity'],
  achievements: ['HELLO_WORLD']
};

export const MOCK_COLLECTIONS: Collection[] = [];
export const MOCK_NOTIFICATIONS: Notification[] = [];
export const MOCK_MESSAGES: Message[] = [];
export const INITIAL_EXHIBITS: Exhibit[] = [];

// Specific grading scales for categories
export const CATEGORY_CONDITIONS: Record<string, string[]> = {
  [DefaultCategory.PHONES]: [
    'НОВЫЙ (SEALED)', 'КАК НОВЫЙ (LIKE NEW)', 'ОТЛИЧНОЕ (EXC)', 'ХОРОШЕЕ (GOOD)', 'ПОТЕРТОЕ (FAIR)', 'НА ЗАПЧАСТИ (PARTS)'
  ],
  [DefaultCategory.COMPUTERS]: [
    'НОВЫЙ (SEALED)', 'КАК НОВЫЙ (LIKE NEW)', 'ОТЛИЧНОЕ (EXC)', 'ХОРОШЕЕ (GOOD)', 'ПОТЕРТОЕ (FAIR)', 'НА ЗАПЧАСТИ (PARTS)'
  ],
  [DefaultCategory.CAMERAS]: [
    'MINT', 'NEAR MINT', 'EXCELLENT+', 'EXCELLENT', 'USER', 'UGLY / AS-IS'
  ],
  [DefaultCategory.GAMES]: [
    'ЗАПЕЧАТАНО (SEALED)', 'ПОЛНЫЙ КОМПЛЕКТ (CIB)', 'БЕЗ МАНУАЛА', 'ТОЛЬКО КАРТРИДЖ (LOOSE)', 'ТОЛЬКО КОРОБКА', 'D.O.A. (НЕ РАБОТАЕТ)'
  ],
  [DefaultCategory.MUSIC]: [
    'MINT (M)', 'NEAR MINT (NM)', 'VERY GOOD PLUS (VG+)', 'VERY GOOD (VG)', 'GOOD (G)', 'POOR (P)', 'BAD (B)'
  ],
  [DefaultCategory.MAGAZINES]: [
    'КОЛЛЕКЦИОННОЕ (9.0+)', 'ОТЛИЧНОЕ (FINE)', 'ЧИТАННОЕ (VG)', 'ВЕТХОЕ (FAIR)', 'БЕЗ ОБЛОЖКИ'
  ],
  [DefaultCategory.VIDEO]: [
    'ЗАПЕЧАТАНО (SEALED)', 'ОТЛИЧНОЕ (MINT)', 'ХОРОШЕЕ (GOOD)', 'EX-RENTAL', 'ПОВРЕЖДЕНА УПАКОВКА', 'ТОЛЬКО КАССЕТА/ДИСК'
  ],
  [DefaultCategory.TOYS]: [
    'MINT IN BOX (MIB)', 'MINT ON CARD (MOC)', 'LOOSE COMPLETE', 'LOOSE INCOMPLETE', 'BROKEN'
  ],
  [DefaultCategory.MISC]: [
    'ИДЕАЛ', 'ХОРОШЕЕ', 'ПОТЕРТОЕ', 'СЛОМАНО'
  ]
};

// Precise conditions overrides
export const SUBCATEGORY_CONDITIONS: Record<string, string[]> = {
    'Винил (LP/EP)': ['SEALED', 'MINT (M)', 'NEAR MINT (NM)', 'EXCELLENT (EX)', 'VERY GOOD+ (VG+)', 'VERY GOOD (VG)', 'GOOD (G)', 'POOR (P)'],
    'Аудиокассеты': ['SEALED', 'MINT (J-Card Mint)', 'NM', 'VG+', 'VG', 'G (Tested)', 'AS-IS'],
    'Портативные консоли': ['NEW (SEALED)', 'CIB (MINT)', 'CIB (USED)', 'LOOSE (GOOD)', 'LOOSE (SCRATCHED)', 'FOR PARTS/REPAIR'],
    'Картриджи (8-bit/16-bit)': ['NEW', 'CIB', 'LOOSE (Label Mint)', 'LOOSE (Label Damage)', 'REPRO (Новодел)'],
    'Диски (CD/DVD/BD)': ['SEALED', 'MINT', 'NM', 'VG+', 'VG', 'SCRATCHED (Рабочий)', 'BAD (Не рабочий)']
};

// Common values for autocomplete suggestions
export const COMMON_SPEC_VALUES: Record<string, string[]> = {
    'Выпуск картриджа': [
        'Оригинал стар. (Vintage Original)',
        'Пиратский стар. (Vintage Bootleg)',
        'Оригинал-новодел (Modern Repro/Official)',
        'Пиратский новодел (Modern Bootleg)',
        'Другое / Hack / Homebrew'
    ],
    'Комплектация (CIB/Loose)': ['Только картридж', 'С коробкой', 'Полный комплект (CIB)', 'Запечатанный'],
    'Производитель': ['Sony', 'Nokia', 'Samsung', 'Panasonic', 'Apple', 'Nintendo', 'Sega', 'Casio', 'Motorola', 'Siemens', 'Canon', 'Nikon', 'Kodak', 'Polaroid', 'JVC', 'Sharp', 'Philips', 'Technics', 'Pioneer'],
    'Год выпуска': Array.from({length: 50}, (_, i) => (2024 - i).toString()), 
    'Год издания': Array.from({length: 60}, (_, i) => (2024 - i).toString()),
    'Платформа': ['NES/Dendy', 'Sega Mega Drive', 'PlayStation 1', 'PlayStation 2', 'Game Boy', 'Game Boy Color', 'Game Boy Advance', 'Xbox', 'PC', 'PSP', 'Dreamcast', 'Nintendo 64'],
    'Регион': ['PAL', 'NTSC-U', 'NTSC-J', 'Region Free'],
    'Язык': ['Русский', 'English', '日本語', 'Deutsch', 'Français'],
    'Материал': ['Пластик', 'Металл', 'Дерево', 'Стекло', 'Винил'],
    'ОС': ['Symbian', 'Windows Mobile', 'Palm OS', 'Android 1.6', 'iOS 3', 'Java MIDP 2.0', 'MS-DOS', 'Windows 98'],
    'Цвет': ['Черный', 'Белый', 'Серебристый', 'Прозрачный', 'Синий', 'Красный', 'Желтый', 'Золотой'],
    'Тип пленки (I/II/IV)': ['Type I (Normal)', 'Type II (Chrome)', 'Type IV (Metal)'],
    'RPM (Обороты)': ['33 1/3', '45', '78']
};

export type TierType = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export const calculateArtifactScore = (item: Exhibit, userPreferences?: Record<string, number>): number => {
    // 1. Popularity Base
    const likeScore = item.likes * 10;
    const commentScore = (item.comments?.length || 0) * 5;
    const viewScore = Math.floor(item.views * 0.5); 
    
    // 2. Freshness Boost (Time Decay)
    // Items created in the last 48 hours get a massive boost that decays rapidly
    const now = new Date().getTime();
    // Parse timestamp "dd.mm.yyyy, hh:mm:ss" or ISO
    let itemTime = now;
    try {
        if(item.timestamp.includes(',')) {
            const parts = item.timestamp.split(',')[0].split('.');
            // simple parse for RU format approx
            itemTime = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
        } else {
            itemTime = new Date(item.timestamp).getTime();
        }
    } catch(e) {}

    const hoursSinceCreation = Math.max(0, (now - itemTime) / (1000 * 60 * 60));
    // Decay factor: New items (0 hours) get +500, items 24h old get ~200, 1 week old get ~30
    const freshnessScore = 1000 / (hoursSinceCreation + 2);

    // 3. User Personalization (Smart Feed)
    let preferenceBoost = 0;
    if (userPreferences && userPreferences[item.category]) {
        // Boost factor matches user preference weight (0.1 to 2.0 typically)
        preferenceBoost = userPreferences[item.category] * 100;
    }

    return likeScore + commentScore + viewScore + freshnessScore + preferenceBoost;
};

export const getArtifactTier = (item: Exhibit): TierType => {
    const score = (item.likes * 25) + ((item.comments?.length || 0) * 10) + item.views;
    const filledSpecs = Object.values(item.specs || {}).filter(v => v && v.trim().length > 0).length;
    const imageCount = item.imageUrls?.length || 0;
    const isHighQuality = filledSpecs >= 5 && imageCount >= 2;

    if (score >= 20000) return isHighQuality ? 'LEGENDARY' : 'EPIC';
    if (score >= 5000) return 'EPIC';
    if (score >= 1000) return 'RARE';
    return 'COMMON';
};

export const TIER_CONFIG: Record<TierType, {
    name: string;
    color: string;
    bgColor: string;
    borderDark: string;
    borderLight: string;
    badge: string;
    shadow: string;
    icon: any; 
}> = {
    COMMON: {
        name: 'COMMON',
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/20',
        borderDark: 'border-dark-dim',
        borderLight: 'border-light-dim',
        badge: 'bg-gray-500 text-white',
        shadow: '',
        icon: User
    },
    RARE: {
        name: 'RARE',
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-500/20',
        borderDark: 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]',
        borderLight: 'border-cyan-600 shadow-md',
        badge: 'bg-cyan-600 text-white',
        shadow: 'shadow-cyan-500/20',
        icon: Award
    },
    EPIC: {
        name: 'EPIC',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/20',
        borderDark: 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]',
        borderLight: 'border-purple-600 shadow-lg',
        badge: 'bg-purple-600 text-white',
        shadow: 'shadow-purple-500/30',
        icon: Flame
    },
    LEGENDARY: {
        name: 'LEGENDARY',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/20',
        borderDark: 'border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.5)] bg-gradient-to-b from-yellow-900/20 to-black',
        borderLight: 'border-orange-500 shadow-xl bg-gradient-to-b from-orange-50 to-white',
        badge: 'bg-gradient-to-r from-yellow-600 to-red-600 text-white',
        shadow: 'shadow-yellow-500/40',
        icon: Zap
    }
};
