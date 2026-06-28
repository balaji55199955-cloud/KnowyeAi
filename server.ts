import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limit to allow base64 image uploads
app.use(express.json({ limit: "15mb" }));

// Lazy-loaded Gemini AI client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please add it to your secrets or env variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ----------------- API ROUTES -----------------

// API Check Health
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "knowye Backend active" });
});

// Parse food journal entry using Gemini AI
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
Current user local time Context: ${localTime || new Date().toISOString()}

Extract each distinctly mentioned food, beverage, or physical exercise. Estimate accurate, health-conscious, evidence-based nutritional values (Calories, Protein, Carbs, Fat) for each item based on typical food weight/volumes.
Also estimate micronutrients (Sodium in mg, Potassium in mg, Calcium in mg, Iron in mg, Vitamin C in mg) for each food. For exercises, micros must be 0 or omitted.
Match them to one of the categories: 'Breakfast', 'Lunch', 'Dinner', 'Snacks', or 'Exercise'.
If no category is specified, infer the most logical one (e.g., eggs are Breakfast, late-night tea with crackers is Snacks).
For workouts/exercise, estimate the range of active calories burned ('calories' must be set as a POSITIVE number representing calories burned). For food, 'calories' is positive calories consumed.
Set 'isExercise' to true for exercises/workouts, and false for foods or beverages. For exercises, protein, carbs, fat, and micros must be 0.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are knowye AI, a highly precise, encouraging nutritional scientist and sports performance tracker. You extract nutritional metrics and detailed macro/micro profiles from natural, conversational descriptions. Never invent food items not implied, but always parse complex descriptors correctly.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { 
              type: Type.STRING, 
              description: "A 1-2 sentence friendly, supportive summary of the entry's nutritional profile, e.g., 'A high protein breakfast to kickstart your day!'" 
            },
            items: {
              type: Type.ARRAY,
              description: "The list of food items or exercises parsed.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Display name of food/exercise, e.g., 'Scrambled Eggs with Butter', 'Running'." },
                  category: { type: Type.STRING, description: "Must be exactly 'Breakfast', 'Lunch', 'Dinner', 'Snacks', or 'Exercise'." },
                  calories: { type: Type.NUMBER, description: "Calories (kcal). Consumed for food, burned for exercise. Must be positive." },
                  protein: { type: Type.NUMBER, description: "Protein in grams. Mandatory for foods, 0 for exercises." },
                  carbs: { type: Type.NUMBER, description: "Carbohydrates in grams. Mandatory for foods, 0 for exercises." },
                  fat: { type: Type.NUMBER, description: "Fat in grams. Mandatory for foods, 0 for exercises." },
                  amount: { type: Type.STRING, description: "Inferred or specified portion size, e.g., '2 large eggs', '1 bowl', '30 minutes'." },
                  isExercise: { type: Type.BOOLEAN, description: "True if it is physical exercise, false if food/drink." },
                  micros: {
                    type: Type.OBJECT,
                    description: "Key estimated micronutrient details in milligrams.",
                    properties: {
                      sodium: { type: Type.NUMBER, description: "Amount in mg." },
                      potassium: { type: Type.NUMBER, description: "Amount in mg." },
                      calcium: { type: Type.NUMBER, description: "Amount in mg." },
                      iron: { type: Type.NUMBER, description: "Amount in mg." },
                      vitaminC: { type: Type.NUMBER, description: "Amount in mg." }
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
    if (!resultText) {
      throw new Error("No response received from the AI model.");
    }

    const parsedResult = JSON.parse(resultText);
    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Error in /api/parse-journal:", error);
    return res.status(500).json({ 
      error: error.message || "An error occurred while parsing your journal entry." 
    });
  }
});

