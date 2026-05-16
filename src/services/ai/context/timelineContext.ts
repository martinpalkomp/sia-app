import { DailyLog } from '../../../types';

export function getTimelineContext(logs: DailyLog[]) {
  let totalBedtimeMinutes = 0;
  let logsWithBedtime = 0;
  const bedtimes: number[] = [];

  logs.forEach(log => {
      if (log.sleepEvents && log.sleepEvents.length > 0) {
          const firstInBed = log.sleepEvents.find(e => e.type === 'sleep' || e.type === 'awake-in');
          if (firstInBed) {
              const [hours, minutes] = firstInBed.start.split(':').map(Number);
              let normalizedMinutes = (hours >= 20) ? (hours - 20) * 60 + minutes : (hours + 4) * 60 + minutes;
              totalBedtimeMinutes += normalizedMinutes;
              bedtimes.push(normalizedMinutes);
              logsWithBedtime++;
          }
      }
  });

  const avgBedtimeMinutes = logsWithBedtime > 0 ? totalBedtimeMinutes / logsWithBedtime : 0;
  let avgHours = Math.floor(avgBedtimeMinutes / 60) + 20;
  if (avgHours >= 24) avgHours -= 24;
  const avgMins = Math.floor(avgBedtimeMinutes % 60);
  const formattedAvgBedtime = `${String(avgHours).padStart(2, '0')}:${String(avgMins).padStart(2, '0')}`;

  let consistencyScore = 0;
  let bedtimeVariance = 0;
  if (bedtimes.length > 1) {
      const mean = avgBedtimeMinutes;
      bedtimeVariance = bedtimes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / bedtimes.length;
      const stdDev = Math.sqrt(bedtimeVariance);
      consistencyScore = Math.max(0, Math.min(100, 100 - (stdDev / 1.2)));
  }

  return { logsWithBedtime, consistencyScore, bedtimeVariance, formattedAvgBedtime };
}
