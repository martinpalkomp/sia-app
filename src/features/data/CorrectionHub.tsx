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
  Zap,
  Loader2
} from 'lucide-react';
import { getPendingCorrections } from '../../utils/correctionLogic';
import { DailyLog } from '../../types';
import { saveLog } from '../../services/sleepService';
import { format, isAfter, parseISO, startOfDay } from 'date-fns';
import { User } from '../../lib/firebase';

interface CorrectionHubProps {
  user: User;
  logs: Record<string, DailyLog>;
  onUpdate: () => void;
  onGoToLog: (date: string) => void;
}

const CorrectionHub: React.FC<CorrectionHubProps> = ({ user, logs, onUpdate, onGoToLog }) => {
  const [trackingStartDate, setTrackingStartDate] = useState<string>(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );

  const incompleteLogs = useMemo(() => {
    return getPendingCorrections(logs, trackingStartDate);
  }, [logs, trackingStartDate]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/50 p-6 rounded-3xl shadow-sm border border-zinc-800/50">
        <div>
          <h2 className="text-xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-3 leading-[0.95]">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            Correction Hub
          </h2>
          <p className="text-zinc-500 text-[9px] mt-2 font-black uppercase tracking-widest">
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
              className="flex flex-col items-center justify-center py-16 bg-zinc-900/30 rounded-3xl border-2 border-dashed border-zinc-800/50"
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
                className="group bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all shadow-xl flex items-center justify-between gap-4"
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
                      {(!log.summaryMetrics || 
                        typeof log.summaryMetrics.sleep_quality !== 'number' ||
                        typeof log.summaryMetrics.morning_alertness !== 'number' ||
                        typeof log.summaryMetrics.daytime_energy !== 'number') && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.15em] text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                          Missing Metrics
                        </span>
                      )}
                      {(!log.sleepEvents || log.sleepEvents.length === 0) && (!log.timeline || log.timeline.every(s => s === 'awake-out')) && (
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
                    onClick={() => onGoToLog(log.date)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    Go to Log
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CorrectionHub;
