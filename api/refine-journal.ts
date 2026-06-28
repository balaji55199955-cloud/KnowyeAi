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
    const { currentItems, instruction } = req.body;
    if (!instruction || typeof instruction !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'instruction' parameter." });
    }

    const ai = getGeminiClient();

    const prompt = `Current food/exercise log:
${JSON.stringify(currentItems || [])}

User request: "${instruction}"

Modify the list accordingly. Add, edit, or remove items. Recalculate all nutritional values accurately.
Provide a brief summary of what was changed.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are knowye AI. Update list items precisely matching instructions. Adjust nutritional properties whenever ingredients are changed, scaled or removed.",
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
    console.error("Error in /api/refine-journal:", error?.message, error?.stack);
    return res.status(500).json({ error: error.message || "An error occurred while refining your journal entry." });
  }
}
