import { DailyLog } from '../types';
import { calculateBedtimeConsistency, calculateTotalSleepHours } from './diagnosticEngine';

export type Chronotype = 'morning-lark' | 'intermediate' | 'night-owl';
export type DebtLevel = 'low' | 'moderate' | 'high';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ConsistencyLevel = 'strong' | 'moderate' | 'weak';

export interface CircadianZone {
  id: string;
  label: string;
  startH: number; startM: number;
  endH: number;   endM: number;
  description: string;
  color: string;
  glowColor: string;
}

export interface SleepGateData {
  gateH: number;
  gateM: number;
  confidenceMinutes: number;
  confidenceLevel: ConfidenceLevel;
  chronotype: Chronotype;
  chronotypeLabel: string;
  sleepDebtHours: number;
  sleepDebtLevel: DebtLevel;
  wakeConsistency: ConsistencyLevel;
  logsAnalyzed: number;
  zones: CircadianZone[];
  predictionFactors: {
    chronotype: string;
    sleepDebt: string;
    wakeConsistency: string;
    logsAnalyzed: string;
    eveningEnergy: string;
    confidence: string;
  };
  statusText: string;
  minutesUntilGate: number | null;
}

const BASE_GATE_H = 23;
const BASE_GATE_M = 15;
const TARGET_SLEEP_HOURS = 7.5;

function getAvgBedtimeMinutes(logs: DailyLog[]): number | null {
  const bedtimes = logs
    .map(l => l.sleepEvents?.find(e => e.type === 'sleep')?.start)
    .filter(Boolean)
    .map(t => { const [h, m] = t!.split(':').map(Number); return h < 12 ? (h + 24) * 60 + m : h * 60 + m; });
  if (bedtimes.length < 3) return null;
  return bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
}

function getAvgWakeMinutes(logs: DailyLog[]): number | null {
  const wakes = logs
    .map(l => l.sleepEvents?.find(e => e.type === 'awake-out')?.start ?? l.sleepEvents?.slice(-1)[0]?.end)
    .filter(Boolean)
    .map(t => { const [h, m] = t!.split(':').map(Number); return h * 60 + m; });
  if (wakes.length < 3) return null;
  return wakes.reduce((a, b) => a + b, 0) / wakes.length;
}

function detectChronotype(logs: DailyLog[]): Chronotype {
  const avgWake = getAvgWakeMinutes(logs);
  if (avgWake === null) return 'intermediate';
  if (avgWake < 6 * 60) return 'morning-lark';
  if (avgWake > 7 * 60 + 30) return 'night-owl';
  return 'intermediate';
}

function computeSleepDebt(logs: DailyLog[]): { hours: number; level: DebtLevel } {
  const recent7 = logs.slice(0, 7);
  if (recent7.length < 3) return { hours: 0, level: 'low' };
  const totalDebt = recent7.reduce((acc, l) => {
    const slept = calculateTotalSleepHours(l);
    return acc + Math.max(0, TARGET_SLEEP_HOURS - slept);
  }, 0);
  const avgDebt = totalDebt / recent7.length;
  return {
    hours: parseFloat(avgDebt.toFixed(1)),
    level: avgDebt < 0.5 ? 'low' : avgDebt < 1.5 ? 'moderate' : 'high',
  };
}

function buildZones(gateH: number, gateM: number): CircadianZone[] {
  const gateMin = gateH * 60 + gateM;
  const windDownEnd = gateMin - 45;
  const melatoninStart = gateMin - 105;
  return [
    { id: 'wind-down',   label: 'Wind Down',            startH: 20, startM: 0,
      endH: Math.floor(melatoninStart / 60), endM: melatoninStart % 60,
      description: 'Reduce stimulation. Dim lights. No screens after this point.',
      color: 'rgba(96,165,250,0.55)', glowColor: 'rgba(96,165,250,0.25)' },
    { id: 'melatonin',   label: 'Melatonin Rise',        startH: Math.floor(melatoninStart / 60), startM: melatoninStart % 60,
      endH: Math.floor((gateMin - 45) / 60), endM: (gateMin - 45) % 60,
      description: 'Body temperature begins to fall. Screens and bright light have the greatest effect during this phase.',
      color: 'rgba(129,140,248,0.75)', glowColor: 'rgba(129,140,248,0.3)' },
    { id: 'sleep-gate',  label: 'Sleep Gate',            startH: Math.floor((gateMin - 45) / 60), startM: (gateMin - 45) % 60,
      endH: Math.floor((gateMin + 45) / 60), endM: (gateMin + 45) % 60,
      description: 'Your optimal transition window. Sleep pressure peaks. This is your biological sleep gate.',
      color: 'rgba(167,139,250,1.0)', glowColor: 'rgba(167,139,250,0.45)' },
    { id: 'deep-sleep',  label: 'Deep Sleep Opportunity', startH: Math.floor((gateMin + 45) / 60), startM: (gateMin + 45) % 60,
      endH: 1, endM: 30,
      description: 'SWS (slow-wave sleep) window. Missing this phase increases cortisol and reduces growth hormone release.',
      color: 'rgba(109,40,217,0.85)', glowColor: 'rgba(109,40,217,0.3)' },
    { id: 'circadian',   label: 'Circadian Night',        startH: 1, startM: 30,
      endH: 2, endM: 0,
      description: 'Biological night. Core body temperature at minimum. Maximum melatonin saturation.',
      color: 'rgba(88,28,135,0.5)', glowColor: 'rgba(88,28,135,0.2)' },
  ];
}

