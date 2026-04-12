import React from 'react';
import { motion } from 'motion/react';
import { Square, Waves, Network, Brain, Check, Zap, Sparkles } from 'lucide-react';
import { Card } from './UI';
import { MaturityInfo } from '../services/aiService';

interface DataMaturityTrackerProps {
  maturity: MaturityInfo;
  showTimeline?: boolean;
  proMessage?: string;
}

export default function DataMaturityTracker({ maturity, showTimeline = false, proMessage }: DataMaturityTrackerProps) {
  const d = maturity.count;
  const p1 = Math.min(1, d / 7) * 100;
  const p2 = Math.min(1, Math.max(0, d - 7) / 7) * 100;
  const p3 = Math.min(1, Math.max(0, d - 14) / 76) * 100;
  const p4 = d >= 90 ? 100 : 0;

  const steps = [
    { label: 'Baseline', sub: '0+ Days', progress: p1, color: 'bg-zinc-500', icon: Square },
    { label: 'Trends', sub: '7+ Days', progress: p2, color: 'bg-amber-500', icon: Waves },
    { label: 'Deep Analysis', sub: '14+ Days', progress: p3, color: 'bg-blue-500', icon: Network },
    { label: 'Advanced', sub: '90+ Days', progress: p4, color: 'bg-emerald-500', icon: Brain },
  ];

  return (
    <Card className="bg-zinc-950/50 border-zinc-800 p-6 relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Data Fidelity Roadmap</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">
              {maturity.level === 4 ? "Maximum diagnostic level reached" : `Next milestone: ${maturity.nextThreshold} days`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-5xl font-black text-white font-mono tracking-tighter">{maturity.count}</span>
            <span className="text-[10px] text-zinc-500 font-black uppercase block tracking-widest">Days Logged</span>
          </div>
        </div>

        {/* Roadmap Path */}
        <div className="relative space-y-6">
          {/* Neural Circuit Path */}
          <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-zinc-800" />
          
          {steps.map((step, i) => {
            const isCompleted = step.progress === 100;
            const isActive = step.progress > 0 && step.progress < 100;
            const Icon = step.icon;

            return (
              <div key={step.label} className="relative flex items-center gap-4">
                {/* Node */}
                <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 ${isCompleted ? 'bg-zinc-900 border-emerald-500 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : isActive ? 'bg-zinc-900 border-indigo-500 text-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)] animate-pulse' : 'bg-zinc-900 border-zinc-700 text-zinc-700'}`}>
                  {isCompleted ? <Check size={14} /> : <Icon size={14} />}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                    <span className={isCompleted ? 'text-white' : isActive ? 'text-indigo-400' : 'text-zinc-600'}>{step.label}</span>
                    <span className="text-zinc-500">{step.sub}</span>
                  </div>
                  {/* Thicker Progress Bar */}
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${step.progress}%` }}
                      className={`h-full transition-all duration-1000 bg-gradient-to-r ${step.color.replace('bg-', 'from-')}/50 to-${step.color.replace('bg-', '')}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
