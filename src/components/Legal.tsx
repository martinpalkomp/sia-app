import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, FileText, ChevronLeft } from 'lucide-react';

interface LegalProps {
  onBack: () => void;
}

export default function Legal({ onBack }: LegalProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
              activeTab === 'terms'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Terms of Use
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
              activeTab === 'privacy'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Privacy Policy
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] p-8 md:p-12">
        <AnimatePresence mode="wait">
          {activeTab === 'terms' ? (
            <motion.div
              key="terms"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-indigo-400 mb-4">
                  <FileText size={24} />
                  <h2 className="text-2xl font-bold tracking-tight">Terms of Use</h2>
                </div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Last Updated: March 2026</p>
              </div>

              <div className="space-y-6 text-zinc-300 leading-relaxed">
                <section className="space-y-3">
                  <h3 className="text-lg font-bold text-white">1. Nature of Service</h3>
                  <p>SIA (Sleep Intelligence Agent) is an AI-driven self-improvement tool. It provides insights based on your inputs and patterns.</p>
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                    <p className="text-sm text-amber-200/80">
                      <strong className="text-amber-400">Medical Disclaimer:</strong> SIA is not a medical professional. The insights provided are for educational and self-improvement purposes only. If you are experiencing a medical emergency or chronic sleep disorder, please consult a licensed physician.
                    </p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold text-white">2. User Responsibilities</h3>
                  <p>You must be at least 18 years old to use this app. You agree to provide accurate information and are responsible for maintaining the security of your account credentials.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold text-white">3. Monetization & Data Use</h3>
                  <p>By using SIA, you acknowledge that the service may be supported by marketing partnerships. We may use your usage patterns to suggest relevant products or services.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold text-white">4. Limitation of Liability</h3>
                  <p>We are not liable for any actions taken based on SIA’s AI-generated suggestions. Use of the app is at your own risk.</p>
                </section>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-emerald-400 mb-4">
                  <Shield size={24} />
                  <h2 className="text-2xl font-bold tracking-tight">Privacy Policy</h2>
                </div>
                <p className="text-sm text-zinc-400 font-medium">How We Protect and Use Your Sleep Intelligence</p>
              </div>

              <div className="space-y-6 text-zinc-300 leading-relaxed">
                <section className="space-y-3">
                  <h3 className="text-lg font-bold text-white">1. Data Collection</h3>
                  <p>We collect information you provide directly (sleep logs, chat prompts) and technical data (device type, time zones).</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold text-white">2. Use of Data for Scientific Research</h3>
                  <p>A core mission of SIA is to contribute to the global understanding of sleep.</p>
                  <ul className="space-y-4 pl-4">
                    <li className="list-disc"><strong className="text-white">Anonymization:</strong> Data shared with researchers is anonymized and pseudonymized. Your name and email are stripped away and replaced with a unique ID code.</li>
                    <li className="list-disc"><strong className="text-white">Purpose:</strong> This data helps academic and clinical researchers study sleep patterns, night terrors, and lifestyle correlations.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold text-white">3. Use of Data for Marketing</h3>
                  <p>To keep our basic services accessible, we may use your non-sensitive behavior patterns (e.g., "User often logs in at 11 PM") to show you personalized advertisements or partner offers for sleep-related products. We never sell your raw chat transcripts or health logs to third-party advertisers.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold text-white">4. Data Isolation & Security</h3>
                  <p>Your data is stored securely using Firebase. Our "Security Rules" ensure that no other user can access your logs. You have the right to:</p>
                  <ul className="space-y-2 pl-4">
                    <li className="list-disc"><strong className="text-white">Access:</strong> Request a copy of your data.</li>
                    <li className="list-disc"><strong className="text-white">Delete:</strong> Request total deletion of your account and associated logs.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold text-white">5. AI Processing</h3>
                  <p>Your data is processed using Google Gemini via secure API channels. This data is used to generate your personalized insights and is not used by Google to train their public models.</p>
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
