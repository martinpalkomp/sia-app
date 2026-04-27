import { create } from 'zustand';
import { DailyLog, SleepState } from '../types';
import { saveLog as saveLogService } from '../services/sleepService';
import { db, doc, deleteDoc } from '../lib/firebase';
import { convertGridToEvents, getGridFromEvents, calculateSleepDuration, calculateTimeInBed } from '../utils/sleepUtils';

interface SleepStore {
  logs: Record<string, DailyLog>;
  selectedDate: string;
  isEditing: boolean;
  isDragging: boolean;
  activeState: SleepState;
  dragAction: 'paint' | 'erase';
  initialTimeline: SleepState[] | null;
  initialMetrics: { sleep_quality: number; morning_alertness: number; daytime_energy: number } | null;
  saveStatus: 'idle' | 'saving' | 'saved';

  setLogs: (logs: Record<string, DailyLog> | ((prev: Record<string, DailyLog>) => Record<string, DailyLog>)) => void;
  setSelectedDate: (date: string) => void;
  setIsEditing: (isEditing: boolean) => void;
  setIsDragging: (isDragging: boolean) => void;
  setActiveState: (state: SleepState) => void;
  setDragAction: (action: 'paint' | 'erase') => void;
  setInitialTimeline: (timeline: SleepState[] | null) => void;
  setInitialMetrics: (metrics: { sleep_quality: number; morning_alertness: number; daytime_energy: number } | null) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved') => void;

  updateLogLocally: (date: string, data: Partial<DailyLog>) => void;
  saveLogFromState: (userId: string, date: string, source: 'manual' | 'predicted') => Promise<void>;
  deleteLog: (userId: string, date: string) => Promise<void>;
}

export const useSleepStore = create<SleepStore>((set, get) => ({
  logs: {},
  selectedDate: new Date().toISOString().split('T')[0],
  isEditing: false,
  isDragging: false,
  activeState: 'sleep',
  dragAction: 'paint',
  initialTimeline: null,
  initialMetrics: null,
  saveStatus: 'idle',

  setLogs: (logsUpdate) => set((state) => ({ 
    logs: typeof logsUpdate === 'function' ? logsUpdate(state.logs) : logsUpdate 
  })),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setIsEditing: (isEditing) => set({ isEditing }),
  setIsDragging: (isDragging) => set({ isDragging }),
  setActiveState: (activeState) => set({ activeState }),
  setDragAction: (dragAction) => set({ dragAction }),
  setInitialTimeline: (initialTimeline) => set({ initialTimeline }),
  setInitialMetrics: (initialMetrics) => set({ initialMetrics }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),

  updateLogLocally: (date, data) => 
    set((state) => {
      const existing = state.logs[date] || { date };
      return {
        logs: {
          ...state.logs,
          [date]: { ...existing, ...data } as DailyLog
        }
      };
    }),
  deleteLog: async (userId, date) => {
    try {
      await deleteDoc(doc(db, 'users', userId, 'sleep_logs', date));
      set((state) => {
        const newLogs = { ...state.logs };
        delete newLogs[date];
        return { logs: newLogs };
      });
    } catch (error) {
      console.error('Failed to delete log:', error);
      throw error;
    }
  },
  saveLogFromState: async (userId, date, source) => {
    const log = get().logs[date];
    if (!log) return;

    let visualTimeline = log.visualTimeline;
    let sleepEvents = log.sleepEvents || [];
    
    // Always treat visualTimeline as the Single Source of Truth
    if (visualTimeline && visualTimeline.length === 96) {
      sleepEvents = convertGridToEvents(visualTimeline, date);
    } else {
      visualTimeline = getGridFromEvents(sleepEvents);
    }
    
    const sleepDuration = calculateSleepDuration(sleepEvents);
    const timeInBed = calculateTimeInBed(sleepEvents);

    const summaryMetrics = {
      sleep_quality: log.sleep_quality ?? 5,
      morning_alertness: log.morning_alertness ?? 5,
      daytime_energy: log.daytime_energy ?? 5,
      importedDuration: sleepDuration,
      importedInBed: timeInBed,
      sleep_efficiency: timeInBed > 0 ? (sleepDuration / timeInBed) * 100 : 0,
    };

    const logData: DailyLog = { 
      ...log, 
      visualTimeline,
      sleepEvents,
      summaryMetrics,
      source 
    };

    await saveLogService(userId, logData);
    
    set((state) => ({ 
      logs: { ...state.logs, [date]: logData } 
    }));
  },
}));
