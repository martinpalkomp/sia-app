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
  sleepQuality: number; // 0-10
  restedness: number; // 0-10
  energyLevel: number; // 0-10
  remarks: string;
}

export interface FullLog extends BaseLog {
  timeline?: SleepState[]; // 96 slots for 15-min intervals (20:00 to 20:00) - Deprecated
  sleepEvents: SleepEvent[];    // New event-based ledger
  factors: {
    caffeine: { consumed: boolean; amount: number; lastIntake: string };
    alcohol: { consumed: boolean; drinks: number; lastIntake: string };
    medication: { taken: boolean; type: string; time: string };
    exercise: { completed: boolean; type: string; time: string };
    screensInBed: boolean;
    stressLevel: number; // 1-5
  };
}

export interface SummaryLog extends BaseLog {
  summaryMetrics: {
    sleepQuality: number;
    restedness: number;
    energyLevel: number;
    importedDuration: number;
    importedInBed: number;
  };
}

export interface PersonalizationProfile {
  demographics: {
    age: number;
    sex: 'Male' | 'Female' | 'Other';
    workSchedule: 'Regular Hours' | 'Shift Work';
    environmentType: 'Noisy/Urban' | 'Quiet/Controlled';
  };
  goals: string[];
  psqi: {
    timeToFallAsleep: number;
    sleepQuality: number;
    daytimeSleepiness: number;
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
  updatedAt?: any;
}

// DailyLog remains for backward compatibility and as the primary state interface
export interface DailyLog extends Partial<FullLog>, Partial<SummaryLog> {
  date: string;
  isIgnored: boolean;
  sleepQuality: number;
  restedness: number;
  energyLevel: number;
  remarks: string;
  timeline?: SleepState[]; // Deprecated
  sleepEvents?: SleepEvent[];   // New event-based ledger
  factors: {
    caffeine: { consumed: boolean; amount: number; lastIntake: string };
    alcohol: { consumed: boolean; drinks: number; lastIntake: string };
    medication: { taken: boolean; type: string; time: string };
    exercise: { completed: boolean; type: string; time: string };
    screensInBed: boolean;
    stressLevel: number; // 1-5
  };
  modifiedBySync?: boolean[];
  source?: 'manual' | 'import';
  sleep_quality?: number;
  morning_alertness?: number;
  daytime_energy?: number;
  daily_remarks?: string;
}
