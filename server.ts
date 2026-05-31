import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";

// Use the robust architecture imported from our domain
import { generateContent } from "./src/server/ai/aiClient.js";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors());

app.post("/api/gemini/generate", async (req, res) => {
  const { contents, config } = req.body;

  try {
    const result = await generateContent(contents, config);
    // Returning strictly { text: string } as dictated by the SIA Operation Framework ruleset
    return res.status(200).json({ text: result.text });
  } catch (error: any) {
    console.error(`[Express] generateContent failed: ${error.message}`);
    return res.status(error.status || 500).json({ error: error.message });
  }
});

import { getAvailableModels } from "./src/server/ai/modelResolver.js";

async function startServer() {
  // Try to pre-fetch available models during startup
  getAvailableModels().catch((e: any) => console.error(`[Pre-fetch] Failed: ${e.message}`));

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
