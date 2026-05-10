import { siaClient } from './SiaClient';
import { DailyLog, UserTier } from '../../types';
import { MaturityInfo } from '../aiService';
import { shouldTriggerAI } from '../../utils/aiGuardrails';
import { format } from 'date-fns';

import { SIA_DISCLAIMER, SIA_ANALYSIS_PERSONA } from './aiConstants';

export interface AIResponse {
  content: string | null;
  status: 'success' | 'skipped';
  reason?: string;
}

export const generateDeepAnalysis = async (
    userId: string, 
    logs: DailyLog[], 
    tier: UserTier, 
    maturity: MaturityInfo, 
    lastGeneratedDate: string | null
): Promise<AIResponse> => {
    
    // Maturity Gate check if required
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const logsInLastMonthCount = logs.filter(log => new Date(log.date) >= oneMonthAgo).length;

    const guardrail = shouldTriggerAI(tier, maturity.level, logs.length, logsInLastMonthCount, 'DeepAnalysis', lastGeneratedDate);
    if (!guardrail.shouldTrigger) {
      return { content: null, status: 'skipped', reason: guardrail.reason };
    }

    const prompt = `
  Analyze ${logs.length} nights of sleep history: ${JSON.stringify(logs.slice(0, 90))}

  Return JSON in exactly this format:
  {
    "summary": "One sentence describing the most significant trend",
    "recommendation": "One specific, actionable thing the user should do tonight or this week",
    "confidence": 0.0 to 1.0
  }
`;

    try {
        const response = await siaClient.generateContent(prompt, {
            systemInstruction: SIA_ANALYSIS_PERSONA,
            temperature: 0.7,
            responseMimeType: "application/json"
        });

        const content = response.text || "Unable to generate analysis.";

        return { content: content, status: 'success' };
    } catch (error: any) {
        if (error.status === 503) {
            return { content: "SIA is currently busy. Please try applying the pattern again in a few seconds.", status: 'success' };
        }
        throw error;
    }
};
