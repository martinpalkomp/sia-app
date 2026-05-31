import React from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

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

const COLOR_MAP: Record<string, string> = {
  'text-indigo-400': '#818cf8',
  'text-amber-400': '#fbbf24',
  'text-emerald-400': '#34d399',
  'text-sky-400': '#38bdf8',
  'text-violet-400': '#a78bfa',
  'text-purple-400': '#c084fc',
};

export const MetricSparklineCard: React.FC<MetricSparklineCardProps> = ({ 
  icon, title, value, delta, deltaLabel, data, unit, color 
}) => {
  const isPositive = delta >= 0;
  const strokeColor = COLOR_MAP[color] || `var(--color-${color.replace('text-', '')})`;
  const gradientId = `gradient-${title.replace(/\s+/g, '-')}`;
  
  return (
    <div className="border border-zinc-800/60 bg-[#0B0F17] rounded-2xl relative shadow-sm group hover:border-indigo-500/30 transition-all duration-300 overflow-hidden p-5 flex flex-col items-center text-center space-y-3 min-h-[15svh]">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
      
      <div className={`relative z-10 p-3 rounded-2xl bg-zinc-800/50 ${color}`}>
        {icon}
      </div>
      
      <h4 className="relative z-10 text-[10px] font-black uppercase tracking-widest text-zinc-500">{title}</h4>
      
      <div className="relative z-10 flex items-baseline gap-1">
        <span className="text-3xl font-black text-slate-400 tracking-tighter">{value}</span>
        {unit && <span className="text-xl font-bold text-zinc-500">{unit}</span>}
      </div>
      
      <div className={`relative z-10 text-[10px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(delta)} <span className="opacity-60">{deltaLabel}</span>
      </div>

      <div className="relative z-10 h-16 w-full mt-2 -mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.map((v, i) => ({ val: v, index: i }))}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
            <Area 
              type="monotone" 
              dataKey="val" 
              stroke={strokeColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              dot={{ r: 2.5, fill: strokeColor, strokeWidth: 0, stroke: strokeColor }} 
              activeDot={{ r: 4, fill: '#fff', stroke: strokeColor, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
