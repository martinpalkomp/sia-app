export const getAIPageTheme = (tier: string) => {
  switch (tier) {
    case 'Pro':
      return {
        bg: 'bg-violet-950/10',
        border: 'border-violet-500/30',
        text: 'text-violet-400',
        accent: 'bg-violet-600',
        ring: 'ring-violet-500/20'
      };
    case 'Enhanced':
      return {
        bg: 'bg-indigo-950/10',
        border: 'border-indigo-500/30',
        text: 'text-indigo-400',
        accent: 'bg-indigo-600',
        ring: 'ring-indigo-500/20'
      };
    default: // Basic
      return {
        bg: 'bg-blue-950/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        accent: 'bg-blue-600',
        ring: 'ring-blue-500/20'
      };
  }
};
