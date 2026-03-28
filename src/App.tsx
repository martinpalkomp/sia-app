/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { 
  Moon, 
  Sun, 
  BarChart3, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
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
  Check,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Wand2,
  Lightbulb,
  Rocket,
  UtensilsCrossed,
  Sunrise,
  Wind,
  Flame,
  Leaf,
  Flower2,
  Snowflake,
  Volume2,
  EyeOff,
  Ear,
  Bed,
  Circle,
  Watch,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { DailyLog, SleepState, PersonalizationProfile } from './types';
import { 
  TOTAL_SLOTS, 
  SLEEP_STATES, 
  getSlotLabel
} from './constants';

const getDefaultLog = (date: string): DailyLog => ({
  date: date,
  type: 'log',
  factors: {
    caffeine: { consumed: false, amount: 0, lastIntake: '' },
    alcohol: { consumed: false, drinks: 0, lastIntake: '' },
    medication: { taken: false, type: '', time: '' },
    exercise: { completed: false, type: '', time: '' },
    screensInBed: false,
    stressLevel: 3,
    lastMealTime: '',
    naturalWake: false,
    moodScore: 3,
    sleepGadgets: []
  },
  sleepEvents: [],
  daily_remarks: '',
  sleep_quality: 3,
  morning_alertness: 3,
  daytime_energy: 3,
  source: 'manual',
  isIgnored: false
});

import { format, isAfter, parseISO, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval, endOfDay, subDays } from 'date-fns';

import { 
  getTodayDate, 
  getWeekDates, 
  getMonthDates, 
  getRangeDates, 
  formatDisplayDate 
} from './utils/dateUtils';
import { 
  calculateSleepDuration, 
  calculateSleepEfficiency, 
  calculateTimeInBed,
  formatDuration, 
  snapTo15Min,
  getGridFromEvents,
  convertGridToEvents,
  migrateTimelineToEvents,
  timeToIndex,
  indexToTime
} from './utils/sleepUtils';
import { calculateSafeAverage } from './utils/statsEngine';

import Legal from './components/Legal';
import CorrectionHub from './components/CorrectionHub';
const AIInsightsAgent = lazy(() => import('./components/AIInsightsAgent'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const PersonalizationWizard = lazy(() => import('./components/PersonalizationWizard'));
import AccountPage from './components/AccountPage';
import SleepRibbon from './components/SleepRibbon';
import SleepPatternCard from './components/SleepPatternCard';
import { SleepWindow } from './components/SleepWindow';
import DataImporter from './components/DataImporter';
import { AvatarFrame, MetricDisplay } from './components/UI';
import { Navbar } from './components/Navbar';
import { SiaPatternReview } from './components/SiaPatternReview';

import { saveLog, validateLogMetrics } from './services/sleepService';
import { getSuggestedLog, AICorrection, SuggestionResult } from './utils/patternEngine';

import { 
  auth, 
  googleProvider, 
  db, 
  isFirebaseConfigured,
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User,
  collection, 
  doc, 
  query, 
  where, 
  deleteDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  getDocs,
  setPersistence,
  browserLocalPersistence
} from './lib/firebase';
import { MaturityInfo, AIService } from './services/aiService';

// Lazy load heavy components
const SleepGuideInteractive = React.lazy(() => import('./components/SleepGuideInteractive'));

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
  const [direction, setDirection] = useState(0);
  const [view, setView] = useState<'dashboard' | 'log' | 'weekly' | 'monthly' | 'custom' | 'ai' | 'corrections' | 'legal' | 'account' | 'import'>('dashboard');
  const [customRange, setCustomRange] = useState({ start: getTodayDate(), end: getTodayDate() });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [clinicalReport, setClinicalReport] = useState<string | null>(null);
  const [personalizationProfile, setPersonalizationProfile] = useState<PersonalizationProfile | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [showPersonalizationWizard, setShowPersonalizationWizard] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [activeState, setActiveState] = useState<SleepState>('sleep');
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [initialTimeline, setInitialTimeline] = useState<SleepState[] | null>(null);
  const [dragAction, setDragAction] = useState<'paint' | 'erase'>('paint');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showSleepGuide, setShowSleepGuide] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiCorrections, setAiCorrections] = useState<AICorrection[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<SuggestionResult | null>(null);
  const [prefillUsed, setPrefillUsed] = useState(false);
  const [originalSuggestion, setOriginalSuggestion] = useState<Partial<DailyLog> | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showPrefillConfirm, setShowPrefillConfirm] = useState(false);
  const [maturity, setMaturity] = useState<MaturityInfo | null>(null);
  const [isSleepToolsExpanded, setIsSleepToolsExpanded] = useState(false);
  const [showPatternReview, setShowPatternReview] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] = useState<SuggestionResult | null>(null);

  const derivedTier = useMemo(() => {
    // Temporary override for testing
    if (import.meta.env.DEV) {
      const override = localStorage.getItem('sia_tier_override');
      if (override) return override;
    }

    if (userProfile?.tier === 'Pro') return 'Pro';
    if (personalizationProfile) return 'Enhanced';
    return 'Basic';
  }, [userProfile, personalizationProfile]);

  const currentLog = useMemo(() => {
    const defaultFactors = {
      caffeine: { consumed: false, amount: 0, lastIntake: '' },
      alcohol: { consumed: false, drinks: 0, lastIntake: '' },
      medication: { taken: false, type: '', time: '' },
      exercise: { completed: false, type: '', time: '' },
      screensInBed: false,
      stressLevel: 3,
      lastMealTime: '',
      naturalWake: false,
      moodScore: 3,
      sleepGadgets: []
    };

    const log = (logs[selectedDate] || {
      date: selectedDate,
      type: 'log',
      sleep_quality: 5,
      morning_alertness: 5,
      daytime_energy: 5,
      sleepEvents: [],
      daily_remarks: '',
      isIgnored: false,
      source: 'manual',
      summaryMetrics: {
        sleep_quality: 5,
        morning_alertness: 5,
        daytime_energy: 5,
        importedDuration: 0,
        importedInBed: 0,
        sleep_efficiency: 0,
      },
      factors: defaultFactors
    }) as DailyLog;
    
    // Ensure factors exist for legacy logs
    if (!log.factors) {
      log.factors = defaultFactors;
    }
    
    // Migration: If log has timeline but no sleepEvents, migrate it
    if (!log.sleepEvents || log.sleepEvents.length === 0) {
      if (log.timeline && log.timeline.length > 0 && !log.timeline.every(s => s === 'awake-out')) {
        log.sleepEvents = migrateTimelineToEvents(log.timeline);
      } else {
        log.sleepEvents = [];
      }
    }

    // Generate visual timeline for UI
    const visualTimeline = getGridFromEvents(log.sleepEvents);
    
    return { ...log, visualTimeline };
  }, [logs, selectedDate]);

  const sleepWindowText = useMemo(() => {
    if (!currentLog.sleepEvents || currentLog.sleepEvents.length === 0) {
      return "20:00 to 20:00 (24h Tracking)";
    }
    const sleepEvents = currentLog.sleepEvents.filter(e => e.type === 'sleep');
    if (sleepEvents.length === 0) return "20:00 to 20:00 (24h Tracking)";
    
    let minIdx = 96;
    let maxIdx = -1;
    let earliestStart = "";
    let latestEnd = "";

    sleepEvents.forEach(e => {
      const sIdx = timeToIndex(e.start);
      const eIdx = timeToIndex(e.end);
      if (sIdx < minIdx) {
        minIdx = sIdx;
        earliestStart = e.start;
      }
      if (eIdx > maxIdx) {
        maxIdx = eIdx;
        latestEnd = e.end;
      }
    });

    if (!earliestStart || !latestEnd) return "20:00 to 20:00 (24h Tracking)";
    return `${earliestStart} to ${latestEnd}`;
  }, [currentLog.sleepEvents]);

  useEffect(() => {
    if (currentLog.factors.sleepGadgets && currentLog.factors.sleepGadgets.length > 0) {
      setIsSleepToolsExpanded(true);
    } else {
      setIsSleepToolsExpanded(false);
    }
  }, [selectedDate]);

  const historyCount = useMemo(() => Object.keys(logs).length, [logs]);

  const refreshAllData = async () => {
    setIsRefreshing(true);
    // Incrementing refreshKey will trigger the useEffect to re-subscribe/re-fetch
    setRefreshKey(prev => prev + 1);
    
    // Simulate a brief delay for visual feedback if it's too fast
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsRefreshing(false);
    setToast({ message: 'Sync Complete', type: 'success' });
  };

  const changeDate = (val: number | string) => {
    if (typeof val === 'number') {
      setDirection(val);
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + val);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else {
      setSelectedDate(val);
    }
    // Reset prefill state when changing date
    setPrefillUsed(false);
    setOriginalSuggestion(null);
  };

  const applySuggestion = () => {
    if (!activeSuggestion) return;
    setPendingSuggestion(activeSuggestion);
    setShowPatternReview(true);
  };

  const slotToTimeString = (slotIndex: number) => {
    const totalMinutes = slotIndex * 15;
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleConfirmPattern = () => {
    if (!pendingSuggestion) return;
    const suggestion = pendingSuggestion.suggestion as any;
    console.log("DEBUG: SIA Suggestion Received:", suggestion);
    
    // Bridge any naming gaps between AI and the Log Form
    const appliedMetrics = {
      sleep_quality: Number(suggestion.sleep_quality || suggestion.quality || 5),
      morning_alertness: Number(suggestion.morning_alertness || suggestion.alertness || 5),
      daytime_energy: Number(suggestion.daytime_energy || suggestion.energy || 5)
    };
    
    console.log("DEBUG: Applied Metrics:", appliedMetrics);

    setOriginalSuggestion(suggestion);
    setPrefillUsed(true);

    // Create a deep-merged factors object
    const mergedFactors = {
      ...currentLog.factors,
      ...suggestion.factors,
      caffeine: { ...currentLog.factors.caffeine, ...(suggestion.factors?.caffeine || {}) },
      alcohol: { ...currentLog.factors.alcohol, ...(suggestion.factors?.alcohol || {}) },
      medication: { ...currentLog.factors.medication, ...(suggestion.factors?.medication || {}) },
      exercise: { ...currentLog.factors.exercise, ...(suggestion.factors?.exercise || {}) },
    };

    // Apply predicted sleep range if available
    let newTimeline = [...currentLog.visualTimeline];
    let sleepEvents = currentLog.sleepEvents;
    if (suggestion.sleepEvents && suggestion.sleepEvents.length > 0) {
      const { start, end } = suggestion.sleepEvents[0];
      
      // Update bedTime/wakeTime
      currentLog.bedTime = start;
      currentLog.wakeTime = end;
      
      // Clear existing sleep to avoid overlapping or messy timeline
      for (let i = 0; i < TOTAL_SLOTS; i++) {
        if (newTimeline[i] === 'sleep') newTimeline[i] = 'awake-out';
      }
      
      const startIdx = timeToIndex(start);
      const endIdx = timeToIndex(end);
      
      for (let i = startIdx; i < endIdx; i++) {
        newTimeline[i] = 'sleep';
      }
      
      sleepEvents = convertGridToEvents(newTimeline);
    }

    // Canonical String Fix: Ensure HH:mm format
    const getFormattedTime = (time: any, slot: any) => {
      if (typeof time === 'string' && time.includes(':')) return time;
      if (typeof time === 'number') return slotToTimeString(time);
      if (slot !== undefined) return slotToTimeString(slot);
      return null;
    };

    const newLogData: Partial<DailyLog> = {
      ...currentLog, // Keep existing values
      factors: mergedFactors,
      daily_remarks: suggestion.daily_remarks || currentLog.daily_remarks,
      bedTime: getFormattedTime((suggestion as any).bedTime, (suggestion as any).bedTimeSlot),
      wakeTime: getFormattedTime((suggestion as any).wakeTime, (suggestion as any).wakeTimeSlot),
      visualTimeline: newTimeline,
      sleepEvents: sleepEvents,
      
      // RESTORE THE METRICS
      ...appliedMetrics
    };

    console.log("DEBUG: Form State After Apply:", newLogData);

    // Trigger a single update and save
    updateLog(newLogData);
    
    setToast({ message: 'Routine applied! You can still make adjustments.', type: 'success' });
    setShowPatternReview(false);
    setPendingSuggestion(null);

    // UI Feedback: Scroll to "Sleep Window" section
    setTimeout(() => {
      const sleepWindowSection = document.getElementById('sleep-window-section');
      if (sleepWindowSection) {
        sleepWindowSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 500 : -500,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 500 : -500,
      opacity: 0
    })
  };

  // Reset editing state on mount
  useEffect(() => {
    setIsEditing(false);
  }, []);

  // Handle auto-save animation
  useEffect(() => {
    if (saveStatus === 'saving') {
      const timer = setTimeout(() => {
        setSaveStatus('saved');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const correctionsCount = useMemo(() => {
    const trackingStartDate = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const start = startOfDay(parseISO(trackingStartDate));
    
    return (Object.values(logs) as DailyLog[])
      .filter((log: DailyLog) => {
        const logDate = parseISO(log.date);
        const isAfterStart = isAfter(logDate, start) || log.date === trackingStartDate;
        const isNotIgnored = !log.isIgnored;
        
        const hasTimeline = log.timeline && log.timeline.length > 0 && !log.timeline.every(s => s === 'awake-out');
        const hasSummaryMetrics = !!log.summaryMetrics && 
                                  typeof log.summaryMetrics.sleep_quality === 'number' &&
                                  typeof log.summaryMetrics.morning_alertness === 'number' &&
                                  typeof log.summaryMetrics.daytime_energy === 'number';
        
        return isAfterStart && isNotIgnored && (!hasTimeline || !hasSummaryMetrics);
      }).length;
  }, [logs]);

  // Auth Listener
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      try {
        // Fix 2: Set persistence to LOCAL for Vercel persistence
        if (auth) {
          await setPersistence(auth, browserLocalPersistence);
          
          // Fix 3: Guard onAuthStateChanged with isFirebaseConfigured (already checked above)
          unsubscribe = onAuthStateChanged(auth, (u) => {
            if (u) {
              setUser(u);
            } else {
              setUser(null);
              setUserProfile(null);
            }
            setAuthLoading(false);
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthLoading(false);
      }
    };

    initAuth();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Connection Test
  useEffect(() => {
    if (!db) return;
    const testConnection = async () => {
      try {
        // Attempt to fetch a non-existent doc to test connectivity
        await getDocFromServer(doc(db, '_sia_system', 'connection_test'));
      } catch (error: any) {
        if (error.message?.includes('offline')) {
          console.error("CRITICAL: Firestore is offline. Check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Load User Profile
  useEffect(() => {
    if (!user || !db) {
      setUserProfile(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (snapshot) => {
      if (!user.uid) return; // Fix 2: Ensure user.uid exists
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Migration: Ensure tier and quota exist for legacy users
        if (!data.tier || !data.quota) {
          const updatedProfile = {
            ...data,
            tier: data.tier || 'Basic',
            quota: data.quota || {
              chatMessagesUsed: 0,
              lastPromptReset: new Date()
            }
          };
          await updateDoc(userRef, updatedProfile);
          setUserProfile(updatedProfile);
        } else {
          setUserProfile(data);
        }
      } else {
        // Initialize profile
        const initialProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          tier: 'Basic',
          quota: {
            chatMessagesUsed: 0,
            lastPromptReset: serverTimestamp()
          },
          createdAt: serverTimestamp()
        };
        await setDoc(userRef, initialProfile);
        setUserProfile(initialProfile);
      }
    }, (error) => {
      // Handle "offline" error gracefully - it will retry automatically
      if (error.message.includes('offline')) {
        console.warn("Firestore is offline, waiting for connection...");
      } else {
        console.error("User profile fetch error:", error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch maturity info
  useEffect(() => {
    if (!user) return;
    AIService.getUserDataMaturity(user.uid).then(setMaturity);
  }, [user, logs]);

  // Load Personalization Profile
  useEffect(() => {
    if (!user) {
      setPersonalizationProfile(null);
      setIsProfileLoading(false);
      return;
    }

    const profileRef = doc(db, 'users', user.uid, 'personalization', 'profile');
    setIsProfileLoading(true);
    const unsubscribe = onSnapshot(profileRef, (doc) => {
      if (doc.exists()) {
        setPersonalizationProfile(doc.data() as PersonalizationProfile);
      }
      setIsProfileLoading(false);
    }, (error) => {
      if (error.message.includes('offline')) {
        console.warn("Personalization profile fetch is offline, waiting...");
      } else {
        console.error("Profile fetch error:", error);
      }
      setIsProfileLoading(false);
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
        // Generate visual timeline for duration calculations
        const visualTimeline = getGridFromEvents(log.sleepEvents || []);
        
        // Calculate durations from events/timeline
        const sleepDuration = calculateSleepDuration(log.sleepEvents || log.timeline || []);
        const timeInBed = calculateTimeInBed(log.sleepEvents || log.timeline || []);

        // Populate summaryMetrics before saving
        const summaryMetrics = {
          sleep_quality: log.sleep_quality,
          morning_alertness: log.morning_alertness,
          daytime_energy: log.daytime_energy,
          importedDuration: sleepDuration,
          importedInBed: timeInBed,
          sleep_efficiency: timeInBed > 0 ? (sleepDuration / timeInBed) * 100 : 0,
        };

        try {
          // Learning Trigger: Detect corrections if prefill was used
          if (prefillUsed && originalSuggestion) {
            const correctionsToLog: any[] = [];
            
            const sanitizeValue = (val: any) => (val === undefined ? null : val);

            // Check caffeine amount
            if (log.factors.caffeine.amount !== originalSuggestion.factors?.caffeine?.amount) {
              correctionsToLog.push({
                field: 'factors.caffeine.amount',
                suggestedValue: sanitizeValue(originalSuggestion.factors?.caffeine?.amount),
                actualValue: log.factors.caffeine.amount
              });
            }
            
            // Check caffeine time
            if (log.factors.caffeine.lastIntake !== originalSuggestion.factors?.caffeine?.lastIntake) {
              correctionsToLog.push({
                field: 'factors.caffeine.lastIntake',
                suggestedValue: sanitizeValue(originalSuggestion.factors?.caffeine?.lastIntake),
                actualValue: log.factors.caffeine.lastIntake
              });
            }

            // Check exercise
            if (log.factors.exercise.completed !== originalSuggestion.factors?.exercise?.completed) {
              correctionsToLog.push({
                field: 'factors.exercise.completed',
                suggestedValue: sanitizeValue(originalSuggestion.factors?.exercise?.completed),
                actualValue: log.factors.exercise.completed
              });
            }

            if (log.factors.alcohol.consumed !== originalSuggestion.factors?.alcohol?.consumed)
              correctionsToLog.push({ field: 'factors.alcohol.consumed', suggestedValue: sanitizeValue(originalSuggestion.factors?.alcohol?.consumed), actualValue: log.factors.alcohol.consumed });

            if (log.factors.screensInBed !== originalSuggestion.factors?.screensInBed)
              correctionsToLog.push({ field: 'factors.screensInBed', suggestedValue: sanitizeValue(originalSuggestion.factors?.screensInBed), actualValue: log.factors.screensInBed });

            if (log.factors.stressLevel !== originalSuggestion.factors?.stressLevel)
              correctionsToLog.push({ field: 'factors.stressLevel', suggestedValue: sanitizeValue(originalSuggestion.factors?.stressLevel), actualValue: log.factors.stressLevel });

            if (log.factors.lastMealTime !== originalSuggestion.factors?.lastMealTime)
              correctionsToLog.push({ field: 'factors.lastMealTime', suggestedValue: sanitizeValue(originalSuggestion.factors?.lastMealTime), actualValue: log.factors.lastMealTime });

            if (log.factors.naturalWake !== originalSuggestion.factors?.naturalWake)
              correctionsToLog.push({ field: 'factors.naturalWake', suggestedValue: sanitizeValue(originalSuggestion.factors?.naturalWake), actualValue: log.factors.naturalWake });

            if (log.factors.moodScore !== originalSuggestion.factors?.moodScore)
              correctionsToLog.push({ field: 'factors.moodScore', suggestedValue: sanitizeValue(originalSuggestion.factors?.moodScore), actualValue: log.factors.moodScore });

            if (log.morning_alertness !== originalSuggestion.morning_alertness)
              correctionsToLog.push({ field: 'morning_alertness', suggestedValue: sanitizeValue(originalSuggestion.morning_alertness), actualValue: log.morning_alertness });

            if (log.daytime_energy !== originalSuggestion.daytime_energy)
              correctionsToLog.push({ field: 'daytime_energy', suggestedValue: sanitizeValue(originalSuggestion.daytime_energy), actualValue: log.daytime_energy });

            if (correctionsToLog.length > 0) {
              const correctionsRef = collection(db, 'users', user.uid, 'ai_corrections');
              for (const corr of correctionsToLog) {
                await addDoc(correctionsRef, {
                  ...corr,
                  date: selectedDate,
                  createdAt: serverTimestamp()
                });
              }
              console.log(`Logged ${correctionsToLog.length} AI corrections.`);
            }
          }

          if (!validateLogMetrics(summaryMetrics)) {
            console.error('saveLog blocked — invalid metrics:', summaryMetrics);
            return; // do not write invalid data to Firestore
          }

          await saveLog(user.uid, {
            ...log,
            type: 'log',
            summaryMetrics,
            isIgnored: log.isIgnored || false,
          });
        } catch (error: any) {
          console.error("Save failed:", error);
          alert(error.code === 'permission-denied' 
            ? "SIA Permission Error: Check Firestore Rules pathing." 
            : "Failed to save log. Please check your connection.");
        }
      } else {
        // If log is missing for that date, it was deleted
        await deleteDoc(doc(db, 'users', user.uid, 'sleep_logs', dateToUpdate));
      }
    }
  };

  const updateLog = (updates: Partial<DailyLog> | ((prevLog: DailyLog) => Partial<DailyLog>)) => {
    setLogs(prevLogs => {
      const currentLogForDate = prevLogs[selectedDate] || getDefaultLog(selectedDate);
      const newUpdates = typeof updates === 'function' ? updates(currentLogForDate) : updates;
      const newLog = { ...currentLogForDate, ...newUpdates };
      
      if (newLog.source === 'import') {
        newLog.source = 'manual';
      }
      
      const newLogs = { ...prevLogs, [selectedDate]: newLog };
      saveLogs(newLogs, selectedDate);
      return newLogs;
    });
    setSaveStatus('saving');
  };

  const updateFactors = (updates: Partial<DailyLog['factors']>) => {
    updateLog(prevLog => ({
      factors: { ...prevLog.factors, ...updates }
    }));
  };

  const toggleGadget = (type: string) => {
    const currentGadgets = currentLog.factors.sleepGadgets || [];
    const exists = currentGadgets.find(g => g.type === type);
    
    if (exists) {
      updateFactors({
        sleepGadgets: currentGadgets.filter(g => g.type !== type)
      });
    } else {
      updateFactors({
        sleepGadgets: [...currentGadgets, { type: type as any }]
      });
    }
  };

  const updateGadgetDetails = (type: string, updates: any) => {
    const currentGadgets = currentLog.factors.sleepGadgets || [];
    updateFactors({
      sleepGadgets: currentGadgets.map(g => g.type === type ? { ...g, ...updates } : g)
    });
  };

  const isGadgetSelected = (type: string) => {
    return (currentLog.factors.sleepGadgets || []).some(g => g.type === type);
  };

  const getGadget = (type: string) => {
    return (currentLog.factors.sleepGadgets || []).find(g => g.type === type);
  };

  const setSlotState = (index: number, state: SleepState) => {
    const newVisualTimeline = [...currentLog.visualTimeline];
    newVisualTimeline[index] = state;
    const newEvents = convertGridToEvents(newVisualTimeline);
    updateLog({ sleepEvents: newEvents });
  };

  const handleMouseDown = (index: number) => {
    if (!isEditing) return;
    setIsDragging(true);
    const currentState = currentLog.visualTimeline[index];
    const nextState = currentState === activeState ? 'awake-out' : activeState;
    setDragAction(nextState === 'awake-out' ? 'erase' : 'paint');
    setSlotState(index, nextState);
  };

  const handleMouseEnter = (index: number) => {
    if (!isDragging || !isEditing) return;
    const nextState = dragAction === 'erase' ? 'awake-out' : activeState;
    if (currentLog.visualTimeline[index] !== nextState) {
      setSlotState(index, nextState);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const indexAttr = element.getAttribute('data-slot-index');
      if (indexAttr !== null) {
        const index = parseInt(indexAttr);
        handleMouseDown(index);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isEditing) return;
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const indexAttr = element.getAttribute('data-slot-index');
      if (indexAttr !== null) {
        const index = parseInt(indexAttr);
        handleMouseEnter(index);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const weekDates = useMemo(() => {
    const today = new Date();
    const start = subDays(today, 6); // Last 7 days including today
    return eachDayOfInterval({ start, end: today }).map(d => format(d, 'yyyy-MM-dd'));
  }, []);

  const monthDates = useMemo(() => {
    const today = new Date();
    const start = subDays(today, 29); // Last 30 days including today
    return eachDayOfInterval({ start, end: today }).map(d => format(d, 'yyyy-MM-dd'));
  }, []);
  const customDates = useMemo(() => getRangeDates(customRange.start, customRange.end), [customRange]);

  const activeDates = useMemo(() => {
    if (view === 'weekly') return weekDates;
    if (view === 'monthly') return monthDates;
    if (view === 'custom') return customDates;
    if (view === 'dashboard') {
      const dates = [];
      const baseDate = new Date(selectedDate);
      for (let i = 0; i < 7; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }
      return dates.reverse();
    }
    return [selectedDate];
  }, [view, selectedDate, weekDates, monthDates, customDates]);

  // Load data from Firestore based on active range
  useEffect(() => {
    if (!user) {
      setLogs({});
      return;
    }

    // Determine the range to fetch
    const start = activeDates[0];
    const end = activeDates[activeDates.length - 1];

    if (!start || !end) return;

    const q = query(
      collection(db, 'users', user.uid, 'sleep_logs'),
      where('type', '==', 'log'),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Disable Persistence Sync during import to prevent network/CORS timeouts
      if (isImporting) return;

      setLogs(prevLogs => {
        const fetchedLogs: Record<string, DailyLog> = { ...prevLogs };
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
        return fetchedLogs;
      });
    });

    return () => unsubscribe();
  }, [user, activeDates, refreshKey]);

  // Fetch AI Corrections
  useEffect(() => {
    if (!user) {
      setAiCorrections([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'ai_corrections'),
      orderBy('date', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCorrections: AICorrection[] = [];
      snapshot.forEach((doc) => {
        fetchedCorrections.push(doc.data() as AICorrection);
      });
      setAiCorrections(fetchedCorrections);
    });

    return () => unsubscribe();
  }, [user]);

  // Calculate Intelligent Prefill Suggestion
  useEffect(() => {
    if (view !== 'log' || !user) {
      setActiveSuggestion(null);
      return;
    }

    // Only suggest if the current log is "empty" (default values)
    const log = logs[selectedDate];
    const isEmpty = !log || (
      log.daily_remarks === '' && 
      (!log.sleepEvents || log.sleepEvents.length === 0) &&
      (!log.timeline || log.timeline.every(s => s === 'awake-out')) &&
      !log.factors.caffeine.consumed &&
      !log.factors.alcohol.consumed &&
      !log.factors.medication.taken &&
      !log.factors.exercise.completed
    );

    if (isEmpty) {
      const result = getSuggestedLog(Object.values(logs), selectedDate, aiCorrections);
      // Always set suggestion now, but UI will handle state based on confidence/history
      setActiveSuggestion(result);
    } else {
      setActiveSuggestion(null);
    }
  }, [view, selectedDate, logs, aiCorrections, user]);

  const averageStats = useMemo(() => {
    const periodLogs = activeDates.map(d => logs[d]).filter(Boolean);
    if (periodLogs.length === 0) return null;

    return {
      sq: calculateSafeAverage(periodLogs, 'sleep_quality').average,
      r: calculateSafeAverage(periodLogs, 'morning_alertness').average,
      l: calculateSafeAverage(periodLogs, 'daytime_energy').average,
      duration: calculateSafeAverage(periodLogs, 'sleepDuration').average,
      efficiency: calculateSafeAverage(periodLogs, 'efficiency').average
    };
  }, [logs, activeDates]);

  const generateClinicalReport = async () => {
    try {
      if (isGeneratingReport || !user) return;
      setIsGeneratingReport(true);
      const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set — AI features disabled');
      return;
    }
    const ai = new GoogleGenAI({ apiKey });
      
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
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: reportPrompt }] }],
        config: { temperature: 0.2, maxOutputTokens: 2048 }
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
            .footer { margin-top: 25px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #666; font-style: italic; }
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
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 overflow-hidden aspect-square">
                  <img src="https://i.imgur.com/MnI5hn3.png" alt="SIA" className="w-12 h-12 object-cover" />
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
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20' 
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
    <div className={`min-h-screen bg-clinical-bg text-clinical-text font-sans selection:bg-indigo-500/30 max-w-[100vw] overflow-x-hidden ${personalizationProfile ? 'enhanced-mode' : ''}`}>
      {/* Navbar */}
      <Navbar 
        user={user} 
        view={view} 
        setView={setView} 
        handleLogout={handleLogout} 
        derivedTier={derivedTier} 
      />

      <main className="max-w-4xl mx-auto p-4 pb-24 pt-20 md:pt-24 touch-pan-y">
        <AnimatePresence mode="wait">
          {view === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative overflow-hidden space-y-6"
            >
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={selectedDate}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                >
                  <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>}>
                    <Dashboard 
                      logs={logs} 
                      user={user}
                      userProfile={{ ...userProfile, tier: derivedTier }}
                      selectedDate={selectedDate}
                      correctionsCount={correctionsCount}
                      personalizationProfile={personalizationProfile}
                      onLogClick={() => {
                        setSelectedDate(getTodayDate());
                        setView('log');
                      }}
                      onViewChange={setView}
                      onDateChange={changeDate}
                      onOpenPersonalization={() => setShowPersonalizationWizard(true)}
                      onOpenSleepGuide={() => setShowSleepGuide(true)}
                      refreshAllData={refreshAllData}
                      isRefreshing={isRefreshing}
                    />
                  </Suspense>
                </motion.div>
              </AnimatePresence>
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
                onUpdate={refreshAllData} 
                onGoToLog={(date) => {
                  setSelectedDate(date);
                  setView('log');
                }}
              />
            </motion.div>
          ) : view === 'log' ? (
            <motion.div 
              key="log"
              id="log-form-container"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 relative overflow-hidden"
            >
              {/* Import Alert */}
              {currentLog.source === 'import' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 flex-shrink-0">
                      <AlertCircle size={18} />
                    </div>
                    <p className="text-xs text-amber-200/80 font-medium">
                      Data for this night was uploaded via Import. Do you want to manually adjust the data?
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setInitialTimeline([...currentLog.visualTimeline]);
                      setIsEditing(true);
                    }}
                    className="text-[10px] font-black text-amber-500 uppercase tracking-widest hover:text-amber-400 transition-colors whitespace-nowrap"
                  >
                    Adjust Data
                  </button>
                </motion.div>
              )}

              {/* Date Selector - Now outside sliding area to stay visible */}
              <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                <button 
                  onClick={() => changeDate(-1)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="text-center relative group">
                  <input 
                    type="date" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    value={selectedDate}
                    onChange={(e) => changeDate(e.target.value)}
                  />
                  <h2 className="text-lg font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                    {formatDisplayDate(selectedDate)}
                  </h2>
                  <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
                    {selectedDate === getTodayDate() ? 'TODAY' : 'HISTORICAL LOG'}
                  </p>
                </div>

                <button 
                  onClick={() => changeDate(1)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
                >
                  <ChevronRight size={20} />
                </button>
              </div>


              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={selectedDate}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                  className="space-y-8"
                >

              {/* Timeline Section */}
              <section className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">Sleep Window</h2>
                    <p className="text-[10px] text-zinc-400 mt-1">{sleepWindowText}</p>
                  </div>
                  <div className="flex gap-2">
                    {SLEEP_STATES.filter(s => s.value !== 'awake-out').map((state) => (
                      <button
                        key={state.value}
                        onClick={() => setActiveState(state.value)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          activeState === state.value 
                            ? state.value === 'sleep' 
                              ? 'border-emerald-500 bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                              : 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                            : 'border-zinc-800 text-zinc-400'
                        }`}
                      >
                        {state.value === 'awake-in' ? 'Awake In Bed' : state.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Anchor Container for SIA Learning & Editing Controls */}
                {(isEditing || (activeSuggestion && !prefillUsed) || (!isEditing && !activeSuggestion)) && (
                  <div className="h-[140px] flex items-center justify-center bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden relative">
                    <AnimatePresence mode="wait">
                      {isEditing ? (
                        <motion.div
                          key="editing"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="w-full h-full flex flex-col items-center justify-center p-6 space-y-4"
                        >
                          <div className="flex items-center gap-3 text-indigo-400">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                              <Wand2 size={20} className="animate-pulse" />
                            </div>
                            <div className="text-left">
                              <h3 className="text-sm font-bold uppercase tracking-widest">Editing Mode</h3>
                              <p className="text-[10px] text-zinc-300">Adjust your sleep window on the grid below</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            {currentLog.modifiedBySync?.some(v => v) && (
                              <button 
                                onClick={() => {
                                  const { modifiedBySync, ...rest } = currentLog;
                                  updateLog({ modifiedBySync: undefined });
                                }}
                                className="px-6 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-400 transition-all flex items-center gap-2"
                              >
                                <Check size={14} />
                                Confirm Sync
                              </button>
                            )}
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  if (initialTimeline) {
                                    const newEvents = convertGridToEvents(initialTimeline);
                                    updateLog({ sleepEvents: newEvents });
                                  }
                                  setIsEditing(false);
                                }}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all flex items-center gap-2"
                              >
                                <X size={14} />
                                Cancel
                              </button>
                              <button 
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2"
                              >
                                <Check size={14} />
                                Save Changes
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ) : activeSuggestion && !prefillUsed ? (
                        <motion.div
                          key="learning"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="w-full max-h-10 flex flex-col items-center justify-center"
                        >
                          {(() => {
                            const confidenceValues = Object.values(activeSuggestion.confidenceMap);
                            const confidence = confidenceValues.length > 0
                              ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
                              : 0;
                            
                            if (historyCount < 3) {
                              return (
                                <button
                                  onClick={() => setToast({ message: `SIA needs ${3 - historyCount} more days of data to recognize your patterns.`, type: 'info' })}
                                  className="w-full flex flex-row items-center justify-center gap-3 grayscale opacity-50 cursor-not-allowed px-6 py-1.5 max-h-10 overflow-hidden"
                                >
                                  <Rocket className="text-zinc-600 shrink-0" size={14} />
                                  <div className="text-left">
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-tight">
                                      {historyCount === 0 ? "SIA Learning: Start Your Journey" : `SIA Learning: Log ${3 - historyCount} more days to unlock`}
                                    </p>
                                    <p className="text-[8px] text-zinc-500 uppercase tracking-wider leading-tight">
                                      {historyCount === 0 ? "Log your first night to begin pattern recognition" : "Pattern recognition requires more data"}
                                    </p>
                                  </div>
                                </button>
                              );
                            }

                            if (confidence < 0.8 && !(activeSuggestion as any).median) {
                              return (
                                <button
                                  onClick={() => setShowPrefillConfirm(true)}
                                  className="w-full h-full flex flex-col items-center justify-center gap-3 group p-6"
                                >
                                  <Lightbulb className="text-amber-400 group-hover:scale-110 transition-transform" size={24} />
                                  <div className="text-center">
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">SIA Draft: Suggested Fill Available</p>
                                    <p className="text-[8px] text-amber-600/70 mt-1 uppercase tracking-wider">Click to preview your routine</p>
                                  </div>
                                </button>
                              );
                            }

                            return (
                              <button
                                onClick={applySuggestion}
                                className="w-full h-full bg-indigo-600/5 hover:bg-indigo-600/10 transition-all flex flex-col items-center justify-center gap-3 group relative overflow-hidden p-6"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <Wand2 className="text-indigo-400 group-hover:rotate-12 transition-transform" size={24} />
                                <div className="text-center">
                                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">SIA Master: Apply Routine</p>
                                  <p className="text-[8px] text-indigo-500/70 mt-1 uppercase tracking-wider">High confidence pattern detected</p>
                                </div>
                              </button>
                            );
                          })()}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="complete"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="w-full h-full flex flex-col items-center justify-center p-6 space-y-4"
                        >
                          <div className="flex items-center gap-8">
                            <div className="text-center">
                              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Duration</p>
                              <p className="text-xl font-mono font-bold text-white tracking-tight">
                                {formatDuration(calculateSleepDuration(currentLog.visualTimeline))}
                              </p>
                            </div>
                            <div className="w-px h-8 bg-zinc-800" />
                            <div className="text-center">
                              <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1">Efficiency</p>
                              <p className="text-xl font-mono font-bold text-emerald-400 tracking-tight">
                                {calculateSleepEfficiency(currentLog.visualTimeline)}%
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setInitialTimeline([...currentLog.visualTimeline]);
                              setIsEditing(true);
                            }}
                            className="px-4 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-lg text-[9px] font-bold text-zinc-400 hover:text-zinc-200 uppercase tracking-[0.2em] transition-all flex items-center gap-2"
                          >
                            <Plus size={12} />
                            Edit Sleep Window
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div 
                  className={`relative bg-zinc-900 border rounded-2xl overflow-hidden select-none flex flex-col divide-y divide-zinc-800/50 transition-all ${
                    isEditing ? 'border-indigo-500 ring-2 ring-indigo-500/20 touch-none' : 'border-zinc-800 touch-pan-y'
                  }`}
                >
                  <AnimatePresence>
                    {!isEditing && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                          setInitialTimeline([...currentLog.visualTimeline]);
                          setIsEditing(true);
                        }}
                        className={`absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer group touch-pan-y ${
                          historyCount === 0 ? '' : 'bg-black/20 backdrop-blur-[2px]'
                        }`}
                      >
                        {historyCount === 0 ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-zinc-400">
                              No data for this night
                            </p>
                            <p className="text-[10px] text-zinc-500 tracking-wide">
                              Tap the grid or use the buttons above to log sleep
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="bg-zinc-900/90 border border-zinc-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-300 group-hover:text-white transition-colors flex items-center gap-2">
                              <Plus size={14} />
                              Tap to edit sleep window
                            </div>
                            
                            {/* Scroll Hint */}
                            <div className="absolute bottom-4 flex flex-col items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Drag to scroll / Tap to edit</p>
                              <motion.div
                                animate={{ y: [0, 4, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                              >
                                <ChevronDown size={12} className="text-zinc-500" />
                              </motion.div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <SleepWindow
                    timeline={currentLog.visualTimeline}
                    isEditing={isEditing}
                    isImported={!!(currentLog as any).modifiedBySync}
                    onMouseDown={handleMouseDown}
                    onMouseEnter={handleMouseEnter}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />
                </div>
                
                <div className="flex justify-between text-[10px] text-zinc-300 px-1 italic">
                  <span>Start: 20:00</span>
                  <span>Duration: {formatDuration(calculateSleepDuration(currentLog.visualTimeline))}</span>
                  <span>End: {getSlotLabel(TOTAL_SLOTS)}</span>
                </div>
              </section>

              {/* Daily Factors & Disturbances Section */}
              <section className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/50 space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">Daily Factors & Disturbances</h2>
                
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
                          <label className="text-[10px] text-zinc-300 uppercase font-bold">Amount (mg/cups)</label>
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
                    <div className="flex justify-between text-[8px] text-zinc-400 uppercase font-bold">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>

                  {/* Last Meal */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <UtensilsCrossed size={18} className="text-orange-400" />
                      <span className="text-sm font-medium">Last Meal</span>
                    </div>
                    <input 
                      type="time" 
                      value={currentLog.factors.lastMealTime || ''} 
                      onChange={(e) => updateFactors({ lastMealTime: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                    />
                  </div>

                  {/* Natural Wake */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-300 group relative">
                      <Sunrise size={18} className="text-yellow-400" />
                      <span className="text-sm font-medium">Natural Wake</span>
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-zinc-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                        Did you wake up without an alarm?
                      </div>
                    </div>
                    <button 
                      onClick={() => updateFactors({ naturalWake: !currentLog.factors.naturalWake })}
                      className={`w-10 h-5 rounded-full transition-colors relative ${currentLog.factors.naturalWake ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentLog.factors.naturalWake ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* Morning Mood */}
                  <SliderInput 
                    label="Morning Mood" 
                    value={currentLog.factors.moodScore || 3} 
                    onChange={(val) => updateFactors({ moodScore: val })} 
                    min={1}
                    max={5}
                    icon={Sun}
                  />
                </div>
              </section>

              {/* Sleep support tools Section */}
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                <button 
                  onClick={() => setIsSleepToolsExpanded(!isSleepToolsExpanded)}
                  className="w-full p-6 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <Wand2 size={18} className="text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-sm font-bold text-white">Sleep support tools</h2>
                      <p className="text-[10px] text-zinc-300 uppercase tracking-wider font-medium">Interventions & Aids</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {currentLog.factors.sleepGadgets && currentLog.factors.sleepGadgets.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                        {currentLog.factors.sleepGadgets.length}
                      </span>
                    )}
                    <motion.div
                      animate={{ rotate: isSleepToolsExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={20} className="text-zinc-500" />
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence>
                  {isSleepToolsExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="px-6 pb-6 space-y-8"
                    >
                      {/* Sub-section 1: Interventions */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 border-b border-zinc-800/50 pb-2">Interventions</h3>
                        <div className="grid grid-cols-1 gap-4">
                          {/* Light Therapy */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isGadgetSelected('light_therapy') ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                  <Lightbulb size={16} />
                                </div>
                                <span className="text-sm font-medium text-zinc-300">Light Therapy</span>
                              </div>
                              <button 
                                onClick={() => toggleGadget('light_therapy')}
                                className={`w-10 h-5 rounded-full transition-colors relative ${isGadgetSelected('light_therapy') ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                              >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isGadgetSelected('light_therapy') ? 'left-6' : 'left-1'}`} />
                              </button>
                            </div>
                            {isGadgetSelected('light_therapy') && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-11 space-y-4 pt-1">
                                <div className="space-y-2">
                                  <label className="text-[10px] text-zinc-300 uppercase font-bold">Duration</label>
                                  <div className="flex gap-2">
                                    {[15, 30, 45, 60].map(min => (
                                      <button
                                        key={min}
                                        onClick={() => updateGadgetDetails('light_therapy', { durationMinutes: min })}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${getGadget('light_therapy')?.durationMinutes === min ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                      >
                                        {min}m
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] text-zinc-300 uppercase font-bold">Time of use</label>
                                  <div className="flex gap-2">
                                    {['morning', 'afternoon', 'evening'].map(time => (
                                      <button
                                        key={time}
                                        onClick={() => updateGadgetDetails('light_therapy', { timeOfUse: time })}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all ${getGadget('light_therapy')?.timeOfUse === time ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                      >
                                        {time}
                                      </button>
                                    ))}
                                  </div>
                                  <p className="text-[9px] text-zinc-300 italic">Morning use anchors your rhythm · Evening use delays it</p>
                                </div>
                              </motion.div>
                            )}
                          </div>

                          {/* Breathing Trainer */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isGadgetSelected('breathing_trainer') ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                  <Wind size={16} />
                                </div>
                                <span className="text-sm font-medium text-zinc-300">Breathing Trainer</span>
                              </div>
                              <button 
                                onClick={() => toggleGadget('breathing_trainer')}
                                className={`w-10 h-5 rounded-full transition-colors relative ${isGadgetSelected('breathing_trainer') ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                              >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isGadgetSelected('breathing_trainer') ? 'left-6' : 'left-1'}`} />
                              </button>
                            </div>
                            {isGadgetSelected('breathing_trainer') && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-11 space-y-2 pt-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Duration</label>
                                <div className="flex gap-2">
                                  {[15, 30, 45].map(min => (
                                    <button
                                      key={min}
                                      onClick={() => updateGadgetDetails('breathing_trainer', { durationMinutes: min })}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${getGadget('breathing_trainer')?.durationMinutes === min ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                    >
                                      {min}m
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </div>

                          {/* Pre-sleep Heating */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isGadgetSelected('pre_sleep_heating') ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                  <Flame size={16} />
                                </div>
                                <span className="text-sm font-medium text-zinc-300">Pre-sleep Heating</span>
                              </div>
                              <button 
                                onClick={() => toggleGadget('pre_sleep_heating')}
                                className={`w-10 h-5 rounded-full transition-colors relative ${isGadgetSelected('pre_sleep_heating') ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                              >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isGadgetSelected('pre_sleep_heating') ? 'left-6' : 'left-1'}`} />
                              </button>
                            </div>
                            {isGadgetSelected('pre_sleep_heating') && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-11 space-y-2 pt-1">
                                <label className="text-[10px] text-zinc-300 uppercase font-bold">Used before bed</label>
                                <div className="flex gap-2">
                                  {[15, 30, 60].map(min => (
                                    <button
                                      key={min}
                                      onClick={() => updateGadgetDetails('pre_sleep_heating', { timeOfUse: `before_bed_${min}` })}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${getGadget('pre_sleep_heating')?.timeOfUse === `before_bed_${min}` ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                    >
                                      {min}m before
                                    </button>
                                  ))}
                                </div>
                                <p className="text-[9px] text-zinc-300 italic">Pre-sleep warming triggers the cooling response that initiates sleep</p>
                              </motion.div>
                            )}
                          </div>

                          {/* Aromatherapy */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isGadgetSelected('aromatherapy') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                  <Leaf size={16} />
                                </div>
                                <span className="text-sm font-medium text-zinc-300">Aromatherapy</span>
                              </div>
                              <button 
                                onClick={() => toggleGadget('aromatherapy')}
                                className={`w-10 h-5 rounded-full transition-colors relative ${isGadgetSelected('aromatherapy') ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                              >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isGadgetSelected('aromatherapy') ? 'left-6' : 'left-1'}`} />
                              </button>
                            </div>
                            {isGadgetSelected('aromatherapy') && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-11 space-y-2 pt-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Duration</label>
                                <div className="flex gap-2">
                                  {[15, 30, 45].map(min => (
                                    <button
                                      key={min}
                                      onClick={() => updateGadgetDetails('aromatherapy', { durationMinutes: min })}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${getGadget('aromatherapy')?.durationMinutes === min ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                    >
                                      {min}m
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </div>

                          {/* Meditation App */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isGadgetSelected('meditation_app') ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                <Flower2 size={16} />
                              </div>
                              <span className="text-sm font-medium text-zinc-300">Meditation App</span>
                            </div>
                            <button 
                              onClick={() => toggleGadget('meditation_app')}
                              className={`w-10 h-5 rounded-full transition-colors relative ${isGadgetSelected('meditation_app') ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                            >
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isGadgetSelected('meditation_app') ? 'left-6' : 'left-1'}`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Sub-section 2: Passive aids */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 border-b border-zinc-800/50 pb-2">Passive aids</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { id: 'cooling_pad', label: 'Cooling Pad', icon: Snowflake, color: 'text-blue-400' },
                            { id: 'white_noise', label: 'White Noise', icon: Volume2, color: 'text-zinc-400' },
                            { id: 'sleep_mask', label: 'Sleep Mask', icon: EyeOff, color: 'text-zinc-400' },
                            { id: 'earplugs', label: 'Earplugs', icon: Ear, color: 'text-zinc-400' },
                            { id: 'weighted_blanket', label: 'Weighted Blanket', icon: Bed, color: 'text-zinc-400' }
                          ].map(aid => (
                            <button
                              key={aid.id}
                              onClick={() => toggleGadget(aid.id)}
                              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${isGadgetSelected(aid.id) ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-700'}`}
                            >
                              <aid.icon size={20} className={isGadgetSelected(aid.id) ? aid.color : 'text-zinc-400'} />
                              <span className={`text-[10px] font-bold text-center ${isGadgetSelected(aid.id) ? 'text-white' : 'text-zinc-300'}`}>{aid.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sub-section 3: Sleep tracking */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 border-b border-zinc-800/50 pb-2">Sleep tracking</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'smart_ring', label: 'Smart Ring', icon: Circle, color: 'text-zinc-300' },
                            { id: 'smartwatch_tracking', label: 'Smartwatch', icon: Watch, color: 'text-zinc-300' },
                            { id: 'fitness_band', label: 'Fitness Band', icon: Activity, color: 'text-zinc-300' },
                            { id: 'phone_sleep_app', label: 'Phone App', icon: Smartphone, color: 'text-zinc-300' }
                          ].map(tracker => (
                            <button
                              key={tracker.id}
                              onClick={() => toggleGadget(tracker.id)}
                              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isGadgetSelected(tracker.id) ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-700'}`}
                            >
                              <tracker.icon size={18} className={isGadgetSelected(tracker.id) ? tracker.color : 'text-zinc-400'} />
                              <span className={`text-[10px] font-bold ${isGadgetSelected(tracker.id) ? 'text-white' : 'text-zinc-300'}`}>{tracker.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Metrics Section */}
              <section className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/50 space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300 mb-4">Daily Metrics</h2>
                <div className="grid gap-8">
                  <SliderInput 
                    label="Sleep Quality (SQ)" 
                    value={currentLog.sleep_quality} 
                    onChange={(val) => updateLog({ sleep_quality: val })}
                    icon={Moon}
                  />
                  <SliderInput 
                    label="Restedness after Awakening (R)" 
                    value={currentLog.morning_alertness} 
                    onChange={(val) => updateLog({ morning_alertness: val })}
                    icon={Sun}
                  />
                  <SliderInput 
                    label="Energy Level in the Morning (L)" 
                    value={currentLog.daytime_energy} 
                    onChange={(val) => updateLog({ daytime_energy: val })}
                    icon={BarChart3}
                  />
                </div>
              </section>

              {/* Remarks Section */}
              <section className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">Remarks & Notes</label>
                <textarea
                  value={currentLog.daily_remarks}
                  onChange={(e) => updateLog({ daily_remarks: e.target.value })}
                  placeholder="Last night I went to bed at 23 pm. It took about 45 minutes to fall asleep. Around 2 am I woke up because I had to go to the bathroom. After 30 minutes of lying awake I came out of the bed and went back in around 4 am. Here I stayed awake until 5 am before falling asleep again. At 6.30 am I woke up to go to work...."
                  className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-zinc-700"
                />
              </section>

              <DataImporter 
                user={user} 
                isImporting={isImporting}
                setIsImporting={setIsImporting}
                logs={logs}
                onImportComplete={() => {
                  setToast({ message: 'Data imported and synced successfully', type: 'success' });
                  setIsImporting(false);
                }} 
                onRefresh={refreshAllData}
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setSaveStatus('saving');
                    setTimeout(() => {
                      setSaveStatus('saved');
                      setToast({ message: 'All changes synced to SIA cloud', type: 'success' });
                    }, 500);
                  }}
                  className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <AnimatePresence mode="wait">
                    {saveStatus === 'saving' ? (
                      <motion.div
                        key="saving"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 size={18} className="animate-spin" />
                        <span>Saving...</span>
                      </motion.div>
                    ) : saveStatus === 'saved' ? (
                      <motion.div
                        key="saved"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        <span>Saved</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                      >
                        <Save size={18} />
                        <span>Save Changes</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
                <button 
                  onClick={() => {
                    const newLogs = { ...logs };
                    delete newLogs[selectedDate];
                    setLogs(newLogs);
                    saveLogs(newLogs, selectedDate);
                    setSaveStatus('idle');
                  }}
                  className="flex-1 py-4 bg-zinc-900 hover:bg-red-900/20 text-zinc-500 hover:text-red-400 rounded-2xl font-bold text-sm transition-all border border-zinc-800 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Reset Day
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
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
                <p className="text-sm text-zinc-300">Advanced correlation analysis of your sleep history</p>
              </div>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>}>
                <AIInsightsAgent 
                  logs={logs} 
                  user={user} 
                  userProfile={userProfile ? { ...userProfile, tier: derivedTier } : null}
                  personalizationProfile={personalizationProfile}
                  isProfileLoading={isProfileLoading}
                />
              </Suspense>
            </motion.div>
          ) : view === 'legal' ? (
            <Legal onBack={() => setView('dashboard')} />
          ) : view === 'account' ? (
            <AccountPage 
              user={user} 
              personalizationProfile={personalizationProfile} 
              onModifyAssessment={() => setShowPersonalizationWizard(true)}
              onRefresh={refreshAllData}
              logs={logs}
              maturity={maturity}
            />
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
                  <h2 className="text-2xl font-bold tracking-tight capitalize">
                    {view === 'weekly' ? 'Last 7 Days' : view === 'monthly' ? 'Last 30 Days' : 'Insights'}
                  </h2>
                  <p className="text-sm text-zinc-300">
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
                          view === sub
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {sub === 'weekly' ? '7 Days' : sub === 'monthly' ? '30 Days' : sub}
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
                      <p className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold ml-1">Start Date</p>
                      <input 
                        type="date" 
                        value={customRange.start}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                        className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <p className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold ml-1">End Date</p>
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
                  <MetricDisplay 
                    title="Avg Quality" 
                    value={Math.round(averageStats.sq)} 
                    unit="/10" 
                    className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl" 
                  />
                  <MetricDisplay 
                    title="Avg Rested" 
                    value={Math.round(averageStats.r)} 
                    unit="/10" 
                    className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl" 
                  />
                  <MetricDisplay 
                    title="Avg Energy" 
                    value={Math.round(averageStats.l)} 
                    unit="/10" 
                    className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl" 
                  />
                  <MetricDisplay 
                    title="Avg Sleep" 
                    value={formatDuration(averageStats.duration)} 
                    className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl" 
                  />
                  <MetricDisplay 
                    title="Avg Efficiency" 
                    value={Math.round(averageStats.efficiency)} 
                    unit="%" 
                    className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl" 
                  />
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-12 rounded-3xl text-center">
                  <Info className="mx-auto text-zinc-700 mb-3" size={32} />
                  <p className="text-zinc-500 text-sm">No data logged for this period yet.</p>
                </div>
              )}

              {/* Breakdown List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">Daily Breakdown</h3>
                  <div className="flex items-center gap-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><kbd className="bg-zinc-800 px-1 rounded border border-zinc-700">Q</kbd> Quality</span>
                    <span className="flex items-center gap-1"><kbd className="bg-zinc-800 px-1 rounded border border-zinc-700">R</kbd> Rested</span>
                    <span className="flex items-center gap-1"><kbd className="bg-zinc-800 px-1 rounded border border-zinc-700">E</kbd> Efficiency</span>
                  </div>
                </div>
                {activeDates.slice().reverse().map(date => {
                  const log = logs[date];
                  const isToday = date === getTodayDate();
                  const sleepData = log ? (log.sleepEvents || log.timeline || []) : [];
                  const events = log ? (log.sleepEvents || (log.timeline ? migrateTimelineToEvents(log.timeline) : [])) : [];

                  return (
                    <button 
                      key={date}
                      onClick={() => {
                        setSelectedDate(date);
                        setView('log');
                      }}
                      className={`w-full flex flex-col gap-4 p-5 rounded-[2rem] border transition-all min-h-[100px] ${
                        log 
                          ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' 
                          : 'bg-transparent border-zinc-900 hover:bg-zinc-900/30'
                      } ${isToday ? 'ring-1 ring-indigo-500/50' : ''}`}
                    >
                      <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${log ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-zinc-800'}`} />
                          <div className="text-left">
                            <p className="text-sm font-bold">{formatDisplayDate(date)}</p>
                            <p className="text-[10px] text-zinc-300 uppercase tracking-wider">
                              {log ? `${formatDuration(calculateSleepDuration(sleepData))} sleep` : 'No entry'}
                            </p>
                          </div>
                        </div>
                        {log ? (
                          <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest">
                            <span className="text-indigo-400">Q:{log.sleep_quality}</span>
                            <span className="text-emerald-400">R:{log.morning_alertness}</span>
                            <span className="text-purple-400">E:{calculateSleepEfficiency(sleepData)}%</span>
                          </div>
                        ) : (
                          <Plus size={16} className="text-zinc-700" />
                        )}
                      </div>
                      
                      {log && (
                        <div className="w-full">
                          <SleepRibbon 
                            sleepEvents={events} 
                            height="h-1.5"
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sleep Pattern Summary Card */}
              <SleepPatternCard 
                logs={logs} 
                periodType={view === 'monthly' ? '30-DAY' : view === 'custom' ? 'CUSTOM' : '7-DAY'}
                personalizationProfile={personalizationProfile}
                user={user}
                activeDates={activeDates}
                viewMode={view as 'weekly' | 'monthly' | 'custom'}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Legal Link */}
        <div className="mt-4 pt-2 border-t border-zinc-800/50 text-center">
          <button 
            onClick={() => setView('legal')}
            className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold hover:text-zinc-300 transition-colors"
          >
            Legal, Terms & Privacy
          </button>
        </div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-24 left-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 
              toast.type === 'info' ? 'bg-zinc-900/90 border-zinc-700 text-zinc-100' :
              'bg-red-900/90 border-red-500 text-red-100'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : 
             toast.type === 'info' ? <Info size={18} className="text-indigo-400" /> :
             <AlertCircle size={18} />}
            <span className="text-sm font-bold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prefill Confirmation Modal */}
      <AnimatePresence>
        {showPrefillConfirm && activeSuggestion && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrefillConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                  <Lightbulb size={32} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">SIA Noticed Patterns</h3>
                  <p className="text-sm text-zinc-400">I'm still learning your routine, but I've noticed these recurring habits. Apply them to today's log?</p>
                </div>

                <div className="w-full bg-zinc-800/50 rounded-2xl p-4 space-y-3">
                  {activeSuggestion.reasons.map((reason, i) => (
                    <div key={i} className="flex items-center gap-3 text-left">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      <span className="text-xs text-zinc-300 font-medium">{reason}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setShowPrefillConfirm(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      applySuggestion();
                      setShowPrefillConfirm(false);
                    }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    Apply These
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSleepGuide && (
          <React.Suspense fallback={<div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center text-white">Loading Guide...</div>}>
            <SleepGuideInteractive 
              onClose={() => setShowSleepGuide(false)} 
              onOpenPersonalization={() => setShowPersonalizationWizard(true)}
            />
          </React.Suspense>
        )}
      </AnimatePresence>

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
              className="bg-zinc-900 w-full max-w-4xl h-full max-h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border border-zinc-800"
            >
              {/* Report Header */}
              <div className="px-8 py-6 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Clinical Sleep Report</h2>
                    <p className="text-xs text-zinc-300 font-medium uppercase tracking-wider">SOAP Analysis • {view.toUpperCase()}</p>
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
                className="flex-1 overflow-y-auto p-12 md:p-16 bg-zinc-900 text-zinc-300 font-serif leading-relaxed"
              >
                <div className="max-w-2xl mx-auto space-y-8">
                  <div className="border-b-2 border-zinc-900 pb-8 mb-8">
                    <div className="grid grid-cols-2 gap-8 text-sm font-sans uppercase tracking-widest font-bold text-zinc-300">
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
      {view === 'dashboard' && (
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

      <AnimatePresence>
        {showPersonalizationWizard && user && (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>}>
            <PersonalizationWizard 
              user={user}
              onComplete={(profile) => {
                setPersonalizationProfile(profile);
                setShowPersonalizationWizard(false);
              }}
              onClose={() => setShowPersonalizationWizard(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>
      {pendingSuggestion && (
        <SiaPatternReview 
          isOpen={showPatternReview}
          onClose={() => setShowPatternReview(false)}
          onConfirm={handleConfirmPattern}
          suggestion={pendingSuggestion}
        />
      )}
    </div>
  );
}
