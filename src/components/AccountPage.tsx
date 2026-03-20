import React from 'react';
import { User, signOut, auth, db, doc, setDoc, onSnapshot } from '../lib/firebase';
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
  Rocket
} from 'lucide-react';
import { PersonalizationProfile, DailyLog } from '../types';
import { Card, AvatarFrame } from './UI';
import EthicalDataPledge from './EthicalDataPledge';
import { seedTestData, purgeUserData } from '../utils/devTools';
import DataManager from './DataManager';
import FeedbackForm from './FeedbackForm';
import AdminFeedback from './AdminFeedback';

interface AccountPageProps {
  user: User;
  personalizationProfile: PersonalizationProfile | null;
  onModifyAssessment: () => void;
  onRefresh?: () => void;
  logs?: Record<string, DailyLog>;
}

export default function AccountPage({ user, personalizationProfile, onModifyAssessment, onRefresh, logs }: AccountPageProps) {
  const [view, setView] = React.useState<'main' | 'data-ledger' | 'feedback' | 'admin-feedback'>('main');
  const [userData, setUserData] = React.useState<any>(null);

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

  const isAdmin = userData?.role === 'admin' || user.email === 'martinpalko.mp@gmail.com';

  /**
   * MANUAL ADMIN SETUP:
   * To promote a user to 'admin' manually:
   * 1. Go to Firebase Console -> Firestore Database
   * 2. Find the user's document in the 'users' collection (ID is their UID)
   * 3. Add a field 'role' with string value 'admin'
   * 4. The app will automatically pick up the change via onSnapshot
   */

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isEnhanced = !!personalizationProfile;

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

  const handleSeedData = async () => {
    if (window.confirm("This will populate 60 days of logs. Continue?")) {
      try {
        await seedTestData(user.uid, onRefresh);
      } catch (error) {
        console.error("Seeding error:", error);
        alert("Failed to seed data.");
      }
    }
  };

  const handlePurgeData = async () => {
    if (window.confirm("WARNING: This will permanently delete ALL your sleep history and raw data. This cannot be undone. Proceed?")) {
      try {
        await purgeUserData(user.uid, onRefresh);
        alert("Database Cleared. You are starting with a clean slate.");
      } catch (error) {
        console.error("Purge error:", error);
        alert("Failed to purge data.");
      }
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
        <DataManager user={user} onRefresh={onRefresh} />
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
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] mt-1.5">{user.email}</p>
        </div>
      </div>

      {/* Status Card */}
      <Card className={`relative overflow-hidden border-none ${isEnhanced ? 'bg-gradient-to-br from-violet-600 to-indigo-700' : 'bg-zinc-900 border border-zinc-800'}`}>
        {isEnhanced && (
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <ShieldCheck size={120} className="text-white" />
          </div>
        )}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isEnhanced ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
              {isEnhanced ? <ShieldCheck size={24} /> : <Settings size={24} />}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 text-white">Account Status</div>
              <div className="text-xl font-black text-white">Current Version: {isEnhanced ? 'Enhanced' : 'Standard'}</div>
            </div>
          </div>
          {!isEnhanced && (
            <button 
              onClick={onModifyAssessment}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
            >
              Upgrade Now
            </button>
          )}
        </div>
      </Card>

      {/* Data Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Age</span>
              <span className="text-sm font-black text-white">{personalizationProfile?.demographics?.age || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Biological Sex</span>
              <span className="text-sm font-black text-white">{personalizationProfile?.demographics?.sex || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Work Schedule</span>
              <span className="text-sm font-black text-white">{personalizationProfile?.demographics?.workSchedule || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Environment</span>
              <span className="text-sm font-black text-white text-right max-w-[150px]">{personalizationProfile?.demographics?.environmentType || 'Not set'}</span>
            </div>
          </div>
        </Card>
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
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Manage your imported files and logs</div>
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
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Update your goals and clinical data</div>
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
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Sign out of your account</div>
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
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Help SIA learn from your input</div>
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
      {(import.meta.env.DEV || user.email === 'martinpalko.mp@gmail.com') && (
        <div className="pt-8 border-t border-zinc-800">
          <div className="mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Developer Tools</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={handleSeedData}
              className="w-full p-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-3 group transition-all"
            >
              <span className="text-sm font-black text-indigo-400 uppercase tracking-widest">🚀 SEED DATA</span>
            </button>
            <button 
              onClick={handlePurgeData}
              className="w-full p-4 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 rounded-2xl flex items-center justify-center gap-3 group transition-all"
            >
              <Trash2 size={18} className="text-red-400" />
              <span className="text-sm font-black text-red-400 uppercase tracking-widest">PURGE ALL DATA</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
