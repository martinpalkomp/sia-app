import { 
  db, 
  writeBatch, 
  doc, 
  collection, 
  serverTimestamp, 
  getDocs,
  deleteDoc 
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
  if (!db) throw new Error('Firestore is not initialized');
  const batch = writeBatch(db);
  const today = new Date();

  for (let i = 0; i < 60; i++) {
    const targetDate = subDays(today, i);
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    
    // 1. Generate Times
    // Bedtime: 22:00 - 23:00
    const bedHour = 22 + Math.floor(Math.random() * 1); 
    const bedMin = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
    
    // Actually falling asleep: 15-30 mins after bedtime
    const sleepHour = bedHour;
    const sleepMin = bedMin + 15; // Simplified logic for seed
    
    // Waking up but staying in bed: 06:00 - 07:30
    const wakeHour = 6 + Math.floor(Math.random() * 2);
    const wakeMin = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
    
    // Getting out of bed: 15 mins after waking
    const outHour = wakeHour;
    const outMin = wakeMin + 15;

    // Formatting helpers
    const formatT = (h: number, m: number) => {
      let finalH = h;
      let finalM = m;
      if (m >= 60) { finalH += 1; finalM -= 60; }
      return `${finalH.toString().padStart(2, '0')}:${finalM.toString().padStart(2, '0')}`;
    };

    const bedTime = formatT(bedHour, bedMin);
    const sleepStartTime = formatT(sleepHour, sleepMin);
    const wakeTime = formatT(wakeHour, wakeMin);
    const outTime = formatT(outHour, outMin);

    // 2. Build Realistic Sleep Events
    const sleepEvents = [
      { id: `seed-${i}-awake-start`, type: 'awake-in' as const, start: bedTime, end: sleepStartTime },
      { id: `seed-${i}-sleep`, type: 'sleep' as const, start: sleepStartTime, end: wakeTime },
      { id: `seed-${i}-awake-end`, type: 'awake-in' as const, start: wakeTime, end: outTime }
    ];

    // ... (rest of your gadgets logic remains the same)
    const ALL_GADGETS = ['light_therapy','breathing_trainer','pre_sleep_heating','aromatherapy','meditation_app','cooling_pad','white_noise','sleep_mask','earplugs','weighted_blanket','smart_ring','smartwatch_tracking','fitness_band','phone_sleep_app'] as const;
    const TIMED_GADGETS = ['light_therapy','breathing_trainer','pre_sleep_heating','aromatherapy'];
    const TIME_OPTIONS = ['morning','afternoon','evening','before_bed_15','before_bed_30','all_night'] as const;

    const seedGadgets = ALL_GADGETS
      .filter(() => Math.random() > 0.75) 
      .slice(0, 3) 
      .map(type => ({
        type,
        ...(TIMED_GADGETS.includes(type) ? { durationMinutes: [15,30,45,60][Math.floor(Math.random()*4)] } : {}),
        ...(type === 'light_therapy' ? { timeOfUse: TIME_OPTIONS[Math.floor(Math.random()*3)] } : {}),
      }));

    const log: DailyLog = {
      date: dateStr,
      type: 'log',
      isIgnored: false,
      sleep_quality: 6 + Math.floor(Math.random() * 4),
      morning_alertness: 5 + Math.floor(Math.random() * 4),
      daytime_energy: 4 + Math.floor(Math.random() * 6),
      daily_remarks: REMARKS[Math.floor(Math.random() * REMARKS.length)],
      sleepEvents, // Now contains both sleep and awake-in types
      factors: {
        caffeine: { consumed: Math.random() > 0.3, amount: 1, lastIntake: '14:00' },
        alcohol: { consumed: Math.random() > 0.8, drinks: 1, lastIntake: '20:00' },
        medication: { taken: false, type: '', time: '' },
        exercise: { completed: Math.random() > 0.5, type: 'Cardio', time: '17:00' },
        screensInBed: Math.random() > 0.4,
        stressLevel: 1 + Math.floor(Math.random() * 3),
        sleepGadgets: seedGadgets
      },
      source: 'manual'
    };

    const logRef = doc(db, 'users', userId, 'sleep_logs', dateStr);
    const metricsRef = doc(db, 'users', userId, 'daily_metrics', dateStr);

    batch.set(logRef, { ...log, updatedAt: serverTimestamp() });
    batch.set(metricsRef, {
      date: dateStr,
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
  if (!db) throw new Error('Firestore is not initialized');
  const collections = [
    'sleep_logs',
    'daily_metrics',
    'unstructured_data',
    'personalization',
    'ai_corrections',
    'premium_exports',
  ];

  for (const colName of collections) {
    const colRef = collection(db, 'users', userId, colName);
    const snapshot = await getDocs(colRef);
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 500) {
      const batch = writeBatch(db);
      docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }

  // Also delete the user profile document itself (demographics, goals, personalization)
  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDocs(collection(db, 'users'));
  const userDoc = userSnap.docs.find(d => d.id === userId);
  if (userDoc) {
    await deleteDoc(userDocRef);
  }

  if (onComplete) onComplete();
};
