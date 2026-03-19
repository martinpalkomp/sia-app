import { 
  db, 
  writeBatch, 
  doc, 
  collection, 
  serverTimestamp, 
  getDocs 
} from '../lib/firebase';
import { DailyLog, SleepState } from '../types';
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
 * Seeds 60 days of realistic sleep data for testing.
 */
export const seedTestData = async (userId: string, onComplete?: () => void) => {
  const batch = writeBatch(db);
  const today = new Date();

  for (let i = 0; i < 60; i++) {
    const targetDate = subDays(today, i);
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    
    // Generate realistic sleepEvents instead of timeline
    const startHour = 22 + Math.floor(Math.random() * 2); // 22 or 23
    const startMin = Math.floor(Math.random() * 60);
    const endHour = 6 + Math.floor(Math.random() * 3); // 6, 7, 8
    const endMin = Math.floor(Math.random() * 60);
    
    const start = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
    const end = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
    
    const sleepEvents = [
      { id: `seed-${i}-1`, type: 'sleep' as const, start, end }
    ];

    const log: DailyLog = {
      date: dateStr,
      type: 'log',
      isIgnored: false,
      sleep_quality: 6 + Math.floor(Math.random() * 4), // 6-9
      morning_alertness: 5 + Math.floor(Math.random() * 4),   // 5-8
      daytime_energy: 4 + Math.floor(Math.random() * 6),  // 4-9
      daily_remarks: REMARKS[Math.floor(Math.random() * REMARKS.length)],
      sleepEvents,
      factors: {
        caffeine: { consumed: Math.random() > 0.3, amount: 1, lastIntake: '14:00' },
        alcohol: { consumed: Math.random() > 0.8, drinks: 1, lastIntake: '20:00' },
        medication: { taken: false, type: '', time: '' },
        exercise: { completed: Math.random() > 0.5, type: 'Cardio', time: '17:00' },
        screensInBed: Math.random() > 0.4,
        stressLevel: 1 + Math.floor(Math.random() * 3)
      },
      source: 'manual'
    };

    const logRef = doc(db, 'users', userId, 'sleep_logs', dateStr);
    const metricsRef = doc(db, 'users', userId, 'daily_metrics', dateStr);

    batch.set(logRef, { ...log, type: 'log', updatedAt: serverTimestamp() });
    batch.set(metricsRef, {
      date: dateStr,
      type: 'log',
      sleep_quality: log.sleep_quality,
      morning_alertness: log.morning_alertness,
      daytime_energy: log.daytime_energy,
      daily_remarks: log.daily_remarks,
      source: 'manual',
      updatedAt: serverTimestamp()
    });
  }

  await batch.commit();
  if (onComplete) onComplete();
};

/**
 * Purges all user data from sleep_logs, daily_metrics, and unstructured_data.
 */
export const purgeUserData = async (userId: string, onComplete?: () => void) => {
  const collections = ['sleep_logs', 'daily_metrics', 'unstructured_data'];
  
  for (const colName of collections) {
    const colRef = collection(db, 'users', userId, colName);
    const snapshot = await getDocs(colRef);
    
    // Process in batches of 500
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 500);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }

  if (onComplete) onComplete();
};
