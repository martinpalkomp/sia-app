import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { read, utils, writeFile } from 'xlsx';
import ExcelJS from 'exceljs';
import { parse, format, isValid, subDays, parseISO } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileSpreadsheet,
  Send,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  db, 
  User, 
  doc, 
  serverTimestamp, 
  getDoc, 
  runTransaction, 
  addDoc, 
  collection,
  deleteField 
} from '../lib/firebase';
import { DailyLog, SleepState, SleepEvent } from '../types';
import { TOTAL_SLOTS } from '../constants';
import { saveLog } from '../services/sleepService';
import { 
  snapTo15Min, 
  timeToIndex, 
  getGridFromEvents, 
  convertGridToEvents, 
  getMinutesFrom2000,
  generateSleepEventsLedger,
  addMinutes
} from '../utils/sleepUtils';
import { TEMPLATE_INSTRUCTIONS } from '../utils/templateInstructions';

interface DataImporterProps {
  user: User;
  onImportComplete: () => void;
  onRefresh?: () => void;
  isImporting?: boolean;
  setIsImporting?: (val: boolean) => void;
  logs?: Record<string, DailyLog>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const TEMPLATE_HEADERS = [
  'Date', 'Bedtime', 'Waketime', 'Status_Code', 'SQ', 'R', 'L', 'Remarks', 
  'Caffeine_Y', 'Caffeine_Cups', 'Caffeine_LastIntake', 
  'Alcohol_Y', 'Alcohol_Drinks', 'Alcohol_LastIntake', 
  'Medication_Y', 'Medication_Type', 'Medication_Time', 
  'Exercise_Y', 'Exercise_Type', 'Exercise_Time', 
  'Screens_Y', 'Stress_1to5', 'LastMeal_Time', 
  'NaturalWake_Y', 'MorningMood_1to5', 'Sleep_Gadgets'
];

export default function DataImporter({ user, onImportComplete, onRefresh, isImporting, setIsImporting, logs = {} }: DataImporterProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'unstructured'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingData, setPendingData] = useState<any[] | null>(null);
  const [pendingRawContent, setPendingRawContent] = useState<string | null>(null);
  const [cleaningReport, setCleaningReport] = useState<{ skipped: number; cleaned: number; metrics: string[] } | null>(null);
  const [showLegacyToast, setShowLegacyToast] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ]);
  };

  const saveUnstructuredData = async (content: string, fileName: string) => {
    if (!db) { setUploadStatus('error'); setErrorMessage('Database not available — check Firebase configuration'); return; }
    setUploadStatus('idle'); // Show processing state
    
    // Step 1: Try AI extraction — failure must never block Step 2
    let extracted = { summary: null, estimatedDateRange: null, extractedInsights: [], rawDataType: 'unknown' };
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const aiPromise = ai.models.generateContent({
          model: "gemini-1.5-flash",
          config: {
            systemInstruction: "Extract sleep insights from this text. Return only valid JSON: { summary, estimatedDateRange, extractedInsights (string array), rawDataType }.",
            temperature: 0.4
          },
          contents: content.slice(0, 8000)
        });

        const response = await withTimeout(aiPromise, 15000, "AI extraction timed out");
        const clean = (response.text ?? '').replace(/```json|```/g, '').trim();
        extracted = JSON.parse(clean);
      }
    } catch (aiError) {
      console.warn('AI extraction skipped — continuing with null metadata:', aiError);
    }

    // Step 2: Always save to Firestore regardless of Step 1 outcome
    try {
      await addDoc(collection(db, 'users', user.uid, 'unstructured_data'), {
        fileName,
        content,
        uploadDate: new Date().toISOString(),
        status: 'raw_text',
        source: 'import',
        summary: extracted.summary,
        estimatedDateRange: extracted.estimatedDateRange,
        extractedInsights: extracted.extractedInsights,
        rawDataType: extracted.rawDataType,
        updatedAt: serverTimestamp()
      });
      setUploadStatus('unstructured');
      setErrorMessage("This data format doesn't fit the sleep grid. SIA has indexed this text and will use it for AI Analysis.");
      if (onImportComplete) onImportComplete();
    } catch (firestoreError: any) {
      console.error("Failed to save unstructured data:", firestoreError);
      setUploadStatus('error');
      setErrorMessage("Failed to save data: " + firestoreError.message);
    } finally {
      setIsUploading(false);
      if (setIsImporting) setIsImporting(false);
    }
  };

  const fuzzyMapHeader = (header: string): string | null => {
    const h = header.toLowerCase().trim();
    if (h === 'date') return 'Date';
    if (h.includes('start') || h.includes('begin') || h === 'bedtime') return 'Start_Time';
    if (h.includes('end') || h.includes('finish') || h === 'waketime') return 'End_Time';
    if (h.includes('status') || h.includes('type') || h.includes('code')) return 'Status_Code';
    if (h === 'sq' || h.includes('quality')) return 'SQ';
    if (h === 'r' || h === 'morning_alertness') return 'R';
    if (h === 'l' || h === 'daytime_energy') return 'L';
    if (h.includes('remark') || h.includes('note') || h.includes('comment')) return 'Remarks';
    if (h === 'caffeine_y' || h === 'caffeine' || h === 'caffeine_y/n') return 'Caffeine_Y';
    if (h === 'caffeine_cups' || h === 'cups') return 'Caffeine_Cups';
    if (h === 'caffeine_lastintake' || h === 'caffeine_time') return 'Caffeine_LastIntake';
    if (h === 'alcohol_y' || h === 'alcohol' || h === 'alcohol_y/n') return 'Alcohol_Y';
    if (h === 'alcohol_drinks' || h === 'drinks') return 'Alcohol_Drinks';
    if (h === 'alcohol_lastintake' || h === 'alcohol_time') return 'Alcohol_LastIntake';
    if (h === 'medication_y' || h === 'medication' || h === 'medication_y/n') return 'Medication_Y';
    if (h === 'medication_type') return 'Medication_Type';
    if (h === 'medication_time') return 'Medication_Time';
    if (h === 'exercise_y' || h === 'exercise' || h === 'exercise_y/n') return 'Exercise_Y';
    if (h === 'exercise_type') return 'Exercise_Type';
    if (h === 'exercise_time') return 'Exercise_Time';
    if (h === 'screens_y' || h === 'screens' || h === 'screens_y/n') return 'Screens_Y';
    if (h === 'stress_1to5' || h === 'stress') return 'Stress';
    if (h === 'lastmeal_time' || h === 'lastmeal' || h === 'last_meal') return 'LastMeal';
    if (h === 'naturalwake_y' || h === 'naturalwake' || h === 'natural_wake' || h === 'naturalwake_y/n') return 'NaturalWake';
    if (h === 'morningmood_1to5' || h === 'morningmood' || h === 'morning_mood') return 'MoodScore';
    if (h === 'sleep_gadgets' || h === 'gadgets' || h.includes('gadget')) return 'Sleep_Gadgets';
    return null;
  };

  const defaultLog = (date: string): DailyLog => ({
    date,
    type: 'log',
    isIgnored: false,
    sleep_quality: 0,
    morning_alertness: 0,
    daytime_energy: 0,
    sleepEvents: [],
    daily_remarks: '',
    source: 'import',
    factors: {
      caffeine: { consumed: null, amount: null, lastIntake: null },
      alcohol: { consumed: null, drinks: null, lastIntake: null },
      medication: { taken: null, type: null, time: null },
      exercise: { completed: null, type: null, time: null },
      screensInBed: null,
      stressLevel: null,
      lastMealTime: null,
      naturalWake: null,
      moodScore: null,
      sleepGadgets: [],
    },
  });

  const validateFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setUploadStatus('error');
      setErrorMessage("File too large. Please upload a file under 5MB.");
      return false;
    }

    const allowedExtensions = ['.csv', '.xls', '.xlsx', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      setUploadStatus('error');
      setErrorMessage("Invalid file type. Only .csv, .xls, .xlsx, and .txt are accepted.");
      return false;
    }

    return true;
  };

  const cleanData = (data: any[]) => {
    return data.filter(row => {
      // Check if row is not empty
      return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
    }).map(row => {
      const cleanedRow: any = {};
      Object.keys(row).forEach(key => {
        const cleanedKey = key.trim();
        cleanedRow[cleanedKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
      });
      return cleanedRow;
    });
  };

  const getSleepDay = (dateStr: string): string => {
    try {
      if (!dateStr) return format(new Date(), 'yyyy-MM-dd');
      if (dateStr.includes('/') || dateStr.includes('.')) {
        const formats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'dd.MM.yyyy', 'yyyy.MM.dd', 'yyyy/MM/dd'];
        for (const f of formats) {
          const p = parse(dateStr, f, new Date());
          if (isValid(p)) return format(p, 'yyyy-MM-dd');
        }
      }
      const d = parseISO(dateStr);
      if (isValid(d)) return format(d, 'yyyy-MM-dd');
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const normalizeTime = (t: any): string => {
    const internalNormalize = (val: any): string => {
      if (!val && val !== 0) return '';

      // Handle Excel serial time format
      if (typeof val === 'number' && val >= 0 && val < 1) {
        const totalMinutes = Math.round(val * 24 * 60);
        const hours = Math.floor(totalMinutes / 60) % 24;
        const mins = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }

      // Handle Date objects
      if (val instanceof Date) {
        const hours = val.getUTCHours();
        const mins = val.getUTCMinutes();
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }

      let str = val.toString().trim().toUpperCase();
      
      // Handle AM/PM
      const ampmMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (ampmMatch) {
        let h = parseInt(ampmMatch[1]);
        const m = ampmMatch[2];
        const p = ampmMatch[3].toUpperCase();
        if (p === 'PM' && h < 12) h += 12;
        if (p === 'AM' && h === 12) h = 0;
        return `${h.toString().padStart(2, '0')}:${m}`;
      }

      if (str === '24:00') return '00:00';
      if (/^\d:\d{2}$/.test(str)) return '0' + str;
      if (/^\d{2}:\d{2}:\d{2}$/.test(str)) return str.slice(0, 5);
      
      return str;
    };

    const result = internalNormalize(t);
    return /^\d{2}:\d{2}$/.test(result) ? result : '';
  };

  const validateAndMapRow = (row: any, idx: number, skippedRows?: string[], isStrict = false) => {
    const mappedRow: any = {};
    const unmappedData: string[] = [];

    if (isStrict) {
      // Strict Template Mode: Direct mapping based on TEMPLATE_HEADERS
      mappedRow.Date = row.Date;
      mappedRow.Start_Time = row.Bedtime;
      mappedRow.End_Time = row.Waketime;
      mappedRow.Status_Code = row.Status_Code;
      mappedRow.SQ = row.SQ;
      mappedRow.R = row.R;
      mappedRow.L = row.L;
      mappedRow.Remarks = row.Remarks;
      mappedRow.Caffeine_Y = row.Caffeine_Y;
      mappedRow.Caffeine_Cups = row.Caffeine_Cups;
      mappedRow.Caffeine_LastIntake = row.Caffeine_LastIntake;
      mappedRow.Alcohol_Y = row.Alcohol_Y;
      mappedRow.Alcohol_Drinks = row.Alcohol_Drinks;
      mappedRow.Alcohol_LastIntake = row.Alcohol_LastIntake;
      mappedRow.Medication_Y = row.Medication_Y;
      mappedRow.Medication_Type = row.Medication_Type;
      mappedRow.Medication_Time = row.Medication_Time;
      mappedRow.Exercise_Y = row.Exercise_Y;
      mappedRow.Exercise_Type = row.Exercise_Type;
      mappedRow.Exercise_Time = row.Exercise_Time;
      mappedRow.Screens_Y = row.Screens_Y;
      mappedRow.Stress = row.Stress_1to5;
      mappedRow.LastMeal = row.LastMeal_Time;
      mappedRow.NaturalWake = row.NaturalWake_Y;
      mappedRow.MoodScore = row.MorningMood_1to5;
      mappedRow.Sleep_Gadgets = row.Sleep_Gadgets;
    } else {
      Object.keys(row).forEach(key => {
        const mappedKey = fuzzyMapHeader(key);
        if (mappedKey) {
          mappedRow[mappedKey] = row[key];
        } else {
          unmappedData.push(`${key}: ${row[key]}`);
        }
      });
    }

    let dateStr = '';
    try {
      if (mappedRow.Date instanceof Date) {
        dateStr = format(mappedRow.Date, 'yyyy-MM-dd');
      } else if (typeof mappedRow.Date === 'number') {
        // Handle Excel serial date
        const date = new Date((mappedRow.Date - 25569) * 86400 * 1000);
        dateStr = format(date, 'yyyy-MM-dd');
      } else {
        const rawDate = mappedRow.Date?.toString() || '';
        // Try to parse and re-format to yyyy-MM-dd
        let parsedDate = parseISO(rawDate);
        if (!isValid(parsedDate)) {
          const formats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'dd.MM.yyyy', 'yyyy.MM.dd', 'yyyy/MM/dd'];
          for (const f of formats) {
            const p = parse(rawDate, f, new Date());
            if (isValid(p)) {
              parsedDate = p;
              break;
            }
          }
        }
        dateStr = isValid(parsedDate) ? format(parsedDate, 'yyyy-MM-dd') : rawDate;
      }
    } catch (e) {
      dateStr = mappedRow.Date?.toString() || '';
    }

    let start = normalizeTime(mappedRow.Start_Time);
    let end = normalizeTime(mappedRow.End_Time);

    if (!dateStr || !start || !end) {
      if (skippedRows) skippedRows.push(`Row ${idx + 1}: Missing required fields (Date, Bedtime, Waketime)`);
      return null;
    }

    if (start === end) {
      if (skippedRows) skippedRows.push(`Row ${idx + 1}: Start time matches end time (${start})`);
      return null;
    }

    // Final validation of the date string
    const finalParsedDate = parseISO(dateStr);
    if (!isValid(finalParsedDate)) {
      if (skippedRows) skippedRows.push(`Row ${idx + 1}: Invalid date format (${dateStr})`);
      return null;
    }

    const formattedDate = format(finalParsedDate, 'yyyy-MM-dd');
    mappedRow.Date = formattedDate;
    mappedRow.Start_Time = start;
    mappedRow.End_Time = end;

    return {
      _mapped: mappedRow,
      _unmapped: unmappedData
    };
  };

  const normalizeRowsWithAI = async (invalidRows: any[]) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return [];
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        The following data rows failed validation for a sleep tracking app. 
        Please attempt to normalize them into valid sleep log entries.
        
        Expected Schema for each entry:
        - Date: YYYY-MM-DD
        - Start_Time: HH:mm (24h format)
        - End_Time: HH:mm (24h format)
        - Status_Code: "SLEEP" or "AWAKE-IN"
        - SQ: number (0-10, optional)
        - R: number (0-10, optional)
        - L: number (0-10, optional)
        - Remarks: string (optional)
        - Caffeine_Y: "yes" or "no" (optional)
        - Alcohol_Y: "yes" or "no" (optional)
        
        Invalid Data:
        ${JSON.stringify(invalidRows.slice(0, 50), null, 2)}
        
        Return ONLY a JSON array of objects. If a row cannot be normalized, omit it from the array.
      `;

      const aiPromise = ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.4 }
      });

      const response = await withTimeout(aiPromise, 25000, "AI normalization timed out");

      const text = response.text || '[]';
      const clean = text.replace(/```json|```/g, '').trim();
      
      try {
        const normalized = JSON.parse(clean);
        return Array.isArray(normalized) ? normalized : [];
      } catch (parseError) {
        console.error("AI JSON Parse Error:", parseError, "Raw text:", text);
        return [];
      }
    } catch (error) {
      console.error("AI Normalization failed:", error);
      return [];
    }
  };

  const processImportedData = async (data: any[], forceOverwrite = false, rawContent?: string) => {
    if (!db) { setUploadStatus('error'); setErrorMessage('Database not available — check Firebase configuration'); return; }
    
    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === '') return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    const parseBool = (val: any) => {
      if (val === undefined || val === null || val === '') return null;
      const s = val.toString().toLowerCase().trim();
      if (s === 'yes' || s === 'true' || s === '1' || s === 'y') return true;
      if (s === 'no' || s === 'false' || s === '0' || s === 'n') return false;
      return null;
    };

    setUploadStatus('idle');
    setErrorMessage('');
    setCleaningReport(null);
    setShowLegacyToast(false);
    if (setIsImporting) setIsImporting(true);
    
    try {
      const cleanedData = cleanData(data);
      const skippedRows: string[] = [];
      const initialInvalidRows: any[] = [];
      let cleanedCount = 0;
      const logsToSave: Record<string, DailyLog> = {};
      const metricsCaptured = new Set<string>();
      
      // Strict Template Mode Detection
      const firstRow = cleanedData[0] || {};
      const actualHeaders = Object.keys(firstRow);
      const isStrictTemplate = actualHeaders.length === TEMPLATE_HEADERS.length && 
                               TEMPLATE_HEADERS.every((h, i) => actualHeaders[i] === h);
      
      // 1. Initial Validation & Sanitization
      let validRows: any[] = [];
      cleanedData.forEach((row, idx) => {
        const result = validateAndMapRow(row, idx, [], isStrictTemplate);
        // Strict Data Contract: Date, Start_Time (Bedtime), End_Time (Waketime) are required
        if (result && result._mapped.Date && result._mapped.Start_Time && result._mapped.End_Time) {
          const processedRow = { ...row, ...result };
          validRows.push(processedRow);
        } else {
          initialInvalidRows.push(row);
        }
      });

      // 2. AI Normalization for invalid rows
      if (initialInvalidRows.length > 0) {
        setErrorMessage(`SIA is attempting to normalize ${initialInvalidRows.length} complex rows...`);
        const aiNormalized = await normalizeRowsWithAI(initialInvalidRows);
        
        if (aiNormalized.length > 0) {
          aiNormalized.forEach((row, idx) => {
            const result = validateAndMapRow(row, 9000 + idx, []);
            if (result && result._mapped.Date && result._mapped.Start_Time && result._mapped.End_Time) {
              validRows.push({ ...row, ...result });
            }
          });
        }
        
        // Calculate truly skipped rows
        const totalSent = initialInvalidRows.length;
        const totalRecovered = validRows.length - (cleanedData.length - initialInvalidRows.length);
        if (totalRecovered < totalSent) {
          skippedRows.push(`Skipped ${totalSent - totalRecovered} rows that could not be normalized.`);
        }
      }

      // If no valid rows found after AI normalization, route to unstructured_data
      if (validRows.length === 0) {
        const contentToSave = rawContent || JSON.stringify(data.slice(0, 100));
        await saveUnstructuredData(contentToSave, "Malformed_Import_" + format(new Date(), 'yyyyMMdd_HHmm') + ".txt");
        return;
      }

      setTotalCount(validRows.length);

      // 2. Check for conflicts
      if (!forceOverwrite) {
        const uniqueDates = Array.from(new Set(validRows.map(r => (r as any)._mapped.Date)));
        let hasConflict = false;
        try {
          for (const date of uniqueDates) {
            const docRef = doc(db, 'users', user.uid, 'sleep_logs', date as string);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const existingData = docSnap.data() as DailyLog;
              const hasEvents = existingData.sleepEvents && existingData.sleepEvents.length > 0;
              const hasTimeline = existingData.timeline && !existingData.timeline.every(s => s === 'awake-out');
              if (hasEvents || hasTimeline) {
                hasConflict = true;
                break;
              }
            }
          }
        } catch (offlineError) {
          console.warn("Offline or network error during conflict check, proceeding with import:", offlineError);
          hasConflict = false;
        }

        if (hasConflict) {
          setPendingData(data);
          setPendingRawContent(rawContent || null);
          setShowConflictModal(true);
          return;
        }
      }

      // 3. Translation Engine
      const rowsBySleepDay: Record<string, any[]> = {};
      validRows.forEach(rawRow => {
        const row = (rawRow as any)._mapped;
        const sleepDay = getSleepDay(row.Date);
        if (!rowsBySleepDay[sleepDay]) rowsBySleepDay[sleepDay] = [];
        rowsBySleepDay[sleepDay].push(rawRow);
      });

      const sleepDays = Object.keys(rowsBySleepDay);
      for (const sleepDay of sleepDays) {
        const dayRows = rowsBySleepDay[sleepDay];
        const metricsSetForDate = new Set<string>();
        
        if (!logsToSave[sleepDay]) {
          logsToSave[sleepDay] = defaultLog(sleepDay);
        }
        const log = logsToSave[sleepDay];

        // 1. Sort rows chronologically within the day
        dayRows.sort((a, b) => {
          const startA = (a as any)._mapped.Start_Time;
          const startB = (b as any)._mapped.Start_Time;
          return timeToIndex(startA) - timeToIndex(startB);
        });

        // 2. Collect events for the day (No Sandwich Logic)
        const eventsForDay: SleepEvent[] = [];
        dayRows.forEach((rawRow, rowIndex) => {
          const row = (rawRow as any)._mapped;
          const rawStatus = (row.Status_Code || row.status_code || row.Status || '')
            .toString().trim().toUpperCase();

          const type: SleepState = rawStatus.includes('SLEEP') && !rawStatus.includes('AWAKE') ? 'sleep' : 'awake-in';
          
          if (row.Start_Time && row.End_Time) {
            eventsForDay.push({
              id: `import-${sleepDay}-${rowIndex}-${type}`,
              type,
              start: row.Start_Time,
              end: row.End_Time
            });
          }
        });

        // 3. Generate Ledger (Priority: Sleep > Awake-In)
        const mergedEvents = generateSleepEventsLedger(eventsForDay, sleepDay);
        log.sleepEvents = mergedEvents;

        // 4. Map Daily Factors from the PRIMARY row of the day
        const primaryRow = dayRows.find(r => {
          const status = (r._mapped.Status_Code || '').toString().toUpperCase();
          return status === 'SLEEP';
        })?._mapped || dayRows[0]._mapped;
        
        const unmapped = (dayRows[0] as any)._unmapped;

        log.sleep_quality = parseNum(primaryRow.SQ) ?? 0;
        log.morning_alertness = parseNum(primaryRow.R) ?? 0;
        log.daytime_energy = parseNum(primaryRow.L) ?? 0;
        
        if (parseNum(primaryRow.SQ) !== null || parseNum(primaryRow.R) !== null || parseNum(primaryRow.L) !== null) {
          metricsCaptured.add(sleepDay);
        }
        
        let remarks = primaryRow.Remarks || '';
        if (unmapped.length > 0) {
          remarks += (remarks ? ' ' : '') + unmapped.map((u: string) => `[Unmapped: ${u}]`).join(' ');
        }
        log.daily_remarks = remarks;

        log.factors.caffeine.consumed = parseBool(primaryRow.Caffeine_Y);
        log.factors.caffeine.amount = parseNum(primaryRow.Caffeine_Cups);
        log.factors.caffeine.lastIntake = primaryRow.Caffeine_LastIntake ? normalizeTime(primaryRow.Caffeine_LastIntake) : null;
        
        log.factors.alcohol.consumed = parseBool(primaryRow.Alcohol_Y);
        log.factors.alcohol.drinks = parseNum(primaryRow.Alcohol_Drinks);
        log.factors.alcohol.lastIntake = primaryRow.Alcohol_LastIntake ? normalizeTime(primaryRow.Alcohol_LastIntake) : null;

        log.factors.medication.taken = parseBool(primaryRow.Medication_Y);
        log.factors.medication.type = primaryRow.Medication_Type ? primaryRow.Medication_Type.toString() : null;
        log.factors.medication.time = primaryRow.Medication_Time ? normalizeTime(primaryRow.Medication_Time) : null;

        log.factors.exercise.completed = parseBool(primaryRow.Exercise_Y);
        log.factors.exercise.type = primaryRow.Exercise_Type ? primaryRow.Exercise_Type.toString() : null;
        log.factors.exercise.time = primaryRow.Exercise_Time ? normalizeTime(primaryRow.Exercise_Time) : null;

        log.factors.screensInBed = parseBool(primaryRow.Screens_Y);
        log.factors.stressLevel = parseNum(primaryRow.Stress);
        log.factors.lastMealTime = primaryRow.LastMeal ? normalizeTime(primaryRow.LastMeal) : null;
        log.factors.naturalWake = parseBool(primaryRow.NaturalWake);
        log.factors.moodScore = parseNum(primaryRow.MoodScore);

        if (primaryRow.Sleep_Gadgets) {
          log.factors.sleepGadgets = primaryRow.Sleep_Gadgets.toString().split(',').map((g: string) => ({
            type: g.trim(),
            durationMinutes: null,
            timeOfUse: null
          }));
        }

        // 5. Efficiency Calculation
        const eventDurationMinutes = (e: any) => {
          const startMins = getMinutesFrom2000(e.start);
          const endMins = getMinutesFrom2000(e.end);
          return endMins < startMins ? (1440 - startMins + endMins) : (endMins - startMins);
        };

        const sleepEvents = mergedEvents.filter(e => e.type === 'sleep');
        const awakeInEvents = mergedEvents.filter(e => e.type === 'awake-in');
        const totalSleepMins = sleepEvents.reduce((acc, e) => acc + eventDurationMinutes(e), 0);
        const totalInBedMins = [...sleepEvents, ...awakeInEvents].reduce((acc, e) => acc + eventDurationMinutes(e), 0);
        const efficiency = totalInBedMins > 0 ? Math.round((totalSleepMins / totalInBedMins) * 100) : 0;
        
        log.summaryMetrics = {
          sleep_quality: log.sleep_quality,
          morning_alertness: log.morning_alertness,
          daytime_energy: log.daytime_energy,
          importedDuration: totalSleepMins,
          importedInBed: totalInBedMins,
          sleep_efficiency: efficiency
        };

        log.source = 'import';
        log.visualTimeline = getGridFromEvents(log.sleepEvents);

        cleanedCount += dayRows.length;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const logEntries = Object.entries(logsToSave);
      const chunkSize = 10;
      
      for (let i = 0; i < logEntries.length; i += chunkSize) {
        const chunk = logEntries.slice(i, i + chunkSize);
        const chunkLabel = `Chunk ${Math.floor(i / chunkSize) + 1} (${chunk[0][0]} to ${chunk[chunk.length - 1][0]})`;
        
        let retryCount = 0;
        const maxRetries = 2;
        let success = false;

        while (retryCount <= maxRetries && !success) {
          try {
            await runTransaction(db, async (transaction) => {
              for (const [date, log] of chunk) {
                const logRef = doc(db, 'users', user.uid, 'sleep_logs', date);
                
                const updateData: any = {
                  ...log,
                  updatedAt: serverTimestamp(),
                  timeline: deleteField()
                };

                transaction.set(logRef, updateData, { merge: true });

                const metricsRef = doc(db, 'users', user.uid, 'daily_metrics', date);
                transaction.set(metricsRef, {
                  date,
                  sleep_quality: log.sleep_quality,
                  morning_alertness: log.morning_alertness,
                  daytime_energy: log.daytime_energy,
                  daily_remarks: log.daily_remarks,
                  source: 'import',
                  updatedAt: serverTimestamp(),
                }, { merge: true });
              }
            });
            success = true;
          } catch (txError: any) {
            console.error(`Transaction failed for ${chunkLabel} (Attempt ${retryCount + 1}):`, txError);
            retryCount++;
            if (retryCount > maxRetries) {
              throw new Error(`Failed to save ${chunkLabel} after ${maxRetries + 1} attempts: ${txError.message}`);
            }
            // Exponential backoff
            await new Promise(r => setTimeout(r, 1000 * retryCount));
          }
        }
        
        setProcessedCount(Math.min(i + chunkSize, logEntries.length));
      }

      setCleaningReport({ 
        skipped: skippedRows.length, 
        cleaned: cleanedCount,
        metrics: Array.from(metricsCaptured)
      });
      setErrorMessage('');
      setUploadStatus('success');
      
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onImportComplete();
      if (onRefresh) onRefresh();

    } catch (error: any) {
      console.error("Import failed:", error);
      setUploadStatus('error');
      setErrorMessage(error.message || "An unexpected error occurred.");
    } finally {
      setIsUploading(false);
      if (setIsImporting) setIsImporting(false);
    }
  };

  const handlePasteImport = async () => {
    if (!pasteContent.trim()) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      // Use PapaParse for robust parsing of pasted content (handles quotes, tabs, etc.)
      const results = Papa.parse(pasteContent.trim(), {
        header: false,
        skipEmptyLines: true,
      });

      const rows = results.data as string[][];
      if (rows.length === 0) {
        throw new Error("No valid data found in paste content.");
      }

      // Heuristic: If the first row looks like headers, use them
      const firstRow = rows[0];
      const hasHeaders = firstRow.some(col => fuzzyMapHeader(col) !== null);
      
      let parsedData: any[] = [];
      if (hasHeaders) {
        const headers = firstRow.map(h => h.trim());
        parsedData = rows.slice(1).map(row => {
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = row[i] || '';
          });
          return obj;
        });
      } else {
        parsedData = rows.map(row => {
          return {
            Date: row[0] || '',
            Bedtime: row[1] || '',
            Waketime: row[2] || '',
            Status_Code: row[3] || '',
            SQ: row[4] || '',
            Remarks: row[5] || ''
          };
        });
      }

      await processImportedData(parsedData, false, pasteContent);
      setPasteContent('');
      setIsPasteOpen(false);
    } catch (error: any) {
      console.error("Paste Import failed:", error);
      setUploadStatus('error');
      setErrorMessage(error.message || "Failed to process pasted data. Ensure columns match the template.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }

    if (!validateFile(file)) {
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setUploadStatus('idle');
    setErrorMessage('');
    setPreviewData(null); // Reset preview

    // Generate preview for first 3 rows
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = utils.sheet_to_json(worksheet, { header: 1 }).slice(0, 4); // Header + 3 rows
        setPreviewData(json as any[]);
      } catch (err) {
        console.warn("Failed to generate preview:", err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadStatus('error');
      setErrorMessage("Please select a file first.");
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      const fileName = selectedFile.name.toLowerCase();
      
      if (fileName.endsWith('.txt')) {
        const content = await selectedFile.text();
        await saveUnstructuredData(content, selectedFile.name);
      } else if (fileName.endsWith('.csv')) {
        const content = await selectedFile.text();
        const results = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
          Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: resolve,
            error: reject
          });
        });
        await processImportedData(results.data, false, content);
      } else {
        const fileData: any[] = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = read(buffer, { type: 'array', cellDates: false });
              
              // Target "DATA" sheet if it exists, otherwise use the first sheet
              const sheetName = workbook.SheetNames.find(n => n.toUpperCase() === 'DATA') || workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              
              const json = utils.sheet_to_json(worksheet, { defval: "" });
              resolve(json as any[]);
            } catch (err) {
              reject(new Error("Failed to parse Excel file. Ensure it's a valid format."));
            }
          };
          reader.onerror = (err) => {
            console.error("FileReader Error:", err);
            reject(new Error("Failed to read file."));
          };
          reader.readAsArrayBuffer(selectedFile);
        });

        await processImportedData(fileData);
      }
    } catch (error: any) {
      console.error("Upload Submit Error:", error);
      setUploadStatus('error');
      setErrorMessage(error.message || "An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: DATA
    const dataSheet = workbook.addWorksheet('DATA');
    const headers = TEMPLATE_HEADERS;
    
    // Row 1 — header row: background #2D2B55, white bold Arial text, centered.
    const headerRow = dataSheet.addRow(headers);
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

    // Row 2 — rule row: grey background #E8E8E8, italic grey text showing format hints
    const hints = [
      'YYYY-MM-DD', 'HH:mm', 'HH:mm', 'SLEEP/AWAKE-IN', '0-10', '0-10', '0-10', 'Text'
    ];
    const ruleRow = dataSheet.addRow(hints);
    ruleRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8E8E8' }
      };
      cell.font = {
        italic: true,
        color: { argb: 'FF808080' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Rows 3-5 — three sample rows
    const sampleRows = [
      ['2026-03-20', '23:00', '07:30', 'SLEEP', 8, 7, 7, 'Slept well'],
      ['2026-03-20', '07:30', '08:00', 'AWAKE-IN', '', '', '', ''],
      ['2026-03-21', '23:30', '07:00', 'SLEEP', 6, 5, 6, 'Stressed day']
    ];

    sampleRows.forEach((rowData) => {
      const row = dataSheet.addRow(rowData);
      const isSleep = rowData[3] === 'SLEEP';
      const fillColor = isSleep ? 'FFE8E6FF' : 'FFFFF8E1';
      row.eachCell((cell, colNumber) => {
        if (colNumber <= 4) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: fillColor }
          };
        }
      });
    });

    // Freeze panes at row 3
    dataSheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 2, topLeftCell: 'A3' }
    ];

    // Set column widths
    dataSheet.columns = TEMPLATE_HEADERS.map((h, i) => {
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

    // Download logic
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sia_sleep_log_template.xlsx';
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-6 flex items-center justify-between hover:bg-zinc-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Upload size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              📂 Import External Data (CSV, Sleep Lab, Text)
            </h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">
              Upload your sleep lab results or wearable data to enhance SIA's intelligence.
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isCollapsed ? 0 : 180 }}
          transition={{ duration: 0.3 }}
          className="text-zinc-500"
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>

      <AnimatePresence>
        {(!isCollapsed || isUploading) && (
          <motion.div
            key="importer-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="p-6 pt-0 space-y-6 border-t border-zinc-800/50 mt-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
                <div className="space-y-1 text-left">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Importer Tools
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">CSV or Excel • Max 5MB</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => setIsPasteOpen(!isPasteOpen)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                      isPasteOpen 
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' 
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <FileText size={14} />
                    Paste from Spreadsheet
                  </button>
                  <button 
                    onClick={downloadTemplate}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-all"
                  >
                    <Download size={14} />
                    Template
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isPasteOpen && (
                  <motion.div
                    key="paste-area"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4"
                  >
                    <textarea
                      value={pasteContent}
                      onChange={(e) => setPasteContent(e.target.value)}
                      placeholder="Paste rows from Excel here (e.g., 2026-03-20	23:15	07:30	SLEEP	8	7	7	Slept well.)"
                      className="w-full h-48 bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-blue-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                    {pasteContent.trim() && (
                      <button
                        onClick={handlePasteImport}
                        disabled={isUploading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all"
                      >
                        {isUploading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            <span>Processing {processedCount}/{totalCount}...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Send size={14} />
                            <span>Process Pasted Data</span>
                          </div>
                        )}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {selectedFile && uploadStatus === 'idle' && previewData && (
                  <motion.div
                    key="file-preview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">File Preview (First 3 Rows)</h4>
                      <button 
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewData(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-widest"
                      >
                        Remove File
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-700">
                            {previewData[0]?.map((cell: any, i: number) => (
                              <th key={i} className="p-2 text-zinc-500 font-bold uppercase">{cell}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.slice(1).map((row: any, i: number) => (
                            <tr key={i} className="border-b border-zinc-800/50">
                              {row.map((cell: any, j: number) => (
                                <td key={j} className="p-2 text-zinc-300">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleUploadSubmit} className="relative space-y-4">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xls,.xlsx"
                  className="hidden"
                />
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
                    isUploading 
                      ? 'border-zinc-800 bg-zinc-900/30 cursor-not-allowed' 
                      : selectedFile 
                        ? 'border-indigo-500/50 bg-indigo-500/5 cursor-pointer'
                        : 'border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={32} className="text-indigo-500 animate-spin" />
                      <div className="text-center">
                        <p className="text-sm text-zinc-300 font-medium">Processing Data...</p>
                        <p className="text-xs text-zinc-500">
                          Row {processedCount} of {totalCount}
                        </p>
                      </div>
                    </>
                  ) : selectedFile ? (
                    <>
                      <CheckCircle2 size={32} className="text-indigo-400" />
                      <div className="text-center">
                        <p className="text-sm text-zinc-300 font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-zinc-500">{(selectedFile.size / 1024).toFixed(1)} KB • Ready to import</p>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-[10px] text-zinc-500 hover:text-red-400 uppercase font-bold tracking-widest"
                      >
                        Remove File
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <FileText size={32} className="text-zinc-600" />
                        <FileSpreadsheet size={32} className="text-zinc-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-zinc-300 font-medium">Click to select file</p>
                        <p className="text-xs text-zinc-500">Drop your CSV or Excel file here</p>
                      </div>
                    </>
                  )}
                </div>

                {selectedFile && !isUploading && (
                  <button
                    type="submit"
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 transition-all"
                  >
                    <Send size={16} />
                    Start Import Process
                  </button>
                )}

                <AnimatePresence>
                  {showLegacyToast && (
                  <motion.div 
                    key="legacy-toast"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3"
                  >
                    <AlertCircle className="text-amber-400 mt-0.5 flex-shrink-0" size={18} />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-amber-300 uppercase tracking-widest">Data Integrity Check</p>
                      <p className="text-[11px] text-amber-200 leading-relaxed">
                        Legacy format detected. SIA is auto-converting your data to the new High-Precision format.
                      </p>
                    </div>
                  </motion.div>
                )}

                {uploadStatus === 'unstructured' && (
                  <motion.div 
                    key="unstructured-toast"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-start gap-3"
                  >
                    <FileText className="text-indigo-400 mt-0.5 flex-shrink-0" size={18} />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Raw Insight Indexed</p>
                      <p className="text-[11px] text-indigo-200 leading-relaxed">{errorMessage}</p>
                    </div>
                  </motion.div>
                )}

                {uploadStatus === 'success' && (
                    <motion.div 
                      key="success-toast"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2 text-emerald-400 p-4 text-center"
                    >
                      <CheckCircle2 size={32} />
                      <p className="text-sm font-bold uppercase tracking-widest">Import Successful</p>
                      {cleaningReport && (
                        <div className="space-y-1 mt-2">
                          <p className="text-[10px] text-zinc-400">
                            Successfully imported <span className="text-emerald-400">{cleaningReport.cleaned}</span> nights.
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Metrics captured: {cleaningReport.metrics.join(', ') || 'None'}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Remarks updated.
                          </p>
                          {cleaningReport.skipped > 0 && (
                            <p className="text-[9px] text-amber-500/70 italic">
                              Skipped {cleaningReport.skipped} invalid rows.
                            </p>
                          )}
                        </div>
                      )}
                      <button 
                        type="button"
                        onClick={() => setUploadStatus('idle')}
                        className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 underline"
                      >
                        Dismiss
                      </button>
                    </motion.div>
                  )}

                  {showConflictModal && (
                    <motion.div 
                      key="conflict-modal"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-zinc-900/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center z-50"
                    >
                      <AlertCircle size={32} className="text-amber-500 mb-2" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Conflict Detected</h4>
                      <p className="text-xs text-zinc-400 mb-6">
                        You have manual logs for some of these dates. How would you like to proceed?
                      </p>
                      <div className="flex flex-col w-full gap-2">
                        <button 
                          onClick={() => {
                            setShowConflictModal(false);
                            if (pendingData) processImportedData(pendingData, true, pendingRawContent || undefined);
                          }}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Overwrite with Import
                        </button>
                        <button 
                          onClick={() => {
                            setShowConflictModal(false);
                            setPendingData(null);
                            setPendingRawContent(null);
                            setIsUploading(false);
                          }}
                          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Keep Manual Logs
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {uploadStatus === 'error' && (
                    <motion.div 
                      key="error-toast"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2 text-red-400 p-4 text-center"
                    >
                      <AlertCircle size={32} />
                      <p className="text-sm font-bold uppercase tracking-widest">Import Failed</p>
                      <p className="text-[10px] text-zinc-500">{errorMessage}</p>
                      <button 
                        type="button"
                        onClick={() => setUploadStatus('idle')}
                        className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 underline"
                      >
                        Try Again
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              <div className="bg-zinc-900/80 rounded-2xl p-4 border border-zinc-800">
                <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Import Guidelines</h4>
                <ul className="text-[10px] text-zinc-400 space-y-1 list-disc list-inside">
                  <li>Date format must be <code className="text-indigo-400">YYYY-MM-DD</code></li>
                  <li>Each row = one sleep event. Use multiple rows per date for nights with wake-ups (set Status_Code to AWAKE-IN).</li>
                  <li>Date = the night it starts (20:00 cycle). Bedtime 23:00, wake 07:00 → use that evening's date.</li>
                  <li>Metrics (Quality, Morning Alertness, Daytime Energy) should be <code className="text-indigo-400">0-10</code></li>
                  <li>Existing logs for the same date will be overwritten</li>
                  <li>Empty rows and whitespace are automatically handled</li>
                  <li>Unstructured data (e.g., raw text, journal entries) will be indexed for SIA's AI Analysis.</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
