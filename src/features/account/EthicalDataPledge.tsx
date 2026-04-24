import React, { useState } from 'react';
import { Shield, X, Info, ExternalLink, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../../components/UI';

interface EthicalDataPledgeProps {
  agreed: boolean;
  onToggle: (val: boolean) => void;
  isEnhanced?: boolean;
}

export default function EthicalDataPledge({ agreed, onToggle, isEnhanced }: EthicalDataPledgeProps) {
  const [showModal, setShowModal] = useState(false);

  React.useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  return (
    <div className="space-y-4">
      <Card className="bg-indigo-900/10 border-indigo-500/20 p-4">
        <div className="grid grid-cols-[40px_1fr] gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Shield size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">Ethical Data Pledge</h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Your privacy is our priority. We anonymize your trends to fund research and keep SIA free for everyone.
            </p>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center justify-between md:justify-start gap-3">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter leading-tight">
                  {isEnhanced ? 'Included in Enhanced Analysis' : 'Powers your free AI tokens'}
                </span>
                <button 
                  onClick={() => onToggle(!agreed)}
                  className={`w-10 h-5 rounded-full transition-all relative ${agreed ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${agreed ? (agreed ? 'left-5.5' : 'left-0.5') : 'left-0.5'}`} />
                </button>
              </div>
              <button 
                onClick={() => setShowModal(true)}
                className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors self-start md:self-auto"
              >
                Read Our Full Pledge <ExternalLink size={10} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md mx-auto my-auto bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                <div className="flex items-center gap-3">
                  <Shield className="text-indigo-500" size={24} />
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">The SIA Ethical Pledge</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  {[
                    { title: "No PII Sharing", desc: "We never share your name, email, or identity. Your data is strictly anonymized." },
                    { title: "Anonymization First", desc: "Data is hashed and randomized before being used for clinical research." },
                    { title: "Research Only", desc: "Your trends help clinical sleep scientists, not advertisers or third-party brokers." },
                    { title: "Full Control", desc: "You can opt-out at any time from your settings. No questions asked." },
                    { title: "Transparency", desc: "Anonymized data is the 'engine' that funds our research and keeps SIA's AI free for everyone." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white mb-0.5">{item.title}</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex gap-3">
                  <Info size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-indigo-300 leading-relaxed">
                    By contributing anonymized trends, you help us build a world where everyone sleeps better, while keeping advanced AI tools accessible to all.
                  </p>
                </div>

                <button 
                  onClick={() => setShowModal(false)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                >
                  I Understand & Support This
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
