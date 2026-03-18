import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  Paperclip
} from 'lucide-react';
import { User } from 'firebase/auth';
import { submitFeedback } from '../services/feedbackService';
import { DailyLog } from '../types';

interface FeedbackFormProps {
  user: User;
  recentLogs?: Record<string, DailyLog>;
  onClose: () => void;
}

const CATEGORIES = [
  'Bug Report',
  'Feature Request',
  'Data Issue',
  'UI/UX',
  'Other'
] as const;

export default function FeedbackForm({ user, recentLogs, onClose }: FeedbackFormProps) {
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('Bug Report');
  const [message, setMessage] = useState('');
  const [attachLogs, setAttachLogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        category,
        message,
        attachedLogs: attachLogs ? recentLogs : null
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Feedback submission error:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] text-center space-y-4 shadow-2xl"
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="text-emerald-500" size={32} />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-white">Thank you!</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            SIA is learning from your input. Your feedback helps us improve the intelligence of the agent.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] shadow-2xl space-y-6 w-full max-w-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Submit Feedback</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Help SIA improve</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Category</label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the bug, feature request, or issue..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
            required
          />
        </div>

        <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
          <input
            type="checkbox"
            id="attachLogs"
            checked={attachLogs}
            onChange={(e) => setAttachLogs(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="attachLogs" className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
            <Paperclip size={14} />
            Attach my recent app logs (Optional)
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 p-3 rounded-xl border border-red-400/20">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !message.trim()}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <>
              <Send size={18} />
              Submit Feedback
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
