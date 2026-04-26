import { GoogleGenAI } from "@google/genai";
import { SIA_AI_MODEL, SIA_FALLBACK_MODEL } from "./aiConfig";

class SiaClient {
  private genAI: GoogleGenAI;

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
  }

  async generateContentRaw(contents: any[], config: any) {
    try {
      return await this.genAI.models.generateContent({
        model: SIA_AI_MODEL,
        contents,
        config
      });
    } catch (error: any) {
      if (error.status === 503 || error.status === 404) {
        console.warn(`SIA: Mandate model ${SIA_AI_MODEL} failed. Falling back to ${SIA_FALLBACK_MODEL}`);
        return await this.genAI.models.generateContent({
            model: SIA_FALLBACK_MODEL,
            contents,
            config
        });
      }
      throw error;
    }
  }

  async generateContent(prompt: string, config: any) {
    return this.generateContentRaw([{ role: "user", parts: [{ text: prompt }] }], config);
  }
}

export const siaClient = new SiaClient();
