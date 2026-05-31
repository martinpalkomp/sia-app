import React from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';
import { QuickInsight } from '../../services/ai/core/quickInsights';
import { Card } from '../../components/UI';

interface QuickInsightCardProps {
  insight: QuickInsight;
}

export const QuickInsightCard: React.FC<QuickInsightCardProps> = ({ insight }) => {
  return (
    <div className="border border-zinc-800/60 bg-[#0B0F17] rounded-2xl relative shadow-sm group hover:border-indigo-500/30 transition-all duration-300 overflow-hidden mt-8 mb-8 min-h-[15svh] w-full p-6 flex flex-col justify-center" id="quick-insight-card">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
        <BrainCircuit size={80} />
      </div>
      <div className="relative z-10">
         <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1 flex items-center gap-2">
            <Sparkles size={12} className="text-indigo-400" />
            SIA SIGNAL · {insight.theme}
          </p>
          <p className="text-lg font-serif italic text-zinc-300 leading-relaxed max-w-2xl mt-4">
             {insight.fact}
          </p>
      </div>
    </div>
  );
};
