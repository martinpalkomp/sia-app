import React, { useState, useEffect, useMemo } from 'react';
import { 
  Moon, 
  Sun, 
  BarChart3, 
  Sparkles, 
  Plus, 
  ChevronRight, 
  Zap, 
  Clock,
  TrendingUp,
  X,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyLog } from '../types';
import { GoogleGenAI } from "@google/genai";
import { SLEEP_FACTS } from '../data/sleepFacts';
import { Card, AvatarFrame, MetricDisplay } from './UI';
import { calculateSleepDuration, calculateSleepEfficiency } from '../utils/sleepUtils';
import { calculateSafeAverage } from '../utils/statsEngine';

interface DashboardProps {
  logs: Record<string, DailyLog>;
  onLogClick: () => void;
  onViewChange: (view: any) => void;
}

export default function Dashboard({ logs, onLogClick, onViewChange }: DashboardProps) {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAllFacts, setShowAllFacts] = useState(false);

  // Pick a random fact on mount
  const randomFact = useMemo(() => {
    return SLEEP_FACTS[Math.floor(Math.random() * SLEEP_FACTS.length)];
  }, []);

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
      avgDuration: calculateSafeAverage(periodLogs, 'sleepDuration').average.toFixed(1),
      avgEfficiency: calculateSafeAverage(periodLogs, 'efficiency').average.toFixed(1)
    };
  }, [logs, last7Days]);

  const latestLog = useMemo(() => {
    const sortedDates = Object.keys(logs).sort((a, b) => b.localeCompare(a));
    return logs[sortedDates[0]] || null;
  }, [logs]);

  const greeting = useMemo(() => {
    if (!latestLog) return "Hello! I'm SIA. Ready to start tracking your recovery?";
    if (latestLog.sleepQuality >= 8) return "Good Morning! SIA here—you recovered exceptionally well last night.";
    if (latestLog.sleepQuality >= 6) return "Good Morning! SIA here—you had a decent rest.";
    return "Good Morning. SIA here—let's focus on improving your recovery today.";
  }, [latestLog]);

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

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-center gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <AvatarFrame 
            src="https://i.imgur.com/MnI5hn3.png" 
            alt="SIA Avatar" 
            size="lg"
            className="shadow-xl shadow-indigo-500/10"
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-clinical-bg rounded-full" />
        </motion.div>

        <div className="space-y-2">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold tracking-tight text-white flex flex-wrap items-center gap-3"
          >
            <span className="bg-indigo-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter align-middle">Sleep Intelligence Agent</span>
            {greeting}
          </motion.h1>
          <p className="text-zinc-500 text-sm font-medium">I've analyzed your sleep intelligence for the last 7 days.</p>
        </div>
      </section>

      {/* Bento Grid Overview */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between hover:border-indigo-500/50 group">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Sparkles size={20} />
            </div>
            <TrendingUp size={16} className="text-zinc-700 group-hover:text-indigo-400 transition-colors" />
          </div>
          <MetricDisplay 
            title="Avg Quality" 
            value={stats?.avgSq || '--'} 
            unit="/10" 
            className="mt-8"
          />
        </Card>

        <Card className="flex flex-col justify-between hover:border-emerald-500/50 group">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Clock size={20} />
            </div>
            <TrendingUp size={16} className="text-zinc-700 group-hover:text-emerald-400 transition-colors" />
          </div>
          <MetricDisplay 
            title="Avg Duration" 
            value={stats?.avgDuration || '--'} 
            unit="hrs" 
            className="mt-8"
          />
        </Card>

        <Card className="flex flex-col justify-between hover:border-purple-500/50 group">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20">
              <Zap size={20} />
            </div>
            <TrendingUp size={16} className="text-zinc-700 group-hover:text-purple-400 transition-colors" />
          </div>
          <MetricDisplay 
            title="Avg Efficiency" 
            value={stats?.avgEfficiency || '--'} 
            unit="%" 
            className="mt-8"
          />
        </Card>

        <Card className="flex flex-col justify-between hover:border-amber-500/50 group">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Sun size={20} />
            </div>
            <TrendingUp size={16} className="text-zinc-700 group-hover:text-amber-400 transition-colors" />
          </div>
          <MetricDisplay 
            title="Morning Readiness" 
            value={stats?.avgR || '--'} 
            unit="/10" 
            className="mt-8"
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

      {/* Secondary Row: Sleep Fact & Log Action */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-xl border border-white/5">
              {randomFact.icon}
            </div>
            <div>
              <p className="metric-title">SIA's Sleep Fact</p>
              <h4 className="text-sm font-bold text-white mt-0.5">{randomFact.title}</h4>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-medium">{randomFact.description}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAllFacts(true)}
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
                        <div key={fact.id} className="bg-zinc-800/30 border border-zinc-800 p-4 rounded-2xl flex gap-4">
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

