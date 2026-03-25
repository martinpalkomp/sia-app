import { SleepState, SleepEvent } from '../types';
import { format } from 'date-fns';

/**
 * Maps HH:mm time to minutes from 20:00 (the start of our tracking day).
 */
export const getMinutesFrom2000 = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [h, m] = time.split(':').map(Number);
  // 20:00 is the start of our tracking day
  return ((h + 24 - 20) % 24) * 60 + m;
};

export const calculateSleepDuration = (data: SleepState[] | SleepEvent[]): number => {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
    const sleepSlots = (data as SleepState[]).filter(s => s === 'sleep').length;
    return sleepSlots * 0.25;
  }
  
  if (Array.isArray(data)) {
    return (data as SleepEvent[]).reduce((acc, event) => {
      if (event.type === 'sleep') {
        const startMins = getMinutesFrom2000(event.start);
        const endMins = getMinutesFrom2000(event.end);
        const duration = endMins < startMins ? (1440 - startMins + endMins) : (endMins - startMins);
        return acc + (duration / 60);
      }
      return acc;
    }, 0);
  }
  
  return 0;
};

export const calculateTimeInBed = (data: SleepState[] | SleepEvent[]): number => {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
    const inBedSlots = (data as SleepState[]).filter(s => s === 'sleep' || s === 'awake-in').length;
    return inBedSlots * 0.25;
  }
  
  if (Array.isArray(data)) {
    return (data as SleepEvent[]).reduce((acc, event) => {
      if (event.type === 'sleep' || event.type === 'awake-in') {
        const startMins = getMinutesFrom2000(event.start);
        const endMins = getMinutesFrom2000(event.end);
        const duration = endMins < startMins ? (1440 - startMins + endMins) : (endMins - startMins);
        return acc + (duration / 60);
      }
      return acc;
    }, 0);
  }
  
  return 0;
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

export const calculateSleepEfficiency = (data: SleepState[] | SleepEvent[]): string => {
  const sleepDuration = calculateSleepDuration(data);
  const inBedDuration = calculateTimeInBed(data);
  
  if (inBedDuration === 0) return "0";
  return ((sleepDuration / inBedDuration) * 100).toFixed(1);
};

/**
 * Maps HH:mm time to the 0-95 index array (15-min slots from 20:00 to 20:00).
 * Formula: (((Hours + 24 - 20) % 24) * 4) + Math.floor(Minutes / 15).
 */
// CRITICAL: 0 = 20:00, 48 = 08:00, 95 = 19:45
export const timeToIndex = (time: string): number => {
  if (!time) return 0;
  const t = /^\d:\d{2}$/.test(time.trim()) ? '0' + time.trim() : time.trim();
  if (!t.includes(':')) return 0;
  const [hours, minutes] = t.split(':').map(Number);
  
  // Apply -20 hour offset logic
  // Use Math.floor to ensure time snaps to the beginning of the 15-min slot
  // e.g., 23:59 still belongs to the 23:45 slot (Index 15)
  const index = (((hours + 24 - 20) % 24) * 4) + Math.floor(minutes / 15);
  
  // Boundary guard: 0-96. 
  // 96 represents the end of the 24h cycle (20:00 the next day).
  // This allows loops like i < endIdx to correctly cover the last slot (index 95).
  return Math.max(0, Math.min(96, index));
};

/**
 * Maps 0-95 index back to HH:mm time.
 */
export const indexToTime = (index: number): string => {
  const totalMinutes = index * 15;
  const hours = (Math.floor(totalMinutes / 60) + 20) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Generates a 96-slot visual grid from an array of SleepEvents.
 */
export const getGridFromEvents = (sleepEvents: SleepEvent[] = []): SleepState[] => {
  const grid: SleepState[] = new Array(96).fill('awake-out');
  
  sleepEvents.forEach(event => {
    const startIdx = timeToIndex(event.start);
    const endIdx = timeToIndex(event.end);
    
    // Handle events within the 20:00-20:00 window
    if (startIdx <= endIdx) {
      for (let i = startIdx; i < endIdx; i++) {
        grid[i] = event.type;
      }
    } else {
      // Handle wrap-around (though ideally events should be split before saving)
      for (let i = startIdx; i < 96; i++) grid[i] = event.type;
      for (let i = 0; i < endIdx; i++) grid[i] = event.type;
    }
  });
  
  return grid;
};

/**
 * Converts a 96-slot grid back into a clean array of SleepEvents.
 */
export const convertGridToEvents = (grid: SleepState[], date?: string): SleepEvent[] => {
  const sleepEvents: SleepEvent[] = [];
  if (!grid || grid.length === 0) return [];

  let currentType: SleepState | null = null;
  let startIdx = 0;

  for (let i = 0; i < 96; i++) {
    if (grid[i] !== currentType) {
      if (currentType && currentType !== 'awake-out') {
        const typeStr = currentType.toString();
        const id = date ? `import-${date}-${typeStr}-${sleepEvents.length}` : crypto.randomUUID();
        sleepEvents.push({
          id,
          type: currentType,
          start: indexToTime(startIdx),
          end: indexToTime(i)
        });
      }
      currentType = grid[i];
      startIdx = i;
    }
  }

  // Handle the last segment
  if (currentType && currentType !== 'awake-out') {
    const typeStr = currentType.toString();
    // Continuous Block Merging (Wrap-around):
    // If the last segment has the same type as the first event of the day (which starts at 20:00),
    // merge them into a single continuous event.
    if (sleepEvents.length > 0 && sleepEvents[0].start === "20:00" && sleepEvents[0].type === currentType) {
      sleepEvents[0].start = indexToTime(startIdx);
    } else {
      const id = date ? `import-${date}-${typeStr}-${sleepEvents.length}` : crypto.randomUUID();
      sleepEvents.push({
        id,
        type: currentType,
        start: indexToTime(startIdx),
        end: "20:00" // End of the tracking day
      });
    }
  }

  return sleepEvents;
};

/**
 * Merges events into a 96-slot ledger where 'sleep' has priority over 'awake-in'.
 */
export const generateSleepEventsLedger = (events: SleepEvent[], date?: string): SleepEvent[] => {
  // Initialize with null/awake-out
  const grid: SleepState[] = new Array(96).fill('awake-out');
  
  // Sort events so 'sleep' comes last and thus overwrites 'awake-in'
  const sortedEvents = [...events].sort((a, b) => {
    if (a.type === 'sleep' && b.type !== 'sleep') return 1;
    if (a.type !== 'sleep' && b.type === 'sleep') return -1;
    return 0;
  });

  sortedEvents.forEach(event => {
    const startIdx = timeToIndex(event.start);
    const endIdx = timeToIndex(event.end);
    
    if (startIdx <= endIdx) {
      // Interval-Based Ownership: slot i is filled if event_start <= slot_start < event_end
      for (let i = startIdx; i < endIdx; i++) {
        grid[i] = event.type;
      }
    } else {
      // Handle wrap-around
      for (let i = startIdx; i < 96; i++) grid[i] = event.type;
      for (let i = 0; i < endIdx; i++) grid[i] = event.type;
    }
  });
  
  return convertGridToEvents(grid, date);
};

export const addMinutes = (timeStr: string, minutes: number): string => {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date(2000, 0, 1, h, m);
  date.setMinutes(date.getMinutes() + minutes);
  return format(date, 'HH:mm');
};

/**
 * Migration utility: Converts old timeline array to events ledger.
 */
export const migrateTimelineToEvents = (timeline: SleepState[]): SleepEvent[] => {
  return convertGridToEvents(timeline);
};