import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, FileText, ChevronLeft, AlertTriangle } from 'lucide-react';

interface LegalProps {
  onBack: () => void;
}

export default function Legal({ onBack }: LegalProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'medical'>('terms');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <div className="flex flex-wrap bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
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
          <button
            onClick={() => setActiveTab('medical')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
              activeTab === 'medical'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Medical Waiver
          </button>
        </div>
      </div>

      <div className="bg-[#0B0F17] border border-zinc-800/60 rounded-3xl p-8 md:p-12 shadow-sm">
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
                  <h2 className="text-2xl font-bold tracking-tight">SIA - Terms of Use</h2>
                </div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Last Updated: June 2026</p>
              </div>

              <div className="space-y-6 text-zinc-300 leading-relaxed font-sans text-sm">
                <p>Welcome to SIA (Sleep Intelligence Agent). By accessing or using our platform, you agree to comply with and be bound by the following Terms of Use. Please review them carefully.</p>

                <hr className="border-t border-zinc-800/60 my-6" />

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">1. Nature of Service & Tier Architecture</h3>
                  <p>SIA offers three distinct service tiers:</p>
                  <ul className="space-y-2 pl-4 list-disc text-zinc-400">
                    <li><strong className="text-white">Basic Tier (Free)</strong>: Operates without LLM overhead. Access is limited to manual sleep logging and deterministic science-fact matching via localized code scripts only.</li>
                    <li><strong className="text-white">Enhanced Tier (Data-for-Research Value Exchange)</strong>: Provides free access to Gemini-driven weekly pattern decoders conditioned on explicit, freely given, granular consent under GDPR Article 9. User data is systematically anonymized (all Personally Identifiable Information stripped and replaced with structural IDs) and aggregated for academic, clinical, and lifestyle sleep research.</li>
                    <li><strong className="text-white">Pro Tier (Premium Subscription)</strong>: Unlocks the clinical-grade 90-log rolling Deep Analysis engine and interactive conversational coaching. Processed securely via Google Play Billing.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">2. Payment, Subscriptions & Google Play Billing</h3>
                  <p>The Pro Tier is available as an auto-renewing premium subscription priced at €6.99/month or €49.99/year.</p>
                  <ul className="space-y-2 pl-4 list-disc text-zinc-400">
                    <li><strong className="text-white">Billing</strong>: Payment will be charged through Google Play Billing at confirmation of purchase.</li>
                    <li><strong className="text-white">Renewal</strong>: Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period.</li>
                    <li><strong className="text-white">Cancellation</strong>: You can manage your subscription and turn off auto-renewal by going to your Google Play Account Settings after purchase. Partial refunds for unused periods are not provided.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">3. Commercial Hardware and Affiliate Ecosystem</h3>
                  <p>SIA contextually recommends targeted physical sleep environment optimizations, such as cooling elements or smart hardware, based on environmental sleep signals. These recommendations may feature contextual affiliate partnerships natively integrated within the frameworks. If you purchase hardware through our links, we may receive a commission.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">4. Intellectual Property & Codebase Ownership</h3>
                  <p>SIA and its licensors retain full and absolute proprietary rights over the SIA system design, deterministic pattern engines, system prompts, custom knowledge bases, and codebase. The service is protected by European and international intellectual property laws.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">5. Age & Account Security Restraints</h3>
                  <p>You must be at least 18 years of age (or the age of legal majority in your jurisdiction) to use SIA. By creating an account, you represent and warrant that you meet this strict adult verification requirement. You are solely responsible for maintaining the confidentiality of your account credentials.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">6. Limitation of Liability & Indemnification</h3>
                  <p>Use of the software's behavioral tracking parameters is entirely at your own risk. To the maximum extent permitted by applicable law, SIA and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages. You agree to indemnify and hold SIA harmless from any claims, losses, liability, damages, and/or costs arising from your use of the platform.</p>
                </section>
                
                <hr className="border-t border-zinc-800/60 my-6" />
                <p className="font-bold text-zinc-300">Governed strictly by the laws of Belgium and the European Union.</p>
              </div>
            </motion.div>
          ) : activeTab === 'privacy' ? (
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
                  <h2 className="text-2xl font-bold tracking-tight">SIA - Privacy Policy (GDPR Compliance)</h2>
                </div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Last Updated: June 2026</p>
              </div>

              <div className="space-y-6 text-zinc-300 leading-relaxed font-sans text-sm">
                <p>SIA is committed to securing your telemetry and personal data. This privacy policy outlines our strict data handling practices under the General Data Protection Regulation (GDPR).</p>

                <hr className="border-t border-zinc-800/60 my-6" />

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">1. Data Controller Declaration</h3>
                  <p>The Data Controller for SIA operates under European Union jurisdiction and is based in the Brussels-Capital Region, Belgium. All data processing activities are governed strictly by the laws of Belgium and the European Union.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">2. Special Category Data Collection</h3>
                  <p>By using SIA, you may input health telemetry which qualifies as special category data under GDPR Article 9. We explicitly track:</p>
                  <ul className="space-y-2 pl-4 list-disc text-zinc-400">
                    <li><strong className="text-white">Sleep Logs</strong>: Historical sleep architecture and quantitative nightly metrics.</li>
                    <li><strong className="text-white">Chat Strings</strong>: Your contextual conversational inputs regarding sleep habits.</li>
                    <li><strong className="text-white">Lifestyle Factors</strong>: Environmental configurations, routines, stressors, and specific daily behaviors.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">3. The Enhanced Tier Anonymization Pipeline</h3>
                  <p>Users in the Enhanced Tier participate in our Data-for-Research Value Exchange. To protect your privacy:</p>
                  <ul className="space-y-2 pl-4 list-disc text-zinc-400">
                    <li><strong className="text-white">Data Minimization</strong>: We deploy a rigorous data minimization process where data ingested is strictly limited to research requirements.</li>
                    <li><strong className="text-white">Anonymization Protocol</strong>: All Personally Identifiable Information (PII) is permanently stripped and replaced with randomized cryptographic structural IDs before ingestion by academic, clinical, or lifestyle sleep research pools.</li>
                    <li><strong className="text-white">Irreversibility</strong>: The anonymization pipeline ensures that aggregate data cannot be re-identified or traced back to your individual identity.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">4. Third-Party AI Data Processing</h3>
                  <p>Processing of unstructured text and generation of insights occurs via secure Google Gemini API serverless proxy channels.</p>
                  <ul className="space-y-2 pl-4 list-disc text-zinc-400">
                    <li><strong className="text-white">Strict Boundaries</strong>: We operate under rigid enterprise agreements ensuring that your data is never utilized, retained, or ingested to train public LLM baseline models.</li>
                    <li><strong className="text-white">Ephemeral Processing</strong>: Data transferred to the Gemini API is used solely for the real-time fulfillment of insight operations.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">5. Your Rights Under GDPR</h3>
                  <p>SIA natively supports your absolute rights over your data natively within the User Interface:</p>
                  <ul className="space-y-2 pl-4 list-disc text-zinc-400">
                    <li><strong className="text-white">Right to Access</strong>: You may export your personal sleep ledger securely at any time from your Account view.</li>
                    <li><strong className="text-white">Right to Be Forgotten</strong>: You may execute an instantaneous, permanent deletion of your Firebase authentication profile and corresponding Firestore log collections via our UI. This process is immediate and irreversible.</li>
                    <li><strong className="text-white">Right to Withdraw Consent</strong>: You can dynamically toggle your participation in the Data-for-Research anonymous aggregation program at any time directly from your settings.</li>
                  </ul>
                </section>
                
                <hr className="border-t border-zinc-800/60 my-6" />
                <p className="text-zinc-400">For any privacy inquiries or to exercise rights not directly accessible via the UI, please contact our Data Protection Officer at <a href="mailto:privacy@siaplatform.eu" className="text-indigo-400 hover:underline">privacy@siaplatform.eu</a>.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="medical"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-amber-500 mb-4">
                  <AlertTriangle size={24} />
                  <h2 className="text-2xl font-bold tracking-tight">SIA - Medical Advice Waiver & Clinical Disclaimer</h2>
                </div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Last Updated: June 2026</p>
              </div>

              <div className="space-y-6 text-zinc-300 leading-relaxed font-sans text-sm">
                <p>Please read this Medical Advice Waiver carefully. By utilizing the SIA (Sleep Intelligence Agent) platform, you acknowledge and agree to the absolute limitations of the information provided.</p>
                
                <hr className="border-t border-zinc-800/60 my-6" />

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">1. Not a Medical Device</h3>
                  <p>SIA is a self-improvement, behavioral tracking instrument intended for educational and lifestyle optimization purposes only.</p>
                  <ul className="space-y-2 pl-4 list-disc text-zinc-400">
                    <li><strong className="text-white">Strict Limitation</strong>: SIA is not an FDA or EMA-cleared diagnostic tool, medical countermeasure, or medical device.</li>
                    <li>SIA is not intended to be used in the diagnosis, cure, mitigation, treatment, or prevention of any disease or condition.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">2. Orthosomnia Mitigation Warning</h3>
                  <p>Users should be aware of the risk of developing <em>orthosomnia</em>—an unhealthy obsession with achieving perfect sleep data driven by behavioral tracking tools.</p>
                  <ul className="space-y-2 pl-4 list-disc text-zinc-400">
                    <li><strong className="text-white">Qualitative Suggestions</strong>: All insights, metrics, timeline calculations, and generative patterns provided by SIA should be viewed strictly as qualitative behavioral suggestions rather than absolute medical benchmarks.</li>
                    <li><strong className="text-white">Performance Anxiety</strong>: If reviewing your sleep data causes performance anxiety, distress, or negatively impacts your ability to fall asleep, we strongly advise you to pause use of the application and recalibrate your relationship with tracking tools.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-white tracking-widest uppercase">3. No Physician-Patient Relationship</h3>
                  <p>Use of the SIA platform does not establish an advisory or professional healthcare relationship.</p>
                  <ul className="space-y-2 pl-4 list-disc text-zinc-400">
                    <li>State unequivocally that <strong className="text-white">no AI-generated structured output, timeline calculation, or conversational chat response constitutes a clinical diagnosis, medical treatment, or healthcare consultation</strong>.</li>
                    <li>Our platform cannot and does not replace the judgment of a credentialed medical professional. Always seek the advice of your physician or other qualified healthcare provider regarding any suspected sleep disorders (e.g., Insomnia, Sleep Apnea, Narcolepsy) or medical condition.</li>
                    <li>Never disregard professional medical advice or delay in seeking it because of something you have read, extrapolated, or generated within the SIA platform.</li>
                  </ul>
                </section>
                
                <hr className="border-t border-zinc-800/60 my-6" />
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                  <p className="text-sm text-amber-200/90 font-medium">
                    If you believe you have a medical emergency, immediately call your local emergency services or consult your medical provider.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
