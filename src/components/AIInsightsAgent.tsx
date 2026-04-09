import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyLog, PersonalizationProfile, Insight, UnstructuredData, UserProfile } from '../types';
import { buildClinicalBrief } from '../lib/aiContextBuilder';
import { AIService } from '../services/aiService';
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
  updateDoc
} from '../lib/firebase';
import Markdown from 'react-markdown';
import { useUser } from '../context/UserContext';
import { getAIPageTheme } from '../utils/themeUtils';
import { Type } from "@google/genai";

import { AvatarFrame } from './UI';
import { getGridFromEvents } from '../utils/sleepUtils';
import { calculateAge } from '../utils/dateUtils';

const DISCLAIMER = "SIA provides lifestyle recommendations based on patterns. This is not a medical diagnosis. Consult a professional for clinical concerns.";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: any;
}

const getQuickPrompts = (tier: string, maturityLevel: number) => {

  // LEVEL 1 — Baseline (0–14 logs): No correlations yet, only reflective
  const level1 = [
    { label: 'Last Night',    prompt: 'How did my last logged night look? Any notable patterns from the first logs?' },
    { label: 'Sleep Timing',  prompt: 'What time do I typically go to bed based on my logs so far?' },
    { label: 'Energy Link',   prompt: 'Is there any early sign of a link between my sleep quality and next-day energy?' },
    { label: 'Log Quality',   prompt: 'How complete is my data so far and what should I prioritise logging next?' },
  ];

  // LEVEL 2 BASIC — Emerging Patterns, conserve the 3-message quota
  const level2Basic = [
    { label: 'Best Night',    prompt: 'What factors were present on my best-quality sleep nights?' },
    { label: 'Worst Night',   prompt: 'What do my lowest-quality nights have in common?' },
    { label: 'Weekly Rhythm', prompt: 'Which days of the week do I sleep best and worst?' },
    { label: 'Consistency',   prompt: 'How consistent is my bedtime and how does that affect quality?' },
  ];

  // LEVEL 2 ENHANCED/PRO — Emerging Patterns, deeper factor access
  const level2Enhanced = [
    { label: 'Best Night',      prompt: 'What factors were present on my best-quality sleep nights?' },
    { label: 'Caffeine Effect', prompt: 'Correlate my caffeine intake timing with sleep quality scores.' },
    { label: 'Stress Link',     prompt: 'How does logged stress level affect next-morning alertness?' },
    { label: 'Exercise Timing', prompt: 'Does the time I exercise correlate with better or worse sleep?' },
    { label: 'Weekly Rhythm',   prompt: 'Which days of the week do I sleep best and worst?' },
    { label: 'Gadget Report',   prompt: 'Which sleep tools correlate with better efficiency in my logs?' },
  ];

  // LEVEL 3 BASIC — Full Insight, but quota-constrained
  const level3Basic = [
    { label: '90-Day Trend',   prompt: 'What is my overall sleep quality trend across the full history?' },
    { label: 'Best Period',    prompt: 'What was my best sustained sleep period and what habits defined it?' },
    { label: 'Consistency',    prompt: 'Score my long-term bedtime consistency and its effect on quality.' },
    { label: 'Top Disruptor',  prompt: 'What is my single most confirmed sleep disruptor across all logs?' },
  ];

  // LEVEL 3 ENHANCED/PRO — Full clinical depth
  const level3Enhanced = [
    { label: 'Chronotype',      prompt: 'Define my chronotype from my sleep timing history.' },
    { label: 'Trigger Map',     prompt: 'What are my top 3 confirmed sleep disruptors across all data?' },
    { label: 'Recovery Index',  prompt: 'Build a 4-week rolling recovery index from quality and efficiency.' },
    { label: 'Optimise Tonight',prompt: 'Based on all patterns, what one change would most improve tonight?' },
    { label: 'Doctor Brief',    prompt: 'Summarise my sleep health concisely for a clinical consultation.' },
    { label: 'Seasonal Shift',  prompt: 'Has my sleep quality or timing shifted across different months?' },
  ];

  if (maturityLevel === 1) return level1;
  if (maturityLevel === 2) return (tier === 'Basic') ? level2Basic : level2Enhanced;
  return (tier === 'Basic') ? level3Basic : level3Enhanced;
};

