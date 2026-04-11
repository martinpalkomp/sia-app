import React from 'react';
import { motion } from 'motion/react';
import { Database, Zap, Sparkles } from 'lucide-react';
import { Card } from './UI';
import { MaturityInfo } from '../services/aiService';

interface DataMaturityTrackerProps {
  maturity: MaturityInfo;
  showTimeline?: boolean;
  proMessage?: string;
}

export default function DataMaturityTracker({ maturity, showTimeline = false, proMessage }: DataMaturityTrackerProps) {
  return (
    <Card className="bg-zinc-900/30 border-zinc-800/50 p-6 relative overflow-hidden group">
      {showTimeline && (
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Zap size={48} className="text-indigo-500" />
        </div>
      )}
      
      <div className="relative z-10 space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end mb-1 gap-2">
          <div className="text-left">
            <p className="text-xs font-bold text-white">Data Fidelity Progress</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {maturity.level === 3 
                ? "Maximum insight level reached" 
                : `Next milestone: ${maturity.nextThreshold} days`}
            </p>
          </div>
          <div className="text-left md:text-right">
            <span className="text-2xl font-black text-white">{maturity.count}</span>
            <span className="text-xs text-zinc-500 font-bold uppercase ml-1">Days Logged</span>
          </div>
        </div>
        
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (maturity.count / maturity.nextThreshold) * 100)}%` }}
            className={`h-full transition-all duration-1000 ${
              maturity.level === 3 ? 'bg-emerald-500' :
              maturity.level === 2 ? 'bg-blue-500' :
              'bg-amber-500'
            }`}
          />
        </div>
        
        {showTimeline && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              { level: 1, label: 'Baseline', days: '0+', active: maturity.level >= 1 },
              { level: 2, label: 'Rhythms', days: '15+', active: maturity.level >= 2 },
              { level: 3, label: 'Deep Analysis', days: '90+', active: maturity.level >= 3 },
            ].map((step) => (
              <div key={step.level} className="text-center space-y-1">
                <div className={`h-1 rounded-full transition-colors ${step.active ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
                <p className={`text-[8px] font-black uppercase tracking-tighter ${step.active ? 'text-indigo-400' : 'text-zinc-600'}`}>{step.label}</p>
                <p className="text-[8px] text-zinc-700 font-bold">{step.days} Days</p>
              </div>
            ))}
          </div>
        )}

        {proMessage && (
          <div className="pt-2 flex items-center gap-2 text-[10px] font-bold text-violet-400 uppercase tracking-widest">
            <Sparkles size={12} />
            <span>{proMessage}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
