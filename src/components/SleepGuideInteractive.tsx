import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Sparkles, 
  Thermometer, 
  Moon, 
  VolumeX, 
  Sun, 
  Coffee, 
  Dumbbell, 
  Brain,
  ArrowRight,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';

interface SleepGuideInteractiveProps {
  onClose: () => void;
  onOpenPersonalization: () => void;
}

const SECTIONS = [
  { id: 'intro', title: 'What is this Guide, and What Can It Do for Me?', shortTitle: '1. Intro', icon: <BookOpen size={18} /> },
  { id: 'hygiene', title: 'The Importance of Sleep Hygiene', shortTitle: '2. Hygiene', icon: <Brain size={18} /> },
  { id: 'laws', title: 'The Two Laws of Sleep', shortTitle: '3. Laws', icon: <Sparkles size={18} /> },
  { id: 'environment', title: 'How to Prep the Perfect Sleep Environment', shortTitle: '4. Env', icon: <Moon size={18} /> },
  { id: 'schedule', title: 'Structuring Your Day for Better Sleep', shortTitle: '5. Schedule', icon: <Sun size={18} /> },
  { id: 'conclusion', title: 'Getting to Know Yourself is the Best First Step', shortTitle: '6. Self', icon: <CheckCircle2 size={18} /> },
];

