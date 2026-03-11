import { SleepState } from './types';

export const TIMELINE_START_HOUR = 20; // 8 PM
export const SLOTS_PER_HOUR = 4; // 15-min intervals
export const TOTAL_HOURS = 24; // 
export const TOTAL_SLOTS = TOTAL_HOURS * SLOTS_PER_HOUR; // 96 slots

export const MIN_METRIC = 1;
export const MAX_METRIC = 10;

export const SLEEP_STATES: { value: SleepState; label: string; color: string }[] = [
  { value: 'awake-out', label: 'Awake (Out of Bed)', color: 'bg-transparent border-zinc-800' },
  { value: 'awake-in', label: 'Awake (In Bed)', color: 'bg-indigo-500' },
  { value: 'sleep', label: 'Sleep', color: 'bg-emerald-500' },
];

export function getSlotLabel(index: number): string {
  const totalMinutes = (TIMELINE_START_HOUR * 60) + (index * (60 / SLOTS_PER_HOUR));
  const hour = Math.floor((totalMinutes / 60) % 24);
  const minute = totalMinutes % 60;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
