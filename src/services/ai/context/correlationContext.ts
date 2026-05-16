import { DailyLog } from '../../../types';
import { parseISO } from 'date-fns';

const getPriorityLabel = (dateStr: string) => {
  const diff = Math.floor((new Date().getTime() - parseISO(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 3) return '[HIGH PRIORITY]';
  if (diff <= 7) return '[MEDIUM PRIORITY]';
  return '[LOW PRIORITY]';
};

export function getCorrelationContext(logs: DailyLog[]) {
  const correlations: string[] = [];
  logs.slice(0, 7).forEach(log => {
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

  const anomalies: string[] = [];
  logs.forEach(log => {
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

  return { correlations, anomalies };
}
