import React, { useMemo } from 'react';
import { DailyLog } from '../types';
import { User, Sparkles, FileUp, Wrench, CheckCircle } from 'lucide-react';
import { Card } from './UI';
import { format } from 'date-fns';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface DataLedgerProps {
  logs: Record<string, DailyLog>;
  userId: string;
}

export default function DataLedger({ logs, userId }: DataLedgerProps) {
  const sortedLogs = useMemo(() => {
    return Object.values(logs).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs]);

  const handleDelete = async (logId: string) => {
    if (!userId || !logId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'sleep_logs', logId));
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const getSourceInfo = (log: DailyLog) => {
    switch (log.source) {
      case 'manual': return { label: 'MANUAL', icon: CheckCircle, color: 'text-emerald-400' };
      case 'predicted': return { label: 'PREDICTED', icon: Sparkles, color: 'text-indigo-400' };
      case 'imported': return { label: 'IMPORTED', icon: FileUp, color: 'text-zinc-400' };
      case 'ai-adjusted': return { label: 'AI ADJUSTED', icon: Wrench, color: 'text-amber-400' };
      default: return { label: 'MANUAL', icon: User, color: 'text-zinc-400' };
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-black text-xs tracking-widest text-zinc-50 uppercase mb-4">Unified Data Audit Trail</h2>
      {sortedLogs.map(log => {
        const source = getSourceInfo(log);
        const Icon = source.icon;
        return (
          <Card key={log.id} className="p-4 flex items-center justify-between border border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center gap-4">
              <Icon size={16} className={source.color} />
              <div>
                <p className="text-sm font-bold text-white">{format(new Date(log.date), 'MMM dd, yyyy')}</p>
                <div className={`font-black text-[10px] uppercase tracking-widest ${source.color}`}>
                  {source.label}
                </div>
              </div>
            </div>
            <button 
              onClick={() => handleDelete(log.id)}
              className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest"
            >
              Delete
            </button>
          </Card>
        );
      })}
    </div>
  );
}
