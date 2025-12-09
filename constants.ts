

import { Exhibit, UserProfile, Collection, Notification, Message } from './types';
import { Zap, Flame, Award, User, Circle, Moon, MinusCircle, EyeOff, MessageCircle } from 'lucide-react';
import React from 'react';

// Moved from types.ts to ensure runtime availability
export const DefaultCategory = {
  PHONES: 'ТЕЛЕФОНЫ',
  GAMES: 'ИГРЫ',
  MAGAZINES: 'ЖУРНАЛЫ',
  MUSIC: 'МУЗЫКА',
  VIDEO: 'ВИДЕО', // NEW
  TOYS: 'ИГРУШКИ', // NEW
  COMPUTERS: 'КОМПЬЮТЕРЫ',
  CAMERAS: 'КАМЕРЫ',
  MISC: 'ПРОЧЕЕ'
} as const;

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
  tagline: "Подключен к сети.",
  status: 'ONLINE',
  avatarUrl: "https://picsum.photos/100/100?grayscale",
  joinedDate: "31.12.1999",
  following: ['Morpheus', 'Trinity'],
  achievements: ['HELLO_WORLD']
};

export const MOCK_COLLECTIONS: Collection[] = [
  {
    id: 'col1',
    title: 'Nokia Evolution',
    description: 'История финского гиганта от резины до смартфонов.',
    owner: 'Neo_User_01',
    coverImage: 'https://picsum.photos/400/300?random=101',
    exhibitIds: ['1'],
    timestamp: '01.11.2023'
  },
  {
    id: 'col2',
    title: 'Cyberpunk Essentials',
    description: 'Гаджеты для выживания в сети.',
    owner: 'Morpheus',
    coverImage: 'https://picsum.photos/400/300?random=102',
    exhibitIds: ['3', '5'],
    timestamp: '20.10.2023'
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'LIKE',
    actor: 'Trinity',
    recipient: 'Neo_User_01',
    targetId: '4',
    targetPreview: 'Коллекция MiniDisc...',
    timestamp: 'Только что',
    isRead: false
  },
  {
    id: 'n2',
    type: 'COMMENT',
    actor: 'Cypher',
    recipient: 'Neo_User_01',
    targetId: '1',
    targetPreview: 'Готов обменять на стейк.',
    timestamp: '5 мин. назад',
    isRead: false
  },
  {
    id: 'n3',
    type: 'FOLLOW',
    actor: 'Agent_Smith',
    recipient: 'Neo_User_01',
    timestamp: '1 час назад',
    isRead: true
  }
];

export const MOCK_MESSAGES: Message[] = [
    { id: 'm1', sender: 'Morpheus', receiver: 'Neo_User_01', text: 'Ты выбрал красную таблетку?', timestamp: 'Вчера 10:00', isRead: true },
    { id: 'm2', sender: 'Neo_User_01', receiver: 'Morpheus', text: 'Я просто собираю старые телефоны.', timestamp: 'Вчера 10:05', isRead: true },
    { id: 'm3', sender: 'Trinity', receiver: 'Neo_User_01', text: 'Нужна помощь с декодированием.', timestamp: 'Сегодня 09:30', isRead: false },
];

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
      'Платформа', 'Жанр', 'Разработчик', 'Издатель', 
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

export type TierType = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export const calculateArtifactScore = (item: Exhibit): number => {
    // UPDATED COMMUNITY DRIVEN SCORING
    // Purely engagement driven.
    
    // 1. High Intent Interaction (Likes) - 25 points
    const likeScore = item.likes * 25;
    
    // 2. High Effort Interaction (Comments) - 10 points
    const commentScore = (item.comments?.length || 0) * 10;
    
    // 3. Passive Reach (Views) - 1 point
    const viewScore = Math.floor(item.views * 1); 

    return likeScore + commentScore + viewScore;
};

