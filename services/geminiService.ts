
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

// Local moderation function (No API calls)
export const moderateContent = async (text: string): Promise<ModerationResult> => {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const lowerText = text.toLowerCase();
  
  // Basic local blocklist
  const forbiddenWords = [
      'spam', 'casino', 'viagra', 'buy crypto', 
      'спам', 'казино', 'ставки', 'крипта'
  ];

  for (const word of forbiddenWords) {
      if (lowerText.includes(word)) {
          return { allowed: false, reason: "ОБНАРУЖЕН СПАМ ИЛИ ЗАПРЕЩЕННЫЕ СЛОВА" };
      }
  }

  // Allow everything else
  return { allowed: true };
};
