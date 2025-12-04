
import { DefaultCategory, Condition, Exhibit, UserProfile, Collection, Notification, Message } from './types';

export const MOCK_USER: UserProfile = {
  username: "Neo_User_01",
  tagline: "Подключен к сети.",
  avatarUrl: "https://picsum.photos/100/100?grayscale",
  joinedDate: "31.12.1999",
  following: ['Morpheus', 'Trinity']
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
    targetId: '4',
    targetPreview: 'Коллекция MiniDisc...',
    timestamp: 'Только что',
    isRead: false
  },
  {
    id: 'n2',
    type: 'COMMENT',
    actor: 'Cypher',
    targetId: '1',
    targetPreview: 'Готов обменять на стейк.',
    timestamp: '5 мин. назад',
    isRead: false
  },
  {
    id: 'n3',
    type: 'FOLLOW',
    actor: 'Agent_Smith',
    timestamp: '1 час назад',
    isRead: true
  }
];

export const MOCK_MESSAGES: Message[] = [
    { id: 'm1', sender: 'Morpheus', receiver: 'Neo_User_01', text: 'Ты выбрал красную таблетку?', timestamp: 'Вчера 10:00', isRead: true },
    { id: 'm2', sender: 'Neo_User_01', receiver: 'Morpheus', text: 'Я просто собираю старые телефоны.', timestamp: 'Вчера 10:05', isRead: true },
    { id: 'm3', sender: 'Trinity', receiver: 'Neo_User_01', text: 'Нужна помощь с декодированием.', timestamp: 'Сегодня 09:30', isRead: false },
];

// Standard keys for categories to help user fill specs
export const CATEGORY_SPECS_TEMPLATES: Record<string, string[]> = {
  [DefaultCategory.PHONES]: ['Бренд', 'Модель', 'Год выпуска', 'ОС', 'Связь'],
  [DefaultCategory.GAMES]: ['Платформа', 'Жанр', 'Год', 'Разработчик', 'Регион'],
  [DefaultCategory.MAGAZINES]: ['Издательство', 'Год', 'Номер выпуска', 'Язык'],
  [DefaultCategory.MUSIC]: ['Исполнитель', 'Альбом', 'Год', 'Носитель', 'Лейбл'],
  [DefaultCategory.COMPUTERS]: ['Процессор', 'ОЗУ', 'Видеокарта', 'ОС', 'Год'],
  [DefaultCategory.CAMERAS]: ['Тип', 'Мегапиксели', 'Объектив', 'Носитель', 'Год'],
  [DefaultCategory.MISC]: ['Год', 'Материал', 'Страна']
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
    rating: 5,
    condition: Condition.MINT,
    quality: 'Оригинальный корпус, без царапин',
    specs: {
      'Год выпуска': '2000',
      'Вес': '133 г',
      'Экран': 'Монохромный'
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
    rating: 5,
    condition: Condition.GOOD,
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
    rating: 4,
    condition: Condition.FAIR,
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
    rating: 5,
    condition: Condition.MINT,
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
    rating: 3,
    condition: Condition.BROKEN,
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
    rating: 4,
    condition: Condition.GOOD,
    quality: 'Пыль в видоискателе',
    specs: {
      'Тип пленки': '600 Series',
      'Фокус': 'Фиксированный',
      'Вспышка': 'Встроена'
    },
    comments: []
  }
];
