import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY environment variable is not defined.");
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

function extractJSON(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return JSON.parse(fenced[1].trim());
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return JSON.parse(text.slice(start, end + 1));
  throw new Error("No valid JSON found in model response.");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { image } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'image' property (base64 string) in request body." });
    }

    let mimeType = "image/jpeg";
    let cleanData = image;
    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        cleanData = match[2];
      }
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemma-4-31b-it",
      contents: [
        { inlineData: { mimeType, data: cleanData } },
        {
          text: `You are knowye AI, a food scanner. Analyze this food image and identify all food items.
Estimate portions, then calculate: Calories, Protein, Carbs, Fat, and micros (Sodium, Potassium, Calcium, Iron, Vitamin C in mg).
Categories: 'Breakfast', 'Lunch', 'Dinner', or 'Snacks'. isExercise is always false.

Respond with ONLY valid JSON matching this exact structure (no markdown, no code fences, no explanation):
{"summary":"1-2 sentence summary","items":[{"name":"Food name","category":"Lunch","calories":350,"protein":20,"carbs":40,"fat":12,"amount":"1 plate","isExercise":false,"micros":{"sodium":400,"potassium":350,"calcium":80,"iron":3,"vitaminC":10}}]}`
        }
      ],
      config: {
        systemInstruction: "You are a JSON-only API. Output ONLY valid JSON. No markdown fences, no explanation, no text before or after the JSON."
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response received from the AI model.");
    return res.json(extractJSON(resultText));
  } catch (error: any) {
    console.error("Error in /api/analyze-food-image:", error?.message);
    return res.status(500).json({ error: error.message || "An error occurred while analyzing the food image." });
  }
}
