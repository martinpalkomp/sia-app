import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
export const seedTestData = async (userId: string) => {
  const batch = writeBatch(db);
  const today = new Date();

  for (let i = 0; i < 60; i++) {
    const targetDate = subDays(today, i);
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    
    // Generate realistic 96-slot timeline (20:00 to 20:00)
    // Sleep usually starts around 23:00 (slot 12) and ends around 07:00 (slot 44)
    const timeline: SleepState[] = new Array(96).fill('awake-out');
    
    const sleepStart = 10 + Math.floor(Math.random() * 4); // 22:30 - 23:30
    const sleepEnd = 40 + Math.floor(Math.random() * 8);   // 06:00 - 08:00
    
    for (let s = 0; s < 96; s++) {
      if (s >= sleepStart && s <= sleepEnd) {
        // Mostly sleep, some awake-in at edges
        if (s === sleepStart || s === sleepEnd) {
          timeline[s] = Math.random() > 0.5 ? 'awake-in' : 'sleep';
        } else {
          timeline[s] = Math.random() > 0.95 ? 'awake-in' : 'sleep';
        }
      }
    }

    const log: DailyLog = {
      date: dateStr,
      type: 'log',
      isIgnored: false,
      sleepQuality: 6 + Math.floor(Math.random() * 4), // 6-9
      restedness: 5 + Math.floor(Math.random() * 4),   // 5-8
      energyLevel: 4 + Math.floor(Math.random() * 6),  // 4-9
      remarks: REMARKS[Math.floor(Math.random() * REMARKS.length)],
      timeline,
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

    batch.set(logRef, { ...log, updatedAt: serverTimestamp() });
    batch.set(metricsRef, {
      date: dateStr,
      sleep_quality: log.sleepQuality,
      morning_alertness: log.restedness,
      daytime_energy: log.energyLevel,
      daily_remarks: log.remarks,
      source: 'manual',
      updatedAt: serverTimestamp()
    });
  }

  await batch.commit();
};
