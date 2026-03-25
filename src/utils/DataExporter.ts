import ExcelJS from 'exceljs';
import { format, parseISO, addDays } from 'date-fns';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { DailyLog } from '../types';
import { getGridFromEvents, convertGridToEvents, timeToIndex } from './sleepUtils';

const TEMPLATE_HEADERS = [
  'Date', 'Bedtime', 'Waketime', 'Status_Code', 'SQ', 'RL', 'Remarks', 
  'Caffeine_Y/N', 'Caffeine_Cups', 'Caffeine_LastIntake', 
  'Alcohol_Y/N', 'Alcohol_Drinks', 'Alcohol_LastIntake', 
  'Medication_Y/N', 'Medication_Type', 'Medication_Time', 
  'Exercise_Y/N', 'Exercise_Type', 'Exercise_Time', 
  'Screens_Y/N', 'Stress_1to5', 'LastMeal_Time', 
  'NaturalWake_Y/N', 'MorningMood_1to5', 'Sleep_Gadgets'
];

/**
 * Exports sleep logs to an Excel file with perfect symmetry to the DataImporter.
 * Uses sleepEvents as the source of truth, ensuring round-trip consistency.
 */
export const exportToExcel = async (logs: DailyLog[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  // Add headers with styling matching the template
  const headerRow = worksheet.addRow(TEMPLATE_HEADERS);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2D2B55' }
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      name: 'Arial'
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Sort logs by date ascending
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  sortedLogs.forEach(log => {
    // Regenerate events from grid to ensure they are merged and consistent with importer logic
    const grid = getGridFromEvents(log.sleepEvents || []);
    const events = convertGridToEvents(grid);

    // Sort events by start time using the 20:00 anchor logic
    events.sort((a, b) => {
      return timeToIndex(a.start) - timeToIndex(b.start);
    });

    events.forEach((event, idx) => {
      // Determine the Calendar Date for the row
      // If start time is before 20:00, it belongs to the next calendar day relative to the sleep day
      const logDate = parseISO(log.date);
      const [hours] = event.start.split(':').map(Number);
      const calendarDate = hours < 20 ? addDays(logDate, 1) : logDate;
      const dateStr = format(calendarDate, 'yyyy-MM-dd');

      const f = log.factors || {
        caffeine: { consumed: false, amount: 0, lastIntake: '' },
        alcohol: { consumed: false, drinks: 0, lastIntake: '' },
        medication: { taken: false, type: '', time: '' },
        exercise: { completed: false, type: '', time: '' },
        screensInBed: false,
        stressLevel: 3
      };

      const rowData = [
        dateStr,
        event.start,
        event.end,
        event.type === 'sleep' ? 'SLEEP' : event.type === 'awake-in' ? 'AWAKE-IN' : 'AWAKE-OUT',
        idx === 0 ? (log.sleep_quality ?? '') : '',
        idx === 0 ? (log.morning_alertness ?? '') : '',
        idx === 0 ? (log.daily_remarks ?? '') : '',
        // Caffeine
        idx === 0 ? (f.caffeine?.consumed ? 'yes' : 'no') : '',
        idx === 0 ? (f.caffeine?.amount ?? '') : '',
        idx === 0 ? (f.caffeine?.lastIntake ?? '') : '',
        // Alcohol
        idx === 0 ? (f.alcohol?.consumed ? 'yes' : 'no') : '',
        idx === 0 ? (f.alcohol?.drinks ?? '') : '',
        idx === 0 ? (f.alcohol?.lastIntake ?? '') : '',
        // Medication
        idx === 0 ? (f.medication?.taken ? 'yes' : 'no') : '',
        idx === 0 ? (f.medication?.type ?? '') : '',
        idx === 0 ? (f.medication?.time ?? '') : '',
        // Exercise
        idx === 0 ? (f.exercise?.completed ? 'yes' : 'no') : '',
        idx === 0 ? (f.exercise?.type ?? '') : '',
        idx === 0 ? (f.exercise?.time ?? '') : '',
        // Screens
        idx === 0 ? (f.screensInBed ? 'yes' : 'no') : '',
        // Stress
        idx === 0 ? (f.stressLevel ?? '') : '',
        // Last Meal
        idx === 0 ? (f.lastMealTime ?? '') : '',
        // Natural Wake
        idx === 0 ? (f.naturalWake ? 'yes' : 'no') : '',
        // Morning Mood
        idx === 0 ? (f.moodScore ?? '') : '',
        // Sleep Gadgets
        idx === 0 ? (f.sleepGadgets?.map(g => {
          let s = g.type;
          if (g.durationMinutes) s += ` (${g.durationMinutes}min)`;
          if (g.timeOfUse) s += ` @${g.timeOfUse}`;
          return s;
        }).join(', ') ?? '') : ''
      ];

      const row = worksheet.addRow(rowData);
      
      // Apply conditional styling matching the template
      const isSleep = event.type === 'sleep';
      const fillColor = isSleep ? 'FFE8E6FF' : 'FFFFF8E1';
      row.eachCell((cell, colNumber) => {
        // Only color the first 4 columns (Date, Bedtime, Waketime, Status_Code)
        if (colNumber <= 4) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: fillColor }
          };
        }
      });
    });
  });

  // Set column widths for readability
  worksheet.columns = TEMPLATE_HEADERS.map((h, i) => {
    if (i === 6) return { width: 40 }; // Remarks
    if (i === 24) return { width: 40 }; // Sleep Gadgets
    return { width: 15 };
  });

  // Trigger file download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sia_sleep_export_${format(new Date(), 'yyyyMMdd')}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Fetches all user logs from Firestore and exports them to Excel.
 * Used in AccountPage for a full data backup.
 */
export async function exportUserData(user: User, db: any) {
  const logsRef = collection(db, 'users', user.uid, 'sleep_logs');
  const q = query(logsRef, orderBy('date', 'asc'));
  const logsSnap = await getDocs(q);
  const logs = logsSnap.docs.map(d => d.data() as DailyLog);
  
  await exportToExcel(logs);
}
