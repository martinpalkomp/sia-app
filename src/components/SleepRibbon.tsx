import React from 'react';
import { SleepEvent } from '../types';
import { motion } from 'motion/react';
import { getMinutesFrom2000 } from '../utils/sleepUtils';

interface SleepRibbonProps {
  sleepEvents?: SleepEvent[];
  showLabels?: boolean;
  className?: string;
  height?: string;
}

const SleepRibbon: React.FC<SleepRibbonProps> = ({ 
  sleepEvents = [], 
  showLabels = false, 
  className = '',
  height = 'h-2'
}) => {
  const activeEvents = sleepEvents.filter(e => e.type !== 'awake-out');

  if (activeEvents.length === 0) {
    return (
      <div className={`w-full flex flex-col gap-1 ${className}`}>
        <div className={`${height} w-full border border-dashed border-zinc-700 rounded-full flex items-center justify-center`}>
          <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">No data logged</span>
        </div>
        {showLabels && (
          <div className="flex justify-between text-[8px] text-zinc-600 font-bold uppercase tracking-widest px-1">
            <span>20:00</span>
            <span>20:00</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col gap-1 ${className}`}>
      <div className={`relative ${height} w-full bg-zinc-900/50 rounded-full overflow-hidden group/ribbon`}>
        {activeEvents.map((event) => {
          const startMins = getMinutesFrom2000(event.start);
          const endMins = getMinutesFrom2000(event.end);
          
          let left = (startMins / 1440) * 100;
          let width = 0;

          if (endMins < startMins) {
            // Wrap around case (should be handled by split events but just in case)
            width = ((1440 - startMins) / 1440) * 100;
          } else {
            width = ((endMins - startMins) / 1440) * 100;
          }

          const colorClass = event.type === 'sleep' ? 'bg-emerald-500' : 'bg-indigo-500';
          const label = event.type === 'sleep' ? 'Sleep' : 'Awake In Bed';

          return (
            <div
              key={event.id}
              className={`absolute top-0 bottom-0 ${colorClass} transition-all cursor-help group/segment ${event.type === 'sleep' ? 'bg-diagonal-pattern' : ''}`}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-[9px] font-bold text-white whitespace-nowrap opacity-0 group-hover/segment:opacity-100 pointer-events-none z-50 transition-opacity shadow-xl">
                {label}: {event.start} — {event.end}
              </div>
            </div>
          );
        })}

        {/* Time Markers */}
        <div className="absolute top-0 bottom-0 left-[16.66%] w-[1px] bg-white/10 pointer-events-none" /> {/* 00:00 (4 hours from 20:00 = 4/24 = 16.66%) */}
        <div className="absolute top-0 bottom-0 left-[50%] w-[1px] bg-white/10 pointer-events-none" /> {/* 08:00 (12 hours from 20:00 = 12/24 = 50%) */}
      </div>
      
      <div className="relative h-3 w-full mt-1">
        <span className="absolute left-0 text-[7px] text-zinc-600 font-black uppercase tracking-widest">20:00</span>
        <span className="absolute left-[16.66%] -translate-x-1/2 text-[7px] text-zinc-600/50 font-black uppercase tracking-widest">00:00</span>
        <span className="absolute left-[50%] -translate-x-1/2 text-[7px] text-zinc-600/50 font-black uppercase tracking-widest">08:00</span>
        <span className="absolute right-0 text-[7px] text-zinc-600 font-black uppercase tracking-widest">20:00</span>
      </div>
    </div>
  );
};

export default SleepRibbon;
