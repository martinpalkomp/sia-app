import React from 'react';
import { 
  Moon, 
  Sun, 
  BarChart3, 
  Plus, 
  ChevronRight, 
  Zap, 
  Clock,
  TrendingUp,
  Brain,
  Sparkles,
  Loader2,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyLog, Insight, UserProfile } from '../../types';
import { User } from '../../lib/firebase';
import { MaturityInfo } from '../../services/aiService';
import { Card, MetricDisplay, CircadianWaveform } from '../../components/UI';
import { formatDuration } from '../../utils/sleepUtils';
import SleepGuideCard from '../sleep/SleepGuideCard';
import { Header } from '../../components/Header';
import { InsightCard } from '../../components/InsightCard';
import { LockedFeatureCard } from '../../components/LockedFeatureCard';
import DataMaturityTracker from '../data/DataMaturityTracker';
import { DevSwitchboardMini } from '../../components/DevSwitchboardMini';

interface DashboardViewProps {
  user: User | null;
  userProfile: UserProfile | null;
  selectedDate: string;
  onLogClick: () => void;
  onViewChange: (view: any) => void;
  onOpenPersonalization: () => void;
  onOpenSleepGuide: () => void;
  onDateChange: (date: string | number) => void;
  refreshAllData: () => void;
  isRefreshing: boolean;
  dataMaturity: MaturityInfo;
  dataDepth: any; 
  correctionsCount: number;
  insightTeaser: string | null;
  setInsightTeaser: (val: string | null) => void;
  dailyBrief: string | null;
  isAiLoading: boolean;
  setIsAiLoading: (val: boolean) => void;
  isBriefLoading: boolean;
  isDeepAnalysis: boolean;
  handleDeepAnalysis: () => void;
  isFirstVisit: boolean;
  setIsFirstVisit: (val: boolean) => void;
  getCachedInsight: () => string | null;
  setCachedInsight: (val: string) => void;
  logs: Record<string, DailyLog>;
  stats: any;
  insights: any[];
  greeting: any;
  recentGadgets: string[];
}

const StaticFallbackUI = ({ dataDepth }: { dataDepth: any }) => {
  const count = Math.min(7, dataDepth.count);
  return (
    <div className="space-y-4">
      <p className="text-zinc-200 leading-relaxed text-sm font-medium">
        Log more nights to unlock your weekly trend analysis ({count}/7)
      </p>
    </div>
  );
};

