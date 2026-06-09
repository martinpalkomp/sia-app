import React from 'react';
import { motion } from 'motion/react';
import { Moon, Sun, Brain, Activity, Clock, FileText } from 'lucide-react';

export const LawsTab: React.FC = () => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-12">
        <div className="max-w-2xl">
          <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-zinc-500 mb-2">The Two Laws of Sleep</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            All sleep phenomena, insights, and protocols in SIA are derived from the interaction of these two foundational biological mechanisms.
          </p>
        </div>

        {/* LAW 01 BLOCK */}
        <div className="border border-zinc-800/60 bg-[#0B0F17] rounded-2xl overflow-hidden relative shadow-sm">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
            <Moon size={300} />
          </div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="p-8 border-b border-zinc-800/50">
              <span className="text-xs md:text-sm font-black tracking-widest text-indigo-400 border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 rounded inline-block mb-4">LAW 01</span>
              <h2 className="text-3xl font-display font-medium text-zinc-100 uppercase tracking-tight mb-4">Sleep Debt</h2>
              <p className="text-lg text-zinc-300 font-sans leading-relaxed max-w-3xl">
                Homeostatic sleep pressure (Process S) accumulates continuously during wakefulness and dissipates only through sleep.
              </p>
            </div>
            
            {/* Intel Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-800/50">
              <div className="p-8">
                <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2 mb-3"><Brain size={12} className="text-zinc-500" /> Core Principle</h4>
                <p className="text-xs md:text-sm font-sans text-zinc-300 leading-relaxed">
                  Adenosine builds up in the basal forebrain while awake, creating biological "pressure" for sleep. 
                </p>
              </div>
              <div className="p-8">
                 <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2 mb-3"><Activity size={12} className="text-zinc-500" /> Key Signal</h4>
                 <p className="text-xs md:text-sm font-sans text-zinc-300 leading-relaxed">
                   Short sleep duration (&lt;7h) prevents clearance of adenosine, leading to carry-over pressure the next day.
                 </p>
              </div>
              <div className="p-8">
                 <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2 mb-3"><Clock size={12} className="text-zinc-500" /> Behavioral Impact</h4>
                 <p className="text-xs md:text-sm font-sans text-zinc-300 leading-relaxed">
                   Cognitive impairment increases progressively before subjective fatigue is consciously perceived.
                 </p>
              </div>
              <div className="p-8">
                 <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2 mb-3"><FileText size={12} className="text-zinc-500" /> Evidence</h4>
                 <p className="text-xs md:text-sm font-sans text-zinc-400 leading-relaxed">
                   Borbély, A. A. (1982). A two process model of sleep regulation. <span className="text-zinc-500">Human Neurobiology</span>.
                 </p>
              </div>
            </div>
          </div>
        </div>

        {/* LAW 02 BLOCK */}
        <div className="border border-zinc-800/60 bg-[#0B0F17] rounded-2xl overflow-hidden relative shadow-sm mt-8">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
            <Sun size={300} />
          </div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="p-8 border-b border-zinc-800/50">
              <span className="text-xs md:text-sm font-black tracking-widest text-indigo-400 border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 rounded inline-block mb-4">LAW 02</span>
              <h2 className="text-3xl font-display font-medium text-zinc-100 uppercase tracking-tight mb-4">Circadian Rhythm</h2>
              <p className="text-lg text-zinc-300 font-sans leading-relaxed max-w-3xl">
                The internal clock (Process C) regulates alertness, hormone release, and core body temperature independent of sleep debt.
              </p>
            </div>
            
            {/* Intel Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-800/50">
              <div className="p-8">
                <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2 mb-3"><Brain size={12} className="text-zinc-500" /> Core Principle</h4>
                <p className="text-xs md:text-sm font-sans text-zinc-300 leading-relaxed">
                  The SCN (suprachiasmatic nucleus) acts as the master clock, powerfully influenced by light exposure.
                </p>
              </div>
              <div className="p-8">
                 <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2 mb-3"><Activity size={12} className="text-zinc-500" /> Key Signal</h4>
                 <p className="text-xs md:text-sm font-sans text-zinc-300 leading-relaxed">
                   Wake-time inconsistency &gt;60 mins, especially on weekends, desynchronizes the circadian pacemaker.
                 </p>
              </div>
              <div className="p-8">
                 <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2 mb-3"><Clock size={12} className="text-zinc-500" /> Behavioral Impact</h4>
                 <p className="text-xs md:text-sm font-sans text-zinc-300 leading-relaxed">
                   Delayed sleep timing and social jetlag dramatically reduce morning alertness and mood stability.
                 </p>
              </div>
              <div className="p-8">
                 <h4 className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2 mb-3"><FileText size={12} className="text-zinc-500" /> Evidence</h4>
                 <p className="text-xs md:text-sm font-sans text-zinc-400 leading-relaxed">
                   Roenneberg, T., et al. (2003). Life between clocks: daily temporal patterns of human chronotypes. <span className="text-zinc-500">Journal of Biological Rhythms</span>.
                 </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
