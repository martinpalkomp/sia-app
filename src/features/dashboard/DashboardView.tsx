import React, { useState } from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Activity, Sun, Zap, Clock, BarChart3, Moon, TrendingUp, Sparkles, Brain, Plus, ChevronRight } from 'lucide-react';
import { Card } from '../../components/UI';
import { MetricSparklineCard } from '../../components/MetricSparklineCard';
import { SleepGateHero } from './SleepGateHero';
import { InsightCard } from './InsightCard';
import DataMaturityTracker from '../data/DataMaturityTracker';
import SleepGuideCard from '../sleep/SleepGuideCard';
import { QuickInsightCard } from './QuickInsightCard';

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
  deepAnalysisResult?: { summary: string, recommendation: string, confidence: number } | null;
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
  logs: any;
  greeting: { prefix: string; suffix: string; showLogLink?: boolean; onLogClick?: () => void; };
  recentGadgets: string[];
  forecastMetrics?: { quality: number; alertness: number; energy: number } | null;
  hasNinetyLogsInFiveMonths: boolean;
  quickInsight?: any;
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
  deepAnalysisResult,
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
  logs,
  greeting,
  recentGadgets,
  forecastMetrics,
  hasNinetyLogsInFiveMonths,
  quickInsight
}) => {
  return (
    <div className="space-y-8">
      <SleepGateHero logs={{}} userName={userProfile?.displayName} greeting={greeting} />

      <div id="db-morning-briefing" className="w-full">
        <div id="morning-brief-card">
          <Card className="bg-zinc-900 border-zinc-800 p-6 w-full">
            <p id="temporal-label" className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">
            MORNING BRIEF · {format(new Date(), 'EEEE d MMM').toUpperCase()}
          </p>
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="text-indigo-400" size={16} />
            <h3 className="text-indigo-400 text-xs font-black uppercase tracking-widest">Daily Briefing</h3>
          </div>
          {isBriefLoading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="h-12 w-full bg-zinc-800 rounded"></div>
            </div>
          ) : dailyBrief ? (
            <p id="brief-body" className="text-lg font-serif italic text-zinc-300 leading-relaxed">{dailyBrief}</p>
          ) : (
             <p id="brief-body" className="text-lg font-serif italic text-zinc-600">SIA is calibrating for your next brief.</p>
          )}
          
          {forecastMetrics && (
            <div id="forecast-metrics-chip" className="mt-4 pt-4 border-t border-zinc-800/50 space-y-2">
              <p className="text-[10px] text-zinc-500 italic">Based on your last conversation with SIA</p>
              <div className="flex gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">SIA FORECAST</span>
                <span className="text-[10px] font-bold text-indigo-400">Quality {forecastMetrics.quality}/10</span>
                <span className="text-[10px] font-bold text-emerald-400">Alertness {forecastMetrics.alertness}/10</span>
                <span className="text-[10px] font-bold text-amber-400">Energy {forecastMetrics.energy}/10</span>
              </div>
            </div>
          )}
        </Card>
        </div>
      </div>

      {/* Section: Status Report */}
      <section className="space-y-4 relative z-30">
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
            value={stats?.avgL !== undefined ? Math.round(stats.avgL) : '--'}
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

      {/* SIA Quick Insight */}
      <QuickInsightCard insight={quickInsight} />

      {/* SIA Weekly Pattern & Upgrade Card */}
      {!isEnhanced ? (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-5 mt-8 mb-8" id="ai-analysis-card">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">ENHANCED INTELLIGENCE</p>
          <p className="text-sm font-bold text-white mb-1">Unlock pattern analysis, correlations & clinical insights</p>
          <p className="text-xs text-zinc-400 mb-4">14+ nights of data reveal what Basic can't — the patterns behind your sleep.</p>
          <button onClick={() => onViewChange('account')} className="w-full md:w-auto py-3 px-6 bg-zinc-900 border border-indigo-500/30 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2">
            Upgrade to Enhanced
          </button>
        </div>
      ) : (
        <>
          <motion.button
            whileHover={{ scale: 1.01 }}
            onClick={() => onViewChange('ai')}
            className="w-full rounded-[2rem] border border-indigo-500/20 bg-gradient-to-r from-indigo-950/50 to-zinc-900 p-8 text-left relative overflow-hidden mt-8"
            id="ai-analysis-card"
          >
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_right,rgba(99,102,241,0.15),transparent_70%)]" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">
                    14-DAY PATTERN · UPDATES EVERY 3 LOGS
                  </p>
                  <h3 className="font-black text-xs tracking-widest text-indigo-400 uppercase flex items-center gap-2">
                    <Sparkles size={14} />
                    SIA PATTERN INSIGHT
                  </h3>
                </div>
                {isAiLoading ? (
                   <div className="animate-pulse space-y-2">
                       <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                       <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                   </div>
                ) : insightTeaser ? (
                  <div className="space-y-4 max-w-sm">
                    {(() => {
                      const pMatch = insightTeaser.match(/PATTERN:\s*(.*?)(?=\n|SUPPORTING SIGNALS|$)/si);
                      const sMatch = insightTeaser.match(/SUPPORTING SIGNALS:\s*(.*?)(?=\n\n\*\*\*|$)/si);
                      const parsedPattern = pMatch ? pMatch[1].trim() : insightTeaser.replace(/\*\*\*[\s\S]*/, '').trim();
                      const parsedSignals = sMatch ? sMatch[1].trim() : '';

                      return (
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Pattern</p>
                            <p className="text-base font-serif italic text-white leading-snug">
                              {parsedPattern}
                            </p>
                          </div>
                          {parsedSignals && (
                            <div>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Supporting Signals</p>
                              <ul className="text-xs font-mono text-zinc-300 space-y-2">
                                {parsedSignals.split('\n').filter(Boolean).map((signal, idx) => (
                                  <li key={idx} className="flex gap-2">
                                    <span className="text-indigo-400">•</span>
                                    <span>{signal}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-base text-white leading-snug max-w-sm">
                    Record at least 14 logs (Level 2) to unlock SIA's daily pattern analysis.
                  </p>
                )}
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest pt-2">
                  Explore this pattern in detail →
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold pt-2">
                  Last analyzed: {new Date().toLocaleDateString()}
                </p>
              </div>
              <div className="hidden md:block w-48 h-24 opacity-60">
                 <div className="w-full h-full bg-gradient-to-r from-indigo-900/0 via-indigo-500/20 to-indigo-900/0 rounded-full blur-xl" />
              </div>
            </div>
          </motion.button>

          {/* Section: Clinical Insights */}
          <section className="space-y-4 mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-xs tracking-widest text-zinc-50 uppercase mb-4">Clinical Insights</h2>
              {dataMaturity?.level >= 3 && hasNinetyLogsInFiveMonths && !isDeepAnalysis && !deepAnalysisResult && (
                <button onClick={handleDeepAnalysis} className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest font-bold mb-4">
                  Refresh Analysis
                </button>
              )}
            </div>
            
            {!isEnhanced ? (
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-5 mt-8 mb-8" id="ai-deep-analysis-locked">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">CLINICAL INSIGHTS LOCKED</p>
                <p className="text-sm font-bold text-white mb-1">Unlock AI Deep Analysis</p>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  Deep Analysis reviews your entire sleep history to identify dominant long-term trends and deviations. 
                  It correlates your behavioral patterns with sleep quality over months of data. 
                  You will receive a highly actionable clinical protocol tailored to your unique biological rhythm. 
                  This feature requires 90 logs in the past 5 months to ensure precision.
                </p>
                <button onClick={() => onViewChange('account')} className="w-full md:w-auto py-3 px-6 bg-zinc-900 border border-indigo-500/30 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2">
                  Upgrade to Enhanced
                </button>
              </div>
            ) : !hasNinetyLogsInFiveMonths ? (
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
                    disabled
                    className="w-full md:w-auto py-3 px-6 bg-zinc-900 border border-zinc-700 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    Unlock at 90 Logs
                  </button>
                </Card>
              </div>
            ) : (
              <div className="space-y-4">
                <Card className="bg-zinc-950 border-zinc-800 p-8 space-y-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">
                      LONG-TERM ANALYSIS · LAST {logs ? Object.keys(logs).length : 0} NIGHTS
                    </p>
                    <h3 className="font-black text-xs tracking-widest text-emerald-400 uppercase flex items-center gap-2">
                      <Activity size={14} />
                      Deep Analysis Summary
                    </h3>
                  </div>
                  {isDeepAnalysis ? (
                    <div className="animate-pulse flex space-x-4">
                      <div className="h-4 bg-zinc-800 rounded w-full"></div>
                    </div>
                  ) : deepAnalysisResult ? (
                    <p className="text-base text-white font-bold leading-relaxed">{deepAnalysisResult.summary}</p>
                  ) : (
                    <button
                      onClick={handleDeepAnalysis}
                      className="w-full py-4 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Generate 30-Day Deep Analysis
                    </button>
                  )}
                </Card>
                
                {deepAnalysisResult && (
                  <Card className="bg-gradient-to-br from-emerald-900/30 to-zinc-900 border-emerald-500/30 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-[10px] tracking-widest text-emerald-400 uppercase">Tonight's Action</h4>
                      <div className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                        <Zap size={12} className="text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                          {Math.round(deepAnalysisResult.confidence * 100)}% Confidence
                        </span>
                      </div>
                    </div>
                    <p className="text-emerald-100 font-bold">{deepAnalysisResult.recommendation}</p>
                  </Card>
                )}

                {insights && insights.length > 0 && (
                  <div className="pt-4 border-t border-zinc-800 space-y-4">
                    <h4 className="font-black text-[10px] tracking-widest text-zinc-500 uppercase">Past Insights</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {insights.map(insight => (
                        <InsightCard key={insight.id} insight={insight} tier={userProfile?.tier} confidence={insight.confidence} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}

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

      {/* Section: Data Maturity */}
      <section className="space-y-4 pt-6 border-t border-zinc-800" id="acc-maturity-tracker">
        <DataMaturityTracker maturity={dataMaturity} />
      </section>
    </div>
  );
};

export default DashboardView;
