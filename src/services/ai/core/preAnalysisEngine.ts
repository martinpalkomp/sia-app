import { DailyLog } from '../../../types';
import { calculateConfidence, calculateCoverage, calculateRecencyScore, detectContradictions, generateRecencySummary } from './evidenceEngine';

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

export const runDeterministicAnalysis = (logs: DailyLog[]): VerifiedFinding[] => {
  const findings: VerifiedFinding[] = [];
  
  if (!logs || logs.length === 0) return findings;

  const validLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));

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
    (l) => l.factors?.screensInBed ? 'Yes' : 'No',
    'Sleep Quality',
    (l) => l.sleep_quality,
    findings
  );

  // Example: Analyze Stress Level vs Sleep Quality
  analyzeFactorVsMetric(
    validLogs,
    'Stress Level',
    (l) => {
      if (l.factors?.stressLevel === undefined) return null;
      return l.factors.stressLevel > 3 ? 'High' : 'Low';
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
  if (logsWithData.length < 3) return; // Insufficient data

  const coverage = calculateCoverage(logs.length, logsWithData.length);
  const limitations = [];
  if (coverage.missingRate > 0.5) limitations.push(`Limited ${factorName} data coverage.`);
  if (logsWithData.length < 5) limitations.push(`Small sample size (${logsWithData.length} observations).`);

  const categoryA = [];
  const categoryB = [];

  for (const log of logsWithData) {
    const cat = getFactorCat(log);
    const metric = getMetric(log) as number;
    const msAgo = Date.now() - new Date(log.date).getTime();
    const daysAgo = msAgo / (1000 * 60 * 60 * 24);
    
    if (cat === 'High' || cat === 'Completed' || cat === 'Yes') {
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
    ? `Higher ${metricName} is associated with ${factorName}.`
    : `Lower ${metricName} is associated with ${factorName}.`;

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
    const msg = `${item.date} | ${item.cat} ${factorName} | ${metricName}: ${item.metric}`;
    if (isSupport) evidence.push(msg);
    else counterEvidence.push(msg);
  }
  for (const item of categoryB) {
    const isSupport = diff > 0 ? item.metric < avgA : item.metric > avgA;
    const msg = `${item.date} | ${item.cat} ${factorName} | ${metricName}: ${item.metric}`;
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
