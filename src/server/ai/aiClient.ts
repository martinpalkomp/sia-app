import { GoogleGenAI } from "@google/genai";
import { getPreferredModel, getFallbackModel } from "./modelResolver.js";
import { withRetry } from "./retryManager.js";
import { checkProviderHealth, reportProviderError } from "./providerHealth.js";

export const generateContent = async (contents: any, config: any) => {
  const health = checkProviderHealth();
  if (health.status === 'DEGRADED') {
    console.warn('[Gemini API] Provider is currently marked as degraded.');
  }

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  try {
    const { result, usedModel, attempt } = await withRetry(
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
    
    return { text: result.text, _meta: { model: usedModel, attempts: attempt } };
  } catch (error: any) {
    reportProviderError();
    throw error;
  }
};
