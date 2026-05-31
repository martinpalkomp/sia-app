import React from 'react';

interface MetricSummaryCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  unit?: string;
  delta?: { value: number; label: string };
  color: string;
}

export const MetricSummaryCard: React.FC<MetricSummaryCardProps> = ({
  icon, title, value, unit, delta, color
}) => {
  return (
    <div className="border border-zinc-800/60 bg-[#0B0F17] rounded-2xl relative shadow-sm group hover:border-indigo-500/30 transition-all duration-300 overflow-hidden p-5 flex flex-col space-y-3 min-h-[15svh]">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
      
      <div className="relative z-10 flex items-center gap-2">
        <div className={`p-2 rounded-xl bg-zinc-800/50 ${color}`}>
            {React.cloneElement(icon as React.ReactElement, { size: 16 } as any)}
        </div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{title}</h4>
      </div>
      
      <div className="relative z-10 flex items-baseline gap-1">
        <span className="text-3xl font-black text-slate-400 tracking-tighter">{value}</span>
        {unit && <span className="text-xl font-bold text-zinc-500">{unit}</span>}
      </div>
      
      {delta && (
        <div className={`relative z-10 text-[10px] font-bold ${delta.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {delta.value >= 0 ? '↑' : '↓'} {Math.abs(delta.value)} <span className="opacity-60">{delta.label}</span>
        </div>
      )}
    </div>
  );
};
