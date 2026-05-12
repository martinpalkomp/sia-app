import { SIA_AI_MODEL, SIA_FALLBACK_MODEL } from './aiConfig';

const FALLBACK_PRIORITY_ORDER = [
  SIA_AI_MODEL,            // gemini-2.0-flash — confirmed working
  SIA_FALLBACK_MODEL,      // gemini-2.5-flash-preview — next gen
  'gemini-1.5-flash',      // legacy stable fallback
];

class SiaClient {
  private availableModels: string[] | null = null;

  constructor() {}

  private async getAvailableModels(): Promise<string[]> {
    return FALLBACK_PRIORITY_ORDER;
  }

  private async getBestAvailableModel(attempt: number = 0): Promise<string> {
    return FALLBACK_PRIORITY_ORDER[Math.min(attempt, FALLBACK_PRIORITY_ORDER.length - 1)];
  }

  private isRetryableError(error: any) {
    const status = error.status || error.code || 500;
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

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contents, 
            systemInstruction, 
            config, 
            model: modelToUse 
          }),
        });

        if (!res.ok) throw new Error(`API route error: ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        return { text: data.text as string };
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

  async generateContent(prompt: string, config?: any) {
    let systemInstruction = undefined;
    let modifiedConfig = { ...config };
    
    if (modifiedConfig && modifiedConfig.systemInstruction) {
      systemInstruction = modifiedConfig.systemInstruction;
      delete modifiedConfig.systemInstruction;
    }

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt, 
        systemInstruction, 
        config: modifiedConfig, 
        model: SIA_AI_MODEL 
      }),
    });
    
    if (!res.ok) throw new Error(`API route error: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.text as string;
  }
}

export const siaClient = new SiaClient();
