import { aiClient as siaClient } from "./core/aiClient";
import { DailyLog, UserTier } from "../../types";
import { MaturityInfo } from "./core/maturitySystem";
import { shouldTriggerAI } from "./core/guardrails";
import { format } from "date-fns";
import { StructuredInsight } from "./responseSchemas";
import { SIA_KNOWLEDGE_BASE } from "./core/knowledgeBase";
import { SIA_FORMAT_REQUIREMENTS } from "./core/insightFormatter";
import { getLightweightLogsForAI } from "../../utils/sleepUtils";
import { runDeterministicAnalysis } from "./core/preAnalysisEngine";
import { evaluateEvidenceCount, generateCoverageSummary } from "./core/evidenceEngine";

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

  const recentLogs = logs.slice(0, 90);
  const coverageReport = generateCoverageSummary(recentLogs);
  
  const evidenceStatus = evaluateEvidenceCount(recentLogs.length);
  
  if (evidenceStatus === 'insufficient') {
    return {
      content: {
        type: "Summary",
        category: "General",
        confidence: "low",
        summary: "Insufficient evidence.",
        recommendation: "None.",
        evidence: [`Only ${recentLogs.length} observations available.`],
        counterEvidence: [],
        limitations: ["Insufficient sample size.", ...(coverageReport.averageCoveragePercent < 0.25 ? ["Coverage too limited for reliable analysis."] : [])],
        severity: "low",
        requiresFollowup: false,
        pattern: "Insufficient evidence."
      },
      status: "success"
    };
  }

  const findings = runDeterministicAnalysis(recentLogs);
  let topConfidence: "high"|"medium"|"low" = "low";

  if (findings.length > 0) {
    const topFinding = findings.sort((a,b) => {
      const score = (val: string) => val === 'high' ? 3 : val === 'medium' ? 2 : 1;
      return score(b.confidence) - score(a.confidence);
    })[0];
    
    let limitations = [...topFinding.limitations];
    if (coverageReport.averageCoveragePercent < 0.25) {
      limitations.push("Coverage too limited for reliable analysis.");
    }

    if (topFinding.contradictionRatio > 0.5) {
      return {
        content: {
          type: "Summary",
          category: "General",
          confidence: "low",
          summary: "Contradictory observations exceed supporting observations.",
          recommendation: "No recommendation generated.",
          evidence: topFinding.evidence,
          counterEvidence: topFinding.counterEvidence,
          limitations: [...limitations, "High contradiction rate."],
          severity: "low",
          requiresFollowup: false,
          pattern: "No recommendation generated."
        },
        status: "success"
      };
    }

    topConfidence = topFinding.confidence;
    if (topFinding.contradictionRatio >= 0.25) {
      topConfidence = topConfidence === 'high' ? 'medium' : 'low';
    }
  }

  if (coverageReport.averageCoveragePercent < 0.5) {
    topConfidence = topConfidence === 'high' ? 'medium' : 'low';
  }

  const systemPrompt = `${SIA_ANALYSIS_PERSONA}\n\n${SIA_KNOWLEDGE_BASE}\n\n${SIA_FORMAT_REQUIREMENTS}`;

  let prompt = `
  Deterministically verified findings (Longitudinal Layer, 90 days):
  ${JSON.stringify(findings, null, 2)}

  Data Coverage Summary:
  ${coverageReport.summaryString}

  Recency Summary:
  ${findings.length > 0 ? findings[0].recencySummary : 'No findings available.'}

  Your goal is to provide a comprehensive Deep Analysis of the user's sleep patterns based ONLY on the verified findings provided above.
  Focus on the most dominant long-term trends and core correlations between behaviors and sleep quality.

  Your role is ONLY to explain these findings, synthesize a summary, and provide a recommendation.
  Do NOT invent new patterns or search raw data. Only format and explain the verified findings.`;

  if (evidenceStatus === 'emerging') {
    prompt += `\n\nCRITICAL: Since this is an emerging pattern, your output MUST explicitly include the phrase: "Current evidence is insufficient to establish a stable pattern."`;
  }

  prompt += `

  Return JSON in exactly this format (do NOT include "confidence" in the JSON):
  {
    "type": "Summary",
    "category": "General",
    "summary": "One detailed sentence describing the most significant long-term pattern or trend.",
    "pattern": "Clear statement of the pattern",
    "recommendation": "One specific, highly actionable clinical protocol or behavioral adjustment the user should implement based on this trend.",
    "evidence": ["point 1 with clear temporal reference", "point 2"],
    "counterEvidence": [],
    "limitations": ["Statement of limitations from the findings"],
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
      parsed.confidence = topConfidence;
    } catch {
      parsed = {
        type: "Summary",
        category: "General",
        confidence: "low",
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
          confidence: "low",
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
