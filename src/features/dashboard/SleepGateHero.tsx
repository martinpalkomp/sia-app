import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Moon } from 'lucide-react';
import { DailyLog } from '../../types';

interface SleepGateHeroProps {
  logs: Record<string, DailyLog>;
  userName?: string;
  className?: string;
}

const SleepGateArc = () => {
  const cx = 150;
  const cy = 140;
  const r = 130;

  const timeToAngle = (hours: number, minutes: number) => {
    let totalMinutes = hours * 60 + minutes;
    let shifted = totalMinutes - 18 * 60;
    if (shifted < 0) shifted += 24 * 60;
    const ratio = shifted / (12 * 60);
    return -90 + ratio * 180;
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  };

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    // Handle cases where startAngle and endAngle are very close or same
    if (Math.abs(endAngle - startAngle) < 0.1) return '';
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  // Fixed values for UI mapping illustration as per strategy
  const windDownStartH = 22, windDownStartM = 30;
  const sleepGateH = 23, sleepGateM = 15;
  const wakeH = 6, wakeM = 45; // 23:15 + 7h30m

  const aBaseStart = -90; // 18:00
  const aBaseEnd = 90; // 06:00
  
  const aWindDownStart = timeToAngle(windDownStartH, windDownStartM);
  const aSleepGate = timeToAngle(sleepGateH, sleepGateM);
  const aWake = timeToAngle(wakeH, wakeM);

  const gatePos = polarToCartesian(cx, cy, r, aSleepGate);

  const [currentAngle, setCurrentAngle] = useState(-90);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentAngle(timeToAngle(now.getHours(), now.getMinutes()));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentPos = polarToCartesian(cx, cy, r, currentAngle);

  return (
    <div className="relative w-full max-w-[360px] mx-auto aspect-[2/1.3] flex flex-col justify-end">
      <svg viewBox="0 0 300 160" className="w-full h-full overflow-visible absolute top-0 left-0 right-0">
        <defs>
          <linearGradient id="windDownGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99,102,241,0.1)" />
            <stop offset="100%" stopColor="rgba(99,102,241,1)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Base Arc (18:00 to 06:00) */}
        <path 
          d={describeArc(cx, cy, r, aBaseStart, aBaseEnd)} 
          fill="none" 
          stroke="rgba(255,255,255,0.08)" 
          strokeWidth="3" 
          strokeLinecap="round"
          strokeDasharray="1 6"
        />

        {/* Past Time Arc (Dimmed) */}
        {currentAngle > aBaseStart && currentAngle < aBaseEnd + 180 && (
          <path 
            d={describeArc(cx, cy, r, aBaseStart, Math.min(currentAngle, aBaseEnd))} 
            fill="none" 
            stroke="rgba(255,255,255,0.04)" 
            strokeWidth="3" 
            strokeLinecap="round"
          />
        )}

        {/* Wind-down Arc (Gradient Soft Glow) */}
        {aWindDownStart < aSleepGate && (
          <motion.path 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            d={describeArc(cx, cy, r, aWindDownStart, aSleepGate)} 
            fill="none" 
            stroke="url(#windDownGradient)" 
            strokeWidth="6"
            strokeLinecap="round"
            filter="url(#glow)"
          />
        )}

        {/* Sleep Duration Arc (Dashed) */}
        <motion.path 
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
          d={describeArc(cx, cy, r, aSleepGate, aWake)} 
          fill="none" 
          stroke="rgba(255,255,255,0.3)" 
          strokeWidth="2"
          strokeDasharray="4 6"
          strokeLinecap="round"
        />

        {/* Sleep Gate Uncertainty Zone (Soft Zone) */}
        <path 
          d={describeArc(cx, cy, r, aSleepGate - 4, aSleepGate + 4)} 
          fill="none" 
          stroke="rgba(99,102,241,0.2)" 
          strokeWidth="12"
          strokeLinecap="round"
          filter="url(#glow)"
        />

        {/* Sleep Gate Node Container for pulsing */}
        <motion.g 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          {/* Sleep Gate Node Outer Glow */}
          <motion.circle 
            animate={{ r: [6, 10, 6], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            cx={gatePos.x} 
            cy={gatePos.y} 
            r="8" 
            fill="rgba(120,120,255,0.3)" 
            filter="url(#glow)"
          />
          {/* Sleep Gate Node Core Glow */}
          <circle 
            cx={gatePos.x} 
            cy={gatePos.y} 
            r="4" 
            fill="rgba(120,120,255,0.8)" 
            filter="url(#glow)"
          />
          {/* Sleep Gate Node Primary (White center) */}
          <circle 
            cx={gatePos.x} 
            cy={gatePos.y} 
            r="2.5" 
            fill="#fff" 
          />
        </motion.g>

        {/* Current Time Indicator Node */}
        {currentAngle >= aBaseStart && currentAngle <= aWake && (
            <circle 
              cx={currentPos.x} 
              cy={currentPos.y} 
              r="2" 
              fill="rgba(255,255,255,0.6)" 
              className="shadow-sm"
            />
        )}
      </svg>
      
      {/* Inner Text overlay in the bottom middle of the arch */}
      <div className="flex flex-col items-center justify-end pb-2 font-sans z-10 w-full">
        <motion.span 
          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="text-[10px] uppercase font-black tracking-[0.2em] text-indigo-300"
        >
          Sleep Gate
        </motion.span>
        <motion.span 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }}
          className="text-5xl font-black tracking-tighter text-white drop-shadow-xl mt-1"
        >
          {String(sleepGateH).padStart(2, '0')}:{String(sleepGateM).padStart(2, '0')}
        </motion.span>
        <motion.span 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="text-[12px] text-zinc-400 mt-2 font-medium tracking-wide"
        >
          Your optimal sleep window
        </motion.span>
      </div>
    </div>
  );
};

export const SleepGateHero: React.FC<SleepGateHeroProps> = ({ logs, userName, className }) => {
  const greeting = userName ? `Evening, ${userName}` : 'Good Evening';

  const getBackgroundImage = () => {
    return "https://raw.githubusercontent.com/martinpalkomp/sia-app/refs/heads/main/sia_all_dark.jpg";
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative w-full min-h-[600px] overflow-hidden p-6 lg:p-10 text-white flex flex-col z-10 ${className || ''}`}
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
          <SleepGateArc />
        </div>
      </div>
    </motion.section>
  );
};
