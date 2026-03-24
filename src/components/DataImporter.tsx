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
import { DailyLog, SleepState } from '../types';
import { TOTAL_SLOTS } from '../constants';
import { saveLog } from '../services/sleepService';
import { snapTo15Min, timeToIndex, convertGridToEvents, getMinutesFrom2000 } from '../utils/sleepUtils';

import { exportToExcel } from '../utils/DataExporter';

interface DataImporterProps {
  user: User;
  onImportComplete: () => void;
  onRefresh?: () => void;
  isImporting?: boolean;
  setIsImporting?: (val: boolean) => void;
  logs?: Record<string, DailyLog>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const TEMPLATE_HEADERS = ['Date', 'Bedtime', 'Waketime', 'Status_Code', 'SQ', 'Remarks'];

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
          model: "gemini-3-flash-preview",
          config: {
            systemInstruction: "Extract sleep insights from this text. Return only valid JSON: { summary, estimatedDateRange, extractedInsights (string array), rawDataType }."
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
    if (h === 'r' || h.includes('rest') || h.includes('awakening')) return 'R';
    if (h === 'l' || h.includes('energy') || h.includes('level')) return 'L';
    if (h.includes('remark') || h.includes('note') || h.includes('comment')) return 'Remarks';
    if (h === 'caffeine_y' || h === 'caffeine') return 'Caffeine_Y';
    if (h === 'caffeine_cups' || h === 'cups') return 'Caffeine_Cups';
    if (h === 'caffeine_lastintake' || h === 'caffeine_time') return 'Caffeine_LastIntake';
    if (h === 'alcohol_y' || h === 'alcohol') return 'Alcohol_Y';
    if (h === 'alcohol_drinks' || h === 'drinks') return 'Alcohol_Drinks';
    if (h === 'alcohol_lastintake' || h === 'alcohol_time') return 'Alcohol_LastIntake';
    if (h === 'medication_y' || h === 'medication') return 'Medication_Y';
    if (h === 'medication_type') return 'Medication_Type';
    if (h === 'medication_time') return 'Medication_Time';
    if (h === 'exercise_y' || h === 'exercise') return 'Exercise_Y';
    if (h === 'exercise_type') return 'Exercise_Type';
    if (h === 'exercise_time') return 'Exercise_Time';
    if (h === 'screens_y' || h === 'screens') return 'Screens_Y';
    if (h === 'stress_1to5' || h === 'stress') return 'Stress';
    if (h === 'lastmeal_time' || h === 'lastmeal' || h === 'last_meal') return 'LastMeal';
    if (h === 'naturalwake_y' || h === 'naturalwake' || h === 'natural_wake') return 'NaturalWake';
    if (h === 'morningmood_1to5' || h === 'morningmood' || h === 'morning_mood') return 'MoodScore';
    if (h === 'sleep_gadgets' || h === 'gadgets' || h.includes('gadget')) return 'Sleep_Gadgets';
    return null;
  };

