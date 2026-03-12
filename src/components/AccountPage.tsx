import React from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { 
  LogOut, 
  User as UserIcon, 
  Settings, 
  ShieldCheck, 
  ChevronRight, 
  Sparkles,
  Target,
  Calendar
} from 'lucide-react';
import { PersonalizationProfile } from '../types';
import { Card, AvatarFrame } from './UI';

interface AccountPageProps {
  user: User;
  personalizationProfile: PersonalizationProfile | null;
  onModifyAssessment: () => void;
}

export default function AccountPage({ user, personalizationProfile, onModifyAssessment }: AccountPageProps) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isEnhanced = !!personalizationProfile;

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
          <h2 className="text-3xl font-black tracking-tight text-white">{user.displayName}</h2>
          <p className="text-zinc-500 font-medium">{user.email}</p>
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
      </div>
    </motion.div>
  );
}
