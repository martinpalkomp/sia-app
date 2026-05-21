export type InsightSignal = 
  | 'detectWakeDrift'
  | 'detectShortSleep'
  | 'detectFragmentation'
  | 'detectLateBedtime'
  | 'detectHighStress'
  | 'detectNoExercise'
  | 'detectScreenUse'
  | 'detectLongSleepLatency'
  | 'detectInconsistentDuration'
  | 'detectWeekendShift'
  | 'detectPoorEfficiency'
  | 'detectFrequentAwakenings'
  | 'detectLowEnergy'
  | 'detectNapDependency'
  | 'detectLateCaffeine'
  | 'detectPoorEnvironment'
  | 'detectRecoveryTrend'
  | 'detectImprovementTrend'
  | 'default';

export interface QuickInsight {
  id: string;
  theme: string;
  signal: InsightSignal;
  fact: string;
}

export const QUICK_INSIGHTS_DB: QuickInsight[] = [
  {
    id: 'qi_1',
    theme: 'CIRCADIAN RHYTHM',
    signal: 'detectWakeDrift',
    fact: 'Wake-time consistency is one of the strongest predictors of stable sleep quality and daytime alertness.',
  },
  {
    id: 'qi_2',
    theme: 'SLEEP DEBT',
    signal: 'detectShortSleep',
    fact: 'Even moderate sleep restriction accumulates across days and can impair cognition before fatigue becomes noticeable.',
  },
  {
    id: 'qi_3',
    theme: 'LIGHT EXPOSURE',
    signal: 'detectScreenUse',
    fact: 'Morning sunlight suppresses residual melatonin and helps anchor circadian timing for the rest of the day.',
  },
  {
    id: 'qi_4',
    theme: 'THERMAL REGULATION',
    signal: 'detectPoorEnvironment',
    fact: 'A slight drop in core body temperature is required for sleep onset. Cooler environments support this transition.',
  },
  {
    id: 'qi_5',
    theme: 'SLEEP CONTINUITY',
    signal: 'detectFragmentation',
    fact: 'Frequent awakenings reduce restorative deep sleep even when total sleep duration appears sufficient.',
  },
  {
    id: 'qi_6',
    theme: 'CAFFEINE',
    signal: 'detectLateCaffeine',
    fact: 'Caffeine can remain physiologically active for up to 10 hours after consumption.',
  },
  {
    id: 'qi_7',
    theme: 'SOCIAL JETLAG',
    signal: 'detectWeekendShift',
    fact: 'Large differences between weekday and weekend sleep schedules can disrupt circadian stability.',
  },
  {
    id: 'qi_8',
    theme: 'EXERCISE',
    signal: 'detectNoExercise',
    fact: 'Regular physical activity is associated with improved sleep efficiency and reduced sleep latency.',
  },
  {
    id: 'qi_9',
    theme: 'DIGITAL SUNSET',
    signal: 'detectScreenUse',
    fact: 'Bright light exposure in the evening delays melatonin release and shifts sleep timing later.',
  },
  {
    id: 'qi_10',
    theme: 'SLEEP PRESSURE',
    signal: 'detectNapDependency',
    fact: 'Long daytime naps can reduce evening sleep pressure and delay nighttime sleep onset.',
  },
  {
    id: 'qi_11',
    theme: 'RECOVERY',
    signal: 'detectRecoveryTrend',
    fact: 'Consistent recovery patterns are often more valuable than occasional "perfect" nights of sleep.',
  },
  {
    id: 'qi_12',
    theme: 'FRAGMENTATION',
    signal: 'detectFrequentAwakenings',
    fact: 'Sleep fragmentation is strongly associated with reduced next-day energy and cognitive performance.',
  },
  {
    id: 'qi_13',
    theme: 'ENVIRONMENT',
    signal: 'detectPoorEnvironment',
    fact: 'Quiet sleep environments reduce micro-arousals that often occur without conscious awareness.',
  },
  {
    id: 'qi_14',
    theme: 'STRESS',
    signal: 'detectHighStress',
    fact: 'Elevated stress increases physiological arousal and commonly prolongs sleep onset latency.',
  },
  {
    id: 'qi_15',
    theme: 'CIRCADIAN ALIGNMENT',
    signal: 'detectLateBedtime',
    fact: 'Your biological night begins before you feel fully sleepy. Delaying sleep repeatedly can shift this timing later.',
  },
  {
    id: 'qi_16',
    theme: 'EFFICIENCY',
    signal: 'detectPoorEfficiency',
    fact: 'High sleep efficiency generally indicates strong sleep consolidation and stable sleep pressure.',
  },
  {
    id: 'qi_17',
    theme: 'CONSISTENCY',
    signal: 'detectInconsistentDuration',
    fact: 'Sleep regularity predicts long-term recovery more reliably than single-night duration alone.',
  },
  {
    id: 'qi_18',
    theme: 'TRACKERS',
    signal: 'default',
    fact: 'Wearables are most useful for identifying long-term trends rather than interpreting individual nights.',
  },
  {
    id: 'qi_19',
    theme: 'RECOVERY WINDOW',
    signal: 'detectLongSleepLatency',
    fact: 'The final hours of sleep are disproportionately important for REM-rich recovery processes.',
  },
  {
    id: 'qi_20',
    theme: 'WIND-DOWN',
    signal: 'detectHighStress',
    fact: 'Reducing cognitive stimulation before bed helps transition the nervous system toward parasympathetic dominance.',
  }
];

