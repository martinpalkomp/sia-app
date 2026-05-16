import { aiClient as siaClient } from "./core/aiClient";

export async function isSleepRelated(query: string): Promise<boolean> {
  try {
    const response = await siaClient.generateContent(
      `Answer with ONLY "YES" or "NO". Is the following user query related to sleep, energy, circadian rhythm, rest, fatigue, dreams, or personal health/wellness tracking?\n\nQuery: "${query}"`
    );
    const text = response.text?.trim().toUpperCase();
    return text === "YES";
  } catch (err) {
    console.error("Semantic router failed, defaulting to allow.", err);
    return true; // Fallback to allowing if api fails
  }
}
