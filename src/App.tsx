/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  lazy,
  Suspense,
} from "react";
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
  Activity,
  Sparkles,
  Zap,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { DailyLog, SleepState, PersonalizationProfile } from "./types";
import { TOTAL_SLOTS, SLEEP_STATES, getSlotLabel } from "./constants";
import { MetricSummaryCard } from "./components/MetricSummaryCard";

const getDefaultLog = (date: string): DailyLog => ({
  date: date,
  type: "log",
  factors: {
    caffeine: { consumed: false, amount: 0, lastIntake: "" },
    alcohol: { consumed: false, drinks: 0, lastIntake: "" },
    medication: { taken: false, type: "", time: "" },
    exercise: { completed: false, type: "", time: "" },
    screensInBed: false,
    stressLevel: 3,
    lastMealTime: "",
    naturalWake: false,
    moodScore: 3,
    sleepGadgets: [],
  },
  sleepEvents: [],
  daily_remarks: "",
  sleep_quality: 5,
  morning_alertness: 5,
  daytime_energy: 5,
  source: "manual",
  isIgnored: false,
});

import {
  format,
  isAfter,
  parseISO,
  startOfDay,
  startOfWeek,
  startOfMonth,
  eachDayOfInterval,
  endOfDay,
  subDays,
} from "date-fns";

import {
  getTodayDate,
  getWeekDates,
  getMonthDates,
  getRangeDates,
  formatDisplayDate,
} from "./utils/dateUtils";
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
  indexToTime,
} from "./utils/sleepUtils";
import { calculateSafeAverage } from "./utils/statsEngine";

import Legal from "./features/legal/Legal";
import CorrectionHub from "./features/data/CorrectionHub";
const AIInsightsAgent = lazy(() => import("./features/ai/AIInsightsAgent"));
const DashboardContainer = lazy(
  () => import("./features/dashboard/DashboardContainer"),
);
const PersonalizationWizard = lazy(
  () => import("./features/data/PersonalizationWizard"),
);
import AccountPage from "./features/account/AccountPage";
import SleepRibbon from "./features/sleep/SleepRibbon";
import SleepPatternCard from "./features/sleep/SleepPatternCard";
import { SleepWindow } from "./features/sleep/SleepWindow";
import DataImporter from "./features/data/DataImporter";
import { AvatarFrame, MetricDisplay } from "./components/UI";
import { Navbar } from "./components/Navbar";
import { SiaPatternReview } from "./features/ai/SiaPatternReview";
import { GuideView } from "./features/guide/GuideView";
import { UserProvider } from "./context/UserContext";
import { useSleepStore } from "./store/useSleepStore";

import { useUIStore } from "./store/useUIStore";
import { useAIStore } from "./store/useAIStore";

import { saveLog, validateLogMetrics } from "./services/sleepService";
import {
  getSuggestedLog,
  AICorrection,
  SuggestionResult,
} from "./utils/patternEngine";
import { handleFirestoreError, OperationType } from "./lib/errorHandling";

import {
  auth,
  googleProvider,
  db,
  isFirebaseConfigured,
  onAuthStateChanged,
  signInWithPopup,
  getRedirectResult,
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
  browserLocalPersistence,
} from "./lib/firebase";
import {
  MaturityInfo,
  MaturitySystem,
} from "./services/ai/core/maturitySystem";

// Lazy load heavy components
const SleepGuideInteractive = React.lazy(
  () => import("./features/sleep/SleepGuideInteractive"),
);

// --- Components ---

