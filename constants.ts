
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

// 2. Subcategories (Restored)
export const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
    [DefaultCategory.PHONES]: ['Смартфоны', 'Кнопочные телефоны', 'Раскладушки', 'Слайдеры', 'КПК', 'Стационарные'],
    [DefaultCategory.GAMES]: ['Картриджи (8-bit/16-bit)', 'Диски (CD/DVD/BD)', 'Портативные консоли', 'Стационарные консоли', 'Аксессуары', 'Аркадные автоматы'],
    [DefaultCategory.MAGAZINES]: ['Игровые', 'Компьютерные', 'Технические', 'Музыкальные', 'Комиксы', 'Каталоги', 'Постеры'],
    [DefaultCategory.MUSIC]: ['Аудиокассеты', 'Винил (LP/EP)', 'CD', 'MiniDisc', 'Катушки', 'Плееры', 'Hi-Fi Техника'],
    [DefaultCategory.VIDEO]: ['VHS', 'DVD', 'Blu-ray', 'LaserDisc', 'Video CD', 'Проекторы', 'Видеоплееры'],
    [DefaultCategory.TOYS]: ['Action Figures', 'Конструкторы', 'Мягкие игрушки', 'Роботы', 'Настольные игры', 'Тамагочи/Электроника'],
    [DefaultCategory.COMPUTERS]: ['Ретро ПК', 'Ноутбуки', 'Комплектующие', 'Периферия', 'Носители информации (Floppy/ZIP)'],
    [DefaultCategory.CAMERAS]: ['Пленочные', 'Цифровые (Early Digital)', 'Polaroid/Instax', 'Видеокамеры', 'Объективы'],
    [DefaultCategory.MISC]: ['Часы', 'Калькуляторы', 'Мерч', 'Упаковка', 'Реклама', 'Другое']
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

// Standard keys for categories to help user fill specs (Expanded to ~10 items)
export const CATEGORY_SPECS_TEMPLATES: Record<string, string[]> = {
  [DefaultCategory.PHONES]: [
      'Бренд', 'Модель', 'Год выпуска', 'ОС / Платформа', 'Тип связи (GSM/CDMA)', 
      'Тип экрана', 'Батарея', 'Камера (Мп)', 'Особенности конструкции', 'Комплектация'
  ],
  [DefaultCategory.GAMES]: [
      'Платформа', 'Название игры', 'Выпуск картриджа', 'Жанр', 'Разработчик', 'Издатель', 
      'Год релиза', 'Регион (PAL/NTSC)', 'Носитель', 'Мануал (Есть/Нет)', 'Коробка (Есть/Нет)'
  ],
  [DefaultCategory.MAGAZINES]: [
      'Номер выпуска', 'Год издания', 'Месяц', 'Издательство', 
      'Язык', 'Количество страниц', 'Тема номера', 'Постер в комплекте', 'Сохранность обложки'
  ],
  [DefaultCategory.MUSIC]: [
      'Исполнитель', 'Альбом', 'Год релиза', 'Лейбл', 'Страна издания', 
      'Формат (CD/Vinyl/Cassette)', 'Жанр', 'Скорость (RPM)', 'Тип упаковки', 'Бонус-треки'
  ],
  [DefaultCategory.COMPUTERS]: [
      'Производитель', 'Модель', 'Процессор', 'Тактовая частота', 'ОЗУ (RAM)', 
      'Видеоадаптер', 'Жесткий диск (HDD)', 'Операционная система', 'Тип корпуса', 'Год выпуска'
  ],
  [DefaultCategory.CAMERAS]: [
      'Бренд', 'Модель', 'Тип камеры', 'Матрица / Пленка', 'Разрешение (Мп)', 
      'Объектив', 'Зум (Оптический)', 'Тип носителя памяти', 'Питание', 'Год анонса'
  ],
  [DefaultCategory.VIDEO]: [
      'Формат (VHS/DVD/LD)', 'Год выпуска', 'Режиссер', 'Студия', 
      'Язык / Перевод', 'Регион', 'Хронометраж', 'Особенности издания', 'Коробка'
  ],
  [DefaultCategory.TOYS]: [
      'Серия / Линейка', 'Производитель', 'Год выпуска', 'Материал', 
      'Размер (см)', 'Артикуляция', 'Аксессуары', 'Тип упаковки', 'Редкость'
  ],
  [DefaultCategory.MISC]: [
      'Назначение', 'Производитель', 'Страна происхождения', 'Год производства', 
      'Материал', 'Размеры', 'Вес', 'Цвет', 'Редкость'
  ]
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
    'Производитель': ['Sony', 'Nokia', 'Samsung', 'Panasonic', 'Apple', 'Nintendo', 'Sega', 'Casio', 'Motorola', 'Siemens', 'Canon', 'Nikon', 'Kodak', 'Polaroid', 'JVC', 'Sharp', 'Philips'],
    'Год выпуска': Array.from({length: 50}, (_, i) => (2024 - i).toString()), // 2024 down to 1974
    'Платформа': ['NES/Dendy', 'Sega Mega Drive', 'PlayStation 1', 'PlayStation 2', 'Game Boy', 'Game Boy Color', 'Game Boy Advance', 'Xbox', 'PC', 'PSP'],
    'Регион': ['PAL', 'NTSC-U', 'NTSC-J', 'Region Free'],
    'Язык': ['Русский', 'English', '日本語', 'Deutsch', 'Français'],
    'Материал': ['Пластик', 'Металл', 'Дерево', 'Стекло', 'Винил'],
    'ОС': ['Symbian', 'Windows Mobile', 'Palm OS', 'Android 1.6', 'iOS 3', 'Java MIDP 2.0'],
    'Цвет': ['Черный', 'Белый', 'Серебристый', 'Прозрачный', 'Синий', 'Красный', 'Желтый']
};

export type TierType = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export const calculateArtifactScore = (item: Exhibit): number => {
    const likeScore = item.likes * 25;
    const commentScore = (item.comments?.length || 0) * 10;
    const viewScore = Math.floor(item.views * 1); 
    return likeScore + commentScore + viewScore;
};

export const getArtifactTier = (item: Exhibit): TierType => {
    const score = calculateArtifactScore(item);
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
