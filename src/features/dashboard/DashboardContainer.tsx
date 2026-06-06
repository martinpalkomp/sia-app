import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useUser } from '../../context/UserContext';
import { getPendingCorrections } from '../../utils/correctionLogic';
import { getTodayDate } from '../../utils/dateUtils';
import { format } from 'date-fns';
import { DailyLog, UserProfile, PersonalizationProfile, SleepState, SleepEvent, AIInsight } from '../../types';
import { User, collection, query, where, orderBy, limit, getDocs } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { MaturityInfo } from '../../services/ai/core/maturitySystem';
import { useSleepStore } from '../../store/useSleepStore';
import { generateDailyBrief, getCachedDailyBrief } from '../../services/ai/dailyBrief';
import { generatePatternTeaser } from '../../services/ai/patternTeaser';
import { generateDeepAnalysis } from '../../services/ai/deepAnalysis';
import { AIStateManager } from '../../services/ai/AIStateManager';
import { calculateSafeAverage } from '../../utils/statsEngine';
import { getQuickInsightForUser } from '../../services/ai/core/quickInsights';
import { getMinutesFrom2000 } from '../../utils/sleepUtils';
import DashboardView from './DashboardView';
import { computeSleepGateData, SleepGateData } from '../../utils/sleepGateEngine';

interface DashboardContainerProps {
  logs: Record<string, DailyLog>;
  user: User | null;
  userProfile: UserProfile | null;
  selectedDate: string;
  personalizationProfile: PersonalizationProfile | null;
  onLogClick: () => void;
  onViewChange: (view: any) => void;
  onOpenPersonalization: () => void;
  onOpenSleepGuide: () => void;
  onDateChange: (date: string | number) => void;
  refreshAllData: () => void;
  isRefreshing: boolean;
  maturity?: MaturityInfo | null;
  forecastMetrics?: { quality: number; alertness: number; energy: number } | null;
  quickInsight?: any;
}

