import { DailyLog, SleepState } from '../types';
import { parse, getDay, subDays, format, differenceInMinutes } from 'date-fns';
import { getGridFromEvents, indexToTime } from './sleepUtils';

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
 * Predicts sleep window and in-bed habit states (pre-sleep wind-down and morning wake latency)
 * snapped to 15-minute increments.
 */
export const generateSleepWindowSuggestion = (
  historicalLogs: DailyLog[],
  targetDate: string
): { 
  sleepEvents: import('../types').SleepEvent[]; 
  confidence: number; 
  reasons: string[]; 
  isStreak: boolean;
  preAwakeMinutes?: number;
  postAwakeMinutes?: number;
} => {
  const targetDay = getDay(parse(targetDate, 'yyyy-MM-dd', new Date()));
  const sortedLogs = [...historicalLogs].sort((a, b) => b.date.localeCompare(a.date));
  
  // 1. Prioritize day-of-week (last 2 occurrences)
  const sameDayLogs = sortedLogs.filter(log => getDay(parse(log.date, 'yyyy-MM-dd', new Date())) === targetDay);
  const relevantLogs = sameDayLogs.length >= 2 ? sameDayLogs.slice(0, 2) : sortedLogs.slice(0, 14);

  // Extract sleep and in-bed boundaries for each log
  const logProfiles = relevantLogs.map(l => {
    const timeline = l.sleepEvents ? getGridFromEvents(l.sleepEvents) : (l.timeline || []);
    const firstSleep = timeline.indexOf('sleep');
    const lastSleep = timeline.lastIndexOf('sleep');
    if (firstSleep === -1 || lastSleep === -1) return null;

    // Detect pre-sleep awake-in (consecutive awake-in slots immediately preceding firstSleep)
    let preAwakeSlots = 0;
    while (firstSleep - 1 - preAwakeSlots >= 0 && timeline[firstSleep - 1 - preAwakeSlots] === 'awake-in') {
      preAwakeSlots++;
    }

    // Detect post-sleep awake-in (consecutive awake-in slots immediately following lastSleep)
    let postAwakeSlots = 0;
    while (lastSleep + 1 + postAwakeSlots < 96 && timeline[lastSleep + 1 + postAwakeSlots] === 'awake-in') {
      postAwakeSlots++;
    }

    return {
      startSleep: firstSleep,
      endSleep: lastSleep + 1, // End slot boundary for the sleep segment
      preAwakeSlots,
      postAwakeSlots
    };
  }).filter((p): p is NonNullable<typeof p> => p !== null);

  if (logProfiles.length < 2) return { sleepEvents: [], confidence: 0, reasons: [], isStreak: false };

  // 2. Median calculation for Core Sleep
  const startSleeps = logProfiles.map(p => p.startSleep).sort((a, b) => a - b);
  const endSleeps = logProfiles.map(p => p.endSleep).sort((a, b) => a - b);
  
  const medianStartSleep = startSleeps[Math.floor(startSleeps.length / 2)];
  const medianEndSleep = endSleeps[Math.floor(endSleeps.length / 2)];

  // 3. Steady State Detection for Core Sleep (last 3 nights variance <= 1 slot)
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

  // 4. Pre-sleep and post-sleep awake-in habit detection
  // Threshold: present in >= 50% of logs (or both logs if sample is 2)
  const minRequiredCount = Math.max(2, Math.ceil(logProfiles.length * 0.5));
  
  const logsWithPreAwake = logProfiles.filter(p => p.preAwakeSlots > 0);
  let medianPreAwake = 0;
  if (logsWithPreAwake.length >= minRequiredCount || (logProfiles.length === 2 && logsWithPreAwake.length === 2)) {
    const sortedPre = logsWithPreAwake.map(p => p.preAwakeSlots).sort((a, b) => a - b);
    medianPreAwake = sortedPre[Math.floor(sortedPre.length / 2)];
  }

  const logsWithPostAwake = logProfiles.filter(p => p.postAwakeSlots > 0);
  let medianPostAwake = 0;
  if (logsWithPostAwake.length >= minRequiredCount || (logProfiles.length === 2 && logsWithPostAwake.length === 2)) {
    const sortedPost = logsWithPostAwake.map(p => p.postAwakeSlots).sort((a, b) => a - b);
    medianPostAwake = sortedPost[Math.floor(sortedPost.length / 2)];
  }

  const reasons: string[] = isStreak ? ['+ Perfect streak detected'] : ['+ Predicted based on recent schedule'];

  const sleepEvents: import('../types').SleepEvent[] = [];

  // 5. Build sequence of events
  // Pre-sleep awake-in (wind-down habit)
  if (medianPreAwake > 0) {
    const preStartSlot = Math.max(0, medianStartSleep - medianPreAwake);
    if (preStartSlot < medianStartSleep) {
      sleepEvents.push({
        id: 'suggested-awake-pre',
        type: 'awake-in',
        start: indexToTime(preStartSlot),
        end: indexToTime(medianStartSleep)
      });
      reasons.push(`+ ${medianPreAwake * 15}m pre-sleep wind-down recognized`);
    }
  }

  // Core sleep event
  sleepEvents.push({
    id: 'suggested-sleep-1',
    type: 'sleep',
    start: indexToTime(medianStartSleep),
    end: indexToTime(medianEndSleep)
  });

  // Post-sleep awake-in (morning lingering in bed habit)
  if (medianPostAwake > 0) {
    const postEndSlot = Math.min(96, medianEndSleep + medianPostAwake);
    if (postEndSlot > medianEndSleep) {
      sleepEvents.push({
        id: 'suggested-awake-post',
        type: 'awake-in',
        start: indexToTime(medianEndSleep),
        end: indexToTime(postEndSlot)
      });
      reasons.push(`+ ${medianPostAwake * 15}m morning in-bed habit recognized`);
    }
  }

  return {
    sleepEvents,
    confidence,
    reasons,
    isStreak,
    preAwakeMinutes: medianPreAwake * 15,
    postAwakeMinutes: medianPostAwake * 15
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

// Alcohol
const alcoholLogs = last3Logs.filter(l => l.factors?.alcohol?.consumed);
if (alcoholLogs.length >= 2) {
  const avgDrinks = Math.round(alcoholLogs.reduce((acc, l) => acc + (l.factors?.alcohol?.drinks || 0), 0) / alcoholLogs.length);
  suggestion.factors!.alcohol = {
    consumed: true,
    drinks: avgDrinks,
    lastIntake: alcoholLogs[0].factors?.alcohol?.lastIntake || '20:00',
    isStreak: true
  };
  confidenceMap['factors.alcohol'] = alcoholLogs.length / 3;
  reasons.push('+ Alcohol pattern detected');
} else {
  confidenceMap['factors.alcohol'] = 0.2;
}

// Exercise
const exerciseLogs = last14dLogs.filter(l => l.factors?.exercise?.completed);
const exerciseRate = exerciseLogs.length / Math.max(last14dLogs.length, 1);
if (exerciseRate >= 0.5) {
  const types = exerciseLogs.map(l => l.factors?.exercise?.type).filter(Boolean) as string[];
  const mostCommonType = types.sort((a, b) =>
    types.filter(v => v === b).length - types.filter(v => v === a).length
  )[0] || '';
  const times = exerciseLogs.map(l => l.factors?.exercise?.time).filter(Boolean) as string[];
  suggestion.factors!.exercise = { completed: true, type: mostCommonType, time: times[0] || '17:00' };
  confidenceMap['factors.exercise'] = exerciseRate;
  reasons.push('+ Exercise pattern detected');
} else {
  suggestion.factors!.exercise = { completed: false, type: '', time: '17:00' };
  confidenceMap['factors.exercise'] = 1 - exerciseRate;
}

// Last Meal Time
const mealTimeLogs = last14dLogs.filter(l => l.factors?.lastMealTime);
if (mealTimeLogs.length >= 5) {
  const avgMins = mealTimeLogs.reduce((acc, l) => {
    const [h, m] = (l.factors!.lastMealTime!).split(':').map(Number);
    return acc + h * 60 + m;
  }, 0) / mealTimeLogs.length;
  const h = Math.floor(avgMins / 60) % 24;
  const m = Math.round((avgMins % 60) / 15) * 15;
  suggestion.factors!.lastMealTime = `${String(h).padStart(2,'0')}:${String(m === 60 ? 0 : m).padStart(2,'0')}`;
  confidenceMap['factors.lastMealTime'] = mealTimeLogs.length / 14;
  reasons.push('+ Meal timing pattern detected');
} else {
  confidenceMap['factors.lastMealTime'] = 0;
}

// Natural Wake
const naturalWakeLogged = last14dLogs.filter(l => l.factors?.naturalWake !== null && l.factors?.naturalWake !== undefined);
if (naturalWakeLogged.length >= 5) {
  const naturalWakeRate = naturalWakeLogged.filter(l => l.factors?.naturalWake === true).length / naturalWakeLogged.length;
  suggestion.factors!.naturalWake = naturalWakeRate >= 0.6;
  confidenceMap['factors.naturalWake'] = Math.max(naturalWakeRate, 1 - naturalWakeRate);
  reasons.push('+ Wake pattern detected');
} else {
  confidenceMap['factors.naturalWake'] = 0;
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
  
  // Screens in Bed — boolean frequency
  const screensLogged = last14dLogs.filter(l => l.factors?.screensInBed !== null && l.factors?.screensInBed !== undefined);
  if (screensLogged.length >= 5) {
    const screensRate = screensLogged.filter(l => l.factors?.screensInBed === true).length / screensLogged.length;
    suggestion.factors!.screensInBed = screensRate >= 0.5;
    confidenceMap['factors.screensInBed'] = Math.max(screensRate, 1 - screensRate);
  } else {
    confidenceMap['factors.screensInBed'] = 0;
  }

  const factorKeys = Object.keys(suggestion.factors!).filter(key =>
    !['caffeine', 'alcohol', 'medication', 'exercise', 'sleepGadgets',
      'lastMealTime', 'naturalWake', 'screensInBed', 'isStreak'].includes(key)
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
