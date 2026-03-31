import { DailyLog, SleepState } from '../types';
import { parse, getDay, subDays, format, differenceInMinutes } from 'date-fns';
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

const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const calculateRecencyScore = (logs: DailyLog[], path: string, days = 5): { score: number, isStreak: boolean } => {
  const recentLogs = logs.slice(0, days);
  const count = recentLogs.filter(l => getNestedValue(l, path)).length;
  const score = count / Math.min(recentLogs.length, days);
  return { score, isStreak: count >= 3 };
};

/**
 * Predicts and snaps the sleep window to 15-minute increments.
 */
export const generateSleepWindowSuggestion = (
  historicalLogs: DailyLog[],
  targetDate: string
): { sleepEvents: import('../types').SleepEvent[]; confidence: number; reasons: string[], isStreak: boolean } => {
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

  if (sleepRanges.length < 2) return { sleepEvents: [], confidence: 0, reasons: [], isStreak: false };

  // 2. Median calculation and snapping
  const starts = sleepRanges.map(r => r.start).sort((a, b) => a - b);
  const ends = sleepRanges.map(r => r.end).sort((a, b) => a - b);
  
  const medianStart = starts[Math.floor(starts.length / 2)];
  const medianEnd = ends[Math.floor(ends.length / 2)];
  
  // 3. Steady State Detection (last 3 nights variance < 15 mins = 1 slot)
  const last3Logs = sortedLogs.slice(0, 3);
  const bedTimes = last3Logs.map(l => {
    const timeline = l.sleepEvents ? getGridFromEvents(l.sleepEvents) : (l.timeline || []);
    return timeline.indexOf('sleep');
  }).filter(t => t !== -1);
  
  let isStreak = false;
  let confidence = 0.9;
  if (bedTimes.length >= 3) {
    const variance = Math.max(...bedTimes) - Math.min(...bedTimes);
    if (variance <= 1) { // 1 slot = 15 mins
      isStreak = true;
      confidence = 0.95;
    }
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
    confidence,
    reasons: isStreak ? ['+ Perfect streak detected'] : ['+ Predicted based on recent schedule'],
    isStreak
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
    return { suggestion: {}, confidenceMap: {}, reasons: ['Not enough history'], hasSleepWindowSuggestion: false };
  }

  const sortedLogs = [...historicalLogs].sort((a, b) => b.date.localeCompare(a.date));
  
  const suggestion: Partial<DailyLog> = {
    factors: {
      caffeine: { consumed: false, amount: 0, lastIntake: '09:00' },
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
  
  const last14dLogs = sortedLogs.slice(0, 14);
  
  // 1. Substances (Caffeine/Alcohol) - Forgiveness Logic
  const last3Logs = sortedLogs.slice(0, 3);
  
  // Caffeine
  const caffeineLogs = last3Logs.filter(l => l.factors?.caffeine?.consumed);
  if (caffeineLogs.length >= 2) {
    const times = caffeineLogs.map(l => parse(l.factors?.caffeine?.lastIntake || '09:00', 'HH:mm', new Date()));
    const variance = Math.max(...times.map(t => t.getTime())) - Math.min(...times.map(t => t.getTime()));
    if (variance <= 60 * 60 * 1000) { // 60 mins
      const avgAmount = Math.round(caffeineLogs.reduce((acc, l) => acc + (l.factors?.caffeine?.amount || 0), 0) / caffeineLogs.length);
      suggestion.factors!.caffeine = {
        consumed: true,
        amount: avgAmount,
        lastIntake: format(times[0], 'HH:mm'),
        isStreak: true
      };
      confidenceMap['factors.caffeine'] = 0.9;
      reasons.push(`+ Steady caffeine intake detected`);
    }
  }

  // 2. Sleep Support Tools (Dynamic Prediction)
  const allGadgetTypes = new Set<string>();
  last14dLogs.forEach(l => l.factors?.sleepGadgets?.forEach(g => allGadgetTypes.add(g.type)));
  
  suggestion.factors!.sleepGadgets = Array.from(allGadgetTypes).filter(type => {
    const usageCount = last14dLogs.filter(l => l.factors?.sleepGadgets?.some(g => g.type === type)).length;
    return (usageCount / last14dLogs.length) > 0.5;
  }).map(type => ({ type: type as any }));
  
  confidenceMap['factors.sleepGadgets'] = Array.from(allGadgetTypes).length > 0 
    ? last14dLogs.filter(l => l.factors?.sleepGadgets && l.factors.sleepGadgets.length > 0).length / last14dLogs.length
    : 1;
  
  // 3. Daily Metrics (Weighted Moving Average)
  
  const calculateWMA = (path: string) => {
    const values = last14dLogs.map(l => Number(getNestedValue(l, path))).filter(v => !isNaN(v));
    if (values.length === 0) return 5; // Baseline fallback
    return Math.round(values.reduce((acc, val) => acc + val, 0) / values.length);
  };
  
  const calculateConfidence = (path: string) => {
    const hasData = last14dLogs.filter(l => getNestedValue(l, path) !== undefined && getNestedValue(l, path) !== null).length;
    return Math.min(1, hasData / 14);
  };
  
  // Dynamically process all factors
  const baseFactorPaths = [
    'sleep_quality',
    'morning_alertness',
    'daytime_energy'
  ];
  
  const factorKeys = Object.keys(suggestion.factors!).filter(key => 
    !['caffeine', 'alcohol', 'medication', 'exercise', 'sleepGadgets', 'lastMealTime', 'isStreak'].includes(key)
  );
  
  const factorPaths = [
    ...baseFactorPaths,
    ...factorKeys.map(key => `factors.${key}`)
  ];

  factorPaths.forEach(path => {
    const val = calculateWMA(path);
    const confidence = calculateConfidence(path);
    
    if (path.startsWith('factors.')) {
      const factorName = path.split('.')[1] as keyof typeof suggestion.factors;
      (suggestion.factors as any)[factorName] = val;
    } else {
      (suggestion as any)[path] = val;
    }
    confidenceMap[path] = confidence;
  });
  const sleepWindow = generateSleepWindowSuggestion(sortedLogs, targetDate);
  if (sleepWindow.sleepEvents.length > 0) {
    suggestion.sleepEvents = sleepWindow.sleepEvents;
    confidenceMap['sleepEvents'] = sleepWindow.confidence;
    reasons.push(...sleepWindow.reasons);
    // Add isStreak to sleepEvents? The prompt says "for each factor"
    // I will add it to the suggestion object itself.
    suggestion.factors!.isStreak = sleepWindow.isStreak;
  }

  return {
    suggestion,
    confidenceMap,
    reasons,
    hasSleepWindowSuggestion: !!suggestion.sleepEvents && suggestion.sleepEvents.length > 0
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
