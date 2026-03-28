import React from 'react';
import { DailyLog } from '../types';
import { calculateTotalSleepHours, calculateFragmentationIndex } from '../utils/diagnosticEngine';
import { calculateSleepEfficiency, formatDuration } from '../utils/sleepUtils';
import SleepRibbon from './SleepRibbon';
import { format, parseISO } from 'date-fns';

interface PrintableReportProps {
  logs: DailyLog[];
}

const PrintableReport: React.FC<PrintableReportProps> = ({ logs }) => {
  const recentLogs = logs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  
  const avgQuality = Math.round(recentLogs.reduce((acc, l) => acc + (l.sleep_quality || 0), 0) / recentLogs.length);
  const avgSleep = formatDuration(recentLogs.reduce((acc, l) => acc + calculateTotalSleepHours(l), 0) / recentLogs.length);
  const avgEfficiency = Math.round(recentLogs.reduce((acc, l) => acc + Number(calculateSleepEfficiency(l.sleepEvents || [])), 0) / recentLogs.length);

  return (
    <div id="printable-report" className="hidden print:block p-8 bg-white text-black">
      <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-4">
        <div className="flex items-center gap-4">
          <img src="https://i.imgur.com/MnI5hn3.png" alt="SIA Logo" className="w-12 h-12" />
          <h1 className="text-2xl font-black uppercase tracking-widest">Circadian Rhythm Analysis</h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">Generated: {new Date().toLocaleDateString()}</p>
          <p className="text-xs text-zinc-500">7-Day Period: {recentLogs[recentLogs.length - 1].date} to {recentLogs[0].date}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 border border-zinc-300 rounded-lg">
          <p className="text-xs font-bold uppercase text-zinc-500">Avg Quality</p>
          <p className="text-xl font-black">{avgQuality}/10</p>
        </div>
        <div className="p-4 border border-zinc-300 rounded-lg">
          <p className="text-xs font-bold uppercase text-zinc-500">Avg Sleep</p>
          <p className="text-xl font-black">{avgSleep}</p>
        </div>
        <div className="p-4 border border-zinc-300 rounded-lg">
          <p className="text-xs font-bold uppercase text-zinc-500">Avg Efficiency</p>
          <p className="text-xl font-black">{avgEfficiency}%</p>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-black uppercase tracking-widest mb-4">Circadian Ribbon Stack</h2>
        
        {/* Time Ruler */}
        <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-1">
          <span>20:00</span>
          <span>00:00</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
        </div>

        {recentLogs.map((log) => (
          <div key={log.date} className="flex items-center gap-4 break-inside-avoid" >
            <span className="w-16 text-xs font-bold">{format(parseISO(log.date), 'MMM dd')}</span>
            <SleepRibbon sleepEvents={log.sleepEvents} height="h-6" className="flex-1" />
          </div>
        ))}
      </div>

      <footer className="mt-12 pt-4 border-t border-zinc-300 text-[10px] text-zinc-500 italic">
        Disclaimer: SIA provides observations based on your logged data. This is not medical advice. Consult a professional for clinical concerns.
      </footer>
    </div>
  );
};

export default PrintableReport;
