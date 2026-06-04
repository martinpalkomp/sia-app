import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Rocket, ShieldCheck, X } from 'lucide-react';
import { tierDetails } from '../../data/tierData';

interface TierDetailsModalProps {
  selectedTier: 'Basic' | 'Enhanced' | 'Pro' | null;
  onClose: () => void;
}

export default function TierDetailsModal({ selectedTier, onClose }: TierDetailsModalProps) {
  return (
    <AnimatePresence>
      {selectedTier && tierDetails[selectedTier] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-[#0B0F17] border border-zinc-800/60 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-zinc-800/60 flex items-center justify-between shrink-0 bg-zinc-900/20">
              <div className="flex items-center gap-3">
                {selectedTier === 'Basic' && <Shield className="text-zinc-400" size={24} />}
                {selectedTier === 'Enhanced' && <Sparkles className="text-indigo-400" size={24} />}
                {selectedTier === 'Pro' && <Rocket className="text-emerald-400" size={24} />}
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">{selectedTier} Tier</h3>
                  <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">{tierDetails[selectedTier].tagline}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto">
              <div className="text-center mb-4">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500/80 mb-2">System Architecture</h4>
                <p className="text-2xl font-black text-white tracking-tighter">{tierDetails[selectedTier].title}</p>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 mb-8">
                <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                  <span className="text-indigo-400 font-bold mr-2 uppercase tracking-wide text-xs">System Focus:</span>
                  {tierDetails[selectedTier].systemFocus}
                </p>
              </div>

              <div className="space-y-8">
                {tierDetails[selectedTier].sections.map((section, idx) => (
                  <div key={idx} className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800/60 pb-2">{section.header}</h5>
                    <ul className="space-y-5">
                      {section.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start gap-3">
                          <ShieldCheck size={18} className="text-indigo-500/70 mt-0.5 shrink-0" />
                          <div className="space-y-1">
                            <h6 className="text-sm font-bold text-white tracking-wide">{item.name}</h6>
                            <p className="text-sm text-zinc-400 leading-snug">{item.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-zinc-800/60 bg-zinc-900/50 shrink-0">
              <button 
                onClick={onClose}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
              >
                Close Specification
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
