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

export const InsightCard: React.FC<InsightCardProps> = ({ insight, tier = 'Basic' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { label, icon: Icon } = getCategoryInfo(insight);
  
  const tierStyles = {
    Pro: 'from-violet-900/20 to-zinc-950/50 border-violet-500/30 shadow-violet-500/10',
    Enhanced: 'from-indigo-900/20 to-zinc-950/50 border-indigo-500/30 shadow-indigo-500/10',
    Basic: 'from-zinc-900/20 to-zinc-950/50 border-zinc-800 shadow-zinc-500/5'
  };

  const activeStyle = tierStyles[tier] || tierStyles.Basic;

  return (
    <Card
      onClick={() => setIsHovered(!isHovered)}
      className={`relative overflow-hidden bg-gradient-to-br ${activeStyle} border backdrop-blur-sm p-6 transition-all duration-500 rounded-3xl shadow-lg hover:border-opacity-50`}
    >
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
      </div>
      
      <div className="relative z-10 flex items-start gap-4">
        <div className={`p-3 rounded-2xl bg-white/5 ${tier === 'Pro' ? 'text-violet-400' : tier === 'Enhanced' ? 'text-indigo-400' : 'text-zinc-400'}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-zinc-400 tracking-widest">{label}</span>
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
          <p className="text-sm font-normal text-zinc-300 leading-snug">{insight.summary}</p>
          {insight.details && (
            <p className="text-sm text-zinc-300 font-normal leading-relaxed">{insight.details}</p>
          )}
        </div>
      </div>
    </Card>
  );
};
