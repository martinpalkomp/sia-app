import { aiClient as siaClient } from './core/aiClient';
import { UserTier } from '../../types';
import { MaturityInfo } from './core/maturitySystem';
import { shouldTriggerAI } from './core/guardrails';
import { ChatQuotaManager } from './chatQuotaManager';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

import { SIA_DISCLAIMER, SIA_BASE_PERSONA, CONDITION_GUIDANCE } from './aiConstants';

export const chatWithSIA = async (
    userId: string, 
    userMessage: string, 
    tier: UserTier, 
    context: {
      clinicalBrief: string;
      personalizationProfile: any;
      history: any[];
      logsCount: number;
      logsInLastMonthCount: number;
    },
    maturity: MaturityInfo,
    dailyBriefContent: string | null
): Promise<{ 
  answer: string; 
  newInsights?: any[]; 
  error?: string; 
  limitReached?: boolean;
  sleep_quality?: number;
  morning_alertness?: number;
  daytime_energy?: number;
}> => {
    
    // 1. Check Quota
    const quota = await ChatQuotaManager.checkAndResetQuota(userId, tier);
    const limit = ChatQuotaManager.getQuotaLimit(tier);
    
    if (quota.chatMessagesUsed >= limit) {
      return { answer: "", limitReached: true };
    }

    // 3. Check ClinicalInsights Guardrail
    const clinicalGuardrail = shouldTriggerAI(tier, maturity.level, context.logsCount, context.logsInLastMonthCount, 'ClinicalInsights', null);

    const systemInstruction = `
      ${SIA_BASE_PERSONA}
      
      DATA MATURITY: You are at Level ${maturity.level} (${maturity.label}).
      ${maturity.level === 1 ? "Only provide basic daily correlations. Avoid long-term trend analysis." : ""}
      ${maturity.level === 2 ? "You can analyze weekly patterns and trends." : ""}
      ${maturity.level === 3 ? "You have full clinical insight capabilities." : ""}

      DAILY BRIEF CONTEXT:
      ${dailyBriefContent ? dailyBriefContent : "No daily brief available yet."}

      USER CONTEXT:
      - Personalization: ${JSON.stringify(context.personalizationProfile)}
      ${(() => {
          const conditions = context.personalizationProfile?.demographics?.healthConditions;
          if (!conditions || conditions.length === 0) return '';
        
          const relevantGuidance = conditions
            .map((c: string) => CONDITION_GUIDANCE[c])
            .filter(Boolean)
            .join('\n\n      ');
        
          return relevantGuidance
            ? `\n\n      HEALTH CONDITIONS & INTERPRETATION RULES:\n      The user has self-reported the following conditions. Apply these interpretation adjustments throughout your entire analysis. Cross-reference against their actual logged data where indicated.\n\n      ${relevantGuidance}\n\n      GENERAL PRINCIPLE: Where a condition is present, always look for the condition-specific factor correlations in the logged data before drawing conclusions. Distinguish between sleep disruption caused by the condition vs. disruption caused by modifiable behaviours.`
            : '';
      })()}
      - Clinical Brief: ${context.clinicalBrief}
      
      INSTRUCTIONS:
      1. Use the provided data to find correlations, patterns, and triggers.
      2. Deliver insights in a conversational, supportive, and professional tone.
      3. Use Markdown formatting.
      4. If you identify a significant new Pattern, Risk, or Recommendation, include it in the 'newInsights' array.
      5. You MUST provide predicted metrics for every routine suggestion: sleep_quality (1-10), morning_alertness (1-10), and daytime_energy (1-10). Do not leave them null or zero.
      
      RESPONSE FORMAT:
      You must return a JSON object:
      {
        "answer": "Your response in Markdown",
        "sleep_quality": 5,
        "morning_alertness": 5,
        "daytime_energy": 5,
        "newInsights": [
          {
            "type": "Pattern" | "Risk" | "Recommendation",
            "confidence": 0.0 to 1.0,
            "summary": "Short 1-sentence takeaway",
            "details": "Optional longer explanation",
            "linkedDates": ["YYYY-MM-DD", ...]
          }
        ]
      }
    `;

    try {
      const contents = [
          ...context.history,
          { role: "user", parts: [{ text: userMessage }] }
      ];

      const response = await siaClient.generateContentRaw(contents, {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
              type: "OBJECT",
              properties: {
                answer: { type: "STRING" },
                sleep_quality: { type: "NUMBER" },
                morning_alertness: { type: "NUMBER" },
                daytime_energy: { type: "NUMBER" },
                newInsights: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      type: { type: "STRING", enum: ["Pattern", "Risk", "Recommendation"] },
                      confidence: { type: "NUMBER" },
                      summary: { type: "STRING" },
                      details: { type: "STRING" },
                      linkedDates: { type: "ARRAY", items: { type: "STRING" } }
                    },
                    required: ["type", "confidence", "summary", "linkedDates"]
                  }
                }
              },
              required: ["answer", "sleep_quality", "morning_alertness", "daytime_energy"]
            }
        });

      const result = JSON.parse(response.text || '{}');
      const answer = result.answer || "I'm sorry, I couldn't process that.";
      const finalAnswer = `${answer}\n\n***\n\n${SIA_DISCLAIMER}`;

      if (!clinicalGuardrail.shouldTrigger) {
        delete result.newInsights;
      }

      // Increment quota
      if (db) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            'quota.chatMessagesUsed': quota.chatMessagesUsed + 1
        });
      }

      return { 
        answer: finalAnswer, 
        newInsights: result.newInsights,
        sleep_quality: result.sleep_quality,
        morning_alertness: result.morning_alertness,
        daytime_energy: result.daytime_energy
      };
    } catch (error) {
      console.error("Chat Error:", error);
      return { answer: "An error occurred.", error: String(error) };
    }
};
