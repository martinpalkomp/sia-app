import { aiClient as siaClient } from "./core/aiClient";
import { DailyLog, UserTier } from "../../types";
import { MaturityInfo } from "./core/maturitySystem";
import { shouldTriggerAI } from "./core/guardrails";
import { format } from "date-fns";

import { SIA_DISCLAIMER, SIA_CORRELATION_PERSONA } from "./aiConstants";
import { SIA_KNOWLEDGE_BASE } from "./core/knowledgeBase";
import { getLightweightLogsForAI } from "../../utils/sleepUtils";

export interface AIResponse {
  content: string | null;
  status: "success" | "skipped";
  reason?: string;
}

export const generatePatternDecoder = async (
  userId: string,
  logs: DailyLog[],
  tier: UserTier,
  maturity: MaturityInfo,
  lastGeneratedDate: string | null,
): Promise<AIResponse> => {
  // Maturity Gate: Enforce dataMaturity.level >= 3
  if (maturity.level < 3) {
    return {
      content: null,
      status: "skipped",
      reason: "Pattern Decoder requires Deep Analysis (Data Maturity Level 3).",
    };
  }

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const logsInLastMonthCount = logs.filter(
    (log) => new Date(log.date) >= oneMonthAgo,
  ).length;

  const guardrail = shouldTriggerAI(
    tier,
    maturity.level,
    logs.length,
    logsInLastMonthCount,
    "DeepAnalysis",
    lastGeneratedDate,
  );
  if (!guardrail.shouldTrigger) {
    return { content: null, status: "skipped", reason: guardrail.reason };
  }

  const lightweightLogs = getLightweightLogsForAI(logs, 30);

  let promptText = `
      Analyze recent sleep logs: ${JSON.stringify(lightweightLogs)}
      Perform a Correlation Analysis on sleep data and lifestyle factors.
    `;

  if (tier === "Enhanced" || tier === "Pro") {
    promptText += `Deliver a "Correlative Insight" linking two metrics (e.g., lifestyle factor vs Heart Rate/Efficiency/Quality in REM).`;
  } else {
    promptText += `Return a single sentence about the most frequent sleep factor affect your sleep quality.`;
  }

  try {
    const systemInstruction = `${SIA_CORRELATION_PERSONA}\n\n${SIA_KNOWLEDGE_BASE}`;
    const response = await siaClient.generateContent(promptText, {
      systemInstruction,
      temperature: 0.2,
    });

    const content = response.text || "Unable to generate insight.";
    const finalContent = `${content}\n\n***\n\n${SIA_DISCLAIMER}`;

    return { content: finalContent, status: "success" };
  } catch (error: any) {
    if (error.status === 503) {
      return {
        content:
          "SIA is currently busy. Please try applying the pattern again in a few seconds.",
        status: "success",
      };
    }
    throw error;
  }
};
