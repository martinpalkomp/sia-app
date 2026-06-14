import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Coffee, 
  Thermometer, 
  AlertTriangle, 
  Activity, 
  Lightbulb, 
  CheckCircle,
  Moon,
  Sun
} from 'lucide-react';
import { Insight } from '../../types';
import { Card } from '../../components/UI';

interface InsightCardProps {
  insight: Insight;
  tier?: 'Basic' | 'Enhanced' | 'Pro';
  confidence?: number | "high" | "medium" | "low";
}

const getCategoryInfo = (insight: Insight) => {
  const text = (insight.summary + (insight.details || '')).toLowerCase();
  
  if (text.includes('caffeine') || text.includes('coffee')) return { label: 'Substance Rebound', icon: Coffee };
  if (text.includes('temperature') || text.includes('environment')) return { label: 'Environment', icon: Thermometer };
  if (text.includes('sedative') || text.includes('risk')) return { label: 'Health Risk', icon: AlertTriangle };
  if (text.includes('circadian') || text.includes('shift')) return { label: 'Circadian Shift', icon: Moon };
  
  switch (insight.type) {
    case 'Pattern': return { label: 'Pattern', icon: Activity };
    case 'Recommendation': return { label: 'Recommendation', icon: Lightbulb };
    default: return { label: 'Insight', icon: Activity };
  }
};

export const InsightCard: React.FC<InsightCardProps> = ({ insight, tier = 'Basic', confidence }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { label, icon: Icon } = getCategoryInfo(insight);
  
  const tierStyles = {
    Pro: 'from-violet-900/20 to-zinc-950/50 border-violet-500/30 shadow-violet-500/10',
    Enhanced: 'from-indigo-900/20 to-zinc-950/50 border-indigo-500/30 shadow-indigo-500/10',
    Basic: 'from-zinc-900/20 to-zinc-950/50 border-zinc-800 shadow-zinc-500/5'
  };

  const activeStyle = tierStyles[tier] || tierStyles.Basic;

  const confRaw = confidence !== undefined ? confidence : (insight.confidence || 0);
  let conf = 0;
  if (typeof confRaw === 'string') {
    if (confRaw === 'high') conf = 0.9;
    else if (confRaw === 'medium') conf = 0.65;
    else if (confRaw === 'low') conf = 0.3;
  } else {
    conf = confRaw as number;
  }
  const badgeColor = conf >= 0.8 ? 'text-emerald-400 bg-emerald-400/20 border-emerald-500/30' : conf >= 0.5 ? 'text-amber-400 bg-amber-400/20 border-amber-500/30' : 'text-zinc-400 bg-zinc-800 border-zinc-700';
  const badgeLabel = conf >= 0.8 ? 'HIGH CONFIDENCE' : conf >= 0.5 ? 'MEDIUM CONFIDENCE' : 'LOW CONFIDENCE';

  return (
    <div 
      onClick={() => setIsHovered(!isHovered)}
      className={`border border-zinc-800/60 bg-[#0B0F17] rounded-2xl relative shadow-sm group hover:border-indigo-500/30 transition-all duration-300 overflow-hidden min-h-[15svh] w-full p-6 cursor-pointer`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
      
      <div className="relative z-10 flex items-start gap-4">
        <div className={`p-3 rounded-2xl bg-white/5 ${tier === 'Pro' ? 'text-violet-400' : tier === 'Enhanced' ? 'text-indigo-400' : 'text-zinc-400'}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">{insight.type || label}</span>
            <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest ${badgeColor}`}>
              {badgeLabel}
            </div>
          </div>
          <p className="text-lg font-serif italic text-zinc-300 leading-relaxed">{insight.summary}</p>
          {insight.details && (
            <p className="text-lg font-serif italic text-zinc-400 leading-relaxed mt-2">{insight.details}</p>
          )}
        </div>
      </div>
    </div>
  );
};
