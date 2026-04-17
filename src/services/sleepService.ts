import { db, doc, serverTimestamp, setDoc } from '../lib/firebase';
import { DailyLog, SummaryLog } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';

/**
 * Validates sleep metrics to ensure they are within clinical ranges.
 * @param metrics - The metrics object to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export const validateLogMetrics = (metrics: Partial<SummaryLog['summaryMetrics']>): boolean => {
  const checkRange = (val?: number) => val === undefined || val === 0 || (val >= 1 && val <= 10);
  const checkPositive = (val?: number) => val === undefined || val >= 0;

  const { sleep_quality, morning_alertness, daytime_energy, importedDuration, importedInBed } = metrics;

  return (
    checkRange(sleep_quality) &&
    checkRange(morning_alertness) &&
    checkRange(daytime_energy) &&
    checkPositive(importedDuration) &&
    checkPositive(importedInBed)
  );
};

/**
 * Sanitizes log data to prevent unauthorized field updates.
 */
const sanitizeLogForSaving = (data: Partial<DailyLog>) => {
  const { role, tier, quota, email, uid, ...safeData } = data as any;
  return safeData;
};

/**
 * Saves a sleep log to Firestore using an update strategy.
 */
export const saveLog = async (uid: string, logData: Partial<DailyLog> & { date: string }) => {
  if (!db) throw new Error('Firestore is not initialized — check Firebase configuration');
  const { date, ...rest } = logData;
  
  // Future planning limit: 5 nights max
  const logDate = new Date(date);
  const now = new Date();
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(now.getDate() + 5);
  
  // Normalize to start of day for comparison
  logDate.setHours(0, 0, 0, 0);
  fiveDaysFromNow.setHours(0, 0, 0, 0);

  if (logDate > fiveDaysFromNow) {
    throw new Error('Future planning is limited to a maximum of 5 days.');
  }

  // Basic validation before saving
  if (rest.summaryMetrics && !validateLogMetrics(rest.summaryMetrics)) {
    throw new Error('Invalid clinical metrics detected. Values must be 1-10 and durations must be positive.');
  }

  const docRef = doc(db, 'users', uid, 'sleep_logs', date);
  const metricsRef = doc(db, 'users', uid, 'daily_metrics', date);
  
  const payload = {
    ...sanitizeLogForSaving(rest),
    updatedAt: serverTimestamp(),
  };

  // Use updateDoc to prevent permission-denied on protected fields
  // We use setDoc with merge: true only if the document might not exist, 
  // but for log updates, updateDoc is safer for permissions.
  // Assuming the document exists for updates.
  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/sleep_logs/${date}`);
  }

  // Sync to daily_metrics if it has metrics
  if (rest.sleep_quality !== undefined) {
    try {
      await setDoc(metricsRef, {
        sleep_quality: rest.sleep_quality,
        morning_alertness: rest.morning_alertness,
        daytime_energy: rest.daytime_energy,
        daily_remarks: rest.daily_remarks,
        source: rest.source || 'manual',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}/daily_metrics/${date}`);
    }
  }
};
