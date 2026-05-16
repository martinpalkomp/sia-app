import { DailyLog } from '../../../types';

export function getTrendContext(logs: DailyLog[]) {
  const qualities = logs.map(l => l.sleep_quality).filter(q => q !== undefined) as number[];
  const avg3Day = qualities.slice(0, 3).length > 0 ? qualities.slice(0, 3).reduce((a, b) => a + b, 0) / qualities.slice(0, 3).length : 0;
  const avg7Day = qualities.slice(0, 7).length > 0 ? qualities.slice(0, 7).reduce((a, b) => a + b, 0) / qualities.slice(0, 7).length : 0;
  const prev7Day = qualities.slice(7, 14).length > 0 ? qualities.slice(7, 14).reduce((a, b) => a + b, 0) / qualities.slice(7, 14).length : 0;

  let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
  if (prev7Day > 0) {
      const diff = avg7Day - prev7Day;
      if (diff > 0.5) trendDirection = 'improving';
      else if (diff < -0.5) trendDirection = 'declining';
  }
  
  let totalEfficiency = 0;
  let totalInterruptions = 0;
  let logsWithEfficiency = 0;

  logs.slice(0, 7).forEach(log => {
      const metrics = log.summaryMetrics;
      if (metrics) {
          totalEfficiency += metrics.sleep_efficiency || 0;
          logsWithEfficiency++;
          const interruptions = log.sleepEvents?.filter(e => e.type === 'awake-in').length || 0;
          totalInterruptions += interruptions;
      }
  });

  const avgEfficiency = logsWithEfficiency > 0 ? totalEfficiency / logsWithEfficiency : 0;
  const avgInterruptions = logsWithEfficiency > 0 ? totalInterruptions / logsWithEfficiency : 0;

  return { avg3Day, avg7Day, trendDirection, avgEfficiency, avgInterruptions };
}
