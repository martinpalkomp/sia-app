import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Rocket, X, Check, Loader2 } from 'lucide-react';
import { UserTier } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errorHandling';
import { ChatQuotaManager } from '../../services/ai/chatQuotaManager';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentTier: UserTier;
}

export default function PaywallModal({ isOpen, onClose, userId, currentTier }: PaywallModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async (newTier: UserTier) => {
    if (!db) return;
    setIsUpgrading(true);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        tier: newTier,
        'quota.chatMessagesUsed': 0 // Reset quota on upgrade
      });
      // In a real application, this would redirect to Stripe/Apple Pay.
      // We are simulating the payment success here.
      setTimeout(() => {
        setIsUpgrading(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Upgrade failed", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      setIsUpgrading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl bg-[#0B0F17] border border-zinc-800/60 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-zinc-800/60 flex items-center justify-between shrink-0 bg-zinc-900/20">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Upgrade SIA</h3>
                <p className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase mt-1">Unlock deeper clinical insights</p>
              </div>
              <button onClick={onClose} disabled={isUpgrading} className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {currentTier === 'Basic' && (
                <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-center">
                  <p className="text-sm text-indigo-300 font-medium">You have reached your daily limit of {ChatQuotaManager.getQuotaLimit('Basic')} messages for the Basic tier.</p>
                </div>
              )}
              {currentTier === 'Enhanced' && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                  <p className="text-sm text-emerald-300 font-medium">You have reached your daily limit of {ChatQuotaManager.getQuotaLimit('Enhanced')} messages for the Enhanced tier.</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {/* Enhanced Tier Card */}
                {currentTier === 'Basic' && (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Sparkles className="text-indigo-400" size={20} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">Enhanced</h4>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest">For detailed trackers</p>
                      </div>
                    </div>
                    
                    <ul className="space-y-3 mb-6 flex-grow">
                      {[
                        '10 AI Messages / Day',
                        'Deep Pattern Analysis',
                        'Chronotype Profiling',
                        'Summary Export'
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <Check size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <button 
                      onClick={() => handleUpgrade('Enhanced')}
                      disabled={isUpgrading}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isUpgrading ? <Loader2 size={16} className="animate-spin" /> : 'Upgrade to Enhanced'}
                    </button>
                  </div>
                )}

                {/* Pro Tier Card */}
                {(currentTier === 'Basic' || currentTier === 'Enhanced') && (
                  <div className="bg-zinc-900/50 border border-emerald-500/30 relative rounded-2xl p-6 flex flex-col">
                    <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-3 py-0.5 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest rounded-full">
                      Recommended
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Rocket className="text-emerald-400" size={20} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">Pro</h4>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Clinical Grade</p>
                      </div>
                    </div>
                    
                    <ul className="space-y-3 mb-6 flex-grow">
                      {[
                        'Unlimited AI Messages',
                        'Clinical Provider Briefs',
                        'Recovery Indexing',
                        'Deep Architecture Export'
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <button 
                      onClick={() => handleUpgrade('Pro')}
                      disabled={isUpgrading}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isUpgrading ? <Loader2 size={16} className="animate-spin" /> : 'Upgrade to Pro'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