  const defaultLog = (date: string): DailyLog => ({
    date,
    type: 'log',
    isIgnored: false,
    sleep_quality: 5,
    morning_alertness: 5,
    daytime_energy: 5,
    sleepEvents: [],
    daily_remarks: '',
    source: 'import',
    factors: {
      caffeine: { consumed: false, amount: 0, lastIntake: '12:00' },
      alcohol: { consumed: false, drinks: 0, lastIntake: '18:00' },
      medication: { taken: false, type: '', time: '22:00' },
      exercise: { completed: false, type: '', time: '17:00' },
      screensInBed: false,
      stressLevel: 3,
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

  const getSleepDay = (dateStr: string, startTime: string): string => {
    try {
      // 1. Normalize the date string to a Date object
      let date: Date;
      if (dateStr.includes('/') || dateStr.includes('.')) {
        const formats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'dd.MM.yyyy', 'yyyy.MM.dd', 'yyyy/MM/dd'];
        let parsed = null;
        for (const f of formats) {
          const p = parse(dateStr, f, new Date());
          if (isValid(p)) {
            parsed = p;
            break;
          }
        }
        date = parsed || new Date(dateStr);
      } else {
        date = parseISO(dateStr);
      }

      if (!isValid(date)) {
        date = new Date(dateStr);
      }

      if (!isValid(date)) return dateStr;

      // 2. Apply the 20:00 Anchor logic
      if (!startTime || !startTime.includes(':')) return format(date, 'yyyy-MM-dd');

      const [hours] = startTime.split(':').map(Number);
      if (!isNaN(hours) && hours < 20) {
        // If bedtime is before 20:00 (e.g., 07:00 AM), it belongs to the PREVIOUS day's sleep session
        // Wait, if I wake up at 07:00 AM on Mar 22, the "Sleep Day" is Mar 21.
        // But the CSV row usually says Date: Mar 21, Bedtime: 23:30, Waketime: 07:00.
        // In this case, getSleepDay('2026-03-21', '23:30') should return '2026-03-21'.
        // If the row says Date: Mar 22, Bedtime: 01:00, Waketime: 07:00.
        // Then getSleepDay('2026-03-22', '01:00') should return '2026-03-21'.
        return format(subDays(date, 1), 'yyyy-MM-dd');
      }
      
      return format(date, 'yyyy-MM-dd');
    } catch (e) {
      console.error("Error in getSleepDay:", e);
      return dateStr;
    }
  };

  const generateSleepEventsLedger = (events: { start: string, end: string, status: string }[]): (number | null)[] => {
    // The 96-Slot Ledger: Initialize an array of 96 nulls for each sleep day.
    // null represents "unassigned" (Start-of-Day Gap)
    const ledger = new Array(96).fill(null); 
    
    // Sort events by priority: SLEEP (1) > AWAKE-IN (2)
    // This ensures that if we paint them in order, SLEEP can overwrite AWAKE-IN
    const sortedEvents = [...events].sort((a, b) => {
      const priority = (s: string) => {
        const up = s.toUpperCase();
        if (up.includes('SLEEP') || up === '1') return 2; // Higher priority for sorting
        if (up.includes('AWAKE-IN') || up === '2') return 1;
        return 0;
      };
      return priority(a.status) - priority(b.status);
    });

    sortedEvents.forEach(event => {
      const startIdx = timeToIndex(event.start);
      const endIdx = timeToIndex(event.end);
      
      let statusCode = 0;
      const s = (event.status || '').toString().trim().toUpperCase();
      
      if (s.includes('SLEEP') || s === '1') {
        statusCode = 1; // SLEEP
      } else if (s.includes('AWAKE-IN') || s === '2') {
        statusCode = 2; // AWAKE-IN
      }

      if (statusCode === 0) return;

      const paintSlot = (idx: number, code: number) => {
        if (idx < 0 || idx >= 96) return;
        
        // Priority Logic:
        // 1. If slot is null/empty, paint it.
        // 2. If slot is AWAKE-IN (2) and we have SLEEP (1), overwrite it.
        if (ledger[idx] === null || ledger[idx] === 0) {
          ledger[idx] = code;
        } else if (ledger[idx] === 2 && code === 1) {
          ledger[idx] = 1; 
        }
      };

      if (startIdx < endIdx) {
        for (let i = startIdx; i < endIdx; i++) {
          paintSlot(i, statusCode);
        }
      } else if (startIdx > endIdx) {
        // Wrap around (20:00 anchor)
        for (let i = startIdx; i < 96; i++) {
          paintSlot(i, statusCode);
        }
        for (let i = 0; i < endIdx; i++) {
          paintSlot(i, statusCode);
        }
      }
    });
    
    return ledger;
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

  const addMinutes = (time: string, mins: number): string => {
    if (!time || !time.includes(':')) return time;
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return time;
    let totalMins = h * 60 + m + mins;
    while (totalMins < 0) totalMins += 24 * 60;
    const finalH = Math.floor(totalMins / 60) % 24;
    const finalM = totalMins % 60;
    return `${finalH.toString().padStart(2, '0')}:${finalM.toString().padStart(2, '0')}`;
  };

  const validateAndMapRow = (row: any, idx: number, skippedRows?: string[], isStrict = false) => {
    const mappedRow: any = {};
    const unmappedData: string[] = [];

    const originalKeys = Object.keys(row).map(k => k.toLowerCase().trim());
    const hasBedtimeHeaders = originalKeys.includes('bedtime') && originalKeys.includes('waketime');
    const isSleepWindow = isStrict || hasBedtimeHeaders;

    if (isStrict) {
      // Strict Template Mode: Direct mapping based on TEMPLATE_HEADERS
      mappedRow.Date = row.Date;
      mappedRow.Start_Time = row.Bedtime;
      mappedRow.End_Time = row.Waketime;
      mappedRow.Status_Code = row.Status_Code;
      mappedRow.SQ = row.SQ;
      mappedRow.Remarks = row.Remarks;
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

    // Generate events based on whether it's a "Sleep Window"
    const generatedEvents: { start: string, end: string, status: string }[] = [];
    if (isSleepWindow) {
      const sleepStart = addMinutes(start, 15);
      generatedEvents.push({ start: start, end: sleepStart, status: 'AWAKE-IN' });
      generatedEvents.push({ start: sleepStart, end: end, status: 'SLEEP' });
      generatedEvents.push({ start: end, end: addMinutes(end, 15), status: 'AWAKE-IN' });
    } else {
      const rawStatus = (mappedRow.Status_Code || 'SLEEP').toString().toUpperCase();
      generatedEvents.push({ start, end, status: rawStatus });
    }

    return {
      _mapped: mappedRow,
      _unmapped: unmappedData,
      _events: generatedEvents
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
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
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
        const sleepDay = getSleepDay(row.Date, row.Start_Time);
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

        // 2. Merge adjacent rows to prevent "ghost" buffers at fragment boundaries
        const mergedRows: any[] = [];
        if (dayRows.length > 0) {
          let current = { ...dayRows[0] };
          for (let i = 1; i < dayRows.length; i++) {
            const next = dayRows[i];
            const currentEndIdx = timeToIndex((current as any)._mapped.End_Time);
            const nextStartIdx = timeToIndex((next as any)._mapped.Start_Time);
            
            // If adjacent or overlapping, merge them
            if (nextStartIdx <= currentEndIdx) {
              const currentEndMins = getMinutesFrom2000((current as any)._mapped.End_Time);
              const nextEndMins = getMinutesFrom2000((next as any)._mapped.End_Time);
              // In our 20:00-20:00 cycle, we need to be careful with comparison
              // But within a single sleep day, getMinutesFrom2000 is linear 0-1440
              if (nextEndMins > currentEndMins || (currentEndMins > 1200 && nextEndMins < 1200)) {
                (current as any)._mapped.End_Time = (next as any)._mapped.End_Time;
              }
            } else {
              mergedRows.push(current);
              current = { ...next };
            }
          }
          mergedRows.push(current);
        }

        // 3. Generate events for ledger generation
        const eventsForLedger = mergedRows.flatMap(rawRow => {
          const row = (rawRow as any)._mapped;
          
          // Re-generate events for merged windows to ensure buffers are only at the outer boundaries
          const { _events: events } = validateAndMapRow(row, 0, [], isStrictTemplate) || { _events: [] };
          
          if (events && events.length > 0) {
            return events;
          }

          const rawStatus = (row.Status_Code || row.status_code || row.Status || '').toString().trim();
          return [{
            start: row.Start_Time,
            end: row.End_Time,
            status: rawStatus
          }];
        });

        const ledger = generateSleepEventsLedger(eventsForLedger);
        
        // Efficiency Calculation
        const totalSleepSlots = ledger.filter(s => s === 1).length;
        const totalInBedSlots = ledger.filter(s => s === 1 || s === 2).length;
        const efficiency = totalInBedSlots > 0 ? (totalSleepSlots / totalInBedSlots) * 100 : 0;
        
        log.summaryMetrics = {
          sleep_quality: log.sleep_quality,
          morning_alertness: log.morning_alertness,
          daytime_energy: log.daytime_energy,
          importedDuration: totalSleepSlots * 15,
          importedInBed: totalInBedSlots * 15,
          sleep_efficiency: efficiency
        };

        // Convert ledger back to SleepEvents
        const grid: SleepState[] = ledger.map(code => {
          if (code === 1) return 'sleep';
          if (code === 2) return 'awake-in';
          return 'awake-out';
        });
        
        log.sleepEvents = convertGridToEvents(grid);

        // Process metadata
        dayRows.forEach(rawRow => {
          const row = (rawRow as any)._mapped;
          const unmapped = (rawRow as any)._unmapped;

          const sqVal = parseInt(row.SQ);
          if (!isNaN(sqVal) && !metricsSetForDate.has('SQ')) {
            log.sleep_quality = sqVal;
            metricsSetForDate.add('SQ');
            metricsCaptured.add('SQ');
          }

          const rVal = parseInt(row.R);
          if (!isNaN(rVal) && !metricsSetForDate.has('R')) {
            log.morning_alertness = rVal;
            metricsSetForDate.add('R');
            metricsCaptured.add('R');
          }

          const lVal = parseInt(row.L);
          if (!isNaN(lVal) && !metricsSetForDate.has('L')) {
            log.daytime_energy = lVal;
            metricsSetForDate.add('L');
            metricsCaptured.add('L');
          }
          
          let remarks = row.Remarks || '';
          if (unmapped.length > 0) {
            remarks += (remarks ? ' ' : '') + unmapped.map((u: string) => `[Unmapped: ${u}]`).join(' ');
          }
          if (remarks) {
            log.daily_remarks = log.daily_remarks
              ? log.daily_remarks + ' ' + remarks
              : remarks;
          }

          if (row.Caffeine_Y) log.factors.caffeine.consumed = row.Caffeine_Y?.toString().toLowerCase() === 'yes';
          if (row.Caffeine_Cups) log.factors.caffeine.amount = parseInt(row.Caffeine_Cups) || 0;
          if (row.Caffeine_LastIntake) log.factors.caffeine.lastIntake = normalizeTime(row.Caffeine_LastIntake);
          if (row.Alcohol_Y) log.factors.alcohol.consumed = row.Alcohol_Y?.toString().toLowerCase() === 'yes';
          if (row.Alcohol_Drinks) log.factors.alcohol.drinks = parseInt(row.Alcohol_Drinks) || 0;
          if (row.Alcohol_LastIntake) log.factors.alcohol.lastIntake = normalizeTime(row.Alcohol_LastIntake);
          if (row.Medication_Y) log.factors.medication.taken = row.Medication_Y?.toString().toLowerCase() === 'yes';
          if (row.Medication_Type) log.factors.medication.type = row.Medication_Type.toString();
          if (row.Medication_Time) log.factors.medication.time = normalizeTime(row.Medication_Time);
          if (row.Exercise_Y) log.factors.exercise.completed = row.Exercise_Y?.toString().toLowerCase() === 'yes';
          if (row.Exercise_Type) log.factors.exercise.type = row.Exercise_Type.toString();
          if (row.Exercise_Time) log.factors.exercise.time = normalizeTime(row.Exercise_Time);
          if (row.Screens_Y) log.factors.screensInBed = row.Screens_Y?.toString().toLowerCase() === 'yes';
          if (row.Stress) log.factors.stressLevel = parseInt(row.Stress) || 3;
          if (row.LastMeal) log.factors.lastMealTime = normalizeTime(row.LastMeal);
          if (row.NaturalWake) log.factors.naturalWake = row.NaturalWake?.toString().toLowerCase() === 'yes';
          if (row.MoodScore) log.factors.moodScore = parseInt(row.MoodScore) || 3;
          
          if (row.Sleep_Gadgets && typeof row.Sleep_Gadgets === 'string' && row.Sleep_Gadgets.trim()) {
            const gadgetStrings = row.Sleep_Gadgets.split(',').map((s: string) => s.trim()).filter(Boolean);
            log.factors.sleepGadgets = gadgetStrings.map((g: string) => {
              const timeMatch = g.match(/@(\w+)$/);
              const durMatch = g.match(/\((\d+)min\)/);
              const type = g.replace(/\(\d+min\)/, '').replace(/@\w+$/, '').trim();
              return {
                type: type as any,
                ...(durMatch ? { durationMinutes: parseInt(durMatch[1]) } : {}),
                ...(timeMatch ? { timeOfUse: timeMatch[1] as any } : {})
              };
            });
          }
        });

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
      setUploadStatus('success');
      setErrorMessage(skippedRows.length > 0 ? `Data Cleaned: Skipped ${skippedRows.length} invalid rows.` : '');
      
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
              
              // Always use the first sheet for consistency
              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
              
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
    
    // Data Sheet
    const dataSheet = workbook.addWorksheet('Data');
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
      'YYYY-MM-DD', 'HH:mm', 'HH:mm', 'SLEEP/AWAKE-IN', '0-10', 'Text'
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
      ['2026-03-20', '23:00', '07:30', 'SLEEP', 8, 'Slept well'],
      ['2026-03-20', '07:30', '08:00', 'AWAKE-IN', '', ''],
      ['2026-03-21', '23:30', '07:00', 'SLEEP', 6, 'Stressed day']
    ];

    sampleRows.forEach((rowData) => {
      const row = dataSheet.addRow(rowData);
      const isSleep = rowData[3] === 'SLEEP';
      const fillColor = isSleep ? 'FFE8E6FF' : 'FFFFF8E1';
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
      });
    });

    // Freeze panes at row 3
    dataSheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 2, topLeftCell: 'A3' }
    ];

    // Set column widths
    dataSheet.columns = [
      { width: 13 }, // Date
      { width: 9 },  // Bedtime
      { width: 9 },  // Waketime
      { width: 13 }, // Status_Code
      { width: 5 },  // SQ
      { width: 22 }  // Remarks
    ];

    // Instructions Sheet
    const instSheet = workbook.addWorksheet('Instructions');
    const instHeaders = ['COLUMN', 'FORMAT & NOTES'];
    const instHeaderRow = instSheet.addRow(instHeaders);
    instHeaderRow.eachCell((cell) => {
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

    const instructionRows = [
      ['Date', 'The date the sleep session started (YYYY-MM-DD).'],
      ['Bedtime', 'The time you went to bed (HH:mm).'],
      ['Waketime', 'The time you woke up (HH:mm).'],
      ['Status_Code', 'SLEEP for main sleep, AWAKE-IN for wakeups mid-sleep.'],
      ['SQ', 'Sleep Quality (0-10).'],
      ['Remarks', 'Any notes about the night.'],
      ['DISCLAIMER', 'SIA tracks patterns to help you understand your sleep habits. This is not medical advice. Share this data with your doctor for clinical interpretation.']
    ];

    instructionRows.forEach(row => instSheet.addRow(row));
    instSheet.getColumn(1).width = 25;
    instSheet.getColumn(2).width = 80;

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
                  <button 
                    onClick={() => exportToExcel(Object.values(logs))}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest text-indigo-400 transition-all"
                  >
                    <FileSpreadsheet size={14} />
                    Export Data
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
