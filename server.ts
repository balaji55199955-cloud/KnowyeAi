import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

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

const ITEM_SCHEMA = {
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

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: ITEM_SCHEMA
    }
  },
  required: ["summary", "items"]
};

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
        systemInstruction: "You are knowye AI, a highly precise nutritional scientist and sports performance tracker. Extract nutritional metrics from natural descriptions. Never invent food items not implied.",
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response received from the AI model.");
    }

    return res.json(JSON.parse(resultText));
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
        { inlineData: { mimeType, data: cleanData } },
        {
          text: `Analyze this food image. Identify all food items, estimate portions, and calculate:
Calories, Protein, Carbs, Fat, and micros (Sodium, Potassium, Calcium, Iron, Vitamin C in mg).
Categories: 'Breakfast', 'Lunch', 'Dinner', or 'Snacks'. isExercise is always false.
Provide a supportive 1-2 sentence summary.`
        }
      ],
      config: {
        systemInstruction: "You are knowye AI, an advanced food scanner and visual nutritional scientist. Identify ingredients in food photos and generate accurate macro and micro parameters.",
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response received from the AI model.");
    }

    return res.json(JSON.parse(resultText));
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
    if (!resultText) {
      throw new Error("No response received from the AI model.");
    }

    return res.json(JSON.parse(resultText));
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
