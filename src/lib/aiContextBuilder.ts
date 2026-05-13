import { DailyLog, UnstructuredData } from '../types';
import { format, parseISO } from 'date-fns';

/**
 * Transforms raw sleep logs and unstructured notes into a structured 'Clinical Brief'
 * for the AI to process. This provides historical context and identifies patterns
 * before the AI even starts its deep analysis.
 */
export function buildClinicalBrief(logs: DailyLog[], unstructured: UnstructuredData[]): string {
  // Sort logs by date descending (most recent first) and limit to last 14 days to constrain context window
  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  
  // 1. Primary Patterns: Average Bedtime & Consistency
  let totalBedtimeMinutes = 0;
  let logsWithBedtime = 0;
  const bedtimes: number[] = [];

  sortedLogs.forEach(log => {
    if (log.sleepEvents && log.sleepEvents.length > 0) {
      // Find the first 'sleep' or 'awake-in' event as the "bedtime" anchor
      const firstInBed = log.sleepEvents.find(e => e.type === 'sleep' || e.type === 'awake-in');
      if (firstInBed) {
        const [hours, minutes] = firstInBed.start.split(':').map(Number);
        // Normalize to minutes from 20:00 (8 PM) anchor
        // 20:00 = 0, 00:00 = 240, 04:00 = 480
        let normalizedMinutes = (hours >= 20) ? (hours - 20) * 60 + minutes : (hours + 4) * 60 + minutes;
        
        totalBedtimeMinutes += normalizedMinutes;
        bedtimes.push(normalizedMinutes);
        logsWithBedtime++;
      }
    }
  });

  const avgBedtimeMinutes = logsWithBedtime > 0 ? totalBedtimeMinutes / logsWithBedtime : 0;
  
  // Convert back to HH:mm
  let avgHours = Math.floor(avgBedtimeMinutes / 60) + 20;
  if (avgHours >= 24) avgHours -= 24;
  const avgMins = Math.floor(avgBedtimeMinutes % 60);
  const formattedAvgBedtime = `${String(avgHours).padStart(2, '0')}:${String(avgMins).padStart(2, '0')}`;

  // Consistency Score (0-100) based on standard deviation of bedtimes
  let consistencyScore = 0;
  let bedtimeVariance = 0;
  if (bedtimes.length > 1) {
    const mean = avgBedtimeMinutes;
    bedtimeVariance = bedtimes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / bedtimes.length;
    const stdDev = Math.sqrt(bedtimeVariance);
    // 0 stdDev = 100 score, 120 min stdDev = 0 score
    consistencyScore = Math.max(0, Math.min(100, 100 - (stdDev / 1.2)));
  }

  // 2. Temporal Analysis: Trends and Rolling Averages
  const qualities = sortedLogs.map(l => l.sleep_quality).filter(q => q !== undefined);
  const avg3Day = qualities.slice(0, 3).length > 0 ? qualities.slice(0, 3).reduce((a, b) => a + b, 0) / qualities.slice(0, 3).length : 0;
  const avg7Day = qualities.slice(0, 7).length > 0 ? qualities.slice(0, 7).reduce((a, b) => a + b, 0) / qualities.slice(0, 7).length : 0;
  const prev7Day = qualities.slice(7, 14).length > 0 ? qualities.slice(7, 14).reduce((a, b) => a + b, 0) / qualities.slice(7, 14).length : 0;

  let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
  if (prev7Day > 0) {
    const diff = avg7Day - prev7Day;
    if (diff > 0.5) trendDirection = 'improving';
    else if (diff < -0.5) trendDirection = 'declining';
  }

  // Helper for priority annotation
  const getPriorityLabel = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - parseISO(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 3) return '[HIGH PRIORITY]';
    if (diff <= 7) return '[MEDIUM PRIORITY]';
    return '[LOW PRIORITY]';
  };

  // 3. Efficiency & Interruption Analysis
  let totalEfficiency = 0;
  let totalInterruptions = 0;
  let logsWithEfficiency = 0;
  const weeklyRemarks: string[] = [];

  sortedLogs.slice(0, 7).forEach(log => {
    const metrics = log.summaryMetrics;
    if (metrics) {
      totalEfficiency += metrics.sleep_efficiency || 0;
      logsWithEfficiency++;
      
      // Count 'AWAKE-IN' events
      const interruptions = log.sleepEvents?.filter(e => e.type === 'awake-in').length || 0;
      totalInterruptions += interruptions;
    }
    if (log.daily_remarks) {
      weeklyRemarks.push(`[${log.date}] ${log.daily_remarks}`);
    }
  });

  const avgEfficiency = logsWithEfficiency > 0 ? totalEfficiency / logsWithEfficiency : 0;
  const avgInterruptions = logsWithEfficiency > 0 ? totalInterruptions / logsWithEfficiency : 0;

  // 4. Correlation Leads: Efficiency vs Remarks/Factors
  const correlations: string[] = [];
  sortedLogs.slice(0, 7).forEach(log => {
    const efficiency = log.summaryMetrics?.sleep_efficiency || 0;
    if (efficiency > 0 && efficiency < 85) {
      const stressors = [];
      if (log.factors?.stressLevel && log.factors.stressLevel > 3) stressors.push(`high stress (${log.factors.stressLevel}/5)`);
      if (log.factors?.alcohol?.consumed) stressors.push('alcohol consumption');
      if (log.factors?.caffeine?.consumed && parseInt(log.factors.caffeine.lastIntake.split(':')[0]) > 16) stressors.push('late caffeine');
      
      const priority = getPriorityLabel(log.date);
      if (stressors.length > 0) {
        correlations.push(`${priority} On ${log.date}, efficiency dropped to ${efficiency.toFixed(0)}% coinciding with ${stressors.join(' and ')}.`);
      } else if (log.daily_remarks) {
        correlations.push(`${priority} On ${log.date}, efficiency was low (${efficiency.toFixed(0)}%). User noted: "${log.daily_remarks}"`);
      }
    }
  });

  // 5. Anomalies: Significant outliers
  const anomalies: string[] = [];
  sortedLogs.forEach(log => {
    const metrics = log.summaryMetrics;
    if (metrics) {
      const awakeInBed = metrics.importedInBed - metrics.importedDuration;
      const priority = getPriorityLabel(log.date);
      if (awakeInBed > 90) {
        anomalies.push(`${priority} ${log.date} had an unusually long awake-in-bed period of ${Math.round(awakeInBed)} minutes.`);
      }
      if (metrics.importedDuration < 300 && metrics.importedDuration > 0) {
        anomalies.push(`${priority} ${log.date} recorded very short sleep duration: ${Math.round(metrics.importedDuration)} minutes.`);
      }
    }
  });

  // 6. Unstructured Data Summary
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
- Average Bedtime: ${logsWithBedtime > 0 ? formattedAvgBedtime : 'Insufficient data'}
- Consistency Score: ${consistencyScore.toFixed(0)}/100 (Bedtime Variance: ${Math.round(bedtimeVariance)} min²)
- Data Completeness: ${logsWithBedtime} of 14 days logged

