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
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyLog, SleepState, SleepEvent, Insight } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Card, AvatarFrame, MetricDisplay, CircadianWaveform } from './UI';
import { calculateSleepDuration, calculateSleepEfficiency, formatDuration, getGridFromEvents, getMinutesFrom2000 } from '../utils/sleepUtils';
import { calculateSafeAverage } from '../utils/statsEngine';
import { getSlotLabel } from '../constants';
import { PersonalizationProfile } from '../types';
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

interface DashboardProps {
  logs: Record<string, DailyLog>;
  user: User | null;
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

export default function Dashboard({ 
  logs, 
  user,
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
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDeepAnalysis, setIsDeepAnalysis] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

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
      avgSq: calculateSafeAverage(periodLogs, 'sleep_quality').average.toFixed(1),
      avgR: calculateSafeAverage(periodLogs, 'morning_alertness').average.toFixed(1),
      avgL: calculateSafeAverage(periodLogs, 'daytime_energy').average.toFixed(1),
      avgDuration: formatDuration(calculateSafeAverage(periodLogs, 'sleepDuration').average),
      avgEfficiency: calculateSafeAverage(periodLogs, 'efficiency').average.toFixed(1)
    };
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

    if (hour >= 5 && hour < 12) {
      prefix = "Good morning! SIA is here";
      suffix = "Did you have a nice night? Log it in.";
    } else if (hour >= 12 && hour < 18) {
      prefix = "Good afternoon! SIA is here";
      suffix = "Ready to evaluate your sleep patterns and adjust in accordance with the analysis?";
    } else {
      prefix = "Good evening! SIA is here";
      suffix = `Based on your schedule, you usually head to bed around ${averageBedtime}. Ready to wind down?`;
    }

