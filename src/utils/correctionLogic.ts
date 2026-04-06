import { DailyLog } from '../types';
import { isAfter, parseISO, startOfDay } from 'date-fns';

export const calculateLogVitality = (log: DailyLog): number => {
  let score = 0;

  // Timeline (40 pts)
  if (log.sleepEvents && log.sleepEvents.length > 0) {
    score += 40;
  }

  // Sleep Window (30 pts)
  if (log.sleepEvents && log.sleepEvents.some(e => e.type === 'sleep')) {
    score += 30;
  }

  // Core Metrics (20 pts)
  if (typeof log.sleep_quality === 'number' && log.sleep_quality > 0) score += 10;
  if (typeof log.morning_alertness === 'number' && log.morning_alertness > 0) score += 5;
  if (typeof log.daytime_energy === 'number' && log.daytime_energy > 0) score += 5;

  // Factors (10 pts)
  if (log.factors) {
    let factorsLogged = 0;
    if (log.factors.caffeine?.consumed != null) factorsLogged++;
    if (log.factors.alcohol?.consumed != null) factorsLogged++;
    if (log.factors.medication?.taken != null) factorsLogged++;
    if (log.factors.exercise?.completed != null) factorsLogged++;
    if (log.factors.screensInBed != null) factorsLogged++;
    if (log.factors.stressLevel != null) factorsLogged++;
    if (log.factors.lastMealTime) factorsLogged++;
    if (log.factors.naturalWake != null) factorsLogged++;
    if (log.factors.moodScore != null) factorsLogged++;
    if (log.factors.sleepGadgets && log.factors.sleepGadgets.length > 0) factorsLogged++;

    if (factorsLogged >= 3) {
      score += 10;
    }
  }

  return score;
};

export const getPendingCorrections = (logs: Record<string, DailyLog>, trackingStartDate: string) => {
  const start = startOfDay(parseISO(trackingStartDate));
  
  return (Object.values(logs) as DailyLog[])
    .filter((log: DailyLog) => {
      const logDate = parseISO(log.date);
      const isAfterStart = isAfter(logDate, start) || log.date === trackingStartDate;
      const isNotIgnored = !log.isIgnored;
      
      const vitalityScore = calculateLogVitality(log);
      
      return isAfterStart && isNotIgnored && vitalityScore < 70;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
};
