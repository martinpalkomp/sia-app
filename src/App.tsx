/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Moon, 
  Sun, 
  BarChart3, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  Trash2,
  Coffee,
  Wine,
  Pill,
  Dumbbell,
  Smartphone,
  Brain,
  LogOut,
  LogIn,
  Stethoscope,
  Printer,
  X,
  FileText,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { DailyLog, SleepState } from './types';
import { 
  TOTAL_SLOTS, 
  SLEEP_STATES, 
  getSlotLabel
} from './constants';

import { format, isAfter, parseISO, startOfDay } from 'date-fns';

import { 
  getTodayDate, 
  getWeekDates, 
  getMonthDates, 
  getRangeDates, 
  formatDisplayDate 
} from './utils/dateUtils';
import { calculateSleepDuration, calculateSleepEfficiency } from './utils/sleepUtils';
import { calculateSafeAverage } from './utils/statsEngine';

import AIInsightsAgent from './components/AIInsightsAgent';
import Dashboard from './components/Dashboard';
import Legal from './components/Legal';
import DataImporter from './components/DataImporter';
import CorrectionHub from './components/CorrectionHub';
import { AvatarFrame } from './components/UI';

import { saveLog, validateLogMetrics } from './services/sleepService';

import { auth, googleProvider, db, isFirebaseConfigured } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  query, 
  where, 
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';

// --- Components ---

