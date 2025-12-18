
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface GeneratedData {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  specs: Record<string, string>;
  condition_guess: string;
}

export const generateArtifactDescription = async (imageData?: string, itemName?: string): Promise<GeneratedData> => {
  // Using gemini-2.0-flash-exp as a reliable current model
  const model = 'gemini-2.0-flash-exp';
  
  const systemInstruction = `
    You are a world-class curator of retro technology, vintage toys, and historical collectibles.
    Your task is to analyze an image or a name of an artifact and provide a detailed archiving entry.
    Be precise about models, release years, and technical specifications.
    Respond in JSON format.
  `;

  const prompt = imageData 
    ? "Analyze this artifact image and provide a title, category, detailed description, technical specs, and subcategory. Guess the condition if possible."
    : `Provide detailed archiving information for the artifact named: ${itemName}. Include title, category, detailed description, and technical specs.`;

  const parts: any[] = [{ text: prompt }];
  if (imageData) {
    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Data
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING, description: "One of: ТЕЛЕФОНЫ, ИГРЫ, ЖУРНАЛЫ, МУЗЫКА, ВИДЕО, ИГРУШКИ, КОМПЬЮТЕРЫ, КАМЕРЫ, ПРОЧЕЕ" },
            subcategory: { type: Type.STRING },
            specs: { 
              type: Type.OBJECT,
              properties: {
                "Год": { type: Type.STRING },
                "Бренд": { type: Type.STRING },
                "Модель": { type: Type.STRING }
              },
              additionalProperties: { type: Type.STRING }
            },
            condition_guess: { type: Type.STRING }
          },
          required: ["title", "description", "category", "specs"]
        }
      }
    });

    const jsonStr = response.text || '{}';
    const data = JSON.parse(jsonStr);
    return data as GeneratedData;
  } catch (e) {
    console.error("Failed to generate or parse Gemini response", e);
    return {
      title: itemName || "Unknown Artifact",
      description: "Neural analysis failed or timed out. Manual entry required.",
      category: "ПРОЧЕЕ",
      subcategory: "Unknown",
      specs: {},
      condition_guess: "Unknown"
    };
  }
};

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

const FORBIDDEN_WORDS = [
    'spam', 'casino', 'viagra', 'xxx', 'porn', 'nude', 'hentai', 'nigger', 'faggot'
];

export const moderateContent = async (text: string): Promise<ModerationResult> => {
  if (!text) return { allowed: true };
  const cleanText = text.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (cleanText.includes(word)) {
      return { allowed: false, reason: "ОБНАРУЖЕНО ЗАПРЕЩЕННОЕ СОДЕРЖАНИЕ" };
    }
  }
  return { allowed: true };
};

export const moderateImage = async (file: File): Promise<ModerationResult> => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) return { allowed: false, reason: "РАЗМЕР ФАЙЛА ПРЕВЫШАЕТ 10MB" };
    if (!file.type.startsWith('image/')) return { allowed: false, reason: "ФОРМАТ ФАЙЛА НЕ ПОДДЕРЖИВАЕТСЯ" };
    return { allowed: true };
};
