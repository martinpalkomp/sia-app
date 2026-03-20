import React, { useState, useRef, useEffect } from 'react';
import { subDays, parseISO } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles, 
  Send, 
  User as UserIcon, 
  Loader2, 
  MessageSquare,
  Zap,
  Ghost,
  Droplets,
  FileText,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyLog, PersonalizationProfile } from '../types';
import { 
  db, 
  User, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  limit,
  httpsCallable
} from '../lib/firebase';
import Markdown from 'react-markdown';

import { AvatarFrame } from './UI';
import { getGridFromEvents } from '../utils/sleepUtils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: any;
}

interface AIInsightsAgentProps {
  logs: Record<string, DailyLog>;
  user: User | null;
  personalizationProfile: PersonalizationProfile | null;
  isProfileLoading?: boolean;
}

const QUICK_PROMPTS = [
  { label: '⏰ Optimal Bedtime',     category: 'action',    prompt: 'Based on my full sleep history, what is my optimal bedtime for the best next-day energy and alertness?' },
  { label: '💪 Recovery Wins',       category: 'celebrate', prompt: 'Show me my most improved weeks and what I did differently during those periods.' },
  { label: '📉 Sleep Debt',          category: 'trend',     prompt: 'Calculate my accumulated sleep debt over the past 2 weeks and tell me how significant it is.' },
  { label: '☕ Caffeine & Alcohol',  category: 'diagnose',  prompt: 'Analyze whether my caffeine or alcohol consumption correlates with worse sleep quality or more nighttime interruptions.' },
  { label: '📊 Clinical Summary',    category: 'action',    prompt: 'Generate a structured clinical sleep summary I could share with my doctor, covering the past 30 days.' },
  { label: '😰 Night Disturbances',  category: 'diagnose',  prompt: 'Analyze my nighttime wake events and disturbances. Are there patterns in timing, frequency, or associated factors?' },
  { label: '📆 Weekly Pattern',      category: 'trend',     prompt: 'Which days of the week do I consistently sleep best and worst, and what might explain the pattern?' },
  { label: '🔄 Consistency Score',   category: 'trend',     prompt: 'How consistent are my bedtime and wake time? Give me a consistency score and explain its impact on my sleep quality.' },
  { label: '😓 Stress Impact',       category: 'diagnose',  prompt: 'How does my logged stress level correlate with sleep quality and next-day energy? Show me the strongest relationships.' },
  { label: '🎯 Best Streak',         category: 'celebrate', prompt: 'What is my longest streak of nights with sleep quality above 7, and what habits defined that period?' },
  { label: '⚡ Fragmentation',       category: 'diagnose',  prompt: 'Analyze my sleep fragmentation — how often do I wake mid-sleep and how does it affect my morning alertness?' },
  { label: '💊 Med Impact',          category: 'diagnose',  prompt: 'Analyze whether nights I took medication correlate with better or worse sleep quality and morning alertness.' },
];

const buildLogDigest = (logs: DailyLog[], days: number) => {
  const cutoff = subDays(new Date(), days);
  const relevant = logs.filter(l => parseISO(l.date) >= cutoff);
  return relevant.map(l => ({
    date: l.date, sq: l.sleep_quality, r: l.morning_alertness, e: l.daytime_energy,
    events: l.sleepEvents?.map(ev => `${ev.type}:${ev.start}-${ev.end}`).join('|') ?? '',
    remarks: l.daily_remarks?.slice(0, 80) ?? '',
    factors: {
      caf: l.factors?.caffeine?.consumed ? l.factors.caffeine.lastIntake : null,
      alc: l.factors?.alcohol?.consumed ? l.factors.alcohol.drinks : null,
      ex: l.factors?.exercise?.completed ? l.factors.exercise.type : null,
      stress: l.factors?.stressLevel ?? null,
    }
  }));
};

