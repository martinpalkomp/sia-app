import React from 'react';
import { motion } from 'motion/react';
import { AvatarFrame } from './UI';
import { User } from '../lib/firebase';
import { UserTier } from '../types';

interface HeaderProps {
  user: User | null;
  greeting: { prefix: string; suffix: string };
  tier: UserTier;
}

export const Header: React.FC<HeaderProps> = ({ user, greeting, tier }) => {
  const tierColors = {
    Basic: 'bg-zinc-600',
    Enhanced: 'bg-indigo-500',
    Pro: 'bg-violet-500'
  };

  return (
    <section className="flex items-center gap-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <AvatarFrame 
          src="https://i.imgur.com/MnI5hn3.png" 
          alt="SIA Avatar" 
          size="md"
          className={`shadow-xl aspect-square object-cover rounded-full w-16 h-16 ${tier !== 'Basic' ? 'shadow-violet-500/20 border-violet-500/30' : 'shadow-indigo-500/10'}`}
        />
        <span className={`absolute -top-1 -right-1 ${tierColors[tier]} text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-widest font-bold text-white`}>{tier}</span>
      </motion.div>

      <div className="flex flex-col items-start space-y-0.5">
        <span className="bg-clinical-primary text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold text-white">Sleep Intelligence Agent</span>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold text-white whitespace-nowrap"
        >
          {greeting.prefix}{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
        </motion.h1>
        <p className="text-xs text-zinc-400 whitespace-nowrap">
          {greeting.suffix}
        </p>
      </div>
    </section>
  );
};
