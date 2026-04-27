import React from 'react';
import { DailyLog } from '../../types';
import { calculateTotalSleepHours } from '../../utils/diagnosticEngine';
import { calculateSleepEfficiency, formatDuration } from '../../utils/sleepUtils';
import SleepRibbon from '../sleep/SleepRibbon';
import { format, parseISO } from 'date-fns';

interface PrintableReportProps {
  logs: DailyLog[];
  userName?: string;
}

const PrintableReport: React.FC<PrintableReportProps> = ({ logs, userName }) => {
  const recentLogs = logs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  
  const avgQuality = Math.round(recentLogs.reduce((acc, l) => acc + (l.sleep_quality || 0), 0) / recentLogs.length);
  const avgSleep = formatDuration(recentLogs.reduce((acc, l) => acc + calculateTotalSleepHours(l), 0) / recentLogs.length);
  const avgEfficiency = Math.round(recentLogs.reduce((acc, l) => acc + Number(calculateSleepEfficiency(l.sleepEvents || [])), 0) / recentLogs.length);

  return (
    <div id="printable-report" className="hidden print:block p-0 bg-white text-black">
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          body { background-color: white !important; }
          #printable-report { display: block !important; }
          .print-ribbon { filter: contrast(1.2) grayscale(100%) invert(100%); }
          .print-ribbon-container { background-color: white !important; }
        }
      `}</style>
      
      <div className="max-w-[190mm] mx-auto">
        <div className="mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-serif font-bold mb-2">SIA: Sleep Intelligence Agent | Circadian Analysis Report</h1>
          <div className="flex justify-between items-center text-sm font-sans">
            <p className="font-bold">Patient: {userName || 'N/A'}</p>
            <p>7-Day Observation Cycle: {recentLogs[recentLogs.length - 1].date} to {recentLogs[0].date}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Avg Quality', value: `${avgQuality}/10` },
            { label: 'Avg Sleep', value: avgSleep },
            { label: 'Avg Efficiency', value: `${avgEfficiency}%` }
          ].map((m) => (
            <div key={m.label} className="p-4 border border-zinc-300 bg-zinc-50 rounded-lg">
              <p className="text-[10px] font-bold uppercase text-zinc-500">{m.label}</p>
              <p className="text-xl font-black">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          <h2 className="text-lg font-black uppercase tracking-widest mb-4">Circadian Rhythm Stack</h2>
          
          {/* Time Ruler */}
          <div className="relative text-[8px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-1 font-mono">
            <span className="absolute left-[0%]">20:00</span>
            <span className="absolute left-[16.66%]">00:00</span>
            <span className="absolute left-[33.33%]">04:00</span>
            <span className="absolute left-[50%]">08:00</span>
            <span className="absolute left-[66.66%]">12:00</span>
            <span className="absolute left-[83.33%]">16:00</span>
            <span className="absolute right-0 whitespace-nowrap">20:00</span>
          </div>

          <div className="relative border-l border-r border-zinc-200">
            {/* Vertical Grid Lines */}
            <div className="absolute inset-0 flex justify-between px-0 pointer-events-none">
              {[0, 16, 32, 48, 64, 80, 96].map((pos) => (
                <div key={pos} className="w-[1px] h-full bg-zinc-200" />
              ))}
            </div>

            <div className="space-y-4 relative">
              {recentLogs.map((log) => (
                <div key={log.date} className="flex items-center gap-4 break-inside-avoid">
                  <span className="w-16 text-[10px] font-bold">{format(parseISO(log.date), 'MMM dd')}</span>
                  <div className="flex-1 print-ribbon">
                    <SleepRibbon sleepEvents={log.sleepEvents} height="h-6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="mt-12 pt-4 border-t border-zinc-300 text-[10px] text-zinc-500 italic">
          Disclaimer: SIA provides observations based on your logged data. This is not medical advice. Consult a professional for clinical concerns.
        </footer>
      </div>
    </div>
  );
};

export default PrintableReport;
