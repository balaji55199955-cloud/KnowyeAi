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
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response received from the AI model.");
    return res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error in /api/refine-journal:", error);
    return res.status(500).json({ error: error.message || "An error occurred while refining your journal entry." });
  }
}
