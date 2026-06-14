import { DailyLog, UnstructuredData } from "../../../types";
import { format, parseISO } from "date-fns";
import { getBehavioralContext } from "./behavioralContext";
import { getTimelineContext } from "./timelineContext";
import { getTrendContext } from "./trendContext";
import { getCorrelationContext } from "./correlationContext";
import { calculateSleepDuration } from "../../../utils/sleepUtils";
import { runDeterministicAnalysis } from "../core/preAnalysisEngine";
import { generateCoverageSummary } from "../core/evidenceEngine";

export function buildClinicalBrief(
  logs: DailyLog[],
  unstructured: UnstructuredData[],
): string {
  const sortedLogs = [...logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  const timeline = getTimelineContext(sortedLogs);
  const trends = getTrendContext(sortedLogs);
  const correlations = getCorrelationContext(sortedLogs);
  const behave = getBehavioralContext(sortedLogs);

  const coverageReport = generateCoverageSummary(sortedLogs);
  const findings = runDeterministicAnalysis(sortedLogs);
  let aiDirectives = "";
  let recencySummaryText = "No findings available for recency analysis.";
  if (findings.length > 0) {
    const topFinding = findings.sort((a,b) => {
      const score = (val: string) => val === 'high' ? 3 : val === 'medium' ? 2 : 1;
      return score(b.confidence) - score(a.confidence);
    })[0];
    
    recencySummaryText = topFinding.recencySummary;
    
    if (topFinding.contradictionRatio > 0.5) {
      aiDirectives = `
CRITICAL DIRECTIVE:
You MUST NOT generate any new behavioral recommendations.
Contradictory observations exceed supporting observations (Contradiction rate: ${topFinding.contradictionRatio.toFixed(2)}).
Any clinical recommendations MUST explicitly state: "No recommendation generated due to high contradiction rate."
CONFIDENCE IS FORCED TO: low.`;
    }
  }

  if (coverageReport.averageCoveragePercent < 0.25) {
    aiDirectives += `\nCRITICAL DIRECTIVE:\nData coverage is too limited for reliable analysis. You MUST state: "Coverage too limited for reliable analysis."`;
  }

  const recentNotes = unstructured
    .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate))
    .slice(0, 5)
    .map((u) => {
      const date = format(parseISO(u.uploadDate), "MMM d");
      return `[${date}] ${u.summary || u.content.slice(0, 120)}...`;
    });

  const dailyMetrics = sortedLogs.slice(0, 7).map((log) => {
    const dataToCalculate =
      log.sleepEvents && log.sleepEvents.length > 0
        ? log.sleepEvents
        : log.timeline || [];
    const sleepHours = calculateSleepDuration(dataToCalculate);
    const hours = Math.floor(sleepHours);
    const mins = Math.round((sleepHours - hours) * 60);
    const formattedDuration = `${hours}h ${mins}m`;
    const eff = log.summaryMetrics?.sleep_efficiency || 0;
    return `- [${log.date}] Quality: ${log.sleep_quality}/10 | Duration: ${formattedDuration} | Efficiency: ${eff}%`;
  });

  return `
CLINICAL BRIEF: RECENT HISTORY (LAST 14 DAYS)
============================================

PRIMARY PATTERNS:
- Average Bedtime: ${timeline.logsWithBedtime > 0 ? timeline.formattedAvgBedtime : "Insufficient data"}
- Consistency Score: ${timeline.consistencyScore.toFixed(0)}/100 (Bedtime Variance: ${Math.round(timeline.bedtimeVariance)} min²)
- Data Completeness: ${timeline.logsWithBedtime} of 14 days logged

DATA COVERAGE SUMMARY:
${coverageReport.summaryString}

RECENCY SUMMARY:
${recencySummaryText}

EFFICIENCY & QUALITY (LAST 7 DAYS averages):
- Avg Sleep Efficiency: ${trends.avgEfficiency.toFixed(1)}% (Total Sleep vs. Total Time in Bed)
- Avg Interruptions: ${trends.avgInterruptions.toFixed(1)} 'AWAKE-IN' events per night
- Trend Direction: ${trends.trendDirection.toUpperCase()}
- Rolling Averages (Sleep Quality): 3-Day: ${trends.avg3Day.toFixed(1)}, 7-Day: ${trends.avg7Day.toFixed(1)}

RAW DAILY METRICS (LAST 7 DAYS specifics):
${dailyMetrics.length > 0 ? dailyMetrics.join("\n") : "- No recent metrics found."}

CORRELATION LEADS:
${
  correlations.correlations.length > 0
    ? correlations.correlations
        .slice(0, 3)
        .map((c) => `- ${c}`)
        .join("\n")
    : "- No strong correlations detected in recent logs."
}

ANOMALIES:
${
  correlations.anomalies.length > 0
    ? correlations.anomalies
        .slice(0, 3)
        .map((a) => `- ${a}`)
        .join("\n")
    : "- No major anomalies detected."
}

DAILY REMARKS & NOTES (LAST 7 DAYS):
${behave.length > 0 ? behave.join("\n") : "- No specific remarks recorded."}

RECENT MEMOS (UNSTRUCTURED):
${recentNotes.length > 0 ? recentNotes.join("\n") : "- No recent unstructured notes found."}

INSTRUCTION FOR AI:
You are SIA (Sleep Intelligence Assistant). Use this Clinical Brief as your primary ground truth. 
Prioritize efficiency and quality metrics over simple duration. 
When the user asks questions about specific days or durations, refer strictly to the RAW DAILY METRICS section.
When the user asks questions, cross-reference their 'Daily Remarks' with their 'Efficiency' drops to find hidden stressors.
${aiDirectives}
`.trim();
}
