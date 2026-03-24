import React from 'react';
import { SleepState } from '../types';
import { SLEEP_STATES, getSlotLabel } from '../constants';

interface SleepWindowProps {
  timeline: SleepState[];
  isEditing: boolean;
  isImported?: boolean;
  onMouseDown: (idx: number) => void;
  onMouseEnter: (idx: number) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export const SleepWindow: React.FC<SleepWindowProps> = ({
  timeline,
  isEditing,
  isImported,
  onMouseDown,
  onMouseEnter,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
      <div className="grid grid-rows-6">
        {Array.from({ length: 6 }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex border-b border-zinc-800/30 last:border-b-0">
            <div className="w-12 flex-shrink-0 flex items-center justify-center border-r border-zinc-800/50 bg-zinc-900/80">
              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-tighter">
                {getSlotLabel(rowIdx * 16).split(':')[0]}h
              </span>
            </div>
            <div 
              className="grid grid-cols-16 flex-1"
              style={{ touchAction: 'none' }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {timeline.slice(rowIdx * 16, (rowIdx + 1) * 16).map((state, localIdx) => {
                const idx = rowIdx * 16 + localIdx;
                
                // UI Render Check: Exact mapping as requested
                // value === 1 ? 'bg-emerald-500' : value === 2 ? 'bg-indigo-500' : 'bg-zinc-900'
                let colorClass = 'bg-zinc-900';
                if (state === 'sleep') colorClass = 'bg-emerald-500';
                else if (state === 'awake-in') colorClass = 'bg-indigo-500';
                
                const isHourStart = idx % 4 === 0;
                
                return (
                  <div
                    key={idx}
                    data-slot-index={idx}
                    onMouseDown={() => onMouseDown(idx)}
                    onMouseEnter={() => onMouseEnter(idx)}
                    className={`h-12 flex flex-col items-center justify-center relative group transition-all border-r border-zinc-800/30 last:border-r-0 ${colorClass} hover:brightness-125 cursor-crosshair ${isImported ? 'ring-1 ring-inset ring-indigo-400/50 animate-pulse' : ''}`}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 pointer-events-none transition-opacity" />
                    {isEditing && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap border border-zinc-700 shadow-xl">
                        {getSlotLabel(idx)}
                      </div>
                    )}
                    {isHourStart && (
                      <span className="text-[7px] text-zinc-400 font-mono font-bold pointer-events-none">
                        {getSlotLabel(idx).split(':')[1] === '00' ? getSlotLabel(idx).split(':')[0] : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
