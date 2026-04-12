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
import { Insight } from '../types';
import { Card } from './UI';

interface InsightCardProps {
  insight: Insight;
  tier?: 'Basic' | 'Enhanced' | 'Pro';
}

const getCategoryInfo = (insight: Insight) => {
  const text = (insight.summary + (insight.details || '')).toLowerCase();
  
  if (text.includes('caffeine') || text.includes('coffee')) return { label: 'SUBSTANCE REBOUND', icon: Coffee };
  if (text.includes('temperature') || text.includes('environment')) return { label: 'ENVIRONMENT', icon: Thermometer };
  if (text.includes('sedative') || text.includes('risk')) return { label: 'HEALTH RISK', icon: AlertTriangle };
  if (text.includes('circadian') || text.includes('shift')) return { label: 'CIRCADIAN SHIFT', icon: Moon };
  
  switch (insight.type) {
    case 'Pattern': return { label: 'PATTERN', icon: Activity };
    case 'Recommendation': return { label: 'RECOMMENDATION', icon: Lightbulb };
    default: return { label: 'INSIGHT', icon: Activity };
  }
};

export const InsightCard: React.FC<InsightCardProps> = ({ insight, tier = 'Basic' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { label, icon: Icon } = getCategoryInfo(insight);
  
  const borderGlow = tier === 'Pro' ? 'border-l-violet-500' : tier === 'Enhanced' ? 'border-l-indigo-500' : 'border-l-zinc-700';

  return (
    <Card
      onClick={() => setIsHovered(!isHovered)}
      className={`relative overflow-hidden bg-zinc-950/50 border border-zinc-800 border-l-4 ${borderGlow} p-5 transition-all duration-300 rounded-3xl`}
    >
      {/* Background Texture/Glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
      </div>
      
      <div className="relative z-10 flex items-start gap-4">
        <div className="p-2 rounded-xl bg-white/5 text-zinc-400">
          <Icon size={20} />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
            {isHovered && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-emerald-500"
              >
                <CheckCircle size={16} />
              </motion.div>
            )}
          </div>
          <p className="text-sm font-bold text-zinc-100">{insight.summary}</p>
          {insight.details && (
            <p className="text-xs text-zinc-400">{insight.details}</p>
          )}
        </div>
      </div>
    </Card>
  );
};
