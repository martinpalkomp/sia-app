import { DailyLog, SleepState } from '../types';
import { parse, getDay, subDays, format } from 'date-fns';
import { getGridFromEvents } from './sleepUtils';

export interface SuggestionResult {
  suggestion: Partial<DailyLog>;
  confidenceMap: Record<string, number>;
  reasons: string[];
  hasSleepWindowSuggestion: boolean;
}

export interface AICorrection {
  date: string;
  field: string;
  suggestedValue: any;
  actualValue: any;
  timestamp: any;
}

/**
 * Predicts and snaps the sleep window to 15-minute increments.
 */
export const generateSleepWindowSuggestion = (
  historicalLogs: DailyLog[],
  targetDate: string
): { sleepEvents: import('../types').SleepEvent[]; confidence: number; reasons: string[] } => {
  const targetDay = getDay(parse(targetDate, 'yyyy-MM-dd', new Date()));
  const sortedLogs = [...historicalLogs].sort((a, b) => b.date.localeCompare(a.date));
  
  // 1. Prioritize day-of-week (last 2 occurrences)
  const sameDayLogs = sortedLogs.filter(log => getDay(parse(log.date, 'yyyy-MM-dd', new Date())) === targetDay);
  const relevantLogs = sameDayLogs.length >= 2 ? sameDayLogs.slice(0, 2) : sortedLogs.slice(0, 14);

  const sleepRanges = relevantLogs.map(l => {
    const timeline = l.sleepEvents ? getGridFromEvents(l.sleepEvents) : (l.timeline || []);
    const firstSleep = timeline.indexOf('sleep');
    const lastSleep = timeline.lastIndexOf('sleep');
    return { start: firstSleep, end: lastSleep };
  }).filter(r => r.start !== -1);

  if (sleepRanges.length < 2) return { sleepEvents: [], confidence: 0, reasons: [] };

  // 2. Median calculation and snapping
  const starts = sleepRanges.map(r => r.start).sort((a, b) => a - b);
  const ends = sleepRanges.map(r => r.end).sort((a, b) => a - b);
  
  const medianStart = starts[Math.floor(starts.length / 2)];
  const medianEnd = ends[Math.floor(ends.length / 2)];

  // 3. Variance Check (Standard Deviation > 45 mins = 3 slots)
  const variance = sleepRanges.reduce((acc, r) => acc + Math.pow(r.start - medianStart, 2), 0) / sleepRanges.length;
  const stdDevMinutes = Math.sqrt(variance) * 15;
  
  if (stdDevMinutes > 45) {
    return { sleepEvents: [], confidence: 0.3, reasons: ['Sleep window too variable'] };
  }

  // 4. Convert to HH:mm
  const slotToTime = (slot: number): string => {
    const totalMinutes = (20 * 60) + (slot * 15);
    const hours = Math.floor((totalMinutes / 60) % 24);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}`;
  };

  return {
    sleepEvents: [{
      id: 'suggested-sleep-1',
      type: 'sleep',
      start: slotToTime(medianStart),
      end: slotToTime(medianEnd)
    }],
    confidence: 0.9,
    reasons: ['+ Predicted based on recent schedule']
  };
};

/**
 * Identifies recurring user habits and suggests a log for the current day.
 */
export const getSuggestedLog = (
  historicalLogs: DailyLog[], 
  targetDate: string,
  corrections: AICorrection[] = []
): SuggestionResult => {
  if (historicalLogs.length < 3) {
    return { suggestion: {}, confidence: 0, reasons: ['Not enough history'], hasSleepWindowSuggestion: false };
  }

  const sortedLogs = [...historicalLogs].sort((a, b) => b.date.localeCompare(a.date));
  const last7Days = sortedLogs.filter(log => {
    const diff = Math.abs(new Date(targetDate).getTime() - new Date(log.date).getTime());
    return diff <= 7 * 24 * 60 * 60 * 1000;
  });

  // Filter corrections for the last 14 days to keep it relevant
  const recentCorrections = corrections.filter(c => {
    const diff = Math.abs(new Date(targetDate).getTime() - new Date(c.date).getTime());
    return diff <= 14 * 24 * 60 * 60 * 1000;
  });

  const targetDayOfWeek = getDay(parse(targetDate, 'yyyy-MM-dd', new Date()));
  const sameDayOfWeekLogs = sortedLogs.filter(log => 
    getDay(parse(log.date, 'yyyy-MM-dd', new Date())) === targetDayOfWeek
  );

  const suggestion: Partial<DailyLog> = {
    factors: {
      caffeine: { consumed: false, amount: 0, lastIntake: '14:00' },
      alcohol: { consumed: false, drinks: 0, lastIntake: '20:00' },
      medication: { taken: false, type: '', time: '22:00' },
      exercise: { completed: false, type: '', time: '17:00' },
      screensInBed: false,
      stressLevel: 3,
    },
    daily_remarks: '',
  };

  const reasons: string[] = [];
  const confidenceMap: Record<string, number> = {};
  
  // Helper to calculate confidence (0-1) based on history length
  const calculateConfidence = (count: number, total: number, minRequired: number) => {
    if (count < minRequired) return 0;
    return Math.min(1, count / total);
  };

  // Helper to get value considering corrections
  const getValueWithCorrections = (field: string, historicalValues: any[], defaultValue: any) => {
    const fieldCorrections = recentCorrections.filter(c => c.field === field);
    if (fieldCorrections.length > 0) {
      // Weigh corrections heavily - if there are 2+ recent corrections for this field, use the latest correction
      if (fieldCorrections.length >= 2) {
        return fieldCorrections.sort((a, b) => b.date.localeCompare(a.date))[0].actualValue;
      }
    }
    return getMode(historicalValues) || defaultValue;
  };

  // 1. Frequency Detection (Daily Constants from last 14 days)
  const last14Days = sortedLogs.filter(log => {
    const diff = Math.abs(new Date(targetDate).getTime() - new Date(log.date).getTime());
    return diff <= 14 * 24 * 60 * 60 * 1000;
  });

  if (last14Days.length >= 7) {
    // Caffeine
    const caffeineCount = last14Days.filter(l => l.factors?.caffeine?.consumed).length;
    const caffeineConf = calculateConfidence(caffeineCount, last14Days.length, 5);
    if (caffeineConf >= 0.6) {
      const avgAmount = Math.round(last14Days.reduce((acc, l) => acc + (l.factors?.caffeine?.amount || 0), 0) / caffeineCount);
      suggestion.factors!.caffeine = { 
        consumed: true, 
        amount: avgAmount, 
        lastIntake: getValueWithCorrections('factors.caffeine.lastIntake', last14Days.map(l => l.factors?.caffeine?.lastIntake).filter(Boolean), '14:00')
      };
      confidenceMap['factors.caffeine'] = caffeineConf;
      reasons.push(`+ Caffeine usage detected`);
    }

    // Alcohol (Daily Factor)
    const alcoholCount = last14Days.filter(l => l.factors?.alcohol?.consumed).length;
    const alcoholConf = calculateConfidence(alcoholCount, last14Days.length, 5);
    if (alcoholConf >= 0.6) {
        suggestion.factors!.alcohol = {
            consumed: true,
            drinks: Math.round(last14Days.reduce((acc, l) => acc + (l.factors?.alcohol?.drinks || 0), 0) / alcoholCount),
            lastIntake: getValueWithCorrections('factors.alcohol.lastIntake', last14Days.map(l => l.factors?.alcohol?.lastIntake).filter(Boolean), '20:00')
        };
        confidenceMap['factors.alcohol'] = alcoholConf;
        reasons.push(`+ Alcohol usage detected`);
    }

    // Stress Level (Daily Factor)
    const stressLevels = last14Days.map(l => l.factors?.stressLevel).filter((s): s is number => typeof s === 'number');
    if (stressLevels.length >= 7) {
        const avgStress = Math.round(stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length);
        suggestion.factors!.stressLevel = avgStress;
        confidenceMap['factors.stressLevel'] = 0.7; // Fixed confidence for average
        reasons.push(`+ Stress level baseline`);
    }

    // Screens in bed
    const screensCount = last14Days.filter(l => l.factors?.screensInBed).length;
    const screensConf = calculateConfidence(screensCount, last14Days.length, 5);
    if (screensConf >= 0.6) {
      suggestion.factors!.screensInBed = getValueWithCorrections('factors.screensInBed', last14Days.map(l => l.factors?.screensInBed), true);
      confidenceMap['factors.screensInBed'] = screensConf;
      reasons.push(`+ Screens in Bed habit`);
    }
    
    // Sleep Support Tools (last 10 logs)
    const last10Logs = sortedLogs.slice(0, 10);
    const gadgetCounts = new Map<string, number>();
    last10Logs.forEach(l => l.factors?.sleepGadgets?.forEach(g => gadgetCounts.set(g.type, (gadgetCounts.get(g.type) || 0) + 1)));
    
    const suggestedGadgets = Array.from(gadgetCounts.entries())
        .filter(([, count]) => count / last10Logs.length >= 0.7)
        .map(([type]) => ({ type }));
    
    if (suggestedGadgets.length > 0) {
        suggestion.factors!.sleepGadgets = suggestedGadgets as any;
        confidenceMap['factors.sleepGadgets'] = 0.8;
        reasons.push(`+ Sleep support tools detected`);
    }
  }

    // Daily Metrics (7-day average for that day of week)
    const sameDayMetrics = sameDayOfWeekLogs.filter(l => l.morning_alertness && l.daytime_energy);
    if (sameDayMetrics.length >= 2) {
        suggestion.morning_alertness = Math.round(sameDayMetrics.reduce((a, l) => a + (l.morning_alertness || 0), 0) / sameDayMetrics.length);
        suggestion.daytime_energy = Math.round(sameDayMetrics.reduce((a, l) => a + (l.daytime_energy || 0), 0) / sameDayMetrics.length);
        confidenceMap['morning_alertness'] = 0.7;
        confidenceMap['daytime_energy'] = 0.7;
        reasons.push(`+ Historical energy baseline for this day`);
    }

  // 2. Schedule Detection (Same day of week for 2+ weeks)
  const sleepWindow = generateSleepWindowSuggestion(sortedLogs, targetDate);
  if (sleepWindow.sleepEvents.length > 0 && sleepWindow.confidence >= 0.6) {
    suggestion.sleepEvents = sleepWindow.sleepEvents;
    confidenceMap['sleepEvents'] = sleepWindow.confidence;
    reasons.push(...sleepWindow.reasons);
  }

  const hasSleepWindowSuggestion = !!suggestion.sleepEvents && suggestion.sleepEvents.length > 0;

  return {
    suggestion,
    confidenceMap,
    reasons,
    hasSleepWindowSuggestion
  };
};

function getMode<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const counts = new Map<T, number>();
  let maxCount = 0;
  let mode: T = arr[0];

  for (const item of arr) {
    const count = (counts.get(item) || 0) + 1;
    counts.set(item, count);
    if (count > maxCount) {
      maxCount = count;
      mode = item;
    }
  }
  return mode;
}
