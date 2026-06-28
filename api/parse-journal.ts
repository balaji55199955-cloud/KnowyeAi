import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text, localTime } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'text' property in request body." });
    }

    const ai = getGeminiClient();

    const prompt = `Analyze the following food journaling / exercise entry:
---
${text}
---
Current user local time: ${localTime || new Date().toISOString()}

Extract each distinctly mentioned food, beverage, or physical exercise. Estimate accurate nutritional values (Calories, Protein, Carbs, Fat) and micronutrients (Sodium, Potassium, Calcium, Iron, Vitamin C in mg).
Match to categories: 'Breakfast', 'Lunch', 'Dinner', 'Snacks', or 'Exercise'.
For exercises: calories = burned (positive), protein/carbs/fat/micros = 0, isExercise = true.
For food: calories = consumed (positive), isExercise = false.
Provide a 1-2 sentence friendly summary.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are knowye AI, a highly precise nutritional scientist. Extract nutritional metrics from natural descriptions. Never invent food items not implied.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
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
              }
            }
          },
          required: ["summary", "items"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response received from the AI model.");
    return res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error in /api/parse-journal:", error?.message, error?.stack);
    return res.status(500).json({ error: error.message || "An error occurred while parsing your journal entry." });
  }
}
