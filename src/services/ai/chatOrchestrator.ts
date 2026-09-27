import { chatWithSIA } from './chat';
import { saveChatMessage, saveAIInsights } from './chatPersistence';
import { buildClinicalBrief } from './context/clinicalSummary';
import { DailyLog, UnstructuredData } from '../../types';
import { format } from 'date-fns';
import { doc, getDoc, getDocs, collection, query, orderBy, limit, db } from '../../lib/firebase';
import { canAnalyze } from './core/capabilityRegistry';
import { routeChatIntent } from './core/intentRouter';

import { AIStateManager } from './AIStateManager';
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

export const getAnalyzingLabel = (text: string): string => {
  const t = text.toLowerCase();
  if (t.includes('trend') || t.includes('pattern') || t.includes('week') || t.includes('month')) return 'RUNNING TEMPORAL ANALYSIS';
  if (t.includes('caffeine') || t.includes('alcohol') || t.includes('exercise') || t.includes('factor')) return 'COMPUTING FACTOR CORRELATIONS';
  if (t.includes('debt') || t.includes('recovery') || t.includes('pressure')) return 'CALCULATING SLEEP PRESSURE';
  if (t.includes('chrono') || t.includes('gate') || t.includes('circadian')) return 'MAPPING CIRCADIAN PROFILE';
  if (t.includes('brief') || t.includes('report') || t.includes('summary')) return 'COMPILING CLINICAL BRIEF';
  return 'ANALYZING SLEEP DATA';
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
  // Check AI Processing Pause (Art.18)
  const userRef = doc(db, 'users', ctx.userUid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data()?.aiProcessingPaused) {
    await saveChatMessage(ctx.userUid, 'assistant', "⚠️ AI processing is currently paused for your account due to your privacy settings. You can re-enable it in Account -> Pause AI Processing.");
    return;
  }

  // Save User msg immediately
  await saveChatMessage(ctx.userUid, 'user', text);

  const routerResponse = await routeChatIntent(text);

  if (routerResponse.action === 'REFUSE') {
    await saveChatMessage(
      ctx.userUid, 
      'assistant', 
      routerResponse.reason || "I specialize in sleep science and recovery. I cannot assist with that topic."
    );
    return;
  }

  if (routerResponse.action === 'REDIRECT') {
    await saveChatMessage(
      ctx.userUid, 
      'assistant', 
      routerResponse.reason || "I focus on sleep and recovery, but we can explore how that relates to your rest."
    );
    return;
  }

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

  const today = format(new Date(), 'yyyy-MM-dd');

  let clinicalBrief = AIStateManager.getClinicalBrief(ctx.userUid, today);
  if (!clinicalBrief) {
    clinicalBrief = buildClinicalBrief(recentLogs || [], unstructuredData || []);
    AIStateManager.setClinicalBrief(ctx.userUid, today, clinicalBrief);
  }

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const logsCount = recentLogs?.length || 0;
  const logsInLastMonthCount = (recentLogs || []).filter(log => new Date(log.date) >= oneMonthAgo).length;

  const MAX_HISTORY_TURNS = 12; // 6 user + 6 assistant = ~3000 tokens max
  const truncatedHistory = ctx.history.length > MAX_HISTORY_TURNS
    ? ctx.history.slice(-MAX_HISTORY_TURNS)
    : ctx.history;

  const pipelineState = {
    hasBedtime: (recentLogs || []).some((l: any) => l.bedTime || l.bedtime),
    hasWakeTime: (recentLogs || []).some((l: any) => l.wakeTime),
    hasAwakenings: (recentLogs || []).some((l: any) => (l.sleepEvents && l.sleepEvents.some((e: any) => e.type === 'awake-in' || e.type === 'awake-out')) || l.awakeningCount > 0),
    hasAlcohol: (recentLogs || []).some((l: any) => l.factors?.alcohol?.consumed !== undefined && l.factors?.alcohol?.consumed !== null),
    hasCaffeine: (recentLogs || []).some((l: any) => l.factors?.caffeine?.consumed !== undefined && l.factors?.caffeine?.consumed !== null),
    hasStress: (recentLogs || []).some((l: any) => l.factors?.stressLevel !== undefined && l.factors?.stressLevel !== null),
    hasExercise: (recentLogs || []).some((l: any) => l.factors?.exercise?.completed !== undefined && l.factors?.exercise?.completed !== null)
  };

  const response = await chatWithSIA(
    ctx.userUid,
    text,
    ctx.userTier,
    {
      clinicalBrief,
      personalizationProfile: profile,
      history: truncatedHistory,
      logsCount,
      logsInLastMonthCount,
      pipelineState
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
