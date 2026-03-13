import React, { useState, useRef, useEffect } from 'react';
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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyLog, PersonalizationProfile } from '../types';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import Markdown from 'react-markdown';
import { 
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
  limit
} from 'firebase/firestore';

import { AvatarFrame } from './UI';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: any;
}

interface AIInsightsAgentProps {
  logs: Record<string, DailyLog>;
  user: User;
  personalizationProfile: PersonalizationProfile | null;
}

const QUICK_PROMPTS = [
  { 
    label: "💊 Med Impact", 
    icon: Zap, 
    prompt: "Look at nights where 'Lormazepam' is in remarks. Compare the SQ/R scores to nights without it." 
  },
  { 
    label: "🌙 Nightmares & Night Terrors", 
    icon: Ghost, 
    prompt: "Analyze my logs for mentions of nightmares or night terrors. Are there any common triggers or patterns in my sleep quality?" 
  },
  { 
    label: "🚽 Interruption Check", 
    icon: Droplets, 
    prompt: "Analyze how many nights mention 'Bathroom' and how that correlates with 'Feeling Rested (R)'." 
  },
  { 
    label: "🌟 Best Nights", 
    icon: Sparkles, 
    prompt: "Analyze my best nights from last month and tell me what patterns you see." 
  }
];

export default function AIInsightsAgent({ logs, user, personalizationProfile }: AIInsightsAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (!text.trim() || isLoading || !user) return;

    const userMessage: Message = { 
      role: 'user', 
      content: text,
      createdAt: serverTimestamp() 
    };
    
    try {
      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        ...userMessage,
      });
      setInput('');
      setIsLoading(true);
      setIsTyping(true);

      // Fetch fresh data for context
      const logsRef = collection(db, 'users', user.uid, 'sleep_logs');
      const logsQuery = query(
        logsRef,
        where('type', '==', 'log'),
        orderBy('date', 'desc'),
        limit(14)
      );
      
      const [logsSnap, profileSnap] = await Promise.all([
        getDocs(logsQuery),
        getDoc(doc(db, 'users', user.uid, 'personalization', 'profile'))
      ]);

      const recentLogs: any[] = [];
      logsSnap.forEach(doc => recentLogs.push(doc.data()));
      const profile = profileSnap.exists() ? profileSnap.data() : null;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const systemInstruction = `
        You are SIA, a clinical sleep scientist. Always use bolding for metrics, bullet points for advice, and never return a wall of unformatted text.
        
        USER CONTEXT:
        - Personalization Profile: ${profile ? JSON.stringify(profile) : "No personalization profile set yet."}
        - Recent Sleep Logs (last 14 days): ${JSON.stringify(recentLogs)}
        
        INSTRUCTIONS:
        1. Use the provided data to find correlations, patterns, and triggers.
        2. Deliver insights in a conversational, supportive, and professional tone.
        3. Use Markdown formatting (bolding, bullet points, and headers) to make insights easy to read.
        4. If the user asks about specific keywords like "Lormazepam", "Nightmares", "Night Terrors", or "Bathroom", perform a targeted correlation scan.
        5. AGE-ADJUSTED NORMS: If age is > 60, be more permissive of early waking and shorter total duration (6-7h can be normal).
        6. OXYGEN WARNING: If SpO2 (Avg or Min) is below 92%, strongly suggest the user shares this with a doctor to screen for Sleep Disordered Breathing/Sleep Apnea.
        
        STYLE:
        - Refer to yourself as SIA.
        - Keep it concise but insightful.
        - Use data-backed observations (e.g., "On **80%** of your best nights...").
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: "user", parts: [{ text: text }] }
        ],
        config: {
          systemInstruction: systemInstruction
        }
      });

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: response.text || "I'm sorry, I couldn't process that. Please try again.",
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        ...assistantMessage,
      });
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error while analyzing your data. Please check your connection and try again." }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex items-center gap-3 text-left">
        <div className="w-10 h-10 rounded-xl overflow-hidden border border-indigo-500/30 bg-zinc-900 flex items-center justify-center aspect-square">
          <img 
            src="https://i.imgur.com/MnI5hn3.png" 
            alt="SIA" 
            className="w-8 h-8 object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Sleep Intelligence Agent</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">SIA</p>
        </div>
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
        {isTyping && (
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
              SIA is analyzing your sleep...
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold ml-1">Quick Ask</p>
          <button
            onClick={() => handleSend("Based on my recent sleep logs, generate a structured clinical summary including sleep efficiency, average onset, and recovery trends for my doctor.")}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest text-indigo-400 transition-all"
          >
            <FileText size={12} />
            Clinical Report
          </button>
        </div>
        <div className="flex flex-wrap gap-2 pb-2">
          {QUICK_PROMPTS.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp.prompt)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
            >
              <qp.icon size={14} className="text-indigo-400" />
              {qp.label}
            </button>
          ))}
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
            placeholder="Ask about your sleep trends..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white disabled:opacity-50 disabled:bg-zinc-700 transition-all"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
