import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, LogOut, Sparkles } from 'lucide-react';
import { AvatarFrame } from './UI';
import { User } from '../lib/firebase';

interface NavbarProps {
  user: User | null;
  view: string;
  setView: (view: any) => void;
  handleLogout: () => void;
  derivedTier: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user, view, setView, handleLogout, derivedTier }) => {
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const navLinks = [
    { id: 'dashboard', label: 'DASHBOARD' },
    { id: 'log', label: 'LOG' },
    { id: 'insights', label: 'INSIGHTS' },
    { id: 'ai', label: 'AI ANALYSIS' }
  ];

  const getTierStyles = (styleType: 'avatar' | 'border' | 'active') => {
    switch (derivedTier) {
      case 'Pro':
        if (styleType === 'avatar') return 'shadow-[0_0_15px_rgba(139,92,246,0.3)] border-violet-500/50';
        if (styleType === 'border') return 'border-b-2 border-violet-500/50 shadow-[0_1px_10px_rgba(139,92,246,0.1)]';
        return 'bg-zinc-800 text-violet-400 shadow-sm';
      case 'Enhanced':
        if (styleType === 'avatar') return 'shadow-[0_0_10px_rgba(99,102,241,0.2)] border-indigo-500/40';
        if (styleType === 'border') return 'border-b border-indigo-500/40';
        return 'bg-zinc-800 text-indigo-400 shadow-sm';
      default:
        if (styleType === 'avatar') return 'shadow-none border-white/10';
        if (styleType === 'border') return 'border-b border-white/5';
        return 'bg-zinc-800 text-zinc-400 shadow-sm';
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-clinical-bg/70 ${getTierStyles('border')}`}>
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo Group (Desktop) */}
        <button onClick={() => setView('dashboard')} className="hidden md:flex items-center gap-3 hover:opacity-80 transition-opacity">
          <AvatarFrame 
            src="https://i.imgur.com/MnI5hn3.png" 
            alt="SIA" 
            size="sm"
            className={`w-10 h-10 border-2 bg-indigo-600 ${getTierStyles('avatar')}`}
          />
          <h1 className="text-xl font-black tracking-tighter text-white flex flex-col items-start gap-0">
            <div className="flex items-center gap-2">
              SIA
              {derivedTier && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${
                  derivedTier === 'Pro' ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' :
                  derivedTier === 'Enhanced' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                  'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                }`}>
                  {derivedTier}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold text-zinc-400 tracking-widest uppercase mt-0.5">Sleep Intelligence Agent</span>
          </h1>
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((v) => (
            <button 
              key={v.id}
              onClick={() => setView(v.id === 'insights' ? 'weekly' : v.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest flex items-center gap-1.5 ${
                view === v.id || (v.id === 'insights' && ['weekly', 'monthly', 'custom'].includes(view))
                  ? getTierStyles('active') 
                  : 'text-zinc-500 hover:text-zinc-300'
              } ${v.id === 'ai' ? 'border border-indigo-500/30 bg-indigo-500/5 text-indigo-300' : ''}`}
            >
              {v.id === 'ai' && <Sparkles size={12} />}
              {v.label}
            </button>
          ))}
          <button 
            onClick={() => setView('account')}
            className={`p-0.5 rounded-full transition-all border-2 ${view === 'account' ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-transparent hover:border-zinc-700'}`}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">{user?.displayName?.charAt(0) || 'U'}</div>
            )}
          </button>
          <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-white" title="Logout"><LogOut size={18} /></button>
        </div>

        {/* Mobile Logo + Hamburger (on right) */}
        <div className="flex md:hidden items-center gap-3 ml-auto">

          <button onClick={() => setView('dashboard')} className="hover:opacity-80 transition-opacity">
            <AvatarFrame 
              src="https://i.imgur.com/MnI5hn3.png" 
              alt="SIA" 
              size="sm"
              className={`w-8 h-8 border-2 bg-indigo-600 ${getTierStyles('avatar')}`}
            />
          </button>
          <button className="p-2 text-white" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 20, y: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 20, y: -20 }}
              className="fixed top-0 right-0 w-[40%] md:w-[300px] h-auto max-h-[90vh] overflow-y-auto rounded-bl-3xl border-l border-b border-white/10 shadow-2xl bg-zinc-900/95 z-[120] p-6"
            >
              <div className="flex justify-end mb-4">
                <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col items-start gap-4 text-left">
                {navLinks.map((v) => (
                  <button 
                    key={v.id}
                    onClick={() => { setView(v.id === 'insights' ? 'weekly' : v.id as any); setIsOpen(false); }}
                    className="text-sm md:text-lg font-black text-white uppercase tracking-widest whitespace-normal text-left flex items-center gap-2"
                  >
                    {v.id === 'ai' && <Sparkles size={16} />}
                    {v.label}
                  </button>
                ))}
                <div className="border-t border-zinc-800 pt-4 mt-2">
                  <button onClick={() => { setView('account'); setIsOpen(false); }} className="flex items-center justify-start gap-3 text-white font-bold uppercase tracking-widest text-xs md:text-sm">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                      {user?.displayName?.charAt(0) || 'U'}
                    </div>
                    ACCOUNT
                  </button>
                  <button onClick={handleLogout} className="flex items-center gap-2 text-zinc-500 mt-4 uppercase text-[10px] md:text-xs font-bold tracking-widest">
                    <LogOut size={14} />
                    LOG OUT
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
