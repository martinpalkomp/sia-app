import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

export const DevSwitchboardMini: React.FC<{ className?: string }> = ({ className = "fixed bottom-4 right-4 z-[9999]" }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!import.meta.env.DEV) return null;

  return (
    <div className={className}>
      <div className="bg-zinc-900 border border-amber-500 rounded-2xl shadow-2xl overflow-hidden">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-2 flex items-center justify-between bg-amber-950/20 text-amber-500 hover:bg-amber-950/40 transition-colors"
        >
          <span className="text-[9px] font-black uppercase tracking-widest">Dev Switchboard</span>
          {isOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
        
        {isOpen && (
          <div className="p-3 space-y-3 min-w-[200px]">
            <div>
              <p className="text-[8px] font-bold text-amber-400 uppercase tracking-widest mb-1">Tier</p>
              <div className="grid grid-cols-3 gap-1">
                {['Basic', 'Enhanced', 'Pro'].map(t => (
                  <button key={t} onClick={() => { const url = new URL(window.location.href); url.searchParams.set('dev_tier', t); window.location.href = url.toString(); }} className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[8px] font-bold text-white uppercase">{t}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[8px] font-bold text-amber-400 uppercase tracking-widest mb-1">Maturity</p>
              <div className="grid grid-cols-2 gap-1">
                {['Baseline', 'Trends', 'Deep', 'Advanced'].map(m => (
                  <button key={m} onClick={() => { const url = new URL(window.location.href); url.searchParams.set('dev_maturity', m); window.location.href = url.toString(); }} className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[8px] font-bold text-white uppercase">{m}</button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => { const url = new URL(window.location.href); url.searchParams.delete('dev_tier'); url.searchParams.delete('dev_maturity'); window.location.href = url.toString(); }}
              className="w-full p-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded text-[8px] font-bold uppercase tracking-widest flex items-center justify-center gap-1"
            >
              <RefreshCw size={8} /> Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
