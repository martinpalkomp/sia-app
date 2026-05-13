import { aiClient as siaClient } from './core/aiClient';
import { DailyLog, UserTier } from '../../types';
import { shouldTriggerAI } from './core/guardrails';

import { SIA_DISCLAIMER, SIA_INSIGHTS_PERSONA } from './aiConstants';

export const generatePatternTeaser = async (
  logs: DailyLog[],
  tier: UserTier,
  logsInLastMonthCount: number
): Promise<string> => {
    const guardrail = shouldTriggerAI(tier, null, logs.length, logsInLastMonthCount, 'QuickInsight', null);
    
    // We already handled tier checks in the UI, but this ensures we don't accidentally run it if not ready.
    if (!guardrail.shouldTrigger) {
      if (guardrail.reason?.includes("14 days of data")) {
         return "Unable to generate. SIA needs 14 days of data in the last month to generate a pattern.";
      }
      return "Unable to generate. " + (guardrail.reason || "");
    }

    // Strip heavy grid arrays to save tokens
    const lightweightLogs = logs.slice(0, 14).map(log => {
      const { visualTimeline, sleepEvents, ...rest } = log;
      return rest;
    });

    const prompt = `
  Analyze the last 14 nights of sleep data: ${JSON.stringify(lightweightLogs)}

  Return a JSON object in exactly this format:
  {
    "pattern": "One sentence identifying the most consistent sleep pattern across the 14 nights",
    "correlation": "One sentence linking one lifestyle factor (caffeine/alcohol/exercise/stress) to a sleep metric (quality/efficiency/duration)"
  }
`;

    const response = await siaClient.generateContent(prompt, {
        systemInstruction: SIA_INSIGHTS_PERSONA,
        temperature: 0.7,
        responseMimeType: "application/json"
    });

    const contentText = response.text || "{}";
    
    let parsed;
    try {
        parsed = JSON.parse(contentText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());
    } catch {
        parsed = { pattern: "Unable to find pattern.", correlation: "No correlation found." };
    }

    const patternText = parsed.pattern || "Pattern unavailable.";
    const correlationText = parsed.correlation || "Correlation unavailable.";
    
    return `PATTERN: ${patternText}\nCORRELATION: ${correlationText}\n\n***\n\n${SIA_DISCLAIMER}`;
};
