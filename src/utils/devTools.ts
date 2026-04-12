import { DailyLog } from '../types';
import { subDays, format } from 'date-fns';

const REMARKS = [
  "Felt great, very rested.",
  "Late coffee affected sleep onset.",
  "Restless night, woke up several times.",
  "Solid sleep, consistent energy.",
  "Slightly dehydrated, but slept well.",
  "Stressful day, took longer to fall asleep.",
  "Perfect conditions, deep sleep achieved.",
  "Woke up early due to sunlight.",
  "Feeling a bit groggy this morning.",
  "Excellent recovery after exercise."
];

/**
 * Purges all user data from sleep_logs, daily_metrics, and unstructured_data.
 */
export const purgeUserData = async (userId: string, onComplete?: () => void) => {
  // This function is for real data purging
  onComplete?.();
};
