import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Clock, Moon } from 'lucide-react';
import { DailyLog } from '../../types';
import { SleepGateData, CircadianZone } from '../../utils/sleepGateEngine';

interface SleepGateHeroProps {
  logs: Record<string, DailyLog>;
  userName?: string;
  className?: string;
  greeting?: { prefix: string; suffix: string; showLogLink?: boolean; onLogClick?: () => void; };
  data: SleepGateData | null;
  showFactors: boolean;
  onToggleFactors: () => void;
}

const timeToAngle = (hours: number, minutes: number) => {
  const hNorm = hours >= 12 ? hours - 24 : hours;
  return (hNorm + minutes / 60) * 15;
};

const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
  const rad = (angle - 90) * Math.PI / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
};

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  // Handle cases where startAngle and endAngle are very close or same
  if (Math.abs(endAngle - startAngle) < 0.1) return '';
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

interface SleepGateArcProps { data: SleepGateData; }

const SleepGateArc: React.FC<SleepGateArcProps> = ({ data }) => {
  const cx = 150, cy = 140, r = 130;
  const [hoveredZone, setHoveredZone] = useState<CircadianZone | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [currentAngle, setCurrentAngle] = useState(-90);

  useEffect(() => {
    const update = () => { const n = new Date(); setCurrentAngle(timeToAngle(n.getHours(), n.getMinutes())); };
    update(); const iv = setInterval(update, 60000); return () => clearInterval(iv);
  }, []);

  const gateAngle = timeToAngle(data.gateH, data.gateM);
  const confStartAngle = timeToAngle(data.gateH, Math.max(0, data.gateM - data.confidenceMinutes));
  const confEndAngle = timeToAngle(data.gateH, Math.min(59, data.gateM + data.confidenceMinutes));
  const currentPos = polarToCartesian(cx, cy, r, currentAngle);
  const gatePos = polarToCartesian(cx, cy, r, gateAngle);
  const aBaseStart = -90, aBaseEnd = 90;

  return (
    <div className="relative w-full max-w-[360px] mx-auto aspect-[2/1.3] flex flex-col justify-end">
      {/* Layer 8: Hover tooltip */}
      {hoveredZone && (
        <div className="absolute z-30 bg-zinc-900/95 border border-zinc-700 rounded-xl p-3 max-w-[180px] text-left pointer-events-none"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -110%)' }}>
          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">{hoveredZone.label}</p>
          <p className="text-[10px] text-zinc-300 leading-snug">{hoveredZone.description}</p>
        </div>
      )}

      <svg viewBox="0 0 300 160" className="w-full h-full overflow-visible absolute top-0 left-0">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow-strong"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        {/* Layer 1: Base dashed arc */}
        <path d={describeArc(cx, cy, r, aBaseStart, aBaseEnd)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 6"/>

        {/* Layer 2: Circadian zone arcs */}
        {data.zones.map(zone => {
          let sa = timeToAngle(zone.startH, zone.startM);
          let ea = timeToAngle(zone.endH, zone.endM);
          
          if (ea - sa < 0.5) return null;
          
          // Gap for round caps to prevent overlapping
          sa += 1.5;
          ea -= 1.5;
          
          if (ea <= sa) return null; // segment too small

          const midAngle = (sa + ea) / 2;
          const midPos = polarToCartesian(cx, cy, r, midAngle);
          return (
            <g key={zone.id}
              onMouseEnter={e => { setHoveredZone(zone); setTooltipPos({ x: midPos.x, y: midPos.y }); }}
              onMouseLeave={() => setHoveredZone(null)}
              className="cursor-pointer">
              <motion.path initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
                d={describeArc(cx, cy, r, sa, ea)} fill="none"
                stroke={zone.color} strokeWidth="8"
                strokeLinecap="round" filter="url(#glow)"/>
              {/* Invisible wider hit area */}
              <path d={describeArc(cx, cy, r, sa, ea)} fill="none" stroke="transparent" strokeWidth="20" strokeLinecap="round"/>
            </g>
          );
        })}

        {/* Layer 1: Current time dot */}
        {currentAngle >= aBaseStart && currentAngle <= aBaseEnd && (
          <circle cx={currentPos.x} cy={currentPos.y} r="3" fill="rgba(255,255,255,0.6)"/>
        )}

        {/* Layer 5: Chronotype label on arc */}
        {/* Chronotype Label attached to gate */}
        <text 
          x={polarToCartesian(cx, cy, r + 18, gateAngle).x} 
          y={polarToCartesian(cx, cy, r + 18, gateAngle).y} 
          textAnchor="middle" alignmentBaseline="middle" fill="rgba(129,140,248,0.7)" fontSize="7" fontWeight="700" letterSpacing="1">
          {data.chronotypeLabel.toUpperCase()}
        </text>

        {/* Layer 6: Gate node with pulse */}
        <motion.g initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.8 }}>
          <motion.circle cx={gatePos.x} cy={gatePos.y} r="10" fill="rgba(167,139,250,0.15)"
            animate={{ r: [10, 15, 10] }} transition={{ duration: 2, repeat: Infinity }}/>
          <circle cx={gatePos.x} cy={gatePos.y} r="5" fill="rgba(167,139,250,0.9)" filter="url(#glow-strong)"/>
          <circle cx={gatePos.x} cy={gatePos.y} r="2.5" fill="white"/>
        </motion.g>
      </svg>

      {/* Gate time text */}
      <div className="flex flex-col items-center justify-end pb-2 z-10 w-full" onClick={undefined}>
        <motion.span initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="text-[10px] uppercase font-black tracking-[0.2em] text-indigo-300">Sleep Gate</motion.span>
        <motion.span initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.0 }}
          className="text-5xl font-black tracking-tighter text-white drop-shadow-xl mt-1">
          {String(data.gateH).padStart(2,'0')}:{String(data.gateM).padStart(2,'0')}
        </motion.span>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="text-[11px] text-zinc-400 mt-1 font-bold">± {data.confidenceMinutes} min</motion.span>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
          className="text-[10px] text-indigo-400/70 mt-2 font-bold flex items-center gap-1">
          <span className="text-[8px]">⏱</span> {data.statusText}
        </motion.span>
      </div>
    </div>
  );
};

