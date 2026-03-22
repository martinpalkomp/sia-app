import { DailyLog, SleepState } from '../types';
import { parse, getDay, subDays, format } from 'date-fns';
import { getGridFromEvents } from './sleepUtils';

export interface SuggestionResult {
  suggestion: Partial<DailyLog>;
  confidence: number;
  reasons: string[];
  hasSleepWindowSuggestion: boolean; // true if sleepEvents were predicted
}

export interface AICorrection {
  date: string;
  field: string;
  suggestedValue: any;
  actualValue: any;
  timestamp: any;
}

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
  let confidencePoints = 0;
  let totalPossiblePoints = 0;

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

  // 1. Frequency Detection (Daily Constants from last 7 days)
  if (last7Days.length >= 5) {
    totalPossiblePoints += 5;
    
    // Caffeine
    const caffeineCount = last7Days.filter(l => l.factors?.caffeine?.consumed).length;
    if (caffeineCount / last7Days.length >= 0.8) {
      const avgAmount = Math.round(last7Days.reduce((acc, l) => acc + (l.factors?.caffeine?.amount || 0), 0) / caffeineCount);
      const lastIntake = getValueWithCorrections(
        'factors.caffeine.lastIntake', 
        last7Days.map(l => l.factors?.caffeine?.lastIntake).filter(Boolean),
        '14:00'
      );
      
      suggestion.factors!.caffeine = { 
        consumed: true, 
        amount: avgAmount, 
        lastIntake
      };
      reasons.push(`+ ${avgAmount} Coffees (Daily Habit)`);
      confidencePoints += 1;
    }

    // Screens in bed
    const screensCount = last7Days.filter(l => l.factors?.screensInBed).length;
    if (screensCount / last7Days.length >= 0.8) {
      suggestion.factors!.screensInBed = getValueWithCorrections(
        'factors.screensInBed',
        last7Days.map(l => l.factors?.screensInBed),
        true
      );
      reasons.push(`+ Screens in Bed (Daily Habit)`);
      confidencePoints += 1;
    }

    // Last meal time suggestion (from last 7 days)
    const mealTimes = last7Days
      .map(l => l.factors?.lastMealTime)
      .filter((t): t is string => !!t);
    if (mealTimes.length >= 4) {
      suggestion.factors!.lastMealTime = getValueWithCorrections(
        'factors.lastMealTime', mealTimes, '19:30'
      );
      reasons.push(`+ Last meal ~${suggestion.factors!.lastMealTime}`);
      confidencePoints += 1;
    }

    // Natural wake suggestion (same day of week pattern)
    if (sameDayOfWeekLogs.length >= 3) {
      const naturalWakeCount = sameDayOfWeekLogs.filter(l => l.factors?.naturalWake).length;
      if (naturalWakeCount / sameDayOfWeekLogs.length >= 0.7) {
        suggestion.factors!.naturalWake = true;
        reasons.push(`+ Natural wake (typical for this day)`);
      }
    }

    // Morning mood baseline (7-day average)
    const moodScores = last7Days
      .map(l => l.factors?.moodScore)
      .filter((m): m is number => typeof m === 'number');
    if (moodScores.length >= 4) {
      const avgMood = Math.round(moodScores.reduce((a, b) => a + b, 0) / moodScores.length);
      suggestion.factors!.moodScore = avgMood;
    }

    // Stress level baseline (7-day average, only if consistent)
    const stressLevels = last7Days
      .map(l => l.factors?.stressLevel)
      .filter((s): s is number => typeof s === 'number');
    if (stressLevels.length >= 5) {
      const avgStress = Math.round(stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length);
      suggestion.factors!.stressLevel = avgStress;
    }

    // Medication suggestion (same day of week)
    if (sameDayOfWeekLogs.length >= 3) {
      const medCount = sameDayOfWeekLogs.filter(l => l.factors?.medication?.taken).length;
      if (medCount / sameDayOfWeekLogs.length >= 0.8) {
        const modeType = getValueWithCorrections(
          'factors.medication.type',
          sameDayOfWeekLogs.map(l => l.factors?.medication?.type).filter(Boolean),
          ''
        );
        const modeTime = getValueWithCorrections(
          'factors.medication.time',
          sameDayOfWeekLogs.map(l => l.factors?.medication?.time).filter(Boolean),
          '22:00'
        );
        suggestion.factors!.medication = { taken: true, type: modeType, time: modeTime };
        reasons.push(`+ ${modeType || 'Medication'} (Weekly Pattern)`);
        confidencePoints += 1;
      }
    }
  }

  // 2. Schedule Detection (Same day of week for 3+ weeks)
  if (sameDayOfWeekLogs.length >= 3) {
    totalPossiblePoints += 5;
    
    // Exercise on this specific day
    const exerciseCount = sameDayOfWeekLogs.filter(l => l.factors?.exercise?.completed).length;
    if (exerciseCount / sameDayOfWeekLogs.length >= 0.75) {
      const modeType = getValueWithCorrections(
        'factors.exercise.type',
        sameDayOfWeekLogs.map(l => l.factors?.exercise?.type).filter(Boolean),
        'Exercise'
      );
      const modeTime = getValueWithCorrections(
        'factors.exercise.time',
        sameDayOfWeekLogs.map(l => l.factors?.exercise?.time).filter(Boolean),
        '17:00'
      );
      
      suggestion.factors!.exercise = { 
        completed: true, 
        type: modeType, 
        time: modeTime 
      };
      reasons.push(`+ ${modeType || 'Gym'} Schedule`);
      confidencePoints += 2;
    }

    // Typical Bedtime/Wake time
    const sleepRanges = sameDayOfWeekLogs.map(l => {
      const timeline = l.sleepEvents ? getGridFromEvents(l.sleepEvents) : (l.timeline || []);
      const firstSleep = timeline.indexOf('sleep');
      const lastSleep = timeline.lastIndexOf('sleep');
      return { start: firstSleep, end: lastSleep };
    }).filter(r => r.start !== -1);

    if (sleepRanges.length >= 3) {
      const avgStart = Math.round(sleepRanges.reduce((acc, r) => acc + r.start, 0) / sleepRanges.length);
      const avgEnd = Math.round(sleepRanges.reduce((acc, r) => acc + r.end, 0) / sleepRanges.length);
      
      // Convert slot indices back to HH:mm times for sleepEvents
      const slotToTime = (slot: number): string => {
        const totalMinutes = (20 * 60) + (slot * 15); // 20:00 base
        const hours = Math.floor((totalMinutes / 60) % 24);
        const mins = totalMinutes % 60;
        return `${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}`;
      };

      // Also detect typical AWAKE-IN patterns (pre-sleep restlessness)
      const awakeInRanges = sameDayOfWeekLogs
        .map(l => l.sleepEvents?.filter(ev => ev.type === 'awake-in') ?? [])
        .filter(evs => evs.length > 0);

      const suggestedEvents: import('../types').SleepEvent[] = [];

      // Add pre-sleep awake-in if user typically has one (>60% of same-day logs)
      if (awakeInRanges.length / sameDayOfWeekLogs.length >= 0.6) {
        const typicalAwakeIn = awakeInRanges[0][0]; // use most recent as template
        if (typicalAwakeIn) {
          suggestedEvents.push({
            id: 'suggested-awake-1',
            type: 'awake-in',
            start: typicalAwakeIn.start,
            end: typicalAwakeIn.end
          });
          reasons.push(`+ Pre-sleep restless period (~${typicalAwakeIn.start})`);
        }
      }

      // Main sleep event
      suggestedEvents.push({
        id: 'suggested-sleep-1',
        type: 'sleep',
        start: slotToTime(avgStart),
        end: slotToTime(avgEnd)
      });

      suggestion.sleepEvents = suggestedEvents;
      reasons.push(`+ ${slotToTime(avgStart)} Bedtime`);
      confidencePoints += 2;
    }
  }

  const confidence = totalPossiblePoints > 0 ? confidencePoints / totalPossiblePoints : 0;
  const hasSleepWindowSuggestion = !!suggestion.sleepEvents && suggestion.sleepEvents.length > 0;

  return {
    suggestion,
    confidence,
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
