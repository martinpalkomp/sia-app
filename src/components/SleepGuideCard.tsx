import React from 'react';
import { Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from './UI';

interface SleepGuideCardProps {
  onClick: () => void;
  gadgetSummary?: string[];
}

export default function SleepGuideCard({ onClick, gadgetSummary }: SleepGuideCardProps) {
  return (
    <Card 
      onClick={onClick}
      className="relative overflow-hidden group cursor-pointer border-none bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-900/40 p-0"
    >
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
        <BookOpen size={120} className="text-indigo-400 rotate-12" />
      </div>
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 group-hover:scale-110 transition-transform">
            <Sparkles size={32} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">SIA Learning Hub</span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">The SIA Guide to Better Sleep</h3>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-md">
              Unlock peak performance and mood by mastering the science of rest. Learn the laws that govern your recovery.
            </p>
          </div>
        </div>

        <button 
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl flex items-center justify-center gap-3"
        >
          Start Reading <ArrowRight size={18} />
        </button>
      </div>
    </Card>
  );
}
