import { DailyLog } from '../types';

export const exportDailySummary = (logs: DailyLog[]) => {
  const headers = [
    'date', 'quality', 'total_sleep_hrs', 'efficiency_pct', 'latency_mins',
    'caffeine_mg', 'alcohol_units', 'stress_score'
  ];

  const csvContent = [
    headers.join(','),
    ...logs.map(log => {
      return [
        log.date || 'NA',
        log.sleep_quality ?? 'NA',
        log.summaryMetrics?.importedDuration ? (log.summaryMetrics.importedDuration / 60).toFixed(2) : 'NA',
        log.summaryMetrics?.sleep_efficiency ?? 'NA',
        log.factors?.caffeine?.amount ?? 'NA', // Placeholder for latency, need to check types
        log.factors?.caffeine?.amount ?? 'NA',
        log.factors?.alcohol?.drinks ?? 'NA',
        log.factors?.stressLevel ?? 'NA'
      ].join(',');
    })
  ].join('\n');

  downloadCSV(csvContent, 'daily_trends_summary.csv');
};

export const exportDeepEventLog = (logs: DailyLog[]) => {
  const headers = ['parent_date', 'event_type', 'start_time', 'end_time', 'duration_mins', 'is_interruption'];

  const csvContent = [
    headers.join(','),
    ...logs.flatMap(log => 
      (log.sleepEvents || []).map(event => [
        log.date || 'NA',
        event.type || 'NA',
        event.start || 'NA',
        event.end || 'NA',
        'NA', // Need calculation for duration
        event.type === 'awake-in' ? 'true' : 'false'
      ].join(','))
    )
  ].join('\n');

  downloadCSV(csvContent, 'deep_architecture_log.csv');
};

const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
