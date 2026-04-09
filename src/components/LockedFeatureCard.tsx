import { Brain, ArrowRight } from 'lucide-react';
import { Card } from './UI';

interface LockedFeatureCardProps {
  title: string;
  description: string;
  onUpgrade: () => void;
  icon?: React.ReactNode;
}

export const LockedFeatureCard: React.FC<LockedFeatureCardProps> = ({ title, description, onUpgrade, icon = <Brain size={20} /> }) => {
  return (
    <Card className="bg-zinc-950 border-zinc-800/50 relative overflow-hidden p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 border border-zinc-700">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest">{title}</h3>
          <p className="text-[10px] text-zinc-700 font-bold">{description}</p>
        </div>
      </div>
      <div className="space-y-2 mb-5 opacity-40 pointer-events-none select-none">
        <div className="h-10 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center px-4 gap-3">
          <div className="w-2 h-2 rounded-full bg-zinc-700" />
          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Feature locked</span>
        </div>
      </div>
      <button
        onClick={onUpgrade}
        className="w-full py-2.5 bg-zinc-900 border border-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2"
      >
        <ArrowRight size={12} />
        Unlock with Enhanced or Pro
      </button>
    </Card>
  );
};
