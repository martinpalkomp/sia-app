import { DailyLog, SleepState } from '../types';

export const validateLogSchema = (log: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Required properties
  if (!log.date) {
    errors.push('Missing required field: date');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(log.date)) {
    errors.push('Field "date" must be in YYYY-MM-DD format');
  }

  // Type assertion
  if (log.type && log.type !== 'log') {
    errors.push('Field "type" must be "log" if provided');
  }

  // VisualTimeline length
  if (log.visualTimeline) {
    if (!Array.isArray(log.visualTimeline)) {
      errors.push('Field "visualTimeline" must be an array');
    } else if (log.visualTimeline.length !== 96) {
      errors.push(`Field "visualTimeline" length should be exactly 96, got ${log.visualTimeline.length}`);
    }
  }

  // Summary ranges
  if (log.summaryMetrics) {
    const sm = log.summaryMetrics;
    if (typeof sm.sleep_quality === 'number' && (sm.sleep_quality < 0 || sm.sleep_quality > 10)) {
      errors.push('summaryMetrics.sleep_quality must be between 0 and 10');
    }
    if (typeof sm.morning_alertness === 'number' && (sm.morning_alertness < 0 || sm.morning_alertness > 10)) {
      errors.push('summaryMetrics.morning_alertness must be between 0 and 10');
    }
    if (typeof sm.daytime_energy === 'number' && (sm.daytime_energy < 0 || sm.daytime_energy > 10)) {
      errors.push('summaryMetrics.daytime_energy must be between 0 and 10');
    }
    if (typeof sm.sleep_efficiency === 'number' && (sm.sleep_efficiency < 0 || sm.sleep_efficiency > 100)) {
      errors.push('summaryMetrics.sleep_efficiency must be between 0 and 100');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const sanitizeAndValidateLog = (log: any): DailyLog => {
  const validation = validateLogSchema(log);
  if (!validation.valid) {
    throw new Error(`Log Validation Failed: ${validation.errors.join(', ')}`);
  }

  // Ensure type=log
  return {
    ...log,
    type: 'log',
  } as DailyLog;
};
