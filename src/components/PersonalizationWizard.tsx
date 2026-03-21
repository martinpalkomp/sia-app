import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Activity, 
  Brain, 
  Moon, 
  Zap, 
  Stethoscope,
  Save,
  X,
  User as UserIcon,
  Home,
  Heart,
  Droplets
} from 'lucide-react';
import { User, db, doc, setDoc, serverTimestamp } from '../lib/firebase';
import { PersonalizationProfile } from '../types';
import EthicalDataPledge from './EthicalDataPledge';

interface PersonalizationWizardProps {
  user: User;
  onComplete: (data: PersonalizationProfile) => void;
  onClose: () => void;
}

const GOALS = [
  { id: 'sleep-more', label: 'Sleep More', icon: Moon },
  { id: 'better-quality', label: 'Better Quality', icon: Sparkles },
  { id: 'wake-up-rested', label: 'Wake Up Rested', icon: Zap },
  { id: 'reduce-nightmares', label: 'Reduce Nightmares', icon: Brain },
  { id: 'shift-work', label: 'Shift Work Support', icon: Activity },
];

const WORK_SCHEDULES = ['Regular Hours', 'Shift Work'];
const ENVIRONMENT_TYPES = ['Noisy/Urban', 'Quiet/Controlled'];

const NEURO_FACTORS = [
  { id: 'rls', label: 'RLS (Restless Legs)' },
  { id: 'plm', label: 'Periodic Limb Movements' },
  { id: 'night-terrors', label: 'Night Terrors' }
];