const buildLogDigest = (logs: DailyLog[], days: number) => {
  const cutoff = subDays(new Date(), days);
  const relevant = logs.filter(l => parseISO(l.date) >= cutoff);
  return relevant.map(l => ({
    date: l.date, sq: l.sleep_quality, r: l.morning_alertness, e: l.daytime_energy,
    events: l.sleepEvents?.map(ev => `${ev.type}:${ev.start}-${ev.end}`).join('|') ?? '',
    remarks: l.daily_remarks?.slice(0, 80) ?? '',
    factors: {
      caf: l.factors?.caffeine?.consumed ? l.factors.caffeine.lastIntake : null,
      cafCups: l.factors?.caffeine?.amount ?? null,
      alc: l.factors?.alcohol?.consumed ? l.factors.alcohol.drinks : null,
      ex: l.factors?.exercise?.completed ? l.factors.exercise.type : null,
      stress: l.factors?.stressLevel ?? null,
      lastMeal: l.factors?.lastMealTime ?? null,
      naturalWake: l.factors?.naturalWake ?? null,
      mood: l.factors?.moodScore ?? null,
      gadgets: l.factors?.sleepGadgets?.map(g => {
        let s = g.type.replace(/_/g, ' ');
        if (g.durationMinutes) s += ` ${g.durationMinutes}min`;
        if (g.timeOfUse) s += ` @${g.timeOfUse.replace(/_/g,' ')}`;
        return s;
      }).join(', ') ?? null
    }
  }));
};

