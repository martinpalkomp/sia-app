import { aiClient as siaClient } from './core/aiClient';
import { DailyLog, UserTier, AIInsight } from '../../types';
import { shouldTriggerAI } from './core/guardrails';

import { SIA_DISCLAIMER, SIA_INSIGHTS_PERSONA } from './aiConstants';

export const generatePatternTeaser = async (
  logs: DailyLog[],
  tier: UserTier,
  logsInLastMonthCount: number,
  maturityLevel: number
): Promise<string | AIInsight> => {
    const guardrail = shouldTriggerAI(tier, maturityLevel, logs.length, logsInLastMonthCount, 'QuickInsight', null);
    
    if (!guardrail.shouldTrigger) {
      if (guardrail.reason?.includes("14 days of data")) {
         return "Unable to generate. SIA needs 14 days of data in the last month to generate a pattern.";
      }
      return "Unable to generate. " + (guardrail.reason || "");
    }

    const lightweightLogs = logs.slice(0, 14).map(log => {
      const { visualTimeline, sleepEvents, ...rest } = log;
      return rest;
    });

    const prompt = `
  Analyze the last 14 nights of sleep data: ${JSON.stringify(lightweightLogs)}

  Return a JSON object matching exactly our AIInsight schema with these values:
  {
    "type": "pattern",
    "category": "consistency",
    "confidence": "high",
    "evidence": ["e.g. data point 1", "e.g. data point 2"],
    "recommendation": "Any behavioral recommendation if clearly linked",
    "timeframe": "short_term",
    "severity": "info",
    "summary": "One sentence identifying the most consistent sleep pattern AND One sentence linking one lifestyle factor to a sleep metric"
  }
`;

    try {
      const response = await siaClient.generateContent(prompt, {
          systemInstruction: SIA_INSIGHTS_PERSONA,
          temperature: 0.7,
          responseMimeType: "application/json"
      });

      const contentText = response.text || "{}";
      const parsed: AIInsight = JSON.parse(contentText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());

      return parsed;
    } catch (e) {
      console.error("Failed to generate pattern teaser AIInsight", e);
      return "Unable to find pattern. No correlation found.";
    }
};
