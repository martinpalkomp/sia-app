import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { AvatarFrame } from '../../components/UI';
import { ChatMessage } from '../../services/ai/chatPersistence';

interface AIMessageListProps {
  messages: ChatMessage[];
  isAnalyzing: boolean;
  analyzingLabel: string;
  userPhotoURL?: string | null;
  userName?: string | null;
}

export default function AIMessageList({
  messages,
  isAnalyzing,
  analyzingLabel,
  userPhotoURL,
  userName
}: AIMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAnalyzing]);

  return (
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
                src={msg.role === 'user' ? (userPhotoURL || undefined) : "https://i.imgur.com/MnI5hn3.png"} 
                alt={msg.role === 'user' ? (userName || 'User') : 'SIA'}
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
  );
}
