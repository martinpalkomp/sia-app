import { DailyLog, PersonalizationProfile } from '../types';
// Note: parseISO and differenceInMinutes are imported as requested, 
// though the current implementation uses manual splitting for time calculations.
// Keeping them for potential future use or if the user expects them to be there.
import { parseISO, differenceInMinutes } from 'date-fns';
import { calculateAge } from './dateUtils';

/**
 * Calculates the fragmentation index, which is the number of sleep interruptions per hour.
 * @param log - The daily sleep log.
 * @returns The fragmentation index rounded to 2 decimal places.
 */
export const calculateFragmentationIndex = (log: DailyLog): number => {
  const awakeInEvents = log.sleepEvents?.filter(e => e.type === 'awake-in').length ?? 0;
  const totalHours = calculateTotalSleepHours(log);
  return totalHours > 0 ? parseFloat((awakeInEvents / totalHours).toFixed(2)) : 0;
};

/**
 * Calculates the total sleep hours from the sleep events in the log.
 * @param log - The daily sleep log.
 * @returns The total sleep hours rounded to 2 decimal places.
 */
export const calculateTotalSleepHours = (log: DailyLog): number => {
  const sleepEvents = log.sleepEvents?.filter(e => e.type === 'sleep') ?? [];
  const totalMinutes = sleepEvents.reduce((acc, ev) => {
    const [sh, sm] = ev.start.split(':').map(Number);
    const [eh, em] = ev.end.split(':').map(Number);
    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (endMin < startMin) endMin += 24 * 60; // overnight
    return acc + (endMin - startMin);
  }, 0);
  return parseFloat((totalMinutes / 60).toFixed(2));
};

/**
 * Calculates social jetlag, which is the difference in sleep midpoint between the current log and the 7-day average.
 * @param log - The current daily sleep log.
 * @param recentLogs - An array of recent daily sleep logs.
 * @returns The social jetlag in hours rounded to 2 decimal places.
 */
export const calculateSocialJetlag = (log: DailyLog, recentLogs: DailyLog[]): number => {
  const getMidpoint = (l: DailyLog): number => {
    const sleepEvent = l.sleepEvents?.find(e => e.type === 'sleep');
    if (!sleepEvent) return 0;
    const [sh, sm] = sleepEvent.start.split(':').map(Number);
    const [eh, em] = sleepEvent.end.split(':').map(Number);
    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (endMin < startMin) endMin += 24 * 60;
    return (startMin + endMin) / 2;
  };
  const relevantLogs = recentLogs;
  if (relevantLogs.length === 0) return 0;
  
  const avgMidpoint = relevantLogs.reduce((acc, l) => acc + getMidpoint(l), 0) / relevantLogs.length;
  return parseFloat((Math.abs(getMidpoint(log) - avgMidpoint) / 60).toFixed(2));
};

/**
 * Calculates the metabolic gap, which is the hours between the last meal and the first sleep event.
 * @param log - The daily sleep log.
 * @returns The metabolic gap in hours rounded to 2 decimal places, or null if data is missing.
 */
export const calculateMetabolicGap = (log: DailyLog): number | null => {
  if (!log.factors?.lastMealTime) return null;
  const sleepEvent = log.sleepEvents?.find(e => e.type === 'sleep');
  if (!sleepEvent) return null;
  const [mh, mm] = log.factors.lastMealTime.split(':').map(Number);
  const [sh, sm] = sleepEvent.start.split(':').map(Number);
  let mealMin = mh * 60 + mm;
  let sleepMin = sh * 60 + sm;
  if (sleepMin < mealMin) sleepMin += 24 * 60;
  return parseFloat(((sleepMin - mealMin) / 60).toFixed(2));
};

/**
 * Calculates the bedtime consistency score, which is the standard deviation of bedtime over the provided logs.
 * @param logs - An array of daily sleep logs.
 * @returns The consistency score in hours rounded to 2 decimal places.
 */
export const calculateBedtimeConsistency = (logs: DailyLog[]): number => {
  const bedtimes = logs.map(l => {
    const ev = l.sleepEvents?.find(e => e.type === 'sleep');
    if (!ev) return null;
    const [h, m] = ev.start.split(':').map(Number);
    return h * 60 + m;
  }).filter((v): v is number => v !== null);
  
  if (bedtimes.length < 2) return 0;
  const mean = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
  const variance = bedtimes.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / bedtimes.length;
  return parseFloat((Math.sqrt(variance) / 60).toFixed(2)); // in hours
};

export interface DiagnosticSummary {
  fragmentationIndex: number;
  totalSleepHours: number;
  socialJetlagHours: number;
  metabolicGapHours: number | null;
  bedtimeConsistencyHours: number;
  naturalWake: boolean | null;
  moodScore: number | null;
  currentAge: number;
  country: string | null;
  gadgetsUsedLastNight: string[];
  lightTherapyMorningRate: number; // % of logs with morning light therapy
}

/**
 * Builds a complete diagnostic summary for a given log and history.
 * @param log - The current daily sleep log.
 * @param recentLogs - An array of recent daily sleep logs.
 * @param profile - Optional personalization profile.
 * @returns A DiagnosticSummary object.
 */
export const buildDiagnosticSummary = (log: DailyLog, recentLogs: DailyLog[], profile?: PersonalizationProfile): DiagnosticSummary => ({
  fragmentationIndex: calculateFragmentationIndex(log),
  totalSleepHours: calculateTotalSleepHours(log),
  socialJetlagHours: calculateSocialJetlag(log, recentLogs),
  metabolicGapHours: calculateMetabolicGap(log),
  bedtimeConsistencyHours: calculateBedtimeConsistency(recentLogs),
  naturalWake: log.factors?.naturalWake ?? null,
  moodScore: log.factors?.moodScore ?? null,
  currentAge: profile?.demographics?.dateOfBirth
    ? calculateAge(profile.demographics.dateOfBirth)
    : 0,
  country: profile?.demographics?.country ?? null,
  gadgetsUsedLastNight: log.factors?.sleepGadgets?.map(g => g.type) ?? [],
  lightTherapyMorningRate: (() => {
    const ltLogs = recentLogs.filter(l => l.factors?.sleepGadgets?.some(g => g.type === 'light_therapy' && g.timeOfUse === 'morning'));
    return recentLogs.length > 0 ? Math.round((ltLogs.length / recentLogs.length) * 100) : 0;
  })(),
});
