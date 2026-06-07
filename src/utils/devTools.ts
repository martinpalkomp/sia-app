import { DailyLog } from '../types';
import { subDays, format } from 'date-fns';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

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

const SUBCOLLECTIONS = [
  'sleep_logs', 'daily_metrics', 'daily_briefs', 'insights',
  'ai_corrections', 'unstructured_data', 'chats', 'personalization', 'consent'
];

/**
 * Purges all user data from all subcollections.
 */
export const purgeUserData = async (userId: string, onComplete?: () => void) => {
  try {
    for (const sub of SUBCOLLECTIONS) {
      const colRef = collection(db, 'users', userId, sub);
      const snap = await getDocs(colRef);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      if (snap.size > 0) await batch.commit();
    }
    await deleteDoc(doc(db, 'users', userId));
    if (auth.currentUser) await deleteUser(auth.currentUser);
    onComplete?.();
  } catch (err) {
    console.error('[GDPR] purgeUserData failed:', err);
    throw err;
  }
};
