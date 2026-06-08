import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, BarChart3, RotateCcw, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MaturityInfo } from '../../services/ai/core/maturitySystem';
import { UserProfile, UserTier } from '../../types';

interface AdminMasterPanelProps {
  user: { uid: string } | null;
  userProfile: UserProfile | null;
  maturity: MaturityInfo | null;
  onRefresh: () => void;
}

const TIERS: { value: UserTier; label: string; color: string; desc: string }[] = [
  { value: 'Basic',    label: 'Basic',    color: 'bg-zinc-700 hover:bg-zinc-600 border-zinc-600',     desc: '3 msgs/day · no patterns' },
  { value: 'Enhanced', label: 'Enhanced', color: 'bg-indigo-900 hover:bg-indigo-800 border-indigo-700', desc: '10 msgs/day · patterns' },
  { value: 'Pro',      label: 'Pro',      color: 'bg-violet-900 hover:bg-violet-800 border-violet-700', desc: 'Unlimited · all features' },
];

const LEVELS: { value: number; label: string; subtitle: string; threshold: string; color: string }[] = [
  { value: 1, label: 'Baseline',       subtitle: 'Level 1', threshold: '0–6 days',  color: 'bg-zinc-700 hover:bg-zinc-600 border-zinc-600' },
  { value: 2, label: 'Trends',         subtitle: 'Level 2', threshold: '7–13 days', color: 'bg-blue-900 hover:bg-blue-800 border-blue-700' },
  { value: 3, label: 'Deep Analysis',  subtitle: 'Level 3', threshold: '14–89 days',color: 'bg-indigo-900 hover:bg-indigo-800 border-indigo-700' },
  { value: 4, label: 'Advanced',       subtitle: 'Level 4', threshold: '90+ days',  color: 'bg-violet-900 hover:bg-violet-800 border-violet-700' },
];

export const AdminMasterPanel: React.FC<AdminMasterPanelProps> = ({
  user, userProfile, maturity, onRefresh
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const isOverrideActive = userProfile?.levelOverride !== undefined && userProfile?.levelOverride !== null;
  const currentTier = userProfile?.tier ?? 'Basic';
  const currentLevel = maturity?.level ?? 1;
  const realCount = maturity?.count ?? 0;

  const write = async (data: Record<string, any>, actionLabel: string) => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), data);
      setLastAction(actionLabel);
      setTimeout(() => setLastAction(null), 3000);
      onRefresh();
    } catch (e) {
      console.error('[AdminPanel]', e);
    } finally {
      setSaving(false);
    }
  };

  const setTier = (tier: UserTier) => write({ tier }, `Tier → ${tier}`);

  // Need to cast to any due to specific strict typing on levelOverride missing?
  // UserProfile type in types.ts doesn't explicitly mention levelOverride, or does it?
  // I will just cast `data as any` above if ts complains, but updateDoc takes partial
  const setLevel = (level: number) => write({ levelOverride: level }, `Level → ${LEVELS[level - 1].label}`);

  const deactivate = () => write(
    { levelOverride: deleteField() },
    'Override deactivated — real data restored'
  );

  return (
    <div className="w-full rounded-2xl border border-amber-500/30 bg-amber-950/10 overflow-hidden mb-4">
      {/* Header */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-950/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Shield size={16} className="text-amber-400" />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">Admin Master Override</p>
            <p className="text-[9px] text-zinc-500 font-bold mt-0.5">
              {isOverrideActive
                ? `⚡ ACTIVE — Tier: ${currentTier} · Level: ${currentLevel} (${LEVELS[currentLevel - 1]?.label})`
                : `Live data — ${realCount} logs · Tier: ${currentTier} · Level ${currentLevel}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOverrideActive && (
            <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-full">
              Override Active
            </span>
          )}
          {isOpen ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5 border-t border-amber-500/10">

              {/* Live state display */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: 'Real logs', value: String(realCount) },
                  { label: 'Active tier', value: currentTier },
                  { label: 'Active level', value: `L${currentLevel} · ${LEVELS[currentLevel - 1]?.label}` },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-900 rounded-xl p-2.5 border border-zinc-800">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1">{s.label}</p>
                    <p className="text-[11px] font-black text-white">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Tier override */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={12} className="text-indigo-400" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Intelligence Tier</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TIERS.map(t => (
                    <button
                      key={t.value}
                      disabled={saving}
                      onClick={() => setTier(t.value)}
                      className={`p-3 rounded-xl border text-left transition-all relative ${t.color} ${currentTier === t.value ? 'ring-1 ring-white/30' : ''}`}
                    >
                      {currentTier === t.value && (
                        <CheckCircle2 size={10} className="absolute top-2 right-2 text-white/60" />
                      )}
                      <p className="text-[10px] font-black text-white">{t.label}</p>
                      <p className="text-[8px] text-white/50 font-bold mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Maturity level override */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={12} className="text-indigo-400" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Data Fidelity Level</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {LEVELS.map(l => (
                    <button
                      key={l.value}
                      disabled={saving}
                      onClick={() => setLevel(l.value)}
                      className={`p-3 rounded-xl border text-left transition-all relative ${l.color} ${currentLevel === l.value && isOverrideActive ? 'ring-1 ring-white/30' : ''}`}
                    >
                      {currentLevel === l.value && isOverrideActive && (
                        <CheckCircle2 size={10} className="absolute top-2 right-2 text-white/60" />
                      )}
                      <p className="text-[10px] font-black text-white">{l.label}</p>
                      <p className="text-[9px] text-white/50 font-bold">{l.subtitle}</p>
                      <p className="text-[8px] text-white/30 font-bold mt-0.5">{l.threshold}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Deactivate */}
              <button
                onClick={deactivate}
                disabled={saving || !isOverrideActive}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  isOverrideActive
                    ? 'border-red-800/50 bg-red-950/30 text-red-400 hover:bg-red-950/50'
                    : 'border-zinc-800 bg-zinc-900/30 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <RotateCcw size={12} />
                Deactivate Override — Restore Live Data
              </button>

              {/* Feedback */}
              <AnimatePresence>
                {lastAction && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-[9px] font-black text-emerald-400 text-center uppercase tracking-widest"
                  >
                    ✓ {lastAction}
                  </motion.p>
                )}
              </AnimatePresence>

              <p className="text-[8px] text-zinc-700 font-bold text-center uppercase tracking-widest">
                Tier changes write to Firestore · Visible to all sessions · Refresh applied automatically
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