export function determinePrimarySignal(logs: any): InsightSignal {
  if (!logs) return 'default';
  
  const logsArray = Array.isArray(logs) ? logs : Object.values(logs);
  if (logsArray.length === 0) return 'default';
  
  // Basic heuristics over the last 14 days (or fewer)
  const recentLogs = logsArray.slice(0, 14);
  
  let totalLogs = recentLogs.length;
  let shortSleeps = 0;
  let highStress = 0;
  let noExercise = 0;
  let fragmentation = 0;
  let poorEnv = 0;
  
  recentLogs.forEach(log => {
      // Calculate duration manually if visualTimeline exists to be safe, otherwise it's just a heuristic
      let durationMins = log.duration || 420; // Default to 7 hours if unknown
      if (log.visualTimeline) {
          const sleepSegments = log.visualTimeline.filter((s: any) => s.state === 'asleep' || s.state === 'deep' || s.state === 'rem' || s.state === 'light');
          durationMins = sleepSegments.length * 15; // 15 mins per segment
      }

      const interruptions = (log.visualTimeline || []).filter((s: any) => s.state === 'awake').length;

      if (durationMins < 420) shortSleeps++; // < 7 hours
      if (log.lifestyle?.stress > 7) highStress++;
      if (log.lifestyle?.exercise === 0 || log.lifestyle?.exercise === false) noExercise++;
      if (interruptions >= 2) fragmentation++;
      
      const hasAlcohol = log.lifestyle?.alcohol > 0;
      const lateScreens = log.lifestyle?.screenTime === 1; // Assuming 1 means high / late screen
      
      if (hasAlcohol || lateScreens) poorEnv++;
  });
  
  if (shortSleeps / totalLogs > 0.4) return 'detectShortSleep';
  if (highStress / totalLogs > 0.4) return 'detectHighStress';
  if (noExercise / totalLogs > 0.4) return 'detectNoExercise';
  if (fragmentation / totalLogs > 0.4) return 'detectFragmentation';
  if (poorEnv / totalLogs > 0.4) return 'detectPoorEnvironment';

  // Can add more advanced logic here (wake drift etc.)
  
  // Return a generic positive one if nothing bad detected
  return 'detectRecoveryTrend';
}

export function getQuickInsightForUser(logs: any = []): QuickInsight {
  const signal = determinePrimarySignal(logs);
  const eligibleInsights = QUICK_INSIGHTS_DB.filter(insight => insight.signal === signal);
  
  if (eligibleInsights.length === 0) {
    const defaults = QUICK_INSIGHTS_DB.filter(insight => insight.signal === 'default' || insight.signal === 'detectRecoveryTrend');
    return defaults[Math.floor(Math.random() * defaults.length)];
  }
  
  // Very basic rotation based on day of month so it's consistent for the day
  // but we can just use random from eligible if minimal
  const today = new Date().getDate();
  return eligibleInsights[today % eligibleInsights.length];
}
