import { DailyLog } from '../types';
import { calculateSleepDuration, calculateSleepEfficiency, calculateTimeInBed } from './sleepUtils';
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
 * @param metricName - The name of the metric to average (e.g., 'sleep_quality', 'sleepDuration').
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

    // 1. Check top-level properties (sleep_quality, morning_alertness, daytime_energy)
    if (metricName === 'sleep_quality' && typeof log.sleep_quality === 'number') value = log.sleep_quality;
    if (metricName === 'morning_alertness' && typeof log.morning_alertness === 'number') value = log.morning_alertness;
    if (metricName === 'daytime_energy' && typeof log.daytime_energy === 'number') value = log.daytime_energy;

    // 2. Prioritize events/timeline for sleepDuration and efficiency if available
    if (value === undefined) {
      const sleepData = log.sleepEvents || log.timeline;
      if (sleepData && sleepData.length > 0) {
        if (metricName === 'sleepDuration') {
          value = calculateSleepDuration(sleepData);
        } else if (metricName === 'efficiency') {
          value = Number(calculateSleepEfficiency(sleepData));
        } else if (metricName === 'timeInBed') {
          value = calculateTimeInBed(sleepData);
        }
      }
    }

    // 3. Check summaryMetrics for clinical data points or imported values if not found/calculated
    if (value === undefined && log.summaryMetrics) {
      if (metricName === 'sleep_quality' && typeof log.summaryMetrics.sleep_quality === 'number') value = log.summaryMetrics.sleep_quality;
      if (metricName === 'morning_alertness' && typeof log.summaryMetrics.morning_alertness === 'number') value = log.summaryMetrics.morning_alertness;
      if (metricName === 'daytime_energy' && typeof log.summaryMetrics.daytime_energy === 'number') value = log.summaryMetrics.daytime_energy;
      
      // Handle aliases/imported values
      if (metricName === 'sleepDuration' && typeof log.summaryMetrics.importedDuration === 'number') value = log.summaryMetrics.importedDuration;
      if (metricName === 'timeInBed' && typeof log.summaryMetrics.importedInBed === 'number') value = log.summaryMetrics.importedInBed;
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
