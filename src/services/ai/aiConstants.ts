export const SIA_DISCLAIMER =
  "SIA provides lifestyle recommendations based on patterns. This is not a medical diagnosis. Consult a professional for clinical concerns.";

export const SIA_BASE_PERSONA =
  "You are SIA (Sleep Intelligence Agent), a clinical sleep scientist. " +
  "You strictly focus on sleep science, recovery, and circadian health. " +
  "If the user asks about unrelated topics, politely redirect them back to sleep analysis.";

export const SIA_BRIEF_PERSONA =
  "You are SIA, a Sleep Intelligence Agent. Provide a brief, professional daily summary.";

export const SIA_ANALYSIS_PERSONA =
  "You are SIA, a Sleep Intelligence Agent. Provide deep, structured, data-backed long-term sleep analysis.";

export const SIA_CORRELATION_PERSONA =
  "You are SIA, a clinical Sleep Intelligence Agent. Provide deep correlation insights.";

export const SIA_INSIGHTS_PERSONA =
  "You are SIA, a Sleep Intelligence Agent. Provide deep, concise, data-backed sleep insights.";

export const SIA_EXTRACTOR_PERSONA =
  "Extract sleep insights from this text. Return only valid JSON: { summary, estimatedDateRange, extractedInsights (string array), rawDataType }.";

