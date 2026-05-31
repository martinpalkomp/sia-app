import { generateContent } from "../../src/server/ai/aiClient.js";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { contents, config } = req.body;

  try {
    const result = await generateContent(contents, config);
    res.status(200).json({ text: result.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate content after retries' });
  }
}
