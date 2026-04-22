import React from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';

interface MetricSparklineCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  delta: number; 
  deltaLabel: string;
  data: number[];
  unit?: string;
  color: string; 
}

export const MetricSparklineCard: React.FC<MetricSparklineCardProps> = ({ 
  icon, title, value, delta, deltaLabel, data, unit, color 
}) => {
  const isPositive = delta >= 0;
  
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col items-center text-center space-y-3">
      <div className={`p-3 rounded-2xl bg-zinc-800/50 ${color}`}>
        {icon}
      </div>
      
      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{title}</h4>
      
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black text-white tracking-tighter">{value}</span>
        {unit && <span className="text-xl font-bold text-zinc-500">{unit}</span>}
      </div>
      
      <div className={`text-[10px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(delta)} <span className="opacity-60">{deltaLabel}</span>
      </div>

      <div className="h-12 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.map((v, i) => ({ val: v, index: i }))}>
            <YAxis domain={['auto', 'auto']} hide />
            <Line 
              type="monotone" 
              dataKey="val" 
              stroke={`var(--${color.replace('text-', '')})`}
              strokeWidth={2} 
              dot={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
