export type SleepState = 'awake-out' | 'awake-in' | 'sleep';

export interface SleepEvent {
  id: string;
  type: SleepState;
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface BaseLog {
  date: string; // ISO date string (YYYY-MM-DD)
  type?: 'log'; // Firestore type discriminator
  isIgnored: boolean;
  sleep_quality: number; // 0-10
  morning_alertness: number; // 0-10
  daytime_energy: number; // 0-10
  daily_remarks: string;
}

export interface FullLog extends BaseLog {
  timeline?: SleepState[]; // 96 slots for 15-min intervals (20:00 to 20:00) - Deprecated
  sleepEvents: SleepEvent[];    // New event-based ledger
  factors: {
    caffeine: { consumed: boolean | null; amount: number | null; lastIntake: string | null; isStreak?: boolean };
    alcohol: { consumed: boolean | null; drinks: number | null; lastIntake: string | null; isStreak?: boolean };
    medication: { taken: boolean | null; type: string | null; time: string | null; isStreak?: boolean };
    exercise: { completed: boolean | null; type: string | null; time: string | null; isStreak?: boolean };
    screensInBed: boolean | null;
    isStreak?: boolean;
    stressLevel: number | null; // 1-5
    lastMealTime?: string | null;     // HH:mm — time of last meal before sleep
    naturalWake?: boolean | null;     // true = woke without alarm, false = alarm woke user
    moodScore?: number | null;        // 1-5 subjective mood on waking
    sleepGadgets?: Array<{
      type: 'light_therapy' | 'breathing_trainer' | 'pre_sleep_heating' | 'aromatherapy' | 'meditation_app' | 'cooling_pad' | 'white_noise' | 'sleep_mask' | 'earplugs' | 'weighted_blanket' | 'smart_ring' | 'smartwatch_tracking' | 'fitness_band' | 'phone_sleep_app';
      durationMinutes?: number;
      timeOfUse?: 'morning' | 'afternoon' | 'evening' | 'before_bed_15' | 'before_bed_30' | 'before_bed_60' | 'all_night';
    }>;
    interventions?: {
      lightTherapy?: { enabled: boolean; duration?: number; timing?: string };
      breathingTrainer?: { enabled: boolean; duration?: number; timing?: string };
      preSleepHeating?: { enabled: boolean; duration?: number; timing?: string };
      aromatherapy?: { enabled: boolean; duration?: number; timing?: string };
      meditationApp?: { enabled: boolean; duration?: number; timing?: string };
      coolingPad?: { enabled: boolean; duration?: number; timing?: string };
    };
    passiveAids?: {
      whiteNoise?: { enabled: boolean; duration?: number; timing?: string };
      sleepMask?: { enabled: boolean; duration?: number; timing?: string };
      earplugs?: { enabled: boolean; duration?: number; timing?: string };
      weightedBlanket?: { enabled: boolean; duration?: number; timing?: string };
    };
  };
}

export interface SummaryLog extends BaseLog {
  summaryMetrics: {
    sleep_quality: number;
    morning_alertness: number;
    daytime_energy: number;
    importedDuration: number;
    importedInBed: number;
    sleep_efficiency: number;
  };
}

export interface PersonalizationProfile {
  demographics: {
    dateOfBirth: string;   // replaces age — YYYY-MM-DD
    country?: string;      // ISO country name e.g. "Czech Republic"
    sex: 'Male' | 'Female' | 'Other';
    workSchedule: 'Regular Hours' | 'Shift Work';
    environmentType: 'Noisy/Urban' | 'Quiet/Controlled';
    healthConditions?: string[];  // e.g. ['Insomnia', 'Anxiety disorders']
  };
  goals: string[];
  psqi: {
    time_to_fall_asleep: number;
    sleep_quality: number;
    daytime_sleepiness: number;
  };
  clinical?: {
    n1: number;
    n2: number;
    n3: number;
    rem: number;
    neurological?: string[];
    oxygen?: {
      avgSpO2: number;
      minSpO2: number;
    };
    heart?: {
      avgSleepingHR: number;
    };
    notes: string;
  };
  allowsAnonymizedSharing?: boolean;
  connectedDevices?: Array<{
    type: 'light_therapy' | 'thermal' | 'acoustic' | 'wearable' | 'other';
    brand: string;        // e.g. "Luminette", "Eight Sleep", "Oura"
    model?: string;
    inUse: boolean;
  }>;
  updatedAt?: any;
}

export interface UnstructuredData {
  id: string;
  fileName: string;
  content: string;
  uploadDate: string; // ISO string
  status: string;
  source: string;
  summary?: string;
  estimatedDateRange?: string;
  extractedInsights?: string[];
  rawDataType?: string;
  updatedAt: any;
}

export interface Insight {
  id: string;
  type: 'Pattern' | 'Risk' | 'Recommendation';
  confidence: number; // 0.0 to 1.0 (Primary confidence used for UI)
  aiConfidence: number; // Raw confidence from the model
  computedConfidence: number; // Confidence computed from data coverage
  summary: string; // Short 1-sentence takeaway
  details?: string; // Optional longer explanation
  linkedDates: string[]; // Which log dates triggered this insight
  createdAt: any; // Firestore timestamp
  lastUpdated?: any; // Firestore timestamp
  occurrences: number; // How many times this insight has been triggered/merged
}

export interface AIInsight {
  type: 'daily_brief' | 'pattern' | 'deep_analysis' | 'chat_insight' | 'dashboard_insight';
  category: 'sleep_quality' | 'efficiency' | 'consistency' | 'behavioral' | 'anomalies';
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
  recommendation: string;
  timeframe: 'immediate' | 'short_term' | 'long_term';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  summary: string;
}

// DailyLog remains for backward compatibility and as the primary state interface
export interface DailyLog extends Partial<FullLog>, Partial<SummaryLog> {
  date: string;
  isIgnored: boolean;
  sleep_quality: number;
  morning_alertness: number;
  daytime_energy: number;
  daily_remarks: string;
  timeline?: SleepState[]; // Deprecated
  sleepEvents?: SleepEvent[];   // New event-based ledger
  factors: {
    caffeine: { consumed: boolean | null; amount: number | null; lastIntake: string | null; isStreak?: boolean };
    alcohol: { consumed: boolean | null; drinks: number | null; lastIntake: string | null; isStreak?: boolean };
    medication: { taken: boolean | null; type: string | null; time: string | null; isStreak?: boolean };
    exercise: { completed: boolean | null; type: string | null; time: string | null; isStreak?: boolean };
    screensInBed: boolean | null;
    isStreak?: boolean;
    stressLevel: number | null; // 1-5
    lastMealTime?: string | null;     // HH:mm — time of last meal before sleep
    naturalWake?: boolean | null;     // true = woke without alarm, false = alarm woke user
    moodScore?: number | null;        // 1-5 subjective mood on waking
    sleepGadgets?: Array<{
      type: 'light_therapy' | 'breathing_trainer' | 'pre_sleep_heating' | 'aromatherapy' | 'meditation_app' | 'cooling_pad' | 'white_noise' | 'sleep_mask' | 'earplugs' | 'weighted_blanket' | 'smart_ring' | 'smartwatch_tracking' | 'fitness_band' | 'phone_sleep_app';
      durationMinutes?: number;
      timeOfUse?: 'morning' | 'afternoon' | 'evening' | 'before_bed_15' | 'before_bed_30' | 'before_bed_60' | 'all_night';
    }>;
    interventions?: {
      lightTherapy?: { enabled: boolean; duration?: number; timing?: string };
      breathingTrainer?: { enabled: boolean; duration?: number; timing?: string };
      preSleepHeating?: { enabled: boolean; duration?: number; timing?: string };
      aromatherapy?: { enabled: boolean; duration?: number; timing?: string };
      meditationApp?: { enabled: boolean; duration?: number; timing?: string };
      coolingPad?: { enabled: boolean; duration?: number; timing?: string };
    };
    passiveAids?: {
      whiteNoise?: { enabled: boolean; duration?: number; timing?: string };
      sleepMask?: { enabled: boolean; duration?: number; timing?: string };
      earplugs?: { enabled: boolean; duration?: number; timing?: string };
      weightedBlanket?: { enabled: boolean; duration?: number; timing?: string };
    };
  };
  modifiedBySync?: boolean[];
  source?: 'manual' | 'import' | 'predicted' | 'ai-adjusted';
  visualTimeline?: SleepState[];
  bedTime?: string | null;
  wakeTime?: string | null;
}

export type UserTier = 'Basic' | 'Enhanced' | 'Pro';

export interface UserQuota {
  chatMessagesUsed: number;
  lastPromptReset: any; // Firestore Timestamp
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  tier: UserTier;
  quota: UserQuota;
  aiImportsCurrentMonth?: number;
  lastImportDate?: any; // Firestore Timestamp
  importedLogCount?: number;
  createdAt: any;
}

export interface DailyBrief {
  id?: string;
  date: string;
  content: string;
  createdAt: any;
}
