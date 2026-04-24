import React from 'react';
import { motion } from 'motion/react';
import { Clock, Moon } from 'lucide-react';
import { DailyLog } from '../../types';

interface SleepGateHeroProps {
  logs: Record<string, DailyLog>;
  userName?: string;
  className?: string;
}

const CircularTimer = () => (
  <div className="relative w-48 h-48 flex items-center justify-center">
    {/* Glow Ring */}
    <div className="absolute inset-0 rounded-full border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]" />
    {/* Active Marker Point */}
    <motion.div 
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute w-full h-full"
    >
      <div className="absolute top-0 left-1/2 -ml-1.5 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]" />
    </motion.div>
    {/* Inner Text */}
    <div className="flex flex-col items-center z-10">
      <span className="text-[10px] uppercase font-black tracking-widest text-indigo-300">Sleep Gate</span>
      <span className="text-4xl font-bold tracking-tight">23:15</span>
      <span className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider">Optimal Window</span>
    </div>
  </div>
);

export const SleepGateHero: React.FC<SleepGateHeroProps> = ({ logs, userName, className }) => {
  const greeting = userName ? `Evening, ${userName}` : 'Good Evening';

  const getBackgroundImage = () => {
    return "https://raw.githubusercontent.com/martinpalkomp/sia-app/refs/heads/main/sia_all.jpg";
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative w-full min-h-[600px] overflow-hidden p-6 lg:p-10 text-white flex flex-col -mb-30 z-10 ${className || ''}`}
    >
      <img
        src={getBackgroundImage()}
        alt="Atmospheric landscape"
        className="absolute inset-0 w-full h-full object-cover -z-10"
      />
      
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

      {/* Top Bar: Avatar and Badge */}
      <div className="relative z-20 flex items-center gap-3 mb-8">
        <img 
          src="https://i.imgur.com/MnI5hn3.png" 
          alt="SIA Avatar" 
          className="w-12 h-12 rounded-full border border-zinc-700 shadow-lg"
        />
        <span className="bg-indigo-600 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-black text-white shrink-0">
          Sleep Intelligence Agent
        </span>
      </div>

      <div className="relative z-20 grid md:grid-cols-2 gap-8 items-center w-full py-6 flex-1">
        <div className="order-2 md:order-1">
          <h2 className="text-4xl lg:text-5xl font-black font-sans tracking-tighter mb-3 text-white">{greeting}</h2>
          <p className="text-zinc-200 mb-8 font-medium text-lg leading-relaxed max-w-md">
            Your sleep gate is projected for <span className="text-indigo-300 font-bold">23:15</span>. 
            Start winding down in <span className="text-indigo-300 font-bold">~45 min</span> for optimal transition.
          </p>
          
          <div className="flex gap-8">
            <div className="flex items-center gap-3 text-zinc-300">
              <Clock size={20} className="text-indigo-400" />
              <div className="font-black text-xs tracking-widest uppercase">
                <p>22:30 – 23:15</p>
                <p className="text-[10px] text-zinc-500">Wind-down window</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
              <Moon size={20} className="text-indigo-400" />
              <div className="font-black text-xs tracking-widest uppercase">
                <p>7h 30m</p>
                <p className="text-[10px] text-zinc-500">Recommended</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="order-1 md:order-2 flex justify-center md:justify-end">
          <CircularTimer />
        </div>
      </div>
    </motion.section>
  );
};
