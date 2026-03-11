import { SleepState } from '../types';

export const calculateSleepDuration = (timeline: SleepState[]): string => {
  const sleepSlots = timeline.filter(s => s === 'sleep').length;
  return (sleepSlots * 0.25).toFixed(2);
};

export const calculateSleepEfficiency = (timeline: SleepState[]): string => {
  const sleepSlots = timeline.filter(s => s === 'sleep').length;
  const inBedSlots = timeline.filter(s => s === 'sleep' || s === 'awake-in').length;
  if (inBedSlots === 0) return "0";
  return ((sleepSlots / inBedSlots) * 100).toFixed(1);
};
