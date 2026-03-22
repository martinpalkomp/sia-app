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

interface SleepPatternCardProps {
  logs: DailyLog[];
}

const SleepPatternCard: React.FC<SleepPatternCardProps> = ({ logs }) => {
  // We assume logs are sorted by date desc or represent the period.
  const recentLogs = logs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  
  if (recentLogs.length === 0) return null;

  const latestLog = recentLogs[0];
  
  // Calculate averages for the last 7 days
  const avgDuration = recentLogs.reduce((acc, l) => acc + calculateTotalSleepHours(l), 0) / recentLogs.length;
  const avgFragmentation = recentLogs.reduce((acc, l) => acc + calculateFragmentationIndex(l), 0) / recentLogs.length;
  const bedtimeConsistency = calculateBedtimeConsistency(recentLogs);
  const socialJetlag = calculateSocialJetlag(latestLog, recentLogs.slice(1));

  const metrics = [
    {
      label: "Sleep Duration Avg",
      value: `${avgDuration.toFixed(1)}h`,
      status: avgDuration >= 7 ? 'green' : avgDuration >= 6 ? 'amber' : 'red',
      desc: "Average hours of sleep over the last 7 days."
    },
    {
      label: "Fragmentation Index",
      value: `${avgFragmentation.toFixed(2)}`,
      status: avgFragmentation < 0.5 ? 'green' : avgFragmentation < 1.0 ? 'amber' : 'red',
      desc: "Average interruptions per hour of sleep."
    },
    {
      label: "Bedtime Consistency",
      value: `${bedtimeConsistency.toFixed(1)}h`,
      status: bedtimeConsistency < 0.5 ? 'green' : bedtimeConsistency < 1.5 ? 'amber' : 'red',
      desc: "Variance in your bedtime over the last 7 days."
    },
    {
      label: "Social Jetlag",
      value: `${socialJetlag.toFixed(1)}h`,
      status: socialJetlag < 1.0 ? 'green' : socialJetlag < 2.0 ? 'amber' : 'red',
      desc: "Shift in sleep midpoint compared to your average."
    }
  ];

  const [copied, setCopied] = React.useState(false);
  
  const handleExport = () => {
    const report = `SIA Sleep Pattern Observation Report
Period: Last 7 Days
Generated: ${new Date().toLocaleDateString()}

Observations:
- Average Sleep Duration: ${avgDuration.toFixed(1)} hours
- Fragmentation Index: ${avgFragmentation.toFixed(2)} interruptions/hour
- Bedtime Consistency: ${bedtimeConsistency.toFixed(1)}h variance
- Social Jetlag: ${socialJetlag.toFixed(1)}h shift

Disclaimer: SIA provides observations based on your logged data. This is not medical advice. Consult a professional for clinical concerns.`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1 text-left">
          <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Sleep Pattern Summary</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">7-Day Observation</p>
        </div>
        <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
          <Share2 size={16} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl space-y-2 relative group text-left">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{m.label}</span>
              <div className={`w-1.5 h-1.5 rounded-full ${
                m.status === 'green' ? 'bg-emerald-500' : 
                m.status === 'amber' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
            </div>
            <p className="text-xl font-black text-white tracking-tight">{m.value}</p>
            
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-zinc-800 text-[10px] text-zinc-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-zinc-700 shadow-xl">
              {m.desc}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-zinc-800 space-y-4">
        <div className="flex items-start gap-3 text-zinc-500 text-left">
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
