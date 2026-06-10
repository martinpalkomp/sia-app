import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Database, Brain, FileJson, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react';
import { collection, getDocs, getDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';

interface DevRawDataExporterProps {
  userId: string;
}

type ExportStatus = 'idle' | 'fetching' | 'writing' | 'done' | 'error';

interface CollectionStats {
  name: string;
  count: number;
}

// ─── Download helper ──────────────────────────────────────────────────────────
const downloadFile = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ─── Firestore fetcher ────────────────────────────────────────────────────────
const fetchAllCollections = async (userId: string) => {
  const base = `users/${userId}`;
  const toData = (snap: any) => snap.docs.map((d: any) => ({ _id: d.id, ...d.data() }));
  const sanitize = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (obj.toDate) return obj.toDate().toISOString();
    if (Array.isArray(obj)) return obj.map(sanitize);
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, sanitize(v)]));
  };

  const [logsSnap, insightsSnap, chatsSnap, briefsSnap, correctionsSnap, unstructuredSnap, profileSnap] =
    await Promise.all([
      getDocs(query(collection(db, base, 'sleep_logs'), orderBy('date', 'asc'))),
      getDocs(collection(db, base, 'insights')),
      getDocs(query(collection(db, base, 'chats'), orderBy('timestamp', 'desc'), limit(500))),
      getDocs(collection(db, base, 'daily_briefs')),
      getDocs(collection(db, base, 'ai_corrections')),
      getDocs(collection(db, base, 'unstructured_data')),
      getDoc(doc(db, base, 'personalization', 'profile')),
    ]);

  return sanitize({
    sleep_logs:       toData(logsSnap),
    insights:         toData(insightsSnap),
    chats:            toData(chatsSnap),
    daily_briefs:     toData(briefsSnap),
    ai_corrections:   toData(correctionsSnap),
    unstructured_data: toData(unstructuredSnap),
    personalization:  profileSnap.exists() ? profileSnap.data() : null,
  });
};

// ─── Format 1: Raw JSON dump ──────────────────────────────────────────────────
const buildRawJSON = (data: any, userId: string): string => {
  return JSON.stringify({
    _meta: {
      exportedAt: new Date().toISOString(),
      userId: userId.substring(0, 8) + '…',
      tool: 'SIA DevRawDataExporter v1',
      collections: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? (v as any[]).length : (v ? 1 : 0)])
      ),
    },
    ...data,
  }, null, 2);
};

// ─── Format 2: AI Training JSONL ──────────────────────────────────────────────
const buildTrainingJSONL = (data: any): string => {
  const lines: string[] = [];
  const BASE_SYSTEM = 'You are SIA, a quiet analytical Sleep Intelligence Agent. Clinically precise. Evidence-anchored. No motivational filler.';

  // Chat pairs
  const chatsBySession: Record<string, any[]> = {};
  (data.chats || []).forEach((msg: any) => {
    const sessionId = msg.sessionId || msg._id?.split('_')[0] || 'default';
    if (!chatsBySession[sessionId]) chatsBySession[sessionId] = [];
    chatsBySession[sessionId].push(msg);
  });

  Object.values(chatsBySession).forEach((msgs: any[]) => {
    const sorted = msgs.sort((a, b) => (a.timestamp || 0) > (b.timestamp || 0) ? 1 : -1);
    for (let i = 0; i < sorted.length - 1; i++) {
      const userMsg = sorted[i];
      const assistantMsg = sorted[i + 1];
      if (userMsg.role === 'user' && assistantMsg.role === 'assistant' && assistantMsg.content) {
        lines.push(JSON.stringify({
          messages: [
            { role: 'system', content: BASE_SYSTEM },
            { role: 'user', content: userMsg.content },
            { role: 'assistant', content: assistantMsg.content },
          ],
          _meta: { type: 'chat', date: userMsg.timestamp || null },
        }));
      }
    }
  });

  // Daily Brief pairs
  (data.daily_briefs || []).forEach((brief: any) => {
    if (!brief.content) return;
    const logForDate = (data.sleep_logs || []).find((l: any) => l.date === brief._id);
    if (!logForDate) return;
    const context = `Sleep log for ${brief._id}: quality ${logForDate.sleep_quality}/10, alertness ${logForDate.morning_alertness}/10, energy ${logForDate.daytime_energy}/10. Events: ${(logForDate.sleepEvents || []).length} recorded.`;
    lines.push(JSON.stringify({
      messages: [
        { role: 'system', content: BASE_SYSTEM },
        { role: 'user', content: `Generate a morning brief for this sleep data: ${context}` },
        { role: 'assistant', content: brief.content },
      ],
      _meta: { type: 'daily_brief', date: brief._id },
    }));
  });

  // Insight pairs
  (data.insights || []).forEach((insight: any) => {
    if (!insight.summary) return;
    const linkedLogs = (data.sleep_logs || []).filter((l: any) => (insight.linkedDates || []).includes(l.date));
    if (linkedLogs.length === 0) return;
    const context = `Analyze ${linkedLogs.length} nights of sleep data. Average quality: ${(linkedLogs.reduce((a: number, l: any) => a + (l.sleep_quality || 0), 0) / linkedLogs.length).toFixed(1)}/10.`;
    lines.push(JSON.stringify({
      messages: [
        { role: 'system', content: BASE_SYSTEM },
        { role: 'user', content: context },
        { role: 'assistant', content: JSON.stringify({ type: insight.type, summary: insight.summary, confidence: insight.confidence, evidence: insight.evidence || [] }) },
      ],
      _meta: { type: 'insight', insightType: insight.type, confidence: insight.confidence },
    }));
  });

  return lines.join('\n');
};

