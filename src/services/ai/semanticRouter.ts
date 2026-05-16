import { GoogleGenAI } from "@google/genai";
import { getPreferredModel } from "../../../api/gemini/modelResolver";

export async function isSleepRelated(query: string): Promise<boolean> {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  try {
    const response = await genAI.models.generateContent({
      model: getPreferredModel(),
      contents: [
        { role: 'user', parts: [{ text: `Answer with ONLY "YES" or "NO". Is the following user query related to sleep, energy, circadian rhythm, rest, fatigue, dreams, or personal health/wellness tracking?\n\nQuery: "${query}"` }] }
      ]
    });
    const text = response.text?.trim().toUpperCase();
    return text === "YES";
  } catch (err) {
    console.error("Semantic router failed, defaulting to allow.", err);
    return true; // Fallback to allowing if api fails
  }
}
