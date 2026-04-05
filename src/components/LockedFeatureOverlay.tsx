import React from 'react';
import { Lock } from 'lucide-react';

interface LockedFeatureOverlayProps {
  title: string;
  description: string;
  onUpgrade: () => void;
}

export const LockedFeatureOverlay: React.FC<LockedFeatureOverlayProps> = ({ title, description, onUpgrade }) => {
  return (
    <div className="absolute inset-0 z-20 bg-zinc-950/60 backdrop-blur-md border border-indigo-500/20 flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 p-3 bg-zinc-900 rounded-full border border-indigo-500/20">
        <Lock className="text-indigo-400" size={32} />
      </div>
      <h3 className="text-lg font-mono font-black text-white uppercase tracking-widest mb-2">{title}</h3>
      <p className="text-zinc-400 text-xs font-mono mb-6 max-w-[200px]">{description}</p>
      <button 
        onClick={onUpgrade}
        className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-indigo-400 font-mono font-bold text-xs uppercase tracking-widest border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all"
      >
        [ UPGRADE TO UNLOCK ]
      </button>
    </div>
  );
};