const SliderInput = ({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  icon: Icon,
  info,
  id,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  icon?: any;
  info?: string;
  id: string;
}) => {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <button
          id={id}
          onClick={() => setShowInfo(!showInfo)}
          className="text-sm font-medium text-zinc-400 flex items-center gap-2 cursor-pointer active:opacity-70 relative group"
          aria-label={`Show info for ${label}`}
        >
          {Icon && <Icon size={16} className="text-indigo-400" />}
          {label}
          {info && (
            <>
              <Info size={14} className="text-zinc-500" />
              {showInfo && (
                <div className="absolute top-full mt-2 left-0 sm:left-full sm:-ml-2 sm:-top-2 sm:mt-0 w-56 p-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] rounded-lg shadow-xl z-50 text-left cursor-default pointer-events-none">
                  {info}
                </div>
              )}
            </>
          )}
        </button>
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
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [forecastMetrics, setForecastMetrics] = useState<{
    quality: number;
    alertness: number;
    energy: number;
  } | null>(null);

  const {
    logs,
    setLogs,
    selectedDate,
    setSelectedDate,
    updateLogLocally,
    saveLogFromState,
    deleteLog,
    isEditing,
    setIsEditing,
    isDragging,
    setIsDragging,
    activeState,
    setActiveState,
    dragAction,
    setDragAction,
    initialTimeline,
    setInitialTimeline,
    initialMetrics,
    setInitialMetrics,
    saveStatus,
    setSaveStatus,
  } = useSleepStore();

  const isFirestoreUpdate = useRef(false);

  const {
    view,
    setView,
    direction,
    setDirection,
    toast,
    setToast,
    showSleepGuide,
    setShowSleepGuide,
    isSleepToolsExpanded,
    setIsSleepToolsExpanded,
    highlightTier,
    setHighlightTier,
    showPersonalizationWizard,
    setShowPersonalizationWizard,
    customRange,
    setCustomRange,
    isRefreshing,
    setIsRefreshing,
    refreshKey,
    setRefreshKey,
    isImporting,
    setIsImporting,
  } = useUIStore();

  const {
    aiCorrections,
    setAiCorrections,
    activeSuggestion,
    setActiveSuggestion,
    prefillUsed,
    setPrefillUsed,
    originalSuggestion,
    setOriginalSuggestion,
    showPrefillConfirm,
    setShowPrefillConfirm,
    showPatternReview,
    setShowPatternReview,
    pendingSuggestion,
    setPendingSuggestion,
  } = useAIStore();

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToResearch, setAgreedToResearch] = useState(false);
  const [personalizationProfile, setPersonalizationProfile] =
    useState<PersonalizationProfile | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  const [maturity, setMaturity] = useState<MaturityInfo | null>(null);

  // Handle hash-based navigation for dev tools
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#/dev/map") {
        setView("dev-map");
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // Check on mount
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleViewChange = (newView: any) => {
    if (newView === "account") {
      setHighlightTier(true);
      setTimeout(() => setHighlightTier(false), 3000);
    }
    setView(newView);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const MAJOR_VIEWS = [
    "dashboard",
    "log",
    "ai",
    "account",
    "corrections",
    "import",
    "data",
    "dev-map",
  ];
  useEffect(() => {
    if (MAJOR_VIEWS.includes(view)) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [view]);

  const derivedTier = useMemo(() => {
    // Temporary override for testing
    if (import.meta.env.DEV) {
      const override = localStorage.getItem("sia_tier_override");
      if (override) return override;
    }

    if (userProfile?.tier === "Pro") return "Pro";
    if (userProfile?.tier === "Enhanced") return "Enhanced";
    if (personalizationProfile) return "Enhanced";
    return "Basic";
  }, [userProfile, personalizationProfile]);

  const currentLog = useMemo(() => {
    const defaultFactors = {
      caffeine: { consumed: false, amount: 0, lastIntake: "" },
      alcohol: { consumed: false, drinks: 0, lastIntake: "" },
      medication: { taken: false, type: "", time: "" },
      exercise: { completed: false, type: "", time: "" },
      screensInBed: false,
      stressLevel: 3,
      lastMealTime: "",
      naturalWake: false,
      moodScore: 3,
      sleepGadgets: [],
    };

    const log = (logs[selectedDate] || {
      date: selectedDate,
      type: "log",
      sleep_quality: 5,
      morning_alertness: 5,
      daytime_energy: 5,
      sleepEvents: [],
      daily_remarks: "",
      isIgnored: false,
      source: "manual",
      summaryMetrics: {
        sleep_quality: 5,
        morning_alertness: 5,
        daytime_energy: 5,
        importedDuration: 0,
        importedInBed: 0,
        sleep_efficiency: 0,
      },
      factors: defaultFactors,
    }) as DailyLog;

    // Ensure factors exist for legacy logs
    if (!log.factors) {
      log.factors = defaultFactors;
    }

    // Migration: If log has timeline but no sleepEvents, migrate it
    if (!log.sleepEvents || log.sleepEvents.length === 0) {
      if (
        log.timeline &&
        log.timeline.length > 0 &&
        !log.timeline.every((s) => s === "awake-out")
      ) {
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
    const sleepEvents = currentLog.sleepEvents.filter(
      (e) => e.type === "sleep",
    );
    if (sleepEvents.length === 0) return "20:00 to 20:00 (24h Tracking)";

    let minIdx = 96;
    let maxIdx = -1;
    let earliestStart = "";
    let latestEnd = "";

    sleepEvents.forEach((e) => {
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
    if (
      currentLog.factors.sleepGadgets &&
      currentLog.factors.sleepGadgets.length > 0
    ) {
      setIsSleepToolsExpanded(true);
    } else {
      setIsSleepToolsExpanded(false);
    }
  }, [selectedDate]);

  const historyCount = useMemo(() => Object.keys(logs).length, [logs]);

  const refreshAllData = async () => {
    setIsRefreshing(true);
    // Incrementing refreshKey will trigger the useEffect to re-subscribe/re-fetch
    setRefreshKey(refreshKey + 1);

    // Simulate a brief delay for visual feedback if it's too fast
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsRefreshing(false);
    setToast({ message: "Sync Complete", type: "success" });
  };

  const changeDate = (val: number | string) => {
    if (typeof val === "number") {
      const d = new Date(selectedDate + "T00:00:00");
      d.setDate(d.getDate() + val);

      // Check if more than 5 days in the future
      const today = new Date(getTodayDate() + "T00:00:00");
      const maxFutureDate = new Date(today);
      maxFutureDate.setDate(today.getDate() + 5);

      if (d > maxFutureDate) {
        return; // Prevent navigation
      }

      setDirection(val);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      setSelectedDate(`${year}-${month}-${day}`);
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
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const handleConfirmPattern = async () => {
    if (!pendingSuggestion) return;
    const suggestion = pendingSuggestion.suggestion as any;
    console.log("DEBUG: SIA Suggestion Received:", suggestion);

    // Bridge any naming gaps between AI and the Log Form
    const appliedMetrics = {
      sleep_quality: Number(
        suggestion.sleep_quality || suggestion.quality || 5,
      ),
      morning_alertness: Number(
        suggestion.morning_alertness || suggestion.alertness || 5,
      ),
      daytime_energy: Number(
        suggestion.daytime_energy || suggestion.energy || 5,
      ),
    };

    console.log("DEBUG: Applied Metrics:", appliedMetrics);

    setOriginalSuggestion(suggestion);
    setPrefillUsed(true);

    // Create a deep-merged factors object
    const mergedFactors = {
      ...currentLog.factors,
      ...suggestion.factors,
      caffeine: {
        ...currentLog.factors.caffeine,
        ...(suggestion.factors?.caffeine || {}),
      },
      alcohol: {
        ...currentLog.factors.alcohol,
        ...(suggestion.factors?.alcohol || {}),
      },
      medication: {
        ...currentLog.factors.medication,
        ...(suggestion.factors?.medication || {}),
      },
      exercise: {
        ...currentLog.factors.exercise,
        ...(suggestion.factors?.exercise || {}),
      },
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
        if (newTimeline[i] === "sleep") newTimeline[i] = "awake-out";
      }

      const startIdx = timeToIndex(start);
      const endIdx = timeToIndex(end);

      for (let i = startIdx; i < endIdx; i++) {
        newTimeline[i] = "sleep";
      }

      sleepEvents = convertGridToEvents(newTimeline);
    }

    // Canonical String Fix: Ensure HH:mm format
    const getFormattedTime = (time: any, slot: any) => {
      if (typeof time === "string" && time.includes(":")) return time;
      if (typeof time === "number") return slotToTimeString(time);
      if (slot !== undefined) return slotToTimeString(slot);
      return null;
    };

    const newLogData: Partial<DailyLog> = {
      ...currentLog, // Keep existing values
      factors: mergedFactors,
      daily_remarks: suggestion.daily_remarks || currentLog.daily_remarks,
      bedTime: getFormattedTime(
        (suggestion as any).bedTime,
        (suggestion as any).bedTimeSlot,
      ),
      wakeTime: getFormattedTime(
        (suggestion as any).wakeTime,
        (suggestion as any).wakeTimeSlot,
      ),
      visualTimeline: newTimeline,
      sleepEvents: sleepEvents,

      // RESTORE THE METRICS
      ...appliedMetrics,
    };

    console.log("DEBUG: Form State After Apply:", newLogData);

    // 3. Persist to Firestore
    const logId = currentLog.date;
    const logRef = doc(db, "users", user.uid, "sleep_logs", logId);

    // Ensure nulls are 0 or false
    const sanitizedLog = {
      ...newLogData,
      source: "predicted" as const,
      type: "log" as const,
      factors: {
        ...newLogData.factors,
        caffeine: {
          consumed: !!newLogData.factors?.caffeine?.consumed,
          amount: newLogData.factors?.caffeine?.amount || 0,
          lastIntake: newLogData.factors?.caffeine?.lastIntake || "08:00",
        },
        alcohol: {
          consumed: !!newLogData.factors?.alcohol?.consumed,
          drinks: newLogData.factors?.alcohol?.drinks || 0,
          lastIntake: newLogData.factors?.alcohol?.lastIntake || "20:00",
        },
        medication: {
          taken: !!newLogData.factors?.medication?.taken,
          type: newLogData.factors?.medication?.type || "",
          time: newLogData.factors?.medication?.time || "08:00",
        },
        exercise: {
          completed: !!newLogData.factors?.exercise?.completed,
          type: newLogData.factors?.exercise?.type || "",
          time: newLogData.factors?.exercise?.time || "08:00",
        },
      },
    };

    // Ensure accurate syncing using saveLogFromState
    updateLogLocally(logId, sanitizedLog);
    await saveLogFromState(user.uid, logId, "predicted");

    // Trigger UI update
    setToast({ message: "Routine applied & saved!", type: "success" });
    setShowPatternReview(false);
    setPendingSuggestion(null);

    // UI Feedback: Scroll to "Sleep Window" section
    setTimeout(() => {
      const sleepWindowSection = document.getElementById(
        "sleep-window-section",
      );
      if (sleepWindowSection) {
        sleepWindowSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 500 : -500,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 500 : -500,
      opacity: 0,
    }),
  };

  // Reset editing state on mount
  useEffect(() => {
    setIsEditing(false);
  }, []);

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const correctionsCount = useMemo(() => {
    const trackingStartDate = format(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd",
    );
    const start = startOfDay(parseISO(trackingStartDate));

    return (Object.values(logs) as DailyLog[]).filter((log: DailyLog) => {
      const logDate = parseISO(log.date);
      const isAfterStart =
        isAfter(logDate, start) || log.date === trackingStartDate;
      const isNotIgnored = !log.isIgnored;

      const hasTimeline =
        log.timeline &&
        log.timeline.length > 0 &&
        !log.timeline.every((s) => s === "awake-out");
      const hasSummaryMetrics =
        !!log.summaryMetrics &&
        typeof log.summaryMetrics.sleep_quality === "number" &&
        typeof log.summaryMetrics.morning_alertness === "number" &&
        typeof log.summaryMetrics.daytime_energy === "number";

      return (
        isAfterStart && isNotIgnored && (!hasTimeline || !hasSummaryMetrics)
      );
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
        console.error("Auth initialization error:", error);
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
        await getDocFromServer(doc(db, "_sia_system", "connection_test"));
      } catch (error: any) {
        if (error.message?.includes("offline")) {
          console.error(
            "CRITICAL: Firestore is offline. Check your Firebase configuration.",
          );
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

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      async (snapshot) => {
        if (!user.uid) return; // Fix 2: Ensure user.uid exists
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Migration: Ensure tier and quota exist for legacy users
          if (!data.tier || !data.quota) {
            const updatedProfile = {
              ...data,
              tier: data.tier || "Basic",
              quota: data.quota || {
                chatMessagesUsed: 0,
                lastPromptReset: new Date(),
              },
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
            tier: "Basic",
            quota: {
              chatMessagesUsed: 0,
              lastPromptReset: serverTimestamp(),
            },
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, initialProfile);
          setUserProfile(initialProfile);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch maturity info
  useEffect(() => {
    if (!user) return;
    MaturitySystem.getUserDataMaturity(user.uid).then(setMaturity);
  }, [user?.uid, refreshKey]);

  // Load Personalization Profile
  useEffect(() => {
    if (!user) {
      setPersonalizationProfile(null);
      setIsProfileLoading(false);
      return;
    }

    const profileRef = doc(db, "users", user.uid, "personalization", "profile");
    setIsProfileLoading(true);
    const unsubscribe = onSnapshot(
      profileRef,
      (doc) => {
        if (doc.exists()) {
          setPersonalizationProfile(doc.data() as PersonalizationProfile);
        }
        setIsProfileLoading(false);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.GET,
          `users/${user.uid}/personalization/profile`,
        );
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!auth) return;

    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log("Redirect sign-in successful", result.user);
        }
      })
      .catch((error: any) => {
        console.error("Redirect error", error);
        if (error.code === "auth/unauthorized-domain") {
          setLoginError(
            'This domain is not authorized in your Firebase project. Please add it to the "Authorized domains" list in the Firebase Console.',
          );
        } else if (error.code === "auth/operation-not-allowed") {
          setLoginError(
            'Google Sign-In is not enabled in your Firebase project. Please enable it in the "Authentication" section of the Firebase Console.',
          );
        } else {
          setLoginError("Login failed. Please try again.");
        }
      });
  }, []);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);

      await setDoc(
        doc(db, "users", result.user.uid, "consent", "v1"),
        {
          consentGivenAt: serverTimestamp(),
          consentVersion: "2026-06",
          purposes: ["service_provision"],
          researchConsent: agreedToResearch,
          ipRegion: "EU",
          method: "google-oauth-checkbox",
        },
        { merge: true },
      );
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === "auth/popup-blocked") {
        setLoginError(
          "Your browser blocked the login popup. Please allow popups for this site in your URL bar and try again.",
        );
      } else if (error.code === "auth/unauthorized-domain") {
        setLoginError(
          'This domain is not authorized in your Firebase project. Please add it to the "Authorized domains" list in the Firebase Console.',
        );
      } else if (error.code === "auth/operation-not-allowed") {
        setLoginError(
          'Google Sign-In is not enabled in your Firebase project. Please enable it in the "Authentication" section of the Firebase Console.',
        );
      } else {
        setLoginError("Login failed. Please try again.");
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

  const updateLog = (
    updates: Partial<DailyLog> | ((prevLog: DailyLog) => Partial<DailyLog>),
  ) => {
    const currentLogForDate = logs[selectedDate] || getDefaultLog(selectedDate);
    const newUpdates =
      typeof updates === "function" ? updates(currentLogForDate) : updates;
    const newLog = { ...currentLogForDate, ...newUpdates };

    if (newLog.source === "import") {
      newLog.source = "manual";
    }

    updateLogLocally(selectedDate, newLog);
    setSaveStatus("saving");
  };

  const updateFactors = (updates: Partial<DailyLog["factors"]>) => {
    updateLog((prevLog) => ({
      factors: { ...prevLog.factors, ...updates },
    }));
  };

  const toggleGadget = (type: string) => {
    const currentGadgets = currentLog.factors.sleepGadgets || [];
    const exists = currentGadgets.find((g) => g.type === type);

    if (exists) {
      updateFactors({
        sleepGadgets: currentGadgets.filter((g) => g.type !== type),
      });
    } else {
      updateFactors({
        sleepGadgets: [...currentGadgets, { type: type as any }],
      });
    }
  };

  const updateGadgetDetails = (type: string, updates: any) => {
    const currentGadgets = currentLog.factors.sleepGadgets || [];
    updateFactors({
      sleepGadgets: currentGadgets.map((g) =>
        g.type === type ? { ...g, ...updates } : g,
      ),
    });
  };

  const isGadgetSelected = (type: string) => {
    return (currentLog.factors.sleepGadgets || []).some((g) => g.type === type);
  };

  const getGadget = (type: string) => {
    return (currentLog.factors.sleepGadgets || []).find((g) => g.type === type);
  };

  const lastTouchTime = useRef<number>(0);

  const setSlotState = (index: number, state: SleepState) => {
    const newVisualTimeline = [...currentLog.visualTimeline];
    newVisualTimeline[index] = state;
    const newEvents = convertGridToEvents(newVisualTimeline, selectedDate);
    updateLog({ visualTimeline: newVisualTimeline, sleepEvents: newEvents });
  };

  const handleMouseDown = (index: number, fromTouch = false) => {
    if (!isEditing) return;
    if (!fromTouch && Date.now() - lastTouchTime.current < 500) return;
    setIsDragging(true);
    const currentState = currentLog.visualTimeline[index];
    const nextState = currentState === activeState ? "awake-out" : activeState;
    setDragAction(nextState === "awake-out" ? "erase" : "paint");
    setSlotState(index, nextState);
  };

  const handleMouseEnter = (index: number) => {
    if (!isDragging || !isEditing) return;
    const nextState = dragAction === "erase" ? "awake-out" : activeState;
    if (currentLog.visualTimeline[index] !== nextState) {
      setSlotState(index, nextState);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isEditing) return;
    lastTouchTime.current = Date.now();
    const target = e.target as HTMLElement;
    const element = target.closest("[data-slot-index]") as HTMLElement;
    if (element) {
      const indexAttr = element.getAttribute("data-slot-index");
      if (indexAttr !== null) {
        const index = parseInt(indexAttr);
        handleMouseDown(index, true);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isEditing) return;
    e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(
      touch.clientX,
      touch.clientY,
    ) as HTMLElement;
    const element = target?.closest("[data-slot-index]") as HTMLElement;
    if (element) {
      const indexAttr = element.getAttribute("data-slot-index");
      if (indexAttr !== null) {
        const index = parseInt(indexAttr);
        handleMouseEnter(index);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false);
  };

  const handleCancel = () => {
    if (initialTimeline && initialMetrics) {
      updateLog({
        visualTimeline: initialTimeline,
        sleepEvents: convertGridToEvents(initialTimeline, selectedDate),
        ...initialMetrics,
      });
    }
    setIsEditing(false);
    setInitialTimeline(null);
    setInitialMetrics(null);
  };

  const handleSave = async () => {
    setIsEditing(false);
    setInitialTimeline(null);
    setInitialMetrics(null);
    try {
      if (user?.uid) {
        await saveLogFromState(user.uid, selectedDate, "manual");
      }
      setToast({ message: "Changes saved", type: "success" });
    } catch (err) {
      console.error("handleSave failed:", err);
      setToast({ message: "Save failed — please try again", type: "error" });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const weekDates = useMemo(() => {
    const today = new Date();
    const start = subDays(today, 6); // Last 7 days including today
    return eachDayOfInterval({ start, end: today }).map((d) =>
      format(d, "yyyy-MM-dd"),
    );
  }, []);

  const monthDates = useMemo(() => {
    const today = new Date();
    const start = subDays(today, 29); // Last 30 days including today
    return eachDayOfInterval({ start, end: today }).map((d) =>
      format(d, "yyyy-MM-dd"),
    );
  }, []);
  const customDates = useMemo(
    () => getRangeDates(customRange.start, customRange.end),
    [customRange],
  );

  const activeDates = useMemo(() => {
    if (view === "weekly") return weekDates;
    if (view === "monthly") return monthDates;
    if (view === "custom") return customDates;
    if (view === "dashboard") {
      const dates = [];
      const baseDate = new Date(selectedDate);
      for (let i = 0; i < 7; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split("T")[0]);
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

    // Fetch up to 5 years of data so insights and roadmap reflect historical imported logs
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const fiveYearsAgoStr = fiveYearsAgo.toISOString().split("T")[0];

    if (!db) return;

    const q = query(
      collection(db, "users", user.uid, "sleep_logs"),
      where("date", ">=", fiveYearsAgoStr),
      orderBy("date", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("onSnapshot triggered, logs fetched:", snapshot.size);
        // Disable Persistence Sync during import to prevent network/CORS timeouts
        if (isImporting) return;

        isFirestoreUpdate.current = true;
        setLogs((prevLogs) => {
          const fetchedLogs: Record<string, DailyLog> = { ...prevLogs };
          snapshot.forEach((doc) => {
            const data = doc.data() as DailyLog;
            // Ensure visualTimeline exists
            if (!data.visualTimeline) {
              data.visualTimeline =
                data.timeline || Array(TOTAL_SLOTS).fill("awake-out");
            }
            // Normalize logs to ensure correct visualTimeline length
            if (data.visualTimeline.length !== TOTAL_SLOTS) {
              if (data.visualTimeline.length < TOTAL_SLOTS) {
                data.visualTimeline = [
                  ...data.visualTimeline,
                  ...Array(TOTAL_SLOTS - data.visualTimeline.length).fill(
                    "awake-out",
                  ),
                ];
              } else {
                data.visualTimeline = data.visualTimeline.slice(0, TOTAL_SLOTS);
              }
            }
            fetchedLogs[doc.id] = data;
          });
          return fetchedLogs;
        });
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${user.uid}/sleep_logs`,
        );
      },
    );

    return () => unsubscribe();
  }, [user, activeDates, refreshKey]);

  // Fetch AI Corrections
  useEffect(() => {
    if (!user) {
      setAiCorrections([]);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "ai_corrections"),
      orderBy("date", "desc"),
      limit(50),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedCorrections: AICorrection[] = [];
        snapshot.forEach((doc) => {
          fetchedCorrections.push(doc.data() as AICorrection);
        });
        setAiCorrections(fetchedCorrections);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${user.uid}/ai_corrections`,
        );
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Calculate Intelligent Prefill Suggestion
  useEffect(() => {
    if (view !== "log" || !user) {
      setActiveSuggestion(null);
      return;
    }

    // Only suggest if the current log is "empty" (default values)
    const log = logs[selectedDate];
    const isEmpty =
      !log ||
      (log.daily_remarks === "" &&
        (!log.sleepEvents || log.sleepEvents.length === 0) &&
        (!log.timeline || log.timeline.every((s) => s === "awake-out")) &&
        !log.factors.caffeine.consumed &&
        !log.factors.alcohol.consumed &&
        !log.factors.medication.taken &&
        !log.factors.exercise.completed);

    if (isEmpty) {
      const result = getSuggestedLog(
        Object.values(logs),
        selectedDate,
        aiCorrections,
      );
      // Always set suggestion now, but UI will handle state based on confidence/history
      setActiveSuggestion(result);
    } else {
      setActiveSuggestion(null);
    }
  }, [view, selectedDate, logs, aiCorrections, user]);

  useEffect(() => {
    if (!user?.uid || !logs[selectedDate]) return;
    if (isFirestoreUpdate.current) {
      isFirestoreUpdate.current = false;
      return;
    }
    if (saveStatus !== "saving") return;
    const timer = setTimeout(async () => {
      try {
        await saveLogFromState(user.uid, selectedDate, "manual");
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSaveStatus("idle");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [logs[selectedDate], selectedDate, user?.uid, saveStatus]);

  const averageStats = useMemo(() => {
    const periodLogs = activeDates.map((d) => logs[d]).filter(Boolean);
    if (periodLogs.length === 0) return null;

    return {
      sq: calculateSafeAverage(periodLogs, "sleep_quality").average,
      r: calculateSafeAverage(periodLogs, "morning_alertness").average,
      l: calculateSafeAverage(periodLogs, "daytime_energy").average,
      duration: calculateSafeAverage(periodLogs, "sleepDuration").average,
      efficiency: calculateSafeAverage(periodLogs, "efficiency").average,
    };
  }, [logs, activeDates]);

  const handlePrint = () => {
    if (!userProfile || userProfile.tier === "Basic") {
      setToast({
        message: "Clinical Reports are available on Enhanced and Pro plans.",
        type: "info",
      });
      return;
    }
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>SIA Clinical Report - ${user.displayName || "Patient"}</title>
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
            <p><strong>Patient:</strong> ${user.displayName || "N/A"}</p>
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Period:</strong> ${activeDates[0]} to ${activeDates[activeDates.length - 1]}</p>
          </div>
          <div class="content">
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
          className="max-w-md w-full bg-zinc-900/50 border border-red-500/30 p-8 rounded-3xl text-center space-y-6 shadow-2xl"
        >
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-900/20 rounded-2xl flex items-center justify-center border border-red-500/30">
              <Info className="text-red-400" size={32} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Configuration Required
            </h1>
            <p className="text-zinc-400 text-sm">
              Firebase configuration is missing or incomplete. Please provide
              your Firebase API keys in the <strong>Settings</strong> menu.
            </p>
          </div>
          <div className="bg-zinc-900/80 p-4 rounded-2xl text-left space-y-2 border border-zinc-800">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
              Required Keys:
            </p>
            <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
              <li>VITE_FIREBASE_API_KEY</li>
              <li>VITE_FIREBASE_PROJECT_ID</li>
              <li>VITE_FIREBASE_APP_ID</li>
            </ul>
          </div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
            Check .env.example for details
          </p>
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
          {view === "legal" ? (
            <div className="max-w-4xl w-full">
              <Legal onBack={() => setView("dashboard")} />
            </div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl text-center space-y-8 shadow-2xl"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 overflow-hidden aspect-square">
                  <img
                    src="https://i.imgur.com/MnI5hn3.png"
                    alt="SIA"
                    className="w-12 h-12 object-cover"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome to SIA
                </h1>
                <p className="text-zinc-500 text-sm">
                  Your Sleep Intelligence Agent is ready to analyze your
                  recovery. Please sign in to continue.
                </p>
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
                  {loginError.includes("unauthorized-domain") && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">
                        Domains to authorize:
                      </p>
                      <code className="block bg-black/40 p-2 rounded text-[9px] text-zinc-400 break-all">
                        ais-dev-fmg7uq3djal22v6onfvt5h-575319715638.europe-west2.run.app
                      </code>
                      <code className="block bg-black/40 p-2 rounded text-[9px] text-zinc-400 break-all">
                        ais-pre-fmg7uq3djal22v6onfvt5h-575319715638.europe-west2.run.app
                      </code>
                    </div>
                  )}
                  {loginError.includes("Google Sign-In is not enabled") && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">
                        How to fix:
                      </p>
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
                  <label
                    htmlFor="terms"
                    className="text-xs text-zinc-400 leading-relaxed cursor-pointer"
                  >
                    I agree to the{" "}
                    <button
                      onClick={() => setView("legal")}
                      className="text-indigo-400 hover:underline"
                    >
                      Terms of Use and Privacy Policy
                    </button>
                    . I understand SIA processes sleep and health data as
                    described therein.
                  </label>
                </div>

                <div className="flex items-start gap-3 text-left p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                  <input
                    type="checkbox"
                    id="research"
                    checked={agreedToResearch}
                    onChange={(e) => setAgreedToResearch(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="research"
                    className="text-xs text-zinc-400 leading-relaxed cursor-pointer"
                  >
                    I voluntarily consent to my anonymized sleep data being used
                    for scientific sleep research. This is optional and does not
                    affect app functionality.
                  </label>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={!agreedToTerms}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all group ${
                    agreedToTerms
                      ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  <LogIn size={20} />
                  Sign in with Google
                </button>
              </div>

              <div className="pt-4 border-t border-zinc-800/50">
                <button
                  onClick={() => setView("legal")}
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
    <UserProvider
      user={user}
      userProfile={userProfile}
      personalizationProfile={personalizationProfile}
      isProfileLoading={isProfileLoading}
      tier={derivedTier}
      maturity={maturity}
      highlightTier={highlightTier}
    >
      <div
        className={`min-h-screen bg-clinical-bg text-clinical-text font-sans selection:bg-indigo-500/30 max-w-[100vw] overflow-x-hidden ${personalizationProfile ? "enhanced-mode" : ""}`}
      >
        {/* Navbar */}
        <Navbar
          user={user}
          view={view}
          setView={handleViewChange}
          handleLogout={handleLogout}
          derivedTier={derivedTier}
        />

        <main className="max-w-6xl mx-auto p-4 pb-24 pt-20 md:pt-24 touch-pan-y">
          <AnimatePresence mode="wait">
            {view === "dashboard" ? (
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
                      opacity: { duration: 0.2 },
                    }}
                  >
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center h-64">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      }
                    >
                      <DashboardContainer
                        user={user}
                        userProfile={{ ...userProfile, tier: derivedTier }}
                        selectedDate={selectedDate}
                        personalizationProfile={personalizationProfile}
                        onLogClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          const year = yesterday.getFullYear();
                          const month = String(
                            yesterday.getMonth() + 1,
                          ).padStart(2, "0");
                          const day = String(yesterday.getDate()).padStart(
                            2,
                            "0",
                          );
                          setSelectedDate(`${year}-${month}-${day}`);
                          setView("log");
                        }}
                        onViewChange={handleViewChange}
                        onDateChange={changeDate}
                        onOpenPersonalization={() =>
                          setShowPersonalizationWizard(true)
                        }
                        onOpenSleepGuide={() => handleViewChange("guide")}
                        refreshAllData={refreshAllData}
                        isRefreshing={isRefreshing}
                        forecastMetrics={forecastMetrics}
                      />
                    </Suspense>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            ) : view === "corrections" ? (
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
                    setView("log");
                  }}
                />
              </motion.div>
            ) : view === "log" ? (
              <motion.div
                key="log"
                id="log-form-container"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 relative overflow-hidden"
              >
                {/* Import Alert */}
                {currentLog.source === "import" && (
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
                        Data for this night was uploaded via Import. Do you want
                        to manually adjust the data?
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setInitialTimeline([...currentLog.visualTimeline]);
                        setInitialMetrics({
                          sleep_quality: currentLog.sleep_quality,
                          morning_alertness: currentLog.morning_alertness,
                          daytime_energy: currentLog.daytime_energy,
                        });
                        setIsEditing(true);
                      }}
                      className="text-[10px] font-black text-amber-500 uppercase tracking-widest hover:text-amber-400 transition-colors whitespace-nowrap"
                    >
                      Adjust Data
                    </button>
                  </motion.div>
                )}

                {/* Date Selector - Now outside sliding area to stay visible */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                    Logging sleep for:
                  </span>
                  <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 w-full">
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
                      <p
                        id="log-date-label"
                        className="text-[10px] font-black text-zinc-300 uppercase tracking-widest"
                      >
                        {(() => {
                          const today = getTodayDate();
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

                          if (selectedDate === today) return "TODAY";
                          if (selectedDate === yesterdayStr)
                            return "YESTERDAY NIGHT";
                          if (
                            new Date(selectedDate + "T00:00:00") >
                            new Date(today + "T00:00:00")
                          )
                            return "FUTURE PLANNING";
                          return "HISTORICAL LOG";
                        })()}
                      </p>
                    </div>

                    <button
                      id="log-date-next"
                      onClick={() => changeDate(1)}
                      disabled={
                        new Date(selectedDate + "T00:00:00") >=
                        (() => {
                          const today = new Date(getTodayDate() + "T00:00:00");
                          today.setDate(today.getDate() + 5);
                          return today;
                        })()
                      }
                      className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                {new Date(selectedDate + "T00:00:00") >
                  new Date(getTodayDate() + "T00:00:00") && (
                  <div className="bg-amber-900/20 border border-amber-800/50 text-amber-500 text-xs p-3 rounded-xl mt-4">
                    Future planning: You can pre-fill your routine for this
                    upcoming night. SIA will finalize this analysis once the
                    data is logged.
                  </div>
                )}

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
                      opacity: { duration: 0.2 },
                    }}
                    className="space-y-8"
                  >
                    {/* Timeline Section */}
                    <section className="space-y-4">
                      {/* Anchor Container for SIA Learning & Editing Controls */}
                      {(isEditing ||
                        (activeSuggestion && !prefillUsed) ||
                        (!isEditing && !activeSuggestion)) && (
                        <div className="min-h-[15svh] flex items-center justify-center bg-gradient-to-r from-indigo-950/40 via-indigo-900/10 to-indigo-950/40 border border-indigo-500/20 rounded-2xl overflow-hidden relative group">
                          <AnimatePresence mode="wait">
                            {isEditing ? (
                              <motion.div
                                key="editing"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="w-full h-full min-h-[15svh] flex flex-col items-center justify-center p-6 space-y-4"
                              >
                                <div className="flex items-center gap-3 text-indigo-400">
                                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                                    <Wand2
                                      size={20}
                                      className="animate-pulse"
                                    />
                                  </div>
                                  <div className="text-left">
                                    <h3 className="text-sm font-bold uppercase tracking-widest">
                                      Editing Mode
                                    </h3>
                                    <p className="text-[10px] text-zinc-300">
                                      Adjust your sleep window on the grid below
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  {currentLog.modifiedBySync?.some(
                                    (v) => v,
                                  ) && (
                                    <button
                                      onClick={() => {
                                        const { modifiedBySync, ...rest } =
                                          currentLog;
                                        updateLog({
                                          modifiedBySync: undefined,
                                        });
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
                                        if (initialTimeline && initialMetrics) {
                                          const newEvents = convertGridToEvents(
                                            initialTimeline,
                                            selectedDate,
                                          );
                                          updateLog({
                                            visualTimeline: initialTimeline,
                                            sleepEvents: newEvents,
                                            ...initialMetrics,
                                          });
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
                                className="w-full h-full min-h-[15svh] flex flex-col items-center justify-center"
                              >
                                {(() => {
                                  const confidenceValues = Object.values(
                                    activeSuggestion.confidenceMap,
                                  );
                                  const confidence =
                                    confidenceValues.length > 0
                                      ? confidenceValues.reduce(
                                          (a, b) => a + b,
                                          0,
                                        ) / confidenceValues.length
                                      : 0;

                                  if (historyCount < 3) {
                                    return (
                                      <button
                                        onClick={() =>
                                          setToast({
                                            message: `SIA needs ${3 - historyCount} more days of data to recognize your patterns.`,
                                            type: "info",
                                          })
                                        }
                                        className="w-full h-full flex-1 flex flex-col items-center justify-center gap-3 grayscale opacity-50 cursor-not-allowed p-6 transition-all"
                                      >
                                        <Sparkles
                                          className="text-zinc-600 shrink-0"
                                          size={24}
                                        />
                                        <div className="text-center">
                                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-tight">
                                            {historyCount === 0
                                              ? "SIA Learning: Log nights to enable prefill"
                                              : `SIA Learning: Log ${3 - historyCount} more nights for prefill`}
                                          </p>
                                          <p className="text-[8px] text-zinc-500 uppercase tracking-widest leading-tight mt-1">
                                            {historyCount === 0
                                              ? "Log your first night to enable pattern prefill"
                                              : "Log more nights to enable pattern prefill"}
                                          </p>
                                        </div>
                                      </button>
                                    );
                                  }

                                  if (
                                    confidence < 0.8 &&
                                    !(activeSuggestion as any).median
                                  ) {
                                    return (
                                      <button
                                        onClick={() =>
                                          setShowPrefillConfirm(true)
                                        }
                                        className="w-full h-full flex-1 flex flex-col items-center justify-center gap-3 group p-6 hover:bg-white/5 transition-all"
                                      >
                                        <Lightbulb
                                          className="text-amber-400 group-hover:scale-110 transition-transform"
                                          size={24}
                                        />
                                        <div className="text-center">
                                          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                            SIA Draft: Suggested Fill Available
                                          </p>
                                          <p className="text-[8px] text-amber-600/70 mt-1 uppercase tracking-widest">
                                            Click to preview your routine
                                          </p>
                                        </div>
                                      </button>
                                    );
                                  }

                                  return (
                                    <button
                                      onClick={applySuggestion}
                                      className="w-full h-full flex-1 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3 group relative overflow-hidden p-6"
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                      <Wand2
                                        className="text-indigo-400 group-hover:rotate-12 transition-transform"
                                        size={24}
                                      />
                                      <div className="text-center">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                          SIA Master: Apply Routine
                                        </p>
                                        <p className="text-[8px] text-indigo-500/70 mt-1 uppercase tracking-widest">
                                          High confidence pattern detected
                                        </p>
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
                                className="w-full h-full min-h-[15svh] flex flex-col items-center justify-center p-6 space-y-4"
                              >
                                <div className="flex items-center gap-8">
                                  <div className="text-center">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                      Duration
                                    </p>
                                    <p className="text-xl font-mono font-bold text-white tracking-tight">
                                      {formatDuration(
                                        calculateSleepDuration(
                                          currentLog.visualTimeline,
                                        ),
                                      )}
                                    </p>
                                  </div>
                                  <div className="w-px h-8 bg-zinc-800" />
                                  <div className="text-center">
                                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1">
                                      Efficiency
                                    </p>
                                    <p className="text-xl font-mono font-bold text-emerald-400 tracking-tight">
                                      {calculateSleepEfficiency(
                                        currentLog.visualTimeline,
                                      )}
                                      %
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <div className="flex justify-between items-end">
                        <div>
                          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
                            Sleep Window
                          </h2>
                          <p className="text-[10px] text-zinc-400 mt-1">
                            {sleepWindowText}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-center mb-4 z-30 relative">
                        {SLEEP_STATES.filter(
                          (s) => s.value !== "awake-out",
                        ).map((state) => (
                          <button
                            key={state.value}
                            onClick={() => setActiveState(state.value)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                              activeState === state.value
                                ? state.value === "sleep"
                                  ? "border-emerald-500 bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                                  : "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                                : "border-zinc-800 text-zinc-400"
                            }`}
                          >
                            {state.value === "awake-in"
                              ? "Awake In Bed"
                              : state.label}
                          </button>
                        ))}
                      </div>

                      <div
                        className={`relative bg-zinc-900 border rounded-2xl overflow-hidden select-none flex flex-col divide-y divide-zinc-800/50 transition-all cursor-pointer ${
                          isEditing
                            ? "border-indigo-500 ring-2 ring-indigo-500/20 touch-none"
                            : "border-zinc-800 touch-manipulation"
                        }`}
                        onClick={() => {
                          if (!isEditing) {
                            setInitialTimeline([...currentLog.visualTimeline]);
                            setInitialMetrics({
                              sleep_quality: currentLog.sleep_quality,
                              morning_alertness: currentLog.morning_alertness,
                              daytime_energy: currentLog.daytime_energy,
                            });
                            setIsEditing(true);
                          }
                        }}
                      >
                        <AnimatePresence>
                          {!isEditing && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 z-20 flex flex-col items-center justify-center group touch-pan-y pointer-events-none bg-black/20 backdrop-blur-[2px]"
                            >
                              <>
                                <button
                                  onClick={() => setIsEditing(true)}
                                  className="bg-zinc-900/90 border border-zinc-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
                                >
                                  <Plus size={14} />
                                  Tap to edit sleep window
                                </button>

                                {/* Scroll Hint */}
                                <div className="absolute bottom-4 flex flex-col items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                    Drag to scroll / Tap to edit
                                  </p>
                                  <motion.div
                                    animate={{ y: [0, 4, 0] }}
                                    transition={{
                                      repeat: Infinity,
                                      duration: 1.5,
                                    }}
                                  >
                                    <ChevronDown
                                      size={12}
                                      className="text-zinc-500"
                                    />
                                  </motion.div>
                                </div>
                              </>
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
                          onRowApply={(rowIdx) => {
                            const newTimeline = [...currentLog.visualTimeline];
                            for (
                              let i = rowIdx * 16;
                              i < (rowIdx + 1) * 16;
                              i++
                            ) {
                              newTimeline[i] = activeState;
                            }
                            const sleepEvents = convertGridToEvents(
                              newTimeline,
                              selectedDate,
                            );
                            updateLog({
                              visualTimeline: newTimeline,
                              sleepEvents,
                            });
                          }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-zinc-300 px-1 italic">
                        <span>Start: 20:00</span>
                        <span>
                          Duration:{" "}
                          {formatDuration(
                            calculateSleepDuration(currentLog.visualTimeline),
                          )}
                        </span>
                        <span>End: {getSlotLabel(TOTAL_SLOTS)}</span>
                      </div>
                    </section>

                    {/* Metrics Section */}
                    <section className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/50 space-y-6">
                      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300 mb-4">
                        Daily Metrics
                      </h2>
                      <div className="grid gap-8">
                        <SliderInput
                          id="log-info-quality"
                          label="Sleep Quality (0-10)"
                          value={currentLog.sleep_quality}
                          onChange={(val) => updateLog({ sleep_quality: val })}
                          min={0}
                          max={10}
                          icon={Moon}
                          info="Measures how restorative and uninterrupted your sleep felt throughout the night."
                        />
                        <SliderInput
                          id="log-info-restedness"
                          label="Restedness after Awakening (0-10)"
                          value={currentLog.morning_alertness}
                          onChange={(val) =>
                            updateLog({ morning_alertness: val })
                          }
                          min={0}
                          max={10}
                          icon={Sun}
                          info="Reflects how refreshed and ready for the day you felt immediately upon waking."
                        />
                        <SliderInput
                          id="log-info-energy"
                          label="Energy Level in the Morning (0-10)"
                          value={currentLog.daytime_energy}
                          onChange={(val) => updateLog({ daytime_energy: val })}
                          min={0}
                          max={10}
                          icon={BarChart3}
                          info="Indicates your overall vitality and alertness levels during the early part of your day."
                        />
                      </div>
                    </section>

                    {/* Daily Factors & Disturbances Section */}
                    <section className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/50 space-y-6">
                      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
                        Daily Factors & Disturbances
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Caffeine */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-zinc-300">
                              <Coffee
                                size={18}
                                className={
                                  currentLog.factors.caffeine.consumed
                                    ? "text-amber-500"
                                    : "text-zinc-600"
                                }
                              />
                              <span className="text-sm font-medium">
                                Caffeine
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                updateFactors({
                                  caffeine: {
                                    ...currentLog.factors.caffeine,
                                    consumed:
                                      !currentLog.factors.caffeine.consumed,
                                  },
                                })
                              }
                              className={`w-10 h-5 rounded-full transition-colors relative ${currentLog.factors.caffeine.consumed ? "bg-indigo-600" : "bg-zinc-700"}`}
                            >
                              <div
                                className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentLog.factors.caffeine.consumed ? "left-6" : "left-1"}`}
                              />
                            </button>
                          </div>
                          {currentLog.factors.caffeine.consumed && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="grid grid-cols-2 gap-2 pt-1"
                            >
                              <div className="space-y-1">
                                <label className="text-[10px] text-zinc-300 uppercase font-bold">
                                  Amount (mg/cups)
                                </label>
                                <input
                                  type="number"
                                  value={currentLog.factors.caffeine.amount}
                                  onChange={(e) =>
                                    updateFactors({
                                      caffeine: {
                                        ...currentLog.factors.caffeine,
                                        amount: parseInt(e.target.value) || 0,
                                      },
                                    })
                                  }
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">
                                  Last Intake
                                </label>
                                <input
                                  type="time"
                                  value={currentLog.factors.caffeine.lastIntake}
                                  onChange={(e) =>
                                    updateFactors({
                                      caffeine: {
                                        ...currentLog.factors.caffeine,
                                        lastIntake: e.target.value,
                                      },
                                    })
                                  }
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
                              <Wine
                                size={18}
                                className={
                                  currentLog.factors.alcohol.consumed
                                    ? "text-red-500"
                                    : "text-zinc-600"
                                }
                              />
                              <span className="text-sm font-medium">
                                Alcohol
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                updateFactors({
                                  alcohol: {
                                    ...currentLog.factors.alcohol,
                                    consumed:
                                      !currentLog.factors.alcohol.consumed,
                                  },
                                })
                              }
                              className={`w-10 h-5 rounded-full transition-colors relative ${currentLog.factors.alcohol.consumed ? "bg-indigo-600" : "bg-zinc-700"}`}
                            >
                              <div
                                className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentLog.factors.alcohol.consumed ? "left-6" : "left-1"}`}
                              />
                            </button>
                          </div>
                          {currentLog.factors.alcohol.consumed && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="grid grid-cols-2 gap-2 pt-1"
                            >
                              <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">
                                  Drinks
                                </label>
                                <input
                                  type="number"
                                  value={currentLog.factors.alcohol.drinks}
                                  onChange={(e) =>
                                    updateFactors({
                                      alcohol: {
                                        ...currentLog.factors.alcohol,
                                        drinks: parseInt(e.target.value) || 0,
                                      },
                                    })
                                  }
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">
                                  Last Intake
                                </label>
                                <input
                                  type="time"
                                  value={currentLog.factors.alcohol.lastIntake}
                                  onChange={(e) =>
                                    updateFactors({
                                      alcohol: {
                                        ...currentLog.factors.alcohol,
                                        lastIntake: e.target.value,
                                      },
                                    })
                                  }
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
                              <Pill
                                size={18}
                                className={
                                  currentLog.factors.medication.taken
                                    ? "text-blue-400"
                                    : "text-zinc-600"
                                }
                              />
                              <span className="text-sm font-medium">
                                Medication
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                updateFactors({
                                  medication: {
                                    ...currentLog.factors.medication,
                                    taken: !currentLog.factors.medication.taken,
                                  },
                                })
                              }
                              className={`w-10 h-5 rounded-full transition-colors relative ${currentLog.factors.medication.taken ? "bg-indigo-600" : "bg-zinc-700"}`}
                            >
                              <div
                                className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentLog.factors.medication.taken ? "left-6" : "left-1"}`}
                              />
                            </button>
                          </div>
                          {currentLog.factors.medication.taken && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="grid grid-cols-2 gap-2 pt-1"
                            >
                              <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">
                                  Type
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Melatonin"
                                  value={currentLog.factors.medication.type}
                                  onChange={(e) =>
                                    updateFactors({
                                      medication: {
                                        ...currentLog.factors.medication,
                                        type: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">
                                  Time
                                </label>
                                <input
                                  type="time"
                                  value={currentLog.factors.medication.time}
                                  onChange={(e) =>
                                    updateFactors({
                                      medication: {
                                        ...currentLog.factors.medication,
                                        time: e.target.value,
                                      },
                                    })
                                  }
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
                              <Dumbbell
                                size={18}
                                className={
                                  currentLog.factors.exercise.completed
                                    ? "text-emerald-500"
                                    : "text-zinc-600"
                                }
                              />
                              <span className="text-sm font-medium">
                                Exercise
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                updateFactors({
                                  exercise: {
                                    ...currentLog.factors.exercise,
                                    completed:
                                      !currentLog.factors.exercise.completed,
                                  },
                                })
                              }
                              className={`w-10 h-5 rounded-full transition-colors relative ${currentLog.factors.exercise.completed ? "bg-indigo-600" : "bg-zinc-700"}`}
                            >
                              <div
                                className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentLog.factors.exercise.completed ? "left-6" : "left-1"}`}
                              />
                            </button>
                          </div>
                          {currentLog.factors.exercise.completed && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="grid grid-cols-2 gap-2 pt-1"
                            >
                              <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">
                                  Type
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Cardio"
                                  value={currentLog.factors.exercise.type}
                                  onChange={(e) =>
                                    updateFactors({
                                      exercise: {
                                        ...currentLog.factors.exercise,
                                        type: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">
                                  Time
                                </label>
                                <input
                                  type="time"
                                  value={currentLog.factors.exercise.time}
                                  onChange={(e) =>
                                    updateFactors({
                                      exercise: {
                                        ...currentLog.factors.exercise,
                                        time: e.target.value,
                                      },
                                    })
                                  }
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
                            <span className="text-sm font-medium">
                              Screens in Bed
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              updateFactors({
                                screensInBed: !currentLog.factors.screensInBed,
                              })
                            }
                            className={`w-10 h-5 rounded-full transition-colors relative ${currentLog.factors.screensInBed ? "bg-indigo-600" : "bg-zinc-700"}`}
                          >
                            <div
                              className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentLog.factors.screensInBed ? "left-6" : "left-1"}`}
                            />
                          </button>
                        </div>

                        {/* Natural Wake */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-zinc-300 group relative">
                            <Sunrise
                              size={18}
                              className={
                                currentLog.factors.naturalWake
                                  ? "text-yellow-400"
                                  : "text-zinc-600"
                              }
                            />
                            <span className="text-sm font-medium">
                              Natural Wake
                            </span>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-zinc-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                              Did you wake up without an alarm?
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              updateFactors({
                                naturalWake: !currentLog.factors.naturalWake,
                              })
                            }
                            className={`w-10 h-5 rounded-full transition-colors relative ${currentLog.factors.naturalWake ? "bg-indigo-600" : "bg-zinc-700"}`}
                          >
                            <div
                              className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentLog.factors.naturalWake ? "left-6" : "left-1"}`}
                            />
                          </button>
                        </div>

                        {/* Stress Level */}
                        <SliderInput
                          id="log-info-stress"
                          label="Stress Level"
                          value={currentLog.factors.stressLevel || 3}
                          onChange={(val) =>
                            updateFactors({ stressLevel: val })
                          }
                          min={1}
                          max={5}
                          icon={Brain}
                        />

                        {/* Morning Mood */}
                        <SliderInput
                          id="log-info-mood"
                          label="Morning Mood"
                          value={currentLog.factors.moodScore || 3}
                          onChange={(val) => updateFactors({ moodScore: val })}
                          min={1}
                          max={5}
                          icon={Sun}
                        />

                        {/* Last Meal */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-zinc-300">
                            <UtensilsCrossed
                              size={18}
                              className={
                                currentLog.factors.lastMealTime
                                  ? "text-orange-400"
                                  : "text-zinc-600"
                              }
                            />
                            <span className="text-sm font-medium">
                              Last Meal
                            </span>
                          </div>
                          <input
                            type="time"
                            value={currentLog.factors.lastMealTime || ""}
                            onChange={(e) =>
                              updateFactors({ lastMealTime: e.target.value })
                            }
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                          />
                        </div>
                      </div>
                    </section>

                    {/* Sleep support tools Section */}
                    <section className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                      <button
                        onClick={() =>
                          setIsSleepToolsExpanded(!isSleepToolsExpanded)
                        }
                        className="w-full p-6 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                            <Wand2 size={18} className="text-indigo-400" />
                          </div>
                          <div className="text-left">
                            <h2 className="text-sm font-bold text-white">
                              Sleep support tools
                            </h2>
                            <p className="text-[10px] text-zinc-300 uppercase tracking-widest font-black">
                              Interventions & Aids
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {(() => {
                            const interventions =
                              currentLog.factors.interventions || {};
                            const passiveAids =
                              currentLog.factors.passiveAids || {};

                            const interventionCount = Object.values(
                              interventions,
                            ).filter(
                              (item: any) => item?.enabled === true,
                            ).length;

                            const passiveCount = Object.values(
                              passiveAids,
                            ).filter(
                              (item: any) =>
                                item === true || item?.enabled === true,
                            ).length;

                            const totalActive =
                              interventionCount + passiveCount;

                            return totalActive > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                                {totalActive}
                              </span>
                            ) : null;
                          })()}
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
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="px-6 pb-6 pt-6 space-y-8"
                          >
                            {/* Sub-section 1: Interventions */}
                            <div className="space-y-4">
                              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 border-b border-zinc-800/50 pb-2">
                                Interventions
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Light Therapy */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Lightbulb
                                        size={18}
                                        className={
                                          isGadgetSelected("light_therapy")
                                            ? "text-yellow-400"
                                            : "text-zinc-600"
                                        }
                                      />
                                      <span className="text-sm font-medium text-zinc-300">
                                        Light Therapy
                                      </span>
                                    </div>
                                    <button
                                      onClick={() =>
                                        toggleGadget("light_therapy")
                                      }
                                      className={`w-10 h-5 rounded-full transition-colors relative ${isGadgetSelected("light_therapy") ? "bg-indigo-600" : "bg-zinc-700"}`}
                                    >
                                      <div
                                        className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isGadgetSelected("light_therapy") ? "left-6" : "left-1"}`}
                                      />
                                    </button>
                                  </div>
                                  {isGadgetSelected("light_therapy") && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      className="pl-11 space-y-4 pt-1"
                                    >
                                      <div className="space-y-2">
                                        <label className="text-[10px] text-zinc-300 uppercase font-bold">
                                          Duration
                                        </label>
                                        <div className="flex gap-2">
                                          {[15, 30, 45, 60].map((min) => (
                                            <button
                                              key={min}
                                              onClick={() =>
                                                updateGadgetDetails(
                                                  "light_therapy",
                                                  { durationMinutes: min },
                                                )
                                              }
                                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${getGadget("light_therapy")?.durationMinutes === min ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                                            >
                                              {min}m
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[10px] text-zinc-300 uppercase font-bold">
                                          Time of use
                                        </label>
                                        <div className="flex gap-2">
                                          {[
                                            "morning",
                                            "afternoon",
                                            "evening",
                                          ].map((time) => (
                                            <button
                                              key={time}
                                              onClick={() =>
                                                updateGadgetDetails(
                                                  "light_therapy",
                                                  { timeOfUse: time },
                                                )
                                              }
                                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${getGadget("light_therapy")?.timeOfUse === time ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                                            >
                                              {time}
                                            </button>
                                          ))}
                                        </div>
                                        <p className="text-[9px] text-zinc-300 italic">
                                          Morning use anchors your rhythm ·
                                          Evening use delays it
                                        </p>
                                      </div>
                                    </motion.div>
                                  )}
                                </div>

                                {/* Breathing Trainer */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Wind
                                        size={18}
                                        className={
                                          isGadgetSelected("breathing_trainer")
                                            ? "text-blue-400"
                                            : "text-zinc-600"
                                        }
                                      />
                                      <span className="text-sm font-medium text-zinc-300">
                                        Breathing Trainer
                                      </span>
                                    </div>
                                    <button
                                      onClick={() =>
                                        toggleGadget("breathing_trainer")
                                      }
                                      className={`w-10 h-5 rounded-full transition-colors relative ${isGadgetSelected("breathing_trainer") ? "bg-indigo-600" : "bg-zinc-700"}`}
                                    >
                                      <div
                                        className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isGadgetSelected("breathing_trainer") ? "left-6" : "left-1"}`}
                                      />
                                    </button>
                                  </div>
                                  {isGadgetSelected("breathing_trainer") && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      className="pl-11 space-y-2 pt-1"
                                    >
                                      <label className="text-[10px] text-zinc-500 uppercase font-bold">
                                        Duration
                                      </label>
                                      <div className="flex gap-2">
                                        {[15, 30, 45].map((min) => (
                                          <button
                                            key={min}
                                            onClick={() =>
                                              updateGadgetDetails(
                                                "breathing_trainer",
                                                { durationMinutes: min },
                                              )
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${getGadget("breathing_trainer")?.durationMinutes === min ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
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
                                      <Flame
                                        size={18}
                                        className={
                                          isGadgetSelected("pre_sleep_heating")
                                            ? "text-orange-400"
                                            : "text-zinc-600"
                                        }
                                      />
                                      <span className="text-sm font-medium text-zinc-300">
                                        Pre-sleep Heating
                                      </span>
                                    </div>
                                    <button
                                      onClick={() =>
                                        toggleGadget("pre_sleep_heating")
                                      }
                                      className={`w-10 h-5 rounded-full transition-colors relative ${isGadgetSelected("pre_sleep_heating") ? "bg-indigo-600" : "bg-zinc-700"}`}
                                    >
                                      <div
                                        className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isGadgetSelected("pre_sleep_heating") ? "left-6" : "left-1"}`}
                                      />
                                    </button>
                                  </div>
                                  {isGadgetSelected("pre_sleep_heating") && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      className="pl-11 space-y-2 pt-1"
                                    >
                                      <label className="text-[10px] text-zinc-300 uppercase font-bold">
                                        Used before bed
                                      </label>
                                      <div className="flex gap-2">
                                        {[15, 30, 60].map((min) => (
                                          <button
                                            key={min}
                                            onClick={() =>
                                              updateGadgetDetails(
                                                "pre_sleep_heating",
                                                {
                                                  timeOfUse: `before_bed_${min}`,
                                                },
                                              )
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${getGadget("pre_sleep_heating")?.timeOfUse === `before_bed_${min}` ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                                          >
                                            {min}m before
                                          </button>
                                        ))}
                                      </div>
                                      <p className="text-[9px] text-zinc-300 italic">
                                        Pre-sleep warming triggers the cooling
                                        response that initiates sleep
                                      </p>
                                    </motion.div>
                                  )}
                                </div>

                                {/* Aromatherapy */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Leaf
                                        size={18}
                                        className={
                                          isGadgetSelected("aromatherapy")
                                            ? "text-emerald-400"
                                            : "text-zinc-600"
                                        }
                                      />
                                      <span className="text-sm font-medium text-zinc-300">
                                        Aromatherapy
                                      </span>
                                    </div>
                                    <button
                                      onClick={() =>
                                        toggleGadget("aromatherapy")
                                      }
                                      className={`w-10 h-5 rounded-full transition-colors relative ${isGadgetSelected("aromatherapy") ? "bg-indigo-600" : "bg-zinc-700"}`}
                                    >
                                      <div
                                        className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isGadgetSelected("aromatherapy") ? "left-6" : "left-1"}`}
                                      />
                                    </button>
                                  </div>
                                  {isGadgetSelected("aromatherapy") && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      className="pl-11 space-y-2 pt-1"
                                    >
                                      <label className="text-[10px] text-zinc-500 uppercase font-bold">
                                        Duration
                                      </label>
                                      <div className="flex gap-2">
                                        {[15, 30, 45].map((min) => (
                                          <button
                                            key={min}
                                            onClick={() =>
                                              updateGadgetDetails(
                                                "aromatherapy",
                                                { durationMinutes: min },
                                              )
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${getGadget("aromatherapy")?.durationMinutes === min ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
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
                                    <Flower2
                                      size={18}
                                      className={
                                        isGadgetSelected("meditation_app")
                                          ? "text-purple-400"
                                          : "text-zinc-600"
                                      }
                                    />
                                    <span className="text-sm font-medium text-zinc-300">
                                      Meditation App
                                    </span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      toggleGadget("meditation_app")
                                    }
                                    className={`w-10 h-5 rounded-full transition-colors relative ${isGadgetSelected("meditation_app") ? "bg-indigo-600" : "bg-zinc-700"}`}
                                  >
                                    <div
                                      className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isGadgetSelected("meditation_app") ? "left-6" : "left-1"}`}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Sub-section 2: Passive aids */}
                            <div className="space-y-4">
                              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 border-b border-zinc-800/50 pb-2">
                                Passive aids
                              </h3>
                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  {
                                    id: "cooling_pad",
                                    label: "Cooling Pad",
                                    icon: Snowflake,
                                    color: "text-blue-400",
                                  },
                                  {
                                    id: "white_noise",
                                    label: "White Noise",
                                    icon: Volume2,
                                    color: "text-zinc-400",
                                  },
                                  {
                                    id: "sleep_mask",
                                    label: "Sleep Mask",
                                    icon: EyeOff,
                                    color: "text-zinc-400",
                                  },
                                  {
                                    id: "earplugs",
                                    label: "Earplugs",
                                    icon: Ear,
                                    color: "text-zinc-400",
                                  },
                                  {
                                    id: "weighted_blanket",
                                    label: "Weighted Blanket",
                                    icon: Bed,
                                    color: "text-zinc-400",
                                  },
                                ].map((aid) => (
                                  <button
                                    key={aid.id}
                                    onClick={() => toggleGadget(aid.id)}
                                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isGadgetSelected(aid.id) ? "bg-indigo-500/10 border-indigo-500/50" : "bg-zinc-800/50 border-zinc-800 hover:border-zinc-700"}`}
                                  >
                                    <aid.icon
                                      size={18}
                                      className={
                                        isGadgetSelected(aid.id)
                                          ? aid.color
                                          : "text-zinc-400"
                                      }
                                    />
                                    <span
                                      className={`text-[10px] font-bold ${isGadgetSelected(aid.id) ? "text-white" : "text-zinc-300"}`}
                                    >
                                      {aid.label}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Sub-section 3: Sleep tracking */}
                            <div className="space-y-4">
                              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 border-b border-zinc-800/50 pb-2">
                                Sleep tracking
                              </h3>
                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  {
                                    id: "smart_ring",
                                    label: "Smart Ring",
                                    icon: Circle,
                                    color: "text-zinc-300",
                                  },
                                  {
                                    id: "smartwatch_tracking",
                                    label: "Smartwatch",
                                    icon: Watch,
                                    color: "text-zinc-300",
                                  },
                                  {
                                    id: "fitness_band",
                                    label: "Fitness Band",
                                    icon: Activity,
                                    color: "text-zinc-300",
                                  },
                                  {
                                    id: "phone_sleep_app",
                                    label: "Phone App",
                                    icon: Smartphone,
                                    color: "text-zinc-300",
                                  },
                                ].map((tracker) => (
                                  <button
                                    key={tracker.id}
                                    onClick={() => toggleGadget(tracker.id)}
                                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isGadgetSelected(tracker.id) ? "bg-indigo-500/10 border-indigo-500/50" : "bg-zinc-800/50 border-zinc-800 hover:border-zinc-700"}`}
                                  >
                                    <tracker.icon
                                      size={18}
                                      className={
                                        isGadgetSelected(tracker.id)
                                          ? tracker.color
                                          : "text-zinc-400"
                                      }
                                    />
                                    <span
                                      className={`text-[10px] font-bold ${isGadgetSelected(tracker.id) ? "text-white" : "text-zinc-300"}`}
                                    >
                                      {tracker.label}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>

                    {/* Remarks Section */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
                        Remarks & Notes
                      </label>
                      <textarea
                        value={currentLog.daily_remarks}
                        onChange={(e) =>
                          updateLog({ daily_remarks: e.target.value })
                        }
                        placeholder="Last night I went to bed at 23 pm. It took about 45 minutes to fall asleep. Around 2 am I woke up because I had to go to the bathroom. After 30 minutes of lying awake I came out of the bed and went back in around 4 am. Here I stayed awake until 5 am before falling asleep again. At 6.30 am I woke up to go to work...."
                        className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-zinc-700"
                      />
                    </section>

                    <DataImporter
                      user={user}
                      isImporting={isImporting}
                      setIsImporting={setIsImporting}
                      logs={logs}
                      onImportComplete={async () => {
                        setToast({
                          message: "Data imported and synced successfully",
                          type: "success",
                        });
                        setIsImporting(false);
                        // Wait for Firestore writes to propagate before re-counting
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1500),
                        );
                        if (user) {
                          MaturitySystem.getUserDataMaturity(user.uid).then(
                            setMaturity,
                          );
                        }
                        refreshAllData();
                      }}
                      onRefresh={refreshAllData}
                    />

                    <div className="flex gap-4">
                      <button
                        onClick={async () => {
                          setSaveStatus("saving");
                          try {
                            if (user?.uid) {
                              await saveLogFromState(
                                user.uid,
                                selectedDate,
                                "manual",
                              );
                            }
                            setToast({
                              message: "Log saved to SIA cloud",
                              type: "success",
                            });
                          } catch (err) {
                            console.error("Manual save failed:", err);
                            setSaveStatus("idle");
                            setToast({
                              message: "Save failed — check your connection",
                              type: "error",
                            });
                          }
                        }}
                        className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                      >
                        <AnimatePresence mode="wait">
                          {saveStatus === "saving" ? (
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
                          ) : saveStatus === "saved" ? (
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
                        onClick={async () => {
                          const newLogs = { ...logs };
                          delete newLogs[selectedDate];
                          setLogs(newLogs);
                          if (user?.uid) {
                            await deleteLog(user.uid, selectedDate);
                          }
                          setSaveStatus("idle");
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
            ) : view === "ai" ? (
              <motion.div
                key="ai"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">
                    Sleep Intelligence Agent
                  </h2>
                  <p className="text-sm text-zinc-300">
                    Advanced correlation analysis of your sleep history
                  </p>
                </div>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-64">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  }
                >
                  <AIInsightsAgent onForecastUpdate={setForecastMetrics} />
                </Suspense>
              </motion.div>
            ) : view === "legal" ? (
              <Legal onBack={() => setView("dashboard")} />
            ) : view === "guide" ? (
              <motion.div
                key="guide"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <GuideView />
              </motion.div>
            ) : view === "account" ? (
              <AccountPage
                onModifyAssessment={() => setShowPersonalizationWizard(true)}
                onRefresh={refreshAllData}
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
                    <h2 className="text-2xl font-bold tracking-tight">
                      {view === "weekly"
                        ? "Last 7 Days"
                        : view === "monthly"
                          ? "Last 30 Days"
                          : "Insights"}
                    </h2>
                    <p className="text-sm text-zinc-300">
                      {formatDisplayDate(activeDates[0])} —{" "}
                      {formatDisplayDate(activeDates[activeDates.length - 1])}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    {/* Secondary Tab Bar */}
                    <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                      {["weekly", "monthly", "custom"].map((sub) => (
                        <button
                          key={sub}
                          onClick={() => setView(sub as any)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                            view === sub
                              ? "bg-zinc-800 text-white shadow-sm"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {sub === "weekly"
                            ? "7 Days"
                            : sub === "monthly"
                              ? "30 Days"
                              : sub}
                        </button>
                      ))}
                    </div>
                    {(view as any) === "dashboard" &&
                      (userProfile?.tier === "Basic" ? (
                        <button
                          onClick={() => setView("account")}
                          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-900/20 transition-all"
                        >
                          <Sparkles size={12} />
                          Clinical Report — Enhanced+
                        </button>
                      ) : (
                        <button
                          onClick={handlePrint}
                          disabled={!averageStats}
                          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-40"
                        >
                          <Stethoscope size={12} />
                          Clinical Report
                        </button>
                      ))}
                  </div>
                </div>

                {view === "custom" && (
                  <div className="flex flex-wrap justify-center gap-4 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800">
                    <div className="space-y-1 text-left">
                      <p className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold ml-1">
                        Start Date
                      </p>
                      <input
                        type="date"
                        value={customRange.start}
                        onChange={(e) =>
                          setCustomRange({
                            ...customRange,
                            start: e.target.value,
                          })
                        }
                        className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <p className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold ml-1">
                        End Date
                      </p>
                      <input
                        type="date"
                        value={customRange.end}
                        onChange={(e) =>
                          setCustomRange({
                            ...customRange,
                            end: e.target.value,
                          })
                        }
                        className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* Averages Grid */}
                {averageStats ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <MetricSummaryCard
                      title="Avg Quality"
                      value={Math.round(averageStats.sq)}
                      unit="/10"
                      icon={<Activity />}
                      color="text-indigo-400"
                      delta={{ value: 1, label: "vs prev 7 days" }}
                    />
                    <MetricSummaryCard
                      title="Avg Rested"
                      value={Math.round(averageStats.r)}
                      unit="/10"
                      icon={<Sun />}
                      color="text-amber-400"
                      delta={{ value: -1, label: "vs prev 7 days" }}
                    />
                    <MetricSummaryCard
                      title="Avg Energy"
                      value={Math.round(averageStats.l)}
                      unit="/10"
                      icon={<Zap />}
                      color="text-emerald-400"
                      delta={{ value: 1, label: "vs prev 7 days" }}
                    />
                    <MetricSummaryCard
                      title="Avg Sleep"
                      value={formatDuration(averageStats.duration)}
                      icon={<Clock />}
                      color="text-violet-400"
                      delta={{ value: -15, label: "vs prev 7 days" }}
                    />
                    <MetricSummaryCard
                      title="Avg Efficiency"
                      value={Math.round(averageStats.efficiency)}
                      unit="%"
                      icon={<BarChart3 />}
                      color="text-blue-400"
                      delta={{ value: 2, label: "vs prev 7 days" }}
                    />
                  </div>
                ) : (
                  <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-12 rounded-3xl text-center">
                    <Info className="mx-auto text-zinc-700 mb-3" size={32} />
                    <p className="text-zinc-500 text-sm">
                      No data logged for this period yet.
                    </p>
                  </div>
                )}

                {/* Breakdown List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
                      Daily Breakdown
                    </h3>
                    <div className="flex items-center gap-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <kbd className="bg-zinc-800 px-1 rounded border border-zinc-700">
                          Q
                        </kbd>{" "}
                        Quality
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="bg-zinc-800 px-1 rounded border border-zinc-700">
                          R
                        </kbd>{" "}
                        Rested
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="bg-zinc-800 px-1 rounded border border-zinc-700">
                          E
                        </kbd>{" "}
                        Efficiency
                      </span>
                    </div>
                  </div>
                  {activeDates
                    .slice()
                    .reverse()
                    .map((date) => {
                      const log = logs[date];
                      const isToday = date === getTodayDate();
                      const sleepData = log
                        ? log.sleepEvents || log.timeline || []
                        : [];
                      const events = log
                        ? log.sleepEvents ||
                          (log.timeline
                            ? migrateTimelineToEvents(log.timeline)
                            : [])
                        : [];

                      return (
                        <button
                          key={date}
                          onClick={() => {
                            setSelectedDate(date);
                            setView("log");
                          }}
                          className={`w-full flex flex-col gap-4 p-5 rounded-2xl border transition-all min-h-[100px] ${
                            log
                              ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                              : "bg-transparent border-zinc-900 hover:bg-zinc-900/30"
                          } ${isToday ? "ring-1 ring-indigo-500/50" : ""}`}
                        >
                          <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-2 h-2 rounded-full ${log ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-zinc-800"}`}
                              />
                              <div className="text-left">
                                <p className="text-sm font-bold">
                                  {formatDisplayDate(date)}
                                </p>
                                <p className="text-[10px] text-zinc-300 uppercase tracking-wider">
                                  {log
                                    ? `${formatDuration(calculateSleepDuration(sleepData))} sleep`
                                    : "No entry"}
                                </p>
                              </div>
                            </div>
                            {log ? (
                              <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest">
                                <span className="text-indigo-400">
                                  Q:{log.sleep_quality}
                                </span>
                                <span className="text-emerald-400">
                                  R:{log.morning_alertness}
                                </span>
                                <span className="text-purple-400">
                                  E:{calculateSleepEfficiency(sleepData)}%
                                </span>
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

                {/* Sleep Pattern Summary Section */}
                <section className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
                    Sleep Pattern Summary
                  </h3>
                  <SleepPatternCard
                    logs={logs}
                    periodType={
                      view === "monthly"
                        ? "30-DAY"
                        : view === "custom"
                          ? "CUSTOM"
                          : "7-DAY"
                    }
                    personalizationProfile={personalizationProfile}
                    user={user}
                    userProfile={{ ...userProfile, tier: derivedTier } as any}
                    activeDates={activeDates}
                    viewMode={view as "weekly" | "monthly" | "custom"}
                    onViewChange={handleViewChange}
                  />
                </section>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Legal Link */}
          <div className="mt-4 pt-2 border-t border-zinc-800/50 text-center">
            <button
              onClick={() => setView("legal")}
              className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold hover:text-zinc-300 transition-colors"
            >
              Legal, Terms & Privacy
            </button>
          </div>
        </main>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 50, x: "-50%" }}
              className={`fixed bottom-24 left-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 border ${
                toast.type === "success"
                  ? "bg-emerald-900/90 border-emerald-500 text-emerald-100"
                  : toast.type === "info"
                    ? "bg-zinc-900/90 border-zinc-700 text-zinc-100"
                    : "bg-red-900/90 border-red-500 text-red-100"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 size={18} />
              ) : toast.type === "info" ? (
                <Info size={18} className="text-indigo-400" />
              ) : (
                <AlertCircle size={18} />
              )}
              <span className="text-sm font-bold">{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-2 hover:opacity-70"
              >
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
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md bg-[#0B0F17] border border-zinc-800/60 rounded-3xl shadow-2xl overflow-hidden p-8"
              >
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                    <Lightbulb size={32} />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">
                      SIA Noticed Patterns
                    </h3>
                    <p className="text-sm text-zinc-400">
                      I'm still learning your routine, but I've noticed these
                      recurring habits. Apply them to today's log?
                    </p>
                  </div>

                  <div className="w-full bg-zinc-800/50 rounded-2xl p-4 space-y-3">
                    {activeSuggestion.reasons.map((reason, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 text-left"
                      >
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        <span className="text-xs text-zinc-300 font-medium">
                          {reason}
                        </span>
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
            <React.Suspense
              fallback={
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center text-white">
                  Loading Guide...
                </div>
              }
            >
              <SleepGuideInteractive
                onClose={() => setShowSleepGuide(false)}
                onOpenPersonalization={() => setShowPersonalizationWizard(true)}
              />
            </React.Suspense>
          )}
        </AnimatePresence>

        {/* Floating Action Button for Today (Mobile) */}
        {view === "dashboard" && (
          <button
            onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const year = yesterday.getFullYear();
              const month = String(yesterday.getMonth() + 1).padStart(2, "0");
              const day = String(yesterday.getDate()).padStart(2, "0");
              setSelectedDate(`${year}-${month}-${day}`);
              setView("log");
            }}
            className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform z-50"
          >
            <Plus size={28} />
          </button>
        )}

        <AnimatePresence>
          {showPersonalizationWizard && user && (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-64">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
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
    </UserProvider>
  );
}
