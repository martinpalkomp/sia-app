import { GoogleGenAI } from "@google/genai";
import { getPreferredModel, getFallbackModel } from "./modelResolver";
import { withRetry } from "./retryManager";
import { checkProviderHealth, reportProviderError } from "./providerHealth";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const health = checkProviderHealth();
  if (health.status === 'DEGRADED') {
    console.warn('[Gemini API] Provider is currently marked as degraded.');
  }

  const { contents, config } = req.body;
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  try {
    const { result: response, usedModel, attempt } = await withRetry(
      async (modelToUse) => {
        return await genAI.models.generateContent({
          model: modelToUse,
          contents,
          config,
        });
      },
      getPreferredModel(),
      getFallbackModel()
    );
    
    res.status(200).json({ text: response.text, _meta: { model: usedModel, attempts: attempt } });
  } catch (error: any) {
    reportProviderError();
    res.status(500).json({ error: error.message || 'Failed to generate content after retries' });
  }
}
