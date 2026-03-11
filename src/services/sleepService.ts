import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { DailyLog, SummaryLog } from '../types';

/**
 * Validates sleep metrics to ensure they are within clinical ranges.
 * @param metrics - The metrics object to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export const validateLogMetrics = (metrics: Partial<SummaryLog['summaryMetrics']>): boolean => {
  const checkRange = (val?: number) => val === undefined || (val >= 1 && val <= 10);
  const checkPositive = (val?: number) => val === undefined || val >= 0;

  const { sleepQuality, restedness, energyLevel, importedDuration, importedInBed } = metrics;

  return (
    checkRange(sleepQuality) &&
    checkRange(restedness) &&
    checkRange(energyLevel) &&
    checkPositive(importedDuration) &&
    checkPositive(importedInBed)
  );
};

/**
 * Saves a sleep log to Firestore using an upsert (merge) strategy.
 * This ensures that saving a SummaryLog does not overwrite existing FullLog data (like timeline).
 * @param uid - The user's unique ID.
 * @param logData - The log data to save. Must include at least the date.
 */
export const saveLog = async (uid: string, logData: Partial<DailyLog> & { date: string }) => {
  const { date, ...rest } = logData;
  
  // Basic validation before saving
  if (rest.summaryMetrics && !validateLogMetrics(rest.summaryMetrics)) {
    throw new Error('Invalid clinical metrics detected. Values must be 1-10 and durations must be positive.');
  }

  const docRef = doc(db, 'user_data', uid, 'history', date);
  
  // setDoc with merge: true ensures we only update the fields provided
  await setDoc(docRef, {
    ...rest,
    date,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};
