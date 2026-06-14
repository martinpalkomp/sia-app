import { aiClient as siaClient } from "./core/aiClient";
import { DailyLog, UserTier } from "../../types";
import { MaturityInfo } from "./core/maturitySystem";
import { shouldTriggerAI } from "./core/guardrails";
import { format } from "date-fns";

import { SIA_DISCLAIMER, SIA_CORRELATION_PERSONA } from "./aiConstants";
import { SIA_KNOWLEDGE_BASE } from "./core/knowledgeBase";
import { SIA_FORMAT_REQUIREMENTS } from "./core/insightFormatter";
import { getLightweightLogsForAI } from "../../utils/sleepUtils";
import { runDeterministicAnalysis } from "./core/preAnalysisEngine";
import { evaluateEvidenceCount, generateCoverageSummary } from "./core/evidenceEngine";

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

  const recentLogs = logs.slice(0, 30);
  const coverageReport = generateCoverageSummary(recentLogs);
  
  const evidenceStatus = evaluateEvidenceCount(recentLogs.length);
  
  if (evidenceStatus === 'insufficient') {
    return {
      content: "PATTERN:\nInsufficient evidence.\n\nEVIDENCE:\nOnly " + recentLogs.length + " observations available.\n\nRECOMMENDATION:\nNone.\n\nCONFIDENCE:\nlow.\n\nLIMITATIONS:\nInsufficient sample size." + (coverageReport.averageCoveragePercent < 0.25 ? "\nCoverage too limited for reliable analysis." : ""),
      status: "success"
    };
  }

  const findings = runDeterministicAnalysis(recentLogs);
  
  const topFinding = findings.sort((a,b) => {
    const score = (val: string) => val === 'high' ? 3 : val === 'medium' ? 2 : 1;
    return score(b.confidence) - score(a.confidence);
  })[0];

  if (topFinding && topFinding.contradictionRatio > 0.5) {
     return {
        content: `PATTERN:\nNo recommendation generated.\n\nRECOMMENDATION:\nNo recommendation generated.\n\nRATIONALE:\nContradictory observations exceed supporting observations.\n\nCONFIDENCE:\nlow\n\nLIMITATIONS:\nHigh contradiction rate.` + (coverageReport.averageCoveragePercent < 0.25 ? "\nCoverage too limited for reliable analysis." : ""),
        status: "success"
     };
  }

  let promptText = `
      Perform a Correlation Analysis on sleep data and lifestyle factors based on the follow deterministically verified findings:
      ${JSON.stringify(findings, null, 2)}
      
      Data Coverage Summary:
      ${coverageReport.summaryString}
      
      Recency Summary:
      ${topFinding ? topFinding.recencySummary : 'No findings available.'}
      
      Your role is ONLY to explain these findings, synthesize a summary, and provide a recommendation.
      Do NOT invent new patterns. Only format and explain the verified findings.
    `;

  if (evidenceStatus === 'emerging') {
    promptText += `\n\nCRITICAL: Since this is an emerging pattern, your output MUST explicitly include the phrase: "Current evidence is insufficient to establish a stable pattern."`;
  }

  if (tier === "Enhanced" || tier === "Pro") {
    promptText += `Deliver a "Correlative Insight" linking two metrics (e.g., lifestyle factor vs Heart Rate/Efficiency/Quality in REM).`;
  } else {
    promptText += `Return a single sentence about the most frequent sleep factor affect your sleep quality.`;
  }

  try {
    const systemInstruction = `${SIA_CORRELATION_PERSONA}\n\n${SIA_KNOWLEDGE_BASE}\n\n${SIA_FORMAT_REQUIREMENTS}`;
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
