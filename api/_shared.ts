import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

export const ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    category: { type: Type.STRING },
    calories: { type: Type.NUMBER },
    protein: { type: Type.NUMBER },
    carbs: { type: Type.NUMBER },
    fat: { type: Type.NUMBER },
    amount: { type: Type.STRING },
    isExercise: { type: Type.BOOLEAN },
    micros: {
      type: Type.OBJECT,
      properties: {
        sodium: { type: Type.NUMBER },
        potassium: { type: Type.NUMBER },
        calcium: { type: Type.NUMBER },
        iron: { type: Type.NUMBER },
        vitaminC: { type: Type.NUMBER }
      },
      required: ["sodium", "potassium", "calcium", "iron", "vitaminC"]
    }
  },
  required: ["name", "category", "calories", "protein", "carbs", "fat", "amount", "isExercise", "micros"]
};

export const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    items: { type: Type.ARRAY, items: ITEM_SCHEMA }
  },
  required: ["summary", "items"]
};
