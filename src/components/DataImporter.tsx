import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileSpreadsheet,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DailyLog } from '../types';
import { TOTAL_SLOTS } from '../constants';
import { saveLog } from '../services/sleepService';
import { snapTo15Min } from '../utils/sleepUtils';

interface DataImporterProps {
  user: User;
  onImportComplete: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function DataImporter({ user, onImportComplete }: DataImporterProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultLog = (date: string): DailyLog => ({
    date,
    isIgnored: false,
    sleepQuality: 5,
    restedness: 5,
    energyLevel: 5,
    timeline: Array(TOTAL_SLOTS).fill('awake-out'),
    remarks: '',
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
      alert("File too large. Please upload a file under 5MB.");
      return false;
    }

    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      alert("Invalid file type. Only .csv, .xls, and .xlsx are accepted.");
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

  const processImportedData = async (data: any[]) => {
    console.log("Starting data processing...", { rowCount: data.length });
    
    setUploadStatus('idle');
    setErrorMessage('');
    setProcessedCount(0);
    setTotalCount(data.length);
    
    try {
      const cleanedData = cleanData(data);
      const skippedDates: string[] = [];
      const logsToSave: any[] = [];
      
      for (let i = 0; i < cleanedData.length; i++) {
        const row = cleanedData[i];
        setProcessedCount(i + 1);
        
        let rawDate = row.Date || row.date;
        if (!rawDate) continue;

        let formattedDate: string | null = null;

        // Handle Excel serial dates (numbers)
        if (typeof rawDate === 'number') {
          // Excel dates are days since 1899-12-30
          const excelDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
          if (!isNaN(excelDate.getTime())) {
            formattedDate = excelDate.toISOString().split('T')[0];
          }
        } else {
          const dateStr = String(rawDate).trim();
          // Check if it's already YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            formattedDate = dateStr;
          } else {
            // Try parsing with native Date
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
              formattedDate = parsed.toISOString().split('T')[0];
            }
          }
        }

        if (!formattedDate) {
          console.warn(`Invalid date format for row:`, row);
          skippedDates.push(`${rawDate || 'Unknown'} (Invalid Date Format)`);
          continue;
        }

        // Numeric validation (1-10)
        const sqRaw = row.SleepQuality || row.sleepQuality;
        const rRaw = row.Restedness || row.restedness;
        const lRaw = row.EnergyLevel || row.energyLevel;
        
        const sq = Number(sqRaw);
        const r = Number(rRaw);
        const l = Number(lRaw);

        const isValidMetric = (val: number) => !isNaN(val) && val >= 1 && val <= 10;
        const allMetricsValid = isValidMetric(sq) && isValidMetric(r) && isValidMetric(l);

        // Remarks Logic: Concatenate Remarks and Notes
        const remarksVal = row.Remarks || row.remarks || '';
        const notesVal = row.Notes || row.notes || '';
        let finalRemarks = '';
        if (remarksVal && notesVal) {
          finalRemarks = `Remarks: ${remarksVal} | Notes: ${notesVal}`;
        } else {
          finalRemarks = remarksVal || notesVal || '';
        }

        const logUpdate: any = {
          date: formattedDate,
          isIgnored: false,
          remarks: finalRemarks,
        };

        if (allMetricsValid) {
          logUpdate.sleepQuality = sq;
          logUpdate.restedness = r;
          logUpdate.energyLevel = l;
          logUpdate.summaryMetrics = {
            sleepQuality: sq,
            restedness: r,
            energyLevel: l,
            importedDuration: snapTo15Min(Number(row.SleepDuration || row.sleepDuration || 0)),
            importedInBed: snapTo15Min(Number(row.WakeInBed || row.wakeInBed || 0)),
          };
        } else {
          // If metrics are invalid, we still save the log but WITHOUT summaryMetrics
          // and without the top-level scores. This ensures it's flagged in the Correction Hub.
          console.warn(`Incomplete metrics for ${formattedDate}, saving as skeleton for Correction Hub.`);
          // We can still save the durations if they exist
          const duration = Number(row.SleepDuration || row.sleepDuration || 0);
          const inBed = Number(row.WakeInBed || row.wakeInBed || 0);
          
          if (!isNaN(duration) || !isNaN(inBed)) {
             logUpdate.summaryMetrics = {
               importedDuration: snapTo15Min(isNaN(duration) ? 0 : duration),
               importedInBed: snapTo15Min(isNaN(inBed) ? 0 : inBed),
               // Missing SQ, R, L here will trigger "Missing Metrics" in Hub
             };
          }
        }

        logsToSave.push(logUpdate);
      }

      console.log('Starting Batch Commit...');
      const BATCH_SIZE = 500;
      for (let i = 0; i < logsToSave.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = logsToSave.slice(i, i + BATCH_SIZE);
        
        for (const log of chunk) {
          const { date, ...rest } = log;
          const docRef = doc(db, 'user_data', user.uid, 'logs', date);
          batch.set(docRef, {
            ...rest,
            date,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        
        await batch.commit();
        console.log(`Committed batch ${Math.floor(i / BATCH_SIZE) + 1}`);
      }

      console.log('All writes confirmed.');

      setUploadStatus('success');
      setErrorMessage(skippedDates.length > 0 
        ? `Logs Imported Successfully! Saved ${logsToSave.length} logs. Skipped ${skippedDates.length} dates: ${skippedDates.join(', ')}`
        : `Logs Imported Successfully! Saved ${logsToSave.length} logs.`
      );
      
      // Reset UI state after success
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      onImportComplete();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadStatus('idle');
        setErrorMessage('');
      }, 3000);

    } catch (error: any) {
      console.error("Import failed:", error);
      setUploadStatus('error');
      
      let message = error.message || "Failed to save data to Firestore.";
      if (error.code === 'permission-denied') {
        message = 'SIA Permission Error: Check Firestore Rules pathing.';
      }
      
      setErrorMessage(message);
      throw error; // Re-throw to be caught by the caller
    }
  };

  const handlePasteImport = async () => {
    if (!pasteContent.trim()) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      const rows = pasteContent.trim().split('\n');
      const parsedData = rows.map(row => {
        const cols = row.split('\t').map(c => c.trim());
        // Map to the expected header format used in processImportedData
        // Date, SleepQuality, Restedness, EnergyLevel, SleepDuration, WakeInBed, Remarks
        return {
          Date: cols[0],
          SleepQuality: cols[1],
          Restedness: cols[2],
          EnergyLevel: cols[3],
          SleepDuration: cols[4],
          WakeInBed: cols[5],
          Remarks: cols[6]
        };
      });

      await processImportedData(parsedData);
      setPasteContent('');
      setIsPasteOpen(false);
    } catch (error: any) {
      console.error("Paste Import failed:", error);
      setUploadStatus('error');
      setErrorMessage(`Paste Error: ${error.message || "Failed to process pasted data."}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log("Step 1: File selected via input.", file?.name);
    
    if (!file) {
      console.warn("No file selected.");
      return;
    }

    if (!validateFile(file)) {
      console.error("File validation failed.");
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    console.log("Step 2: File object captured in state.", { name: file.name, size: file.size });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a file first.");
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
    const headers = ['Date', 'SleepQuality', 'Restedness', 'EnergyLevel', 'SleepDuration', 'WakeInBed', 'Remarks', 'Notes'];
    const sampleData = [
      {
        Date: '2024-03-10',
        SleepQuality: 8,
        Restedness: 7,
        EnergyLevel: 6,
        SleepDuration: 7.5,
        WakeInBed: 0.5,
        Remarks: 'Felt good',
        Notes: 'Woke up once'
      },
      {
        Date: '2024-03-11',
        SleepQuality: 5,
        Restedness: 4,
        EnergyLevel: 3,
        SleepDuration: 6.25,
        WakeInBed: 1.0,
        Remarks: 'Fragmented sleep',
        Notes: 'Late coffee'
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
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Upload size={16} className="text-indigo-400" />
            Data Importer
          </h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">CSV or Excel • Max 5MB</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPasteOpen(!isPasteOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
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
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-all"
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
              className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2 text-emerald-400"
            >
              <CheckCircle2 size={32} />
              <p className="text-sm font-bold uppercase tracking-widest">Import Successful</p>
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
  );
}
