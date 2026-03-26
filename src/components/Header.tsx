import React from 'react';
import { motion } from 'motion/react';
import { AvatarFrame } from './UI';
import { User } from '../lib/firebase';
import { UserTier } from '../types';

interface HeaderProps {
  user: User | null;
  greeting: { prefix: string; suffix: string };
}

export const Header: React.FC<HeaderProps> = ({ user, greeting }) => {
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
          className="shadow-xl aspect-square object-cover rounded-full w-16 h-16 shadow-indigo-500/10 border-zinc-800/50"
        />
      </motion.div>

      <div className="flex flex-col items-start space-y-0.5 min-w-0">
        <span className="bg-clinical-primary text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold text-white shrink-0">Sleep Intelligence Agent</span>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl md:text-2xl font-bold text-white leading-tight"
        >
          {greeting.prefix}{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
        </motion.h1>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {greeting.suffix}
        </p>
      </div>
    </section>
  );
};
