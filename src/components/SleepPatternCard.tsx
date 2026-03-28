import React from 'react';
import { DailyLog } from '../types';
import { 
  calculateBedtimeConsistency,
  calculateFragmentationIndex,
  calculateTotalSleepHours,
  calculateSocialJetlag
} from '../utils/diagnosticEngine';
import { Card } from './UI';
import { ClipboardCheck, Share2, Info } from 'lucide-react';
import { formatDuration } from '../utils/sleepUtils';

interface SleepPatternCardProps {
  logs: DailyLog[];
  periodType: '7-DAY' | '30-DAY' | 'CUSTOM';
}

const SleepPatternCard: React.FC<SleepPatternCardProps> = ({ logs, periodType }) => {
  if (!logs || !Array.isArray(logs) || logs.length === 0) return null;

  // We assume logs are sorted by date desc or represent the period.
  const recentLogs = logs.slice().sort((a, b) => b.date.localeCompare(a.date));
  
  if (recentLogs.length === 0) return null;

  const latestLog = recentLogs[0];
  
  // Calculate averages for the provided logs
  const avgDuration = recentLogs.reduce((acc, l) => acc + calculateTotalSleepHours(l), 0) / recentLogs.length;
  const avgFragmentation = recentLogs.reduce((acc, l) => acc + calculateFragmentationIndex(l), 0) / recentLogs.length;
  const bedtimeConsistency = calculateBedtimeConsistency(recentLogs);
  const socialJetlag = calculateSocialJetlag(latestLog, recentLogs.slice(1));

  const metrics = [
    {
      label: "Sleep Duration Avg",
      value: formatDuration(avgDuration),
      status: avgDuration >= 7 ? 'green' : avgDuration >= 6 ? 'amber' : 'red',
      desc: "Average duration of sleep over the selected period."
    },
    {
      label: "Fragmentation Index",
      value: `${Math.round(avgFragmentation)}`,
      status: avgFragmentation < 0.5 ? 'green' : avgFragmentation < 1.0 ? 'amber' : 'red',
      desc: "Average interruptions per hour of sleep."
    },
    {
      label: "Bedtime Consistency",
      value: formatDuration(bedtimeConsistency),
      status: bedtimeConsistency < 0.5 ? 'green' : bedtimeConsistency < 1.5 ? 'amber' : 'red',
      desc: "Variance in your bedtime over the selected period."
    },
    {
      label: "Social Jetlag",
      value: formatDuration(socialJetlag),
      status: socialJetlag < 1.0 ? 'green' : socialJetlag < 2.0 ? 'amber' : 'red',
      desc: "Shift in sleep midpoint compared to your average."
    }
  ];

  const [copied, setCopied] = React.useState(false);
  
  const handleExport = () => {
    const report = `SIA Sleep Pattern Observation Report
Period: ${periodType} Observation
Generated: ${new Date().toLocaleDateString()}

Observations:
- Average Sleep Duration: ${formatDuration(avgDuration)}
- Fragmentation Index: ${avgFragmentation.toFixed(2)} interruptions/hour
- Bedtime Consistency: ${formatDuration(bedtimeConsistency)} variance
- Social Jetlag: ${formatDuration(socialJetlag)} shift

Disclaimer: SIA provides observations based on your logged data. This is not medical advice. Consult a professional for clinical concerns.`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Sleep Pattern Summary</h3>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">• {periodType}</span>
          <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 cursor-help group relative">
            <span className="text-[10px]">i</span>
            <div className="absolute top-full left-0 mt-2 w-64 p-4 bg-zinc-900/95 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              This summary provides observations based on your logged data over the selected period.
            </div>
          </div>
        </div>
        <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
          <Share2 size={16} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-2xl space-y-2 relative group text-left hover:border-indigo-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{m.label}</span>
              <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-500 cursor-help relative group/tooltip">
                <span className="text-[8px]">i</span>
                <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-zinc-800 text-[10px] text-zinc-300 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 border border-zinc-700 shadow-xl">
                  {m.desc}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xl font-black text-white tracking-tight">{m.value}</p>
              <div className={`w-2 h-2 rounded-full ${
                m.status === 'green' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 
                m.status === 'amber' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'
              }`} />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-zinc-800 space-y-4">
        <div className="flex items-start gap-3 text-zinc-300 text-left">
          <Info size={14} className="mt-0.5 flex-shrink-0" />
          <p className="text-[10px] leading-relaxed font-medium italic">
            SIA provides observations based on your logged data. This is not medical advice. Consult a professional for clinical concerns.
          </p>
        </div>

        <button 
          onClick={handleExport}
          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-zinc-700"
        >
          {copied ? (
            <>
              <ClipboardCheck size={14} className="text-emerald-400" />
              Report Copied
            </>
          ) : (
            <>
              <Share2 size={14} />
              Export for Doctor
            </>
          )}
        </button>
      </div>
    </Card>
  );
};

export default SleepPatternCard;
