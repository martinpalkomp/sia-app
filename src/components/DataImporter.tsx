import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parse, format, isValid } from 'date-fns';
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
import { User } from 'firebase/auth';
import { writeBatch, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DailyLog, SleepState } from '../types';
import { TOTAL_SLOTS } from '../constants';
import { saveLog } from '../services/sleepService';
import { snapTo15Min, timeToIndex } from '../utils/sleepUtils';

interface DataImporterProps {
  user: User;
  onImportComplete: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function DataImporter({ user, onImportComplete }: DataImporterProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingData, setPendingData] = useState<any[] | null>(null);
  const [cleaningReport, setCleaningReport] = useState<{ skipped: number; cleaned: number; metrics: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fuzzyMapHeader = (header: string): string | null => {
    const h = header.toLowerCase().trim();
    if (h === 'date') return 'Date';
    if (h.includes('start') || h.includes('begin')) return 'Start_Time';
    if (h.includes('end') || h.includes('finish')) return 'End_Time';
    if (h.includes('status') || h.includes('type') || h.includes('code')) return 'Status_Code';
    if (h === 'sq' || h.includes('quality')) return 'SQ';
    if (h === 'r' || h.includes('rest') || h.includes('awakening')) return 'R';
    if (h === 'l' || h.includes('energy') || h.includes('level')) return 'L';
    if (h.includes('remark') || h.includes('note') || h.includes('comment')) return 'Remarks';
    return null;
  };

  const defaultLog = (date: string): DailyLog => ({
    date,
    isIgnored: false,
    sleepQuality: 5,
    restedness: 5,
    energyLevel: 5,
    timeline: Array(TOTAL_SLOTS).fill('awake-out'),
    remarks: '',
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

    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      setUploadStatus('error');
      setErrorMessage("Invalid file type. Only .csv, .xls, and .xlsx are accepted.");
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
    setUploadStatus('idle');
    setErrorMessage('');
    setCleaningReport(null);
    
    try {
      const cleanedData = cleanData(data);
      const skippedRows: string[] = [];
      let cleanedCount = 0;
      const logsToSave: Record<string, DailyLog> = {};
      const metricsCaptured = new Set<string>();
      
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
        const start = mappedRow.Start_Time;
        const end = mappedRow.End_Time;
        const status = mappedRow.Status_Code;

        if (!date || !start || !end || !status) {
          skippedRows.push(`Row ${idx + 1}: Missing required fields (Date, Start, End, Status)`);
          return false;
        }

        if (start === end) {
          skippedRows.push(`Row ${idx + 1}: Start time matches end time (${start})`);
          return false;
        }

        // Robust Date Parsing
        let parsedDate: Date | null = null;
        const dateStr = date.toString().trim();
        
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
        throw new Error("No valid data found after sanitization.");
      }

      setTotalCount(validRows.length);

      // 2. Check for conflicts if not forcing overwrite
      if (!forceOverwrite) {
        const uniqueDates = Array.from(new Set(validRows.map(r => (r as any)._mapped.Date)));
        let hasConflict = false;
        for (const date of uniqueDates) {
          const docRef = doc(db, 'users', user.uid, 'sleep_logs', date as string);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const existingData = docSnap.data() as DailyLog;
            if (existingData.timeline && !existingData.timeline.every(s => s === 'awake-out')) {
              hasConflict = true;
              break;
            }
          }
        }

        if (hasConflict) {
          setPendingData(data);
          setShowConflictModal(true);
          return;
        }
      }

      // 3. Translation Engine (Timestamp to Index)
      for (const rawRow of validRows) {
        const row = (rawRow as any)._mapped;
        const unmapped = (rawRow as any)._unmapped;
        const date = row.Date;
        const start = row.Start_Time;
        const end = row.End_Time;
        const statusVal = row.Status_Code?.toString().toUpperCase();
        
        let state: SleepState = 'awake-out';
        const statusStr = statusVal.toString().toUpperCase();
        
        if (statusStr === '1' || statusStr.includes('SLEEP')) {
          state = 'sleep';
        } else if (statusStr === '2' || statusStr.includes('AWAKE IN') || statusStr === 'AWAKE') {
          state = 'awake-in';
        } else if (statusStr === '0' || statusStr.includes('AWAKE OUT')) {
          state = 'awake-out';
        }

        if (!logsToSave[date]) {
          logsToSave[date] = defaultLog(date);
          logsToSave[date].modifiedBySync = Array(TOTAL_SLOTS).fill(false);
        }

        // Map Clinical Metrics
        if (row.SQ !== undefined) {
          const val = parseInt(row.SQ);
          if (!isNaN(val)) {
            logsToSave[date].sleepQuality = val;
            logsToSave[date].sleep_quality = val;
            metricsCaptured.add('SQ');
          }
        }
        if (row.R !== undefined) {
          const val = parseInt(row.R);
          if (!isNaN(val)) {
            logsToSave[date].restedness = val;
            logsToSave[date].morning_alertness = val;
            metricsCaptured.add('R');
          }
        }
        if (row.L !== undefined) {
          const val = parseInt(row.L);
          if (!isNaN(val)) {
            logsToSave[date].energyLevel = val;
            logsToSave[date].daytime_energy = val;
            metricsCaptured.add('L');
          }
        }
        
        // Map Remarks
        let remarks = row.Remarks || '';
        if (unmapped.length > 0) {
          remarks += (remarks ? ' ' : '') + unmapped.map((u: string) => `[Unmapped: ${u}]`).join(' ');
        }
        if (remarks) {
          logsToSave[date].remarks = remarks;
          logsToSave[date].daily_remarks = remarks;
        }

        const startIndex = timeToIndex(start);
        const endIndex = timeToIndex(end);

        if (endIndex < startIndex) {
          // Midnight Crossover Logic
          for (let i = startIndex; i < TOTAL_SLOTS; i++) {
            logsToSave[date].timeline[i] = state;
            logsToSave[date].modifiedBySync![i] = true;
          }
          
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);
          const nextDateStr = nextDate.toISOString().split('T')[0];
          
          if (!logsToSave[nextDateStr]) {
            logsToSave[nextDateStr] = defaultLog(nextDateStr);
            logsToSave[nextDateStr].modifiedBySync = Array(TOTAL_SLOTS).fill(false);
          }
          for (let i = 0; i < endIndex; i++) {
            logsToSave[nextDateStr].timeline[i] = state;
            logsToSave[nextDateStr].modifiedBySync![i] = true;
          }
        } else {
          for (let i = startIndex; i < endIndex; i++) {
            logsToSave[date].timeline[i] = state;
            logsToSave[date].modifiedBySync![i] = true;
          }
        }
        cleanedCount++;
      }

      // 4. Batch Write to sleep_logs and daily_metrics
      const batch = writeBatch(db);
      const logEntries = Object.entries(logsToSave);
      for (const [date, log] of logEntries) {
        // Write to sleep_logs
        const logRef = doc(db, 'users', user.uid, 'sleep_logs', date);
        batch.set(logRef, {
          ...log,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        // Write to daily_metrics
        const metricsRef = doc(db, 'users', user.uid, 'daily_metrics', date);
        batch.set(metricsRef, {
          date,
          sleep_quality: log.sleep_quality || log.sleepQuality,
          morning_alertness: log.morning_alertness || log.restedness,
          daytime_energy: log.daytime_energy || log.energyLevel,
          daily_remarks: log.daily_remarks || log.remarks,
          source: 'import',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      await batch.commit();

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

    } catch (error: any) {
      console.error("Import failed:", error);
      setUploadStatus('error');
      setErrorMessage(error.message || "An unexpected error occurred.");
    } finally {
      setIsUploading(false);
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

      if (fileName.endsWith('.csv')) {
        data = await new Promise((resolve, reject) => {
          Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
          });
        });
      } else {
        data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
              const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
              resolve(json);
            } catch (err) { reject(err); }
          };
          reader.onerror = (err) => reject(err);
          reader.readAsArrayBuffer(selectedFile);
        });
      }

