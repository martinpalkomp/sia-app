import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { model, prompt, systemInstruction, config, contents } = req.body;
  
  if (!prompt && !contents) return res.status(400).json({ error: 'Missing prompt or contents' });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  
  try {
    const finalConfig = { ...config };
    if (systemInstruction) {
        finalConfig.systemInstruction = systemInstruction;
    }

    let result;
    if (contents) {
      result = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents,
        config: finalConfig
      });
    } else {
      result = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: prompt,
        config: finalConfig
      });
    }
    
    return res.status(200).json({ text: result.text });
  } catch (err: any) {
    console.error("Vercel API generate.ts error:", err);
    return res.status(500).json({ error: err.message || JSON.stringify(err) });
  }
}
