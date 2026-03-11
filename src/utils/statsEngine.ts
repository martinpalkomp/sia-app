import { DailyLog } from '../types';
import { MIN_METRIC, MAX_METRIC } from '../constants';

export interface AverageResult {
  average: number;
  count: number;
}

/**
 * Validates if a numeric value is within the defined clinical range (1-10).
 * @param value - The value to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export const isValidMetricRange = (value: number | undefined): boolean => {
  if (value === undefined || isNaN(value)) return false;
  return value >= MIN_METRIC && value <= MAX_METRIC;
};

/**
 * Calculates a safe average for a specific clinical metric across a set of logs.
 * Filters out ignored logs and logs where the metric is missing or invalid.
 * 
 * @param logs - An array of DailyLog objects or a record of logs.
 * @param metricName - The name of the metric to average (e.g., 'sleepQuality', 'sleepDuration').
 * @returns {AverageResult} - An object containing the calculated average and the count of days used.
 */
export const calculateSafeAverage = (
  logs: DailyLog[] | Record<string, DailyLog>,
  metricName: string
): AverageResult => {
  const logArray = Array.isArray(logs) ? logs : Object.values(logs);
  
  let sum = 0;
  let count = 0;

  logArray.forEach((log) => {
    // Skip ignored logs as per clinical requirements
    if (log.isIgnored) return;

    let value: number | undefined;

    // 1. Check top-level properties (sleepQuality, restedness, energyLevel)
    if (metricName in log) {
      const val = (log as any)[metricName];
      if (typeof val === 'number') value = val;
    }

    // 2. Check summaryMetrics for clinical data points
    if (log.summaryMetrics) {
      if (metricName in log.summaryMetrics) {
        value = (log.summaryMetrics as any)[metricName];
      } 
      // Handle alias for sleepDuration -> importedDuration
      else if (metricName === 'sleepDuration') {
        value = log.summaryMetrics.importedDuration;
      } 
      // Handle alias for timeInBed -> importedInBed
      else if (metricName === 'timeInBed') {
        value = log.summaryMetrics.importedInBed;
      }
      // Handle efficiency
      else if (metricName === 'efficiency') {
        const sleepSlots = log.timeline.filter(s => s === 'sleep').length;
        const inBedSlots = log.timeline.filter(s => s === 'sleep' || s === 'awake-in').length;
        if (inBedSlots > 0) value = (sleepSlots / inBedSlots) * 100;
      }
    }

    // Only include in calculation if the value is a valid number
    if (value !== undefined && !isNaN(value)) {
      sum += value;
      count++;
    }
  });

  return {
    average: count > 0 ? Number((sum / count).toFixed(2)) : 0,
    count
  };
};
