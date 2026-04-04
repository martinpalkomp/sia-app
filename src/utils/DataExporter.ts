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
import { getGridFromEvents, convertGridToEvents, timeToIndex, addMinutes } from './sleepUtils';
import { TEMPLATE_INSTRUCTIONS } from './templateInstructions';

const TEMPLATE_HEADERS = [
  'Date', 'Bedtime', 'Waketime', 'Status_Code', 'SQ', 'R', 'L', 'Remarks', 
  'Caffeine_Y/N', 'Caffeine_Cups', 'Caffeine_LastIntake', 
  'Alcohol_Y/N', 'Alcohol_Drinks', 'Alcohol_LastIntake', 
  'Medication_Y/N', 'Medication_Type', 'Medication_Time', 
  'Exercise_Y/N', 'Exercise_Type', 'Exercise_Time', 
  'Screens_Y', 'Stress_1to5', 'LastMeal_Time', 
  'NaturalWake_Y', 'MorningMood_1to5', 'Sleep_Gadgets'
];

/**
 * Exports sleep logs to an Excel file with perfect symmetry to the DataImporter.
 * Uses sleepEvents as the source of truth, ensuring round-trip consistency.
 */
export const exportToExcel = async (logs: DailyLog[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('DATA');

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
    // Export all events exactly as they are in the database
    const processedEvents: { start: string; end: string; type: string }[] = (log.sleepEvents || []).map(e => ({
      start: e.start,
      end: e.end,
      type: e.type.toUpperCase()
    }));

    // Sort events by start time using the 20:00 anchor logic
    processedEvents.sort((a, b) => {
      return timeToIndex(a.start) - timeToIndex(b.start);
    });

    processedEvents.forEach((event, idx) => {
      // Determine the Calendar Date for the row
      // If start time is before 20:00, it belongs to the next calendar day relative to the sleep day
      const logDate = parseISO(log.date);
      const [hours] = event.start.split(':').map(Number);
      const calendarDate = hours < 20 ? addDays(logDate, 1) : logDate;
      const dateStr = format(calendarDate, 'yyyy-MM-dd');

      const f = log.factors || {
        caffeine: { consumed: null, amount: null, lastIntake: null },
        alcohol: { consumed: null, drinks: null, lastIntake: null },
        medication: { taken: null, type: null, time: null },
        exercise: { completed: null, type: null, time: null },
        screensInBed: null,
        stressLevel: null
      };

      const rowData = [
        dateStr,
        event.start,
        event.end,
        event.type,
        idx === 0 ? (log.sleep_quality ?? '') : '',
        idx === 0 ? (log.morning_alertness ?? '') : '',
        idx === 0 ? (log.daytime_energy ?? '') : '',
        idx === 0 ? (log.daily_remarks ?? '') : '',
        // Caffeine
        idx === 0 ? (f.caffeine?.consumed === true ? 'yes' : f.caffeine?.consumed === false ? 'no' : '') : '',
        idx === 0 ? (f.caffeine?.amount ?? '') : '',
        idx === 0 ? (f.caffeine?.lastIntake ?? '') : '',
        // Alcohol
        idx === 0 ? (f.alcohol?.consumed === true ? 'yes' : f.alcohol?.consumed === false ? 'no' : '') : '',
        idx === 0 ? (f.alcohol?.drinks ?? '') : '',
        idx === 0 ? (f.alcohol?.lastIntake ?? '') : '',
        // Medication
        idx === 0 ? (f.medication?.taken === true ? 'yes' : f.medication?.taken === false ? 'no' : '') : '',
        idx === 0 ? (f.medication?.type ?? '') : '',
        idx === 0 ? (f.medication?.time ?? '') : '',
        // Exercise
        idx === 0 ? (f.exercise?.completed === true ? 'yes' : f.exercise?.completed === false ? 'no' : '') : '',
        idx === 0 ? (f.exercise?.type ?? '') : '',
        idx === 0 ? (f.exercise?.time ?? '') : '',
        // Screens
        idx === 0 ? (f.screensInBed === true ? 'yes' : f.screensInBed === false ? 'no' : '') : '',
        // Stress
        idx === 0 ? (f.stressLevel ?? '') : '',
        // Last Meal
        idx === 0 ? (f.lastMealTime ?? '') : '',
        // Natural Wake
        idx === 0 ? (f.naturalWake === true ? 'yes' : f.naturalWake === false ? 'no' : '') : '',
        // Morning Mood
        idx === 0 ? (f.moodScore ?? '') : '',
        // Sleep Gadgets
        idx === 0 ? (() => {
          const items: string[] = [];
          
          const serializeItem = (name: string, data: { enabled?: boolean; duration?: number; timing?: string } | undefined) => {
            if (data?.enabled) {
              let s = name;
              if (data.duration) s += ` (${data.duration}min)`;
              if (data.timing) s += ` @${data.timing}`;
              items.push(s);
            }
          };

          if (f.interventions) {
            serializeItem('light_therapy', f.interventions.lightTherapy);
            serializeItem('breathing_trainer', f.interventions.breathingTrainer);
            serializeItem('pre_sleep_heating', f.interventions.preSleepHeating);
            serializeItem('aromatherapy', f.interventions.aromatherapy);
            serializeItem('meditation_app', f.interventions.meditationApp);
            serializeItem('cooling_pad', f.interventions.coolingPad);
          }
          if (f.passiveAids) {
            serializeItem('white_noise', f.passiveAids.whiteNoise);
            serializeItem('sleep_mask', f.passiveAids.sleepMask);
            serializeItem('earplugs', f.passiveAids.earplugs);
            serializeItem('weighted_blanket', f.passiveAids.weightedBlanket);
          }
          
          // Legacy support
          if (f.sleepGadgets) {
            f.sleepGadgets.forEach(g => {
              if (!items.find(i => i.startsWith(g.type))) {
                let s = g.type;
                if (g.durationMinutes) s += ` (${g.durationMinutes}min)`;
                if (g.timeOfUse) s += ` @${g.timeOfUse}`;
                items.push(s);
              }
            });
          }
          
          return items.join(', ');
        })() : ''
      ];

      const row = worksheet.addRow(rowData);
      
      // Apply conditional styling matching the template
      const isSleep = event.type === 'SLEEP';
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
    if (i === 7) return { width: 40 }; // Remarks
    if (i === 25) return { width: 40 }; // Sleep Gadgets
    return { width: 15 };
  });

  // Sheet 2: INSTRUCTIONS
  const instructionsSheet = workbook.addWorksheet('INSTRUCTIONS');
  TEMPLATE_INSTRUCTIONS.forEach((row, i) => {
    const r = instructionsSheet.addRow(row);
    if (i === 0) {
      r.getCell(1).font = { bold: true, size: 14 };
    }
    if (row[0] === 'Column' || row[0] === 'Important Notes:') {
      r.getCell(1).font = { bold: true };
    }
  });
  instructionsSheet.getColumn(1).width = 25;
  instructionsSheet.getColumn(2).width = 80;

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
