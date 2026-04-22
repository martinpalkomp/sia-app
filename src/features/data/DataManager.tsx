import React, { useState, useEffect } from 'react';
import { 
  db, 
  User, 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch,
  where
} from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Trash2, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  X, 
  Eye,
  ChevronRight,
  RefreshCw,
  Download,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../../components/UI';
import { exportUserData } from '../../utils/DataExporter';

import { DailyLog, PersonalizationProfile } from '../../types';

interface DataManagerProps {
  user: User;
  onRefresh?: () => void;
  logs?: Record<string, DailyLog>;
  personalizationProfile: PersonalizationProfile | null;
}

interface DataItem {
  id: string;
  type: 'structured' | 'unstructured';
  name: string;
  date: string;
  source?: string;
  content?: string;
}

export default function DataManager({ user, onRefresh, logs, personalizationProfile }: DataManagerProps) {
  const [items, setItems] = useState<DataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<DataItem | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const structuredRef = collection(db, 'users', user.uid, 'sleep_logs');
      const unstructuredRef = collection(db, 'users', user.uid, 'unstructured_data');

      const [structuredSnap, unstructuredSnap] = await Promise.all([
        getDocs(query(structuredRef, orderBy('date', 'desc'))),
        getDocs(query(unstructuredRef, orderBy('uploadDate', 'desc')))
      ]);

      const structuredItems: DataItem[] = [];
      structuredSnap.forEach(doc => {
        const data = doc.data();
        structuredItems.push({
          id: doc.id,
          type: 'structured',
          name: `Sleep Log: ${doc.id}`,
          date: doc.id,
          source: data.source || 'manual'
        });
      });

      const unstructuredItems: DataItem[] = [];
      unstructuredSnap.forEach(doc => {
        const data = doc.data();
        unstructuredItems.push({
          id: doc.id,
          type: 'unstructured',
          name: data.fileName || 'Unnamed File',
          date: data.uploadDate,
          content: data.content
        });
      });

      setItems([...structuredItems, ...unstructuredItems]);
    } catch (error) {
      console.error("Error fetching data items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.uid]);

  const handleDelete = async (item: DataItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      const collectionName = item.type === 'structured' ? 'sleep_logs' : 'unstructured_data';
      await deleteDoc(doc(db, 'users', user.uid, collectionName, item.id));
      
      // If structured, also delete metrics
      if (item.type === 'structured') {
        await deleteDoc(doc(db, 'users', user.uid, 'daily_metrics', item.id));
      }

      setItems(prev => prev.filter(i => i.id !== item.id));
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item.");
    }
  };

  const handlePurge = async () => {
    setIsPurging(true);
    try {
      const batch = writeBatch(db);
      
      // Fetch all items to delete
      const structuredRef = collection(db, 'users', user.uid, 'sleep_logs');
      const metricsRef = collection(db, 'users', user.uid, 'daily_metrics');
      const unstructuredRef = collection(db, 'users', user.uid, 'unstructured_data');

      const [sSnap, mSnap, uSnap] = await Promise.all([
        getDocs(structuredRef),
        getDocs(metricsRef),
        getDocs(unstructuredRef)
      ]);

      sSnap.forEach(d => batch.delete(d.ref));
      mSnap.forEach(d => batch.delete(d.ref));
      uSnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
      setItems([]);
      setShowPurgeConfirm(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error purging data:", error);
      alert("Failed to purge data.");
    } finally {
      setIsPurging(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      await exportUserData(user, db);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getSourceBadge = (source: string = 'manual') => {
    switch (source) {
      case 'manual': return { label: 'MANUAL INPUT', color: 'indigo' };
      case 'predicted': return { label: 'AI PREDICTED', color: 'amber' };
      case 'import': return { label: 'NATIVE IMPORT', color: 'emerald' };
      case 'ai-adjusted': return { label: 'AI ADJUSTED', color: 'cyan' };
      default: return { label: 'MANUAL INPUT', color: 'indigo' };
    }
  };

  const getSourceColorClasses = (color: string) => {
    switch (color) {
      case 'indigo': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'amber': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'emerald': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cyan': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* ... keeping existing header ... */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Database className="text-clinical-primary" />
            Data Ledger
          </h2>
          <p className="text-sm text-zinc-500 font-medium">Manage your personal health data sources</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowPurgeConfirm(true)}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Purge All Data
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="text-clinical-primary animate-spin" size={32} />
          <p className="text-sm text-zinc-500 font-black uppercase tracking-widest">Indexing Ledger...</p>
        </div>
      ) : items.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800 py-12 text-center">
          <Database className="mx-auto text-zinc-700 mb-4" size={48} />
          <p className="text-zinc-500 font-medium">No data sources found. Import some data to see it here.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
             const badge = item.type === 'structured' ? getSourceBadge(item.source) : { label: 'UNSTRUCTURED', color: 'zinc' };
             const colorClasses = getSourceColorClasses(badge.color);
             
             return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between group hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  item.type === 'structured' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {item.type === 'structured' ? <Calendar size={20} /> : <FileText size={20} />}
                </div>
                <div>
                  <div className="text-sm font-black text-white">{item.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${colorClasses}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        • {item.type === 'unstructured' ? format(new Date(item.date), 'MMM d, yyyy HH:mm') : item.date}
                      </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.type === 'unstructured' && (
                  <button 
                    onClick={() => setPreviewItem(item)}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  >
                    <Eye size={18} />
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(item)}
                  className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
             )
          })}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="text-emerald-400" />
                  <div>
                    <h3 className="text-lg font-black text-white">{previewItem.name}</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Raw Insight Content</p>
                  </div>
                </div>
                <button onClick={() => setPreviewItem(null)} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed bg-black/30 p-4 rounded-xl border border-zinc-800">
                  {previewItem.content}
                </pre>
              </div>
              <div className="p-6 bg-zinc-900/50 border-t border-zinc-800 flex justify-end">
                <button 
                  onClick={() => setPreviewItem(null)}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Purge Confirmation Modal */}
      <AnimatePresence>
        {showPurgeConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-red-900/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto text-red-500">
                  <AlertTriangle size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white">Nuclear Purge?</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    This will permanently delete <span className="text-white font-bold">ALL</span> imported sleep logs, metrics, and raw insights. This action cannot be undone.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handlePurge}
                    disabled={isPurging}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                  >
                    {isPurging ? <RefreshCw className="animate-spin" size={18} /> : <Trash2 size={18} />}
                    {isPurging ? 'Purging Ledger...' : 'Yes, Purge Everything'}
                  </button>
                  <button 
                    onClick={() => setShowPurgeConfirm(false)}
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
