
export interface GeneratedData {
  description: string;
  specs: Record<string, string>;
}

// Mock generation function (No API calls)
export const generateArtifactDescription = async (itemName: string, category: string): Promise<GeneratedData> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    description: "Автоматическое описание отключено. Система работает в автономном режиме сохранения энергии.",
    specs: { 
        'Статус': 'Ручной ввод', 
        'Дата': new Date().toLocaleDateString() 
    }
  };
};

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

// --- LOCAL MODERATION LIBRARY ---

const FORBIDDEN_WORDS = [
    // SCAM / CRYPTO / GAMBLING
    'spam', 'casino', 'viagra', 'buy crypto', 'bitcoin', 'ethereum', 'free money', 'giveaway', 'lottery', 'winner', 'prize', '1xbet', 'vulkan', 'phishing', 'investment', 'forex',
    'спам', 'казино', 'ставки', 'крипта', 'биткоин', 'заработок', 'доход', 'выигрыш', 'лотерея', 'вулкан', 'инвестиции', 'форекс', 'пирамида', 'ммм',
    
    // NSFW / ADULT
    'xxx', 'porn', 'sex', 'nude', 'naked', 'erotic', 'hentai', 'boobs', 'tits', 'dick', 'cock', 'pussy', 'vagina', 'whore', 'slut',
    'порно', 'секс', 'голые', 'эротика', 'член', 'хуй', 'пизда', 'бля', 'сука', 'ебать', 'шлюха', 'проститутка', 'минет', 'сосать', 'трахать',
    
    // HATE SPEECH / SLURS / INSULTS
    'nigger', 'faggot', 'retard', 'kill yourself', 'suicide', 'terrorist',
    'хохол', 'москаль', 'чурка', 'жид', 'убейся', 'суицид', 'смерть', 'урод', 'дебил'
];

const SUSPICIOUS_IMAGE_PATTERNS = [
    'xxx', 'porn', 'adult', 'nude', 'sexy', '18+', 'hack', 'crack', 'keylogger'
];

// Normalize text to catch simple evasions (l33t speak, spacing)
const normalizeText = (text: string): string => {
    return text.toLowerCase()
        .replace(/0/g, 'o')
        .replace(/1/g, 'i')
        .replace(/@/g, 'a')
        .replace(/\$/g, 's')
        .replace(/3/g, 'e')
        .replace(/[^a-zа-я0-9\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ') // Collapse spaces
        .trim();
};

export const moderateContent = async (text: string): Promise<ModerationResult> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 300));

  if (!text || text.trim().length === 0) {
      return { allowed: true };
  }

  const cleanText = normalizeText(text);
  
  // 1. Length Check
  if (cleanText.length < 3) {
      return { allowed: false, reason: "ТЕКСТ СЛИШКОМ КОРОТКИЙ (МИН. 3 СИМВОЛА)" };
  }

  // 2. Blacklist Check
  for (const word of FORBIDDEN_WORDS) {
      // Check both normalized and raw (lowercased) text
      if (cleanText.includes(word) || text.toLowerCase().includes(word)) {
          return { allowed: false, reason: `ОБНАРУЖЕНО ЗАПРЕЩЕННОЕ СЛОВО: "${word.toUpperCase()}"` };
      }
  }

  return { allowed: true };
};

export const moderateImage = async (file: File): Promise<ModerationResult> => {
    // 1. Size Check (Max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        return { allowed: false, reason: "РАЗМЕР ФАЙЛА ПРЕВЫШАЕТ 5MB" };
    }

    // 2. Filename Check
    const lowerName = file.name.toLowerCase();
    for (const pattern of SUSPICIOUS_IMAGE_PATTERNS) {
        if (lowerName.includes(pattern)) {
             return { allowed: false, reason: "НЕДОПУСТИМОЕ ИМЯ ФАЙЛА" };
        }
    }

    // 3. Basic Type Check
    if (!file.type.startsWith('image/')) {
        return { allowed: false, reason: "ФОРМАТ ФАЙЛА НЕ ПОДДЕРЖИВАЕТСЯ" };
    }

    return { allowed: true };
};
