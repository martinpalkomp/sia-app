import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';
import { OverviewTab } from './OverviewTab';
import { LawsTab } from './LawsTab';
import { SystemModuleTab } from './SystemModuleTab';

export const GuideView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'laws', label: 'THE LAWS' },
    { id: 'environment', label: 'ENVIRONMENT' },
    { id: 'structure', label: 'DAILY STRUCTURE' },
    { id: 'tools', label: 'TOOLS' },
    { id: 'personalization', label: 'PERSONALIZATION' },
    { id: 'references', label: 'REFERENCES' }
  ];

  const getModuleContent = () => {
    switch (activeTab) {
      case 'environment':
        return {
          title: 'Environmental Control',
          description: 'Cool, dark, quiet conditions optimize your sleep architecture.',
          modules: [
            { id: 'temp', title: 'Thermal Environment', content: 'Core body temperature must drop by roughly 1-2 degrees Fahrenheit to initiate and maintain sleep. An optimal room temperature is critically between 60-67°F (15-19°C).' },
            { id: 'light', title: 'Light Exposure', content: 'Even low levels of ambient light can suppress melatonin production. Blackout curtains and elimination of all LED standbys are required for optimal deep sleep integrity.' },
            { id: 'noise', title: 'Acoustic Control', content: 'Sudden noises cause micro-arousals even if they do not lead to full awakenings, fragmenting sleep architecture. Continuous non-distracting sound (pink or brown noise) can mask disruptive frequency peaks.' }
          ]
        };
      case 'structure':
        return {
          title: 'Daily Structure',
          description: 'Align your day with your biology to support better nights.',
          modules: [
            { id: 'morning', title: 'Morning Light Viewing', content: 'Viewing sunlight within 30-60 minutes of waking anchors the circadian clock, triggering a cortisol release that starts the ~14-16 hour timer for melatonin onset.' },
            { id: 'caffeine', title: 'Caffeine Half-Life', content: 'Caffeine has an average half-life of 5-7 hours. A dose consumed at 4 PM means up to 50% remains active at 10 PM, competitively blocking adenosine receptors.' },
            { id: 'exercise', title: 'Exercise Timing', content: 'Vigorous exercise elevates core body temperature and sympathetic nervous system activity. Completing intense activity at least 3 hours before bed allows sufficient time for physical cool-down.' }
          ]
        };
      case 'tools':
        return {
          title: 'Tools & Interventions',
          description: 'What works, why it works, and when to use it.',
          modules: [
            { id: 'nsdr', title: 'Non-Sleep Deep Rest (NSDR)', content: 'NSDR protocols (including Yoga Nidra) guide the brain and body into states of deep relaxation, facilitating sympathetic down-regulation. Effective for replacing lost sleep or accelerating sleep onset.' },
            { id: 'light-therapy', title: 'Light Therapy', content: '10,000 lux light boxes used in the early morning can advance a delayed circadian phase and treat Seasonal Affective Disorder. Requires 20-30 minutes of indirect exposure.' },
            { id: 'thermal', title: 'Thermal Loading', content: 'Pre-sleep passive body heating (like a warm shower) shunts blood to the extremities. The subsequent rapid cooling of the core body temperature accelerates sleep latency.' }
          ]
        };
      case 'personalization':
        return {
          title: 'Personalization Profile',
          description: 'Your biology is unique. SIA learns what works for you.',
          modules: [
            { id: 'chronotype', title: 'Chronotype Adaptation', content: 'Genetic predispositions shift optimal circadian timing. SIA algorithms adjust scoring expectations based on your confirmed chronobiology.' },
            { id: 'stress', title: 'Autonomic Sensitivity', content: 'Users with high sympathetic dominance require extended wind-down protocols. SIA flags days with high perceived stress to dynamically recommend down-regulation tools.' }
          ]
        };
      case 'references':
        return {
          title: 'Scientific References',
          description: 'Peer-reviewed literature underpinning SIA intelligence.',
          modules: [
            { id: 'borbely', title: 'The Two-Process Model', content: 'Borbély, A. A. (1982). A two process model of sleep regulation. Human Neurobiology, 1(3), 195-204.' },
            { id: 'wright', title: 'Circadian Entrainment', content: 'Wright Jr, K. P., et al. (2013). Entrainment of the human circadian clock to the natural light-dark cycle. Current Biology, 23(16), 1554-1558.' },
            { id: 'dement', title: 'Sleep Architecture', content: 'Carskadon, M. A., & Dement, W. C. (2011). Normal human sleep: an overview. Principles and practice of sleep medicine, 5, 16-26.' }
          ]
        };
      default:
        return null;
    }
  };

  const moduleData = getModuleContent();

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div id="guide-header" className="relative pb-8 border-b border-zinc-800/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white mb-2 uppercase">SIA Guide</h1>
            <p className="text-sm font-sans text-zinc-400">Evidence-based knowledge for better sleep</p>
          </div>
          <div className="flex items-center gap-4 bg-[#0B0F17] border border-zinc-800/60 rounded-xl p-4 shadow-sm">
             <div className="text-zinc-500 hidden sm:block"><BookOpen size={24} /></div>
             <div>
                <p className="font-black tracking-widest text-[10px] md:text-xs uppercase text-slate-400 mb-1">Science. Signals. Self.</p>
                <p className="text-xs md:text-sm font-sans text-zinc-500">Everything in this guide is grounded in peer-reviewed research and aligned with the two laws of sleep.</p>
             </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-6 mt-8 overflow-x-auto pb-2 scrollbar-none">
           {tabs.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`whitespace-nowrap text-[10px] md:text-xs font-black tracking-widest uppercase pb-2 border-b-2 transition-colors ${
                 activeTab === tab.id 
                 ? 'text-white border-indigo-500' 
                 : 'text-zinc-600 border-transparent hover:text-zinc-400'
               }`}
             >
               {tab.label}
             </button>
           ))}
        </div>
      </div>

      {/* Content Area */}
      <div id="guide-content" className="mt-8">
        {activeTab === 'overview' && (
           <OverviewTab setActiveTab={setActiveTab} />
        )}
        {activeTab === 'laws' && (
           <LawsTab />
        )}
        {moduleData && (
           <SystemModuleTab 
             title={moduleData.title}
             description={moduleData.description}
             modules={moduleData.modules}
           />
        )}
        {!moduleData && activeTab !== 'overview' && activeTab !== 'laws' && (
          <div className="flex flex-col items-center justify-center p-12 border border-zinc-800/50 border-dashed rounded-2xl h-[40vh]">
             <BookOpen size={24} className="text-zinc-700 mb-4" />
             <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">SIA Calibration in Progress</p>
             <p className="text-zinc-600 text-xs lg:text-sm mt-2">Section structure pending.</p>
          </div>
        )}
      </div>
    </div>
  );
};
