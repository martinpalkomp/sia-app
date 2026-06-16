import { DailyLog } from '../../../types';
import { calculateConfidence, calculateCoverage, calculateRecencyScore, detectContradictions, generateRecencySummary } from './evidenceEngine';
import { calculateSleepDuration, getMinutesFrom2000 } from '../../../utils/sleepUtils';

export interface VerifiedFinding {
  pattern: string;
  evidence: string[];
  counterEvidence: string[];
  confidence: 'high' | 'medium' | 'low';
  limitations: string[];
  type: string;
  contradictionRatio: number;
  supportCount: number;
  contradictionCount: number;
  recencySummary: string;
}

const getBedtimeMins = (log: DailyLog): number | null => {
  if (log.sleepEvents && log.sleepEvents.length > 0) {
    const firstInBed = log.sleepEvents.find(e => e.type === 'sleep' || e.type === 'awake-in');
    if (firstInBed) return getMinutesFrom2000(firstInBed.start);
  } else if (log.timeline && log.timeline.length > 0) {
    const firstIdx = log.timeline.findIndex(s => s === 'sleep' || s === 'awake-in');
    if (firstIdx !== -1) return firstIdx * 15;
  }
  return null;
};

const getWaketimeMins = (log: DailyLog): number | null => {
  if (log.sleepEvents && log.sleepEvents.length > 0) {
    const inBedEvents = log.sleepEvents.filter(e => e.type === 'sleep' || e.type === 'awake-in');
    if (inBedEvents.length > 0) {
      const lastInBed = inBedEvents[inBedEvents.length - 1];
      return getMinutesFrom2000(lastInBed.end);
    }
  } else if (log.timeline && log.timeline.length > 0) {
    let lastIdx = log.timeline.length - 1;
    while(lastIdx >= 0 && log.timeline[lastIdx] !== 'sleep' && log.timeline[lastIdx] !== 'awake-in') {
      lastIdx--;
    }
    if (lastIdx !== -1) return (lastIdx + 1) * 15;
  }
  return null;
};

export const runDeterministicAnalysis = (logs: DailyLog[]): VerifiedFinding[] => {
  const findings: VerifiedFinding[] = [];
  
  if (!logs || logs.length === 0) return findings;

  const validLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));

  const bedtimes: number[] = [];
  const waketimes: number[] = [];
  const durations: number[] = [];
  
  for (const l of validLogs) {
    const b = getBedtimeMins(l);
    if (b !== null) bedtimes.push(b);
    const w = getWaketimeMins(l);
    if (w !== null) waketimes.push(w);
    const d = calculateSleepDuration((l.sleepEvents && l.sleepEvents.length > 0 ? l.sleepEvents : l.timeline) || []);
    if (d > 0) durations.push(d);
  }

  const avgBedtime = bedtimes.length > 0 ? bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length : 0;
  const avgWaketime = waketimes.length > 0 ? waketimes.reduce((a, b) => a + b, 0) / waketimes.length : 0;
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  // Example: Analyze Caffeine vs Sleep Quality
  analyzeFactorVsMetric(
    validLogs,
    'Caffeine Intake',
    (l) => l.factors?.caffeine?.consumed ? 'High' : 'Low',
    'Sleep Quality',
    (l) => l.sleep_quality,
    findings
  );

  // Example: Analyze Exercise vs Sleep Quality
  analyzeFactorVsMetric(
    validLogs,
    'Exercise',
    (l) => l.factors?.exercise?.completed ? 'Completed' : 'None',
    'Sleep Quality',
    (l) => l.sleep_quality,
    findings
  );

  // Example: Analyze Screens in Bed vs Sleep Quality
  analyzeFactorVsMetric(
    validLogs,
    'Screens in Bed',
    (l) => {
       if (l.factors?.screensInBed === undefined || l.factors?.screensInBed === null) return null;
       return l.factors.screensInBed ? 'Yes' : 'No';
    },
    'Sleep Quality',
    (l) => l.sleep_quality,
    findings
  );

  // Example: Analyze Stress Level vs Sleep Quality
  analyzeFactorVsMetric(
    validLogs,
    'Stress Level',
    (l) => {
      if (l.factors?.stressLevel === undefined || l.factors?.stressLevel === null) return null;
      return l.factors.stressLevel > 3 ? 'High' : 'Low';
    },
    'Sleep Quality',
    (l) => l.sleep_quality,
    findings
  );

  // Alcohol vs Sleep Quality
  analyzeFactorVsMetric(
    validLogs,
    'Alcohol',
    (l) => {
      if (l.factors?.alcohol?.consumed === undefined || l.factors?.alcohol?.consumed === null) return null;
      return l.factors.alcohol.consumed ? 'Consumed' : 'None';
    },
    'Sleep Quality',
    (l) => l.sleep_quality,
    findings
  );

  // Bedtime vs Sleep Quality
  analyzeFactorVsMetric(
    validLogs,
    'Bedtime',
    (l) => {
      const b = getBedtimeMins(l);
      if (b === null) return null;
      return b > avgBedtime ? 'Late' : 'Early';
    },
    'Sleep Quality',
    (l) => l.sleep_quality,
    findings
  );

  // Wake Time vs Sleep Quality
  analyzeFactorVsMetric(
    validLogs,
    'Wake Time',
    (l) => {
      const w = getWaketimeMins(l);
      if (w === null) return null;
      return w > avgWaketime ? 'Late' : 'Early';
    },
    'Sleep Quality',
    (l) => l.sleep_quality,
    findings
  );

  // Sleep Duration vs Sleep Quality
  analyzeFactorVsMetric(
    validLogs,
    'Sleep Duration',
    (l) => {
      const d = calculateSleepDuration((l.sleepEvents && l.sleepEvents.length > 0 ? l.sleepEvents : l.timeline) || []);
      if (d === 0) return null;
      return d > avgDuration ? 'Long' : 'Short';
    },
    'Sleep Quality',
    (l) => l.sleep_quality,
    findings
  );

  // Bedtime Consistency vs Sleep Quality
  analyzeFactorVsMetric(
    validLogs,
    'Bedtime Consistency',
    (l) => {
      const b = getBedtimeMins(l);
      if (b === null) return null;
      return Math.abs(b - avgBedtime) > 45 ? 'Irregular' : 'Consistent';
    },
    'Sleep Quality',
    (l) => l.sleep_quality,
    findings
  );

  // Wake Time Consistency vs Sleep Quality
  analyzeFactorVsMetric(
    validLogs,
    'Wake Time Consistency',
    (l) => {
      const w = getWaketimeMins(l);
      if (w === null) return null;
      return Math.abs(w - avgWaketime) > 45 ? 'Irregular' : 'Consistent';
    },
    'Sleep Quality',
    (l) => l.sleep_quality,
    findings
  );

  return findings;
};

