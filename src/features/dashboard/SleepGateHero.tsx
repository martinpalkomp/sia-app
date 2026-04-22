import React from 'react';
import { motion } from 'motion/react';
import { Clock, Moon } from 'lucide-react';
import { DailyLog } from '../../types';

interface SleepGateHeroProps {
  logs: Record<string, DailyLog>;
  userName?: string;
}

export const SleepGateHero: React.FC<SleepGateHeroProps> = ({ logs, userName }) => {
  // Logic to calculate Sleep Gate based on average wake time
  // For now, implementing placeholders based on the mockup.
  // Will need to pull from Zustand/logs in a real implementation.
  
  const greeting = userName ? `Evening, ${userName}` : 'Good Evening';

  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-950 via-zinc-950 to-indigo-900 border border-indigo-500/20 p-8 text-white"
    >
      <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-3xl font-bold font-sans tracking-tight mb-2 text-indigo-100">{greeting}</h2>
          <p className="text-zinc-300 mb-6 font-medium">Your sleep gate is projected for <span className="text-indigo-300 font-bold">23:15</span>.<br/>Start winding down in <span className="text-indigo-300 font-bold">~45 min</span> for optimal transition.</p>
          
          <div className="flex gap-6">
            <div className="flex items-center gap-2 text-zinc-400">
              <Clock size={18} />
              <div className="text-xs font-bold tracking-widest uppercase">
                <p>22:30 – 23:15</p>
                <p className="text-[10px] opacity-60">Wind-down window</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Moon size={18} />
              <div className="text-xs font-bold tracking-widest uppercase">
                <p>7h 30m</p>
                <p className="text-[10px] opacity-60">Recommended</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <div className="relative w-40 h-40 rounded-full border-4 border-indigo-500/20 flex flex-col items-center justify-center bg-zinc-950/50 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-300">Sleep Gate</span>
            <span className="text-3xl font-bold tracking-tight">23:15</span>
            <span className="text-[10px] text-zinc-400">Optimal window</span>
          </div>
        </div>
      </div>
      
      {/* Decorative mountain background - simplistic representation */}
      <div className="absolute inset-0 z-0 opacity-20 -bottom-32 bg-[radial-gradient(circle_at_bottom,theme(colors.indigo.600),transparent_70%)]" />
    </motion.section>
  );
};
