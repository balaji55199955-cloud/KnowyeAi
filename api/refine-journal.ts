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
    const { currentItems, instruction } = req.body;
    if (!instruction || typeof instruction !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'instruction' parameter." });
    }

    const ai = getGeminiClient();

    const prompt = `You are knowye AI. Here is the current food/exercise log:
${JSON.stringify(currentItems || [])}

User request: "${instruction}"

Modify the list accordingly. Add, edit, or remove items. Recalculate all nutritional values accurately.

Respond with ONLY valid JSON matching this exact structure (no markdown, no code fences, no explanation):
{"summary":"Brief description of changes","items":[{"name":"Food name","category":"Breakfast","calories":250,"protein":12,"carbs":30,"fat":8,"amount":"1 bowl","isExercise":false,"micros":{"sodium":200,"potassium":300,"calcium":50,"iron":2,"vitaminC":5}}]}`;

    const response = await ai.models.generateContent({
      model: "gemma-4-31b-it",
      contents: prompt,
      config: {
        systemInstruction: "You are a JSON-only API. Output ONLY valid JSON. No markdown fences, no explanation, no text before or after the JSON."
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response received from the AI model.");
    return res.json(extractJSON(resultText));
  } catch (error: any) {
    console.error("Error in /api/refine-journal:", error?.message);
    return res.status(500).json({ error: error.message || "An error occurred while refining your journal entry." });
  }
}