    return { prefix, suffix };
  }, [isFirstVisit, averageBedtime]);

  const insightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInsightKeyRef = useRef<string>('');

  const generateQuickInsight = async () => {
    if (!logs || Object.keys(logs).length < 1 || !process.env.GEMINI_API_KEY || aiInsight) return;
    const logsCount = Object.keys(logs).length;
    
    setIsAiLoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) { console.error('GEMINI_API_KEY not set'); setIsAiLoading(false); return; }
      const ai = new GoogleGenAI({ apiKey });
      // Get last 7 days of logs for analysis
      const sortedLogs = Object.values(logs).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
      const historyContext = sortedLogs.map(log => {
        const sleepData = log.sleepEvents || log.timeline || [];
        const efficiency = calculateSleepEfficiency(sleepData);
        
        return {
          date: log.date,
          sq: log.sleep_quality,
          r: log.morning_alertness,
          l: log.daytime_energy,
          efficiency: efficiency + "%",
        };
      });

      const prompt = `
        Analyze these recent sleep logs (last 7 days): ${JSON.stringify(historyContext)}
        Provide a concise, data-backed "SIA Weekly Insight" (max 25 words). 
        Focus on consistency, timing, and immediate recovery improvements.
        Format: "💡 SIA Weekly Insight: [Your insight here]"
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "You are 'SIA', a Sleep Intelligence Agent. Provide punchy, clinical, data-backed weekly sleep insights."
        }
      });

      setAiInsight(response.text || null);
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
  }, [logs]);

  const handleDeepAnalysis = async () => {
    if (!user || isAiLoading) return;
    
    setIsAiLoading(true);
    setIsDeepAnalysis(true);
    try {
      const daysCount = personalizationProfile ? 180 : 30;
      const logsRef = collection(db, 'users', user.uid, 'sleep_logs');
      
      let querySnapshot = await getDocs(query(logsRef, where('type', '==', 'log'), orderBy('date', 'desc'), limit(daysCount)));
      
      if (querySnapshot.size < 3) {
        // Fallback: fetch without type filter to catch imported logs missing the field
        querySnapshot = await getDocs(query(logsRef, orderBy('date', 'desc'), limit(daysCount)));
      }
      
      const historicalLogs: any[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data() as DailyLog;
        const sleepData = data.sleepEvents || data.timeline || [];
        
        historicalLogs.push({
          d: data.date,
          dur: calculateSleepDuration(sleepData),
          q: data.sleep_quality,
          r: data.morning_alertness,
          eff: calculateSleepEfficiency(sleepData)
        });
      });

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) { console.error('GEMINI_API_KEY not set'); setIsAiLoading(false); return; }
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Analyze ${daysCount} days of sleep history: ${JSON.stringify(historicalLogs)}
        Provide a structured "SIA Monthly Analysis" (max 3 sentences).
        Identify the single most significant trend and offer a specific, actionable clinical recommendation.
        Format: "📊 SIA Monthly Analysis: [Your analysis here]"
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "You are 'SIA', a Sleep Intelligence Agent. Provide deep, structured, data-backed long-term sleep analysis."
        }
      });

      setAiInsight(response.text || null);
    } catch (e) {
      console.error("Deep Analysis Error:", e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const isEnhanced = !!personalizationProfile;

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
      <section className="flex flex-col md:flex-row md:items-center gap-6 text-left">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative order-1 md:order-1"
        >
          <AvatarFrame 
            src="https://i.imgur.com/MnI5hn3.png" 
            alt="SIA Avatar" 
            size="md"
            className={`shadow-xl aspect-square object-cover rounded-full md:w-24 md:h-24 ${isEnhanced ? 'shadow-violet-500/20 border-violet-500/30' : 'shadow-indigo-500/10'}`}
          />
        </motion.div>

        <div className="space-y-2 order-2 md:order-2 flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="bg-clinical-primary text-[9px] md:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold text-white">Sleep Intelligence Agent</span>
          </div>
          <div className="mt-2">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[clamp(1.25rem,4vw,2.5rem)] font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis block text-white"
            >
              {greeting.prefix}{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
            </motion.h1>
            <p className="text-zinc-400 text-sm md:text-base mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
              {greeting.suffix}
            </p>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 pt-4">
          </div>
        </div>
      </section>

      {/* Section 1: The Vital Signs (Metrics) */}
      <section className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <Card className="flex flex-col justify-center border-zinc-800/50 bg-zinc-900/30 p-3 md:p-4 min-h-[140px] md:min-h-[160px] hover:border-zinc-700/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[8px] md:text-[10px] text-zinc-300 uppercase tracking-widest font-bold">Status Report</span>
            </div>
            <p className="text-zinc-400 text-[10px] md:text-sm font-medium leading-relaxed">
              I've analyzed your sleep intelligence for the last 7 days.
            </p>
          </Card>

          <Card className={`flex flex-col justify-between hover:border-indigo-500/50 group hover:-translate-y-1 hover:shadow-indigo-500/10 transition-all duration-300 min-h-[140px] md:min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-indigo-950/30 border-indigo-500/10' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-500/10 rounded-lg md:rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Sparkles size={18} className="md:w-5 md:h-5" />
              </div>
              <TrendingUp size={14} className="text-zinc-700 group-hover:text-indigo-400 transition-colors md:w-4 md:h-4" />
            </div>
            <MetricDisplay 
              title={`Avg Quality`} 
              value={stats?.avgSq || '--'} 
              unit="/10" 
              className="mt-4 md:mt-8 text-left"
            />
          </Card>

          <Card className={`flex flex-col justify-between hover:border-amber-500/50 group hover:-translate-y-1 hover:shadow-amber-500/10 transition-all duration-300 min-h-[140px] md:min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-amber-950/20 border-amber-500/10' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-500/10 rounded-lg md:rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20">
                <Moon size={18} className="md:w-5 md:h-5" />
              </div>
              <TrendingUp size={14} className="text-zinc-700 group-hover:text-amber-400 transition-colors md:w-4 md:h-4" />
            </div>
            <MetricDisplay 
              title={`Restedness`} 
              value={stats?.avgR || '--'} 
              unit="/10" 
              className="mt-4 md:mt-8 text-left"
            />
          </Card>

          <Card className={`flex flex-col justify-between hover:border-emerald-500/50 group hover:-translate-y-1 hover:shadow-emerald-500/10 transition-all duration-300 min-h-[140px] md:min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-emerald-950/20 border-emerald-500/10' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500/10 rounded-lg md:rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Zap size={18} className="md:w-5 md:h-5" />
              </div>
              <TrendingUp size={14} className="text-zinc-700 group-hover:text-emerald-400 transition-colors md:w-4 md:h-4" />
            </div>
            <MetricDisplay 
              title={`Energy Level`} 
              value={stats?.avgL || '--'} 
              unit="/10" 
              className="mt-4 md:mt-8 text-left"
            />
          </Card>

          <Card className={`flex flex-col justify-between hover:border-indigo-500/50 group hover:-translate-y-1 hover:shadow-indigo-500/10 transition-all duration-300 min-h-[140px] md:min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-indigo-950/30 border-indigo-500/10' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-500/10 rounded-lg md:rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Clock size={18} className="md:w-5 md:h-5" />
              </div>
              <TrendingUp size={14} className="text-zinc-700 group-hover:text-indigo-400 transition-colors md:w-4 md:h-4" />
            </div>
            <MetricDisplay 
              title="Avg Sleep Duration" 
              value={stats?.avgDuration || '--'} 
              className="mt-4 md:mt-8 text-left"
            />
          </Card>

          <Card className={`flex flex-col justify-between hover:border-violet-500/50 group hover:-translate-y-1 hover:shadow-violet-500/10 transition-all duration-300 min-h-[140px] md:min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-violet-950/20 border-violet-500/10' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-violet-500/10 rounded-lg md:rounded-xl flex items-center justify-center text-violet-400 border border-violet-500/20">
                <BarChart3 size={18} className="md:w-5 md:h-5" />
              </div>
              <TrendingUp size={14} className="text-zinc-700 group-hover:text-violet-400 transition-colors md:w-4 md:h-4" />
            </div>
            <MetricDisplay 
              title="Avg Efficiency" 
              value={stats?.avgEfficiency || '--'} 
              unit="%" 
              className="mt-4 md:mt-8 text-left"
            />
          </Card>
        </div>
      </section>

      {/* Section 2: SIA Quick Insight */}
      <section className="grid grid-cols-1 gap-4">
        <Card 
          className="bg-zinc-900/50 border-indigo-500/30 relative overflow-hidden group hover:bg-zinc-900/80 cursor-pointer animate-scanning" 
          onClick={() => onViewChange('ai')}
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <CircadianWaveform className="text-indigo-400 w-32" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <AvatarFrame 
                src="https://i.imgur.com/MnI5hn3.png" 
                alt="SIA" 
                size="sm"
                className="shadow-lg shadow-indigo-500/20"
              />
              <div className="text-left">
                <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">
                  {isDeepAnalysis ? `SIA ${personalizationProfile ? '180' : '30'}-Day Analysis` : "SIA 7-Day Insight"}
                </h3>
                <p className="text-white font-bold mt-1 leading-tight">
                  {isAiLoading ? (isDeepAnalysis ? "Analyzing long-term trends..." : "Scanning recent logs...") : (aiInsight || "Log more nights to unlock my personalized insights.")}
                </p>
                {!isDeepAnalysis && !isAiLoading && aiInsight && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeepAnalysis();
                    }}
                    className="mt-2 text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1"
                  >
                    <Sparkles size={10} />
                    Run Deep Analysis ({personalizationProfile ? '180' : '30'} Days)
                  </button>
                )}
              </div>
            </div>
            <button className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-indigo-300 transition-colors">
              Full Report <ChevronRight size={16} />
            </button>
          </div>
        </Card>
      </section>

      {/* Section: AI Insights Feed */}
      {insights.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Clinical Insights Feed</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight) => (
              <Card key={insight.id} className="bg-zinc-900/50 border-zinc-800 hover:border-indigo-500/30 transition-all group relative overflow-hidden text-left">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    insight.type === 'Risk' ? 'bg-red-500/10 text-red-400' :
                    insight.type === 'Pattern' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {insight.type === 'Risk' ? <AlertCircle size={16} /> :
                     insight.type === 'Pattern' ? <TrendingUp size={16} /> :
                     <Zap size={16} />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{insight.type}</span>
                      <span className="text-[9px] font-bold text-zinc-600">• {Math.round(insight.confidence * 100)}% Confidence</span>
                    </div>
                    <h4 className="text-sm font-bold text-white leading-tight">{insight.summary}</h4>
                    {insight.details && <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{insight.details}</p>}
                    <div className="pt-2 flex flex-wrap gap-1">
                      {insight.linkedDates.slice(0, 2).map(date => (
                        <span key={date} className="text-[8px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-500 font-bold">{date}</span>
                      ))}
                      {insight.linkedDates.length > 2 && <span className="text-[8px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-500 font-bold">+{insight.linkedDates.length - 2}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

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
          
          {!personalizationProfile && (
            <Card 
              className="bg-zinc-900 border-indigo-500/20 relative overflow-hidden group cursor-pointer p-0"
              onClick={onOpenPersonalization}
            >
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none flex items-center justify-center">
                <CircadianWaveform className="text-white w-full scale-150" />
              </div>
              
              <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-indigo-500/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-indigo-400 shadow-xl group-hover:scale-110 transition-transform border border-indigo-500/20">
                    <Zap size={32} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-indigo-300">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Clinical Intelligence</span>
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Activate Clinical Intelligence</h3>
                    <p className="text-zinc-300 text-sm font-medium leading-relaxed max-w-md">
                      Provide your clinical parameters and goals to help SIA generate more accurate, medically-informed recovery insights tailored to your unique physiology.
                    </p>
                  </div>
                </div>

                <button 
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl flex items-center justify-center gap-3 whitespace-nowrap"
                >
                  Activate Clinical Intelligence <ChevronRight size={18} />
                </button>
              </div>
            </Card>
          )}
          
          {isEnhanced && (
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
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center">
                  <div className="px-4 py-2 bg-violet-500/5 border border-violet-500/10 rounded-full">
                    <p className="text-[9px] font-black text-violet-300 uppercase tracking-[0.3em] animate-pulse">
                      Scanning for biological anomalies...
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

