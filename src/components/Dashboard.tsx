import React, { useState, useEffect, useMemo } from 'react';
import { 
  Moon, 
  Sun, 
  BarChart3, 
  Plus, 
  ChevronRight, 
  Zap, 
  Clock,
  TrendingUp,
  X,
  BookOpen,
  Brain,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyLog } from '../types';
import { GoogleGenAI } from "@google/genai";
import { SLEEP_FACTS } from '../data/sleepFacts';
import { Card, AvatarFrame, MetricDisplay } from './UI';
import { calculateSleepDuration, calculateSleepEfficiency, formatDuration } from '../utils/sleepUtils';
import { calculateSafeAverage } from '../utils/statsEngine';
import { getSlotLabel } from '../constants';
import { PersonalizationProfile } from '../types';

interface DashboardProps {
  logs: Record<string, DailyLog>;
  correctionsCount: number;
  personalizationProfile: PersonalizationProfile | null;
  onLogClick: () => void;
  onViewChange: (view: any) => void;
  onOpenPersonalization: () => void;
}

export default function Dashboard({ 
  logs, 
  correctionsCount, 
  personalizationProfile,
  onLogClick, 
  onViewChange,
  onOpenPersonalization
}: DashboardProps) {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAllFacts, setShowAllFacts] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [factAnchor, setFactAnchor] = useState<string | null>(null);

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
    const sleepLogs = Object.values(logs).filter(log => log.timeline && log.timeline.some(s => s === 'sleep'));
    if (sleepLogs.length === 0) return "22:00";

    const relativeMinutesArray = sleepLogs.map(log => {
      const firstSleepIndex = log.timeline.findIndex(s => s === 'sleep');
      return firstSleepIndex * 15; // Minutes after 20:00 (TIMELINE_START_HOUR)
    });

    const avgRelativeMinutes = relativeMinutesArray.reduce((a, b) => a + b, 0) / relativeMinutesArray.length;
    const totalMinutesFromMidnight = (20 * 60 + avgRelativeMinutes) % (24 * 60);
    const h = Math.floor(totalMinutesFromMidnight / 60);
    const m = Math.round((totalMinutesFromMidnight % 60) / 15) * 15; // Round to nearest 15 mins
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }, [logs]);

  // Pick a random fact on mount
  const siaFact = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * SLEEP_FACTS.length);
    return SLEEP_FACTS[randomIndex];
  }, []);

  const handleOpenFact = (id: string) => {
    setFactAnchor(id);
    setShowAllFacts(true);
  };

  // Scroll to anchor when modal opens
  useEffect(() => {
    if (showAllFacts && factAnchor) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`fact-${factAnchor}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-4', 'ring-offset-zinc-900');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-4', 'ring-offset-zinc-900');
          }, 2000);
        }
      }, 400); // Wait for modal animation
      return () => clearTimeout(timer);
    }
  }, [showAllFacts, factAnchor]);

  // Get last 7 days of logs
  const last7Days = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  const stats = useMemo(() => {
    const periodLogs = last7Days.map(d => logs[d]).filter(Boolean);
    if (periodLogs.length === 0) return null;

    return {
      avgSq: calculateSafeAverage(periodLogs, 'sleepQuality').average.toFixed(1),
      avgR: calculateSafeAverage(periodLogs, 'restedness').average.toFixed(1),
      avgDuration: formatDuration(calculateSafeAverage(periodLogs, 'sleepDuration').average),
      avgEfficiency: calculateSafeAverage(periodLogs, 'efficiency').average.toFixed(1)
    };
  }, [logs, last7Days]);

  const latestLog = useMemo(() => {
    const sortedDates = Object.keys(logs).sort((a, b) => b.localeCompare(a));
    return logs[sortedDates[0]] || null;
  }, [logs]);

  const greeting = useMemo(() => {
    if (isFirstVisit) {
      return "Hello! I am SIA, your Sleep Intelligence Assistant. Ready to evaluate your sleep patterns and track your progress?";
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

    return `${prefix}... ${suffix}`;
  }, [isFirstVisit, averageBedtime]);

  // AI Insight Generation - Only on mount or when logs count changes significantly
  useEffect(() => {
    const generateInsight = async () => {
      const logsCount = Object.keys(logs).length;
      if (logsCount < 3) return;
      
      setIsAiLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const historyContext = Object.values(logs).slice(-14).map(log => {
          const sleepSlots = log.timeline.filter(s => s === 'sleep').length;
          const inBedSlots = log.timeline.filter(s => s === 'sleep' || s === 'awake-in').length;
          const efficiency = inBedSlots > 0 ? ((sleepSlots / inBedSlots) * 100).toFixed(1) : "0";
          
          return {
            date: log.date,
            sq: log.sleepQuality,
            r: log.restedness,
            l: log.energyLevel,
            efficiency: efficiency + "%",
            remarks: log.remarks,
            factors: log.factors,
            timeline: log.timeline
          };
        });

        const prompt = `
          Analyze these sleep logs: ${JSON.stringify(historyContext)}
          
          TASK: Provide ONE punchy, proactive "SIA Insight" (max 2 sentences).
          Focus on correlations between Sleep Efficiency, Factors (caffeine, alcohol, stress, screens), and SQ/R/L scores.
          
          Example: "💡 SIA Pattern Found: Your Sleep Efficiency drops by 15% on nights with 'Screens in Bed' toggled ON."
          
          Format: "💡 SIA Pattern Found: [Your insight here]"
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction: "You are 'SIA' (Sleep Intelligence Agent), a Sleep Intelligence Agent and Senior Health Data Scientist. Your goal is to provide brief, data-backed sleep insights."
          }
        });

        setAiInsight(response.text || null);
      } catch (e) {
        console.error("Dashboard AI Error:", e);
      } finally {
        setIsAiLoading(false);
      }
    };

    generateInsight();
    // Only regenerate if the number of logs changes (e.g. new day logged)
  }, [Object.keys(logs).length]);

  const isEnhanced = !!personalizationProfile;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-center gap-6 text-left">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative order-2 md:order-1"
        >
          <AvatarFrame 
            src="https://i.imgur.com/MnI5hn3.png" 
            alt="SIA Avatar" 
            size="lg"
            className={`shadow-xl aspect-square object-cover rounded-full ${isEnhanced ? 'shadow-violet-500/20 border-violet-500/30' : 'shadow-indigo-500/10'}`}
          />
        </motion.div>

        <div className="space-y-2 order-3 md:order-2 flex-1">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl md:text-3xl font-bold tracking-tight text-white flex flex-wrap items-center gap-3"
          >
            <span className="bg-clinical-primary text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter align-middle">Sleep Intelligence Agent</span>
            {greeting}
          </motion.h1>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <p className="text-zinc-500 text-sm font-medium">I've analyzed your sleep intelligence for the last 7 days.</p>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => handleOpenFact(siaFact.id)}
          className="order-1 md:order-3 flex items-center gap-2 text-clinical-primary text-[10px] font-black uppercase tracking-widest bg-clinical-primary/5 px-3 py-1.5 rounded-full border border-clinical-primary/10 w-fit cursor-pointer hover:bg-clinical-primary/10 transition-colors animate-sia-pulse"
        >
          <Sparkles size={12} />
          <span>SIA Fact: {siaFact.title}</span>
        </motion.div>
      </section>

      {/* Bento Grid Overview */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`flex flex-col justify-between hover:border-indigo-500/50 group hover:-translate-y-1 hover:shadow-indigo-500/10 transition-all duration-300 min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-indigo-950/30 border-indigo-500/10' : ''}`}>
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 aspect-square object-cover">
              <Sparkles size={20} />
            </div>
            <TrendingUp size={16} className="text-zinc-700 group-hover:text-indigo-400 transition-colors" />
          </div>
          <MetricDisplay 
            title="Avg Quality" 
            value={stats?.avgSq || '--'} 
            unit="/10" 
            className="mt-8 text-left"
          />
        </Card>

        <Card className={`flex flex-col justify-between hover:border-emerald-500/50 group hover:-translate-y-1 hover:shadow-emerald-500/10 transition-all duration-300 min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-emerald-950/20 border-emerald-500/10' : ''}`}>
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 aspect-square object-cover">
              <Clock size={20} />
            </div>
            <TrendingUp size={16} className="text-zinc-700 group-hover:text-emerald-400 transition-colors" />
          </div>
          <MetricDisplay 
            title="Avg Duration" 
            value={stats?.avgDuration || '--'} 
            className="mt-8 text-left"
          />
        </Card>

        <Card className={`flex flex-col justify-between hover:border-purple-500/50 group hover:-translate-y-1 hover:shadow-purple-500/10 transition-all duration-300 min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-purple-950/20 border-purple-500/10' : ''}`}>
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20 aspect-square object-cover">
              <Zap size={20} />
            </div>
            <TrendingUp size={16} className="text-zinc-700 group-hover:text-purple-400 transition-colors" />
          </div>
          <MetricDisplay 
            title="Avg Efficiency" 
            value={stats?.avgEfficiency || '--'} 
            unit="%" 
            className="mt-8 text-left"
          />
        </Card>

        <Card className={`flex flex-col justify-between hover:border-amber-500/50 group hover:-translate-y-1 hover:shadow-amber-500/10 transition-all duration-300 min-h-[160px] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-amber-950/20 border-amber-500/10' : ''}`}>
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20 aspect-square object-cover">
              <Sun size={20} />
            </div>
            <TrendingUp size={16} className="text-zinc-700 group-hover:text-amber-400 transition-colors" />
          </div>
          <MetricDisplay 
            title="Morning Readiness" 
            value={stats?.avgR || '--'} 
            unit="/10" 
            className="mt-8 text-left"
          />
        </Card>
      </section>

      {/* AI Insight Strip */}
      <section>
        <Card 
          className="bg-indigo-600/10 border-indigo-500/20 relative overflow-hidden group hover:bg-indigo-600/15" 
          onClick={() => onViewChange('ai')}
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={80} className="text-indigo-400" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <AvatarFrame 
                src="https://i.imgur.com/MnI5hn3.png" 
                alt="SIA" 
                size="sm"
                className="shadow-lg shadow-indigo-500/20"
              />
              <div>
                <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Sleep Intelligence Agent's Insight</h3>
                <p className="text-white font-bold mt-1 leading-tight">
                  {isAiLoading ? "I'm analyzing your sleep patterns..." : (aiInsight || "Log more nights to unlock my personalized insights.")}
                </p>
              </div>
            </div>
            <button className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-indigo-300 transition-colors">
              Full Report <ChevronRight size={16} />
            </button>
          </div>
        </Card>
      </section>

      {/* Personalization Level Up Card */}
      {!personalizationProfile && (
        <section>
          <Card 
            className="bg-gradient-to-r from-indigo-600 to-violet-600 border-none relative overflow-hidden group cursor-pointer"
            onClick={onOpenPersonalization}
          >
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
              <Sparkles size={100} className="text-white" />
            </div>
            <div className="relative z-10 flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Brain size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Unlock Deep Sleep Intelligence</h3>
                <p className="text-white/80 text-sm font-medium mt-1">Personalize SIA with your goals and clinical data for better insights.</p>
                <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-[0.2em] mt-4 bg-white/10 w-fit px-3 py-1.5 rounded-lg border border-white/20">
                  Level Up Now <ChevronRight size={14} />
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Secondary Row: SIA Fact & Log Action */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          onClick={() => handleOpenFact(siaFact.id)}
          className="flex flex-col justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-xl border border-white/5 group-hover:border-indigo-500/30 transition-colors">
              {siaFact.icon}
            </div>
            <div>
              <p className="metric-title">SIA Fact • {siaFact.category}</p>
              <h4 className="text-sm font-bold text-white mt-0.5 group-hover:text-indigo-400 transition-colors">{siaFact.title}</h4>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-medium">{siaFact.description}</p>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowAllFacts(true);
            }}
            className="mt-4 flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:text-white transition-colors self-end"
          >
            <BookOpen size={14} />
            View All Facts
          </button>
        </Card>

        <Card 
          onClick={onLogClick}
          className="bg-white hover:bg-zinc-100 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20">
              <Plus size={24} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Action</p>
              <p className="text-xl text-black font-black tracking-tight mt-0.5">Log Last Night</p>
              {correctionsCount > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewChange('corrections');
                    }}
                    className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all block text-left w-fit"
                  >
                    FIX MISSING DATA ({correctionsCount})
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewChange('corrections');
                    }}
                    className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-600 underline underline-offset-4 transition-all block text-left"
                  >
                    View Correction Hub
                  </button>
                </div>
              )}
            </div>
          </div>
          <ChevronRight size={24} className="text-zinc-300 group-hover:text-black transition-colors" />
        </Card>
      </section>

      {/* All Facts Modal */}
      <AnimatePresence>
        {showAllFacts && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllFacts(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Sleep Intelligence Library</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Factors Affecting Sleep Quality</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAllFacts(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                {['Lifestyle', 'Environment', 'Psychology', 'Physiology', 'Behavior'].map((cat) => (
                  <div key={cat} className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] border-b border-zinc-800 pb-2">{cat} Factors</h4>
                    <div className="grid gap-4">
                      {SLEEP_FACTS.filter(f => f.category === cat).map(fact => (
                        <div 
                          key={fact.id} 
                          id={`fact-${fact.id}`}
                          className="bg-zinc-800/30 border border-zinc-800 p-4 rounded-2xl flex gap-4 transition-all duration-500"
                        >
                          <div className="text-2xl flex-shrink-0">{fact.icon}</div>
                          <div>
                            <h5 className="text-sm font-bold text-white">{fact.title}</h5>
                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{fact.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-3xl mt-8">
                  <h4 className="text-sm font-bold text-indigo-300">SIA's Summary</h4>
                  <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                    Most sleep problems come from three clusters: <strong>Stimulation</strong> (caffeine, screens, stress), 
                    <strong>Disruption</strong> (noise, light, irregular schedule), and <strong>Internal factors</strong> (pain, hormones, medical conditions).
                    Improving sleep usually means reducing stimulation in the evening, stabilizing your routine, and optimizing your environment.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