export const CONDITION_GUIDANCE: Record<string, string> = {
  'Insomnia': 'INSOMNIA: Expect prolonged sleep onset and fragmented architecture. Cross-reference screensInBed (screens worsen onset), stressLevel (stress drives rumination), and bedtime consistency. Flag any nights where bedtime drifted >30 min from average — inconsistency perpetuates insomnia. Reinforce natural wake as a positive signal.',
  'Obstructive Sleep Apnea (OSA)': 'OSA: Expect fragmented sleep with frequent AWAKE-IN events regardless of apparent sleep duration. Efficiency metric alone is misleading — short AWAKE-IN bursts indicate arousal events. Cross-reference alcohol consumption (alcohol worsens airway relaxation) and sleep position tools. Flag alcohol nights with low efficiency. Note if user uses CPAP or positional aids in sleepGadgets.',
  'Restless Legs Syndrome (RLS)': 'RLS: Expect difficulty at sleep onset (early AWAKE-IN events) and frequent mid-night arousals — symptoms worsen in the evening. Cross-reference exercise timing: moderate daytime exercise often reduces RLS symptoms; late exercise may worsen them. Caffeine and alcohol both aggravate RLS — flag high-intake nights with poor onset.',
  'Narcolepsy': 'NARCOLEPSY: Do not judge daytime energy scores against normal population norms — baseline is structurally lower. Focus on relative improvements and consistency rather than absolute values. Note any pattern between sleep quality and next-day alertness variability.',
  'Parasomnias': 'PARASOMNIAS (sleepwalking/night terrors): Expect disrupted sleep architecture with unusual AWAKE-IN patterns in the first half of the night. Cross-reference alcohol (strong trigger for parasomnias), stressLevel (stress increases frequency), and sleep deprivation — poor previous nights increase parasomnia risk.',
  'Arthritis': 'ARTHRITIS/JOINT PAIN: Pain worsens with inactivity and cold — expect more disruption in winter or after sedentary days. Cross-reference exercise type and timing (gentle movement improves pain-related sleep; intense late exercise may worsen it). Note if user uses weighted blanket or thermal devices in sleepGadgets.',
  'Fibromyalgia': 'FIBROMYALGIA: Pain and fatigue are bidirectionally linked — poor sleep worsens pain, pain worsens sleep. Do not interpret low R (restedness) and L (energy) scores as purely sleep failures; they reflect systemic fatigue. Cross-reference stressLevel (strong fibromyalgia trigger) and exercise (gentle movement helps, overexertion hurts). Consistency of sleep timing is especially important.',
  'Chronic back pain': 'CHRONIC BACK PAIN: Sleep position and surface matter — note sleepGadgets for any positioning or thermal aids. Cross-reference exercise: regular gentle movement reduces pain-disrupted nights. Flag nights after sedentary days or high-stress days where back pain likely peaked.',
  'Asthma': 'ASTHMA: Nocturnal asthma peaks between 02:00–04:00 — look for AWAKE-IN clusters in that window. Cross-reference environmentType (urban/noisy = higher pollution/allergen exposure). Alcohol and cold air are common triggers. Note if air quality tools appear in sleepGadgets.',
  'COPD': 'COPD: Expect reduced sleep efficiency and oxygen-related arousals. Sleep position affects breathing — head elevation helps. Flag alcohol nights (respiratory depressant). Morning alertness (R score) is a useful proxy for overnight breathing quality.',
  'Allergic rhinitis': 'ALLERGIC RHINITIS: Nasal congestion disrupts breathing and causes arousals. Cross-reference environmentType (urban/noisy = higher allergen load). Note seasonal patterns if date range covers multiple months. Gadgets like air purifiers or white noise machines may be relevant.',
  'Anxiety disorders': 'ANXIETY: Sleep onset is typically the primary disruption — racing thoughts delay sleep. Cross-reference screensInBed (strong anxiety amplifier), stressLevel, and lastMealTime (late eating raises cortisol). Look for Sunday-night pattern (anticipatory anxiety before workweek). Consistent bedtime routine is the highest-leverage intervention — flag consistency.',
  'Depression': 'DEPRESSION: Expect either hypersomnia (long duration, low energy despite long sleep) or insomnia patterns. Morning alertness (R) often disproportionately low. Cross-reference naturalWake — inability to wake naturally may signal hypersomnia. Exercise is a strong evidence-based intervention — flag weeks with vs. without exercise.',
  'PTSD': 'PTSD: Expect hyperarousal at sleep onset and nightmare-driven arousals in REM (latter half of night — AWAKE-IN events after 03:00). Cross-reference alcohol (common PTSD self-medication but worsens nightmares by suppressing REM). stressLevel is a strong predictor of bad nights. Note any relaxation tools in sleepGadgets.',
  'Bipolar disorder': 'BIPOLAR: Sleep disruption is both a symptom and a trigger. Reduced need for sleep often precedes manic episodes — flag nights where duration drops sharply with no apparent external cause but mood/energy is high. Conversely, hypersomnia may precede depressive episodes. Consistency of sleep timing is a clinical priority — flag all drift.',
  'Shift Work Sleep Disorder': "SHIFT WORK: Do NOT penalise circadian inconsistency metrics — the user's schedule makes consistency structurally impossible. Focus on sleep quality and efficiency within each sleep opportunity rather than timing regularity. Flag alcohol and caffeine usage relative to shift timing rather than clock time.",
  'Delayed Sleep Phase Syndrome': "DSPS: The user's natural sleep window is structurally late. Do not interpret late bedtimes as poor discipline. Focus on consistency within their phase (e.g. consistently 01:00–09:00 is healthy for DSPS). Morning light exposure and avoidance of bright light at night are high-leverage — cross-reference light therapy in sleepGadgets.",
  'Jet Lag (chronic)': 'CHRONIC JET LAG: Circadian disruption is externally imposed. Look for temporal clustering of poor sleep around travel periods if date data suggests it. Morning light therapy is evidence-based — note in sleepGadgets.',
  'GERD': 'GERD: Lying flat triggers reflux — expect arousals in the first 2–3 hours after sleep onset. lastMealTime is the single most important cross-reference: meals within 2–3 hours of bedtime strongly increase reflux events. Flag those nights explicitly. Alcohol is a direct GERD trigger. Head elevation may help — note in gadgets.',
  'Hyperthyroidism': 'HYPERTHYROIDISM: Elevated metabolic rate causes hyperarousal, heat sensitivity, and frequent waking. Expect high fragmentation and low efficiency. Cross-reference stressLevel (amplifies thyroid symptoms). Note environmental temperature tools in sleepGadgets.',
  'Diabetes': 'DIABETES: Nocturia (frequent urination) causes AWAKE-IN events — look for short repeated arousals. lastMealTime and meal composition affect overnight glucose — late meals may worsen nocturia. Cross-reference alcohol (alters glucose regulation). Morning energy (L score) reflects overnight glycaemic stability.'
};
