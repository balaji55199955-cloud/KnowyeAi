import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getGeminiClient, RESPONSE_SCHEMA } from "./_shared.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response received from the AI model.");
    return res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error in /api/parse-journal:", error);
    return res.status(500).json({ error: error.message || "An error occurred while parsing your journal entry." });
  }
}
