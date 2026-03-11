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
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { DailyLog } from '../types';
import { TOTAL_SLOTS } from '../constants';
import { saveLog } from '../services/sleepService';

interface DataImporterProps {
  user: User;
  onImportComplete: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function DataImporter({ user, onImportComplete }: DataImporterProps) {
  const [isUploading, setIsUploading] = useState(false);
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
    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');
    
    try {
      const cleanedData = cleanData(data);
      const skippedDates: string[] = [];
      let successCount = 0;
      
      for (const row of cleanedData) {
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
        const sq = Number(row.SleepQuality || row.sleepQuality);
        const r = Number(row.Restedness || row.restedness);
        const l = Number(row.EnergyLevel || row.energyLevel);

        const isValidMetric = (val: number) => !isNaN(val) && val >= 1 && val <= 10;

        if (!isValidMetric(sq) || !isValidMetric(r) || !isValidMetric(l)) {
          skippedDates.push(`${formattedDate} (Metrics out of bounds 1-10)`);
          continue;
        }

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
          sleepQuality: sq,
          restedness: r,
          energyLevel: l,
          remarks: finalRemarks,
          isIgnored: false,
          summaryMetrics: {
            sleepQuality: sq,
            restedness: r,
            energyLevel: l,
            importedDuration: Number(row.SleepDuration || row.sleepDuration || 0),
            importedInBed: Number(row.WakeInBed || row.wakeInBed || 0),
          },
        };

        // Save to Firestore with merge: true to preserve timeline via saveLog service
        await saveLog(user.uid, logUpdate);
        successCount++;
      }

      if (skippedDates.length > 0) {
        const message = `Imported ${successCount} logs. Skipped ${skippedDates.length} dates: ${skippedDates.join(', ')}`;
        if (successCount > 0) {
          setUploadStatus('success');
          setErrorMessage(message);
        } else {
          setUploadStatus('error');
          setErrorMessage(message);
        }
      } else {
        setUploadStatus('success');
      }
      
      onImportComplete();
      if (skippedDates.length === 0) {
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    } catch (error: any) {
      console.error("Import failed:", error);
      setUploadStatus('error');
      setErrorMessage(error.message || "Failed to save data to Firestore.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processImportedData(results.data);
        },
        error: (error) => {
          alert(`CSV Parsing Error: ${error.message}`);
        }
      });
    } else {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        processImportedData(json);
      };
      reader.readAsArrayBuffer(file);
    }

    event.target.value = '';
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
        SleepDuration: 6.0,
        WakeInBed: 1.2,
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
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-all"
        >
          <Download size={14} />
          Template
        </button>
      </div>

      <div className="relative">
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".csv,.xls,.xlsx"
          className="hidden"
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`w-full py-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
            isUploading 
              ? 'border-zinc-800 bg-zinc-900/30 cursor-not-allowed' 
              : 'border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 size={32} className="text-indigo-500 animate-spin" />
              <p className="text-sm text-zinc-400 font-medium">Importing data...</p>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <FileText size={32} className="text-zinc-600" />
                <FileSpreadsheet size={32} className="text-zinc-600" />
              </div>
              <div className="text-center">
                <p className="text-sm text-zinc-300 font-medium">Click to upload file</p>
                <p className="text-xs text-zinc-500">Drop your CSV or Excel file here</p>
              </div>
            </>
          )}
        </button>

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
      </div>

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