// Analyze food photo using Gemini Vision
app.post("/api/analyze-food-image", async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'image' property (base64 string) in request body." });
    }

    // Strip out base64 prefix if present
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
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanData
          }
        },
        {
          text: `Analyze this food image to scan and identify all meals or food items shown.
Estimate portion weights or sizes, then calculate highly reliable nutrition parameters:
1. Calories (kcal)
2. Protein (grams)
3. Carbohydrates (grams)
4. Fat (grams)
5. Micronutrients in milligrams (mg): Sodium, Potassium, Calcium, Iron, Vitamin C.

Categorize each detected food. Must be one of 'Breakfast', 'Lunch', 'Dinner', 'Snacks'.
Set 'isExercise' to false. Give a positive, supportive 1-2 sentence overview of the meal in 'summary'.`
        }
      ],
      config: {
        systemInstruction: "You are knowye AI, an advanced medical-grade food scanner and visual nutritional scientist. You identify ingredients in food photos, approximate portion sizes based on volume shown, and generate standard macro and micro parameters.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { 
              type: Type.STRING, 
              description: "A summary of the scanned meal's health parameters and comments." 
            },
            items: {
              type: Type.ARRAY,
              description: "List of identified individual food items.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of food, e.g., 'Sourdough toast with butter'." },
                  category: { type: Type.STRING, description: "Must be exactly 'Breakfast', 'Lunch', 'Dinner', or 'Snacks'." },
                  calories: { type: Type.NUMBER, description: "Calories (kcal). Must be positive." },
                  protein: { type: Type.NUMBER, description: "Protein in grams. Must be positive." },
                  carbs: { type: Type.NUMBER, description: "Carbohydrates in grams. Must be positive." },
                  fat: { type: Type.NUMBER, description: "Fat in grams. Must be positive." },
                  amount: { type: Type.STRING, description: "Portion or quantity estimated, e.g., '1 slice', '120g', '1 cup'." },
                  isExercise: { type: Type.BOOLEAN, description: "Always false." },
                  micros: {
                    type: Type.OBJECT,
                    description: "Key estimated micronutrient details in milligrams.",
                    properties: {
                      sodium: { type: Type.NUMBER, description: "Amount in mg." },
                      potassium: { type: Type.NUMBER, description: "Amount in mg." },
                      calcium: { type: Type.NUMBER, description: "Amount in mg." },
                      iron: { type: Type.NUMBER, description: "Amount in mg." },
                      vitaminC: { type: Type.NUMBER, description: "Amount in mg." }
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
    if (!resultText) {
      throw new Error("No response received from the AI model.");
    }

    const parsedResult = JSON.parse(resultText);
    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Error in /api/analyze-food-image:", error);
    return res.status(500).json({ 
      error: error.message || "An error occurred while analyzing the food image." 
    });
  }
});

// Refine/Edit food journal entries interactively
app.post("/api/refine-journal", async (req: Request, res: Response) => {
  try {
    const { currentItems, instruction } = req.body;
    if (!instruction || typeof instruction !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'instruction' parameter." });
    }

    const ai = getGeminiClient();

    const prompt = `You are a professional nutritional AI.
We have an existing list of parsed food or exercise logs:
${JSON.stringify(currentItems || [])}

The user has requested the following modification/refinement:
"${instruction}"

Modify the list based on this request. You can:
1. Add new foods or workouts.
2. Edit existing items (e.g., change 'eggs' to 'egg whites', double the portion, add cheese, add milk to coffee, scale calories/macros/micros accordingly).
3. Delete an item if requested (e.g., 'remove the apple').
4. Re-calculate calories, proteins, carbs, fats, and optionally micros (sodium, potassium, calcium, iron, vitaminC in mg) and keep estimations incredibly accurate and consistent.

Provide a brief summarization of the modification and the updated list.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are knowye AI. You update list items precisely matching instructions. Adjust nutritional properties (macros and micros) whenever ingredients are changed, scaled or removed.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { 
              type: Type.STRING, 
              description: "A friendly, ultra-short sentence about what was edited, e.g., 'Added cheese to your eggs and adjusted macros.'" 
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of food/exercise" },
                  category: { type: Type.STRING, description: "Must be exactly 'Breakfast', 'Lunch', 'Dinner', 'Snacks', or 'Exercise'." },
                  calories: { type: Type.NUMBER, description: "Calorie count (kcal). Must be positive." },
                  protein: { type: Type.NUMBER, description: "Protein in grams. 0 for exercises." },
                  carbs: { type: Type.NUMBER, description: "Carbohydrates in grams. 0 for exercises." },
                  fat: { type: Type.NUMBER, description: "Fat in grams. 0 for exercises." },
                  amount: { type: Type.STRING, description: "Amount description, e.g., '1 scoop', '45 mins'." },
                  isExercise: { type: Type.BOOLEAN, description: "True if is exercise, false if food." },
                  micros: {
                    type: Type.OBJECT,
                    description: "Key estimated micronutrient details in milligrams.",
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
    if (!resultText) {
      throw new Error("No response received from the AI model.");
    }

    const parsedResult = JSON.parse(resultText);
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
