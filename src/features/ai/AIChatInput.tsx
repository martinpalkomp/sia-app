import React, { useState } from 'react';
import { Send, Loader2, ChevronDown, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { ChatQuotaManager } from '../../services/ai/chatQuotaManager';

import { UserTier } from '../../types';

interface AIChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  isAnalyzing: boolean;
  dataDepthLevel: number;
  dataDepthCount: number;
  tier: UserTier;
  chatMessagesUsed: number;
  isLimitReached: boolean;
}

export default function AIChatInput({
  onSend,
  isLoading,
  isAnalyzing,
  dataDepthLevel,
  dataDepthCount,
  tier,
  chatMessagesUsed,
  isLimitReached
}: AIChatInputProps) {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const getQuickPrompts = (t: string, maturityLevel: number) => {
    // LEVEL 1 — Baseline (0–6 logs): No correlations yet, only reflective
    const level1 = [
      { label: 'Last Night',    prompt: 'How did my last logged night look? Any notable patterns from the first logs?' },
      { label: 'Sleep Timing',  prompt: 'What time do I typically go to bed based on my logs so far?' },
      { label: 'Energy Link',   prompt: 'Is there any early sign of a link between my sleep quality and next-day energy?' },
      { label: 'Log Quality',   prompt: 'How complete is my data so far and what should I prioritise logging next?' },
    ];
    // LEVEL 2 — Trends (7–13 logs)
    const level2Basic = [
      { label: 'Best Night',    prompt: 'What factors were present on my best-quality sleep nights?' },
      { label: 'Worst Night',   prompt: 'What do my lowest-quality nights have in common?' },
      { label: 'Weekly Rhythm', prompt: 'Which days of the week do I sleep best and worst?' },
      { label: 'Consistency',   prompt: 'How consistent is my bedtime and how does that affect quality?' },
    ];
    const level2Enhanced = [
      { label: 'Best Night',      prompt: 'What factors were present on my best-quality sleep nights?' },
      { label: 'Caffeine Effect', prompt: 'Correlate my caffeine intake timing with sleep quality scores.' },
      { label: 'Stress Link',     prompt: 'How does logged stress level affect next-morning alertness?' },
      { label: 'Exercise Timing', prompt: 'Does the time I exercise correlate with better or worse sleep?' },
      { label: 'Weekly Rhythm',   prompt: 'Which days of the week do I sleep best and worst?' },
      { label: 'Gadget Report',   prompt: 'Which sleep tools correlate with better efficiency in my logs?' },
    ];
    // LEVEL 3 — Deep Analysis (14–89 logs)
    const level3Basic = [
      { label: 'Trend Analysis', prompt: 'What is my overall sleep quality trend across my history?' },
      { label: 'Best Period',    prompt: 'What was my best sustained sleep period and what habits defined it?' },
      { label: 'Consistency',    prompt: 'Score my long-term bedtime consistency and its effect on quality.' },
      { label: 'Top Disruptor',  prompt: 'What is my single most confirmed sleep disruptor across all logs?' },
    ];
    const level3Enhanced = [
      { label: 'Chronotype',      prompt: 'Define my chronotype from my sleep timing history.' },
      { label: 'Trigger Map',     prompt: 'What are my top 3 confirmed sleep disruptors across all data?' },
      { label: 'Recovery Index',  prompt: 'Build a 4-week rolling recovery index from quality and efficiency.' },
      { label: 'Optimise Tonight',prompt: 'Based on all patterns, what one change would most improve tonight?' },
      { label: 'Provider Brief',    prompt: 'Summarise my sleep health concisely for a clinical consultation.' },
      { label: 'Seasonal Shift',  prompt: 'Has my sleep quality or timing shifted across different months?' },
    ];
  
    const level4Basic = level3Basic;
    const level4Enhanced = level3Enhanced;
  
    if (maturityLevel === 1) return level1;
    if (maturityLevel === 2) return (t === 'Basic') ? level2Basic : level2Enhanced;
    if (maturityLevel === 3) return (t === 'Basic') ? level3Basic : level3Enhanced;
    return (t === 'Basic') ? level4Basic : level4Enhanced;
  };

  const handleSendPrompt = (promptText: string) => {
    onSend(promptText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !isAnalyzing) {
      handleSendPrompt(input);
      setInput('');
    }
  };

  return (
    <>
      <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between mb-2 w-full text-left"
        >
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide ml-1">Quick Ask</p>
          <ChevronDown size={12} className={`text-zinc-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded && (
          <div className="flex flex-wrap gap-2 pb-2">
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-2 px-1">
              {dataDepthLevel === 1 ? 'Starter questions — log 14 nights to unlock patterns' :
               dataDepthLevel === 2 ? 'Pattern questions — log 14 nights to unlock deep analysis' :
               tier === 'Basic' ? 'Deep questions — upgrade for full clinical set' :
               'Full clinical set'}
            </p>
            {getQuickPrompts(tier, dataDepthLevel).map((qp, i) => (
              <button
                key={i}
                onClick={() => handleSendPrompt(qp.prompt)}
                disabled={isLoading || isAnalyzing}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-indigo-500/40 rounded-2xl text-[10px] font-medium uppercase tracking-wide text-zinc-300 hover:text-white transition-all disabled:opacity-50"
              >
                {qp.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 md:p-4 bg-zinc-900 border-t border-zinc-800">
        {dataDepthLevel < 2 && (
          <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-amber-400 uppercase tracking-wide">Low Data Depth</p>
              <p className="text-[9px] text-zinc-400 leading-relaxed">
                SIA is in Initializing mode. Log 14 days for better correlations. (Progress: {dataDepthCount}/14)
              </p>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative">
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
                animate={{ width: `${Math.min(100, (chatMessagesUsed / ChatQuotaManager.getQuotaLimit(tier)) * 100)}%` }}
                className={`h-full ${isLimitReached ? 'bg-red-500' : 'bg-indigo-500'}`}
              />
            </div>
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide">
              {chatMessagesUsed} / {ChatQuotaManager.getQuotaLimit(tier)} Messages
            </span>
          </div>
          
          {tier === 'Basic' && (
            <button className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wide hover:text-indigo-300 transition-colors">
              Upgrade for More
            </button>
          )}
        </div>
      </div>
    </>
  );
}
