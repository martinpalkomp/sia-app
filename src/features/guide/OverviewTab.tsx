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
        <div className="xl:col-span-2 space-y-12">
          
          {/* SECTION: FOUNDATIONAL PRINCIPLES */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Foundational Principles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Law 01 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 relative overflow-hidden flex flex-col group hover:border-indigo-500/30 transition-colors">
                <div className="absolute -top-10 -right-10 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <Moon size={200} />
                </div>
                <div className="relative z-10 flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-[9px] font-black tracking-widest text-indigo-400 border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 rounded">LAW 01</span>
                  </div>
                  <h2 className="text-xl font-display font-medium text-zinc-100 uppercase tracking-tight mb-2">Sleep Debt</h2>
                  <p className="text-sm text-zinc-400 font-sans mb-8 leading-relaxed">
                    Sleep pressure builds the longer you are awake and is relieved by quality sleep.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div>
                      <h4 className="text-[9px] font-black tracking-wider text-zinc-500 uppercase flex items-center gap-1.5 mb-1.5"><Brain size={10} /> Driven By</h4>
                      <p className="text-[11px] text-zinc-300 leading-snug">Adenosine accumulation in the brain</p>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-black tracking-wider text-zinc-500 uppercase flex items-center gap-1.5 mb-1.5"><Activity size={10} /> Impact</h4>
                      <p className="text-[11px] text-zinc-300 leading-snug">Cognitive performance, reaction time, mood</p>
                    </div>
                    <div className="col-span-2 pt-4 border-t border-zinc-800/50">
                      <h4 className="text-[9px] font-black tracking-wider text-zinc-500 uppercase flex items-center gap-1.5 mb-1.5"><Shield size={10} /> Key Fact</h4>
                      <p className="text-[11px] text-zinc-300 leading-snug">24h without sleep impairs like a 0.10% BAC</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Law 02 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 relative overflow-hidden flex flex-col group hover:border-indigo-500/30 transition-colors">
                <div className="absolute -top-10 -right-10 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <Sun size={200} />
                </div>
                <div className="relative z-10 flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-[9px] font-black tracking-widest text-indigo-400 border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 rounded">LAW 02</span>
                  </div>
                  <h2 className="text-xl font-display font-medium text-zinc-100 uppercase tracking-tight mb-2">Circadian Rhythm</h2>
                  <p className="text-sm text-zinc-400 font-sans mb-8 leading-relaxed">
                    Your internal clock regulates alertness, hormones, body temperature, and more.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div>
                      <h4 className="text-[9px] font-black tracking-wider text-zinc-500 uppercase flex items-center gap-1.5 mb-1.5"><Brain size={10} /> Control Center</h4>
                      <p className="text-[11px] text-zinc-300 leading-snug">Suprachiasmatic nucleus (SCN) in the brain</p>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-black tracking-wider text-zinc-500 uppercase flex items-center gap-1.5 mb-1.5"><Clock size={10} /> Chronotypes</h4>
                      <p className="text-[11px] text-zinc-300 leading-snug">40% Morning Larks<br/>30% Intermediate<br/>30% Night Owls</p>
                    </div>
                    <div className="col-span-2 pt-4 border-t border-zinc-800/50">
                      <h4 className="text-[9px] font-black tracking-wider text-zinc-500 uppercase flex items-center gap-1.5 mb-1.5"><Shield size={10} /> Key Fact</h4>
                      <p className="text-[11px] text-zinc-300 leading-snug">Timing misalignment reduces sleep quality and daytime energy</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* SECTION: HOW SIA USES SIGNALS */}
          <section>
            <div className="mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">How SIA Uses Signals</h3>
              <p className="text-xs text-zinc-400">From data to personalized intelligence</p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 relative">
              {[
                { step: '1', title: 'SIGNALS', icon: <Bed size={14} className="text-zinc-400" />, desc: 'Collect behavioral, environmental and physiological data' },
                { step: '2', title: 'ANALYSIS', icon: <Activity size={14} className="text-zinc-400" />, desc: 'Detect patterns across time using the two laws as framework' },
                { step: '3', title: 'INTELLIGENCE', icon: <Brain size={14} className="text-indigo-400" />, desc: 'Generate insights with confidence scoring (high, emerging, low)' },
                { step: '4', title: 'INSIGHTS', icon: <Lightbulb size={14} className="text-indigo-400" />, desc: 'Deliver concise, actionable insights at the right time' },
                { step: '5', title: 'IMPROVEMENT', icon: <TrendingUp size={14} className="text-emerald-400" />, desc: 'Track progress and adapt recommendations over time' },
              ].map((item, i) => (
                <div key={i} className="border border-zinc-800/60 bg-zinc-900/30 rounded-xl p-4 flex flex-col justify-between min-h-[140px] z-10 relative">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[9px] font-mono text-zinc-500">{item.step}.</span>
                      <h4 className="text-[9px] font-black tracking-widest text-zinc-300 uppercase">{item.title}</h4>
                    </div>
                    <div className="mb-4">{item.icon}</div>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed balance">{item.desc}</p>
                </div>
              ))}
              
              {/* Optional connecting line background (hidden on mobile) */}
              <div className="hidden lg:block absolute top-[50px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-zinc-800/0 via-zinc-800 to-zinc-800/0 z-0"></div>
            </div>
          </section>

          {/* SECTION: EVIDENCE-BASED TOPICS */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Evidence-Based Topics</h3>
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
                  className="text-left border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-800 hover:border-zinc-700 transition-colors rounded-xl p-4 flex flex-col items-start gap-4"
                >
                  <div className="text-zinc-400">{topic.icon}</div>
                  <div>
                    <h4 className="text-[9px] font-black tracking-widest text-zinc-300 uppercase mb-2">{topic.title}</h4>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">{topic.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          
          {/* SIA Quick Insight Example */}
          <div className="border border-zinc-800/60 bg-[#111827]/40 rounded-2xl overflow-hidden relative p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">SIA Quick Insight (Example)</h3>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Activity size={14} />
              </div>
              <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Wake-Time Variability Detected</span>
            </div>
            
            <p className="text-lg font-serif italic text-zinc-200 leading-relaxed mb-6">
              Keeping a consistent wake time is one of the strongest predictors of stable sleep quality and next-day alertness.
            </p>
            
            <div className="flex items-center gap-2 pt-4 border-t border-zinc-800/50">
              <Activity size={12} className="text-zinc-600" />
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Insight rotates daily based on your signals</span>
            </div>
          </div>

          {/* Key Signals SIA Tracks */}
          <div className="border border-zinc-800/60 bg-zinc-900/30 rounded-2xl p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Key Signals SIA Tracks</h3>
            
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
                    <div className="w-6 h-6 rounded bg-zinc-800/50 flex items-center justify-center text-zinc-400 group-hover:text-zinc-300 transition-colors">
                      {signal.icon}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-zinc-300">{signal.name}</div>
                      <div className="text-[9px] text-zinc-500">{signal.desc}</div>
                    </div>
                  </div>
                  <div className={`text-[11px] font-mono font-medium ${signal.color}`}>
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
