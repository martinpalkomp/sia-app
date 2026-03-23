import ExcelJS from 'exceljs';
import { format, parse, differenceInMinutes } from 'date-fns';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { DailyLog, PersonalizationProfile } from '../types';
import { calculateAge } from './dateUtils';

export async function exportUserData(user: User, db: any) {
  const workbook = new ExcelJS.Workbook();
  const today = format(new Date(), 'yyyy-MM-dd');

  // --- SHEET 1: Sleep Logs ---
  const sleepLogsSheet = workbook.addWorksheet('Sleep Logs');
  const headers = [
    'Date', 'Bedtime', 'Waketime', 'Status_Code', 'SQ', 'R', 'L', 'Remarks', 
    'Caffeine_Y', 'Caffeine_Cups', 'Caffeine_LastIntake', 'Alcohol_Y', 'Alcohol_Drinks', 'Alcohol_LastIntake', 
    'Medication_Y', 'Medication_Type', 'Medication_Time', 'Exercise_Y', 'Exercise_Type', 'Exercise_Time', 
    'Screens_Y', 'Stress_1to5', 'LastMeal_Time', 'NaturalWake_Y', 'MorningMood_1to5', 'Sleep_Gadgets'
  ];

  const headerRow = sleepLogsSheet.addRow(headers);
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

  // Fetch sleep logs
  const logsRef = collection(db, 'users', user.uid, 'sleep_logs');
  const q = query(logsRef, orderBy('date', 'asc'));
  const logsSnap = await getDocs(q);
  const logs = logsSnap.docs.map(d => d.data() as DailyLog);

  // Track whether we've written factors for this date yet
  const writtenFactorDates = new Set<string>();

  logs.forEach(log => {
    if (!log.sleepEvents || log.sleepEvents.length === 0) return;

    log.sleepEvents.forEach((event) => {
      const shouldWriteFactors = event.type === 'sleep' && !writtenFactorDates.has(log.date);
      if (shouldWriteFactors) writtenFactorDates.add(log.date);
      const factors = log.factors;

      const rowData = [
        log.date,
        event.start,
        event.end,
        event.type.toUpperCase(),
        shouldWriteFactors ? log.sleep_quality : '',
        shouldWriteFactors ? log.morning_alertness : '',
        shouldWriteFactors ? log.daytime_energy : '',
        shouldWriteFactors ? log.daily_remarks : '',
        shouldWriteFactors ? (factors?.caffeine?.consumed ? 'yes' : 'no') : '',
        shouldWriteFactors ? (factors?.caffeine?.amount ?? '') : '',
        shouldWriteFactors ? (factors?.caffeine?.lastIntake ?? '') : '',
        shouldWriteFactors ? (factors?.alcohol?.consumed ? 'yes' : 'no') : '',
        shouldWriteFactors ? (factors?.alcohol?.drinks ?? '') : '',
        shouldWriteFactors ? (factors?.alcohol?.lastIntake ?? '') : '',
        shouldWriteFactors ? (factors?.medication?.taken ? 'yes' : 'no') : '',
        shouldWriteFactors ? (factors?.medication?.type ?? '') : '',
        shouldWriteFactors ? (factors?.medication?.time ?? '') : '',
        shouldWriteFactors ? (factors?.exercise?.completed ? 'yes' : 'no') : '',
        shouldWriteFactors ? (factors?.exercise?.type ?? '') : '',
        shouldWriteFactors ? (factors?.exercise?.time ?? '') : '',
        shouldWriteFactors ? (factors?.screensInBed ? 'yes' : 'no') : '',
        shouldWriteFactors ? (factors?.stressLevel ?? '') : '',
        shouldWriteFactors ? (factors?.lastMealTime ?? '') : '',
        shouldWriteFactors ? (factors?.naturalWake ? 'yes' : 'no') : '',
        shouldWriteFactors ? (factors?.moodScore ?? '') : '',
        shouldWriteFactors ? (log.factors?.sleepGadgets?.map(g => {
          let s = g.type;
          if (g.durationMinutes) s += `(${g.durationMinutes}min)`;
          if (g.timeOfUse) s += `@${g.timeOfUse}`;
          return s;
        }).join(',') ?? '') : ''
      ];

      const row = sleepLogsSheet.addRow(rowData);
      const fillColor = event.type === 'sleep' ? 'FFE8E6FF' : 'FFFFF8E1';
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
      });
    });
  });

  sleepLogsSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  sleepLogsSheet.columns = [
    { width: 13 }, { width: 9 }, { width: 9 }, { width: 13 }, { width: 5 }, { width: 5 }, { width: 5 }, { width: 22 },
    { width: 10 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 16 },
    { width: 12 }, { width: 10 }, { width: 16 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 30 }
  ];

  // --- SHEET 2: User ---
  const userSheet = workbook.addWorksheet('User');
  const userHeaders = ['Field', 'Value'];
  const userHeaderRow = userSheet.addRow(userHeaders);
  userHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D2B55' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  });

  const profileRef = doc(db, 'users', user.uid, 'personalization', 'profile');
  const profileSnap = await getDoc(profileRef);
  const profile = profileSnap.data() as PersonalizationProfile;

  const userRows = [
    ['Display Name', user.displayName || '—'],
    ['Email', user.email || '—'],
    ['Export Date', today],
    ['--- Demographics ---', ''],
    ['Date of Birth', profile?.demographics?.dateOfBirth ?? '—'],
    ['Age', profile?.demographics?.dateOfBirth ? calculateAge(profile.demographics.dateOfBirth) : '—'],
    ['Country', profile?.demographics?.country ?? '—'],
    ['Sex', profile?.demographics?.sex ?? '—'],
    ['Work Schedule', profile?.demographics?.workSchedule ?? '—'],
    ['Environment', profile?.demographics?.environmentType ?? '—'],
    ['--- Sleep Goals ---', ''],
    ['Goals', profile?.goals?.join(', ') ?? '—'],
    ['--- PSQI Baseline ---', ''],
    ['Time to Fall Asleep', profile?.psqi?.time_to_fall_asleep ? profile.psqi.time_to_fall_asleep + ' mins' : '—'],
    ['Baseline Sleep Quality', profile?.psqi?.sleep_quality ? profile.psqi.sleep_quality + '/10' : '—'],
    ['Daytime Sleepiness', profile?.psqi?.daytime_sleepiness ? profile.psqi.daytime_sleepiness + '/10' : '—'],
    ['--- Clinical Data ---', ''],
    ['N1 %', profile?.clinical?.n1 ?? '—'],
    ['N2 %', profile?.clinical?.n2 ?? '—'],
    ['N3 %', profile?.clinical?.n3 ?? '—'],
    ['REM %', profile?.clinical?.rem ?? '—'],
    ['Avg SpO2', profile?.clinical?.oxygen?.avgSpO2 ?? '—'],
    ['Min SpO2', profile?.clinical?.oxygen?.minSpO2 ?? '—'],
    ['Avg Sleeping HR', profile?.clinical?.heart?.avgSleepingHR ?? '—'],
    ['Clinical Notes', profile?.clinical?.notes ?? '—']
  ];

  userRows.forEach(r => userSheet.addRow(r));
  userSheet.addRow([]);
  userSheet.addRow(['SIA export — not a clinical document. For reference only.']);
  userSheet.getColumn(1).width = 25;
  userSheet.getColumn(2).width = 50;

  // --- SHEET 3: 🔒 Summary ---
  const summarySheet = workbook.addWorksheet('🔒 Summary');
  
  // Add bold red row at the top
  const warningRow = summarySheet.addRow(['DO NOT REIMPORT THIS SHEET — for reference only.']);
  warningRow.font = { color: { argb: 'FFFF0000' }, bold: true };
  
  const summaryHeaders = ['Metric', 'Value'];
  const summaryHeaderRow = summarySheet.addRow(summaryHeaders);
  summaryHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D2B55' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  });

  // Add comment to A1 (which is now A2 because of the warning row, but let's stick to the prompt's intent)
  // Actually, prompt says "Add a note in cell A1 comment".
  summarySheet.getCell('A1').note = "This sheet is for reference only and will be ignored if reimported.";

  // Compute metrics
  let totalDurationMin = 0;
  let totalSQ = 0;
  let totalAlertness = 0;
  let totalEnergy = 0;
  let totalStress = 0;
  let nightsWithWakeEvents = 0;
  let totalInterruptions = 0;
  const bedtimes: string[] = [];

  logs.forEach(log => {
    if (!log.sleepEvents) return;
    
    let nightDuration = 0;
    let nightInterruptions = 0;
    
    log.sleepEvents.forEach(event => {
      const start = parse(event.start, 'HH:mm', new Date());
      let end = parse(event.end, 'HH:mm', new Date());
      if (end < start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      
      const duration = differenceInMinutes(end, start);
      if (event.type === 'sleep') {
        nightDuration += duration;
      } else if (event.type === 'awake-in') {
        nightInterruptions++;
      }
    });

    if (nightInterruptions > 0) nightsWithWakeEvents++;
    totalInterruptions += nightInterruptions;
    totalDurationMin += nightDuration;
    totalSQ += log.sleep_quality || 0;
    totalAlertness += log.morning_alertness || 0;
    totalEnergy += log.daytime_energy || 0;
    totalStress += log.factors?.stressLevel || 0;

    const firstSleep = log.sleepEvents.find(e => e.type === 'sleep');
    if (firstSleep) bedtimes.push(firstSleep.start);
  });

  const count = logs.length;
  const avgDuration = count > 0 ? (totalDurationMin / 60 / count).toFixed(1) : 0;
  const avgSQ = count > 0 ? (totalSQ / count).toFixed(1) : 0;
  const avgAlertness = count > 0 ? (totalAlertness / count).toFixed(1) : 0;
  const avgEnergy = count > 0 ? (totalEnergy / count).toFixed(1) : 0;
  const avgStress = count > 0 ? (totalStress / count).toFixed(1) : 0;
  const totalSleepHours = totalDurationMin / 60;
  const fragmentationIndex = totalSleepHours > 0 ? (totalInterruptions / totalSleepHours).toFixed(2) : 0;

  // Mode of bedtimes
  const bedtimeCounts: Record<string, number> = {};
  bedtimes.forEach(b => bedtimeCounts[b] = (bedtimeCounts[b] || 0) + 1);
  const mostCommonBedtime = Object.keys(bedtimeCounts).sort((a, b) => bedtimeCounts[b] - bedtimeCounts[a])[0] || '—';

  const summaryRows = [
    ['Export Period', logs.length > 0 ? `${logs[0].date} → ${logs[logs.length - 1].date}` : '—'],
    ['Total Nights Logged', count],
    ['Avg Sleep Duration', `${avgDuration} hrs`],
    ['Avg Sleep Quality', `${avgSQ}/10`],
    ['Avg Morning Alertness', `${avgAlertness}/10`],
    ['Avg Daytime Energy', `${avgEnergy}/10`],
    ['Avg Fragmentation Index', `${fragmentationIndex} interruptions/hr`],
    ['Nights with Wake Events', nightsWithWakeEvents],
    ['Most Common Bedtime', mostCommonBedtime],
    ['Avg Stress Level', `${avgStress}/5`]
  ];

  summaryRows.forEach(r => summarySheet.addRow(r));
  summarySheet.getColumn(1).width = 30;
  summarySheet.getColumn(2).width = 30;

  // --- SHEET 4: Unstructured Notes ---
  const notesSheet = workbook.addWorksheet('Unstructured Notes');
  const notesHeaders = ['File Name', 'Upload Date', 'Type', 'Summary', 'Insights', 'Raw Excerpt'];
  const notesHeaderRow = notesSheet.addRow(notesHeaders);
  notesHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D2B55' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  });

  const notesRef = collection(db, 'users', user.uid, 'unstructured_data');
  const notesQ = query(notesRef, orderBy('uploadDate', 'desc'));
  const notesSnap = await getDocs(notesQ);
  
  notesSnap.docs.forEach(d => {
    const data = d.data();
    notesSheet.addRow([
      data.fileName,
      data.uploadDate ? format(new Date(data.uploadDate), 'yyyy-MM-dd HH:mm') : '—',
      data.rawDataType ?? '—',
      data.summary ?? '—',
      data.extractedInsights?.join('; ') ?? '—',
      data.content?.slice(0, 500) ?? ''
    ]);
  });

  notesSheet.getColumn(1).width = 20;
  notesSheet.getColumn(2).width = 20;
  notesSheet.getColumn(3).width = 15;
  notesSheet.getColumn(4).width = 40;
  notesSheet.getColumn(5).width = 40;
  notesSheet.getColumn(6).width = 60;

  // --- DOWNLOAD TRIGGER ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sia_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
