import { DailyLog } from '../types';

export const exportDailySummary = (logs: DailyLog[]) => {
  const headers = [
    'date', 'sleep_quality', 'morning_alertness', 'daytime_energy',
    'caffeine_consumed', 'caffeine_amount', 'alcohol_consumed', 'alcohol_drinks',
    'medication_taken', 'exercise_completed', 'screens_in_bed', 'stress_level',
    'last_meal_time', 'natural_wake', 'mood_score'
  ];

  const csvContent = [
    headers.join(','),
    ...logs.map(log => {
      return [
        log.date || 'NA',
        log.sleep_quality ?? 'NA',
        log.morning_alertness ?? 'NA',
        log.daytime_energy ?? 'NA',
        log.factors?.caffeine?.consumed ?? 'NA',
        log.factors?.caffeine?.amount ?? 'NA',
        log.factors?.alcohol?.consumed ?? 'NA',
        log.factors?.alcohol?.drinks ?? 'NA',
        log.factors?.medication?.taken ?? 'NA',
        log.factors?.exercise?.completed ?? 'NA',
        log.factors?.screensInBed ?? 'NA',
        log.factors?.stressLevel ?? 'NA',
        log.factors?.lastMealTime ?? 'NA',
        log.factors?.naturalWake ?? 'NA',
        log.factors?.moodScore ?? 'NA'
      ].join(',');
    })
  ].join('\n');

  downloadCSV(csvContent, 'tidy_trends.csv');
};

export const exportDeepEventLog = (logs: DailyLog[]) => {
  const headers = ['parent_date', 'event_type', 'start_time', 'end_time', 'duration_mins', 'is_interruption'];

  const csvContent = [
    headers.join(','),
    ...logs.flatMap(log => 
      (log.sleepEvents || []).map(event => {
        const start = new Date(`1970-01-01T${event.start}:00`);
        const end = new Date(`1970-01-01T${event.end}:00`);
        const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);
        return [
          log.date || 'NA',
          event.type || 'NA',
          event.start || 'NA',
          event.end || 'NA',
          durationMins || 'NA',
          event.type === 'awake-in' ? 'true' : 'false'
        ].join(',');
      })
    )
  ].join('\n');

  downloadCSV(csvContent, 'deep_architecture.csv');
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
