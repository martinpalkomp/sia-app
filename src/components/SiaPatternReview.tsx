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

export const SiaPatternReview: React.FC<SiaPatternReviewProps> = ({ isOpen, onClose, onConfirm, suggestion }) => {
  const sleepWindow = suggestion.suggestion.sleepEvents?.[0] 
    ? `${suggestion.suggestion.sleepEvents[0].start} - ${suggestion.suggestion.sleepEvents[0].end}`
    : 'Not available';
  
  const tools = suggestion.suggestion.factors?.sleepGadgets?.map(g => g.type).join(', ') || 'None';
  
  const dailyFactors = [
    suggestion.suggestion.factors?.stressLevel ? `Stress: ${suggestion.suggestion.factors.stressLevel}/5` : null,
    suggestion.suggestion.factors?.caffeine?.consumed ? 'Caffeine' : null,
    suggestion.suggestion.factors?.alcohol?.consumed ? 'Alcohol' : null,
  ].filter(Boolean).join(', ') || 'None';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-white uppercase tracking-widest">Review SIA Routine</h2>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 mb-8">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Sleep Window</p>
                <div className="flex justify-between items-center bg-zinc-800/50 p-4 rounded-xl">
                  <span className="text-sm font-mono text-white">{sleepWindow}</span>
                  <span className="text-[10px] font-black text-indigo-400">{Math.round((suggestion.confidenceMap['sleepEvents'] || 0) * 100)}% Confidence</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Tools</p>
                <div className="flex justify-between items-center bg-zinc-800/50 p-4 rounded-xl">
                  <span className="text-sm text-white">{tools}</span>
                  <span className="text-[10px] font-black text-emerald-400">{Math.round((suggestion.confidenceMap['factors.sleepGadgets'] || 0) * 100)}% Confidence</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Daily Factors</p>
                <div className="flex justify-between items-center bg-zinc-800/50 p-4 rounded-xl">
                  <span className="text-sm text-white">{dailyFactors}</span>
                  <span className="text-[10px] font-black text-amber-400">{Math.round((suggestion.confidenceMap['factors.stressLevel'] || 0) * 100)}% Confidence</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all font-bold text-sm flex items-center justify-center gap-2"
              >
                <Check size={16} />
                Confirm & Auto-Fill
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
