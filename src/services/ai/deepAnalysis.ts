import { aiClient as siaClient } from './core/aiClient';
import { DailyLog, UserTier } from '../../types';
import { MaturityInfo } from './core/maturitySystem';
import { shouldTriggerAI } from './core/guardrails';
import { format } from 'date-fns';
import { StructuredInsight } from './responseSchemas';

import { SIA_DISCLAIMER, SIA_ANALYSIS_PERSONA } from './aiConstants';

export interface DeepAnalysisAIResponse {
  content: StructuredInsight | null;
  status: 'success' | 'skipped';
  reason?: string;
}

export const generateDeepAnalysis = async (
    userId: string, 
    logs: DailyLog[], 
    tier: UserTier, 
    maturity: MaturityInfo, 
    lastGeneratedDate: string | null
): Promise<DeepAnalysisAIResponse> => {
    
    // Maturity Gate check if required
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setDate(fiveMonthsAgo.getDate() - 150);
    const logsInFiveMonthsCount = logs.filter(log => new Date(log.date) >= fiveMonthsAgo).length;

    const guardrail = shouldTriggerAI(tier, maturity.level, logs.length, logsInFiveMonthsCount, 'DeepAnalysis', lastGeneratedDate);
    if (!guardrail.shouldTrigger) {
      return { content: null, status: 'skipped', reason: guardrail.reason };
    }

    const lightweightLogs = logs.slice(0, 90).map(log => {
      const { visualTimeline, sleepEvents, ...rest } = log;
      return rest;
    });

    const prompt = `
  Analyze ${logs.length} nights of sleep history: ${JSON.stringify(lightweightLogs)}

  Your goal is to provide a comprehensive Deep Analysis of the user's sleep patterns over the last several months.
  Focus on the most dominant long-term trends, significant deviations, and core correlations between behaviors and sleep quality.
  
  Return JSON in exactly this format:
  {
    "type": "Summary",
    "category": "General",
    "confidence": 0.8,
    "summary": "One detailed sentence describing the most significant long-term pattern or trend.",
    "recommendation": "One specific, highly actionable clinical protocol or behavioral adjustment the user should implement this week.",
    "evidence": ["point 1", "point 2"],
    "severity": "low",
    "requiresFollowup": false
  }
`;

    try {
        const response = await siaClient.generateContent(prompt, {
            systemInstruction: SIA_ANALYSIS_PERSONA,
            temperature: 0.7,
            responseMimeType: "application/json"
        });

        const contentText = response.text || "{}";
        let parsed: StructuredInsight;
        try {
            parsed = JSON.parse(contentText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim()) as StructuredInsight;
        } catch {
            parsed = { 
                type: "Summary",
                category: "General",
                confidence: 0,
                summary: "Unable to parse analysis.", 
                recommendation: "Please try again later.", 
                evidence: [],
                severity: "low",
                requiresFollowup: false
            };
        }

        return { content: parsed, status: 'success' };
    } catch (error: any) {
        if (error.status === 503) {
            return { 
                content: { 
                    type: "Summary",
                    category: "General",
                    confidence: 0,
                    summary: "SIA is currently busy. Please try applying the pattern again in a few seconds.", 
                    recommendation: "Wait a moment and refresh.", 
                    evidence: [],
                    severity: "low",
                    requiresFollowup: false
                }, 
                status: 'success' 
            };
        }
        throw error;
    }
};