      await processImportedData(data);
    } catch (error: any) {
      console.error("Upload Submit Error:", error);
      setUploadStatus('error');
      setErrorMessage(error.message || "An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['Date', 'Start_Time', 'End_Time', 'Status_Code', 'SQ', 'R', 'L', 'Remarks'];
    const sampleData = [
      {
        Date: '2024-03-10',
        Start_Time: '22:30',
        End_Time: '06:45',
        Status_Code: 'SLEEP',
        SQ: 8,
        R: 7,
        L: 6,
        Remarks: 'Felt good'
      },
      {
        Date: '2024-03-11',
        Start_Time: '23:15',
        End_Time: '07:30',
        Status_Code: 'SLEEP',
        SQ: 5,
        R: 4,
        L: 5,
        Remarks: 'Interrupted sleep'
      },
      {
        Date: '2024-03-11',
        Start_Time: '07:30',
        End_Time: '08:00',
        Status_Code: 'AWAKE IN BED',
        SQ: '',
        R: '',
        L: '',
        Remarks: 'Scrolling phone'
      }
    ];

    const csvContent = Papa.unparse({
      fields: headers,
      data: sampleData
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sia_sleep_log_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4"
                  >
                    <textarea
                      value={pasteContent}
                      onChange={(e) => setPasteContent(e.target.value)}
                      placeholder="Paste rows from Excel here (Date, Quality, Restedness, Energy, Duration, InBed, Remarks, Notes)..."
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
                  {uploadStatus === 'success' && (
                    <motion.div 
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
                        onClick={() => setUploadStatus('idle')}
                        className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 underline"
                      >
                        Dismiss
                      </button>
                    </motion.div>
                  )}

                  {showConflictModal && (
                    <motion.div 
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
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2 text-red-400 p-4 text-center"
                    >
                      <AlertCircle size={32} />
                      <p className="text-sm font-bold uppercase tracking-widest">Import Failed</p>
                      <p className="text-[10px] text-zinc-500">{errorMessage}</p>
                      <button 
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
                  <li>Metrics (Quality, Restedness, Energy) should be <code className="text-indigo-400">0-10</code></li>
                  <li>Existing logs for the same date will be overwritten</li>
                  <li>Empty rows and whitespace are automatically handled</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