const analyzeFactorVsMetric = (
  logs: DailyLog[],
  factorName: string,
  getFactorCat: (log: DailyLog) => string | null,
  metricName: string,
  getMetric: (log: DailyLog) => number | undefined,
  findings: VerifiedFinding[]
) => {
  const logsWithData = logs.filter(l => getFactorCat(l) !== null && getMetric(l) !== undefined);
  if (logsWithData.length < 5) return; // Evidence threshold minimum = 5 observations

  const coverage = calculateCoverage(logs.length, logsWithData.length);
  const limitations = [];
  if (coverage.missingRate > 0.5) limitations.push(`Limited ${factorName} data coverage.`);
  if (logsWithData.length < 8) limitations.push(`Small sample size (${logsWithData.length} observations).`);

  const categoryA = [];
  const categoryB = [];

  for (const log of logsWithData) {
    const cat = getFactorCat(log);
    const metric = getMetric(log) as number;
    const msAgo = Date.now() - new Date(log.date).getTime();
    const daysAgo = msAgo / (1000 * 60 * 60 * 24);
    
    if (cat === 'High' || cat === 'Completed' || cat === 'Yes' || cat === 'Consumed' || cat === 'Late' || cat === 'Long' || cat === 'Irregular') {
      categoryA.push({ date: log.date, metric, daysAgo, cat });
    } else {
      categoryB.push({ date: log.date, metric, daysAgo, cat });
    }
  }

  if (categoryA.length === 0 || categoryB.length === 0) return;

  const avgA = categoryA.reduce((sum, item) => sum + item.metric, 0) / categoryA.length;
  const avgB = categoryB.reduce((sum, item) => sum + item.metric, 0) / categoryB.length;

  const diff = avgA - avgB;
  if (Math.abs(diff) < 1) return; // No significant difference

  // Identify pattern
  const patternDesc = diff > 0 
    ? `Higher ${metricName} is associated with ${factorName} (${categoryA[0].cat}).`
    : `Lower ${metricName} is associated with ${factorName} (${categoryA[0].cat}).`;

  const supportCount = diff > 0 ? categoryA.filter(a => a.metric > avgB).length + categoryB.filter(b => b.metric < avgA).length
                                : categoryA.filter(a => a.metric < avgB).length + categoryB.filter(b => b.metric > avgA).length;

  const contradictionCount = diff > 0 ? categoryA.filter(a => a.metric <= avgB).length + categoryB.filter(b => b.metric >= avgA).length
                                      : categoryA.filter(a => a.metric >= avgB).length + categoryB.filter(b => b.metric <= avgA).length;

  const contraResult = detectContradictions(supportCount, contradictionCount);
  
  const recencyA = categoryA.map(a => a.daysAgo);
  const recencyB = categoryB.map(b => b.daysAgo);
  const daysAgoList = [...recencyA, ...recencyB];
  const recencyScore = calculateRecencyScore(daysAgoList);
  const recencySummary = generateRecencySummary(daysAgoList);

  const confidenceScore = calculateConfidence(logsWithData.length, contraResult.contradictionRatio, recencyScore, coverage.percentagePopulated);

  const evidence = [];
  const counterEvidence = [];

  for (const item of categoryA) {
    const isSupport = diff > 0 ? item.metric > avgB : item.metric < avgB;
    const msg = `${item.date} | ${item.cat} | ${metricName}: ${item.metric}`;
    if (isSupport) evidence.push(msg);
    else counterEvidence.push(msg);
  }
  for (const item of categoryB) {
    const isSupport = diff > 0 ? item.metric < avgA : item.metric > avgA;
    const msg = `${item.date} | ${item.cat} | ${metricName}: ${item.metric}`;
    if (isSupport) evidence.push(msg);
    else counterEvidence.push(msg);
  }

  // Only keep top 3 evidence to save prompt scale
  findings.push({
    pattern: patternDesc,
    evidence: evidence.slice(0, 3),
    counterEvidence: counterEvidence.slice(0, 3),
    confidence: confidenceScore,
    limitations,
    type: factorName.toLowerCase().replace(/ /g, '_'),
    contradictionRatio: contraResult.contradictionRatio,
    supportCount: contraResult.supportCount,
    contradictionCount: contraResult.contradictionCount,
    recencySummary: recencySummary
  });
};
