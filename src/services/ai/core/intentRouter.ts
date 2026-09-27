import { aiClient } from './aiClient';
import { AI_CAPABILITIES } from './capabilityRegistry';

export type RouterAction = 'ALLOW' | 'REDIRECT' | 'REFUSE';

export interface RouterResponse {
  action: RouterAction;
  reason?: string;
  missing_data?: (keyof typeof AI_CAPABILITIES)[];
}

export const routeChatIntent = async (userMessage: string): Promise<RouterResponse> => {
  // Build a string explaining which capabilities are currently missing from the pipeline
  const missingCapabilities = Object.entries(AI_CAPABILITIES)
    .filter(([_, cap]) => !cap.isAvailableInPipeline)
    .map(([key, cap]) => `- ${key} (requires ${cap.requiredFields.join(', ')})`)
    .join('\n');

  const systemInstruction = `
You are SIA's ultra-fast intent classification router. You operate as a strict gatekeeper.
Your only job is to evaluate the user's message and return a JSON object classifying their intent.

ALLOWED DOMAINS (Output 'ALLOW'):
- Sleep, recovery, fatigue, energy, circadian rhythm, sleep science, sleep habits.
- Stress, anxiety, exercise, nutrition, supplements, alcohol, caffeine impacting sleep.
- Productivity, focus, cognitive performance impacting sleep.

REDIRECT DOMAINS (Output 'REDIRECT'):
- General productivity, general wellness, general exercise, general nutrition (without a sleep context).
Reason: State politely that you focus on sleep, but can explore how this affects their recovery.

REFUSED DOMAINS (Output 'REFUSE'):
- Programming, finance, investing, legal, travel, shopping, homework, trivia, medical diagnosis.
Reason: State clearly that you are a Sleep Intelligence Agent and cannot assist with this topic.

MISSING DATA DETECTION:
If the user's question inherently requires specific sleep architecture data to answer (e.g., chronotype, awakenings), output the exact keys in the 'missing_data' array.
Currently, the following capabilities are UNAVAILABLE in the active context pipeline:
${missingCapabilities || "None"}

If a user asks a question that requires an unavailable capability, you MUST flag it in 'missing_data' (e.g., ["chronotype"]). You must still ALLOW the query if it's in-domain.

OUTPUT FORMAT (Strict JSON):
{
  "action": "ALLOW" | "REDIRECT" | "REFUSE",
  "reason": "String explaining the redirection or refusal (leave empty if ALLOW)",
  "missing_data": [] 
}
  `;

  try {
    const contents = [{ role: "user", parts: [{ text: userMessage }] }];
    const response = await aiClient.generateContentRaw(contents, {
      systemInstruction,
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          action: { type: "STRING", enum: ["ALLOW", "REDIRECT", "REFUSE"] },
          reason: { type: "STRING" },
          missing_data: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["action", "missing_data"]
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      action: result.action || 'ALLOW',
      reason: result.reason,
      missing_data: result.missing_data || []
    };
  } catch (error) {
    console.warn("Intent Router failed, defaulting to ALLOW", error);
    return { action: 'ALLOW' };
  }
};
