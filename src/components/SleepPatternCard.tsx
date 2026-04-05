import React from 'react';
import { DailyLog, PersonalizationProfile, UserProfile } from '../types';
import { 
  calculateBedtimeConsistency,
  calculateFragmentationIndex,
  calculateTotalSleepHours,
  calculateSocialJetlag
} from '../utils/diagnosticEngine';
import { Card } from './UI';
import { LockedFeatureOverlay } from './LockedFeatureOverlay';
import { ClipboardCheck, Share2, Info, Printer, FileText, Sparkles } from 'lucide-react';
import { formatDuration, getGridFromEvents, generateASCIIRibbon, generateASCIIRibbonHeader, calculateSleepEfficiency } from '../utils/sleepUtils';
import { format, parseISO } from 'date-fns';
import PrintableReport from './PrintableReport';
import { generateDoctorReport } from '../utils/generateDoctorReport';
import { User } from 'firebase/auth';

interface SleepPatternCardProps {
  logs: Record<string, DailyLog>;
  periodType: '7-DAY' | '30-DAY' | 'CUSTOM';
  personalizationProfile: PersonalizationProfile | null;
  user: User | null;
  userProfile?: UserProfile | null;
  activeDates: string[];
  viewMode: 'weekly' | 'monthly' | 'custom';
  onViewChange: (view: any) => void;
}

const SleepPatternCard: React.FC<SleepPatternCardProps> = ({ logs, periodType, personalizationProfile, user, userProfile, activeDates, viewMode, onViewChange }) => {
  if (!activeDates || activeDates.length === 0) return null;
  
  const recentLogs = activeDates.map(d => logs[d]).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
  const latestLog = recentLogs[0];
  
  if (recentLogs.length === 0) return null;
  
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
  
  const handleExportReport = () => {
    if (userProfile?.tier === 'Basic') {
      alert('Clinical Reports are available on Enhanced and Pro plans. Upgrade in your Account settings.');
      return;
    }
    // Only export logs that are in the active view's date set
    const activeLogs = activeDates
      .map(d => logs[d])
      .filter(Boolean);

    if (activeLogs.length === 0) {
      alert('No data available for the current view period.');
      return;
    }

    const sortedDates = [...activeDates].sort();
    const from = sortedDates[0];
    const to = sortedDates[sortedDates.length - 1];

    const reportLabel =
      viewMode === 'weekly' ? 'Last 7 Days' :
      viewMode === 'monthly' ? 'Last 30 Days' :
      `${from} to ${to}`;

    const html = generateDoctorReport(
      activeLogs,
      personalizationProfile,
      user?.displayName || 'Patient',
      { from, to, label: reportLabel }
    );

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, '_blank');
    if (!tab) alert('Please allow popups to open the report.');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  
  const handleExport = async () => {
    const logsToAnalyze = recentLogs.slice(0, 7);
    
    const avgQuality = Math.round(logsToAnalyze.reduce((acc, l) => acc + (l.sleep_quality || 0), 0) / logsToAnalyze.length);
    const avgRested = Math.round(logsToAnalyze.reduce((acc, l) => acc + (l.morning_alertness || 0), 0) / logsToAnalyze.length);
    const avgEnergy = Math.round(logsToAnalyze.reduce((acc, l) => acc + (l.daytime_energy || 0), 0) / logsToAnalyze.length);
    const avgSleep = formatDuration(logsToAnalyze.reduce((acc, l) => acc + calculateTotalSleepHours(l), 0) / logsToAnalyze.length);
    const avgEfficiency = Math.round(logsToAnalyze.reduce((acc, l) => acc + Number(calculateSleepEfficiency(l.sleepEvents || [])), 0) / logsToAnalyze.length);

    const header = `SIA SLEEP PATTERN OBSERVATION REPORT
Period: 7-DAY Observation (20:00 - 20:00)
Generated: ${new Date().toLocaleDateString()}

WEEKLY AVERAGES:
- Avg Quality: ${avgQuality}/10 | Avg Sleep: ${avgSleep} | Avg Efficiency: ${avgEfficiency}%

CIRCADIAN GRID:
${generateASCIIRibbonHeader()}
`;
    
    const dailyLines = logsToAnalyze.map(log => {
      const grid = getGridFromEvents(log.sleepEvents || []);
      const ribbon = generateASCIIRibbon(grid);
      const efficiency = Math.round(Number(calculateSleepEfficiency(log.sleepEvents || [])));
      const duration = formatDuration(calculateTotalSleepHours(log));
      const dateStr = format(parseISO(log.date), 'MMM dd').padEnd(8);
      return `${dateStr}|${ribbon}| ${efficiency}% | ${duration}`;
    }).join('\n');

    const footer = "\n\nDisclaimer: SIA provides observations based on your logged data. This is not medical advice. Consult a professional for clinical concerns.";

    const report = `${header}${dailyLines}${footer}`;

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy report to clipboard:', err);
      // Optionally show an error toast or alert here
    }
  };

  const buttonLabel =
    viewMode === 'weekly' ? 'Export 7-Day Report (PDF)' :
    viewMode === 'monthly' ? 'Export 30-Day Report (PDF)' :
    'Export Custom Range Report (PDF)';

  const isExportDisabled = viewMode === 'custom' && activeDates.length === 0;

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
      </div>

      <PrintableReport logs={recentLogs} />

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

        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-zinc-700"
          >
            {copied ? (
              <>
                <ClipboardCheck size={14} className="text-emerald-400" />
                Report Copied
              </>
            ) : (
              <>
                <Share2 size={14} />
                Copy text data to clipboard
              </>
            )}
          </button>
          
          {(!userProfile || userProfile.tier === 'Basic') ? (
            <div className="relative">
              <div className="opacity-30 grayscale blur-sm">
                <button
                  className="w-full py-3 bg-zinc-800 border border-indigo-500/20 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                >
                  <Sparkles size={12} />
                  PDF Export — Enhanced+
                </button>
              </div>
              <LockedFeatureOverlay 
                title="Doctor PDF Export"
                description="Unlock clinical-grade PDF reports with Enhanced or PRO tiers."
                onUpgrade={() => onViewChange('account')}
              />
            </div>
          ) : (
            <button 
              onClick={handleExportReport}
              disabled={isExportDisabled}
              title={isExportDisabled ? 'Select a date range first' : ''}
              className={`flex-1 py-3 ${isExportDisabled ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'} rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border ${isExportDisabled ? 'border-zinc-700' : 'border-indigo-500'}`}
            >
              <FileText size={14} />
              {buttonLabel}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SleepPatternCard;
