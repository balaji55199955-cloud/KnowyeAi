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
      model: "gemini-3.5-flash",
      contents: [
        { inlineData: { mimeType, data: cleanData } },
        {
          text: `Analyze this food image. Identify all food items, estimate portions, and calculate:
Calories, Protein, Carbs, Fat, and micros (Sodium, Potassium, Calcium, Iron, Vitamin C in mg).
Categories: 'Breakfast', 'Lunch', 'Dinner', or 'Snacks'. isExercise is always false.
Provide a supportive 1-2 sentence summary.`
        }
      ],
      config: {
        systemInstruction: "You are knowye AI, an advanced food scanner. Identify ingredients in food photos and generate accurate nutritional parameters.",
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response received from the AI model.");
    return res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error in /api/analyze-food-image:", error);
    return res.status(500).json({ error: error.message || "An error occurred while analyzing the food image." });
  }
}
