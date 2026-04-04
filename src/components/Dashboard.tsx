import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Moon, 
  Sun, 
  BarChart3, 
  Plus, 
  ChevronRight, 
  Zap, 
  Clock,
  TrendingUp,
  AlertCircle,
  Brain,
  Sparkles,
  Loader2,
  Settings,
  Ghost,
  FileText,
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { DailyLog, SleepState, SleepEvent, Insight, UserProfile } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Card, AvatarFrame, MetricDisplay, CircadianWaveform } from './UI';
import { calculateSleepDuration, calculateSleepEfficiency, formatDuration, getGridFromEvents, getMinutesFrom2000 } from '../utils/sleepUtils';
import { calculateSafeAverage } from '../utils/statsEngine';
import { getSlotLabel } from '../constants';
import { PersonalizationProfile } from '../types';
import { AIService, MaturityInfo } from '../services/aiService';
import { 
  db, 
  User, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit, 
  getDocs,
  doc,
  deleteDoc
} from '../lib/firebase';
import { getTodayDate, formatDisplayDate } from '../utils/dateUtils';
import SleepGuideCard from './SleepGuideCard';
import { SleepWindow } from './SleepWindow';
import SleepPatternCard from './SleepPatternCard';
import { Header } from './Header';
import { InsightCard } from './InsightCard';

interface DashboardProps {
  logs: Record<string, DailyLog>;
  user: User | null;
  userProfile: UserProfile | null;
  selectedDate: string;
  correctionsCount: number;
  personalizationProfile: PersonalizationProfile | null;
  onLogClick: () => void;
  onViewChange: (view: any) => void;
  onOpenPersonalization: () => void;
  onOpenSleepGuide: () => void;
  onDateChange: (date: string | number) => void;
  refreshAllData: () => void;
  isRefreshing: boolean;
}

const StaticFallbackUI = ({ onLogClick }: { onLogClick: () => void }) => {
  return (
    <div className="space-y-4">
      <p className="text-zinc-200 leading-relaxed text-sm font-medium">
        Awaiting Initial Data. Log your first sleep session to activate your Intelligence Agent.
      </p>
      <button 
        onClick={onLogClick}
        className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-xs font-bold transition-all border border-zinc-700"
      >
        Log Last Night
      </button>
    </div>
  );
};

