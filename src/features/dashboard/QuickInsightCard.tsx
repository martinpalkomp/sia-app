import React from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';
import { QuickInsight } from '../../services/ai/core/quickInsights';
import { Card } from '../../components/UI';

interface QuickInsightCardProps {
  insight: QuickInsight;
}

export const QuickInsightCard: React.FC<QuickInsightCardProps> = ({ insight }) => {
  return (
    <Card className="bg-zinc-900 border-zinc-800 p-6 w-full relative overflow-hidden mt-8 mb-8" id="quick-insight-card">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <BrainCircuit size={80} />
      </div>
      <div className="relative z-10">
         <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1 flex items-center gap-2">
            <Sparkles size={12} className="text-indigo-400" />
            SIA SIGNAL · {insight.theme}
          </p>
          <p className="text-sm font-serif italic text-zinc-300 leading-relaxed max-w-2xl mt-4">
             {insight.fact}
          </p>
      </div>
    </Card>
  );
};