export default function SleepGuideInteractive({ onClose, onOpenPersonalization }: SleepGuideInteractiveProps) {
  const [activeSection, setActiveSection] = useState('intro');
  const [showReferences, setShowReferences] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const scrollToSection = (id: string) => {
    const element = document.getElementById(`guide-section-${id}`);
    if (element && scrollRef.current) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  // Intersection Observer to update active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id.replace('guide-section-', ''));
          }
        });
      },
      { threshold: 0.5, root: scrollRef.current }
    );

    SECTIONS.forEach((section) => {
      const el = document.getElementById(`guide-section-${section.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col md:flex-row overflow-hidden"
    >
      {/* Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-indigo-500 origin-left z-[210]"
        style={{ scaleX }}
      />

      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex w-72 border-r border-zinc-800 flex-col bg-zinc-900/50 backdrop-blur-xl">
        <div className="p-8 border-b border-zinc-800">
          <div className="flex items-center gap-3 text-indigo-400 mb-2">
            <Sparkles size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">SIA Learning Hub</span>
          </div>
          <h2 className="text-xl font-bold text-white">Sleep Mastery</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                activeSection === section.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {section.icon}
              <span className="text-sm font-bold">{section.title}</span>
              {activeSection === section.id && (
                <motion.div layoutId="active-nav" className="ml-auto">
                  <ChevronRight size={16} />
                </motion.div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-zinc-800">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            <X size={16} />
            Close Guide
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex flex-col border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-[205]">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Sleep Mastery</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-300 portrait:flex landscape:hidden"
            >
              {SECTIONS.find(s => s.id === activeSection)?.shortTitle || 'Menu'}
              <ChevronRight size={14} className={`transition-transform ${isMenuOpen ? 'rotate-90' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Landscape Scroll Strip */}
        <div className="hidden landscape:flex overflow-x-auto no-scrollbar border-t border-zinc-800/50 p-2 gap-2 flex-nowrap">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeSection === section.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {section.shortTitle}
            </button>
          ))}
        </div>

        {/* Portrait Dropdown */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="portrait:block landscape:hidden overflow-hidden bg-zinc-900 border-t border-zinc-800"
            >
              <div className="p-2 grid grid-cols-1 gap-1">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      scrollToSection(section.id);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      activeSection === section.id 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {section.icon}
                    <span className="text-xs font-bold">{section.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-zinc-950 scroll-smooth"
      >
        <div className="max-w-3xl mx-auto px-4 py-8 md:px-6 md:py-24 space-y-16 md:space-y-32">
          
          {/* Section 1: Intro */}
          <section id="guide-section-intro" className="space-y-8">
            <div className="space-y-4">
              <span className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em]">Section 01</span>
              <h1 className="text-3xl md:text-6xl font-black text-white tracking-tighter leading-[0.9]">
                The SIA Guide to <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Improving Your Sleep</span>
              </h1>
              <p className="text-xl text-zinc-400 leading-relaxed">
                The amount of sleep you get predicts your work performance, your mood, your physical health, and so much else. Here’s how to get more of it, starting tonight.
              </p>
            </div>
            
            <div className="prose prose-invert max-w-none text-zinc-400 space-y-6">
              <p>
                The internet is brimming with sleep advice. From this fact, we can draw two conclusions: millions of people want to improve their sleep, and there’s probably an enormous amount of misinformation about sleep floating around.
              </p>
              <p>
                This sleep guide strives to set itself apart from the others. We’ve written it to be comprehensive yet accessible, scientifically precise yet entirely actionable. As a map, it traverses not only the dreamscape, but also your day-to-day conduct.
              </p>
              <div className="p-8 bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem] space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles size={20} className="text-indigo-400" />
                  What this guide will tell you:
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>Why proper sleep hygiene is essential for everyone (not just people who have trouble sleeping).</span>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>Why we ground our recommendations in two principal laws of sleep.</span>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>How to look through the lens of sleep and adjust your behavior to benefit your nights, days, work, mood, and more.</span>
                  </li>
                </ul>
              </div>
              <p>
                We only deal in facts that could be defended to a room full of sleep scientists. We’ll back up our assertions with esteemed, peer-reviewed studies, and debunk dangerous myths.
              </p>
              <p className="text-xs italic opacity-60">
                (Disclaimer: this guide is not a substitute for medical advice. If you are suffering from insomnia or another sleep disorder, please consult a CBT-I specialist or a physician.)
              </p>
            </div>
          </section>

          {/* Section 2: Hygiene */}
          <section id="guide-section-hygiene" className="space-y-8">
            <div className="space-y-4">
              <span className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em]">Section 02</span>
              <h2 className="text-2xl md:text-5xl font-black text-white tracking-tighter leading-[0.95]">The Importance of Sleep Hygiene</h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                It may sound hyperbolic, but sleep is the foundation of all human performance. Neglecting your sleep hygiene has serious consequences.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl space-y-4">
                <h4 className="font-bold text-white">What is Sleep Hygiene?</h4>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Sleep hygiene is the upkeep of behaviors that influence the way you sleep. Many of them take place during the day and don’t involve literal snoozing—they’re included because they still have an effect on sleep.
                </p>
              </div>
              <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl space-y-4">
                <h4 className="font-bold text-white">The 70% Problem</h4>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  A troubling 70% of Americans identify as sleep-deprived. Often, they don't even realize their cognitive performance has taken a hit—they acclimate to the deprivation and think they're doing just fine.
                </p>
              </div>
            </div>

            <div className="p-8 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex items-start gap-6">
              <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-amber-600/20">
                <Brain size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">The "Zero Percent" Rule</h3>
                <p className="text-zinc-400 mt-2 leading-relaxed">
                  As Dr. Thomas Roth notes: "The number of people who can survive on 5 hours of sleep or less without any impairment, expressed as a percent of the population, and rounded to a whole number, is zero."
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Two Laws */}
          <section id="guide-section-laws" className="space-y-8">
            <div className="space-y-4">
              <span className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em]">Section 03</span>
              <h2 className="text-2xl md:text-5xl font-black text-white tracking-tighter leading-[0.95]">The Two Laws of Sleep</h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Everything we’ve built revolves around what we call the two laws of sleep: sleep debt and circadian rhythm.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="p-8 bg-gradient-to-br from-zinc-900 to-indigo-950/30 border border-indigo-500/20 rounded-[2.5rem] h-full flex flex-col">
                  <h3 className="text-xl font-bold text-indigo-400 mb-4">Law 1: Sleep Debt</h3>
                  <p className="text-zinc-400 leading-relaxed flex-1">
                    Sleep debt is the amount of sleep that you owe your body over the past 14 days. It is driven by <strong>Adenosine</strong>, an organic compound that accumulates in your brain every minute you’re awake.
                  </p>
                  <div className="mt-6 pt-6 border-t border-indigo-500/10">
                    <p className="text-xs text-indigo-300/60 uppercase tracking-widest font-bold">The Danger</p>
                    <p className="text-white text-sm font-bold mt-1">24 hours without sleep results in cognitive impairment equivalent to a BAC of 0.10%—higher than the legal driving limit.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="p-8 bg-gradient-to-br from-zinc-900 to-emerald-950/20 border border-emerald-500/20 rounded-[2.5rem] h-full flex flex-col">
                  <h3 className="text-xl font-bold text-emerald-400 mb-4">Law 2: Circadian Rhythm</h3>
                  <p className="text-zinc-400 leading-relaxed flex-1">
                    Your body’s internal clock. It dictates your ideal sleep and wake times, influencing eating habits, energy fluctuations, and hormone production via the <strong>suprachiasmatic nucleus (SCN)</strong>.
                  </p>
                  <div className="mt-6 pt-6 border-t border-emerald-500/10">
                    <p className="text-xs text-emerald-300/60 uppercase tracking-widest font-bold">Chronotypes</p>
                    <p className="text-white text-sm font-bold mt-1">40% are morning larks, 30% are night owls, and 30% fall somewhere in between.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Environment */}
          <section id="guide-section-environment" className="space-y-8">
            <div className="space-y-4">
              <span className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em]">Section 04</span>
              <h2 className="text-2xl md:text-5xl font-black text-white tracking-tighter leading-[0.95]">How to Prep the Perfect Sleep Environment</h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Some of the most important changes you can make are relatively easy, one-time tweaks. Remember the fundamental trio: cool, dark, and quiet.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl text-center space-y-4 group hover:border-indigo-500/50 transition-colors">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Thermometer size={32} />
                </div>
                <h4 className="font-bold text-white">Keep it Cool</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">The ideal sweet spot for your bedroom is around 65°F (18.3°C). A cooler room encourages sleep onset.</p>
              </div>
              <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl text-center space-y-4 group hover:border-purple-500/50 transition-colors">
                <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Moon size={32} />
                </div>
                <h4 className="font-bold text-white">Keep it Dark</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">Total darkness triggers melatonin. Artificial light tricks your brain into thinking it’s still daytime.</p>
              </div>
              <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl text-center space-y-4 group hover:border-emerald-500/50 transition-colors">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <VolumeX size={32} />
                </div>
                <h4 className="font-bold text-white">Keep it Quiet</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">Noise disturbs sleep architecture. Use white noise for auditory masking to reduce jarring peak noises.</p>
              </div>
            </div>
          </section>

          {/* Section 5: Schedule */}
          <section id="guide-section-schedule" className="space-y-12">
            <div className="space-y-4">
              <span className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em]">Section 05</span>
              <h2 className="text-2xl md:text-5xl font-black text-white tracking-tighter leading-[0.95]">Structuring Your Day for Better Sleep</h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Great sleep doesn't start at bedtime. It starts the moment you wake up.
              </p>
            </div>

            <div className="relative pl-8 border-l-2 border-zinc-800 space-y-12">
              <div className="relative">
                <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-amber-500 border-4 border-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-amber-400">
                    <Sun size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Morning Ramp-Up</span>
                  </div>
                  <h4 className="text-white font-bold">Wake Up & Light</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">Be consistent with your wake time. Get 10-15 minutes of direct sunlight immediately to suppress melatonin and raise cortisol.</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-zinc-950" />
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-indigo-400">
                    <Coffee size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Morning Peak</span>
                  </div>
                  <h4 className="text-white font-bold">Caffeine & Focus</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">Consume caffeine early (it takes 10 hours to dissipate). Tackle your most challenging tasks during this first energy peak.</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-zinc-500 border-4 border-zinc-950" />
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <Moon size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Afternoon Dip</span>
                  </div>
                  <h4 className="text-white font-bold">Midday Sluggishness</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">Optimal for low-stress work. A 10-20 minute power nap can provide a cognitive boost without causing sleep inertia.</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-zinc-950" />
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <Dumbbell size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Late Afternoon Peak</span>
                  </div>
                  <h4 className="text-white font-bold">The Second Wind</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">Exercise now for peak performance. The subsequent body temperature drop will perfectly align with your wind-down.</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-purple-500 border-4 border-zinc-950 shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-purple-400">
                    <Moon size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Evening Wind-Down</span>
                  </div>
                  <h4 className="text-white font-bold">Digital Sunset</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">Implement a "Digital Sunset" 1-2 hours before bed. Take a warm bath 90 mins before bed to plummet your core temperature.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Conclusion */}
          <section id="guide-section-conclusion" className="space-y-8">
            <div className="space-y-4">
              <span className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em]">Section 06</span>
              <h2 className="text-2xl md:text-5xl font-black text-white tracking-tighter leading-[0.95]">Getting to Know Yourself is the Best First Step</h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                The science provides the framework, but the exact timing of these biological events is entirely unique to you.
              </p>
            </div>

            <div className="prose prose-invert max-w-none text-zinc-400 space-y-6">
              <p>
                If you are a natural "Night Owl," your morning grogginess zone will last longer. If you are 65, your deep sleep architecture looks fundamentally different than a 20-year-old's. Reading the science is only half the battle.
              </p>
              <p className="font-bold text-white">
                This is where SIA comes in.
              </p>
              <p>
                You don't need to guess when your afternoon dip is happening. By tracking your sleep consistently and completing your Personalization Profile, SIA acts as your private sleep scientist.
              </p>
            </div>

            <div className="p-12 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[3rem] text-center space-y-8 shadow-2xl shadow-indigo-500/20">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl">
                <Sparkles size={40} />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-white tracking-tight">Personalize Your Experience</h3>
                <p className="text-indigo-100/80 max-w-md mx-auto">
                  Move from generic advice to specific biological blueprints. SIA learns your chronotype and alerts you to your optimal focus windows.
                </p>
              </div>
              <button 
                onClick={() => {
                  onClose();
                  onOpenPersonalization();
                }}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl flex items-center justify-center gap-3 mx-auto"
              >
                Start Personalization <ArrowRight size={18} />
              </button>
            </div>

            {/* References */}
            <div className="pt-24">
              <button 
                onClick={() => setShowReferences(!showReferences)}
                className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:text-zinc-300 transition-colors"
              >
                <ChevronRight size={14} className={`transition-transform ${showReferences ? 'rotate-90' : ''}`} />
                Scientific Citations & References
              </button>
              
              <AnimatePresence>
                {showReferences && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6 space-y-4">
                      <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-4">
                        {[
                          { title: "A two process model of sleep regulation", author: "Borbély, A. A. (1982)", journal: "Human Neurobiology, 1(3), 195-204" },
                          { title: "Fatigue, alcohol and performance impairment", author: "Dawson, D., & Reid, K. (1997)", journal: "Nature, 388(6639), 235-235" },
                          { title: "The Temperature Dependence of Sleep", author: "Harding, E. C., et al. (2019)", journal: "Frontiers in Neuroscience, 13, 336" },
                          { title: "Exposure to bright light and darkness to treat physiologic maladaptation to night work", author: "Czeisler, C. A., et al. (1990)", journal: "New England Journal of Medicine, 322(18), 1253-1259" },
                          { title: "The influence of white noise on sleep in subjects exposed to ICU noise", author: "Stanchina, M. L., et al. (2005)", journal: "Sleep Medicine, 6(5), 423-429" },
                          { title: "Social jetlag and obesity", author: "Roenneberg, T., et al. (2012)", journal: "Current Biology, 22(10), 939-943" },
                          { title: "Why We Sleep: Unlocking the Power of Sleep and Dreams", author: "Walker, M. (2017)", journal: "Scribner" }
                        ].map((ref, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <ExternalLink size={14} className="text-zinc-600 mt-1 flex-shrink-0" />
                            <p className="text-xs text-zinc-500 leading-relaxed">
                              {ref.author}. {ref.title}. <em>{ref.journal}</em>.
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <footer className="pt-12 pb-24 border-t border-zinc-900 text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.3em] font-black">End of Guide • SIA Learning Hub</p>
          </footer>
        </div>
      </main>
    </motion.div>
  );
}
