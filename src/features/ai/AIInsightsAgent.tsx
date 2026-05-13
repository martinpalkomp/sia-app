import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useSleepStore } from '../../store/useSleepStore';
import { getAIPageTheme } from '../../utils/themeUtils';
import AIMessageList from './AIMessageList';
import AIChatInput from './AIChatInput';
import { ChatMessage, subscribeToChatHistory } from '../../services/ai/chatPersistence';
import { handleAssistantResponse, getAnalyzingLabel, ChatContextPayload } from '../../services/ai/chatOrchestrator';
import { DailyLog, UnstructuredData } from '../../types';

export default function AIInsightsAgent({
  onForecastUpdate
}: {
  onForecastUpdate?: (metrics: { quality: number; alertness: number; energy: number } | null) => void;
} = {}) {
  const { user, userProfile, personalizationProfile, isProfileLoading, tier, dataDepth, logs: userLogs } = useUser();
  const theme = useMemo(() => getAIPageTheme(tier), [tier]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingLabel, setAnalyzingLabel] = useState('');
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cachedLogsRef = useRef<DailyLog[] | null>(null);
  const cachedUnstructuredRef = useRef<UnstructuredData[] | null>(null);
  const cachedProfileRef = useRef<any | null>(null);

  // Load chat history
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeToChatHistory(user.uid, (fetchedMessages) => {
      setMessages(fetchedMessages);
    }, (error) => {
      setErrorMsg("Failed to load chat history. Please try again later.");
    });

    return () => unsubscribe();
  }, [user]);

  const isEnhanced = !!personalizationProfile;

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading || !user || !userProfile || isProfileLoading) return;
    
    setErrorMsg(null);
    setIsLimitReached(false);
    setIsLoading(true);
    setIsAnalyzing(true);
    setAnalyzingLabel(getAnalyzingLabel(text));

    try {
      const historyCtx = messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'model' as 'user'|'model',
        parts: [{ text: m.content }]
      }));

      const logsArray = Object.values(userLogs).sort((a, b) => b.date.localeCompare(a.date));

      const ctx: ChatContextPayload = {
        userUid: user.uid,
        userTier: userProfile.tier,
        dataDepthLevel: dataDepth.level as 1|2|3|4,
        dataDepthCount: dataDepth.count,
        personalizationProfile,
        history: historyCtx,
        onForecastUpdate: onForecastUpdate ? (m) => onForecastUpdate(m) : undefined,
        logsCache: logsArray,
        profileCache: personalizationProfile,
        unstructuredCache: cachedUnstructuredRef.current || undefined,
      };

      await handleAssistantResponse(text, ctx, () => setIsLimitReached(true));
    } catch (error: any) {
      console.error("Chat orchestration error:", error);
      setErrorMsg("I'm sorry, I encountered an error. Please try again later.");
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
      setAnalyzingLabel('');
    }
  };

  if (isProfileLoading || !user) {
    return (
      <div className="flex flex-col h-[80svh] md:h-[80vh] bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-zinc-300 font-medium animate-pulse">Syncing Profile...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[80svh] md:h-[80vh] w-full bg-zinc-950 border ${theme.border} rounded-none md:rounded-3xl overflow-hidden animate-scanning relative`}>
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
            <h3 className="text-xl md:text-2xl font-bold text-zinc-50 tracking-tight">Sleep Intelligence Agent</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${isEnhanced ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                {isEnhanced ? 'Enhanced Analysis' : 'Basic'}
              </span>
            </div>
          </div>
        </div>
        {isAnalyzing && (
          <div className={`flex items-center gap-2 px-3 py-1 ${theme.bg} border ${theme.border} rounded-full`}>
            <div className={`w-1.5 h-1.5 ${theme.accent} rounded-full animate-pulse`} />
            <span className={`text-[9px] font-black ${theme.text} uppercase tracking-widest`}>{analyzingLabel}</span>
          </div>
        )}
      </div>

      <AIMessageList 
        messages={messages}
        isAnalyzing={isAnalyzing}
        analyzingLabel={analyzingLabel}
        userPhotoURL={user.photoURL}
        userName={user.displayName}
      />
      
      {errorMsg && (
        <div className="px-4 py-2 bg-red-900/20 text-red-400 text-xs text-center">
          {errorMsg}
        </div>
      )}

      <AIChatInput 
        onSend={handleSend}
        isLoading={isLoading}
        isAnalyzing={isAnalyzing}
        dataDepthLevel={dataDepth.level}
        dataDepthCount={dataDepth.count}
        tier={userProfile.tier}
        chatMessagesUsed={userProfile.quota?.chatMessagesUsed || 0}
        isLimitReached={isLimitReached}
      />
    </div>
  );
}
