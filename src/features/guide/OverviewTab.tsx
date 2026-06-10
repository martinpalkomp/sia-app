import React from 'react';
import { motion } from 'motion/react';
import { 
  Sun, Moon, Brain, Bed, Activity, Clock, 
  Lightbulb, TrendingUp, Thermometer, Coffee,
  Smartphone, Volume2, Shield
} from 'lucide-react';
import { Card } from '../../components/UI';

export const OverviewTab: React.FC<{ setActiveTab: (t: string) => void }> = ({ setActiveTab }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Main Content Column */}
        <div className="xl:col-span-2 space-y-8 md:space-y-12">
          
          {/* SECTION: FOUNDATIONAL PRINCIPLES */}
          <section>
            <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Foundational Principles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Law 01 */}
              <div className="h-full rounded-2xl border border-indigo-500/20 bg-[#111827] p-6 relative overflow-hidden flex flex-col xl:flex-row gap-6 group hover:border-indigo-500/40 transition-colors shadow-[0_0_15px_-3px_rgba(99,102,241,0.05)] hover:shadow-[0_0_20px_-3px_rgba(99,102,241,0.15)]">
                
                {/* Circular Icon System */}
                <div className="flex-shrink-0 flex items-center justify-center relative self-start xl:self-center mt-2 xl:mt-0 lg:ml-2">
                  <div className="w-24 h-24 rounded-full border border-indigo-500/10 absolute opacity-50 group-hover:animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <div className="w-20 h-20 rounded-full border border-indigo-500/20 absolute" />
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30">
                     <Moon size={28} className="text-indigo-400" />
                  </div>
                </div>

                <div className="relative z-10 flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] md:text-xs font-black tracking-widest text-indigo-400 border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 rounded">LAW 01</span>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-display font-medium text-zinc-100 uppercase tracking-tight mb-2">Sleep Debt</h2>
                  <p className="text-sm font-sans text-zinc-400 mb-6 leading-relaxed">
                    Sleep pressure builds the longer you are awake and is relieved by quality sleep.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                    <div>
                      <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-1.5"><Brain size={10} className="text-zinc-500" /> Driven By</h4>
                      <p className="text-xs leading-snug text-zinc-300">Adenosine accumulation in the brain</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-1.5"><Activity size={10} className="text-zinc-500" /> Impact</h4>
                      <p className="text-xs leading-snug text-zinc-300">Cognitive performance, reaction time, mood</p>
                    </div>
                    <div className="col-span-2 pt-3 border-t border-zinc-800/50 mt-1">
                      <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-1.5"><Shield size={10} className="text-zinc-500" /> Key Fact</h4>
                      <p className="text-xs leading-snug text-zinc-300">24h without sleep impairs like a 0.10% BAC</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Law 02 */}
              <div className="h-full rounded-2xl border border-indigo-500/20 bg-[#111827] p-6 relative overflow-hidden flex flex-col xl:flex-row gap-6 group hover:border-indigo-500/40 transition-colors shadow-[0_0_15px_-3px_rgba(99,102,241,0.05)] hover:shadow-[0_0_20px_-3px_rgba(99,102,241,0.15)]">
                
                {/* Circular Icon System */}
                <div className="flex-shrink-0 flex items-center justify-center relative self-start xl:self-center mt-2 xl:mt-0 lg:ml-2">
                  <div className="w-24 h-24 rounded-full border border-indigo-500/10 absolute opacity-50 group-hover:animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <div className="w-20 h-20 rounded-full border border-indigo-500/20 absolute" />
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30">
                     <Sun size={28} className="text-indigo-400" />
                  </div>
                </div>

                <div className="relative z-10 flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] md:text-xs font-black tracking-widest text-indigo-400 border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 rounded">LAW 02</span>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-display font-medium text-zinc-100 uppercase tracking-tight mb-2">Circadian Rhythm</h2>
                  <p className="text-sm font-sans text-zinc-400 mb-6 leading-relaxed">
                    Your internal clock regulates alertness, hormones, body temperature, and more.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                    <div>
                      <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-1.5"><Brain size={10} className="text-zinc-500" /> Control Center</h4>
                      <p className="text-xs leading-snug text-zinc-300">Suprachiasmatic nucleus (SCN) in the brain</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-1.5"><Clock size={10} className="text-zinc-500" /> Chronotypes</h4>
                      <div className="text-xs leading-tight text-zinc-300 grid grid-cols-[30px_auto] gap-x-1 gap-y-1">
                        <div>40%</div><div className="whitespace-nowrap">Morning</div>
                        <div>30%</div><div className="whitespace-nowrap">Intermediate</div>
                        <div>30%</div><div className="whitespace-nowrap">Evening</div>
                      </div>
                    </div>
                    <div className="col-span-2 pt-3 border-t border-zinc-800/50 mt-1">
                      <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-1.5"><Shield size={10} className="text-zinc-500" /> Key Fact</h4>
                      <p className="text-xs leading-snug text-zinc-300">Timing misalignment reduces sleep quality and daytime energy</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* SECTION: HOW SIA USES SIGNALS */}
          <section>
            <div className="mb-6">
              <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-400 mb-1">How SIA Uses Signals</h3>
              <p className="text-xs md:text-sm text-zinc-400 font-sans">From data to personalized intelligence</p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 relative">
              {[
                { step: '1', title: 'SIGNALS', icon: <Bed size={14} className="text-zinc-500" />, desc: 'Collect behavioral, environmental and physiological data' },
                { step: '2', title: 'ANALYSIS', icon: <Activity size={14} className="text-indigo-400" />, desc: 'Detect patterns across time using the two laws as framework' },
                { step: '3', title: 'INTELLIGENCE', icon: <Brain size={14} className="text-indigo-400" />, desc: 'Generate insights with confidence scoring (high, emerging, low)' },
                { step: '4', title: 'INSIGHTS', icon: <Lightbulb size={14} className="text-indigo-400" />, desc: 'Deliver concise, actionable insights at the right time' },
                { step: '5', title: 'IMPROVEMENT', icon: <TrendingUp size={14} className="text-emerald-400" />, desc: 'Track progress and adapt recommendations over time' },
              ].map((item, i) => (
                <div key={i} className="h-full border border-zinc-800/60 bg-[#0B0F17] rounded-xl p-4 flex flex-col justify-between z-10 relative group hover:border-zinc-700/80 transition-colors shadow-sm min-h-[220px]">
                  <div className="w-full min-w-0">
                    <div className="mb-4 text-zinc-500 group-hover:text-zinc-300 transition-colors">{item.icon}</div>
                    <div className="flex items-start gap-2 mb-2 w-full min-w-0">
                      <span className="text-[10px] md:text-xs font-mono text-zinc-500 shrink-0">{item.step}.</span>
                      <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase break-words min-w-0 flex-1">{item.title}</h4>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-zinc-400 font-sans leading-relaxed pt-2 mt-auto w-full">{item.desc}</p>
                </div>
              ))}
              
              {/* Connecting line background (hidden on mobile) */}
              <div className="hidden lg:block absolute top-[50px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-zinc-800/0 via-zinc-800/80 to-zinc-800/0 z-0"></div>
            </div>
          </section>

          {/* SECTION: EVIDENCE-BASED TOPICS */}
          <section>
            <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Evidence-Based Topics</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { id: 'environment', icon: <Thermometer size={16} />, title: 'ENVIRONMENT', desc: 'Cool, dark, quiet conditions optimize your sleep architecture.' },
                { id: 'structure', icon: <Sun size={16} />, title: 'DAILY STRUCTURE', desc: 'Align your day with your biology to support better nights.' },
                { id: 'tools', icon: <Smartphone size={16} />, title: 'TOOLS & INTERVENTIONS', desc: 'What works, why it works, and when to use it.' },
                { id: 'logs', icon: <Clock size={16} />, title: 'TRACKERS & DATA', desc: 'Understanding the value and limits of wearables.' },
                { id: 'personalization', icon: <Brain size={16} />, title: 'PERSONALIZATION', desc: 'Your biology is unique. SIA learns what works for you.' },
              ].map((topic) => (
                <button 
                  key={topic.id}
                  onClick={() => topic.id !== 'logs' ? setActiveTab(topic.id) : null}
                  className="h-full text-left border border-zinc-800/60 bg-[#0B0F17] hover:bg-[#111827] hover:border-zinc-700 transition-colors rounded-xl p-4 flex flex-col items-start gap-4 group shadow-sm"
                >
                  <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors">{topic.icon}</div>
                  <div className="w-full min-w-0">
                    <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase mb-2 break-words min-w-0">{topic.title}</h4>
                    <p className="text-xs md:text-sm text-zinc-500 font-sans leading-relaxed line-clamp-3">{topic.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          
          {/* SIA Quick Insight Example */}
          <div className="border border-indigo-500/10 bg-[#111827] rounded-2xl overflow-hidden relative p-5 shadow-[0_0_15px_-3px_rgba(99,102,241,0.05)]">
            <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-400 mb-5">SIA Quick Insight (Example)</h3>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                <Activity size={14} />
              </div>
              <span className="text-xs md:text-sm font-black tracking-widest text-indigo-400 uppercase">Wake-Time Variability Detected</span>
            </div>
            
            <p className="text-sm md:text-base font-serif italic text-zinc-200 leading-relaxed mb-4">
              Keeping a consistent wake time is one of the strongest predictors of stable sleep quality and next-day alertness.
            </p>
            
            <div className="flex items-center gap-2 pt-4 border-t border-zinc-800/50">
              <Activity size={12} className="text-zinc-600" />
              <span className="text-[10px] md:text-xs font-mono text-zinc-500 uppercase tracking-widest">Insight rotates daily based on your signals</span>
            </div>
          </div>

          {/* Key Signals SIA Tracks */}
          <div className="border border-zinc-800/60 bg-[#0B0F17] rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Key Signals SIA Tracks</h3>
            
            <div className="space-y-4">
              {[
                { icon: <Clock size={14} />, name: 'Sleep Duration', desc: 'Total time asleep', val: '7.5h', color: 'text-emerald-400' },
                { icon: <Activity size={14} />, name: 'Sleep Efficiency', desc: 'Quality of sleep', val: '92%', color: 'text-emerald-400' },
                { icon: <Sun size={14} />, name: 'Wake Time Consistency', desc: 'Day-to-day variability', val: '±42m', color: 'text-amber-400' },
                { icon: <Activity size={14} />, name: 'Stress Level', desc: 'Evening stress index', val: 'High', color: 'text-rose-400' },
                { icon: <TrendingUp size={14} />, name: 'Exercise', desc: 'Daily activity', val: '3/5 days', color: 'text-emerald-400' },
                { icon: <Coffee size={14} />, name: 'Caffeine', desc: 'Latest intake', val: '1:30 PM', color: 'text-zinc-300' },
                { icon: <Smartphone size={14} />, name: 'Screen Exposure', desc: 'Before bedtime', val: 'High', color: 'text-rose-400' },
                { icon: <Thermometer size={14} />, name: 'Environment', desc: 'Temp • Light • Noise', val: 'Good', color: 'text-emerald-400' },
              ].map((signal, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded border border-zinc-800/50 bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 group-hover:border-zinc-700 transition-colors mt-0.5 self-start">
                      {signal.icon}
                    </div>
                    <div>
                      <div className="text-xs md:text-sm font-black tracking-tight text-slate-300 mb-0.5">{signal.name}</div>
                      <div className="text-[10px] md:text-xs font-sans text-zinc-500">{signal.desc}</div>
                    </div>
                  </div>
                  <div className={`text-xs md:text-sm font-black tracking-tighter w-[90px] text-right flex-shrink-0 tabular-nums ${signal.color}`}>
                    {signal.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
