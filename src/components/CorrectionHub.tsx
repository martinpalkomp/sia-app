import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertCircle, 
  CheckCircle2, 
  EyeOff, 
  Calendar, 
  ChevronRight, 
  X,
  Save,
  Clock,
  Activity,
  Moon,
  Zap
} from 'lucide-react';
import { DailyLog } from '../types';
import { saveLog } from '../services/sleepService';
import { User } from 'firebase/auth';
import { format, isAfter, parseISO, startOfDay } from 'date-fns';

interface CorrectionHubProps {
  user: User;
  logs: Record<string, DailyLog>;
  onUpdate: () => void;
}

const CorrectionHub: React.FC<CorrectionHubProps> = ({ user, logs, onUpdate }) => {
  const [trackingStartDate, setTrackingStartDate] = useState<string>(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [selectedLogDate, setSelectedLogDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal form state
  const [formData, setFormData] = useState({
    sleepQuality: 5,
    restedness: 5,
    energyLevel: 5,
    importedDuration: 0,
    importedInBed: 0,
    remarks: ''
  });

  const incompleteLogs = useMemo(() => {
    const start = startOfDay(parseISO(trackingStartDate));
    
    return (Object.values(logs) as DailyLog[])
      .filter((log: DailyLog) => {
        const logDate = parseISO(log.date);
        const isAfterStart = isAfter(logDate, start) || log.date === trackingStartDate;
        const isNotIgnored = !log.isIgnored;
        
        // Criteria: Missing timeline OR missing summaryMetrics
        // We consider timeline "missing" if it's empty or all 'awake-out' (default state)
        const hasTimeline = log.timeline && log.timeline.length > 0 && !log.timeline.every(s => s === 'awake-out');
        const hasSummaryMetrics = !!log.summaryMetrics;
        
        return isAfterStart && isNotIgnored && (!hasTimeline || !hasSummaryMetrics);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, trackingStartDate]);

  const handleOpenQuickEntry = (log: DailyLog) => {
    setSelectedLogDate(log.date);
    setFormData({
      sleepQuality: log.summaryMetrics?.sleepQuality ?? log.sleepQuality ?? 5,
      restedness: log.summaryMetrics?.restedness ?? log.restedness ?? 5,
      energyLevel: log.summaryMetrics?.energyLevel ?? log.energyLevel ?? 5,
      importedDuration: log.summaryMetrics?.importedDuration ?? 0,
      importedInBed: log.summaryMetrics?.importedInBed ?? 0,
      remarks: log.remarks ?? ''
    });
    setIsModalOpen(true);
  };

  const handleIgnore = async (date: string) => {
    try {
      await saveLog(user.uid, {
        date,
        isIgnored: true,
        type: 'log'
      });
      onUpdate();
    } catch (error) {
      console.error("Failed to ignore log:", error);
    }
  };

  const handleSaveQuickEntry = async () => {
    if (!selectedLogDate) return;

    try {
      await saveLog(user.uid, {
        date: selectedLogDate,
        type: 'log',
        remarks: formData.remarks,
        summaryMetrics: {
          sleepQuality: formData.sleepQuality,
          restedness: formData.restedness,
          energyLevel: formData.energyLevel,
          importedDuration: formData.importedDuration,
          importedInBed: formData.importedInBed
        },
        // Also update top-level metrics for backward compatibility/UI
        sleepQuality: formData.sleepQuality,
        restedness: formData.restedness,
        energyLevel: formData.energyLevel
      });
      
      setIsModalOpen(false);
      onUpdate();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save log");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/50 p-6 rounded-[2.5rem] shadow-sm border border-zinc-800/50">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            Correction Hub
          </h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">
            Review and complete missing clinical data points.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-zinc-900/80 p-2 rounded-2xl border border-zinc-800">
          <Calendar className="w-4 h-4 text-zinc-500 ml-2" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tracking Start:</span>
          <input 
            type="date" 
            value={trackingStartDate}
            onChange={(e) => setTrackingStartDate(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {incompleteLogs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 bg-zinc-900/30 rounded-[2.5rem] border-2 border-dashed border-zinc-800/50"
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-white font-bold text-lg">All caught up!</p>
              <p className="text-zinc-500 text-sm mt-1">No incomplete days found in the selected range.</p>
            </motion.div>
          ) : (
            incompleteLogs.map((log) => (
              <motion.div
                key={log.date}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800/50 hover:border-zinc-700/50 transition-all shadow-xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex flex-col items-center justify-center border border-zinc-700 shadow-inner">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter leading-none">
                      {format(parseISO(log.date), 'MMM')}
                    </span>
                    <span className="text-xl font-black text-white leading-none mt-1">
                      {format(parseISO(log.date), 'dd')}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg text-white tracking-tight">
                      {format(parseISO(log.date), 'EEEE, MMMM do')}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      {!log.summaryMetrics && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.15em] text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                          Missing Metrics
                        </span>
                      )}
                      {(!log.timeline || log.timeline.every(s => s === 'awake-out')) && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.15em] text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-lg border border-indigo-400/20">
                          Missing Timeline
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleIgnore(log.date)}
                    className="p-3 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                    title="Ignore this date"
                  >
                    <EyeOff className="w-4 h-4" />
                    <span className="hidden sm:inline">Ignore</span>
                  </button>
                  <button
                    onClick={() => handleOpenQuickEntry(log)}
                    className="bg-white text-black px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center gap-2 shadow-lg shadow-white/5"
                  >
                    Quick Entry
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Quick Entry Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-800"
            >
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Quick Entry</h3>
                  <p className="text-zinc-500 text-sm font-medium mt-1">
                    {selectedLogDate && format(parseISO(selectedLogDate), 'MMMM do, yyyy')}
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 hover:bg-zinc-800 rounded-2xl transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-500" />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Clinical Metrics */}
                <div className="space-y-5">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="w-3 h-3" />
                    Clinical Metrics (1-10)
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: 'Sleep Quality', key: 'sleepQuality', icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                      { label: 'Restedness', key: 'restedness', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                      { label: 'Energy Level', key: 'energyLevel', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' }
                    ].map((metric) => (
                      <div key={metric.key} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-2xl ${metric.bg} border border-white/5`}>
                            <metric.icon className={`w-5 h-5 ${metric.color}`} />
                          </div>
                          <span className="font-bold text-zinc-200">{metric.label}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={(formData as any)[metric.key]}
                            onChange={(e) => setFormData({ ...formData, [metric.key]: parseInt(e.target.value) })}
                            className="w-24 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                          />
                          <span className="w-8 text-center font-black text-white text-lg">
                            {(formData as any)[metric.key]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Durations */}
                <div className="space-y-5">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Imported Durations (Hours)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Total Sleep</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.importedDuration}
                        onChange={(e) => setFormData({ ...formData, importedDuration: parseFloat(e.target.value) || 0 })}
                        className="w-full px-5 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl text-white focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Time in Bed</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.importedInBed}
                        onChange={(e) => setFormData({ ...formData, importedInBed: parseFloat(e.target.value) || 0 })}
                        className="w-full px-5 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl text-white focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Remarks</h4>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Any clinical notes for this day..."
                    className="w-full h-32 px-5 py-4 bg-zinc-800 border border-zinc-700 rounded-3xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-sm font-medium"
                  />
                </div>
              </div>

              <div className="p-8 bg-zinc-900/80 border-t border-zinc-800 flex gap-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-700 transition-all border border-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuickEntry}
                  className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20"
                >
                  <Save className="w-4 h-4" />
                  Save Entry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CorrectionHub;
