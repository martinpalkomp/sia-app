import { GoogleGenAI } from "@google/genai";

const FALLBACK_PRIORITY_ORDER = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

let availableModelsCache: string[] | null = null;
let genAIInstance: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "" });
  }
  return genAIInstance;
};

export const getAvailableModels = async (): Promise<string[]> => {
  if (availableModelsCache) return availableModelsCache;
  try {
    const modelsResponse = await getGenAI().models.list();
    availableModelsCache = [];
    for await (const model of modelsResponse) {
      const name = model.name.replace('models/', '');
      availableModelsCache.push(name);
    }
    console.log("[Model Resolver] Discovered Available Models:", availableModelsCache);
    return availableModelsCache;
  } catch (error) {
    console.warn("[Model Resolver] Failed to fetch available models. Using fallback priority order.");
    return FALLBACK_PRIORITY_ORDER;
  }
};

export const getValidModel = async (attempt: number = 0): Promise<string> => {
  // Respect environment variable override if set
  if (process.env.SIA_AI_MODEL && attempt === 0) {
    return process.env.SIA_AI_MODEL;
  }

  const models = await getAvailableModels();
  
  for (let i = attempt; i < FALLBACK_PRIORITY_ORDER.length; i++) {
    const candidate = FALLBACK_PRIORITY_ORDER[i];
    if (models.includes(candidate)) {
      return candidate;
    }
  }
  
  return FALLBACK_PRIORITY_ORDER[Math.min(attempt, FALLBACK_PRIORITY_ORDER.length - 1)];
};