export default function DashboardView({
  user,
  userProfile,
  selectedDate,
  onLogClick,
  onViewChange,
  onOpenPersonalization,
  onOpenSleepGuide,
  onDateChange,
  refreshAllData,
  isRefreshing,
  dataMaturity,
  dataDepth,
  correctionsCount,
  insightTeaser,
  setInsightTeaser,
  dailyBrief,
  isAiLoading,
  setIsAiLoading,
  isBriefLoading,
  isDeepAnalysis,
  handleDeepAnalysis,
  isFirstVisit,
  setIsFirstVisit,
  getCachedInsight,
  setCachedInsight,
  logs,
  stats,
  insights,
  greeting,
  recentGadgets
}: DashboardViewProps) {
  const DISCLAIMER = "SIA provides lifestyle recommendations based on patterns. This is not a medical diagnosis. Consult a professional for clinical concerns.";
  const isEnhanced = userProfile?.tier === 'Enhanced' || userProfile?.tier === 'Pro';
  const FEATURE_FLAGS = {
    showClinicalInsights: true,
    showSiaIntelligence: true
  };

  const getTierColors = (tier: string) => {
    switch (tier) {
      case 'Pro': return "bg-violet-600/10 border-violet-500/30";
      case 'Enhanced': return "bg-indigo-600/10 border-indigo-500/30";
      default: return "bg-zinc-600/10 border-zinc-500/30";
    }
  };

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
            <div className="bg-zinc-900/90 border border-indigo-500/30 p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
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
      <DevSwitchboardMini className="fixed top-4 right-4 z-[9999]" />

      {/* Daily Brief Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${getTierColors(userProfile?.tier || 'Basic')} rounded-clinical p-8 relative overflow-hidden`}
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
              <h3 className="font-black text-xs tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-400" />
                SIA MORNING BRIEFING
              </h3>
            </div>
          </div>

          {isBriefLoading ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="animate-spin text-indigo-500" size={20} />
              <p className="text-zinc-400 text-sm italic">SIA is analyzing your recent patterns...</p>
            </div>
          ) : (dataMaturity.level < 2) ? (
            <StaticFallbackUI dataDepth={dataDepth} />
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 min-h-[18svh]">
          <Card className={`flex flex-col justify-between hover:border-zinc-400 group hover:-translate-y-1 hover:shadow-zinc-500/20 transition-all duration-300 min-h-[18svh] animate-sia-pulse border-zinc-800 bg-zinc-900/30`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] text-zinc-50 font-black uppercase tracking-widest">STATUS REPORT</span>
            </div>
            <p className="text-zinc-400 text-[10px] md:text-sm font-bold leading-relaxed tracking-widest mt-2">
              {dataMaturity && dataMaturity.count >= 7
                ? "I've analyzed your sleep intelligence for the last 7 days."
                : `Log more nights to unlock your weekly trend analysis (${dataMaturity?.count || 0}/7)`}
            </p>
          </Card>

          <Card className={`flex flex-col justify-between hover:border-indigo-400 group hover:-translate-y-1 hover:shadow-indigo-500/20 transition-all duration-300 min-h-[18svh] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-indigo-900/20 border-indigo-500/30' : 'border-zinc-800'}`}>
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

          <Card className={`flex flex-col justify-between hover:border-amber-400 group hover:-translate-y-1 hover:shadow-amber-500/20 transition-all duration-300 min-h-[18svh] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-amber-900/20 border-amber-500/30' : 'border-zinc-800'}`}>
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

          <Card className={`flex flex-col justify-between hover:border-emerald-400 group hover:-translate-y-1 hover:shadow-emerald-500/20 transition-all duration-300 min-h-[18svh] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-emerald-900/20 border-emerald-500/30' : 'border-zinc-800'}`}>
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

          <Card className={`flex flex-col justify-between hover:border-indigo-400 group hover:-translate-y-1 hover:shadow-indigo-500/20 transition-all duration-300 min-h-[18svh] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-indigo-900/20 border-indigo-500/30' : 'border-zinc-800'}`}>
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

          <Card className={`flex flex-col justify-between hover:border-violet-400 group hover:-translate-y-1 hover:shadow-violet-500/20 transition-all duration-300 min-h-[18svh] animate-sia-pulse ${isEnhanced ? 'bg-gradient-to-br from-zinc-900 to-violet-900/20 border-violet-500/30' : 'border-zinc-800'}`}>
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
                <h3 className="font-black text-xs tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
                  <Brain size={14} className="text-indigo-400" />
                  SIA PATTERN DECODER
                </h3>
              </div>
            </div>
            
            {dataMaturity.level >= 2 ? (
              <div className="space-y-6">
                <div className="font-serif italic text-zinc-200 leading-relaxed text-sm">
                  {insightTeaser ? (
                    insightTeaser
                  ) : (
                     <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                       SIA is currently decoding your last 14 nights to identify sleep-quality correlations...
                     </div>
                  )}
                </div>
                
                {!isAiLoading && (
                  <button 
                    onClick={() => onViewChange('ai')} 
                    className="flex items-center text-indigo-400 font-bold hover:text-indigo-300 hover:underline text-xs"
                  >
                    EXPLORE THIS PATTERN IN DETAIL <span className="ml-1">→</span>
                  </button>
                )}

                <div className="text-[10px] text-slate-400">
                  Last analyzed: {new Date().toLocaleDateString()} • Next update in 14h
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-zinc-400 text-sm italic">
                  Log more nights to unlock personalized pattern analysis ({dataMaturity.count}/14)
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Insights Feed */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-50">CLINICAL INSIGHTS</h3>
            <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-500/20">
              {userProfile?.tier} Intelligence
            </span>
          </div>
          {userProfile?.tier === 'Basic' || dataMaturity.level < 3 ? (
            <LockedFeatureCard
              title="Clinical Insights Feed"
              description="Advanced Diagnostic Monitoring"
              icon={<Brain size={20} />}
              onUpgrade={() => onViewChange('account')}
            />
          ) : insights.length > 0 ? (
            insights.map(insight => (
              <InsightCard key={insight.id} insight={insight} tier={userProfile?.tier as 'Basic' | 'Enhanced' | 'Pro'} />
            ))
          ) : (
            <p className="text-zinc-500 text-xs italic">
              {dataMaturity.level < 3 
                ? `Log ${Math.max(0, 14 - dataMaturity.count)} more nights to unlock clinical insights.`
                : "No insights available yet."}
            </p>
          )}
        </section>
      </section>


      {/* Section 3: Engagement & Actions */}
      <section className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            onClick={onLogClick}
            className="bg-indigo-600 border-none hover:bg-indigo-500 flex items-center justify-between group shadow-lg shadow-indigo-600/20 min-h-[15svh]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
                <Plus size={24} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Quick Action</p>
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

          {/* Deep Analysis Card (Placeholder/Locked or Active) */}
          {userProfile?.tier === 'Basic' ? (
            <div className="relative w-full group">
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 rounded-3xl opacity-50 blur-sm" />
              <Card 
                onClick={() => onViewChange('account')}
                className="group relative bg-zinc-950/80 border border-indigo-500/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer hover:border-indigo-500 hover:bg-zinc-900/80 transition-all duration-500 min-h-[15svh] rounded-[24px] backdrop-blur-sm overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 group-hover:to-indigo-500/10 transition-colors duration-500" />
                <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
                  <div className="w-12 h-12 bg-zinc-950 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/30 group-hover:bg-indigo-500/10 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                    <Sparkles size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Unlock Deep Analysis</p>
                    <p className="text-xs text-zinc-400 font-medium">90 days of data + Enhanced/Pro required</p>
                  </div>
                </div>
                <div className="relative z-10 mt-4 md:mt-0 flex items-center gap-3 px-5 py-2.5 bg-zinc-900 border-2 border-indigo-500/40 text-indigo-300 text-xs font-black uppercase tracking-[0.2em] rounded-full group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-400 transition-all duration-300 shadow-xl shadow-black/40">
                  <span>Upgrade</span>
                  <span className="transform group-hover:translate-x-1.5 transition-transform duration-300">→</span>
                </div>
              </Card>
            </div>
          ) : (
            <Card 
              onClick={handleDeepAnalysis}
              className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-indigo-500/30 flex items-center justify-between group cursor-pointer min-h-[15svh] rounded-3xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 transition-colors">
                  <Sparkles size={24} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Deep Dive</p>
                  <p className="text-xl text-white font-black tracking-tight mt-0.5">AI Analysis</p>
                </div>
              </div>
              <ChevronRight size={24} className="text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-transform" />
            </Card>
          )}
        </div>
      </section>

      {/* Section 4: The Growth Hub */}
      <section className="space-y-6 pt-6 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-50">Growth Hub</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <SleepGuideCard onClick={onOpenSleepGuide} gadgetSummary={recentGadgets} />
        
        </div>
      </section>

      {/* Section: SIA Intelligence Feed */}
      <section className="space-y-6 pt-6 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-50">SIA Intelligence Feed</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {FEATURE_FLAGS.showSiaIntelligence && (
            isEnhanced ? (
              <Card 
                className="bg-zinc-950 border-zinc-800 relative overflow-hidden group p-0"
              >
                <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
                  <CircadianWaveform className="text-zinc-400 w-full scale-150" />
                </div>
                
                <div className="relative z-10 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-400 border border-zinc-800">
                      <Brain size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-50 tracking-tight">Sia Intelligence Feed</h3>
                      <p className="text-[10px] text-zinc-400 font-bold">Advanced Diagnostic Monitoring</p>
                    </div>
                  </div>

                  {dataMaturity.level < 4 ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-700 mx-auto border border-zinc-800">
                        <Brain size={24} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Intelligence Gated</h4>
                        <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                          SIA Intelligence requires 90 days of baseline data to identify biological anomalies. ({dataMaturity.count}/90).
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl border-l-2 border-l-zinc-700">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
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

                      {isAiLoading && (
                        <div className="mt-6 flex items-center justify-center">
                          <div className="px-4 py-2 bg-violet-500/5 border border-violet-500/10 rounded-full">
                            <p className="text-[9px] font-black text-violet-300 uppercase tracking-[0.3em] animate-pulse">
                              Scanning for biological anomalies...
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="bg-zinc-950 border-zinc-800/50 relative overflow-hidden p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 border border-zinc-700">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest">SIA Intelligence Feed</h3>
                    <p className="text-[10px] text-zinc-700 font-bold">Advanced Diagnostic Monitoring</p>
                  </div>
                </div>
                <div className="space-y-2 mb-5 opacity-40 pointer-events-none select-none">
                  <div className="h-10 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center px-4 gap-3">
                    <div className="w-2 h-2 rounded-full bg-zinc-700" />
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Neuro-Diagnostic · Alzheimer's Risk Evaluation</span>
                  </div>
                  <div className="h-10 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center px-4 gap-3">
                    <div className="w-2 h-2 rounded-full bg-zinc-700" />
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Metabolic-Diagnostic · Circadian Flux</span>
                  </div>
                </div>
                <button
                  onClick={() => onViewChange('account')}
                  className="w-full py-2.5 bg-zinc-900 border border-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={12} />
                  Unlock with Enhanced or Pro
                </button>
              </Card>
            )
          )}
        </div>
      </section>

      {/* Section: Data Maturity Progress */}
      <section className="space-y-6 pt-6 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-50">DATA MATURITY PROGRESS</h3>
        </div>
        <DataMaturityTracker 
          maturity={dataMaturity as MaturityInfo} 
          showTimeline={true} 
          proMessage={userProfile?.tier === 'Pro' && dataMaturity.level < 3 ? "Pro Member: Your analysis will automatically deepen as data matures" : undefined} 
        />
      </section>
      
    </div>
  );
}

