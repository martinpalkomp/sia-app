import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { model, prompt, systemInstruction, config, contents } = req.body;
  
  if (!prompt && !contents) return res.status(400).json({ error: 'Missing prompt or contents' });

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  try {
    const genModel = genAI.getGenerativeModel({
      model: model || 'gemini-2.0-flash-001',
      systemInstruction,
    });
    
    let result;
    if (contents) {
      result = await genModel.generateContent({ contents, generationConfig: config });
    } else {
      result = await genModel.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: config });
    }
    
    return res.status(200).json({ text: result.response.text() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