export function computeSleepGateData(logs: DailyLog[], maturityLevel: number): SleepGateData {
  const recent14 = logs.slice(0, 14);
  const chronotype = detectChronotype(recent14);
  const debt = computeSleepDebt(recent14);
  const consistency = calculateBedtimeConsistency(recent14);
  const wakeConsistency: ConsistencyLevel = consistency < 0.5 ? 'strong' : consistency < 1.0 ? 'moderate' : 'weak';

  const avgBedtimeMin = getAvgBedtimeMinutes(recent14);
  let gateMin = avgBedtimeMin
    ? avgBedtimeMin + (chronotype === 'morning-lark' ? -30 : chronotype === 'night-owl' ? 30 : 0)
    : BASE_GATE_H * 60 + BASE_GATE_M;
  gateMin = Math.min(Math.max(gateMin, 21 * 60), 25 * 60);
  const gateH = Math.floor(gateMin / 60) % 24;
  const gateM = gateMin % 60;

  const confidenceMinutes = maturityLevel >= 3 ? 15 : maturityLevel >= 2 ? 25 : 35;
  const confidenceLevel: ConfidenceLevel = maturityLevel >= 3 ? 'high' : maturityLevel >= 2 ? 'medium' : 'low';

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const gateMinNorm = gateMin > 24 * 60 ? gateMin - 24 * 60 : gateMin;
  let minutesUntilGate = gateMinNorm - nowMin;
  if (minutesUntilGate < -120) minutesUntilGate = null as any;

  const statusText = minutesUntilGate !== null && minutesUntilGate > 0
    ? `Entering your sleep gate in ${minutesUntilGate} min`
    : minutesUntilGate !== null && minutesUntilGate <= 0 && minutesUntilGate > -90
    ? 'You are in your sleep gate now'
    : `Ideal window: ${String(gateH).padStart(2,'0')}:${String(Math.max(0, gateM - confidenceMinutes)).padStart(2,'0')} – ${String(gateH).padStart(2,'0')}:${String(Math.min(59, gateM + confidenceMinutes)).padStart(2,'0')}`;

  return {
    gateH, gateM, confidenceMinutes, confidenceLevel, chronotype,
    chronotypeLabel: chronotype === 'morning-lark' ? '☀ Morning Lark' : chronotype === 'night-owl' ? '🌙 Night Owl' : 'Intermediate',
    sleepDebtHours: debt.hours, sleepDebtLevel: debt.level,
    wakeConsistency, logsAnalyzed: recent14.length,
    zones: buildZones(gateH, gateM),
    predictionFactors: {
      chronotype: chronotype === 'morning-lark' ? 'Early' : chronotype === 'night-owl' ? 'Late' : 'Consistent',
      sleepDebt: debt.level === 'low' ? 'Low' : debt.level === 'moderate' ? 'Moderate' : 'High',
      wakeConsistency: wakeConsistency === 'strong' ? 'Strong' : wakeConsistency === 'moderate' ? 'Variable' : 'Variable',
      logsAnalyzed: `${recent14.length} Analyzed`,
      eveningEnergy: 'Low',
      confidence: confidenceLevel === 'high' ? 'High' : confidenceLevel === 'medium' ? 'Medium' : 'Low',
    },
    statusText, minutesUntilGate,
  };
}
