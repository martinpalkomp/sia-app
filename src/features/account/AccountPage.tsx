import React from 'react';
import { useUser } from '../../context/UserContext';
import { DevModal } from '../dev/DevModal';
import { signOut, auth, db, doc, setDoc, onSnapshot, updateDoc } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
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
  Layers,
  TrendingUp,
  Moon,
  Camera,
  X
} from 'lucide-react';
import { Card, AvatarFrame } from '../../components/UI';
import DataMaturityTracker from '../data/DataMaturityTracker';
import EthicalDataPledge from './EthicalDataPledge';
import { purgeUserData } from '../../utils/devTools';
import DataManager from '../data/DataManager';
import FeedbackForm from './FeedbackForm';
import AdminFeedback from './AdminFeedback';
import DevElementMap from './DevElementMap';
import TierDetailsModal from './TierDetailsModal';
import { calculateAge, getAgeDecade } from '../../utils/dateUtils';
import { tierDetails } from '../../data/tierData';

export default function AccountPage({ onModifyAssessment, onRefresh }: { onModifyAssessment: () => void; onRefresh?: () => void; }) {
  const { user, personalizationProfile, logs, maturity, highlightTier, tier, userProfile, setMockLogs, dataDepth } = useUser();
  const [view, setView] = React.useState<'main' | 'data-ledger' | 'feedback' | 'admin-feedback' | 'element-map'>('main');
  const [selectedTierDetail, setSelectedTierDetail] = React.useState<'Basic' | 'Enhanced' | 'Pro' | null>(null);
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

  if (view === 'element-map') {
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
        <DevElementMap />
      </motion.div>
    );
  }

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
        className="flex justify-center items-center min-h-[50svh]"
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

  const daysLogged = maturity?.count || Object.keys(logs || {}).length || 0;
  const reportsGenerated = Math.floor(daysLogged / 7);
  const insightsUnlocked = Math.floor(daysLogged / 14);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 pb-12"
    >
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row gap-8 text-center xl:text-left bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem]">
        <div className="flex flex-col lg:flex-row items-center gap-8 flex-1">
          <div className="flex flex-col items-center gap-4">
            <AvatarFrame 
              src={user.photoURL || "https://i.imgur.com/MnI5hn3.png"} 
              alt={user.displayName || "User"} 
              size="lg"
              className="shadow-2xl shadow-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.2)] border border-indigo-500/30 w-32 h-32"
            />
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <p className="text-zinc-500 text-sm font-medium">Manage your account and sleep intelligence preferences.</p>
            </div>
            <div className="space-y-0.5 pt-2">
              <h3 className="text-3xl font-black text-white tracking-tighter">{user.displayName}</h3>
              <p className="text-zinc-400 text-sm font-medium tracking-wide">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-100">Your SIA Journey</h4>
              <TrendingUp className="text-indigo-500" size={18} />
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-4xl font-black text-white tracking-tighter mb-1">{daysLogged}</div>
                <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Days logged</div>
              </div>
              <div>
                <div className="text-4xl font-black text-zinc-200 tracking-tighter mb-1">{reportsGenerated}</div>
                <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Reports generated</div>
              </div>
              <div>
                <div className="text-4xl font-black text-zinc-200 tracking-tighter mb-1">{insightsUnlocked}</div>
                <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Insights unlocked</div>
              </div>
            </div>

            <p className="text-xs text-zinc-500 font-medium">Keep going, consistency is the key.</p>
          </div>
        </div>
      </div>

      {/* Intelligence Tier Section */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        id="acc-tier-section" 
        className="border border-zinc-800/60 bg-[#0B0F17] rounded-3xl relative shadow-sm group transition-all duration-300 p-8 space-y-6"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white">My Intelligence Tier</h3>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest cursor-pointer hover:text-zinc-300 transition-colors">Compare tiers</span>
        </div>
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Basic', 'Enhanced', 'Pro'].map((tierOption) => {
            const isActive = derivedTier === tierOption;
            const config = {
              Basic: { 
                icon: Shield, 
                desc: 'Standard sleep tracking and baseline metrics.',
                features: ['Daily sleep tracking', 'Baseline metrics', 'Basic insights']
              },
              Enhanced: { 
                icon: Sparkles, 
                desc: 'Clinical-grade analysis and personalized insights.',
                features: ['Everything in Basic', 'Pattern detection', 'Personalized recommendations', 'Historical trends']
              },
              Pro: { 
                icon: Rocket, 
                desc: 'Advanced predictive modeling and full SIA intelligence.',
                features: ['Everything in Enhanced', 'Predictive insights', 'What-if simulations', 'Priority support']
              },
            }[tierOption as 'Basic' | 'Enhanced' | 'Pro'];

            return (
              <div key={tierOption} className={`p-6 rounded-2xl border transition-all flex flex-col ${isActive ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-[#0B0F17] border-zinc-800/60'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <config.icon className={isActive ? 'text-indigo-400' : 'text-zinc-500'} size={24} />
                    <h4 className="text-xl font-bold text-white tracking-tight">{tierOption}</h4>
                  </div>
                  {isActive ? (
                    <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg uppercase tracking-widest">Active</span>
                  ) : (
                    <button 
                      onClick={() => handleTierChange(tierOption)}
                      className="text-[10px] font-black bg-zinc-800 text-white hover:bg-zinc-700 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all"
                    >
                      Activate
                    </button>
                  )}
                </div>
                
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed flex-1">{config.desc}</p>
                
                <div className="space-y-3 mb-6">
                  {config.features.map(feature => (
                    <div key={feature} className="flex gap-2 items-center text-[11px] text-zinc-400">
                      <ShieldCheck size={14} className="text-indigo-900 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>

                <div 
                  onClick={() => setSelectedTierDetail(tierOption as 'Basic' | 'Enhanced' | 'Pro')}
                  className="text-[10px] font-medium text-indigo-400 cursor-pointer hover:underline flex items-center gap-1 transition-all"
                >
                  Learn more <ChevronRight size={12} />
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>


      {/* Data Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EthicalDataPledge 
          agreed={personalizationProfile?.allowsAnonymizedSharing || false} 
          onToggle={toggleSharing} 
          isEnhanced={isEnhanced}
        />

        <Card className="bg-zinc-900 border-zinc-800 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Target className="text-indigo-400" size={18} />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sleep Goals</h3>
            </div>
            <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:underline">Edit</button>
          </div>
          {personalizationProfile?.goals && personalizationProfile.goals.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {personalizationProfile.goals.map(goal => (
                <span key={goal} className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-[9px] font-black text-zinc-300 uppercase tracking-widest">
                  {goal.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-[11px] text-zinc-500 italic mb-4">No goals set yet.</p>
              <button 
                onClick={onModifyAssessment}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Set Your Goals
              </button>
            </div>
          )}
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Calendar className="text-indigo-400" size={18} />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Demographics</h3>
            </div>
            <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:underline">Edit</button>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Age', val: personalizationProfile?.demographics?.dateOfBirth ? getAgeDecade(personalizationProfile.demographics.dateOfBirth) : 'Not set' },
              { label: 'Country', val: personalizationProfile?.demographics?.country || 'Not set' },
              { label: 'Biological Sex', val: personalizationProfile?.demographics?.sex || 'Not set' },
              { label: 'Work Schedule', val: personalizationProfile?.demographics?.workSchedule || 'Not set' },
              { label: 'Environment', val: personalizationProfile?.demographics?.environmentType || 'Not set' }
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center text-xs pb-3 border-b border-zinc-800/50 last:border-b-0 last:pb-0">
                <span className="font-medium text-zinc-500">{item.label}</span>
                <span className="font-black text-zinc-200 uppercase tracking-tight">{item.val}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Data Maturity Tracker moved below */}
        <div className="md:col-span-2">
          <DataMaturityTracker maturity={dataDepth as typeof maturity || { count: 0, level: 1, nextThreshold: 7, label: 'Observer', } as any} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button 
          onClick={() => setView('element-map')}
          className="w-full p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-clinical-primary transition-colors">
              <Layers size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-black text-white">Element Map</div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest">Explore the UI architecture</div>
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-700 group-hover:text-white transition-colors" />
        </button>

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
      
      <TierDetailsModal 
        selectedTier={selectedTierDetail} 
        onClose={() => setSelectedTierDetail(null)} 
      />

      {import.meta.env.DEV && (
        <DevModal 
          isOpen={modal.isOpen} 
          message={modal.message} 
          onConfirm={modal.onConfirm} 
          onCancel={modal.onCancel} 
        />
      )}
    </motion.div>
  );
}
