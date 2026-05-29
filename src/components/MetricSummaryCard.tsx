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
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col space-y-3 min-h-[15svh]">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-xl bg-zinc-800/50 ${color}`}>
            {React.cloneElement(icon as React.ReactElement, { size: 16 } as any)}
        </div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{title}</h4>
      </div>
      
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black text-slate-400 tracking-tighter">{value}</span>
        {unit && <span className="text-xl font-bold text-zinc-500">{unit}</span>}
      </div>
      
      {delta && (
        <div className={`text-[10px] font-bold ${delta.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {delta.value >= 0 ? '↑' : '↓'} {Math.abs(delta.value)} <span className="opacity-60">{delta.label}</span>
        </div>
      )}
    </div>
  );
};