// ─── Format 3: AI Quality Review ─────────────────────────────────────────────
const buildAIReview = (data: any): string => {
  const insights = (data.insights || []).sort((a: any, b: any) => b.confidence - a.confidence);
  const briefs = data.daily_briefs || [];
  const logs = data.sleep_logs || [];

  const avgConfidence = insights.length > 0
    ? (insights.reduce((a: number, i: any) => a + (i.confidence || 0), 0) / insights.length).toFixed(2)
    : 'N/A';

  const byType = insights.reduce((acc: any, i: any) => {
    acc[i.type] = (acc[i.type] || 0) + 1; return acc;
  }, {});

  const chatMessages = data.chats || [];
  const siaMessages = chatMessages.filter((m: any) => m.role === 'assistant');
  const avgResponseLength = siaMessages.length > 0
    ? Math.round(siaMessages.reduce((a: number, m: any) => a + (m.content?.length || 0), 0) / siaMessages.length)
    : 0;

  return JSON.stringify({
    _meta: { exportedAt: new Date().toISOString(), tool: 'SIA AI Quality Review v1' },
    summary: {
      totalLogs: logs.length,
      totalInsights: insights.length,
      avgInsightConfidence: avgConfidence,
      insightsByType: byType,
      totalChatMessages: chatMessages.length,
      siaChatMessages: siaMessages.length,
      avgSIAResponseLength: avgResponseLength,
      totalBriefs: briefs.length,
      logsWithHighQuality: logs.filter((l: any) => l.sleep_quality >= 8).length,
      logsWithLowQuality: logs.filter((l: any) => l.sleep_quality <= 4).length,
    },
    highConfidenceInsights: insights.filter((i: any) => i.confidence >= 0.8).map((i: any) => ({
      type: i.type, confidence: i.confidence, summary: i.summary,
      occurrences: i.occurrences, linkedDates: i.linkedDates,
    })),
    lowConfidenceInsights: insights.filter((i: any) => i.confidence < 0.5).map((i: any) => ({
      type: i.type, confidence: i.confidence, summary: i.summary,
    })),
    recentBriefs: briefs.slice(0, 10).map((b: any) => ({
      date: b._id, contentLength: b.content?.length || 0,
      preview: b.content?.substring(0, 200) + '…',
    })),
    sampleChatResponses: siaMessages.slice(0, 5).map((m: any) => ({
      content: m.content?.substring(0, 300) + '…',
      timestamp: m.timestamp,
    })),
  }, null, 2);
};

