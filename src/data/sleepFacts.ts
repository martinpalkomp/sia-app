export interface SleepFact {
  id: string;
  category: 'Lifestyle' | 'Environment' | 'Psychology' | 'Physiology' | 'Behavior';
  title: string;
  description: string;
  icon: string;
}

export const SLEEP_FACTS: SleepFact[] = [
  {
    id: 'caffeine',
    category: 'Lifestyle',
    title: 'Caffeine Persistence',
    description: 'Caffeine can stay in your system for 6–10 hours. Even afternoon coffee can delay sleep onset and reduce deep sleep.',
    icon: '☕'
  },
  {
    id: 'alcohol',
    category: 'Lifestyle',
    title: 'The Alcohol Paradox',
    description: 'Alcohol may help you fall asleep faster, but it fragments sleep later in the night and significantly reduces REM sleep.',
    icon: '🍷'
  },
  {
    id: 'exercise',
    category: 'Lifestyle',
    title: 'Late Exercise',
    description: 'Intense workouts too close to bedtime raise heart rate and body temperature. Stick to gentle stretching or yoga in the evening.',
    icon: '🏃'
  },
  {
    id: 'meals',
    category: 'Lifestyle',
    title: 'Heavy Meals',
    description: 'Large meals before bed can cause indigestion and nighttime awakenings. Try to finish eating 2-3 hours before sleep.',
    icon: '🍕'
  },
  {
    id: 'nicotine',
    category: 'Lifestyle',
    title: 'Nicotine Stimulant',
    description: 'Nicotine is a stimulant that disrupts sleep continuity and makes it harder to reach deep sleep stages.',
    icon: '🚬'
  },
  {
    id: 'light',
    category: 'Environment',
    title: 'Blue Light Impact',
    description: 'Blue light from screens suppresses melatonin production and delays your internal sleep clock.',
    icon: '📱'
  },
  {
    id: 'noise',
    category: 'Environment',
    title: 'Noise Fragmentation',
    description: 'Traffic, neighbors, or snoring can fragment sleep cycles even if you don\'t fully wake up.',
    icon: '🔊'
  },
  {
    id: 'temp',
    category: 'Environment',
    title: 'Optimal Temperature',
    description: 'A cool room (15–19°C) supports the natural drop in body temperature needed for deep sleep.',
    icon: '🌡️'
  },
  {
    id: 'comfort',
    category: 'Environment',
    title: 'Bedding Support',
    description: 'An uncomfortable mattress or pillow increases physical pain and leads to frequent nighttime awakenings.',
    icon: '🛏️'
  },
  {
    id: 'stress',
    category: 'Psychology',
    title: 'Stress & Cortisol',
    description: 'Stress keeps the body in high-alert mode, raising cortisol and adrenaline which blocks sleep onset.',
    icon: '🧠'
  },
  {
    id: 'anxiety',
    category: 'Psychology',
    title: 'Mental State',
    description: 'Anxiety and depression often cause racing thoughts, nighttime anxiety, or persistent nightmares.',
    icon: '💭'
  },
  {
    id: 'trauma',
    category: 'Psychology',
    title: 'Trauma Impact',
    description: 'Trauma or PTSD frequently leads to chronic insomnia or severely disrupted sleep patterns.',
    icon: '🛡️'
  },
  {
    id: 'pain',
    category: 'Physiology',
    title: 'Physical Pain',
    description: 'Chronic pain from the back, neck, or arthritis makes it difficult to maintain sleep continuity.',
    icon: '🩹'
  },
  {
    id: 'disorders',
    category: 'Physiology',
    title: 'Sleep Disorders',
    description: 'Conditions like Sleep Apnea or Restless Legs Syndrome require medical evaluation for proper treatment.',
    icon: '🩺'
  },
  {
    id: 'hormones',
    category: 'Physiology',
    title: 'Hormonal Shifts',
    description: 'Hormonal changes during menstrual cycles, pregnancy, or menopause can significantly disrupt sleep.',
    icon: '🧬'
  },
  {
    id: 'meds',
    category: 'Physiology',
    title: 'Medication Side Effects',
    description: 'Some beta-blockers, steroids, and antidepressants can cause insomnia or unusually vivid dreams.',
    icon: '💊'
  },
  {
    id: 'schedule',
    category: 'Behavior',
    title: 'Consistency is King',
    description: 'An irregular sleep schedule confuses your circadian rhythm. Try to wake up at the same time every day.',
    icon: '🕒'
  },
  {
    id: 'jetlag',
    category: 'Behavior',
    title: 'Circadian Disruption',
    description: 'Jet lag or shift work disrupts the internal clock, making it difficult to achieve consistent quality sleep.',
    icon: '✈️'
  },
  {
    id: 'screentime',
    category: 'Behavior',
    title: 'Evening Screen Time',
    description: 'Too much screen time before bed keeps the brain alert and delays the release of sleep hormones.',
    icon: '📺'
  }
];
