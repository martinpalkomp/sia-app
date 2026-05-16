import { DailyLog, UnstructuredData } from '../../../types';
import { format, parseISO } from 'date-fns';
import { getBehavioralContext } from './behavioralContext';
import { getTimelineContext } from './timelineContext';
import { getTrendContext } from './trendContext';
import { getCorrelationContext } from './correlationContext';

export function buildClinicalBrief(logs: DailyLog[], unstructured: UnstructuredData[]): string {
  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  
  const timeline = getTimelineContext(sortedLogs);
  const trends = getTrendContext(sortedLogs);
  const correlations = getCorrelationContext(sortedLogs);
  const behave = getBehavioralContext(sortedLogs);

  const recentNotes = unstructured
    .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate))
    .slice(0, 5)
    .map(u => {
      const date = format(parseISO(u.uploadDate), 'MMM d');
      return `[${date}] ${u.summary || u.content.slice(0, 120)}...`;
    });

  return `
CLINICAL BRIEF: RECENT HISTORY (LAST 14 DAYS)
============================================

PRIMARY PATTERNS:
- Average Bedtime: ${timeline.logsWithBedtime > 0 ? timeline.formattedAvgBedtime : 'Insufficient data'}
- Consistency Score: ${timeline.consistencyScore.toFixed(0)}/100 (Bedtime Variance: ${Math.round(timeline.bedtimeVariance)} min²)
- Data Completeness: ${timeline.logsWithBedtime} of 14 days logged

EFFICIENCY & QUALITY (LAST 7 DAYS):
- Avg Sleep Efficiency: ${trends.avgEfficiency.toFixed(1)}% (Total Sleep vs. Total Time in Bed)
- Avg Interruptions: ${trends.avgInterruptions.toFixed(1)} 'AWAKE-IN' events per night
- Trend Direction: ${trends.trendDirection.toUpperCase()}
- Rolling Averages (Sleep Quality): 3-Day: ${trends.avg3Day.toFixed(1)}, 7-Day: ${trends.avg7Day.toFixed(1)}

CORRELATION LEADS:
${correlations.correlations.length > 0 ? correlations.correlations.slice(0, 3).map(c => `- ${c}`).join('\n') : '- No strong correlations detected in recent logs.'}

ANOMALIES:
${correlations.anomalies.length > 0 ? correlations.anomalies.slice(0, 3).map(a => `- ${a}`).join('\n') : '- No major anomalies detected.'}

DAILY REMARKS & NOTES (LAST 7 DAYS):
${behave.length > 0 ? behave.join('\n') : '- No specific remarks recorded.'}

RECENT MEMOS (UNSTRUCTURED):
${recentNotes.length > 0 ? recentNotes.join('\n') : '- No recent unstructured notes found.'}

INSTRUCTION FOR AI:
You are SIA (Sleep Intelligence Assistant). Use this Clinical Brief as your primary ground truth. 
Prioritize efficiency and quality metrics over simple duration. 
When the user asks questions, cross-reference their 'Daily Remarks' with their 'Efficiency' drops to find hidden stressors.
`.trim();
}
