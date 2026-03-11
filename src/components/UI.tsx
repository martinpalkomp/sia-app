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
  
  return (
    <div className={className}>
      <p className="metric-title">{title}</p>
      <div className="flex items-center h-10">
        {isMissing ? (
          <div className="h-8 w-20 rounded-lg animate-sia-pulse" />
        ) : (
          <div className="flex items-baseline">
            <span className="metric-value">{value}</span>
            {unit && <span className="metric-unit">{unit}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
