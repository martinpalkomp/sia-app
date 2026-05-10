import { GoogleGenAI } from '@google/genai';
import { SIA_AI_MODEL, SIA_FALLBACK_MODEL } from './aiConfig';

const FALLBACK_PRIORITY_ORDER = [
  SIA_AI_MODEL,            // gemini-2.0-flash — confirmed working
  SIA_FALLBACK_MODEL,      // gemini-2.5-flash-preview — next gen
  'gemini-1.5-flash',      // legacy stable fallback
];

class SiaClient {
  private ai: GoogleGenAI;
  private availableModels: string[] | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
  }

  private async getAvailableModels(): Promise<string[]> {
    if (this.availableModels) return this.availableModels;
    try {
      const modelsResponse = await this.ai.models.list();
      const models = [];
      for await (const model of modelsResponse) {
        const name = model.name.replace('models/', '');
        models.push(name);
      }
      this.availableModels = models;
      return models;
    } catch (error) {
      console.warn("Failed to fetch available models. Using fallback priority order.", error);
      return FALLBACK_PRIORITY_ORDER;
    }
  }

  private async getBestAvailableModel(attempt: number = 0): Promise<string> {
    const models = await this.getAvailableModels();
    for (let i = attempt; i < FALLBACK_PRIORITY_ORDER.length; i++) {
      const candidate = FALLBACK_PRIORITY_ORDER[i];
      if (models.includes(candidate)) {
        return candidate;
      }
    }
    return FALLBACK_PRIORITY_ORDER[Math.min(attempt, FALLBACK_PRIORITY_ORDER.length - 1)];
  }

  private isRetryableError(error: any) {
    const status = error.status || error.code;
    return status === 404 || status === 503 || status === 429 || error.message?.includes('fetch failed');
  }

  async generateContentRaw(contents: any[], config: any) {
    let attempt = 0;
    let lastError = null;

    while (attempt < FALLBACK_PRIORITY_ORDER.length) {
      try {
        const modelToUse = await this.getBestAvailableModel(attempt);
        console.log(`[SiaClient] Attempt ${attempt + 1}: Using model ${modelToUse}`);
        
        let systemInstruction = undefined;
        if (config && config.systemInstruction) {
          systemInstruction = config.systemInstruction;
          delete config.systemInstruction;
        }

        const response = await this.ai.models.generateContent({
          model: modelToUse,
          contents,
          config: {
            ...config,
            systemInstruction,
          },
        });
        
        return response; // Return the GenerateContentResponse directly
      } catch (error: any) {
        lastError = error;
        if (this.isRetryableError(error)) {
          console.warn(`[SiaClient] Generation failed with ${FALLBACK_PRIORITY_ORDER[attempt]}: ${error.status || error.message}. Falling back...`);
          attempt++;
        } else {
          console.error(`[SiaClient] Non-retryable error: ${error.message}`);
          throw error;
        }
      }
    }
    throw lastError || new Error("Failed to generate content after exhausting fallback models.");
  }

  async generateContent(prompt: string, config: any) {
    const response = await this.generateContentRaw([{ role: "user", parts: [{ text: prompt }] }], config);
    return response.text;
  }
}

export const siaClient = new SiaClient();