EFFICIENCY & QUALITY (LAST 7 DAYS):
- Avg Sleep Efficiency: ${avgEfficiency.toFixed(1)}% (Total Sleep vs. Total Time in Bed)
- Avg Interruptions: ${avgInterruptions.toFixed(1)} 'AWAKE-IN' events per night
- Trend Direction: ${trendDirection.toUpperCase()}
- Rolling Averages (Sleep Quality): 3-Day: ${avg3Day.toFixed(1)}, 7-Day: ${avg7Day.toFixed(1)}

CORRELATION LEADS:
${correlations.length > 0 ? correlations.slice(0, 3).map(c => `- ${c}`).join('\n') : '- No strong correlations detected in recent logs.'}

ANOMALIES:
${anomalies.length > 0 ? anomalies.slice(0, 3).map(a => `- ${a}`).join('\n') : '- No major anomalies detected.'}

DAILY REMARKS & NOTES (LAST 7 DAYS):
${weeklyRemarks.length > 0 ? weeklyRemarks.join('\n') : '- No specific remarks recorded.'}

RECENT MEMOS (UNSTRUCTURED):
${recentNotes.length > 0 ? recentNotes.join('\n') : '- No recent unstructured notes found.'}

INSTRUCTION FOR AI:
You are SIA (Sleep Intelligence Assistant). Use this Clinical Brief as your primary ground truth. 
Prioritize efficiency and quality metrics over simple duration. 
When the user asks questions, cross-reference their 'Daily Remarks' with their 'Efficiency' drops to find hidden stressors.
`.trim();
}
