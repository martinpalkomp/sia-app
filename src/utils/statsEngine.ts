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
    if (metricName === 'sleepQuality' && typeof log.sleepQuality === 'number') value = log.sleepQuality;
    if (metricName === 'restedness' && typeof log.restedness === 'number') value = log.restedness;
    if (metricName === 'energyLevel' && typeof log.energyLevel === 'number') value = log.energyLevel;

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
      if (metricName === 'sleepQuality' && typeof log.summaryMetrics.sleepQuality === 'number') value = log.summaryMetrics.sleepQuality;
      if (metricName === 'restedness' && typeof log.summaryMetrics.restedness === 'number') value = log.summaryMetrics.restedness;
      if (metricName === 'energyLevel' && typeof log.summaryMetrics.energyLevel === 'number') value = log.summaryMetrics.energyLevel;
      
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
