import React from 'react';
import { motion } from 'motion/react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <motion.div
      whileHover={onClick ? { scale: 1.01 } : undefined}
      onClick={onClick}
      className={`clinical-card ${onClick ? 'cursor-pointer hover:border-white/20' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
};

interface AvatarFrameProps {
  src?: string;
  alt?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AvatarFrame: React.FC<AvatarFrameProps> = ({ src, alt = 'Avatar', className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  return (
    <div className={`avatar-frame ${sizeClasses[size]} ${className}`}>
      {src ? (
        <img 
          src={src} 
          alt={alt} 
          referrerPolicy="no-referrer" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500 font-bold">
          {alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
};

interface MetricDisplayProps {
  title: string;
  value: string | number;
  unit?: string;
  className?: string;
}

export const MetricDisplay: React.FC<MetricDisplayProps> = ({ title, value, unit, className = '' }) => {
  const isMissing = value === '--' || value === undefined || value === null;
  const [showTooltip, setShowTooltip] = React.useState(false);
  
  return (
    <div className={className}>
      <div className="flex items-center gap-1 relative">
        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-clinical-text-muted mb-1">{title}</p>
        <div 
          className="w-3 h-3 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 cursor-help transition-opacity hover:text-white"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
        >
          <span className="text-[8px]">i</span>
        </div>
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-[10px] text-zinc-300 z-50">
            {title === 'Avg Quality' && "Composite score of sleep depth, cycles, and physical restoration."}
            {title === 'Restedness' && "Subjective recovery level and mental readiness upon waking."}
            {title === 'Energy Level' && "Sustained vitality and cognitive alertness throughout the day."}
            {title === 'Avg Sleep Duration' && "Total time spent in actual sleep states, excluding wakeful periods."}
            {title === 'Avg Efficiency' && "Percentage of time spent asleep relative to total time in bed."}
          </div>
        )}
      </div>
      <div className="flex items-center h-10">
        {isMissing ? (
          <div className="h-8 w-20 rounded-lg animate-sia-pulse" />
        ) : (
          <div className="flex items-baseline">
            <span className="text-2xl md:text-3xl font-black text-clinical-text tracking-tighter leading-none">{value}</span>
            {unit && <span className="metric-unit">{unit}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export const CircadianWaveform: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg 
      viewBox="0 0 100 20" 
      className={`w-full h-auto opacity-20 ${className}`}
      preserveAspectRatio="none"
    >
      <path 
        d="M0 10 Q 12.5 0, 25 10 T 50 10 T 75 10 T 100 10" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1"
        className="animate-[dash_10s_linear_infinite]"
      />
    </svg>
  );
};