const SliderInput = ({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 10, 
  icon: Icon 
}: { 
  label: string; 
  value: number; 
  onChange: (val: number) => void; 
  min?: number; 
  max?: number;
  icon?: any;
}) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
        {Icon && <Icon size={16} className="text-indigo-400" />}
        {label}
      </label>
      <span className="text-lg font-bold text-white">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step="1"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
    />
    <div className="flex justify-between text-[10px] text-zinc-600 uppercase tracking-widest">
      <span>Low</span>
      <span>High</span>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [view, setView] = useState<'dashboard' | 'log' | 'weekly' | 'monthly' | 'custom' | 'ai' | 'legal' | 'import' | 'corrections'>('dashboard');
  const [customRange, setCustomRange] = useState({ start: getTodayDate(), end: getTodayDate() });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [clinicalReport, setClinicalReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [activeState, setActiveState] = useState<SleepState>('sleep');
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<'paint' | 'erase'>('paint');

  const correctionsCount = useMemo(() => {
    const trackingStartDate = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const start = startOfDay(parseISO(trackingStartDate));
    
    return (Object.values(logs) as DailyLog[])
      .filter((log: DailyLog) => {
        const logDate = parseISO(log.date);
        const isAfterStart = isAfter(logDate, start) || log.date === trackingStartDate;
        const isNotIgnored = !log.isIgnored;
        
        const hasTimeline = log.timeline && log.timeline.length > 0 && !log.timeline.every(s => s === 'awake-out');
        const hasSummaryMetrics = !!log.summaryMetrics;
        
        return isAfterStart && isNotIgnored && (!hasTimeline || !hasSummaryMetrics);
      }).length;
  }, [logs]);

  // Auth Listener
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load data from Firestore
  useEffect(() => {
    if (!user) {
      setLogs({});
      return;
    }

    const q = query(
      collection(db, 'user_data', user.uid, 'history'),
      where('type', '==', 'log')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs: Record<string, DailyLog> = {};
      snapshot.forEach((doc) => {
        const data = doc.data() as DailyLog;
        // Ensure timeline exists
        if (!data.timeline) {
          data.timeline = Array(TOTAL_SLOTS).fill('awake-out');
        }
        // Normalize logs to ensure correct timeline length
        if (data.timeline.length !== TOTAL_SLOTS) {
          if (data.timeline.length < TOTAL_SLOTS) {
            data.timeline = [...data.timeline, ...Array(TOTAL_SLOTS - data.timeline.length).fill('awake-out')];
          } else {
            data.timeline = data.timeline.slice(0, TOTAL_SLOTS);
          }
        }
        fetchedLogs[doc.id] = data;
      });
      setLogs(fetchedLogs);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError('This domain is not authorized in your Firebase project. Please add it to the "Authorized domains" list in the Firebase Console.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError('Google Sign-In is not enabled in your Firebase project. Please enable it in the "Authentication" section of the Firebase Console.');
      } else {
        setLoginError('Login failed. Please try again.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Save data to Firestore
  const saveLogs = async (newLogs: Record<string, DailyLog>, dateToUpdate?: string) => {
    if (!user) return;
    
    // If we have a specific date to update, only update that one in Firestore
    if (dateToUpdate) {
      const log = newLogs[dateToUpdate];
      if (log) {
        // Populate summaryMetrics before saving
        const summaryMetrics = {
          sleepQuality: log.sleepQuality,
          restedness: log.restedness,
          energyLevel: log.energyLevel,
          importedDuration: (log as any).importedDuration || 0,
          importedInBed: (log as any).importedInBed || 0,
        };

        if (validateLogMetrics(summaryMetrics)) {
          await saveLog(user.uid, {
            ...log,
            type: 'log',
            summaryMetrics,
            isIgnored: log.isIgnored || false,
          });
        } else {
          console.error("Invalid metrics detected, skipping save.");
        }
      } else {
        // If log is missing for that date, it was deleted
        await deleteDoc(doc(db, 'user_data', user.uid, 'history', dateToUpdate));
      }
    }
  };

  const currentLog = useMemo(() => {
    const defaultFactors = {
      caffeine: { consumed: false, amount: 0, lastIntake: '' },
      alcohol: { consumed: false, drinks: 0, lastIntake: '' },
      medication: { taken: false, type: '', time: '' },
      exercise: { completed: false, type: '', time: '' },
      screensInBed: false,
      stressLevel: 3
    };

    const log = logs[selectedDate] || {
      date: selectedDate,
      type: 'log',
      sleepQuality: 5,
      restedness: 5,
      energyLevel: 5,
      timeline: Array(TOTAL_SLOTS).fill('awake-out'),
      remarks: '',
      isIgnored: false,
      summaryMetrics: {
        sleepQuality: 5,
        restedness: 5,
        energyLevel: 5,
        importedDuration: 0,
        importedInBed: 0,
      },
      factors: defaultFactors
    };
    
    // Ensure factors exist for legacy logs
    if (!log.factors) {
      log.factors = defaultFactors;
    }
    
    // Ensure timeline is always the correct length
    if (log.timeline.length < TOTAL_SLOTS) {
      const padding = Array(TOTAL_SLOTS - log.timeline.length).fill('awake-out');
      log.timeline = [...log.timeline, ...padding];
    } else if (log.timeline.length > TOTAL_SLOTS) {
      log.timeline = log.timeline.slice(0, TOTAL_SLOTS);
    }
    
    return log;
  }, [logs, selectedDate]);

  const updateLog = (updates: Partial<DailyLog>) => {
    const newLog = { ...currentLog, ...updates };
    const newLogs = { ...logs, [selectedDate]: newLog };
    setLogs(newLogs);
    saveLogs(newLogs, selectedDate);
  };

  const updateFactors = (updates: Partial<DailyLog['factors']>) => {
    updateLog({ factors: { ...currentLog.factors, ...updates } });
  };

  const setSlotState = (index: number, state: SleepState) => {
    const newTimeline = [...currentLog.timeline];
    newTimeline[index] = state;
    updateLog({ timeline: newTimeline });
  };

  const handleMouseDown = (index: number) => {
    setIsDragging(true);
    const currentState = currentLog.timeline[index];
    const nextState = currentState === activeState ? 'awake-out' : activeState;
    setDragAction(nextState === 'awake-out' ? 'erase' : 'paint');
    setSlotState(index, nextState);
  };

  const handleMouseEnter = (index: number) => {
    if (!isDragging) return;
    const nextState = dragAction === 'erase' ? 'awake-out' : activeState;
    if (currentLog.timeline[index] !== nextState) {
      setSlotState(index, nextState);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const monthDates = useMemo(() => getMonthDates(selectedDate), [selectedDate]);
  const customDates = useMemo(() => getRangeDates(customRange.start, customRange.end), [customRange]);

  const activeDates = useMemo(() => {
    if (view === 'weekly') return weekDates;
    if (view === 'monthly') return monthDates;
    if (view === 'custom') return customDates;
    return [selectedDate];
  }, [view, selectedDate, weekDates, monthDates, customDates]);

  const averageStats = useMemo(() => {
    const periodLogs = activeDates.map(d => logs[d]).filter(Boolean);
    if (periodLogs.length === 0) return null;

    return {
      sq: calculateSafeAverage(periodLogs, 'sleepQuality').average.toFixed(1),
      r: calculateSafeAverage(periodLogs, 'restedness').average.toFixed(1),
      l: calculateSafeAverage(periodLogs, 'energyLevel').average.toFixed(1),
      duration: calculateSafeAverage(periodLogs, 'sleepDuration').average.toFixed(1),
      efficiency: calculateSafeAverage(periodLogs, 'efficiency').average.toFixed(1)
    };
  }, [logs, activeDates]);

  const generateClinicalReport = async () => {
    if (isGeneratingReport || !user) return;
    setIsGeneratingReport(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const periodLogs = activeDates
        .map(d => logs[d])
        .filter(Boolean)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const reportPrompt = `
        Generate a professional, clinical "Clinical Sleep Report" using the SOAP (Subjective, Objective, Assessment, Plan) format.
        
        DATA FOR ANALYSIS (${view.toUpperCase()} VIEW):
        LOGS: ${JSON.stringify(periodLogs)}
        AVERAGE STATS: ${JSON.stringify(averageStats)}
        PERIOD: ${activeDates[0]} to ${activeDates[activeDates.length - 1]}
        
        REPORT REQUIREMENTS:
        1. Format: Professional, clinical structure for a Sleep Therapist or Physician.
        2. Sections:
           - Patient Overview: Brief summary of the tracking period.
           - Quantitative Metrics: Averages for sleep duration, sleep onset latency, and wake-after-sleep-onset (WASO).
           - Disturbance Log: Frequency and intensity of Nightmares/Night Terrors.
           - Symptom Trends: Identification of recurring patterns (e.g., "User reports higher anxiety on Sunday nights leading to fragmented sleep").
           - AI Insights: SIA’s high-level interpretation of the data trends.
        3. Tone: Objective, concise, and medical (e.g., use "fragmented sleep" instead of "bad sleep").
        4. Footer: Include the mandatory privacy disclaimer: "This report was generated by SIA (Sleep Intelligence Agent). It is intended for informational support and should be reviewed by a licensed medical professional."
        
        Output the report in Markdown format.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: reportPrompt }] }]
      });

      if (response.text) {
        setClinicalReport(response.text);
      }
    } catch (error) {
      console.error("Report Generation Error:", error);
      alert("Failed to generate clinical report. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>SIA Clinical Report - ${user.displayName || 'Patient'}</title>
          <style>
            body { font-family: 'Georgia', serif; padding: 40px; line-height: 1.6; color: #1a1a1a; }
            h1, h2, h3 { color: #000; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 12px; color: #666; font-style: italic; }
            pre { white-space: pre-wrap; word-wrap: break-word; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SIA Clinical Sleep Report</h1>
            <p><strong>Patient:</strong> ${user.displayName || 'N/A'}</p>
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Period:</strong> ${activeDates[0]} to ${activeDates[activeDates.length - 1]}</p>
          </div>
          <div class="content">
            ${clinicalReport?.replace(/\n/g, '<br/>')}
          </div>
          <div class="footer">
            This report was generated by SIA (Sleep Intelligence Agent). It is intended for informational support and should be reviewed by a licensed medical professional.
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-[#0a0c10] text-zinc-100 font-sans flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900/50 border border-red-500/30 p-8 rounded-[2.5rem] text-center space-y-6 shadow-2xl"
        >
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-900/20 rounded-2xl flex items-center justify-center border border-red-500/30">
              <Info className="text-red-400" size={32} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Configuration Required</h1>
            <p className="text-zinc-400 text-sm">
              Firebase configuration is missing or incomplete. Please provide your Firebase API keys in the <strong>Settings</strong> menu.
            </p>
          </div>
          <div className="bg-zinc-900/80 p-4 rounded-2xl text-left space-y-2 border border-zinc-800">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Required Keys:</p>
            <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
              <li>VITE_FIREBASE_API_KEY</li>
              <li>VITE_FIREBASE_PROJECT_ID</li>
              <li>VITE_FIREBASE_APP_ID</li>
            </ul>
          </div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Check .env.example for details</p>
        </motion.div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0c10] text-zinc-100 font-sans flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {view === 'legal' ? (
            <div className="max-w-4xl w-full">
              <Legal onBack={() => setView('dashboard')} />
            </div>
          ) : (
            <motion.div 
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] text-center space-y-8 shadow-2xl"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20">
                  <img src="https://i.imgur.com/MnI5hn3.png" alt="SIA" className="w-12 h-12 object-contain" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Welcome to SIA</h1>
                <p className="text-zinc-500 text-sm">Your Sleep Intelligence Agent is ready to analyze your recovery. Please sign in to continue.</p>
              </div>

              {loginError && (
                <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-2xl text-left space-y-2">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                    <Info size={14} />
                    Login Error
                  </div>
                  <p className="text-xs text-red-200/70 leading-relaxed">
                    {loginError}
                  </p>
                  {loginError.includes('unauthorized-domain') && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Domains to authorize:</p>
                      <code className="block bg-black/40 p-2 rounded text-[9px] text-zinc-400 break-all">
                        ais-dev-fmg7uq3djal22v6onfvt5h-575319715638.europe-west2.run.app
                      </code>
                      <code className="block bg-black/40 p-2 rounded text-[9px] text-zinc-400 break-all">
                        ais-pre-fmg7uq3djal22v6onfvt5h-575319715638.europe-west2.run.app
                      </code>
                    </div>
                  )}
                  {loginError.includes('Google Sign-In is not enabled') && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">How to fix:</p>
                      <ol className="text-[10px] text-zinc-400 space-y-1 list-decimal list-inside">
                        <li>Go to Firebase Console &gt; Authentication</li>
                        <li>Click "Sign-in method" tab</li>
                        <li>Click "Add new provider" &gt; Google</li>
                        <li>Enable it and click "Save"</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-left p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                  <input 
                    type="checkbox" 
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="terms" className="text-xs text-zinc-400 leading-relaxed cursor-pointer">
                    I agree to the <button onClick={() => setView('legal')} className="text-indigo-400 hover:underline">Terms of Use</button> and acknowledge that my anonymized data may be used for scientific research and personalized marketing.
                  </label>
                </div>

                <button 
                  onClick={handleLogin}
                  disabled={!agreedToTerms}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all group ${
                    agreedToTerms 
                      ? 'bg-white text-black hover:bg-zinc-100' 
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <LogIn size={20} />
                  Sign in with Google
                </button>
              </div>

              <div className="pt-4 border-t border-zinc-800/50">
                <button 
                  onClick={() => setView('legal')}
                  className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold hover:text-zinc-400 transition-colors"
                >
                  Legal & Privacy Information
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-clinical-bg/80 backdrop-blur-md border-b border-clinical-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('dashboard')}>
              <AvatarFrame 
                src="https://i.imgur.com/MnI5hn3.png" 
                alt="SIA" 
                size="sm"
                className="shadow-lg shadow-indigo-500/20 border-indigo-500/30 bg-indigo-600"
              />
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">SIA</h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Sleep Intelligence Agent</p>
              </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50 overflow-x-auto max-w-full">
              {['dashboard', 'log', 'insights', 'corrections', 'ai'].map((v) => (
                <button 
                  key={v}
                  onClick={() => setView(v === 'insights' ? 'weekly' : v as any)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest whitespace-nowrap flex items-center gap-2 ${
                    view === v || (v === 'insights' && ['weekly', 'monthly', 'custom'].includes(view))
                      ? 'bg-zinc-800 text-white shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  } ${v === 'ai' ? 'border border-indigo-500/30 bg-indigo-500/5 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.1)]' : ''} ${v === 'corrections' ? 'text-amber-400' : ''}`}
                >
                  {v === 'ai' ? 'AI ANALYSIS' : v}
                  {v === 'corrections' && correctionsCount > 0 && (
                    <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center">
                      {correctionsCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-500 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {view === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Dashboard 
                logs={logs} 
                onLogClick={() => {
                  setSelectedDate(getTodayDate());
                  setView('log');
                }}
                onViewChange={setView}
              />
            </motion.div>
          ) : view === 'corrections' ? (
            <motion.div
              key="corrections"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CorrectionHub 
                user={user} 
                logs={logs} 
                onUpdate={() => {}} 
              />
            </motion.div>
          ) : view === 'log' ? (
            <motion.div 
              key="log"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Date Selector */}
              <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                <button 
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                  <div className="text-sm font-semibold">{formatDisplayDate(selectedDate)}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Selected Entry</div>
                </div>
                <button 
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Timeline Section */}
              <section className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Sleep Window</h2>
                    <p className="text-[10px] text-zinc-600 mt-1">20:00 to 20:00 (24h Tracking)</p>
                  </div>
                  <div className="flex gap-2">
                    {SLEEP_STATES.filter(s => s.value !== 'awake-out').map((state) => (
                      <button
                        key={state.value}
                        onClick={() => setActiveState(state.value)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          activeState === state.value 
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                            : 'border-zinc-800 text-zinc-500'
                        }`}
                      >
                        {state.value === 'awake-in' ? 'Awake In Bed' : state.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden select-none flex flex-col divide-y divide-zinc-800/50">
                  {[0, 1, 2, 3, 4, 5].map((rowIdx) => (
                    <div key={rowIdx} className="flex">
                      <div className="w-12 flex-shrink-0 flex items-center justify-center border-r border-zinc-800/50 bg-zinc-900/80">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">
                          {getSlotLabel(rowIdx * 16).split(':')[0]}h
                        </span>
                      </div>
                      <div className="grid grid-cols-16 gap-0 flex-1">
                        {currentLog.timeline.slice(rowIdx * 16, (rowIdx + 1) * 16).map((state, localIdx) => {
                          const idx = rowIdx * 16 + localIdx;
                          const stateInfo = SLEEP_STATES.find(s => s.value === state);
                          const isHourStart = idx % 4 === 0;
                          return (
                            <button
                              key={idx}
                              onMouseDown={() => handleMouseDown(idx)}
                              onMouseEnter={() => handleMouseEnter(idx)}
                              className={`h-12 flex flex-col items-center justify-center relative group transition-all border-r border-zinc-800/30 last:border-r-0 ${stateInfo?.color} hover:brightness-125 cursor-crosshair`}
                              title={getSlotLabel(idx)}
                            >
                              <span className="text-[8px] text-zinc-500 opacity-0 group-hover:opacity-100 absolute -top-4 bg-black px-1 rounded border border-zinc-800 z-10 whitespace-nowrap pointer-events-none">
                                {getSlotLabel(idx)}
                              </span>
                              {isHourStart && (
                                <span className="text-[7px] text-zinc-400 font-mono font-bold pointer-events-none">
                                  {getSlotLabel(idx).split(':')[1] === '00' ? getSlotLabel(idx).split(':')[0] : ''}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between text-[10px] text-zinc-500 px-1 italic">
                  <span>Start: 20:00</span>
                  <span>Duration: {calculateSleepDuration(currentLog.timeline)} hrs</span>
                  <span>End: {getSlotLabel(TOTAL_SLOTS)}</span>
                </div>
              </section>

              {/* Daily Factors & Disturbances Section */}
              <section className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/50 space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Daily Factors & Disturbances</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Caffeine */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Coffee size={18} className="text-amber-500" />
                        <span className="text-sm font-medium">Caffeine</span>
                      </div>
                      <button 
                        onClick={() => updateFactors({ caffeine: { ...currentLog.factors.caffeine, consumed: !currentLog.factors.caffeine.consumed } })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${currentLog.factors.caffeine.consumed ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentLog.factors.caffeine.consumed ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    {currentLog.factors.caffeine.consumed && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Amount (mg/cups)</label>
                          <input 
                            type="number" 
                            value={currentLog.factors.caffeine.amount} 
                            onChange={(e) => updateFactors({ caffeine: { ...currentLog.factors.caffeine, amount: parseInt(e.target.value) || 0 } })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Last Intake</label>
                          <input 
                            type="time" 
                            value={currentLog.factors.caffeine.lastIntake} 
                            onChange={(e) => updateFactors({ caffeine: { ...currentLog.factors.caffeine, lastIntake: e.target.value } })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Alcohol */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Wine size={18} className="text-red-500" />
                        <span className="text-sm font-medium">Alcohol</span>
                      </div>
                      <button 
                        onClick={() => updateFactors({ alcohol: { ...currentLog.factors.alcohol, consumed: !currentLog.factors.alcohol.consumed } })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${currentLog.factors.alcohol.consumed ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentLog.factors.alcohol.consumed ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    {currentLog.factors.alcohol.consumed && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Drinks</label>
                          <input 
                            type="number" 
                            value={currentLog.factors.alcohol.drinks} 
                            onChange={(e) => updateFactors({ alcohol: { ...currentLog.factors.alcohol, drinks: parseInt(e.target.value) || 0 } })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Last Intake</label>
                          <input 
                            type="time" 
                            value={currentLog.factors.alcohol.lastIntake} 
                            onChange={(e) => updateFactors({ alcohol: { ...currentLog.factors.alcohol, lastIntake: e.target.value } })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Medication */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Pill size={18} className="text-blue-400" />
                        <span className="text-sm font-medium">Medication</span>
                      </div>
                      <button 
                        onClick={() => updateFactors({ medication: { ...currentLog.factors.medication, taken: !currentLog.factors.medication.taken } })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${currentLog.factors.medication.taken ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentLog.factors.medication.taken ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    {currentLog.factors.medication.taken && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Type</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Melatonin"
                            value={currentLog.factors.medication.type} 
                            onChange={(e) => updateFactors({ medication: { ...currentLog.factors.medication, type: e.target.value } })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Time</label>
                          <input 
                            type="time" 
                            value={currentLog.factors.medication.time} 
                            onChange={(e) => updateFactors({ medication: { ...currentLog.factors.medication, time: e.target.value } })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Exercise */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Dumbbell size={18} className="text-emerald-500" />
                        <span className="text-sm font-medium">Exercise</span>
                      </div>
                      <button 
                        onClick={() => updateFactors({ exercise: { ...currentLog.factors.exercise, completed: !currentLog.factors.exercise.completed } })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${currentLog.factors.exercise.completed ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentLog.factors.exercise.completed ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    {currentLog.factors.exercise.completed && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Type</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Cardio"
                            value={currentLog.factors.exercise.type} 
                            onChange={(e) => updateFactors({ exercise: { ...currentLog.factors.exercise, type: e.target.value } })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Time</label>
                          <input 
                            type="time" 
                            value={currentLog.factors.exercise.time} 
                            onChange={(e) => updateFactors({ exercise: { ...currentLog.factors.exercise, time: e.target.value } })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Screens in Bed */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Smartphone size={18} className="text-zinc-500" />
                      <span className="text-sm font-medium">Screens in Bed</span>
                    </div>
                    <button 
                      onClick={() => updateFactors({ screensInBed: !currentLog.factors.screensInBed })}
                      className={`w-10 h-5 rounded-full transition-colors relative ${currentLog.factors.screensInBed ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentLog.factors.screensInBed ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* Stress Level */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Brain size={18} className="text-purple-400" />
                      <span className="text-sm font-medium">Stress Level</span>
                      <span className="ml-auto text-sm font-bold text-white">{currentLog.factors.stressLevel}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      value={currentLog.factors.stressLevel} 
                      onChange={(e) => updateFactors({ stressLevel: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[8px] text-zinc-600 uppercase font-bold">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Metrics Section */}
              <section className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/50 space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">Daily Metrics</h2>
                <div className="grid gap-8">
                  <SliderInput 
                    label="Sleep Quality (SQ)" 
                    value={currentLog.sleepQuality} 
                    onChange={(val) => updateLog({ sleepQuality: val })}
                    icon={Moon}
                  />
                  <SliderInput 
                    label="Restedness after Awakening (R)" 
                    value={currentLog.restedness} 
                    onChange={(val) => updateLog({ restedness: val })}
                    icon={Sun}
                  />
                  <SliderInput 
                    label="Energy Level in the Morning (L)" 
                    value={currentLog.energyLevel} 
                    onChange={(val) => updateLog({ energyLevel: val })}
                    icon={BarChart3}
                  />
                </div>
              </section>

              {/* Remarks Section */}
              <section className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Remarks & Notes</label>
                <textarea
                  value={currentLog.remarks}
                  onChange={(e) => updateLog({ remarks: e.target.value })}
                  placeholder="Last night I went to bed at 23 pm. It took about 45 minutes to fall asleep. Around 2 am I woke up because I had to go to the bathroom. After 30 minutes of lying awake I came out of the bed and went back in around 4 am. Here I stayed awake until 5 am before falling asleep again. At 6.30 am I woke up to go to work...."
                  className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-zinc-700"
                />
              </section>

              <DataImporter user={user} onImportComplete={() => {}} />

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    const newLogs = { ...logs };
                    delete newLogs[selectedDate];
                    setLogs(newLogs);
                    saveLogs(newLogs, selectedDate);
                  }}
                  className="flex-1 py-4 bg-zinc-900 hover:bg-red-900/20 text-zinc-500 hover:text-red-400 rounded-2xl font-bold text-sm transition-all border border-zinc-800 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Reset Day
                </button>
              </div>
            </motion.div>
          ) : view === 'ai' ? (
            <motion.div
              key="ai"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Sleep Intelligence Agent</h2>
                <p className="text-sm text-zinc-500">Advanced correlation analysis of your sleep history</p>
              </div>
              <AIInsightsAgent logs={logs} user={user} />
            </motion.div>
          ) : view === 'legal' ? (
            <Legal onBack={() => setView('dashboard')} />
          ) : (
            <motion.div 
              key="insights"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              {/* Insights Header */}
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight capitalize">Insights</h2>
                  <p className="text-sm text-zinc-500">
                    {formatDisplayDate(activeDates[0])} — {formatDisplayDate(activeDates[activeDates.length - 1])}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-4">
                  {/* Secondary Tab Bar */}
                  <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                    {['weekly', 'monthly', 'custom'].map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setView(sub as any)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                          (view === sub || (view === 'insights' && sub === 'weekly'))
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={generateClinicalReport}
                    disabled={isGeneratingReport || !averageStats}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest text-indigo-400 transition-all disabled:opacity-50"
                  >
                    {isGeneratingReport ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Stethoscope size={14} />
                    )}
                    Generate Clinical Report
                  </button>
                </div>
              </div>
                
                {view === 'custom' && (
                  <div className="flex flex-wrap justify-center gap-4 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800">
                    <div className="space-y-1 text-left">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold ml-1">Start Date</p>
                      <input 
                        type="date" 
                        value={customRange.start}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                        className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold ml-1">End Date</p>
                      <input 
                        type="date" 
                        value={customRange.end}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                        className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

              {/* Averages Grid */}
              {averageStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Avg Quality</p>
                    <p className="text-2xl font-bold text-indigo-400">{averageStats.sq}<span className="text-xs text-zinc-600 ml-1">/10</span></p>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Avg Rested</p>
                    <p className="text-2xl font-bold text-emerald-400">{averageStats.r}<span className="text-xs text-zinc-600 ml-1">/10</span></p>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Avg Energy</p>
                    <p className="text-2xl font-bold text-amber-400">{averageStats.l}<span className="text-xs text-zinc-600 ml-1">/10</span></p>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Avg Sleep</p>
                    <p className="text-2xl font-bold text-white">{averageStats.duration}<span className="text-xs text-zinc-600 ml-1">hrs</span></p>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Avg Efficiency</p>
                    <p className="text-2xl font-bold text-purple-400">{averageStats.efficiency}<span className="text-xs text-zinc-600 ml-1">%</span></p>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-12 rounded-3xl text-center">
                  <Info className="mx-auto text-zinc-700 mb-3" size={32} />
                  <p className="text-zinc-500 text-sm">No data logged for this period yet.</p>
                </div>
              )}

              {/* Breakdown List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Daily Breakdown</h3>
                {activeDates.slice().reverse().map(date => {
                  const log = logs[date];
                  const isToday = date === getTodayDate();
                  return (
                    <button 
                      key={date}
                      onClick={() => {
                        setSelectedDate(date);
                        setView('log');
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        log 
                          ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' 
                          : 'bg-transparent border-zinc-900 hover:bg-zinc-900/30'
                      } ${isToday ? 'ring-1 ring-indigo-500/50' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${log ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-zinc-800'}`} />
                        <div className="text-left">
                          <p className="text-sm font-bold">{formatDisplayDate(date)}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                            {log ? `${calculateSleepDuration(log.timeline)} hrs sleep` : 'No entry'}
                          </p>
                        </div>
                      </div>
                      {log && (
                        <div className="flex gap-3 text-xs font-mono">
                          <span className="text-indigo-400">Q:{log.sleepQuality}</span>
                          <span className="text-emerald-400">R:{log.restedness}</span>
                          <span className="text-purple-400">E:{calculateSleepEfficiency(log.timeline)}%</span>
                        </div>
                      )}
                      {!log && <Plus size={16} className="text-zinc-700" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Legal Link */}
        <div className="mt-12 pt-8 border-t border-zinc-800/50 text-center">
          <button 
            onClick={() => setView('legal')}
            className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold hover:text-zinc-400 transition-colors"
          >
            Legal, Terms & Privacy
          </button>
        </div>
      </main>

      {/* Clinical Report Overlay */}
      <AnimatePresence>
        {clinicalReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Report Header */}
              <div className="px-8 py-6 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">Clinical Sleep Report</h2>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">SOAP Analysis • {view.toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors"
                  >
                    <Printer size={14} />
                    Print / PDF
                  </button>
                  <button
                    onClick={() => setClinicalReport(null)}
                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Report Content */}
              <div 
                ref={reportRef}
                className="flex-1 overflow-y-auto p-12 md:p-16 bg-white text-zinc-900 font-serif leading-relaxed"
              >
                <div className="max-w-2xl mx-auto space-y-8">
                  <div className="border-b-2 border-zinc-900 pb-8 mb-8">
                    <div className="grid grid-cols-2 gap-8 text-sm font-sans uppercase tracking-widest font-bold text-zinc-500">
                      <div>
                        <p className="mb-1">Patient Name</p>
                        <p className="text-zinc-900">{user.displayName || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="mb-1">Report Date</p>
                        <p className="text-zinc-900">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-[10px] text-zinc-400 uppercase tracking-widest font-bold font-sans">
                      Period: {activeDates[0]} to {activeDates[activeDates.length - 1]}
                    </div>
                  </div>

                  <div className="prose prose-zinc max-w-none">
                    {clinicalReport.split('\n').map((line, i) => {
                      if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold text-black mb-6 mt-12 font-sans">{line.replace('# ', '')}</h1>;
                      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-black mb-4 mt-8 border-b border-zinc-200 pb-2 font-sans">{line.replace('## ', '')}</h2>;
                      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-black mb-3 mt-6 font-sans">{line.replace('### ', '')}</h3>;
                      if (!line.trim()) return <div key={i} className="h-4" />;
                      return <p key={i} className="mb-4 text-zinc-800">{line}</p>;
                    })}
                  </div>

                  <div className="mt-16 pt-8 border-t border-zinc-200 text-[10px] text-zinc-400 italic font-sans text-center">
                    This report was generated by SIA (Sleep Intelligence Agent). It is intended for informational support and should be reviewed by a licensed medical professional.
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Today (Mobile) */}
      {view !== 'log' && (
        <button 
          onClick={() => {
            setSelectedDate(getTodayDate());
            setView('log');
          }}
          className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform z-50"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
}
