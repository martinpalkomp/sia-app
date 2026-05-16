import { chatWithSIA } from './chat';
import { saveChatMessage, saveAIInsights } from './chatPersistence';
import { buildClinicalBrief } from './context/clinicalSummary';
import { DailyLog, UnstructuredData } from '../../types';
import { format } from 'date-fns';
import { doc, getDoc, getDocs, collection, query, orderBy, limit, db } from '../../lib/firebase';

import { UserTier } from '../../types';

export interface ChatContextPayload {
  userUid: string;
  userTier: UserTier;
  dataDepthLevel: number;
  dataDepthCount: number;
  personalizationProfile: any;
  history: Array<{ role: 'user' | 'model', parts: Array<{ text: string }> }>;
  onForecastUpdate?: (metrics: { quality: number; alertness: number; energy: number }) => void;
  logsCache?: DailyLog[];
  profileCache?: any;
  unstructuredCache?: UnstructuredData[];
}

export const getAnalyzingLabel = (prompt: string): string => {
  if (/last\s+7\s+days?|past\s+week/i.test(prompt)) return 'ANALYZING 7 DAYS';
  if (/last\s+14\s+days?|past\s+two\s+weeks?/i.test(prompt)) return 'ANALYZING 14 DAYS';
  if (/last\s+30\s+days?|past\s+month/i.test(prompt)) return 'ANALYZING 30 DAYS';
  if (/last\s+90\s+days?|past\s+3\s+months?/i.test(prompt)) return 'ANALYZING 90 DAYS';
  const match = prompt.match(/last\s+(\d+)\s+days?/i);
  if (match) return `ANALYZING ${match[1]} DAYS`;
  return `ANALYZING ALL DATA`;
};

export const fetchHistoricalContext = async (uid: string) => {
  const logsRef = collection(db, 'users', uid, 'sleep_logs');
  const [logsSnap, profileSnap, unstructuredSnap] = await Promise.all([
    getDocs(query(logsRef, orderBy('date', 'desc'), limit(30))),
    getDoc(doc(db, 'users', uid, 'personalization', 'profile')),
    getDocs(query(collection(db, 'users', uid, 'unstructured_data'), orderBy('uploadDate', 'desc'), limit(10)))
  ]);
  
  const fetchedLogs: DailyLog[] = [];
  logsSnap.forEach(d => fetchedLogs.push(d.data() as DailyLog));
  
  const fetchedProfile = profileSnap.exists() ? profileSnap.data() : null;
  
  const fetchedUnstructured: UnstructuredData[] = [];
  unstructuredSnap.forEach(d => fetchedUnstructured.push({ id: d.id, ...d.data() } as UnstructuredData));

  return { fetchedLogs, fetchedProfile, fetchedUnstructured };
};

export const handleAssistantResponse = async (
  text: string, 
  ctx: ChatContextPayload,
  isLimitReachedCb: () => void
) => {
  const SLEEP_KEYWORDS = ['sleep','wake','tired','fatigue','rest','nap','insomnia','dream','bed','night','morning','energy','alert','caffeine','alcohol','exercise','stress','recovery','circadian','melatonin','apnea','snore','restless','quality','duration','log','pattern','habit','analyze','analysis','report','insight','score','data','week','month','trend','improve','recommend','health','wellness'];

  if (!SLEEP_KEYWORDS.some(kw => text.toLowerCase().includes(kw))) {
    await saveChatMessage(
      ctx.userUid, 
      'assistant', 
      "That's outside my expertise! I'm SIA — I specialise in sleep science and recovery.\n\nFor general questions, **[Gemini](https://gemini.google.com)** is a great all-purpose assistant.\n\nCan I help with your sleep patterns or energy levels instead? 🌙"
    );
    return;
  }

  // Save User msg immediately
  await saveChatMessage(ctx.userUid, 'user', text);

  // Use caches if available
  let recentLogs = ctx.logsCache;
  let profile = ctx.profileCache;
  let unstructuredData = ctx.unstructuredCache;

  // Only fetch if they are explicitly undefined. Null means they were loaded but missing.
  if (recentLogs === undefined || profile === undefined) {
      const fetched = await fetchHistoricalContext(ctx.userUid);
      recentLogs = recentLogs !== undefined ? recentLogs : fetched.fetchedLogs;
      profile = profile !== undefined ? profile : (fetched.fetchedProfile || null);
      unstructuredData = unstructuredData !== undefined ? unstructuredData : fetched.fetchedUnstructured;
  }

  const clinicalBrief = buildClinicalBrief(recentLogs || [], unstructuredData || []);

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const logsCount = recentLogs?.length || 0;
  const logsInLastMonthCount = (recentLogs || []).filter(log => new Date(log.date) >= oneMonthAgo).length;
  const today = format(new Date(), 'yyyy-MM-dd');

  const response = await chatWithSIA(
    ctx.userUid,
    text,
    ctx.userTier,
    {
      clinicalBrief,
      personalizationProfile: profile,
      history: ctx.history,
      logsCount,
      logsInLastMonthCount
    },
    {
      level: ctx.dataDepthLevel as 1 | 2 | 3 | 4,
      count: ctx.dataDepthCount,
      label: '',
      nextThreshold: 14
    },
    sessionStorage.getItem(`sia_brief_${ctx.userUid}_${today}`) ?? null
  );

  if (response.limitReached) {
    isLimitReachedCb();
    await saveChatMessage(
      ctx.userUid, 
      'assistant', 
      "You've reached your daily message limit. Upgrade to Enhanced or Pro for more messages."
    );
    return;
  }

  if (response.answer) {
    await saveChatMessage(ctx.userUid, 'assistant', response.answer);

    if (response.sleep_quality && response.sleep_quality > 0 && ctx.onForecastUpdate) {
        ctx.onForecastUpdate({
            quality: response.sleep_quality,
            alertness: response.morning_alertness || 0,
            energy: response.daytime_energy || 0
        });
    }

    if (response.newInsights && response.newInsights.length > 0) {
        await saveAIInsights(ctx.userUid, response.newInsights);
    }
  }
};