export const SleepGateHero: React.FC<SleepGateHeroProps> = ({ logs, userName, className, greeting, data, showFactors, onToggleFactors }) => {
  const displayGreeting = greeting ? `${greeting.prefix}${userName ? `, ${userName.split(' ')[0]}` : ''}.` : (userName ? `Evening, ${userName}` : 'Good Evening');

  const getBackgroundImage = () => {
    return "https://raw.githubusercontent.com/martinpalkomp/sia-app/refs/heads/main/sia_all_dark.jpg";
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative w-full min-h-[600px] overflow-hidden p-6 lg:p-10 text-white flex flex-col z-10 rounded-3xl ${className || ''}`}
      id="db-sleep-gate"
    >
      <img
        src={getBackgroundImage()}
        alt="Atmospheric landscape"
        className="absolute inset-0 w-full h-full object-cover -z-10"
      />
      
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-zinc-950/80" />

      {/* Top Bar: Avatar and Badge */}
      <div className="relative z-20 flex items-center gap-3 mb-8">
        <img 
          id="sia-avatar"
          src="https://i.imgur.com/MnI5hn3.png" 
          alt="SIA Avatar" 
          className="w-12 h-12 rounded-full border border-zinc-700 shadow-lg"
        />
        <span id="intel-badge" className="bg-indigo-600/30 border border-indigo-500/30 text-[10px] px-3 py-1.5 rounded-full uppercase tracking-widest font-black text-indigo-300 shrink-0">
          Sleep Intelligence Agent
        </span>
      </div>

      <div className="relative z-20 grid md:grid-cols-2 gap-8 items-center w-full py-6 flex-1">
        <div className="order-2 md:order-1">
          <h2 id="greeting-h1" className="text-4xl lg:text-5xl font-black font-sans tracking-tighter mb-3 text-white">{displayGreeting}</h2>
          {greeting?.suffix ? (
            <p id="greeting-subtext" className="text-zinc-300 mb-8 font-medium text-lg leading-relaxed max-w-md">
              {greeting.suffix}
            </p>
          ) : (
            <p className="text-zinc-300 mb-8 font-medium text-lg leading-relaxed max-w-md">
              {data ? (
                <>Your optimal sleep gate tonight is <span className="text-indigo-300 font-black">{String(data.gateH).padStart(2,'0')}:{String(data.gateM).padStart(2,'0')}</span>.</>
              ) : (
                <>We need more data to project your Sleep Gate.</>
              )}
            </p>
          )}

          {greeting?.showLogLink && (
            <button
              id="nav-fab-log"
              onClick={greeting.onLogClick}
              className="mt-2 mb-8 w-full md:w-auto py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={14} /> Log Last Night
            </button>
          )}
          
          {/* Prediction Factors Panel — Layer 7 */}
          <AnimatePresence>
            {showFactors && data && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="mt-4 w-full max-w-md rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 backdrop-blur-sm">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-3">Why this prediction?</p>
                <div className="space-y-2">
                  {[
                    { icon: '🌙', label: 'Chronotype',       value: data.predictionFactors.chronotype },
                    { icon: '⚡', label: 'Sleep Debt',        value: data.predictionFactors.sleepDebt },
                    { icon: '⏰', label: 'Wake Consistency',  value: data.predictionFactors.wakeConsistency },
                    { icon: '📊', label: 'Sleep Logs',        value: data.predictionFactors.logsAnalyzed },
                    { icon: '✨', label: 'Evening Energy',    value: data.predictionFactors.eveningEnergy },
                    { icon: '◈',  label: 'Confidence',        value: data.predictionFactors.confidence },
                  ].map(f => (
                    <div key={f.label} className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-2">
                        <span>{f.icon}</span>{f.label}
                      </span>
                      <span className="text-[11px] font-black text-white">{f.value}</span>
                    </div>
                  ))}
                </div>
                {/* Confidence bar */}
                <div className="mt-3 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-indigo-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: data.confidenceLevel === 'high' ? '88%' : data.confidenceLevel === 'medium' ? '60%' : '32%' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}/>
                </div>
                <p className="text-[9px] text-zinc-600 mt-2 font-bold">
                  This prediction adapts as your patterns change. Check back daily for updates.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom metrics strip */}
          {data && (
            <div className="mt-4 grid grid-cols-3 gap-2 w-full max-w-md">
              {[
                { label: 'Sleep Pressure', value: data.sleepDebtLevel === 'high' ? 'High' : data.sleepDebtLevel === 'moderate' ? 'Moderate' : 'Low',
                  color: data.sleepDebtLevel === 'high' ? 'text-red-400' : data.sleepDebtLevel === 'moderate' ? 'text-amber-400' : 'text-emerald-400' },
                { label: 'Optimal Window', value: `${String(Math.max(0, data.gateH * 60 + data.gateM - data.confidenceMinutes) % 1440 / 60 | 0).padStart(2,'0')}:${String((data.gateM - data.confidenceMinutes + 60) % 60).padStart(2,'0')} – ${String(data.gateH).padStart(2,'0')}:${String(Math.min(59, data.gateM + data.confidenceMinutes)).padStart(2,'0')}`, color: 'text-white' },
                { label: 'Current Status', value: data.statusText.length > 22 ? data.statusText.substring(0, 22) + '…' : data.statusText, color: 'text-indigo-300' },
              ].map(m => (
                <div key={m.label} className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1 leading-tight h-6">{m.label}</p>
                  <p className={`text-[10px] font-black ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {!data && (
            <div className="flex gap-8">
              <div className="flex items-center gap-3 text-zinc-300">
                <Clock size={20} className="text-indigo-400" />
                <div className="font-black text-xs tracking-widest uppercase">
                  <p>22:30 – 23:15</p>
                  <p className="text-[10px] text-zinc-500">Wind-down window</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-zinc-300">
                <Moon size={20} className="text-indigo-400" />
                <div className="font-black text-xs tracking-widest uppercase">
                  <p>7h 30m</p>
                  <p className="text-[10px] text-zinc-500">Recommended</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="order-1 md:order-2 flex justify-center md:justify-end cursor-pointer" onClick={data ? onToggleFactors : undefined}>
          {data ? <SleepGateArc data={data} /> : (
            <div className="relative w-full max-w-[360px] mx-auto aspect-[2/1.3]">
              <div className="absolute inset-0 opacity-20 pointer-events-none blur-[4px] select-none scale-[0.98]">
                <SleepGateArc data={{
                  gateH: 22, gateM: 30, confidenceMinutes: 30, confidenceLevel: 'low',
                  chronotype: 'intermediate', chronotypeLabel: 'Awaiting Data',
                  sleepDebtHours: 0, sleepDebtLevel: 'low', wakeConsistency: 'weak',
                  logsAnalyzed: 0,
                  zones: [
                    { id: 'z1', label: 'Wind Down', startH: 21, startM: 0, endH: 22, endM: 0, description: '', color: 'rgba(56,189,248,0.5)', glowColor: '' },
                    { id: 'z2', label: 'Night', startH: 22, startM: 0, endH: 3, endM: 0, description: '', color: 'rgba(88,28,135,0.5)', glowColor: '' }
                  ],
                  predictionFactors: { chronotype: '-', sleepDebt: '-', wakeConsistency: '-', logsAnalyzed: '0', eveningEnergy: '-', confidence: '-' },
                  statusText: 'Calibrating Model...', minutesUntilGate: 0
                }} />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-[10%]">
                <div className="bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-5 px-6 flex flex-col items-center max-w-[240px] text-center shadow-2xl">
                  <span className="text-[10px] font-black tracking-widest text-indigo-400 mb-2.5 uppercase">Intelligence Locked</span>
                  <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                    SIA requires at least <strong className="text-white">1 sleep log</strong> to compute your biological circadian rhythm and project your <strong className="text-indigo-300">Sleep Gate</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
};
