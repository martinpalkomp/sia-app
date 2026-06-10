import { aiClient as siaClient } from "./core/aiClient";
import { DailyLog, UserTier } from "../../types";
import { MaturityInfo } from "./core/maturitySystem";
import { shouldTriggerAI } from "./core/guardrails";
import { format } from "date-fns";
import { StructuredInsight } from "./responseSchemas";
import { SIA_KNOWLEDGE_BASE } from "./core/knowledgeBase";
import { getLightweightLogsForAI } from "../../utils/sleepUtils";

import { SIA_DISCLAIMER, SIA_ANALYSIS_PERSONA } from "./aiConstants";

export interface DeepAnalysisAIResponse {
  content: StructuredInsight | null;
  status: "success" | "skipped";
  reason?: string;
}

export const generateDeepAnalysis = async (
  userId: string,
  logs: DailyLog[],
  tier: UserTier,
  maturity: MaturityInfo,
  lastGeneratedDate: string | null,
): Promise<DeepAnalysisAIResponse> => {
  // Maturity Gate check if required
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const logsInTimeframeCount = logs.filter(
    (log) => new Date(log.date) >= oneMonthAgo,
  ).length;

  const guardrail = shouldTriggerAI(
    tier,
    maturity.level,
    logs.length,
    logsInTimeframeCount,
    "DeepAnalysis",
    lastGeneratedDate,
  );
  if (!guardrail.shouldTrigger) {
    return { content: null, status: "skipped", reason: guardrail.reason };
  }

  const lightweightLogs = getLightweightLogsForAI(logs, 30);

  const systemPrompt = `${SIA_ANALYSIS_PERSONA}\n\n${SIA_KNOWLEDGE_BASE}`;

  const prompt = `
  Analyze ${logs.length} nights of sleep history (Longitudinal Layer, 30 days): ${JSON.stringify(lightweightLogs)}

  Your goal is to provide a comprehensive Deep Analysis of the user's sleep patterns over the last several months.
  Focus on the most dominant long-term trends (e.g. chronotype inference, social jetlag, chronic sleep debt) 
  and core correlations between behaviors and sleep quality.

  Follow SIA_KNOWLEDGE_BASE strictly. No vague generalizations. Extract the highest value signal from this longitudinal data.

  Return JSON in exactly this format:
  {
    "type": "Summary",
    "category": "General",
    "confidence": 0.8,
    "summary": "One detailed sentence describing the most significant long-term pattern or trend.",
    "recommendation": "One specific, highly actionable clinical protocol or behavioral adjustment the user should implement based on this trend.",
    "evidence": ["point 1 with clear temporal reference", "point 2"],
    "severity": "low",
    "requiresFollowup": false
  }
`;

  try {
    const response = await siaClient.generateContent(prompt, {
      systemInstruction: systemPrompt,
      temperature: 0.2, // lowered
      responseMimeType: "application/json",
    });

    const contentText = response.text || "{}";
    let parsed: StructuredInsight;
    try {
      parsed = JSON.parse(
        contentText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      ) as StructuredInsight;
    } catch {
      parsed = {
        type: "Summary",
        category: "General",
        confidence: 0,
        summary: "Unable to parse analysis.",
        recommendation: "Please try again later.",
        evidence: [],
        severity: "low",
        requiresFollowup: false,
      };
    }

    return { content: parsed, status: "success" };
  } catch (error: any) {
    if (error.status === 503) {
      return {
        content: {
          type: "Summary",
          category: "General",
          confidence: 0,
          summary:
            "SIA is currently busy. Please try applying the pattern again in a few seconds.",
          recommendation: "Wait a moment and refresh.",
          evidence: [],
          severity: "low",
          requiresFollowup: false,
        },
        status: "success",
      };
    }
    throw error;
  }
};
