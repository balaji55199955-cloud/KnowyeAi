import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please add it to your secrets or env variables.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

function extractJSON(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return JSON.parse(fenced[1].trim());
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1) {
    return JSON.parse(text.slice(braceStart, braceEnd + 1));
  }
  throw new Error("No valid JSON found in model response.");
}

const JSON_SCHEMA_INSTRUCTION = `
You MUST respond with ONLY valid JSON (no markdown, no explanation, no code fences). The JSON must match this exact structure:
{
  "summary": "A 1-2 sentence friendly summary of the entry",
  "items": [
    {
      "name": "Food or exercise name",
      "category": "Breakfast" | "Lunch" | "Dinner" | "Snacks" | "Exercise",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "amount": "portion description",
      "isExercise": boolean,
      "micros": { "sodium": number, "potassium": number, "calcium": number, "iron": number, "vitaminC": number }
    }
  ]
}`;

// ----------------- API ROUTES -----------------

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "knowye Backend active" });
});

app.post("/api/parse-journal", async (req: Request, res: Response) => {
  try {
    const { text, localTime } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'text' property in request body." });
    }

    const ai = getGeminiClient();

    const prompt = `You are knowye AI, a highly precise nutritional scientist. Analyze this food/exercise entry:
---
${text}
---
Current time: ${localTime || new Date().toISOString()}

Extract each food, beverage, or exercise. Estimate accurate nutritional values (Calories, Protein, Carbs, Fat) and micronutrients (Sodium, Potassium, Calcium, Iron, Vitamin C in mg).
Categories: 'Breakfast', 'Lunch', 'Dinner', 'Snacks', or 'Exercise'.
For exercises: calories = burned (positive), protein/carbs/fat/micros = 0, isExercise = true.
For food: calories = consumed (positive), isExercise = false.

${JSON_SCHEMA_INSTRUCTION}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a JSON-only API. Never output anything except valid JSON. No markdown, no explanation."
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response received from the AI model.");
    }

    const parsedResult = extractJSON(resultText);
    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Error in /api/parse-journal:", error);
    return res.status(500).json({
      error: error.message || "An error occurred while parsing your journal entry."
    });
  }
});

app.post("/api/analyze-food-image", async (req: Request, res: Response) => {
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
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanData
          }
        },
        {
          text: `You are knowye AI, a food scanner. Analyze this food image and identify all food items.
Estimate portions, then calculate: Calories, Protein, Carbs, Fat, and micros (Sodium, Potassium, Calcium, Iron, Vitamin C in mg).
Categories: 'Breakfast', 'Lunch', 'Dinner', or 'Snacks'. isExercise is always false.

${JSON_SCHEMA_INSTRUCTION}`
        }
      ],
      config: {
        systemInstruction: "You are a JSON-only API. Never output anything except valid JSON. No markdown, no explanation."
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response received from the AI model.");
    }

    const parsedResult = extractJSON(resultText);
    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Error in /api/analyze-food-image:", error);
    return res.status(500).json({
      error: error.message || "An error occurred while analyzing the food image."
    });
  }
});

app.post("/api/refine-journal", async (req: Request, res: Response) => {
  try {
    const { currentItems, instruction } = req.body;
    if (!instruction || typeof instruction !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'instruction' parameter." });
    }

    const ai = getGeminiClient();

    const prompt = `You are knowye AI. Here is the current food/exercise log:
${JSON.stringify(currentItems || [])}

User request: "${instruction}"

Modify the list accordingly. You can add, edit, or remove items. Recalculate all nutritional values accurately.

${JSON_SCHEMA_INSTRUCTION}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a JSON-only API. Never output anything except valid JSON. No markdown, no explanation."
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response received from the AI model.");
    }

    const parsedResult = extractJSON(resultText);
    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Error in /api/refine-journal:", error);
    return res.status(500).json({
      error: error.message || "An error occurred while refining your journal entry."
    });
  }
});

// -------------- VITE MIDDLEWARE SETUP --------------

async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite integration...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupServer();
