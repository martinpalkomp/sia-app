import { DailyLog } from '../../../types';

export const evaluateEvidenceCount = (count: number): 'insufficient' | 'emerging' | 'candidate' | 'established' => {
  if (count <= 2) return 'insufficient';
  if (count <= 4) return 'emerging';
  if (count <= 7) return 'candidate';
  return 'established';
};

export const detectContradictions = (supportCount: number, contradictionCount: number) => {
  const total = supportCount + contradictionCount;
  const contradictionRatio = total > 0 ? contradictionCount / total : 0;
  return {
    supportCount,
    contradictionCount,
    contradictionRatio
  };
};

export const calculateRecencyScore = (daysAgoList: number[]): number => {
  if (!daysAgoList || daysAgoList.length === 0) return 0;
  
  let totalScore = 0;
  for (const daysAgo of daysAgoList) {
    if (daysAgo <= 14) totalScore += 1.0;
    else if (daysAgo <= 30) totalScore += 0.75;
    else if (daysAgo <= 90) totalScore += 0.5;
    else totalScore += 0.25;
  }
  
  return totalScore / daysAgoList.length;
};

export const generateRecencySummary = (daysAgoList: number[]): string => {
  if (!daysAgoList || daysAgoList.length === 0) {
    return "No observations available for recency analysis.";
  }
  let recentWeight = 0;
  let historicalWeight = 0;
  
  for (const daysAgo of daysAgoList) {
    if (daysAgo <= 30) {
       recentWeight += (daysAgo <= 14 ? 1.0 : 0.75);
    } else {
       historicalWeight += (daysAgo <= 90 ? 0.5 : 0.25);
    }
  }
  const total = recentWeight + historicalWeight;
  if (total === 0) return "Observations do not contribute to confidence score.";

  const recentPct = Math.round((recentWeight / total) * 100);
  const histPct = Math.round((historicalWeight / total) * 100);

  return `Recent observations contributed ${recentPct}% of confidence score.\nHistorical observations contributed ${histPct}%.`;
};

export const calculateCoverage = (totalLogs: number, populatedLogs: number) => {
  const percentagePopulated = totalLogs > 0 ? populatedLogs / totalLogs : 0;
  const missingRate = 1 - percentagePopulated;
  
  return {
    percentagePopulated,
    observationCount: populatedLogs,
    missingRate
  };
};

export interface CoverageReport {
  summaryString: string;
  averageCoveragePercent: number;
  lowestCoveragePercent: number;
}

export const generateCoverageSummary = (logs: DailyLog[]): CoverageReport => {
  const total = logs.length;
  if (total === 0) return { summaryString: "No data available.", averageCoveragePercent: 0, lowestCoveragePercent: 0 };

  const counts = {
    Caffeine: 0,
    Alcohol: 0,
    Exercise: 0,
    Stress: 0,
    Bedtime: 0,
    'Wake time': 0
  };

  for (const log of logs) {
    if (log.factors?.caffeine?.consumed !== undefined) counts.Caffeine++;
    if (log.factors?.alcohol?.consumed !== undefined) counts.Alcohol++;
    if (log.factors?.exercise?.completed !== undefined) counts.Exercise++;
    if (log.factors?.stressLevel !== undefined) counts.Stress++;
    
    if (log.sleepEvents && log.sleepEvents.length > 0) {
      const firstInBed = log.sleepEvents.find(e => e.type === 'sleep' || e.type === 'awake-in');
      if (firstInBed) counts.Bedtime++;
      counts['Wake time']++; // If there are sleep events, we assume wake time exists at the end
    } else if (log.timeline && log.timeline.length > 0) {
      // Fallback for deprecated timeline
      counts.Bedtime++;
      counts['Wake time']++;
    }
  }

  const lines = [];
  let lowestPercent = 1;
  let totalPercent = 0;
  let factorCount = 0;

  for (const [key, count] of Object.entries(counts)) {
    const { percentagePopulated } = calculateCoverage(total, count);
    if (percentagePopulated < lowestPercent) lowestPercent = percentagePopulated;
    totalPercent += percentagePopulated;
    factorCount++;
    const pct = Math.round(percentagePopulated * 100);
    lines.push(`${key} coverage: ${count}/${total} nights (${pct}%)`);
  }

  const averageCoveragePercent = totalPercent / factorCount;

  return {
    summaryString: lines.join('\n'),
    averageCoveragePercent,
    lowestCoveragePercent: lowestPercent
  };
};

export const calculateConfidence = (
  evidenceCount: number, 
  contradictionRatio: number, 
  recencyScore: number, 
  coverageScore: number
): 'high' | 'medium' | 'low' => {
  
  // Weights and penalties
  let score = 0;
  
  if (evidenceCount >= 8) score += 40;
  else if (evidenceCount >= 5) score += 30;
  else if (evidenceCount >= 3) score += 15;
  else score += 5;
  
  if (contradictionRatio > 0.3) score -= 20;
  else if (contradictionRatio > 0.1) score -= 10;
  
  score += (recencyScore * 30);
  score += (coverageScore * 30);
  
  if (score >= 75) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
};
