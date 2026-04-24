import React from 'react';
import { motion } from 'motion/react';
import { Square, Waves, Network, Brain, Check, Lock } from 'lucide-react';
import { Card } from '../../components/UI';
import { MaturityInfo } from '../../services/aiService';

interface DataMaturityTrackerProps {
  maturity: MaturityInfo;
}

export default function DataMaturityTracker({ maturity }: DataMaturityTrackerProps) {
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
  const d = maturity.count;

  const milestones = [
    { label: 'Baseline', range: '0-6 days', progress: clamp((d / 6) * 100, 0, 100), color: 'bg-emerald-500', icon: Check },
    { label: 'Trends', range: '7-13 days', progress: d <= 6 ? 0 : clamp(((d - 6) / 7) * 100, 0, 100), color: 'bg-amber-500', icon: Check },
    { label: 'Deep Analysis', range: '14-89 days', progress: d <= 13 ? 0 : clamp(((d - 13) / 76) * 100, 0, 100), color: 'bg-blue-600', icon: Network },
    { label: 'Advanced', range: '90+ days', progress: d >= 90 ? 100 : 0, color: 'bg-zinc-700', icon: Lock },
  ];

  const nextMilestone = d < 7 ? 7 : d < 14 ? 14 : d < 90 ? 90 : 90;

  return (
    <Card className="bg-zinc-900 border-zinc-800 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data Fidelity Roadmap</p>
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">NEXT MILESTONE: {nextMilestone} DAYS</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-white tracking-tighter">{d}</span>
          <span className="text-[9px] text-zinc-500 font-black uppercase block tracking-widest mt-0.5">Days Logged</span>
        </div>
      </div>

      <div className="space-y-4">
        {milestones.map((milestone, i) => {
          const isCompleted = milestone.progress === 100;
          const Icon = milestone.icon;
          
          return (
            <div key={milestone.label} className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className={`flex items-center gap-1.5 ${isCompleted ? 'text-zinc-50' : 'text-zinc-500'}`}>
                   {milestone.label}
                   {isCompleted && <Check size={12} />}
                </span>
                <span className="text-zinc-600">{milestone.range}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${milestone.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full ${isCompleted ? milestone.color : 'bg-blue-600'}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
