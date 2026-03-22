import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { read, utils, writeFile } from 'xlsx';
import ExcelJS from 'exceljs';
import { parse, format, isValid } from 'date-fns';
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
  collection 
} from '../lib/firebase';
import { DailyLog, SleepState } from '../types';
import { TOTAL_SLOTS } from '../constants';
import { saveLog } from '../services/sleepService';
import { snapTo15Min, timeToIndex } from '../utils/sleepUtils';

interface DataImporterProps {
  user: User;
  onImportComplete: () => void;
  onRefresh?: () => void;
  isImporting?: boolean;
  setIsImporting?: (val: boolean) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function DataImporter({ user, onImportComplete, onRefresh, isImporting, setIsImporting }: DataImporterProps) {
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
  const [cleaningReport, setCleaningReport] = useState<{ skipped: number; cleaned: number; metrics: string[] } | null>(null);
  const [showLegacyToast, setShowLegacyToast] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveUnstructuredData = async (content: string, fileName: string) => {
    if (!db) { setUploadStatus('error'); setErrorMessage('Database not available — check Firebase configuration'); return; }
    setUploadStatus('idle'); // Show processing state
    
    // Step 1: Try AI extraction — failure must never block Step 2
    let extracted = { summary: null, estimatedDateRange: null, extractedInsights: [], rawDataType: 'unknown' };
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) { console.error('GEMINI_API_KEY not set — AI features disabled'); return; }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash-latest",
        config: {
          systemInstruction: "Extract sleep insights from this text. Return only valid JSON: { summary, estimatedDateRange, extractedInsights (string array), rawDataType }."
        },
        contents: content.slice(0, 8000)
      });
      const clean = (response.text ?? '').replace(/```json|```/g, '').trim();
      extracted = JSON.parse(clean);
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

  const processImportedData = async (data: any[], forceOverwrite = false) => {
    if (!db) { setUploadStatus('error'); setErrorMessage('Database not available — check Firebase configuration'); return; }
    setUploadStatus('idle');
    setErrorMessage('');
    setCleaningReport(null);
    setShowLegacyToast(false);
    if (setIsImporting) setIsImporting(true);
    
    try {
      const cleanedData = cleanData(data);
      const skippedRows: string[] = [];
      let cleanedCount = 0;
      const logsToSave: Record<string, DailyLog> = {};
      const metricsCaptured = new Set<string>();
      const metricsSetForDate = new Set<string>();
      
      // 1. Validation & Sanitization with Fuzzy Matching
      const validRows = cleanedData.filter((row, idx) => {
        const mappedRow: any = {};
        const unmappedData: string[] = [];

        Object.keys(row).forEach(key => {
          const mappedKey = fuzzyMapHeader(key);
          if (mappedKey) {
            mappedRow[mappedKey] = row[key];
          } else {
            unmappedData.push(`${key}: ${row[key]}`);
          }
        });

        let date = mappedRow.Date;
        let start = mappedRow.Start_Time;
        let end = mappedRow.End_Time;
        const status = mappedRow.Status_Code;

        const normalizeTime = (t: string) => t?.toString().trim() === '24:00' ? '00:00' : t?.toString().trim();
        start = normalizeTime(start);
        end = normalizeTime(end);

        // Check for legacy format
        if (status && !showLegacyToast) {
          setShowLegacyToast(true);
        }

        if (!date || !start || !end) {
          skippedRows.push(`Row ${idx + 1}: Missing required fields (Date, Bedtime, Waketime)`);
          return false;
        }

        if (start === end) {
          skippedRows.push(`Row ${idx + 1}: Start time matches end time (${start})`);
          return false;
        }

        // Robust Date Parsing
        let parsedDate: Date | null = null;
        const dateStr = date?.toString().trim() || '';
        
        if (!dateStr) {
          skippedRows.push(`Row ${idx + 1}: Missing date — skipped`);
          return false;
        }
        
        // Try YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        } 
        // Try MM/DD/YYYY
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
          parsedDate = parse(dateStr, 'M/d/yyyy', new Date());
        }
        // Try DD.MM.YYYY
        else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr)) {
          parsedDate = parse(dateStr, 'd.M.yyyy', new Date());
        }
        // Fallback to native Date if XLSX already parsed it
        else if (date instanceof Date) {
          parsedDate = date;
        }

        if (!parsedDate || !isValid(parsedDate)) {
          skippedRows.push(`Row ${idx + 1}: Invalid date format (${dateStr})`);
          return false;
        }

        const formattedDate = format(parsedDate, 'yyyy-MM-dd');
        mappedRow.Date = formattedDate;

        // Attach mapped row for later processing
        (row as any)._mapped = mappedRow;
        (row as any)._unmapped = unmappedData;
        return true;
      });

      if (validRows.length === 0) {
        // Path B: Save as unstructured data if no valid rows found in CSV/XLS
        const rawContent = JSON.stringify(data.slice(0, 100)); // Sample content
        await saveUnstructuredData(rawContent, "Malformed_Import_" + format(new Date(), 'yyyyMMdd_HHmm') + ".txt");
        return;
      }

      setTotalCount(validRows.length);

      // 2. Check for conflicts if not forcing overwrite
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
          setShowConflictModal(true);
          return;
        }
      }

      // 3. Translation Engine (Timestamp to Events)
      for (const rawRow of validRows) {
        const row = (rawRow as any)._mapped;
        const unmapped = (rawRow as any)._unmapped;
        const date = row.Date;
        const start = row.Start_Time;
        const end = row.End_Time;
        const statusVal = row.Status_Code?.toString().toUpperCase();
        
        let state: SleepState = 'sleep'; // Default to sleep for new format
        if (statusVal) {
          const statusStr = statusVal.toString().toUpperCase();
          if (statusStr === '1' || statusStr.includes('SLEEP')) {
            state = 'sleep';
          } else if (statusStr === '0' || statusStr.includes('AWAKE OUT')) {
            state = 'awake-out';
          } else if (statusStr === '2' || statusStr.includes('AWAKE') || statusStr.includes('WAKE')) {
            state = 'awake-in';
          }
        }

        if (state === 'awake-out') continue; // Don't log awake-out events

        if (!logsToSave[date]) {
          logsToSave[date] = defaultLog(date);
        }
        const log = logsToSave[date];

        // Map Clinical Metrics (Rule 2: Only first valid row)
        const sqVal = parseInt(row.SQ);
        const sqKey = `${date}_SQ`;
        if (!isNaN(sqVal) && !metricsSetForDate.has(sqKey)) {
          logsToSave[date].sleep_quality = sqVal;
          metricsSetForDate.add(sqKey);
          metricsCaptured.add('SQ');
        }

        const rVal = parseInt(row.R);
        const rKey = `${date}_R`;
        if (!isNaN(rVal) && !metricsSetForDate.has(rKey)) {
          logsToSave[date].morning_alertness = rVal;
          metricsSetForDate.add(rKey);
          metricsCaptured.add('R');
        }

        const lVal = parseInt(row.L);
        const lKey = `${date}_L`;
        if (!isNaN(lVal) && !metricsSetForDate.has(lKey)) {
          logsToSave[date].daytime_energy = lVal;
          metricsSetForDate.add(lKey);
          metricsCaptured.add('L');
        }
        
        // Map Remarks (Rule 3: Merge remarks)
        let remarks = row.Remarks || '';
        if (unmapped.length > 0) {
          remarks += (remarks ? ' ' : '') + unmapped.map((u: string) => `[Unmapped: ${u}]`).join(' ');
        }
        if (remarks) {
          logsToSave[date].daily_remarks = logsToSave[date].daily_remarks
            ? logsToSave[date].daily_remarks + ' ' + remarks
            : remarks;
        }

        if (row.Caffeine_Y) log.factors.caffeine.consumed = row.Caffeine_Y?.toString().toLowerCase() === 'yes';
        if (row.Caffeine_Cups) log.factors.caffeine.amount = parseInt(row.Caffeine_Cups) || 0;
        if (row.Caffeine_LastIntake) log.factors.caffeine.lastIntake = row.Caffeine_LastIntake.toString();
        if (row.Alcohol_Y) log.factors.alcohol.consumed = row.Alcohol_Y?.toString().toLowerCase() === 'yes';
        if (row.Alcohol_Drinks) log.factors.alcohol.drinks = parseInt(row.Alcohol_Drinks) || 0;
        if (row.Alcohol_LastIntake) log.factors.alcohol.lastIntake = row.Alcohol_LastIntake.toString();
        if (row.Medication_Y) log.factors.medication.taken = row.Medication_Y?.toString().toLowerCase() === 'yes';
        if (row.Medication_Type) log.factors.medication.type = row.Medication_Type.toString();
        if (row.Medication_Time) log.factors.medication.time = row.Medication_Time.toString();
        if (row.Exercise_Y) log.factors.exercise.completed = row.Exercise_Y?.toString().toLowerCase() === 'yes';
        if (row.Exercise_Type) log.factors.exercise.type = row.Exercise_Type.toString();
        if (row.Exercise_Time) log.factors.exercise.time = row.Exercise_Time.toString();
        if (row.Screens_Y) log.factors.screensInBed = row.Screens_Y?.toString().toLowerCase() === 'yes';
        if (row.Stress) log.factors.stressLevel = parseInt(row.Stress) || 3;
        if (row.LastMeal) log.factors.lastMealTime = row.LastMeal.toString();
        if (row.NaturalWake) log.factors.naturalWake = row.NaturalWake?.toString().toLowerCase() === 'yes';
        if (row.MoodScore) log.factors.moodScore = parseInt(row.MoodScore) || 3;

        const startIndex = timeToIndex(start);
        const endIndex = timeToIndex(end);

        logsToSave[date].sleepEvents!.push({
          id: crypto.randomUUID(),
          type: state,
          start: start,
          end: end
        });
        cleanedCount++;
      }

      // Pre-flight Check: 500ms delay to let listeners settle
      await new Promise(resolve => setTimeout(resolve, 500));

      // 4. Chunked Transaction Writes (10 days per batch)
      const logEntries = Object.entries(logsToSave);
      const chunkSize = 10;
      
      for (let i = 0; i < logEntries.length; i += chunkSize) {
        const chunk = logEntries.slice(i, i + chunkSize);
        
        await runTransaction(db, async (transaction) => {
          for (const [date, log] of chunk) {
            // Write to sleep_logs
            const logRef = doc(db, 'users', user.uid, 'sleep_logs', date);
            transaction.set(logRef, {
              ...log,
              updatedAt: serverTimestamp(),
            }, { merge: true });

            // Write to daily_metrics
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
      // Sanitize input: handle different line endings and filter out empty lines
      const rows = pasteContent.trim().split(/\r?\n/).filter(line => line.trim());
      
      // Heuristic: If the first row looks like headers, use them
      const firstRow = rows[0].split(/[,\t]/);
      const hasHeaders = firstRow.some(col => fuzzyMapHeader(col) !== null);
      
      let parsedData: any[] = [];
      if (hasHeaders) {
        const headers = firstRow.map(h => h.trim());
        parsedData = rows.slice(1).map(row => {
          const cols = row.split(/[,\t]/).map(c => c.trim());
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = cols[i] || '';
          });
          return obj;
        });
      } else {
        parsedData = rows.map(row => {
          const separator = row.includes('\t') ? '\t' : ',';
          const cols = row.split(separator).map(c => c.trim());
          
          return {
            Date: cols[0] || '',
            Start_Time: cols[1] || '',
            End_Time: cols[2] || '',
            Status_Code: cols[3] || '',
            SQ: cols[4] || '',
            R: cols[5] || '',
            L: cols[6] || '',
            Remarks: cols[7] || ''
          };
        });
      }

      if (parsedData.length === 0) {
        throw new Error("No valid data found in paste content.");
      }

      await processImportedData(parsedData);
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
      let data: any[] = [];

      if (fileName.endsWith('.txt')) {
        const content = await selectedFile.text();
        await saveUnstructuredData(content, selectedFile.name);
      } else if (fileName.endsWith('.csv')) {
        data = await new Promise((resolve, reject) => {
          Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
          });
        });
        await processImportedData(data);
      } else {
        data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = read(buffer, { type: 'array', cellDates: true });
              
              // Priority: 'Sleep Logs' (export) → 'Data' (template) → first sheet (fallback)
              // Also skip any sheet named 🔒 Summary, User, Instructions, or Unstructured Notes
              const skipSheets = ['🔒 Summary', 'User', 'Instructions', 'Unstructured Notes'];
              const sheetName =
                workbook.SheetNames.includes('Sleep Logs') ? 'Sleep Logs' :
                workbook.SheetNames.includes('Data') ? 'Data' :
                workbook.SheetNames.find(name => !skipSheets.includes(name)) || workbook.SheetNames[0];
              
              const worksheet = workbook.Sheets[sheetName];
              const json = utils.sheet_to_json(worksheet, { defval: "" });
              resolve(json);
            } catch (err) { reject(err); }
          };
          reader.onerror = (err) => reject(err);
          reader.readAsArrayBuffer(selectedFile);
        });
        await processImportedData(data);
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
    const headers = [
      'Date', 'Bedtime', 'Waketime', 'Status_Code', 'SQ', 'R', 'L', 'Remarks', 
      'Caffeine_Y', 'Caffeine_Cups', 'Caffeine_LastIntake', 'Alcohol_Y', 'Alcohol_Drinks', 'Alcohol_LastIntake', 
      'Medication_Y', 'Medication_Type', 'Medication_Time', 'Exercise_Y', 'Exercise_Type', 'Exercise_Time', 
      'Screens_Y', 'Stress_1to5', 'LastMeal_Time', 'NaturalWake_Y', 'MorningMood_1to5'
    ];
    
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
      'YYYY-MM-DD', 'HH:mm', 'HH:mm', 'SLEEP/AWAKE-IN', '0-10', '0-10', '0-10', 'Text', 
      'yes/no', 'number', 'HH:mm', 'yes/no', 'number', 'HH:mm', 'yes/no', 'text', 'HH:mm', 
      'yes/no', 'text', 'HH:mm', 'yes/no', '1-5', 'HH:mm', 'yes/no', '1-5'
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
      ['2026-03-20', '23:00', '07:30', 'SLEEP', 8, 5, 7, 'Slept well', 'yes', 2, '14:00', 'no', '', '', 'yes', 'Lormazepam', '22:00', 'yes', 'Cardio', '17:00', 'no', 2, '19:30', 'yes', 4],
      ['2026-03-20', '07:30', '08:00', 'AWAKE-IN', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['2026-03-21', '23:30', '07:00', 'SLEEP', 6, 4, 5, 'Stressed day', 'yes', 3, '15:30', 'yes', 2, '20:00', 'no', '', '', 'no', '', '', 'yes', 4, '20:00', 'no', 2]
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
      { width: 5 },  // R
      { width: 5 },  // L
      { width: 22 }, // Remarks
      { width: 10 }, // Caffeine_Y
      { width: 12 }, // Caffeine_Cups
      { width: 12 }, // Caffeine_LastIntake
      { width: 10 }, // Alcohol_Y
      { width: 12 }, // Alcohol_Drinks
      { width: 12 }, // Alcohol_LastIntake
      { width: 10 }, // Medication_Y
      { width: 16 }, // Medication_Type
      { width: 12 }, // Medication_Time
      { width: 10 }, // Exercise_Y
      { width: 16 }, // Exercise_Type
      { width: 12 }, // Exercise_Time
      { width: 10 }, // Screens_Y
      { width: 12 }, // Stress_1to5
      { width: 12 }, // LastMeal_Time
      { width: 10 }, // NaturalWake_Y
      { width: 12 }  // MorningMood_1to5
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
      ['R', 'Restedness (0-10).'],
      ['L', 'Energy Level (0-10).'],
      ['Remarks', 'Any notes about the night.'],
      ['Caffeine_Y', 'Did you consume caffeine? (yes/no)'],
      ['Caffeine_Cups', 'Number of cups/servings.'],
      ['Caffeine_LastIntake', 'Time of last caffeine intake (HH:mm).'],
      ['Alcohol_Y', 'Did you consume alcohol? (yes/no)'],
      ['Alcohol_Drinks', 'Number of drinks.'],
      ['Alcohol_LastIntake', 'Time of last alcohol intake (HH:mm).'],
      ['Medication_Y', 'Did you take sleep medication? (yes/no)'],
      ['Medication_Type', 'Type of medication.'],
      ['Medication_Time', 'Time medication was taken (HH:mm).'],
      ['Exercise_Y', 'Did you exercise? (yes/no)'],
      ['Exercise_Type', 'Type of exercise.'],
      ['Exercise_Time', 'Time of exercise (HH:mm).'],
      ['Screens_Y', 'Did you use screens in bed? (yes/no)'],
      ['Stress_1to5', 'Stress level during the day (1-5).'],
      ['LastMeal_Time', 'Time of last meal (HH:mm).'],
      ['NaturalWake_Y', 'Did you wake up naturally? (yes/no)'],
      ['MorningMood_1to5', 'Mood upon waking (1-5).'],
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
                            if (pendingData) processImportedData(pendingData, true);
                          }}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Overwrite with Import
                        </button>
                        <button 
                          onClick={() => {
                            setShowConflictModal(false);
                            setPendingData(null);
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