export default function AIInsightsAgent() {
  const { logs, user, userProfile, personalizationProfile, isProfileLoading, tier, dataDepth } = useUser();
  const theme = useMemo(() => getAIPageTheme(tier), [tier]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);
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
            content: "Clinical Intelligence Activated. I'm SIA, your Sleep Intelligence Agent. I've initialized your data fidelity tier and am ready to perform a multi-vector correlation analysis on your sleep history. What clinical parameters or trends should we evaluate today?" 
          }
        ]);
      } else {
        setMessages(fetchedMessages);
      }
    }, (error) => {
      console.error("Chat history load error:", error);
      setErrorMsg("Failed to load chat history. Please try again later.");
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!db) { console.error('Firestore db is null'); return; }
    const SLEEP_KEYWORDS = ['sleep','wake','tired','fatigue','rest','nap','insomnia','dream','bed','night','morning','energy','alert','caffeine','alcohol','exercise','stress','recovery','circadian','melatonin','apnea','snore','restless','quality','duration','log','pattern','habit','analyze','analysis','report','insight','score','data','week','month','trend','improve','recommend','health','wellness'];

    if (!SLEEP_KEYWORDS.some(kw => text.toLowerCase().includes(kw))) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "That's outside my expertise! I'm SIA — I specialise in sleep science and recovery.\n\nFor general questions, **[Gemini](https://gemini.google.com)** is a great all-purpose assistant.\n\nCan I help with your sleep patterns or energy levels instead? 🌙",
        createdAt: new Date()
      }]);
      return;
    }

    if (!text.trim() || isLoading || !user || !userProfile || isProfileLoading) return;

    setErrorMsg(null);
    setIsLimitReached(false);
    setAnalyzingLabel(getAnalyzingLabel(text));
    setIsAnalyzing(true);
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Save user message to Firestore
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
        limit(14)
      );
      
      const [logsSnap, profileSnap, unstructuredSnap] = await Promise.all([
        getDocs(logsQuery),
        getDoc(doc(db, 'users', user.uid, 'personalization', 'profile')),
        getDocs(query(collection(db, 'users', user.uid, 'unstructured_data'), orderBy('uploadDate', 'desc'), limit(10)))
      ]);

      const recentLogs: DailyLog[] = [];
      logsSnap.forEach(doc => {
        recentLogs.push(doc.data() as DailyLog);
      });

      const unstructuredData: UnstructuredData[] = [];
      unstructuredSnap.forEach(doc => {
        unstructuredData.push({ id: doc.id, ...doc.data() } as UnstructuredData);
      });
      
      const clinicalBrief = buildClinicalBrief(recentLogs, unstructuredData);
      const profile = profileSnap.exists() ? profileSnap.data() : personalizationProfile;

      const history = messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await AIService.chatWithSIA(
        user.uid,
        text,
        userProfile.tier,
        {
          clinicalBrief,
          personalizationProfile: profile,
          history
        }
      );

      if (response.limitReached) {
        setIsLimitReached(true);
        const limitMsg = "You've reached your daily message limit. Upgrade to Enhanced or Pro for more messages.";
        await addDoc(collection(db, 'users', user.uid, 'chats'), {
          role: 'assistant',
          content: limitMsg,
          createdAt: serverTimestamp()
        });
        return;
      }

      if (response.answer) {
        await addDoc(collection(db, 'users', user.uid, 'chats'), {
          role: 'assistant',
          content: response.answer,
          createdAt: serverTimestamp()
        });

        // Save insights if any
        if (response.newInsights && response.newInsights.length > 0) {
          const insightsRef = collection(db, 'users', user.uid, 'insights');
          
          const computeConfidence = (linkedDates: string[]): number => {
            const count = linkedDates.length;
            if (count > 5) return 0.9;
            if (count >= 2) return 0.65;
            return 0.3;
          };

          for (const insight of response.newInsights) {
            // Fetch existing insights of the same type to find "similar" ones
            const q = query(insightsRef, where('type', '==', insight.type));
            const querySnapshot = await getDocs(q);
            
            let existingInsightId: string | null = null;
            let existingData: Insight | null = null;

            const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
            const targetSummary = normalize(insight.summary);

            querySnapshot.forEach((doc) => {
              const data = doc.data() as Insight;
              if (normalize(data.summary) === targetSummary) {
                existingInsightId = doc.id;
                existingData = data;
              }
            });

            if (existingInsightId && existingData) {
              const updatedDates = Array.from(new Set([...existingData.linkedDates, ...insight.linkedDates]));
              await updateDoc(doc(db, 'users', user.uid, 'insights', existingInsightId), {
                confidence: computeConfidence(updatedDates),
                linkedDates: updatedDates,
                lastSeen: serverTimestamp(),
                occurrences: (existingData.occurrences || 1) + 1,
                details: insight.details || existingData.details
              });
            } else {
              await addDoc(insightsRef, {
                ...insight,
                confidence: computeConfidence(insight.linkedDates),
                createdAt: serverTimestamp(),
                lastSeen: serverTimestamp(),
                occurrences: 1,
                status: 'active'
              });
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Chat Error:", error);
      setErrorMsg("I'm sorry, I encountered an error. Please try again later.");
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
        <p className="text-sm text-zinc-300 font-medium animate-pulse">Syncing Profile...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[100dvh] md:h-[80vh] max-md:landscape:h-[200vh] w-full bg-zinc-950 border ${theme.border} rounded-none md:rounded-3xl overflow-hidden animate-scanning relative`}>
      {/* Header */}
      <div className={`p-4 border-b ${theme.border} bg-zinc-900/80 backdrop-blur-md flex items-center justify-between text-left relative z-10`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl overflow-hidden border ${theme.border} bg-zinc-900 flex items-center justify-center aspect-square`}>
            <img 
              src="https://i.imgur.com/MnI5hn3.png" 
              alt="SIA" 
              className={`w-8 h-8 object-cover ${isAnalyzing ? 'animate-sia-pulse' : ''}`}
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black text-white tracking-tight">Sleep Intelligence Agent</h3>
            <p className={`text-[10px] ${theme.text} uppercase tracking-widest font-bold`}>Access Tier: {isEnhanced ? 'Enhanced Analysis' : 'Basic'}</p>
          </div>
        </div>
        {isAnalyzing && (
          <div className={`flex items-center gap-2 px-3 py-1 ${theme.bg} border ${theme.border} rounded-full`}>
            <div className={`w-1.5 h-1.5 ${theme.accent} rounded-full animate-pulse`} />
            <span className={`text-[9px] font-black ${theme.text} uppercase tracking-widest`}>{analyzingLabel}</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4 scrollbar-hide"
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
            <div className="flex gap-3 items-center text-zinc-400 text-xs italic">
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
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between mb-2 w-full text-left"
        >
          <p className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold ml-1">Quick Ask</p>
          <ChevronDown size={12} className={`text-zinc-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded && (
          <div className="flex flex-wrap gap-2 pb-2">
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-2 px-1">
              {dataDepth.level === 1 ? 'Starter questions — log 14 nights to unlock patterns' :
               dataDepth.level === 2 ? 'Pattern questions — 90 nights unlocks advanced analysis' :
               tier === 'Basic' ? 'Deep questions — upgrade for full clinical set' :
               'Full clinical set'}
            </p>
            {getQuickPrompts(tier, dataDepth.level).map((qp, i) => (
              <button
                key={i}
                onClick={() => handleSend(qp.prompt)}
                disabled={isLoading || isAnalyzing}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-indigo-500/40 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:text-white transition-all disabled:opacity-50"
              >
                {qp.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-2 md:p-4 bg-zinc-900 border-t border-zinc-800">
        {dataDepth.level < 2 && (
          <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Low Data Depth</p>
              <p className="text-[9px] text-zinc-400 leading-relaxed">
                SIA is in Initializing mode. Log 14 days for better correlations. (Progress: {dataDepth.count}/14)
              </p>
            </div>
          </div>
        )}
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
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 rounded-2xl flex items-center justify-center text-white disabled:opacity-50 disabled:bg-zinc-700 transition-all"
          >
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
        
        {/* Quota Display */}
        <div className="mt-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (userProfile.quota.chatMessagesUsed / AIService.getQuotaLimit(userProfile.tier)) * 100)}%` }}
                className={`h-full ${isLimitReached ? 'bg-red-500' : 'bg-indigo-500'}`}
              />
            </div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              {userProfile.quota.chatMessagesUsed} / {AIService.getQuotaLimit(userProfile.tier)} Messages
            </span>
          </div>
          
          {userProfile.tier === 'Basic' && (
            <button className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest hover:text-indigo-300 transition-colors">
              Upgrade for More
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