export const getArtifactTier = (item: Exhibit): TierType => {
    const score = calculateArtifactScore(item);
    
    // Quality Gates for high tiers
    const filledSpecs = Object.values(item.specs || {}).filter(v => v && v.trim().length > 0).length;
    const imageCount = item.imageUrls?.length || 0;
    const isHighQuality = filledSpecs >= 5 && imageCount >= 2;

    // LEGENDARY: The artifact must be a cultural phenomenon (>20k score) AND high quality.
    if (score >= 20000) {
        return isHighQuality ? 'LEGENDARY' : 'EPIC';
    }
    
    // EPIC: Viral hit (>5k score).
    if (score >= 5000) return 'EPIC';
    
    // RARE: Noticed by the community (>1k score).
    if (score >= 1000) return 'RARE';
    
    // COMMON: Default state for new items.
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
    icon: any; // LucideIcon type roughly
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

export const INITIAL_EXHIBITS: Exhibit[] = [
  {
    id: '1',
    title: 'Прототип Nokia 3310',
    description: 'Неразрушимое устройство связи из эпохи до смартфонов. Заряд батареи: бесконечный. Артефакт древней цивилизации.',
    imageUrls: [
      'https://picsum.photos/400/300?random=1',
      'https://picsum.photos/400/300?random=11',
      'https://picsum.photos/400/300?random=111'
    ],
    category: DefaultCategory.PHONES,
    owner: 'Morpheus',
    timestamp: '24.10.2023 10:00',
    likes: 1337,
    views: 8542,
    condition: 'ОТЛИЧНОЕ (EXC)',
    quality: 'Оригинальный корпус, без царапин',
    specs: {
      'Год выпуска': '2000',
      'Вес': '133 г',
      'Экран': 'Монохромный',
      'Батарея': 'NiMH 900 mAh',
      'Бренд': 'Nokia'
    },
    comments: [
        { id: 'c1', author: 'Trinity', text: 'Легенда. Работает даже после EMP удара.', timestamp: '24.10.2023 12:00' },
        { id: 'c2', author: 'Cypher', text: 'Готов обменять на стейк.', timestamp: '24.10.2023 13:45' }
    ]
  },
  {
    id: '2',
    title: 'Game Boy Color (Clear)',
    description: 'Портативная консоль в прозрачном корпусе "Atomic Purple". Картридж с покемонами застрял внутри навсегда.',
    imageUrls: [
      'https://picsum.photos/400/300?random=2',
      'https://picsum.photos/400/300?random=22'
    ],
    category: DefaultCategory.GAMES,
    owner: 'Trinity',
    timestamp: '25.10.2023 14:20',
    likes: 404,
    views: 2103,
    condition: 'ПОЛНЫЙ КОМПЛЕКТ (CIB)',
    quality: 'Мелкие царапины на экране',
    specs: {
      'Процессор': 'Z80 8MHz',
      'Питание': '2xAA',
      'Цвет': 'Atomic Purple'
    },
    comments: []
  },
  {
    id: '3',
    title: 'Hacker Magazine #13',
    description: 'Редкий выпуск журнала "Хакер" с гайдом по фрикингу таксофонов. Бумага пожелтела, но знания вечны.',
    imageUrls: [
      'https://picsum.photos/400/300?random=3'
    ],
    category: DefaultCategory.MAGAZINES,
    owner: 'Tank',
    timestamp: '26.10.2023 09:15',
    likes: 99,
    views: 567,
    condition: 'ЧИТАННОЕ (VG)',
    quality: 'Надорвана обложка, страницы целы',
    specs: {
      'Страниц': '120',
      'Издательство': 'Gameland',
      'Язык': 'Русский'
    },
    comments: [
        { id: 'c3', author: 'Neo', text: 'Нужна статья со страницы 42.', timestamp: '27.10.2023 01:00' }
    ]
  },
  {
    id: '4',
    title: 'Коллекция MiniDisc Sony',
    description: 'Звуковые данные на магнитооптическом носителе. Формат, который должен был победить, но остался в тени.',
    imageUrls: [
      'https://picsum.photos/400/300?random=4',
      'https://picsum.photos/400/300?random=44',
      'https://picsum.photos/400/300?random=444',
      'https://picsum.photos/400/300?random=4444'
    ],
    category: DefaultCategory.MUSIC,
    owner: 'Neo_User_01',
    timestamp: '27.10.2023 18:45',
    likes: 55,
    views: 320,
    condition: 'MINT (M)',
    quality: 'Запечатанная упаковка',
    specs: {
      'Емкость': '74 мин',
      'Тип': 'Магнитооптика',
      'Бренд': 'Sony'
    },
    comments: []
  },
  {
    id: '5',
    title: 'Pentium III Процессор',
    description: 'Кремниевое сердце старой рабочей станции. Слот 1. Скорость обработки данных: достаточная для взлома Пентагона.',
    imageUrls: [
      'https://picsum.photos/400/300?random=5',
      'https://picsum.photos/400/300?random=55'
    ],
    category: DefaultCategory.COMPUTERS,
    owner: 'Cipher',
    timestamp: '28.10.2023 02:00',
    likes: 12,
    views: 89,
    condition: 'НА ЗАПЧАСТИ (PARTS)',
    quality: 'Гнутые ножки, не проверялся',
    specs: {
      'Частота': '500 MHz',
      'Сокет': 'Slot 1',
      'Кэш': '512 KB'
    },
    comments: []
  },
  {
    id: '6',
    title: 'Polaroid 600',
    description: 'Устройство мгновенной фиксации реальности. Пленка просрочена на 20 лет, даёт уникальные артефакты.',
    imageUrls: [
      'https://picsum.photos/400/300?random=6'
    ],
    category: DefaultCategory.CAMERAS,
    owner: 'Switch',
    timestamp: '29.10.2023 11:30',
    likes: 245,
    views: 1102,
    condition: 'EXCELLENT',
    quality: 'Пыль в видоискателе',
    specs: {
      'Тип пленки': '600 Series',
      'Фокус': 'Фиксированный',
      'Вспышка': 'Встроена'
    },
    comments: []
  },
  {
    id: '7',
    title: 'The Matrix (VHS)',
    description: 'Оригинальное издание фильма, изменившего всё. Зеленая кассета, запах 1999 года.',
    imageUrls: [
      'https://picsum.photos/400/300?random=7'
    ],
    category: DefaultCategory.VIDEO,
    owner: 'Neo_User_01',
    timestamp: '30.10.2023 16:20',
    likes: 800,
    views: 3500,
    condition: 'ОТЛИЧНОЕ (MINT)',
    quality: 'Коллекционное состояние',
    specs: {
      'Формат': 'VHS',
      'Год выпуска': '1999',
      'Студия': 'Warner Bros',
      'Регион': 'PAL'
    },
    comments: []
  },
  {
    id: '8',
    title: 'Tamagotchi Gen 1',
    description: 'Цифровой питомец в полупрозрачном корпусе. Требует кормления каждые 2 часа, иначе умирает.',
    imageUrls: [
      'https://picsum.photos/400/300?random=8',
      'https://picsum.photos/400/300?random=88'
    ],
    category: DefaultCategory.TOYS,
    owner: 'Trinity',
    timestamp: '01.11.2023 09:00',
    likes: 600,
    views: 1500,
    condition: 'MINT IN BOX (MIB)',
    quality: 'Батарейка удалена во избежание протечки',
    specs: {
      'Производитель': 'Bandai',
      'Год выпуска': '1996',
      'Цвет': 'Transparent Blue',
      'Редкость': 'Высокая'
    },
    comments: []
  }
];