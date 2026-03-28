import { DailyLog } from '../types';

export const calculateLogVitality = (log: DailyLog): number => {
  let score = 0;

  // Timeline (40 pts)
  if (log.sleepEvents && log.sleepEvents.length > 1) {
    score += 40;
  }

  // Sleep Window (30 pts)
  if (typeof log.bedTime === 'string' && log.bedTime.length > 0 && 
      typeof log.wakeTime === 'string' && log.wakeTime.length > 0) {
    score += 30;
  }

  // Core Metrics (20 pts)
  if (typeof log.sleep_quality === 'number') score += 10;
  if (typeof log.morning_alertness === 'number') score += 5;
  if (typeof log.daytime_energy === 'number') score += 5;

  // Factors (10 pts)
  if (log.factors) {
    let factorsLogged = 0;
    if (log.factors.caffeine?.consumed !== null) factorsLogged++;
    if (log.factors.alcohol?.consumed !== null) factorsLogged++;
    if (log.factors.medication?.taken !== null) factorsLogged++;
    if (log.factors.exercise?.completed !== null) factorsLogged++;
    if (log.factors.screensInBed !== null) factorsLogged++;
    if (log.factors.stressLevel !== null) factorsLogged++;
    if (log.factors.lastMealTime) factorsLogged++;
    if (log.factors.naturalWake !== null) factorsLogged++;
    if (log.factors.moodScore !== null) factorsLogged++;
    if (log.factors.sleepGadgets && log.factors.sleepGadgets.length > 0) factorsLogged++;

    if (factorsLogged >= 3) {
      score += 10;
    }
  }

  return score;
};