export default function PersonalizationWizard({ user, onComplete, onClose }: PersonalizationWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<PersonalizationProfile>({
    demographics: {
      age: 30,
      sex: 'Male',
      workSchedule: 'Regular Hours',
      environmentType: 'Quiet/Controlled',
    },
    goals: [],
    psqi: {
      time_to_fall_asleep: 30,
      sleep_quality: 5,
      daytime_sleepiness: 5,
    },
    clinical: {
      n1: 5,
      n2: 50,
      n3: 20,
      rem: 25,
      neurological: [],
      oxygen: {
        avgSpO2: 98,
        minSpO2: 94,
      },
      heart: {
        avgSleepingHR: 60,
      },
      notes: '',
    },
    allowsAnonymizedSharing: true
  });
  const [isSaving, setIsSaving] = useState(false);

  const totalSteps = 5;

  const handleGoalToggle = (goalId: string) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(id => id !== goalId)
        : [...prev.goals, goalId]
    }));
  };

  const handleNeuroToggle = (factorId: string) => {
    setData(prev => ({
      ...prev,
      clinical: {
        ...prev.clinical!,
        neurological: prev.clinical?.neurological?.includes(factorId)
          ? prev.clinical.neurological.filter(id => id !== factorId)
          : [...(prev.clinical?.neurological || []), factorId]
      }
    }));
  };

  const handleSave = async () => {
    if (!user?.uid) {
      console.error('User UID is missing');
      return;
    }
    setIsSaving(true);
    
    // Safety timeout to prevent infinite loading if Firestore hangs
    const timeoutId = setTimeout(() => {
      console.warn('Firestore save timed out - closing wizard');
      setIsSaving(false);
      onClose();
    }, 10000);

    try {
      const profileRef = doc(db, 'users', user.uid, 'personalization', 'profile');
      const finalData = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(profileRef, finalData, { merge: true });
      clearTimeout(timeoutId);
      
      // Call onComplete which will update the profile in the parent
      onComplete(finalData as PersonalizationProfile);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error saving personalization profile:', error);
    } finally {
      // Always stop spinner and close wizard regardless of success
      setIsSaving(false);
      onClose();
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const getSleepinessLabel = (val: number) => {
    if (val <= 3) return "Normal alertness";
    if (val <= 6) return "Average fatigue";
    if (val <= 9) return "High sleep debt";
    return "Danger: See a specialist";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800">
          <motion.div 
            className="h-full bg-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-8 pt-10 flex flex-col h-full">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Personalization Wizard</h2>
              <p className="text-zinc-500 text-sm mt-1">Step {step + 1} of {totalSteps}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[450px] pr-2 scrollbar-hide">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step-demographics"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Demographics</h3>
                    <p className="text-sm text-zinc-400">Basic information to help SIA adjust sleep norms for your age and environment.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Age</label>
                        <input 
                          type="number" 
                          value={data.demographics.age}
                          onChange={(e) => setData(prev => ({ ...prev, demographics: { ...prev.demographics, age: parseInt(e.target.value) || 0 } }))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Biological Sex</label>
                        <select 
                          value={data.demographics.sex}
                          onChange={(e) => setData(prev => ({ ...prev, demographics: { ...prev.demographics, sex: e.target.value as any } }))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition-colors appearance-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Work Schedule</label>
                        <div className="grid grid-cols-1 gap-2">
                          {WORK_SCHEDULES.map(sched => (
                            <button
                              key={sched}
                              onClick={() => setData(prev => ({ ...prev, demographics: { ...prev.demographics, workSchedule: sched as any } }))}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${
                                data.demographics.workSchedule === sched 
                                  ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                              }`}
                            >
                              <Activity size={16} className={data.demographics.workSchedule === sched ? 'text-indigo-400' : 'text-zinc-600'} />
                              {sched}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Environment</label>
                        <div className="grid grid-cols-1 gap-2">
                          {ENVIRONMENT_TYPES.map(env => (
                            <button
                              key={env}
                              onClick={() => setData(prev => ({ ...prev, demographics: { ...prev.demographics, environmentType: env as any } }))}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${
                                data.demographics.environmentType === env 
                                  ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                              }`}
                            >
                              <Home size={16} className={data.demographics.environmentType === env ? 'text-indigo-400' : 'text-zinc-600'} />
                              {env}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step-goals"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">What are your primary sleep goals?</h3>
                    <p className="text-sm text-zinc-400">Select all that apply to help SIA tailor your insights.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {GOALS.map(goal => {
                      const Icon = goal.icon;
                      const isSelected = data.goals.includes(goal.id);
                      return (
                        <button
                          key={goal.id}
                          onClick={() => handleGoalToggle(goal.id)}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                            isSelected 
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' 
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            <Icon size={20} />
                          </div>
                          <span className="font-bold text-sm">{goal.label}</span>
                          {isSelected && <Check size={16} className="ml-auto text-indigo-400" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step-psqi"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Subjective Baseline (PSQI)</h3>
                    <p className="text-sm text-zinc-400">Help SIA understand your current sleep experience.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-zinc-300">Time to fall asleep (min)</label>
                        <span className="text-indigo-400 font-bold">{data.psqi.time_to_fall_asleep}m</span>
                      </div>
                      <input 
                        type="range" min="0" max="120" step="5"
                        value={data.psqi.time_to_fall_asleep}
                        onChange={(e) => setData(prev => ({ ...prev, psqi: { ...prev.psqi, time_to_fall_asleep: parseInt(e.target.value) } }))}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-zinc-300">Overall Sleep Quality</label>
                        <span className="text-indigo-400 font-bold">{data.psqi.sleep_quality}/10</span>
                      </div>
                      <input 
                        type="range" min="1" max="10" step="1"
                        value={data.psqi.sleep_quality}
                        onChange={(e) => setData(prev => ({ ...prev, psqi: { ...prev.psqi, sleep_quality: parseInt(e.target.value) } }))}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <label className="text-sm font-medium text-zinc-300">Daytime Sleepiness</label>
                          <p className="text-[10px] text-zinc-500">1 (Wide Awake) to 10 (Involuntary Sleep)</p>
                        </div>
                        <div className="text-right">
                          <span className="text-indigo-400 font-bold block leading-none">{data.psqi.daytime_sleepiness}/10</span>
                          <span className="text-[10px] text-indigo-500/70 font-medium">{getSleepinessLabel(data.psqi.daytime_sleepiness)}</span>
                        </div>
                      </div>
                      <input 
                        type="range" min="1" max="10" step="1"
                        value={data.psqi.daytime_sleepiness}
                        onChange={(e) => setData(prev => ({ ...prev, psqi: { ...prev.psqi, daytime_sleepiness: parseInt(e.target.value) } }))}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step-clinical"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">Clinical & Lab Data</h3>
                      <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded uppercase tracking-widest">Optional</span>
                    </div>
                    <p className="text-sm text-zinc-400">Enter data from professional reports or wearable sensors.</p>
                  </div>

                  {/* Sleep Architecture */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Sleep Architecture (%)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'n1', label: 'N1' },
                        { id: 'n2', label: 'N2' },
                        { id: 'n3', label: 'N3' },
                        { id: 'rem', label: 'REM' }
                      ].map(stage => (
                        <div key={stage.id} className="space-y-1">
                          <input 
                            type="number" 
                            placeholder={stage.label}
                            value={(data.clinical as any)[stage.id]}
                            onChange={(e) => setData(prev => ({ ...prev, clinical: { ...prev.clinical!, [stage.id]: parseInt(e.target.value) || 0 } }))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-center text-white focus:border-indigo-500 outline-none transition-colors text-sm"
                          />
                          <div className="text-[9px] text-zinc-600 text-center font-bold">{stage.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Neurological Factors */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Neurological Factors</label>
                    <div className="flex flex-wrap gap-2">
                      {NEURO_FACTORS.map(factor => {
                        const isSelected = data.clinical?.neurological?.includes(factor.id);
                        return (
                          <button
                            key={factor.id}
                            onClick={() => handleNeuroToggle(factor.id)}
                            className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                              isSelected 
                                ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                            }`}
                          >
                            {factor.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Oxygen & Heart */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Avg SpO2 (%)</label>
                      <div className="relative">
                        <Droplets size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input 
                          type="number" 
                          value={data.clinical?.oxygen?.avgSpO2}
                          onChange={(e) => setData(prev => ({ ...prev, clinical: { ...prev.clinical!, oxygen: { ...prev.clinical!.oxygen!, avgSpO2: parseInt(e.target.value) || 0 } } }))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 pl-8 text-white focus:border-indigo-500 outline-none transition-colors text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Min SpO2 (%)</label>
                      <div className="relative">
                        <Droplets size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input 
                          type="number" 
                          value={data.clinical?.oxygen?.minSpO2}
                          onChange={(e) => setData(prev => ({ ...prev, clinical: { ...prev.clinical!, oxygen: { ...prev.clinical!.oxygen!, minSpO2: parseInt(e.target.value) || 0 } } }))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 pl-8 text-white focus:border-indigo-500 outline-none transition-colors text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Avg Sleep HR</label>
                      <div className="relative">
                        <Heart size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input 
                          type="number" 
                          value={data.clinical?.heart?.avgSleepingHR}
                          onChange={(e) => setData(prev => ({ ...prev, clinical: { ...prev.clinical!, heart: { ...prev.clinical!.heart!, avgSleepingHR: parseInt(e.target.value) || 0 } } }))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 pl-8 text-white focus:border-indigo-500 outline-none transition-colors text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Clinical Report Summary</label>
                    <textarea 
                      value={data.clinical?.notes}
                      onChange={(e) => setData(prev => ({ ...prev, clinical: { ...prev.clinical!, notes: e.target.value } }))}
                      placeholder="Paste findings from your sleep report here..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm text-white h-24 resize-none focus:border-indigo-500 outline-none transition-colors"
                    />
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step-pledge"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Ethical Data Contribution</h3>
                    <p className="text-sm text-zinc-400">Help us advance sleep science while keeping SIA free for everyone.</p>
                  </div>

                  <EthicalDataPledge 
                    agreed={!!data.allowsAnonymizedSharing}
                    onToggle={(val) => setData(prev => ({ ...prev, allowsAnonymizedSharing: val }))}
                  />

                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                    <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                      * By contributing anonymized data, you are helping fund the research that powers our AI models. This allows us to offer advanced sleep analysis at no cost to our basic users.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                step === 0 ? 'opacity-0 pointer-events-none' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            {step < totalSteps - 1 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Get better results now
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
