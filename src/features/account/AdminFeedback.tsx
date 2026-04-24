import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  User as UserIcon, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
  Filter,
  X,
  ChevronDown,
  Database
} from 'lucide-react';
import { getFeedback, updateFeedbackStatus, deleteFeedback, FeedbackData } from '../../services/feedbackService';
import { format } from 'date-fns';
import { Card } from '../../components/UI';

interface AdminFeedbackProps {
  onBack: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Bug Report': 'text-red-400 bg-red-400/10 border-red-400/20',
  'Feature Request': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Data Issue': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'UI/UX': 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  'Other': 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
};

export default function AdminFeedback({ onBack }: AdminFeedbackProps) {
  const [feedback, setFeedback] = useState<(FeedbackData & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const data = await getFeedback();
      setFeedback(data);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load feedback inbox.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleStatusUpdate = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'resolved' : 'open';
    try {
      await updateFeedbackStatus(id, newStatus);
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await deleteFeedback(id);
      setFeedback(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Error deleting feedback:', err);
    }
  };

  const filteredFeedback = feedback.filter(f => {
    if (filter === 'all') return true;
    return f.status === filter;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-12"
    >
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back to Account</span>
        </button>
        
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {(['all', 'open', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 bg-zinc-900/50 p-6 rounded-[2.5rem] border border-zinc-800/50">
        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
          <MessageSquare size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Feedback Inbox</h2>
          <p className="text-zinc-500 text-sm font-medium">Review and manage user feedback submissions.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
          <p className="text-zinc-500 text-sm font-black uppercase tracking-widest">Loading Inbox...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/30 p-8 rounded-[2.5rem] text-center space-y-4">
          <AlertCircle className="mx-auto text-red-500" size={40} />
          <p className="text-red-200/70 font-medium">{error}</p>
          <button 
            onClick={fetchFeedback}
            className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Retry
          </button>
        </div>
      ) : filteredFeedback.length === 0 ? (
        <div className="bg-zinc-900/30 border border-dashed border-zinc-800 p-20 rounded-[2.5rem] text-center space-y-4">
          <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center text-zinc-700 mx-auto">
            <Filter size={32} />
          </div>
          <p className="text-zinc-600 font-black uppercase tracking-widest">No feedback found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredFeedback.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className={`group border-zinc-800/50 hover:border-zinc-700 transition-all ${item.status === 'resolved' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                  <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other']}`}>
                          {item.category}
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${item.status === 'open' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-zinc-500 bg-zinc-800 border-zinc-700'}`}>
                          {item.status}
                        </div>
                        <span className="text-[10px] text-zinc-600 font-bold">v{item.version}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleStatusUpdate(item.id, item.status)}
                          className={`p-2 rounded-xl transition-all ${item.status === 'open' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                          title={item.status === 'open' ? 'Mark as Resolved' : 'Mark as Open'}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all"
                          title="Delete Feedback"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-white text-sm leading-relaxed font-medium">
                        {item.message}
                      </p>
                      
                      {item.attachedLogs && (
                        <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                            <Database size={14} />
                            Logs Attached
                          </div>
                          <button 
                            onClick={() => console.log('Logs:', item.attachedLogs)}
                            className="text-[10px] text-indigo-400 font-black uppercase tracking-widest hover:text-indigo-300 transition-colors flex items-center gap-1"
                          >
                            Inspect <ExternalLink size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-zinc-800/50 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <UserIcon size={14} className="text-zinc-600" />
                          <span className="text-[11px] text-zinc-400 font-bold">{item.userName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-zinc-600" />
                          <span className="text-[11px] text-zinc-500 font-medium">
                            {item.timestamp?.toDate ? format(item.timestamp.toDate(), 'MMM d, h:mm a') : 'Just now'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-700 font-mono select-all">ID: {item.id}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
