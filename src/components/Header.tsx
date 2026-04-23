import React from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { AvatarFrame } from './UI';
import { User } from '../lib/firebase';
import { UserTier } from '../types';

interface HeaderProps {
  user: User | null;
  greeting: { prefix: string; suffix: string; showLogLink?: boolean; onLogClick?: () => void };
}

export const Header: React.FC<HeaderProps> = ({ user, greeting }) => {
  return (
    <section className="flex items-center gap-6">
      <div className="flex flex-col items-start space-y-0.5 min-w-0 flex-1">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl md:text-3xl font-bold text-zinc-50 tracking-tight"
        >
          {greeting.prefix}{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
        </motion.h1>
        <div className="text-sm text-zinc-300 leading-relaxed flex items-center gap-2">
          {greeting.suffix}
          {greeting.showLogLink && (
            <button 
              onClick={greeting.onLogClick}
              className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
            >
              <Plus size={12} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
