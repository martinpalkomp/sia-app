import { aiClient as siaClient } from './core/aiClient';
import { DailyLog, UserTier, AIInsight } from '../../types';
import { shouldTriggerAI } from './core/guardrails';
import { SIA_KNOWLEDGE_BASE } from './core/knowledgeBase';

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

    const systemPrompt = `${SIA_INSIGHTS_PERSONA}\n\n${SIA_KNOWLEDGE_BASE}`;

    const prompt = `
  Analyze the last 14 nights of sleep data (Pattern Layer): ${JSON.stringify(lightweightLogs)}

  Strictly follow the SIA_KNOWLEDGE_BASE rules. 
  Extract the highest confidence temporal correlation between lifestyle (stress, exercise, screens) and sleep/energy.
  If the correlation is weak, classify it as "Emerging pattern".

  Return a JSON object matching exactly our AIInsight schema with these values:
  {
    "type": "pattern",
    "category": "consistency",
    "confidence": "high", // or "medium", "low" (Emerging pattern)
    "evidence": [
      "May 10 | Stress 1 + Exercise | Quality 8",
      "May 04 | Stress 3 + No Exercise | Quality 5"
    ],
    "recommendation": "Any precise behavioral recommendation if clearly linked. Skip if none.",
    "timeframe": "short_term",
    "severity": "info",
    "summary": "One sentence identifying the most consistent sleep pattern. Next sentence linking one lifestyle factor to a sleep metric. Keep it sparse. No filler."
  }
`;

    try {
      const response = await siaClient.generateContent(prompt, {
          systemInstruction: systemPrompt,
          temperature: 0.2, // lowered temperature for more deterministic, precise analysis
          responseMimeType: "application/json"
      });

      const contentText = response.text || "{}";
      const parsed: AIInsight = JSON.parse(contentText.replace(/```json/g, '').replace(/```/g, '').trim());

      return parsed;
    } catch (e) {
      console.error("Failed to generate pattern teaser AIInsight", e);
      return "Unable to find pattern. No correlation found.";
    }
};
