import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { SuggestionResult } from '../utils/patternEngine';

interface SiaPatternReviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  suggestion: SuggestionResult;
}

const ConfBadge = ({ value, color = 'indigo' }: { value: number; color?: string }) => {
  const pct = Math.round(value * 100);
  if (pct === 0) return <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">No data</span>;
  const cls = pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-indigo-400' : 'text-amber-400';
  return <span className={`text-[9px] font-black uppercase tracking-widest ${cls}`}>{pct}% conf</span>;
};

const FactorRow = ({ label, value, confidence }: { label: string; value: string | null; confidence: number }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-800/60 last:border-0">
      <div>
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">{label}</span>
        <span className="text-xs font-bold text-white">{value}</span>
      </div>
      <ConfBadge value={confidence} />
    </div>
  );
};

export const SiaPatternReview: React.FC<SiaPatternReviewProps> = ({ isOpen, onClose, onConfirm, suggestion }) => {
  const s = suggestion.suggestion;
  const cm = suggestion.confidenceMap;
  const f = s.factors;

  const sleepWindow = s.sleepEvents?.[0]
    ? `${s.sleepEvents[0].start} → ${s.sleepEvents[0].end}`
    : null;

  const gadgets = f?.sleepGadgets?.map(g => g.type.replace(/_/g, ' ')).join(', ') || null;

  const caffeineVal = f?.caffeine?.consumed
    ? `Yes — ${f.caffeine.amount || 0} cups, last at ${f.caffeine.lastIntake}`
    : cm['factors.caffeine'] > 0.3 ? 'No pattern detected' : null;

  const alcoholVal = f?.alcohol?.consumed
    ? `Yes — ${f.alcohol.drinks || 0} drinks, last at ${f.alcohol.lastIntake}`
    : cm['factors.alcohol'] > 0.3 ? 'No pattern detected' : null;

  const exerciseVal = f?.exercise?.completed
    ? `Yes${f.exercise.type ? ` — ${f.exercise.type}` : ''}${f.exercise.time ? ` at ${f.exercise.time}` : ''}`
    : cm['factors.exercise'] > 0.5 ? 'Typically rest day' : null;

  const screensVal = f?.screensInBed !== null && f?.screensInBed !== undefined
    ? (f.screensInBed ? 'Yes — screens used in bed' : 'No screens in bed')
    : null;

  const stressVal = f?.stressLevel != null
    ? `${f.stressLevel}/5`
    : null;

  const mealVal = f?.lastMealTime || null;

  const naturalWakeVal = f?.naturalWake !== null && f?.naturalWake !== undefined
    ? (f.naturalWake ? 'Yes — natural wake' : 'Alarm wake')
    : null;

  const moodVal = (s as any).moodScore != null
    ? `${(s as any).moodScore}/5`
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Review SIA Routine</h2>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">Based on your recent patterns</p>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">

              {/* Sleep Window */}
              {sleepWindow && (
                <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Sleep Window</p>
                  <div className="flex justify-between items-center bg-zinc-800/50 px-4 py-3 rounded-xl">
                    <span className="text-sm font-mono font-bold text-white">{sleepWindow}</span>
                    <ConfBadge value={cm['sleepEvents'] || 0} />
                  </div>
                </div>
              )}

              {/* Predicted Metrics */}
              <div>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Predicted Metrics</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Quality', key: 'sleep_quality', val: s.sleep_quality },
                    { label: 'Alertness', key: 'morning_alertness', val: s.morning_alertness },
                    { label: 'Energy', key: 'daytime_energy', val: s.daytime_energy },
                  ].map(({ label, key, val }) => (
                    <div key={key} className="bg-zinc-800/50 p-3 rounded-xl text-center">
                      <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">{label}</p>
                      <p className="text-base font-bold text-white mb-1">{val ?? 5}/10</p>
                      <ConfBadge value={cm[key] || 0} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Factors */}
              <div>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Daily Factors</p>
                <div className="bg-zinc-800/50 px-4 py-1 rounded-xl">
                  <FactorRow label="Caffeine" value={caffeineVal} confidence={cm['factors.caffeine'] || 0} />
                  <FactorRow label="Alcohol" value={alcoholVal} confidence={cm['factors.alcohol'] || 0} />
                  <FactorRow label="Exercise" value={exerciseVal} confidence={cm['factors.exercise'] || 0} />
                  <FactorRow label="Screens in bed" value={screensVal} confidence={cm['factors.screensInBed'] || 0} />
                  <FactorRow label="Stress level" value={stressVal} confidence={cm['factors.stressLevel'] || 0} />
                  <FactorRow label="Last meal" value={mealVal} confidence={cm['factors.lastMealTime'] || 0} />
                  <FactorRow label="Natural wake" value={naturalWakeVal} confidence={cm['factors.naturalWake'] || 0} />
                  <FactorRow label="Morning mood" value={moodVal} confidence={cm['factors.moodScore'] || 0} />
                </div>
              </div>

              {/* Sleep Tools */}
              {gadgets && (
                <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Sleep Support Tools</p>
                  <div className="flex justify-between items-center bg-zinc-800/50 px-4 py-3 rounded-xl">
                    <span className="text-xs text-white">{gadgets}</span>
                    <ConfBadge value={cm['factors.sleepGadgets'] || 0} />
                  </div>
                </div>
              )}

            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all font-bold text-xs uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Check size={14} />
                Apply Routine
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
