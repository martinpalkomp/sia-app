import { DailyLog } from '../types';

const formatValue = (val: any) => {
  if (val === null || val === undefined || val === '') return 'NA';
  return val;
};

const formatTime = (time: string | undefined | null) => {
  if (!time) return 'NA';
  // If time is HH:mm, convert to HH:mm:ss
  if (time.match(/^\d{2}:\d{2}$/)) return `${time}:00`;
  return time;
};

export const exportDailySummary = (logs: DailyLog[]) => {
  const headers = [
    'date', 'primary_bedtime', 'sleep_quality', 'morning_alertness', 'daytime_energy',
    'caffeine_consumed', 'caffeine_amount', 'alcohol_consumed', 'alcohol_drinks',
    'medication_taken', 'exercise_completed', 'screens_in_bed', 'stress_level',
    'last_meal_time', 'natural_wake', 'mood_score'
  ];

  const csvContent = [
    headers.join(','),
    ...logs.map(log => {
      const firstSleepEvent = (log.sleepEvents || []).find(e => e.type === 'sleep');
      const primaryBedtime = firstSleepEvent ? formatTime(firstSleepEvent.start) : 'NA';

      return [
        formatValue(log.date),
        primaryBedtime,
        formatValue(log.sleep_quality),
        formatValue(log.morning_alertness),
        formatValue(log.daytime_energy),
        formatValue(log.factors?.caffeine?.consumed),
        formatValue(log.factors?.caffeine?.amount),
        formatValue(log.factors?.alcohol?.consumed),
        formatValue(log.factors?.alcohol?.drinks),
        formatValue(log.factors?.medication?.taken),
        formatValue(log.factors?.exercise?.completed),
        formatValue(log.factors?.screensInBed),
        formatValue(log.factors?.stressLevel),
        formatTime(log.factors?.lastMealTime),
        formatValue(log.factors?.naturalWake),
        formatValue(log.factors?.moodScore)
      ].join(',');
    })
  ].join('\n');

  downloadCSV(csvContent, 'daily_trends_summary.csv');
};

export const exportDeepEventLog = (logs: DailyLog[]) => {
  const headers = ['date', 'event_type', 'start_time', 'end_time', 'duration_mins', 'is_interruption'];

  const csvContent = [
    headers.join(','),
    ...logs.flatMap(log => 
      (log.sleepEvents || []).map(event => {
        const start = new Date(`1970-01-01T${event.start}:00`);
        const end = new Date(`1970-01-01T${event.end}:00`);
        const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);
        return [
          formatValue(log.date),
          formatValue(event.type),
          formatTime(event.start),
          formatTime(event.end),
          formatValue(durationMins),
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
