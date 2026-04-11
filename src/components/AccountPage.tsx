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
import { seedTestData, purgeUserData } from '../utils/devTools';
import DataManager from './DataManager';
import FeedbackForm from './FeedbackForm';
import AdminFeedback from './AdminFeedback';
import { calculateAge, getAgeDecade } from '../utils/dateUtils';
import { AIService } from '../services/aiService';
import { exportDailySummary, exportDeepEventLog } from '../utils/exportUtils';

export default function AccountPage({ onModifyAssessment, onRefresh }: { onModifyAssessment: () => void; onRefresh?: () => void; }) {
  const { user, personalizationProfile, logs, maturity, highlightTier, tier, userProfile } = useUser();
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

  const isAdmin = userData?.role === 'admin' || (process.env.NODE_ENV !== 'production' && user?.email === 'martinpalko.mp@gmail.com');

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isEnhanced = !!personalizationProfile;

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

  const handleSeed = async (days: number) => {
    setModal({
      isOpen: true,
      message: `This will populate ${days} days of logs. Continue?`,
      onConfirm: async () => {
        setModal({ ...modal, isOpen: false });
        try {
          await seedTestData(days, user!.uid, async () => {
            await AIService.getUserDataMaturity(user!.uid);
            onRefresh?.();
          });
        } catch (error) {
          console.error("Seeding error:", error);
          setModal({
            isOpen: true,
            message: "Failed to seed data.",
            onConfirm: () => setModal({ ...modal, isOpen: false }),
          });
        }
      },
      onCancel: () => setModal({ ...modal, isOpen: false }),
    });
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
      <div className={`space-y-4 transition-all duration-1000 ${highlightTier ? 'ring-4 ring-indigo-500/50 rounded-3xl p-2 -m-2 shadow-[0_0_50px_rgba(99,102,241,0.3)]' : ''}`}>
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">My Intelligence Tier</h3>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Upgrade Your Sleep Intelligence</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* BASIC TIER */}
          <div className={`p-4 rounded-2xl border transition-all ${derivedTier === 'Basic' ? 'bg-zinc-900 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-zinc-900/50 border-zinc-800 opacity-60'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${derivedTier === 'Basic' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
                <Shield size={16} />
              </div>
              {derivedTier === 'Basic' && <span className="text-[8px] font-black bg-green-500 text-black px-1.5 py-0.5 rounded uppercase">Active</span>}
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-tight">Basic:</h4>
            <p className="text-[10px] text-zinc-500 mt-1 leading-tight">Standard sleep tracking and baseline metrics.</p>
          </div>

          {/* ENHANCED TIER */}
          <div className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${derivedTier === 'Enhanced' ? 'bg-zinc-950 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'bg-zinc-900/50 border-zinc-800 opacity-60'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${derivedTier === 'Enhanced' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-400'}`}>
                <Sparkles size={16} />
              </div>
              {derivedTier === 'Enhanced' && <span className="text-[8px] font-black bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase">Active</span>}
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-tight">Enhanced:</h4>
            <p className="text-[10px] text-zinc-500 mt-1 leading-tight">Clinical-grade analysis and personalized insights.</p>
            {derivedTier === 'Basic' && (
              <button 
                onClick={onModifyAssessment}
                className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Unlock ENHANCED
              </button>
            )}
          </div>

          {/* PRO TIER */}
          <div className={`p-4 rounded-2xl border transition-all ${derivedTier === 'Pro' ? 'bg-zinc-950 border-violet-500 shadow-[0_0_25px_rgba(139,92,246,0.4)]' : 'bg-zinc-900/50 border-zinc-800 opacity-60'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${derivedTier === 'Pro' ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-400'}`}>
                <Rocket size={16} />
              </div>
              {derivedTier === 'Pro' && <span className="text-[8px] font-black bg-violet-500 text-white px-1.5 py-0.5 rounded uppercase">Active</span>}
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-tight">Pro:</h4>
            <p className="text-[10px] text-zinc-500 mt-1 leading-tight">Advanced predictive modeling and full SIA intelligence.</p>
            {derivedTier !== 'Pro' && (
              <button 
                className="mt-3 w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Activate PRO Intelligence
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Maturity Tracker */}
      {maturity && <DataMaturityTracker maturity={maturity} />}

      {/* Data Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex justify-between items-center">
          <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Imported Data Credit</span>
          <span className="text-sm font-black text-white" id="acc-import-credit-label">
            {userProfile?.importedLogCount || 0} Days
          </span>
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
                <span key={goal} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-300 capitalize">
                  {goal.replace('-', ' ')}
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
            <div className="flex gap-2">
              <button 
                onClick={() => handleSeed(7)}
                className="flex-1 p-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-3 group transition-all"
              >
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">7d</span>
              </button>
              <button 
                onClick={() => handleSeed(60)}
                className="flex-1 p-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-3 group transition-all"
              >
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">60d</span>
              </button>
              <button 
                onClick={() => handleSeed(90)}
                className="flex-1 p-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-3 group transition-all"
              >
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">90d</span>
              </button>
            </div>
            <button 
              onClick={handlePurgeData}
              className="w-full p-4 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 rounded-2xl flex items-center justify-center gap-3 group transition-all"
            >
              <Trash2 size={18} className="text-red-400" />
              <span className="text-sm font-black text-red-400 uppercase tracking-widest">PURGE ALL DATA</span>
            </button>
            <button 
              onClick={() => window.location.hash = '/dev/map'}
              className="w-full p-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-3 group transition-all"
            >
              <Layers size={18} className="text-indigo-400" />
              <span className="text-sm font-black text-indigo-400 uppercase tracking-widest">OPEN ELEMENT MAP</span>
            </button>
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
          <div className="mt-4">
            <input
              type="number"
              id="dev-maturity-input"
              placeholder="Override Maturity Days"
              className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white"
              onChange={(e) => {
                const val = e.target.value;
                if (val) localStorage.setItem('devOverrideMaturity', val);
                else localStorage.removeItem('devOverrideMaturity');
                onRefresh?.();
              }}
            />
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