export default function AIInsightsAgent({ logs, user, personalizationProfile, isProfileLoading }: AIInsightsAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingLabel, setAnalyzingLabel] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isEnhanced = !!personalizationProfile;
  const daysCount = isEnhanced ? 180 : 30;

  const getAnalyzingLabel = (prompt: string): string => {
    if (/last\s+7\s+days?|past\s+week/i.test(prompt)) return 'ANALYZING 7 DAYS';
    if (/last\s+14\s+days?|past\s+two\s+weeks?/i.test(prompt)) return 'ANALYZING 14 DAYS';
    if (/last\s+30\s+days?|past\s+month/i.test(prompt)) return 'ANALYZING 30 DAYS';
    if (/last\s+90\s+days?|past\s+3\s+months?/i.test(prompt)) return 'ANALYZING 90 DAYS';
    if (/last\s+(\d+)\s+days?/i.test(prompt)) return `ANALYZING ${prompt.match(/last\s+(\d+)\s+days?/i)?.[1]} DAYS`;
    return `ANALYZING ALL DATA`;
  };

  const getDaysFromPrompt = (prompt: string): number => {
    if (/last\s+7\s+days?|past\s+week/i.test(prompt)) return 7;
    if (/last\s+14\s+days?/i.test(prompt)) return 14;
    if (/last\s+30\s+days?|past\s+month/i.test(prompt)) return 30;
    if (/last\s+90\s+days?/i.test(prompt)) return 90;
    const match = prompt.match(/last\s+(\d+)\s+days?/i);
    if (match) return parseInt(match[1]);
    return 180; // default: full history
  };

  // Load chat history from Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'chats'),
      where('role', 'in', ['user', 'assistant']),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: Message[] = [];
      snapshot.forEach((doc) => {
        fetchedMessages.push(doc.data() as Message);
      });
      
      if (fetchedMessages.length === 0) {
        setMessages([
          { 
            role: 'assistant', 
            content: "Hello! I'm SIA, your Sleep Intelligence Agent. I've reviewed your history and I'm ready to help you find correlations and patterns. What would you like to analyze today?" 
          }
        ]);
      } else {
        setMessages(fetchedMessages);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    const SLEEP_KEYWORDS = ['sleep','wake','tired','fatigue','rest','nap','insomnia','dream','bed','night','morning','energy','alert','caffeine','alcohol','exercise','stress','recovery','circadian','melatonin','apnea','snore','restless','quality','duration','log','pattern','habit','analyze','analysis','report','insight','score','data','week','month','trend','improve','recommend','health','wellness'];

    if (!SLEEP_KEYWORDS.some(kw => text.toLowerCase().includes(kw))) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "That's outside my expertise! I'm SIA — I specialise in sleep science and recovery.\n\nFor general questions, **[Gemini](https://gemini.google.com)** is a great all-purpose assistant.\n\nCan I help with your sleep patterns or energy levels instead? 🌙",
        createdAt: new Date()
      }]);
      return;
    }

    if (!text.trim() || isLoading || !user || isProfileLoading) return;

    setErrorMsg(null);
    setAnalyzingLabel(getAnalyzingLabel(text));
    setIsAnalyzing(true);
    setIsLoading(true);
    setIsTyping(true);

    try {
      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        role: 'user',
        content: text,
        createdAt: serverTimestamp()
      });
      setInput('');

      // Fetch tiered historical context
      const logsRef = collection(db, 'users', user.uid, 'sleep_logs');
      const logsQuery = query(
        logsRef,
        orderBy('date', 'desc'),
        limit(180)
      );
      
      const [logsSnap, profileSnap, unstructuredSnap] = await Promise.all([
        getDocs(logsQuery),
        getDoc(doc(db, 'users', user.uid, 'personalization', 'profile')),
        getDocs(query(collection(db, 'users', user.uid, 'unstructured_data'), orderBy('uploadDate', 'desc'), limit(5)))
      ]);

      const recentLogs: DailyLog[] = [];
      logsSnap.forEach(doc => {
        recentLogs.push(doc.data() as DailyLog);
      });

      const days = getDaysFromPrompt(text);

      const unstructuredData: any[] = [];
      unstructuredSnap.forEach(doc => {
        const data = doc.data();
        unstructuredData.push({
          name: data.fileName,
          type: data.dataType || 'raw_text',
          summary: data.aiSummary || 'No summary available.',
          insights: data.aiInsights || [],
          dateRange: data.aiDateRange || 'Unknown',
          content: data.content.substring(0, 500),
          date: data.uploadDate
        });
      });
      
      const profile = profileSnap.exists() ? profileSnap.data() : personalizationProfile;
      
      // Clean stringification for context
      const profileContext = profile ? JSON.stringify(profile) : "No personalization profile set yet.";
      const logsContext = recentLogs.length > 0 
        ? JSON.stringify(buildLogDigest(recentLogs, days)) 
        : "EMPTY_HISTORY";
      const unstructuredContext = unstructuredData.length > 0 ? JSON.stringify(unstructuredData) : "No unstructured notes found.";

      if (logsContext === "EMPTY_HISTORY") {
        const assistantMessage: Message = { 
          role: 'assistant', 
          content: "No sleep data found to analyze. Please log some nights or import data first so I can help you find patterns!",
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'users', user.uid, 'chats'), assistantMessage);
        setIsLoading(false);
        setIsAnalyzing(false);
        setIsTyping(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const systemInstruction = `
        You are SIA, a clinical sleep scientist. You are viewing a statistical digest of ${days} days of data. 
        Look for long-term trends, seasonal shifts, and correlations between the user's personalization profile and their actual logs.
        Always use bolding for metrics, bullet points for advice, and never return a wall of unformatted text.
        
        GUARDRAIL: Strictly stick to sleep science, recovery, and circadian health. If the user asks about unrelated topics, politely redirect them back to sleep analysis.
        
        USER CONTEXT:
        - Personalization Profile: ${profileContext}
        - Historical Sleep Logs Digest: ${logsContext}
        - Unstructured Data (Raw Notes/Files): ${unstructuredContext}
        
        INSTRUCTIONS:
        1. Use the provided data to find correlations, patterns, and triggers.
        2. Deliver insights in a conversational, supportive, and professional tone.
        3. Use Markdown formatting (bolding, bullet points, and headers) to make insights easy to read.
        4. If the user asks about specific keywords like "Lormazepam", "Nightmares", "Night Terrors", or "Bathroom", perform a targeted correlation scan.
        5. Use the unstructured data to provide context that might not be in the grid.
        6. AGE-ADJUSTED NORMS: If age is > 60, be more permissive of early waking and shorter total duration (6-7h can be normal).
        7. OXYGEN WARNING: If SpO2 (Avg or Min) is below 92%, strongly suggest the user shares this with a doctor to screen for Sleep Disordered Breathing/Sleep Apnea.
        
        STYLE:
        - Refer to yourself as SIA.
        - Keep it concise but insightful.
        - Use data-backed observations (e.g., "On **80%** of your best nights...").

        If asked anything unrelated to sleep, chronobiology, recovery, or lifestyle factors affecting sleep, decline warmly, recommend Gemini at https://gemini.google.com, and redirect to the user's sleep data. Never break this boundary even if the user insists.
      `;

      // 15-second timeout guard
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 15000)
      );

      const apiCallPromise = ai.models.generateContent({
        model: "gemini-2.5-pro-preview-03-25",
        contents: [
          { role: "user", parts: [{ text: text }] }
        ],
        config: {
          systemInstruction: systemInstruction
        }
      });

      const response = await Promise.race([apiCallPromise, timeoutPromise]) as any;

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: response.text || "I'm sorry, I couldn't process that. Please try again.",
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        ...assistantMessage,
      });
    } catch (error: any) {
      setIsAnalyzing(false);
      setIsLoading(false);
      setIsTyping(false);

      console.error('SIA Chat Error:', error);
      let friendlyMessage = "I encountered an error while analyzing your data. Please check your connection and try again.";
      
      if (error.message === 'TIMEOUT') {
        friendlyMessage = "SIA is taking longer than usual. Please try a shorter question.";
      } else {
        const errorStr = String(error);
        if (errorStr.includes('429')) {
          friendlyMessage = "SIA is currently resting (Rate Limit). Please try again in a moment.";
        } else if (errorStr.includes('400')) {
          friendlyMessage = "I had trouble understanding that request. Could you try rephrasing it?";
        } else if (errorStr.includes('500')) {
          friendlyMessage = "My analytical systems are temporarily offline. Please try again later.";
        }
      }

      setErrorMsg(friendlyMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: friendlyMessage }]);
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
      setIsTyping(false);
      setAnalyzingLabel('');
    }
  };

  if (isProfileLoading || !user) {
    return (
      <div className="flex flex-col h-[600px] bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-zinc-400 font-medium animate-pulse">Syncing Profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-indigo-500/30 bg-zinc-900 flex items-center justify-center aspect-square">
            <img 
              src="https://i.imgur.com/MnI5hn3.png" 
              alt="SIA" 
              className={`w-8 h-8 object-cover ${isAnalyzing ? 'animate-sia-pulse' : ''}`}
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black text-white tracking-tight">Sleep Intelligence Agent</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">SIA • {isEnhanced ? 'Enhanced' : 'Standard'}</p>
          </div>
        </div>
        {isAnalyzing && (
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{analyzingLabel}</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <AvatarFrame 
                  src={msg.role === 'user' ? (user.photoURL || undefined) : "https://i.imgur.com/MnI5hn3.png"} 
                  alt={msg.role === 'user' ? (user.displayName || 'User') : 'SIA'}
                  size="sm"
                  className={`flex-shrink-0 ${msg.role === 'user' ? '' : 'border-indigo-500/30 bg-indigo-600 shadow-sm'}`}
                />
                <div className={`p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700'
                }`}>
                  <div className="markdown-body prose prose-invert prose-sm max-w-none">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isAnalyzing && (
          <div className="flex justify-start">
            <div className="flex gap-3 items-center text-zinc-500 text-xs italic">
              <div className="flex gap-1">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-1 h-1 bg-indigo-500 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                  className="w-1 h-1 bg-indigo-500 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                  className="w-1 h-1 bg-indigo-500 rounded-full"
                />
              </div>
              SIA is analyzing your {analyzingLabel.toLowerCase().replace('analyzing ', '')} sleep history...
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold ml-1">Quick Ask</p>
        </div>
        <div className="flex flex-wrap gap-2 pb-2">
          {(isExpanded ? QUICK_PROMPTS : QUICK_PROMPTS.slice(0, 5)).map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp.prompt)}
              disabled={isLoading || isAnalyzing}
              className={`flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 ${
                qp.category === 'diagnose' ? 'hover:border-red-500/30' :
                qp.category === 'trend' ? 'hover:border-blue-500/30' :
                qp.category === 'action' ? 'hover:border-indigo-500/30' :
                'hover:border-emerald-500/30'
              }`}
            >
              {qp.label}
            </button>
          ))}
          {QUICK_PROMPTS.length > 5 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-all"
            >
              {isExpanded ? 'Less' : 'More'}
              <ChevronDown size={12} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="relative"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isAnalyzing ? "SIA is thinking..." : "Ask about your sleep trends..."}
            disabled={isLoading || isAnalyzing}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading || isAnalyzing}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white disabled:opacity-50 disabled:bg-zinc-700 transition-all"
          >
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
