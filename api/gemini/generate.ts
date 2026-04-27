import { GoogleGenAI } from "@google/genai";

const SIA_AI_MODEL = 'gemini-2.5-flash';
const SIA_FALLBACK_MODEL = 'gemini-1.5-flash';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { contents, config } = req.body;
  const genAI = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "" });

  try {
    const response = await genAI.models.generateContent({
      model: SIA_AI_MODEL,
      contents,
      config,
    });
    res.status(200).json(response);
  } catch (error: any) {
    if (error.status === 503 || error.status === 404) {
      try {
        const fallbackResponse = await genAI.models.generateContent({
          model: SIA_FALLBACK_MODEL,
          contents,
          config,
        });
        res.status(200).json(fallbackResponse);
      } catch (fallbackError: any) {
        res.status(500).json({ error: fallbackError.message });
      }
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}
