import { siaClient } from './SiaClient';
import { DailyLog, UserTier } from '../../types';
import { MaturityInfo } from '../aiService';
import { shouldTriggerAI } from '../../utils/aiGuardrails';
import { format } from 'date-fns';

const DISCLAIMER = "SIA provides lifestyle recommendations based on patterns. This is not a medical diagnosis. Consult a professional for clinical concerns.";

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
      Analyze ${logs.length} days of sleep history: ${JSON.stringify(logs.slice(0, 90))}
      Provide a structured "SIA Monthly Analysis" (max 3 sentences).
      Identify the single most significant trend and offer a specific, actionable clinical recommendation.
      Format: "📊 SIA Monthly Analysis: [Your analysis here]"
    `;

    try {
        const response = await siaClient.generateContent(prompt, {
            systemInstruction: "You are 'SIA', a Sleep Intelligence Agent. Provide deep, structured, data-backed long-term sleep analysis.",
            temperature: 0.7
        });

        const content = response.text || "Unable to generate analysis.";
        const finalContent = `${content}\n\n***\n\n${DISCLAIMER}`;

        return { content: finalContent, status: 'success' };
    } catch (error: any) {
        if (error.status === 503) {
            return { content: "SIA is currently busy. Please try applying the pattern again in a few seconds.", status: 'success' };
        }
        throw error;
    }
};