export default function Dashboard({ 
  logs, 
  user,
  userProfile,
  selectedDate,
  correctionsCount, 
  personalizationProfile,
  onLogClick, 
  onViewChange,
  onOpenPersonalization,
  onOpenSleepGuide,
  onDateChange,
  refreshAllData,
  isRefreshing
}: DashboardProps) {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [dailyBrief, setDailyBrief] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [isDeepAnalysis, setIsDeepAnalysis] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showUnlockEnhanced, setShowUnlockEnhanced] = useState(false);
  const [maturity, setMaturity] = useState<MaturityInfo | null>(null);

  // Fetch maturity info
  useEffect(() => {
    if (!user) return;
    AIService.getUserDataMaturity(user.uid).then(setMaturity);
  }, [user?.uid]);

  const rephraseGuardrailMessage = (reason: string): string => {
    if (reason.includes("Already generated today")) {
      return "Your daily brief is ready and waiting. SIA only analyses once per day to give your data time to breathe.";
    }
    if (reason.includes("still calibrating")) {
      return "SIA is still getting to know you. Log a few more nights to unlock your personalised brief.";
    }
    if (reason.includes("Pro tier") || reason.includes("90 days")) {
      return "Deep Analysis unlocks at 90 days of data and Pro tier. SIA is building towards it.";
    }
    return reason;
  };

  // Fetch/Generate Daily Brief
  const today = getTodayDate();
  useEffect(() => {
    if (!user || !userProfile || !logs || Object.keys(logs).length === 0 || !maturity) return;
    const fetchBrief = async () => {
      setIsBriefLoading(true);
      try {
        const response = await AIService.generateDailyBrief(
          user.uid, 
          Object.values(logs), 
          userProfile.tier,
          maturity
        );
        if (response.status === 'success') {
          setDailyBrief(response.content);
        } else {
          setDailyBrief(rephraseGuardrailMessage(response.reason));
        }
      } catch (err) {
        console.error("Brief Error:", err);
      } finally {
        setIsBriefLoading(false);
      }
    };

    fetchBrief();
  }, [user?.uid, userProfile?.tier, today, maturity]);

  const getTierColors = (tier: string) => {
    switch (tier) {
      case 'Pro': return "bg-violet-600/10 border-violet-500/30";
      case 'Enhanced': return "bg-indigo-600/10 border-indigo-500/30";
      default: return "bg-zinc-600/10 border-zinc-500/30";
    }
  };


  // Fetch insights from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'insights'),
      orderBy('createdAt', 'desc'),
      limit(6)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Insight[] = [];
      snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as Insight));
      setInsights(fetched);
    });
    return () => unsubscribe();
  }, [user]);

  // Check for first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('sia_has_visited');
    if (!hasVisited) {
      setIsFirstVisit(true);
      localStorage.setItem('sia_has_visited', 'true');
    }
  }, []);

  // Calculate average bedtime
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
    const m = Math.round((totalMinutesFromMidnight % 60) / 15) * 15; // Round to nearest 15 mins
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }, [logs]);

  // Get last 7 days of logs relative to selectedDate
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

  const chartData = useMemo(() => {
    return periodDates.slice().reverse().map(date => {
      const log = logs[date];
      return {
        date: date.split('-')[2], // Just the day
        sq: log ? log.sleep_quality : 0,
        r: log ? log.morning_alertness : 0,
        l: log ? log.daytime_energy : 0
      };
    });
  }, [logs, periodDates]);

  const latestLog = useMemo(() => {
    const sortedDates = Object.keys(logs).sort((a, b) => b.localeCompare(a));
    return logs[sortedDates[0]] || null;
  }, [logs]);

    const greeting = useMemo(() => {
    if (isFirstVisit) {
      return {
        prefix: "Hello! I am SIA, your Sleep Intelligence Assistant.",
        suffix: "Ready to evaluate your sleep patterns and track your progress?"
      };
    }

    const hour = new Date().getHours();
    let prefix = "";
    let suffix = "";
    let showLogLink = false;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const hasYesterdayLog = !!logs[yesterdayStr];

    if (hour >= 5 && hour < 12) {
      prefix = "Good morning! SIA is here";
      if (hasYesterdayLog) {
        suffix = "You've logged your sleep! Ready to see your analysis?";
        showLogLink = false;
      } else {
        suffix = "Did you have a nice night? Log it in.";
        showLogLink = true;
      }
    } else if (hour >= 12 && hour < 18) {
      prefix = "Good afternoon! SIA is here";
      suffix = "Ready to evaluate your sleep patterns and adjust in accordance with the analysis?";
    } else {
      prefix = "Good evening! SIA is here";
      suffix = `Based on your schedule, you usually head to bed around ${averageBedtime}. Ready to wind down?`;
    }

    return { prefix, suffix, showLogLink, onLogClick };
  }, [isFirstVisit, averageBedtime, logs, onLogClick]);

  const insightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInsightKeyRef = useRef<string>('');

  const generateQuickInsight = async () => {
    if (!logs || Object.keys(logs).length < 1 || !user || !userProfile || !maturity || aiInsight) return;
    
    setIsAiLoading(true);
    try {
      const response = await AIService.generateQuickInsight(
        user.uid,
        Object.values(logs),
        userProfile.tier,
        maturity,
        null // Need to fetch lastGeneratedDate if needed
      );
      
      if (response.status === 'success') {
        setAiInsight(response.content);
      } else {
        setAiInsight(rephraseGuardrailMessage(response.reason));
      }
    } catch (e) {
      console.error("Dashboard AI Error:", e);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    const logsCount = Object.keys(logs).length;
    const key = `${logsCount}-${logsCount > 2 ? 'bulk' : 'single'}`;
    if (key === lastInsightKeyRef.current) return;
    if (insightDebounceRef.current) clearTimeout(insightDebounceRef.current);
    insightDebounceRef.current = setTimeout(async () => {
      lastInsightKeyRef.current = key;
      await generateQuickInsight();
    }, 2000);
    return () => { if (insightDebounceRef.current) clearTimeout(insightDebounceRef.current); };
  }, [logs, user, userProfile, maturity]);

  const handleDeepAnalysis = async () => {
    if (!user || !userProfile || isAiLoading || !maturity) return;
    
    setIsAiLoading(true);
    setIsDeepAnalysis(true);
    try {
      const daysCount = personalizationProfile ? 180 : 30;
      const logsRef = collection(db!, 'users', user.uid, 'sleep_logs');
      
      let querySnapshot = await getDocs(query(logsRef, where('type', '==', 'log'), orderBy('date', 'desc'), limit(daysCount)));
      
      if (querySnapshot.size < 3) {
        // Fallback: fetch without type filter to catch imported logs missing the field
        querySnapshot = await getDocs(query(logsRef, orderBy('date', 'desc'), limit(daysCount)));
      }
      
      const historicalLogs: DailyLog[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data() as DailyLog;
        historicalLogs.push(data);
      });

      const response = await AIService.generateDeepAnalysis(
        user.uid,
        historicalLogs,
        userProfile.tier,
        maturity,
        null // Need to fetch lastGeneratedDate if needed
      );

      if (response.status === 'success') {
        setAiInsight(response.content);
      } else {
        setAiInsight(rephraseGuardrailMessage(response.reason));
      }
    } catch (e) {
      console.error("Deep Analysis Error:", e);
    } finally {
      setIsDeepAnalysis(false);
      setIsAiLoading(false);
    }
  };

  const dataMaturity = useMemo(() => {
    const localCount = Object.keys(logs).length;
    const remoteCount = maturity?.count ?? 0;
    const count = remoteCount > 0 ? remoteCount : localCount;
    if (count >= 90) return { level: 3, count, label: 'Full Insight', nextThreshold: 90 };
    if (count >= 15) return { level: 2, count, label: 'Emerging Patterns', nextThreshold: 90 };
    return { level: 1, count, label: 'Baseline', nextThreshold: 15 };
  }, [logs, maturity]);

  const DISCLAIMER = "SIA provides lifestyle recommendations based on patterns. This is not a medical diagnosis. Consult a professional for clinical concerns.";

  const isEnhanced = !!personalizationProfile;

  const FEATURE_FLAGS = {
    showClinicalInsights: true,
    showSiaIntelligence: true
  };

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

  return (
    <div className="space-y-8 pb-12 relative">
      {/* Refresh Overlay */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-clinical-bg/60 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-zinc-900/90 border border-indigo-500/30 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 shadow-2xl">
              <Loader2 className="animate-spin text-indigo-500" size={40} />
              <div className="text-center">
                <p className="text-white font-bold">Syncing SIA Intelligence...</p>
                <p className="text-[10px] text-zinc-300 uppercase tracking-widest mt-1">Updating your recovery trends</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <Header user={user} greeting={greeting} />

      {/* Daily Brief Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${getTierColors(userProfile?.tier || 'Basic')} rounded-[2.5rem] p-8 relative overflow-hidden`}
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles size={120} className="text-indigo-500" />
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
              <Sparkles className="text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-white">SIA DAILY BRIEF</h2>
              <p className="text-xs text-indigo-300/70 font-medium uppercase tracking-widest">Personalized Recovery Summary</p>
            </div>
          </div>

          {isBriefLoading ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="animate-spin text-indigo-500" size={20} />
              <p className="text-zinc-400 text-sm italic">SIA is analyzing your recent patterns...</p>
            </div>
          ) : (!logs || Object.keys(logs).length === 0) ? (
            <StaticFallbackUI onLogClick={onLogClick} />
          ) : dailyBrief ? (
            <div className="space-y-4">
              <p className="text-zinc-200 leading-relaxed text-sm font-medium">
                {dailyBrief.split('\n\n***\n\n')[0]}
              </p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => onViewChange('ai')}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  Discuss with SIA
                </button>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm italic py-4">No brief available for today yet. Log your sleep to get started.</p>
          )}
        </div>
      </motion.div>

      {/* Section: Status Report */}
      <section className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <Card className="col-span-2 md:col-span-1 flex flex-col justify-center border-zinc-800/50 bg-zinc-900/30 p-3 md:p-4 min-h-[140px] md:min-h-[160px] hover:border-zinc-700/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[8px] md:text-[10px] text-zinc-300 uppercase tracking-widest font-bold">Status Report</span>
            </div>
            <p className="text-zinc-400 text-[10px] md:text-sm font-medium leading-relaxed">
              {Object.keys(logs).length > 0
                ? "I've analyzed your sleep intelligence for the last 7 days."
                : userProfile?.tier === 'Pro'
                ? "Consistency is key. Log now to maintain your high-precision forecasting."
                : userProfile?.tier === 'Enhanced'
                ? "Log 7 nights to unlock your weekly trend analysis."
                : "Log 3 nights to see your first patterns."}
            </p>
          </Card>

          <Card className={`flex flex-col justify-between hover:border-indigo-400 group hover:-translate-y-1 hover:shadow-indigo-500/20 transition-all duration-300 min-h-[140px] md:min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-indigo-900/20 border-indigo-500/30' : 'border-zinc-800'}`}>
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-500/20 rounded-lg md:rounded-xl flex items-center justify-center text-indigo-300 border border-indigo-500/30">
                <Activity size={18} className="md:w-5 md:h-5" />
              </div>
              <TrendingUp size={14} className="text-zinc-600 group-hover:text-indigo-400 transition-colors md:w-4 md:h-4" />
            </div>
            <MetricDisplay 
              title={`Avg Quality`} 
              value={stats?.avgSq !== undefined ? Math.round(stats.avgSq) : '--'} 
              unit="/10" 
              className="mt-4 md:mt-8 text-left"
            />
          </Card>

          <Card className={`flex flex-col justify-between hover:border-amber-400 group hover:-translate-y-1 hover:shadow-amber-500/20 transition-all duration-300 min-h-[140px] md:min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-amber-900/20 border-amber-500/30' : 'border-zinc-800'}`}>
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-500/20 rounded-lg md:rounded-xl flex items-center justify-center text-amber-300 border border-amber-500/30">
                <Sun size={18} className="md:w-5 md:h-5" />
              </div>
              <TrendingUp size={14} className="text-zinc-600 group-hover:text-amber-400 transition-colors md:w-4 md:h-4" />
            </div>
            <MetricDisplay 
              title={`Restedness`} 
              value={stats?.avgR !== undefined ? Math.round(stats.avgR) : '--'} 
              unit="/10" 
              className="mt-4 md:mt-8 text-left"
            />
          </Card>

          <Card className={`flex flex-col justify-between hover:border-emerald-400 group hover:-translate-y-1 hover:shadow-emerald-500/20 transition-all duration-300 min-h-[140px] md:min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-emerald-900/20 border-emerald-500/30' : 'border-zinc-800'}`}>
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500/20 rounded-lg md:rounded-xl flex items-center justify-center text-emerald-300 border border-emerald-500/30">
                <Zap size={18} className="md:w-5 md:h-5" />
              </div>
              <TrendingUp size={14} className="text-zinc-600 group-hover:text-emerald-400 transition-colors md:w-4 md:h-4" />
            </div>
            <MetricDisplay 
              title={`Energy Level`} 
              value={stats?.avgL !== undefined ? Math.round(stats.avgL) : '--'} 
              unit="/10" 
              className="mt-4 md:mt-8 text-left"
            />
          </Card>

          <Card className={`flex flex-col justify-between hover:border-indigo-400 group hover:-translate-y-1 hover:shadow-indigo-500/20 transition-all duration-300 min-h-[140px] md:min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-indigo-900/20 border-indigo-500/30' : 'border-zinc-800'}`}>
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-500/20 rounded-lg md:rounded-xl flex items-center justify-center text-indigo-300 border border-indigo-500/30">
                <Clock size={18} className="md:w-5 md:h-5" />
              </div>
              <TrendingUp size={14} className="text-zinc-600 group-hover:text-indigo-400 transition-colors md:w-4 md:h-4" />
            </div>
            <MetricDisplay 
              title="Avg Sleep Duration" 
              value={stats?.avgDuration !== undefined ? formatDuration(stats.avgDuration) : '--'} 
              className="mt-4 md:mt-8 text-left"
            />
          </Card>

          <Card className={`flex flex-col justify-between hover:border-violet-400 group hover:-translate-y-1 hover:shadow-violet-500/20 transition-all duration-300 min-h-[140px] md:min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-violet-900/20 border-violet-500/30' : 'border-zinc-800'}`}>
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-violet-500/20 rounded-lg md:rounded-xl flex items-center justify-center text-violet-300 border border-violet-500/30">
                <BarChart3 size={18} className="md:w-5 md:h-5" />
              </div>
              <TrendingUp size={14} className="text-zinc-600 group-hover:text-violet-400 transition-colors md:w-4 md:h-4" />
            </div>
            <MetricDisplay 
              title="Avg Efficiency" 
              value={stats?.avgEfficiency !== undefined ? Math.round(stats.avgEfficiency) : '--'} 
              unit="%" 
              className="mt-4 md:mt-8 text-left"
            />
          </Card>
        </div>
      </section>

      {/* Section: SIA Quick Insight */}
      <section className="grid grid-cols-1 gap-4">
        <Card 
          className="bg-zinc-900/50 border-indigo-500/30 relative overflow-hidden group hover:bg-zinc-900/80 cursor-pointer" 
          onClick={() => onViewChange('ai')}
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles size={120} className="text-indigo-500" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                <Sparkles className="text-indigo-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">SIA QUICK INSIGHT</h2>
                <p className="text-xs text-indigo-300/70 font-medium uppercase tracking-widest">Personalized Pattern Analysis</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-zinc-200 leading-relaxed text-sm font-medium">
                {isAiLoading ? (isDeepAnalysis ? "Analyzing long-term trends..." : "Scanning recent logs...") : (aiInsight ? aiInsight : "Log more nights to unlock my personalized insights.")}
              </p>
              {!isAiLoading && aiInsight && (
                <p className="text-[10px] text-zinc-500 italic leading-tight">{DISCLAIMER}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Insights Feed */}
        {insights.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Clinical Insights</h3>
            {insights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </section>

      {/* Section: Data Maturity Progress */}
      <section className="space-y-6">
        <div className="flex items-center justify-between group relative">
          <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">SIA Intelligence Maturity</h3>
          <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 cursor-help opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px]">i</span>
          </div>
          <div className="absolute top-full right-0 mt-2 w-64 p-4 bg-zinc-900/95 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            <div className={`mb-2 pb-2 border-b border-zinc-800 ${dataMaturity.level === 1 ? 'text-indigo-400 font-bold' : ''}`}>
              <strong>BASELINE (0-14d):</strong> SIA is establishing your unique physiological 'normal' and identifying initial sleep-wake patterns.
            </div>
            <div className={`mb-2 pb-2 border-b border-zinc-800 ${dataMaturity.level === 2 ? 'text-indigo-400 font-bold' : ''}`}>
              <strong>RHYTHM ANALYSIS (15-89d):</strong> SIA begins mapping circadian consistency and identifying external triggers affecting your recovery.
            </div>
            <div className={`${dataMaturity.level === 3 ? 'text-indigo-400 font-bold' : ''}`}>
              <strong>DEEP INTELLIGENCE (90d+):</strong> Full activation. SIA correlates long-term lifestyle data with clinical markers for high-precision health forecasting.
            </div>
          </div>
        </div>
        <Card className="bg-zinc-900/30 border-zinc-800/50 p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap size={48} className="text-indigo-500" />
          </div>
          
          <div className="relative z-10 space-y-4">
            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end mb-1 gap-2">
              <div className="text-left">
                <p className="text-xs font-bold text-white">Data Fidelity Progress</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  {dataMaturity.level === 3 
                    ? "Maximum insight level reached" 
                    : `Next milestone: ${dataMaturity.nextThreshold} days`}
                </p>
              </div>
              <div className="text-left md:text-right">
                <span className="text-2xl font-black text-white">{dataMaturity.count}</span>
                <span className="text-xs text-zinc-500 font-bold uppercase ml-1">Days Logged</span>
              </div>
            </div>
            
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (dataMaturity.count / dataMaturity.nextThreshold) * 100)}%` }}
                className={`h-full transition-all duration-1000 ${
                  dataMaturity.level === 3 ? 'bg-emerald-500' :
                  dataMaturity.level === 2 ? 'bg-blue-500' :
                  'bg-amber-500'
                }`}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { level: 1, label: 'Baseline', days: '0+', active: dataMaturity.level >= 1 },
                { level: 2, label: 'Rhythms', days: '15+', active: dataMaturity.level >= 2 },
                { level: 3, label: 'Deep Analysis', days: '90+', active: dataMaturity.level >= 3 },
              ].map((step) => (
                <div key={step.level} className="text-center space-y-1">
                  <div className={`h-1 rounded-full transition-colors ${step.active ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
                  <p className={`text-[8px] font-black uppercase tracking-tighter ${step.active ? 'text-indigo-400' : 'text-zinc-600'}`}>{step.label}</p>
                  <p className="text-[8px] text-zinc-700 font-bold">{step.days} Days</p>
                </div>
              ))}
            </div>

            {userProfile?.tier === 'Pro' && dataMaturity.level < 3 && (
              <div className="pt-2 flex items-center gap-2 text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                <Sparkles size={12} />
                <span>Pro Member: Your analysis will automatically deepen as data matures</span>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Section 3: Engagement & Actions */}
      <section className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            onClick={onLogClick}
            className="bg-indigo-600 border-none hover:bg-indigo-500 flex items-center justify-between group shadow-lg shadow-indigo-600/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
                <Plus size={24} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Quick Action</p>
                <p className="text-xl text-white font-black tracking-tight mt-0.5">Log Last Night</p>
                {correctionsCount > 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewChange('corrections');
                    }}
                    className="mt-2 text-[10px] font-bold text-white uppercase tracking-widest hover:underline bg-white/10 px-2 py-1 rounded-lg border border-white/20"
                  >
                    FIX MISSING DATA ({correctionsCount})
                  </button>
                )}
              </div>
            </div>
            <ChevronRight size={24} className="text-white group-hover:translate-x-1 transition-transform" />
          </Card>

          <Card 
            onClick={() => onViewChange('ai')}
            className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 transition-colors">
                <Sparkles size={24} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Deep Dive</p>
                <p className="text-xl text-white font-black tracking-tight mt-0.5">AI Analysis</p>
              </div>
            </div>
            <ChevronRight size={24} className="text-zinc-300 group-hover:text-white group-hover:translate-x-1 transition-transform" />
          </Card>
        </div>
      </section>

      {/* Section 4: The Growth Hub */}
      <section className="space-y-6 pt-6 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Growth Hub</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <SleepGuideCard onClick={onOpenSleepGuide} gadgetSummary={recentGadgets} />
          
          {FEATURE_FLAGS.showSiaIntelligence && isEnhanced && (
            <Card 
              className="bg-zinc-950 border-violet-500/30 relative overflow-hidden group p-0"
            >
              <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
                <CircadianWaveform className="text-violet-400 w-full scale-150" />
              </div>
              
              <div className="relative z-10 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400 border border-violet-500/20">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">SIA Intelligence Feed</h3>
                    <p className="text-[10px] text-violet-300 font-bold">Advanced Diagnostic Monitoring</p>
                  </div>
                </div>

                {dataMaturity.level < 3 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-zinc-900/50 rounded-2xl flex items-center justify-center text-zinc-700 mx-auto border border-zinc-800">
                      <Brain size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Intelligence Gated</h4>
                      <p className="text-xs text-zinc-600 max-w-xs mx-auto leading-relaxed">
                        SIA Intelligence requires 90 days of baseline data to identify biological anomalies. (Progress: {dataMaturity.count}/90).
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl border-l-2 border-l-violet-500/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Neuro-Diagnostic</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">Alzheimer's Risk Evaluation</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Analyzing N3/REM architecture for early biomarkers. Intelligence activation required for full report.
                        </p>
                        <p className="text-[8px] text-zinc-600 italic mt-2 leading-tight">{DISCLAIMER}</p>
                      </div>

                      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl border-l-2 border-l-emerald-500/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Metabolic-Diagnostic</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">Obesity & Metabolic Flux</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Monitoring circadian alignment with last meal timing. Baseline established.
                        </p>
                        <p className="text-[8px] text-zinc-600 italic mt-2 leading-tight">{DISCLAIMER}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-center">
                      <div className="px-4 py-2 bg-violet-500/5 border border-violet-500/10 rounded-full">
                        <p className="text-[9px] font-black text-violet-300 uppercase tracking-[0.3em] animate-pulse">
                          Scanning for biological anomalies...
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

