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

const TEMPLATE_HEADERS = ['Date', 'Bedtime', 'Waketime', 'Status_Code', 'SQ', 'Remarks'];

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

      const rowData = [
        dateStr,
        event.start,
        event.end,
        event.type === 'sleep' ? 'SLEEP' : event.type === 'awake-in' ? 'AWAKE-IN' : 'AWAKE-OUT',
        idx === 0 ? (log.sleep_quality ?? '') : '',
        idx === 0 ? (log.daily_remarks ?? '') : ''
      ];

      const row = worksheet.addRow(rowData);
      
      // Apply conditional styling matching the template
      const isSleep = event.type === 'sleep';
      const fillColor = isSleep ? 'FFE8E6FF' : 'FFFFF8E1';
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
      });
    });
  });

  // Set column widths for readability
  worksheet.columns = [
    { width: 13 }, // Date
    { width: 9 },  // Bedtime
    { width: 9 },  // Waketime
    { width: 13 }, // Status_Code
    { width: 5 },  // SQ
    { width: 40 }  // Remarks
  ];

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
