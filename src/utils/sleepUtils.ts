import { SleepState } from '../types';

export const calculateSleepDuration = (timeline: SleepState[]): number => {
  const sleepSlots = timeline.filter(s => s === 'sleep').length;
  return sleepSlots * 0.25;
};

export const formatDuration = (hours: number): string => {
  if (!hours || isNaN(hours) || hours <= 0) return "00:00";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const snapTo15Min = (hours: number): number => {
  return Math.round(hours * 4) / 4;
};

export const calculateSleepEfficiency = (timeline: SleepState[]): string => {
  const sleepSlots = timeline.filter(s => s === 'sleep').length;
  const inBedSlots = timeline.filter(s => s === 'sleep' || s === 'awake-in').length;
  if (inBedSlots === 0) return "0";
  return ((sleepSlots / inBedSlots) * 100).toFixed(1);
};

/**
 * Maps HH:mm time to the 0-95 index array (15-min slots from 20:00 to 20:00).
 * Formula: (((Hours + 24 - 20) % 24) * 4) + Math.floor(Minutes / 15).
 */
// CRITICAL: 0 = 20:00, 48 = 08:00, 95 = 19:45
export const timeToIndex = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  
  // Apply -20 hour offset logic
  const index = (((hours + 24 - 20) % 24) * 4) + Math.floor(minutes / 15);
  
  // Boundary guard: 0-95
  return Math.max(0, Math.min(95, index));
};
