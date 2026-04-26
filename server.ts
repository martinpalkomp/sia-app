import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

const SIA_AI_MODEL = 'gemini-2.0-flash';
const SIA_FALLBACK_MODEL = 'gemini-2.0-flash';

// Get API Key from process.env instead of Vite
const genAI = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "" });

// API routes FIRST
app.post("/api/gemini/generate", async (req, res) => {
  const { contents, config } = req.body;

  try {
    const response = await genAI.models.generateContent({
      model: SIA_AI_MODEL,
      contents,
      config,
    });
    res.json(response);
  } catch (error: any) {
    if (error.status === 503 || error.status === 404) {
      console.warn(`SIA: Mandate model ${SIA_AI_MODEL} failed. Falling back to ${SIA_FALLBACK_MODEL}`);
      try {
        const fallbackResponse = await genAI.models.generateContent({
          model: SIA_FALLBACK_MODEL,
          contents,
          config,
        });
        res.json(fallbackResponse);
      } catch (fallbackError: any) {
        res.status(500).json({ error: fallbackError.message });
      }
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production (Vercel Node environment or locally built)
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
