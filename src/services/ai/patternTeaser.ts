import { aiClient as siaClient } from "./core/aiClient";
import { DailyLog, UserTier, AIInsight } from "../../types";
import { shouldTriggerAI } from "./core/guardrails";
import { SIA_KNOWLEDGE_BASE } from "./core/knowledgeBase";
import { SIA_FORMAT_REQUIREMENTS } from "./core/insightFormatter";
import { getLightweightLogsForAI } from "../../utils/sleepUtils";
import { runDeterministicAnalysis } from "./core/preAnalysisEngine";
import { evaluateEvidenceCount, generateCoverageSummary } from "./core/evidenceEngine";

import { SIA_DISCLAIMER, SIA_INSIGHTS_PERSONA } from "./aiConstants";

export const generatePatternTeaser = async (
  logs: DailyLog[],
  tier: UserTier,
  logsInLastMonthCount: number,
  maturityLevel: number,
): Promise<string | AIInsight> => {
  const guardrail = shouldTriggerAI(
    tier,
    maturityLevel,
    logs.length,
    logsInLastMonthCount,
    "QuickInsight",
    null,
  );

  if (!guardrail.shouldTrigger) {
    if (guardrail.reason?.includes("14 days of data")) {
      return "Unable to generate. SIA needs 14 days of data in the last month to generate a pattern.";
    }
    return "Unable to generate. " + (guardrail.reason || "");
  }

  const recentLogs = logs.slice(0, 14);
  const coverageReport = generateCoverageSummary(recentLogs);
  
  const evidenceStatus = evaluateEvidenceCount(recentLogs.length);
  
  if (evidenceStatus === 'insufficient') {
    return {
      type: "pattern",
      category: "consistency",
      confidence: "low",
      evidence: [`Only ${recentLogs.length} observations available.`],
      counterEvidence: [],
      limitations: ["Insufficient sample size.", ...(coverageReport.averageCoveragePercent < 0.25 ? ["Coverage too limited for reliable analysis."] : [])],
      recommendation: "None.",
      timeframe: "short_term",
      severity: "info",
      summary: "Insufficient evidence.",
      pattern: "Insufficient evidence."
    };
  }

  const findings = runDeterministicAnalysis(recentLogs);
  
  if (findings.length === 0) {
    return "Unable to find pattern. No definitive correlation found in the last 14 days.";
  }

  // Get the most confident finding
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
      type: "pattern",
      category: "consistency",
      confidence: "low",
      evidence: topFinding.evidence,
      counterEvidence: topFinding.counterEvidence,
      limitations: [...limitations, "High contradiction rate."],
      recommendation: "No recommendation generated.",
      timeframe: "short_term",
      severity: "info",
      summary: "Contradictory observations exceed supporting observations.",
      pattern: "No recommendation generated."
    };
  }

  let finalConfidence = topFinding.confidence;
  if (topFinding.contradictionRatio >= 0.25) {
    finalConfidence = finalConfidence === 'high' ? 'medium' : 'low';
  }
  if (coverageReport.averageCoveragePercent < 0.5) {
    finalConfidence = finalConfidence === 'high' ? 'medium' : 'low';
  }

  const systemPrompt = `${SIA_INSIGHTS_PERSONA}\n\n${SIA_KNOWLEDGE_BASE}\n\n${SIA_FORMAT_REQUIREMENTS}`;

  let prompt = `
  Deterministically verified finding:
  ${JSON.stringify(topFinding, null, 2)}

  Data Coverage Summary:
  ${coverageReport.summaryString}

  Recency Summary:
  ${topFinding.recencySummary}

  Strictly follow the SIA_KNOWLEDGE_BASE rules. 
  Your role is ONLY to explain this finding, synthesize a summary, and provide a recommendation.
  Do NOT invent new patterns. Only format and explain the verified finding.`;

  if (evidenceStatus === 'emerging') {
    prompt += `\n\nCRITICAL: Since this is an emerging pattern, your output MUST explicitly include the phrase: "Current evidence is insufficient to establish a stable pattern."`;
  }

  prompt += `
  Return a JSON object matching exactly our AIInsight schema with these values (do NOT include "confidence" in the JSON):
  {
    "type": "pattern",
    "category": "consistency",
    "evidence": ${JSON.stringify(topFinding.evidence)},
    "counterEvidence": ${JSON.stringify(topFinding.counterEvidence)},
    "limitations": ${JSON.stringify(topFinding.limitations)},
    "recommendation": "Any precise behavioral recommendation based on the finding. Skip if none.",
    "timeframe": "short_term",
    "severity": "info",
    "summary": "One sentence identifying the most consistent sleep pattern. Next sentence linking one lifestyle factor to a sleep metric. Keep it sparse. No filler.",
    "pattern": "${topFinding.pattern}"
  }
`;

  try {
    const response = await siaClient.generateContent(prompt, {
      systemInstruction: systemPrompt,
      temperature: 0.2, // lowered temperature for more deterministic, precise analysis
      responseMimeType: "application/json",
    });

    const contentText = response.text || "{}";
    const parsed: AIInsight = JSON.parse(
      contentText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim(),
    );
    
    parsed.confidence = finalConfidence;

    return parsed;
  } catch (e) {
    console.error("Failed to generate pattern teaser AIInsight", e);
    return "Unable to find pattern. No correlation found.";
  }
};