export default function DashboardContainer({
  user,
  userProfile,
  selectedDate,
  personalizationProfile,
  onLogClick,
  onViewChange,
  onOpenPersonalization,
  onOpenSleepGuide,
  onDateChange,
  refreshAllData,
  isRefreshing,
  maturity: externalMaturity,
  forecastMetrics
}: Omit<DashboardContainerProps, 'logs'>) {
  const { dataDepth, maturity: contextMaturity } = useUser();
  const { logs } = useSleepStore();
  const dataMaturity = useMemo(() => {
    const source = externalMaturity || contextMaturity;
    if (source) return source as MaturityInfo;
    return { level: 1, count: 0, label: 'Baseline', nextThreshold: 7 } as MaturityInfo;
  }, [externalMaturity, contextMaturity]);

  const hasNinetyLogsInFiveMonths = useMemo(() => {
    if (!logs) return false;
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setDate(fiveMonthsAgo.getDate() - 150);
    const logsArray = Object.values(logs);
    return logsArray.filter(log => new Date(log.date) >= fiveMonthsAgo).length >= 90;
  }, [logs]);

  const [showGateFactors, setShowGateFactors] = useState(false);

  const sleepGateData = useMemo((): SleepGateData | null => {
    if (!logs) return null;
    const logsArray = Object.values(logs).sort((a, b) => b.date.localeCompare(a.date));
    if (logsArray.length < 1) return null;
    return computeSleepGateData(logsArray, dataMaturity.level);
  }, [logs, dataMaturity.level]);

  const [insightTeaser, setInsightTeaser] = useState<string | AIInsight | null>(null);
  const [deepAnalysisResult, setDeepAnalysisResult] = useState<{summary: string, recommendation: string, confidence: number} | null>(null);
  const [dailyBrief, setDailyBrief] = useState<string | AIInsight | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [isDeepAnalysis, setIsDeepAnalysis] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showUnlockEnhanced, setShowUnlockEnhanced] = useState(false);

  const insightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const correctionsCount = useMemo(() => {
    const trackingStartDate = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    return getPendingCorrections(logs, trackingStartDate).length;
  }, [logs]);

  // Fetch/Generate Daily Brief
  const today = getTodayDate();

  useEffect(() => {
    if (!user || !userProfile || !logs || dataMaturity.count === 0 || !dataMaturity) return;

    const fetchBrief = async () => {
      setIsBriefLoading(true);
      try {
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');

        const lastNight = new Date(now);
        lastNight.setDate(lastNight.getDate() - 1);
        const lastNightStr = format(lastNight, 'yyyy-MM-dd');

        const targetLog = logs[lastNightStr];

        if (!targetLog) {
          setDailyBrief("SIA is calibrating for your next brief. Awaiting last night's data.");
          setIsBriefLoading(false);
          return;
        }

        const logsArray = Object.values(logs).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const brief = await AIStateManager.syncDailyBrief(
          user.uid,
          todayStr,
          lastNightStr,
          logsArray as DailyLog[],
          userProfile,
          dataMaturity.level
        );

        setDailyBrief(brief || "No brief available yet.");

      } catch (err) {
        console.error("Failed to generate brief:", err);
      } finally {
        setIsBriefLoading(false);
      }
    };

    fetchBrief();
  }, [user, userProfile, logs, dataMaturity.level, dataMaturity.count, personalizationProfile, today]);

  // Insights Fetching
  useEffect(() => {
    if (!user) return;
    const fetchInsights = async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'insights'),
          orderBy('createdAt', 'desc'),
          limit(6)
        );
        const snapshot = await getDocs(q);
        const fetched: any[] = [];
        snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() }));
        setInsights(fetched);
      } catch (e) { console.error('Insights fetch error:', e); }
    };
    fetchInsights();
  }, [user?.uid]);

  // First Visit Check
  useEffect(() => {
    const hasVisited = localStorage.getItem('sia_has_visited');
    if (!hasVisited) {
      setIsFirstVisit(true);
      localStorage.setItem('sia_has_visited', 'true');
    }
  }, []);

  // Pattern Teaser Logic (Replaces generatePatternDecoder)
  const executePatternTeaser = async () => {
    if (!logs || Object.keys(logs).length < 1 || !user || !userProfile || !dataMaturity || insightTeaser) return;
    
    if (userProfile.tier === 'Basic') {
      return;
    }

    setIsAiLoading(true);
    try {
      const logsArray = Object.values(logs).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const insight = await AIStateManager.syncPatternInsight(
        user.uid,
        today,
        logsArray,
        userProfile,
        dataMaturity.level
      );
      
      setInsightTeaser(insight);
    } catch (e) {
      console.error('Dashboard AI Error:', e);
      setInsightTeaser(null);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !userProfile || !dataMaturity) return;

    const logCount = Object.keys(logs).length;
    const thresholdKey = `sia_insight_threshold_${user.uid}_${today}`;

    const lastCountStr = sessionStorage.getItem(thresholdKey);
    const lastCount = lastCountStr ? parseInt(lastCountStr, 10) : 0;

    const sessionCached = sessionStorage.getItem(`sia_insight_${user.uid}_${today}`);
    const newLogsSinceLast = logCount - lastCount;

    if (sessionCached && newLogsSinceLast < 3) {
      if (!insightTeaser) {
        try {
          setInsightTeaser(JSON.parse(sessionCached));
        } catch {
          setInsightTeaser(sessionCached);
        }
      }
      return;
    }

    if (insightDebounceRef.current) clearTimeout(insightDebounceRef.current);
    insightDebounceRef.current = setTimeout(async () => {
      await executePatternTeaser();
      sessionStorage.setItem(thresholdKey, String(logCount));
    }, 2000);

    return () => { if (insightDebounceRef.current) clearTimeout(insightDebounceRef.current); };
  }, [logs, user, userProfile, dataMaturity, today]);

  // Handle Deep Analysis
  const handleDeepAnalysis = async () => {
    if (!user || !userProfile || isAiLoading || !dataMaturity) return;

    if (userProfile?.tier === 'Basic' || !hasNinetyLogsInFiveMonths) {
      setShowUnlockEnhanced(true);
      return;
    }
    
    setIsAiLoading(true);
    setIsDeepAnalysis(true);
    try {
      const daysCount = personalizationProfile ? 90 : 30;
      const logsRef = collection(db, 'users', user.uid, 'sleep_logs');
      
      const querySnapshot = await getDocs(query(logsRef, orderBy('date', 'desc'), limit(daysCount)));
      
      const historicalLogs: DailyLog[] = [];
      querySnapshot.forEach(doc => {
        historicalLogs.push(doc.data() as DailyLog);
      });

      // Keeping Deep Analysis legacy until its moved to Domain Layer too
      const response = await generateDeepAnalysis(
        user.uid,
        historicalLogs,
        userProfile.tier as any,
        dataMaturity as any,
        today
      );

      if (response.status === 'success' && response.content) {
        setDeepAnalysisResult({
          summary: response.content.summary,
          recommendation: response.content.recommendation,
          confidence: response.content.confidence
        });
      }
    } catch (e) {
      console.error("Deep Analysis Error:", e);
    } finally {
      setIsDeepAnalysis(false);
      setIsAiLoading(false);
    }
  };

  // Stats Logic
  const averageBedtime = useMemo(() => {
    const sleepLogs = Object.values(logs).filter(log => {
      const sleepData = log.sleepEvents || log.timeline || [];
      if (Array.isArray(sleepData) && sleepData.length > 0 && typeof sleepData[0] === 'string') {
        return (sleepData as SleepState[]).some(s => s === 'sleep');
      }
      return (sleepData as SleepEvent[]).some(e => e.type === 'sleep');
    });
    if (sleepLogs.length === 0) return "22:00";

    const relativeMinutesArray = sleepLogs.map(log => {
      if (log.sleepEvents && log.sleepEvents.length > 0) {
        const firstSleepEvent = log.sleepEvents.find(e => e.type === 'sleep');
        if (firstSleepEvent) {
          return getMinutesFrom2000(firstSleepEvent.start);
        }
      }
      const timeline = log.timeline || [];
      const firstSleepIndex = timeline.findIndex(s => s === 'sleep');
      return firstSleepIndex !== -1 ? firstSleepIndex * 15 : 0;
    });

    const avgRelativeMinutes = relativeMinutesArray.reduce((a, b) => a + b, 0) / relativeMinutesArray.length;
    const totalMinutesFromMidnight = (20 * 60 + avgRelativeMinutes) % (24 * 60);
    const h = Math.floor(totalMinutesFromMidnight / 60);
    const m = Math.round((totalMinutesFromMidnight % 60) / 15) * 15;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }, [logs]);

  const periodDates = useMemo(() => {
    const dates = [];
    const baseDate = new Date(selectedDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [selectedDate]);

  const stats = useMemo(() => {
    const periodLogs = periodDates.map(d => logs[d]).filter(Boolean);
    if (periodLogs.length === 0) return null;

    return {
      avgSq: calculateSafeAverage(periodLogs, 'sleep_quality').average,
      avgR: calculateSafeAverage(periodLogs, 'morning_alertness').average,
      avgL: calculateSafeAverage(periodLogs, 'daytime_energy').average,
      avgDuration: calculateSafeAverage(periodLogs, 'sleepDuration').average,
      avgEfficiency: calculateSafeAverage(periodLogs, 'efficiency').average
    };
  }, [logs, periodDates]);

  const greeting = useMemo(() => {
    const isNewUser = Object.keys(logs).length === 0;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const hasLoggedToday = !!logs[todayStr];
    const hour = new Date().getHours();

    let prefix = "";
    let suffix = "";
    let showLogLink = false;

    if (isNewUser) {
      return {
        prefix: "Welcome",
        suffix: "I am SIA. Let's begin establishing your sleep baseline.",
        showLogLink: false,
        onLogClick
      };
    }

    if (hour >= 0 && hour < 5) {
      prefix = "The midnight hour";
      suffix = "Recovery is active. Your cognitive architecture requires deep rest to consolidate today’s data.";
    } else if (hour >= 5 && hour < 12) {
      prefix = "Morning";
      if (hasLoggedToday) {
        suffix = "Data ingested. Your sleep metrics are ready for analysis. Let's optimize your biological potential.";
      } else {
        suffix = "A new cycle has begun. Please capture your sleep metrics while the data fidelity is at its peak.";
        showLogLink = true;
      }
    } else if (hour >= 12 && hour < 17) {
      prefix = "Good afternoon";
      suffix = "Your circadian rhythm is stable. We are monitoring your energy flux for optimal performance.";
    } else if (hour >= 17 && hour < 21) {
      prefix = "Evening";
      suffix = "Your sleep gate is projected for " + averageBedtime + ". Prepare your environment for optimal transition.";
    } else {
      prefix = "Wind down";
      suffix = "Consistency is the key to architecture. Aim for your " + averageBedtime + " target to maintain your baseline.";
    }

    return { prefix, suffix, showLogLink, onLogClick };
  }, [logs, user, averageBedtime, onLogClick]);

  const recentGadgets = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(logs).slice(-7).forEach(log => {
      log.factors?.sleepGadgets?.forEach(g => {
        counts.set(g.type, (counts.get(g.type) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([type]) => type);
  }, [logs]);

  const quickInsight = useMemo(() => {
    return getQuickInsightForUser(logs);
  }, [logs]);

  return (
    <DashboardView
      user={user}
      userProfile={userProfile}
      selectedDate={selectedDate}
      onLogClick={onLogClick}
      onViewChange={onViewChange}
      onOpenPersonalization={onOpenPersonalization}
      onOpenSleepGuide={onOpenSleepGuide}
      onDateChange={onDateChange}
      refreshAllData={refreshAllData}
      isRefreshing={isRefreshing}
      dataMaturity={dataMaturity}
      dataDepth={dataDepth}
      correctionsCount={correctionsCount}
      insightTeaser={insightTeaser}
      setInsightTeaser={setInsightTeaser}
      deepAnalysisResult={deepAnalysisResult}
      dailyBrief={dailyBrief}
      isEnhanced={userProfile?.tier !== 'Basic'}
      isAiLoading={isAiLoading}
      setIsAiLoading={setIsAiLoading}
      isBriefLoading={isBriefLoading}
      isDeepAnalysis={isDeepAnalysis}
      handleDeepAnalysis={handleDeepAnalysis}
      isFirstVisit={isFirstVisit}
      setIsFirstVisit={setIsFirstVisit}
      logs={logs}
      stats={stats}
      insights={insights}
      greeting={greeting}
      recentGadgets={recentGadgets}
      forecastMetrics={forecastMetrics}
      hasNinetyLogsInFiveMonths={hasNinetyLogsInFiveMonths}
      quickInsight={quickInsight}
      sleepGateData={sleepGateData}
      showGateFactors={showGateFactors}
      onToggleGateFactors={() => setShowGateFactors(p => !p)}
    />
  );
}
