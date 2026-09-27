import { collection, getDocs, getDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';

export const exportUserData = async (userId: string) => {
  const base = `users/${userId}`;
  const toData = (snap: any) => snap.docs.map((d: any) => ({ _id: d.id, ...d.data() }));
  
  const sanitize = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (obj.toDate) return obj.toDate().toISOString();
    if (Array.isArray(obj)) return obj.map(sanitize);
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, sanitize(v)]));
  };

  const [logsSnap, insightsSnap, chatsSnap, briefsSnap, correctionsSnap, unstructuredSnap, profileSnap] =
    await Promise.all([
      getDocs(query(collection(db, base, 'sleep_logs'), orderBy('date', 'asc'))),
      getDocs(collection(db, base, 'insights')),
      getDocs(collection(db, base, 'chats')),
      getDocs(collection(db, base, 'daily_briefs')),
      getDocs(collection(db, base, 'ai_corrections')),
      getDocs(collection(db, base, 'unstructured_data')),
      getDoc(doc(db, base, 'personalization', 'profile')),
    ]);

  const rawData = sanitize({
    sleep_logs: toData(logsSnap),
    insights: toData(insightsSnap),
    chats: toData(chatsSnap),
    daily_briefs: toData(briefsSnap),
    ai_corrections: toData(correctionsSnap),
    unstructured_data: toData(unstructuredSnap),
    personalization: profileSnap.exists() ? profileSnap.data() : null,
  });

  const payload = JSON.stringify({
    _meta: {
      exportedAt: new Date().toISOString(),
      userId: userId,
      tool: 'SIA GDPR User Export',
    },
    ...rawData,
  }, null, 2);

  const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sia_data_export_${dateStr}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
