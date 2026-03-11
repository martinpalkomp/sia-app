import { SleepState } from '../types';

export const calculateSleepDuration = (timeline: SleepState[]): number => {
  const sleepSlots = timeline.filter(s => s === 'sleep').length;
  return sleepSlots * 0.25;
};

export const formatDuration = (hours: number): string => {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  if (h === 0 && m === 0) return "0 min";
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
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
