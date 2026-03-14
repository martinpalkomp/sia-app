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
 * Logic: I = (Hours * 4) + Math.floor(Minutes / 15).
 * Relative to 20:00 start.
 */
export const timeToIndex = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  // Shift hours so 20:00 is index 0
  // 20:00 -> 0, 21:00 -> 4, ..., 00:00 -> 16, ..., 19:45 -> 95
  let adjustedHours = hours - 20;
  if (adjustedHours < 0) adjustedHours += 24;
  
  return (adjustedHours * 4) + Math.floor(minutes / 15);
};
