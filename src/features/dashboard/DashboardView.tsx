import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Activity, Sun, Zap, Clock, BarChart3, Moon, TrendingUp, Sparkles, Brain, Plus, ChevronRight } from 'lucide-react';
import { Card } from '../../components/UI';
import { MetricSparklineCard } from '../../components/MetricSparklineCard';
import { Header } from '../../components/Header';
import { SleepGateHero } from './SleepGateHero';
import { InsightCard } from '../../components/InsightCard';
import DataMaturityTracker from '../data/DataMaturityTracker';
import SleepGuideCard from '../sleep/SleepGuideCard';

export const DashboardView: React.FC<{
  user: any;
  userProfile: any;
  stats: any;
  insights: any[];
  dailyBrief: string;
  dataMaturity: any;
  dataDepth: any;
  onViewChange: (view: string) => void;
  onLogClick: () => void;
  onOpenSleepGuide: () => void;
  isEnhanced: boolean;
  isAiLoading: boolean;
  handleDeepAnalysis: () => void;
  correctionsCount: number;
  selectedDate: string;
  onOpenPersonalization: () => void;
  onDateChange: (date: string) => void;
  refreshAllData: () => void;
  isRefreshing: boolean;
  insightTeaser: string;
  setInsightTeaser: (teaser: string) => void;
  setIsAiLoading: (loading: boolean) => void;
  isBriefLoading: boolean;
  isDeepAnalysis: boolean;
  isFirstVisit: boolean;
  setIsFirstVisit: (first: boolean) => void;
  getCachedInsight: any;
  setCachedInsight: any;
  logs: any;
  greeting: { prefix: string; suffix: string; showLogLink?: boolean; onLogClick?: () => void; };
  recentGadgets: string[];
}> = ({
  user,
  userProfile,
  stats,
  insights,
  dailyBrief,
  dataMaturity,
  dataDepth,
  onViewChange,
  onLogClick,
  onOpenSleepGuide,
  isEnhanced,
  isAiLoading,
  handleDeepAnalysis,
  correctionsCount,
  selectedDate,
  onOpenPersonalization,
  onDateChange,
  refreshAllData,
  isRefreshing,
  insightTeaser,
  setInsightTeaser,
  setIsAiLoading,
  isBriefLoading,
  isDeepAnalysis,
  isFirstVisit,
  setIsFirstVisit,
  getCachedInsight,
  setCachedInsight,
  logs,
  greeting,
  recentGadgets
}) => {
  return (
    <div className="space-y-8">
      <Header user={user} greeting={greeting} />
      <SleepGateHero logs={{}} userName={userProfile?.displayName} />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Placeholder for Quick Action & Morning Briefing */}
      </div>

      {/* Section: Status Report */}
      <section className="space-y-4">
        <h2 className="font-black text-xs tracking-widest text-zinc-50 uppercase mb-4">Status Report</h2>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <MetricSparklineCard 
            icon={<Activity size={20} className="text-indigo-400" />}
            title="Avg Quality"
            value={stats?.avgSq !== undefined ? Math.round(stats.avgSq) : '--'}
            delta={-1}
            deltaLabel="vs 7d"
            unit="/10"
            data={[4, 6, 5, 7, 5, 6, 4]}
            color="text-indigo-400"
          />
          <MetricSparklineCard 
            icon={<Sun size={20} className="text-amber-400" />}
            title="Restedness"
            value={stats?.avgR !== undefined ? Math.round(stats.avgR) : '--'}
            delta={-2}
            deltaLabel="vs 7d"
            unit="/10"
            data={[5, 6, 5, 7, 6, 5, 5]}
            color="text-amber-400"
          />
          <MetricSparklineCard 
            icon={<Zap size={20} className="text-emerald-400" />}
            title="Energy Level"
            value={stats?.avgE !== undefined ? Math.round(stats.avgE) : '--'}
            delta={1}
            deltaLabel="vs 7d"
            unit="/10"
            data={[4, 5, 6, 5, 7, 6, 6]}
            color="text-emerald-400"
          />
          <MetricSparklineCard 
            icon={<Clock size={20} className="text-sky-400" />}
            title="Avg Sleep Duration"
            value="08:04"
            delta={-30}
            deltaLabel="vs 7d"
            data={[7, 8, 7, 9, 8, 8, 8]}
            color="text-sky-400"
          />
          <MetricSparklineCard 
            icon={<BarChart3 size={20} className="text-violet-400" />}
            title="Avg Efficiency"
            value="96%"
            delta={2}
            deltaLabel="vs 7d"
            data={[92, 94, 93, 96, 95, 96, 96]}
            color="text-violet-400"
          />
          <MetricSparklineCard 
            icon={<Moon size={20} className="text-purple-400" />}
            title="Deep Sleep"
            value="1h 42m"
            delta={2}
            deltaLabel="vs 7d"
            data={[90, 100, 95, 105, 100, 102, 102]}
            color="text-purple-400"
          />
        </div>
      </section>

      {/* SIA Pattern Decoder Card */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        onClick={() => onViewChange('ai')}
        className="w-full rounded-[2rem] border border-indigo-500/20 bg-gradient-to-r from-indigo-950/50 to-zinc-900 p-8 text-left relative overflow-hidden"
      >
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_right,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-4">
            <h3 className="font-black text-xs tracking-widest text-indigo-400 uppercase flex items-center gap-2">
              <Sparkles size={14} />
              SIA PATTERN DECODER
            </h3>
            <p className="text-lg text-white leading-relaxed max-w-md">
              Your daily brief is ready and waiting. SIA only analyses once per day to give your data time to breathe.
            </p>
            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest pt-2">
              Explore this pattern in detail →
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold pt-2">
              Last analyzed: {new Date().toLocaleDateString()} • Next update in 14h
            </p>
          </div>
          <div className="hidden md:block w-48 h-24 opacity-60">
             {/* Simple visualization placeholder for now - or I could use a canvas component if I had one */}
             <div className="w-full h-full bg-gradient-to-r from-indigo-900/0 via-indigo-500/20 to-indigo-900/0 rounded-full blur-xl" />
          </div>
        </div>
      </motion.button>

      {/* Section: Clinical Insights */}
      <section className="space-y-4">
        <h2 className="font-black text-xs tracking-widest text-zinc-50 uppercase mb-4">Clinical Insights</h2>
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
          <Card className="relative bg-zinc-950 border border-zinc-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 border border-zinc-700">
                <Brain size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-300 uppercase tracking-widest">Clinical Insights Feed</h3>
                <p className="text-xs text-zinc-500 font-bold">Advanced Diagnostic Monitoring</p>
              </div>
            </div>
            <button
              onClick={() => onViewChange('account')}
              className="w-full md:w-auto py-3 px-6 bg-zinc-900 border border-indigo-500/30 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2"
            >
              Unlock with Enhanced or Pro
            </button>
          </Card>
        </div>
      </section>

      {/* Section: SIA Learning Hub */}
      <section className="space-y-6 pt-6 border-t border-zinc-800">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-50">SIA Learning Hub</h3>
        <motion.button
          whileHover={{ scale: 1.01 }}
          onClick={onOpenSleepGuide}
          className="w-full rounded-[2rem] border border-cyan-500/20 bg-gradient-to-r from-cyan-950/50 to-zinc-900 p-8 text-left relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(6,182,212,0.1),transparent_70%)]" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-black text-xs tracking-widest text-cyan-400 uppercase">The SIA Guide</h4>
              <p className="text-lg font-bold text-white tracking-tight">Master your sleep cycles</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <Brain size={32} />
            </div>
          </div>
        </motion.button>
      </section>
    </div>
  );
};

export default DashboardView;
