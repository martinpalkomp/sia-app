import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Get API Key from process.env instead of Vite
const genAI = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "" });

const FALLBACK_PRIORITY_ORDER = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

let availableModels: string[] | null = null;

async function getAvailableModels() {
  if (availableModels) return availableModels;
  try {
    const modelsResponse = await genAI.models.list();
    availableModels = [];
    for await (const model of modelsResponse) {
      // model.name typically includes 'models/' prefix, e.g. 'models/gemini-1.5-flash'
      const name = model.name.replace('models/', '');
      availableModels.push(name);
    }
    console.log("Resolved Available Models:", availableModels);
    return availableModels;
  } catch (error) {
    console.warn("Failed to fetch available models. Using fallback priority order.");
    return FALLBACK_PRIORITY_ORDER;
  }
}

async function getBestAvailableModel(attempt: number = 0): Promise<string> {
  const models = await getAvailableModels();
  
  for (let i = attempt; i < FALLBACK_PRIORITY_ORDER.length; i++) {
    const candidate = FALLBACK_PRIORITY_ORDER[i];
    if (models.includes(candidate)) {
      return candidate;
    }
  }
  
  // If none found in list (or list request failed), just return the highest priority one we haven't tried
  return FALLBACK_PRIORITY_ORDER[Math.min(attempt, FALLBACK_PRIORITY_ORDER.length - 1)];
}

const isRetryableError = (error: any) => {
  const status = error.status || error.code;
  return status === 404 || status === 503 || status === 429 || error.message?.includes('fetch failed');
};

app.post("/api/gemini/generate", async (req, res) => {
  const { contents, config } = req.body;

  let attempt = 0;
  let lastError = null;

  while (attempt < FALLBACK_PRIORITY_ORDER.length) {
    try {
      const modelToUse = await getBestAvailableModel(attempt);
      console.log(`[Model Resolver] Attempt ${attempt + 1}: Using model ${modelToUse}`);
      
      const response = await genAI.models.generateContent({
        model: modelToUse,
        contents,
        config,
      });
      
      return res.json({ ...response, _meta: { model: modelToUse, attempts: attempt + 1 } });
    } catch (error: any) {
      lastError = error;
      
      if (isRetryableError(error)) {
        console.warn(`[Model Resolver] Generation failed with ${FALLBACK_PRIORITY_ORDER[attempt]}: ${error.status || error.message}. Falling back...`);
        attempt++;
      } else {
        // Non-retryable error (e.g. 400 Bad Request)
        console.error(`[Model Resolver] Non-retryable error: ${error.message}`);
        return res.status(error.status || 500).json({ error: error.message });
      }
    }
  }

  console.error(`[Model Resolver] Exhausted all fallback models.`);
  return res.status(500).json({ error: lastError?.message || "Failed to generate content after exhausting fallback models." });
});

async function startServer() {
  // Try to pre-fetch available models during startup
  getAvailableModels().catch(console.error);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
