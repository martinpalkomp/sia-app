import React from 'react';
import { useUser } from '../context/UserContext';
import { DevModal } from './DevModal';
import { signOut, auth, db, doc, setDoc, onSnapshot, updateDoc } from '../lib/firebase';
import { motion } from 'motion/react';
import { 
  LogOut, 
  User as UserIcon, 
  Settings, 
  ShieldCheck, 
  ChevronRight, 
  Sparkles,
  Target,
  Calendar,
  Globe,
  Shield,
  Database,
  ArrowLeft,
  Trash2,
  MessageSquare,
  Rocket,
  Layers
} from 'lucide-react';
import { Card, AvatarFrame } from './UI';
import DataMaturityTracker from './DataMaturityTracker';
import EthicalDataPledge from './EthicalDataPledge';
import { purgeUserData } from '../utils/devTools';
import DataManager from './DataManager';
import FeedbackForm from './FeedbackForm';
import AdminFeedback from './AdminFeedback';
import { calculateAge, getAgeDecade } from '../utils/dateUtils';
import { AIService } from '../services/aiService';
import { exportDailySummary, exportDeepEventLog } from '../utils/exportUtils';

export default function AccountPage({ onModifyAssessment, onRefresh }: { onModifyAssessment: () => void; onRefresh?: () => void; }) {
  const { user, personalizationProfile, logs, maturity, highlightTier, tier, userProfile, setMockLogs } = useUser();
  const [view, setView] = React.useState<'main' | 'data-ledger' | 'feedback' | 'admin-feedback'>('main');
  const [userData, setUserData] = React.useState<any>(null);
  const [modal, setModal] = React.useState<{ isOpen: boolean; message: string; onConfirm: () => void; onCancel?: () => void }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  React.useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });
    return () => unsubscribe();
  }, [user]);

  const isAdmin = userData?.role === 'admin';

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isEnhanced = tier === 'Enhanced' || tier === 'Pro';

  const derivedTier = tier; // Using tier from context

  const toggleSharing = async () => {
    if (!user) return;
    
    const profileRef = doc(db, 'users', user.uid, 'personalization', 'profile');
    try {
      await setDoc(profileRef, {
        allowsAnonymizedSharing: !personalizationProfile?.allowsAnonymizedSharing
      }, { merge: true });
    } catch (error) {
      console.error('Error updating sharing preference:', error);
    }
  };

  const handlePurgeData = async () => {
    setModal({
      isOpen: true,
      message: "WARNING: This will permanently delete ALL your sleep history and raw data. This cannot be undone. Proceed?",
      onConfirm: async () => {
        setModal({ ...modal, isOpen: false });
        try {
          await purgeUserData(user!.uid, onRefresh);
          setModal({
            isOpen: true,
            message: "Database Cleared. You are starting with a clean slate.",
            onConfirm: () => setModal({ ...modal, isOpen: false }),
          });
        } catch (error) {
          console.error("Purge error:", error);
          setModal({
            isOpen: true,
            message: "Failed to purge data.",
            onConfirm: () => setModal({ ...modal, isOpen: false }),
          });
        }
      },
      onCancel: () => setModal({ ...modal, isOpen: false }),
    });
  };

  const handleTierChange = async (newTier: string) => {
    try {
      // Protect role and tier: Only allow tier update if not changing role, and ensure role is not modified here.
      const levelOverride = newTier === 'Pro' ? 3 : newTier === 'Enhanced' ? 2 : 1;
      const updateData: any = { tier: newTier, levelOverride };
      
      // Explicitly ensure role is not in updateData
      delete updateData.role; 

      await updateDoc(doc(db, 'users', user!.uid), updateData);
      setModal({
        isOpen: true,
        message: `Tier changed to ${newTier} (Level ${levelOverride}). Please refresh.`,
        onConfirm: () => {
          setModal({ ...modal, isOpen: false });
          onRefresh?.();
        },
      });
    } catch (error) {
      console.error("Tier change error:", error);
      setModal({
        isOpen: true,
        message: "Failed to change tier.",
        onConfirm: () => setModal({ ...modal, isOpen: false }),
      });
    }
  };

  if (view === 'data-ledger') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <button 
          onClick={() => setView('main')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back to Account</span>
        </button>
        <DataManager user={user} onRefresh={onRefresh} logs={logs} personalizationProfile={personalizationProfile} />
      </motion.div>
    );
  }

  if (view === 'feedback') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex justify-center items-center min-h-[400px]"
      >
        <FeedbackForm 
          user={user} 
          recentLogs={logs} 
          onClose={() => setView('main')} 
        />
      </motion.div>
    );
  }

  if (view === 'admin-feedback') {
    return (
      <AdminFeedback onBack={() => setView('main')} />
    );
  }

  if (!user) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 pb-12"
    >
      {/* Header Section */}
      <div className="flex flex-col items-center text-center space-y-4">
        <AvatarFrame 
          src={user.photoURL || "https://i.imgur.com/MnI5hn3.png"} 
          alt={user.displayName || "User"} 
          size="lg"
          className="shadow-2xl shadow-clinical-primary/20 border-clinical-primary/30"
        />
        <div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-white leading-[0.95]">{user.displayName}</h2>
          <p className="text-zinc-300 font-bold uppercase tracking-widest text-[9px] mt-1.5">{user.email}</p>
        </div>
      </div>

      {/* Intelligence Tier Section */}
      <div className={`space-y-4 transition-all duration-500 ${highlightTier ? 'ring-2 ring-indigo-500/50 rounded-3xl p-2 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : ''}`}>
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">My Intelligence Tier</h3>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Upgrade Your Sleep Intelligence</span>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {['Basic', 'Enhanced', 'Pro'].map((tierOption) => {
            const isActive = derivedTier === tierOption;
            const config = {
              Basic: { icon: Shield, label: 'Basic', desc: 'Standard sleep tracking and baseline metrics.', color: 'green' },
              Enhanced: { icon: Sparkles, label: 'Enhanced', desc: 'Clinical-grade analysis and personalized insights.', color: 'indigo' },
              Pro: { icon: Rocket, label: 'Pro', desc: 'Advanced predictive modeling and full SIA intelligence.', color: 'violet' },
            }[tierOption as 'Basic' | 'Enhanced' | 'Pro'];

            return (
              <div key={tierOption} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${isActive ? `bg-zinc-900 border-${config.color}-500` : 'bg-zinc-900/50 border-zinc-800 opacity-60'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? `bg-${config.color}-500/20 text-${config.color}-400` : 'bg-zinc-800 text-zinc-400'}`}>
                    <config.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">{config.label}</h4>
                    <p className="text-[10px] text-zinc-500 leading-tight">{config.desc}</p>
                  </div>
                </div>
                {isActive ? (
                  <span className={`text-[8px] font-black bg-${config.color}-500 text-black px-2 py-1 rounded uppercase`}>Active</span>
                ) : (
                  <button 
                    onClick={() => handleTierChange(tierOption)}
                    className="py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Activate
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <DataMaturityTracker maturity={maturity || { count: 0, level: 1, nextThreshold: 7 }} />
        </div>
        <div className="md:col-span-2">
          <EthicalDataPledge 
            agreed={!!personalizationProfile?.allowsAnonymizedSharing}
            onToggle={toggleSharing}
            isEnhanced={isEnhanced}
          />
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <Target className="text-clinical-primary" size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Sleep Goals</h3>
          </div>
          {personalizationProfile?.goals && personalizationProfile.goals.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {personalizationProfile.goals.map(goal => (
                <span key={goal} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                  {goal.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 italic">No goals set. Complete the assessment to personalize SIA.</p>
          )}
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="text-clinical-primary" size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Demographics</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Age</span>
              <span className="text-sm font-black text-white">
                {personalizationProfile?.demographics?.dateOfBirth 
                  ? getAgeDecade(personalizationProfile.demographics.dateOfBirth) 
                  : 'Not set'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Country</span>
              <span className="text-sm font-black text-white">{personalizationProfile?.demographics?.country || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Biological Sex</span>
              <span className="text-sm font-black text-white">{personalizationProfile?.demographics?.sex || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Work Schedule</span>
              <span className="text-sm font-black text-white">{personalizationProfile?.demographics?.workSchedule || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Environment</span>
              <span className="text-sm font-black text-white text-right max-w-[150px]">{personalizationProfile?.demographics?.environmentType || 'Not set'}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Researcher Tools */}
      <div className="pt-8 border-t border-zinc-800">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1 mb-4">
          ### [ RESEARCHER TOOLS ]
        </h3>
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl mb-4">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <ShieldCheck size={12} className="text-amber-500" />
            ⚠️ ADVISORY
          </p>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            ⚠️ ADVISORY: Exported files are unencrypted. Store safely on your local machine.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => exportDailySummary(Object.values(logs || {}))}
            className="p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-left transition-all group"
          >
            <div className="text-sm font-black text-white mb-1">Export Tidy Trends (.CSV)</div>
            <div className="text-[10px] text-zinc-500 leading-relaxed">
              Aggregates sleep metrics and lifestyle factors for longitudinal analysis in R/RStudio.
            </div>
          </button>
          {derivedTier === 'Basic' ? (
            <button
              disabled
              title="Available on Enhanced and Pro"
              className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-left transition-all group opacity-40 cursor-not-allowed"
            >
              <div className="text-sm font-black text-white mb-1">Deep Architecture Export — Enhanced+</div>
              <div className="text-[10px] text-zinc-500 leading-relaxed">
                High-resolution event log for analyzing sleep fragmentation and circadian phase shifts.
              </div>
            </button>
          ) : (
            <button 
              onClick={() => exportDeepEventLog(Object.values(logs || {}))}
              className="p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-left transition-all group"
            >
              <div className="text-sm font-black text-white mb-1">Export Deep Architecture (.CSV)</div>
              <div className="text-[10px] text-zinc-500 leading-relaxed">
                High-resolution event log for analyzing sleep fragmentation and circadian phase shifts.
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button 
          onClick={() => setView('data-ledger')}
          className="w-full p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-clinical-primary transition-colors">
              <Database size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-black text-white">Data Ledger</div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest">Manage your imported files and logs</div>
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-700 group-hover:text-white transition-colors" />
        </button>

        <button 
          onClick={onModifyAssessment}
          className="w-full p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-clinical-primary transition-colors">
              <Sparkles size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-black text-white">Modify Assessment</div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest">Update your goals and clinical data</div>
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-700 group-hover:text-white transition-colors" />
        </button>

        <button 
          onClick={handleLogout}
          className="w-full p-4 bg-zinc-900 hover:bg-red-900/10 border border-zinc-800 hover:border-red-900/30 rounded-2xl flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-black text-white">Logout</div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest">Sign out of your account</div>
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-700 group-hover:text-white transition-colors" />
        </button>

        <button 
          onClick={() => setView('feedback')}
          className="w-full p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-clinical-primary transition-colors">
              <MessageSquare size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-black text-white">Submit Feedback</div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest">Help SIA learn from your input</div>
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-700 group-hover:text-white transition-colors" />
        </button>

        {isAdmin && (
          <button 
            onClick={() => setView('admin-feedback')}
            className="w-full p-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Rocket size={20} />
              </div>
              <div className="text-left">
                <div className="text-sm font-black text-white">🚀 Admin: Review Feedback</div>
                <div className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Manage incoming requests</div>
              </div>
            </div>
            <ChevronRight size={20} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* Developer Tools */}
      {isAdmin && (
        <div className="pt-8 border-t border-zinc-800">
          <div className="mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Developer Tools</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => {
                localStorage.removeItem('mockLogs');
                onRefresh?.();
              }}
              className="w-full p-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Trash2 size={14} className="text-red-400" />
              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Clear All Local Data</span>
            </button>
            <button 
              onClick={() => window.location.hash = '/dev/map'}
              className="w-full p-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-3 group transition-all"
            >
              <Layers size={18} className="text-indigo-400" />
              <span className="text-sm font-black text-indigo-400 uppercase tracking-widest">OPEN ELEMENT MAP</span>
            </button>
          </div>

          {/* DEV SWITCHBOARD */}
          <div className="mt-8 p-4 border-2 border-amber-500 rounded-2xl bg-amber-950/10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-4">DEV SWITCHBOARD</h4>
            
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-2">User Tier</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Basic', 'Enhanced', 'Pro'].map(t => (
                    <button key={t} onClick={() => { localStorage.setItem('dev_tier', t); window.location.reload(); }} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] font-bold text-white uppercase">{t}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-2">Maturity Level</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Baseline', 'Trends', 'Deep', 'Advanced'].map(m => (
                    <button key={m} onClick={() => { localStorage.setItem('dev_maturity', m); window.location.reload(); }} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] font-bold text-white uppercase">{m}</button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => { localStorage.removeItem('dev_tier'); localStorage.removeItem('dev_maturity'); window.location.reload(); }}
                className="w-full p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded text-[10px] font-bold uppercase tracking-widest"
              >
                Reset to Real Data
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {['Basic', 'Enhanced', 'Pro'].map((tier) => (
              <button
                key={tier}
                onClick={() => handleTierChange(tier)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-[10px] font-bold text-zinc-300 uppercase tracking-widest transition-all"
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
      )}
      <DevModal 
        isOpen={modal.isOpen} 
        message={modal.message} 
        onConfirm={modal.onConfirm} 
        onCancel={modal.onCancel} 
      />
    </motion.div>
  );
}
