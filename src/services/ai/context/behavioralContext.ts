import { DailyLog } from '../../../types';

export function getBehavioralContext(logs: DailyLog[]) {
  const weeklyRemarks: string[] = [];
  logs.slice(0, 7).forEach(log => {
      if (log.daily_remarks) {
          weeklyRemarks.push(`[${log.date}] ${log.daily_remarks}`);
      }
  });
  return weeklyRemarks;
}