// ─── Component ────────────────────────────────────────────────────────────────
export const DevRawDataExporter: React.FC<DevRawDataExporterProps> = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [stats, setStats] = useState<CollectionStats[]>([]);
  const [error, setError] = useState<string | null>(null);

  const dateStr = format(new Date(), 'yyyyMMdd_HHmm');

  const run = async (type: 'raw' | 'training' | 'review' | 'all') => {
    setStatus('fetching'); setError(null);
    try {
      const data = await fetchAllCollections(userId);
      setStats(Object.entries(data).map(([name, v]) => ({
        name, count: Array.isArray(v) ? (v as any[]).length : (v ? 1 : 0),
      })));
      setStatus('writing');

      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

      if (type === 'raw' || type === 'all') {
        downloadFile(buildRawJSON(data, userId), `sia_raw_${dateStr}.json`, 'application/json');
        if (type === 'all') await delay(600);
      }
      if (type === 'training' || type === 'all') {
        const jsonl = buildTrainingJSONL(data);
        if (jsonl.trim()) downloadFile(jsonl, `sia_training_${dateStr}.jsonl`, 'application/x-ndjson');
        if (type === 'all') await delay(600);
      }
      if (type === 'review' || type === 'all') {
        downloadFile(buildAIReview(data), `sia_ai_review_${dateStr}.json`, 'application/json');
      }
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e: any) {
      setError(e.message || 'Export failed');
      setStatus('error');
    }
  };

  const EXPORTS = [
    { key: 'raw' as const,      icon: Database, label: 'Raw Firestore JSON', desc: 'All collections as-is. Full structure preserved. Use for data inspection and debugging.', file: `.json` },
    { key: 'training' as const, icon: Brain,    label: 'AI Training JSONL',  desc: 'Chat + brief + insight pairs formatted as {system, user, assistant} triples. Ready for fine-tuning.', file: `.jsonl` },
    { key: 'review' as const,   icon: FileJson, label: 'AI Quality Review',  desc: 'Insight confidence trends, response samples, quality metrics. Use to audit AI accuracy.', file: `.json` },
  ];

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <button onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Download size={15} className="text-zinc-400" />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-300">Raw Data Exporter</p>
            <p className="text-[9px] text-zinc-600 font-bold mt-0.5">Firestore dump · AI training pairs · Quality review</p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4 border-t border-zinc-800">

              {/* Collection stats (after fetch) */}
              {stats.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-1.5">
                  {stats.map(s => (
                    <div key={s.name} className="bg-zinc-900 rounded-lg p-2 border border-zinc-800">
                      <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider truncate">{s.name.replace('_', ' ')}</p>
                      <p className="text-[12px] font-black text-white">{s.count}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Individual export buttons */}
              <div className="mt-4 space-y-2">
                {EXPORTS.map(({ key, icon: Icon, label, desc, file }) => (
                  <button key={key} disabled={status === 'fetching' || status === 'writing'}
                    onClick={() => run(key)}
                    className="w-full flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-left">
                    <Icon size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-white">{label} <span className="text-zinc-600">{file}</span></p>
                      <p className="text-[9px] text-zinc-500 font-bold mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                    <Download size={12} className="text-zinc-600 flex-shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>

              {/* Export all */}
              <button onClick={() => run('all')} disabled={status === 'fetching' || status === 'writing'}
                className="w-full py-3 rounded-xl bg-indigo-900/40 border border-indigo-800/40 text-[10px] font-black uppercase tracking-widest text-indigo-300 hover:bg-indigo-900/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {status === 'fetching' && <><Loader2 size={12} className="animate-spin" /> Fetching from Firestore…</>}
                {status === 'writing' && <><Loader2 size={12} className="animate-spin" /> Writing files…</>}
                {status === 'done' && <><CheckCircle2 size={12} className="text-emerald-400" /> All 3 files downloaded</>}
                {(status === 'idle' || status === 'error') && <><Download size={12} /> Export All 3 Formats</>}
              </button>

              {error && <p className="text-[9px] text-red-400 font-bold text-center">{error}</p>}

              <p className="text-[8px] text-zinc-700 font-bold text-center uppercase tracking-widest">
                Client-side read · Admin only · Data never leaves your browser
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
