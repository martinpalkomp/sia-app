export interface UIElement {
  id: string;
  name: string;
  tag: 'view' | 'section' | 'card' | 'btn' | 'input' | 'overlay' | 'comp';
  description: string;
  path: string;
  children?: UIElement[];
  role?: string;
  function?: string;
  tierDiff?: string | null;
  maturityDiff?: string | null;
  aiUsed?: string | null;
  trigger?: string | null;
  dependsOn?: string[];
}

export const UI_MAP_DATA: Record<string, UIElement[]> = {
  Guide: [
    {
      id: 'guide-view-root',
      name: 'Guide View Container',
      tag: 'view',
      description: 'The root view for SIA educational guide',
      path: '/src/features/guide/GuideView.tsx',
      function: 'Hosts the SIA educational material in a structured tab layout.',
      tierDiff: null,
      maturityDiff: null,
      aiUsed: 'None',
      trigger: 'Navigation to Guide',
      dependsOn: [],
      children: [
        { id: 'guide-header', name: 'Guide Header', tag: 'section', description: 'Header with tabs', path: '/src/features/guide/GuideView.tsx', function: 'Provides navigation between guide sections.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { 
          id: 'guide-content', 
          name: 'Guide Content', 
          tag: 'section', 
          description: 'Content area for active tab', 
          path: '/src/features/guide/GuideView.tsx', 
          function: 'Displays the requested knowledge blocks.', 
          tierDiff: null, 
          maturityDiff: null, 
          aiUsed: null, 
          trigger: null, 
          dependsOn: [],
          children: [
            { id: 'guide-overview-tab', name: 'Overview Tab', tag: 'section', description: 'Dashboard style overview layout for the guide', path: '/src/features/guide/OverviewTab.tsx', function: 'Presents the foundational laws, steps, and links to other guide topics', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'guide-laws-tab', name: 'Laws Tab', tag: 'section', description: 'Deep dive into the two laws of sleep', path: '/src/features/guide/LawsTab.tsx', function: 'Explains Sleep Debt and Circadian Rhythm systematically', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'guide-system-module-tab', name: 'System Module Tab', tag: 'section', description: 'Generic structure for educational topics', path: '/src/features/guide/SystemModuleTab.tsx', function: 'Renders knowledge blocks based on the selected tab', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] }
          ]
        }
      ]
    }
  ],
  Dashboard: [
    {
      id: 'db-sleep-gate',
      name: 'Sleep Gate Hero Section',
      tag: 'section',
      description: 'Projected bedtime and wind-down window',
      path: '/src/features/dashboard/SleepGateHero.tsx',
      function: 'Displays visually the optimal sleep window and projected bedtime gate, alongside personalized daily greeting.',
      tierDiff: null,
      maturityDiff: null,
      aiUsed: null,
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'sia-avatar', name: 'SIA Avatar', tag: 'comp', description: 'AvatarFrame component', path: '/src/features/dashboard/SleepGateHero.tsx', function: 'Shows visual avatar.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'intel-badge', name: 'Intelligence Agent Badge', tag: 'comp', description: 'Pill label above greeting', path: '/src/features/dashboard/SleepGateHero.tsx', function: 'Indicates active tier.', tierDiff: 'Basic/Enhanced/Pro label and color', maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'greeting-subtext', name: 'Greeting Subtext', tag: 'comp', description: 'Context line', path: '/src/features/dashboard/SleepGateHero.tsx', function: 'Provides system context or date.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'greeting-h1', name: 'Greeting Heading', tag: 'comp', description: 'Time-aware greeting', path: '/src/features/dashboard/SleepGateHero.tsx', function: 'Greets the user contextually based on time.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'nav-fab-log', name: 'Log Action Button', tag: 'btn', description: 'Button to trigger log action', path: '/src/features/dashboard/SleepGateHero.tsx', function: 'Calls greeting.onLogClick to navigate to Log view', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'gate-empty-state-mockup', name: 'Sleep Gate Empty State', tag: 'comp', description: 'Blurred mockup UI for empty state', path: '/src/features/dashboard/SleepGateHero.tsx', function: 'Explains data requirement to unlock the sleep gate.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'gate-prediction-panel', name: 'Sleep Gate Prediction Panel', tag: 'card', description: 'Interactive prediction display', path: '/src/features/dashboard/SleepGateHero.tsx', function: 'Toggles the factors breakdown.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: 'Click', dependsOn: [] },
        { id: 'gate-factors-breakdown', name: 'Sleep Gate Factors Breakdown', tag: 'section', description: 'Detailed breakdown of active factors', path: '/src/features/dashboard/SleepGateHero.tsx', function: 'Shows active data points affecting sleep gate.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: 'Toggled by Prediction Panel', dependsOn: [] },
        { id: 'circadian-sky-orb', name: 'Circadian Sky Orb', tag: 'comp', description: 'Visual state of day/night rhythm', path: '/src/features/dashboard/SleepGateHero.tsx', function: 'Glows organically reflecting calculated circadian phase.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
      ]
    },
    {
      id: 'metric-sparkline-card',
      name: 'Metric Sparkline Card',
      tag: 'card',
      description: 'Metric card with trend sparkline and Guide-aligned tactile glow styles.',
      path: '/src/components/MetricSparklineCard.tsx',
      function: 'Shows aggregated average metrics (Quality, Restedness, Energy, Duration, Efficiency) and trends.',
      tierDiff: 'No tier gate.',
      maturityDiff: 'Shows placeholder at level 1 (0-6 logs).',
      aiUsed: 'No AI.',
      trigger: null,
      dependsOn: []
    },
    {
      id: 'quick-insight-section',
      name: 'SIA Quick Insight Section',
      tag: 'section',
      description: 'Container for deterministic quick facts based on signals.',
      path: '/src/features/dashboard/DashboardView.tsx',
      function: 'Presents a signal-bound quick insight fact to educate the user.',
      tierDiff: null,
      maturityDiff: null,
      aiUsed: 'No direct AI call. Uses deterministic logic matching.',
      trigger: 'On mount contextually.',
      dependsOn: ['quick-insight-card'],
      children: [
        {
          id: 'quick-insight-card',
          name: 'Quick Insight Card',
          tag: 'card',
          description: 'Dark card with Guide-aligned interactive glow and typography rendering the selected insight.',
          path: '/src/features/dashboard/QuickInsightCard.tsx',
          function: 'Presents the actual quick insight text and theme.',
          tierDiff: null,
          maturityDiff: null,
          aiUsed: null,
          trigger: null,
          dependsOn: []
        }
      ]
    },
    {
      id: 'db-sia-pattern-decoder',
      name: 'SIA Pattern Decoder Card',
      tag: 'card',
      description: 'Full-width visual decoder card',
      path: '/src/features/dashboard/DashboardView.tsx',
      function: 'Placeholder for visual pattern decoding chart.',
      tierDiff: null,
      maturityDiff: null,
      aiUsed: null,
      trigger: null,
      dependsOn: []
    },
    {
      id: 'db-data-ledger',
      name: 'Unified Data Audit Trail',
      tag: 'section',
      description: 'Audit trail of all sleep logs',
      path: '/src/features/data/DataLedger.tsx',
      function: 'Lists historical data points for audit.',
      tierDiff: null,
      maturityDiff: null,
      aiUsed: null,
      trigger: null,
      dependsOn: []
    },
    {
      id: 'db-morning-briefing',
      name: 'Morning Briefing Section',
      tag: 'section',
      description: 'AI-generated morning briefing container',
      path: '/src/features/dashboard/DashboardView.tsx',
      function: 'Container for the daily morning briefing based on last 14 logs.',
      tierDiff: 'All tiers see it but Basic sees a locked overlay.',
      maturityDiff: 'Blocked at level 1 (0-6 logs).',
      aiUsed: 'Calls generateDailyBrief() in aiService. Reads last 14 logs and personalizationProfile.',
      trigger: 'On mount contextually.',
      dependsOn: ['morning-brief-card'],
      children: [
        { 
          id: 'morning-brief-card', 
          name: 'Morning Briefing Card', 
          tag: 'card', 
          description: 'Interactive dark card with indigo hover glow, scaling effects, and tactile feedback.', 
          path: '/src/features/dashboard/DashboardView.tsx',
          function: 'Presents the AI briefing.',
          tierDiff: 'Basic sees locked overlay.',
          maturityDiff: 'Blocked at level 1.',
          aiUsed: 'generateDailyBrief() cached via sia_brief_{uid}_{date}',
          trigger: null,
          dependsOn: ['brief-body', 'forecast-metrics-chip', 'temporal-label'],
          children: [
            { id: 'temporal-label', name: 'Temporal Context Label', tag: 'comp', description: 'Shows timeframe for analysis', path: '/src/features/dashboard/DashboardView.tsx', function: 'Displays MORNING BRIEF text.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'brief-body', name: 'Brief Body Text', tag: 'comp', description: 'AI-generated briefing', path: '/src/features/dashboard/DashboardView.tsx', function: 'Displays text from generateDailyBrief()', tierDiff: null, maturityDiff: null, aiUsed: 'generateDailyBrief()', trigger: null, dependsOn: [] },
            { id: 'forecast-metrics-chip', name: 'Forecast Metrics Chip', tag: 'comp', description: 'Prediction chip showing quality, alertness, energy.', path: '/src/features/dashboard/DashboardView.tsx', function: 'Rendered conditionally if forecastMetrics is present.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: 'After AI chat session', dependsOn: [] },
            { id: 'discuss-btn', name: 'Discuss with SIA Button', tag: 'btn', description: 'Navigates to AI view via onViewChange(ai).', path: '/src/features/dashboard/DashboardView.tsx', function: 'Navigates to AI chat view.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'fallback-ui', name: 'Static Fallback UI', tag: 'comp', description: 'Displays dynamic countdown to 7-day unlock.', path: '/src/features/dashboard/DashboardView.tsx', function: 'Shows when maturity is too low.', tierDiff: null, maturityDiff: 'Shown at level 1.', aiUsed: null, trigger: 'Blocked at Level 1', dependsOn: [] },
          ]
        }
      ]
    },
    {
      id: 'db-weekly-pattern',
      name: 'SIA Weekly Pattern & Insights Section',
      tag: 'section',
      description: 'Correlation analysis and clinical feed',
      path: '/src/features/dashboard/DashboardView.tsx',
      function: 'Presents personalized macro patterns and insights.',
      tierDiff: 'Basic tier sees a single consolidated upgrade card instead of this section. Enhanced/Pro see AI-generated pattern teaser and clinical insights.',
      maturityDiff: 'Requires 14+ logs (Level 3 or higher).',
      aiUsed: 'Calls generatePatternTeaser(). Session-cached via insightTeaser state/localStorage.',
      trigger: null,
      dependsOn: ['ai-analysis-card', 'clinical-insights-feed'],
      children: [
        { 
          id: 'ai-analysis-card', 
          name: 'Weekly Pattern Card / Upgrade Banner', 
          tag: 'card', 
          description: 'Interactive button card with tactile glowing visual treatments and subtle border transitions mimicking Guide feature', 
          path: '/src/features/dashboard/DashboardView.tsx', 
          function: 'SIA Weekly Pattern card providing pattern teasers for Enhanced/Pro. Unified upgrade banner for Basic.',
          tierDiff: 'Basic sees consolidated upgrade banner. Enhanced+ sees Weekly Pattern.',
          maturityDiff: 'Requires 14+ logs.',
          aiUsed: 'generatePatternTeaser() output.',
          trigger: null,
          dependsOn: ['insight-body', 'temporal-label'],
          children: [
            { id: 'temporal-label', name: 'Temporal Context Label', tag: 'comp', description: 'Shows timeframe for analysis', path: '/src/features/dashboard/DashboardView.tsx', function: 'Displays 7-DAY PATTERN text.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'insight-body', name: 'Weekly Pattern Body Text', tag: 'comp', description: 'AI-generated correlation limit to 2 sentences', path: '/src/features/dashboard/DashboardView.tsx', function: 'Shows Pattern and Correlation.', tierDiff: null, maturityDiff: null, aiUsed: 'generatePatternTeaser() text output', trigger: null, dependsOn: [] },
          ]
        },
        { 
          id: 'clinical-insights-feed', 
          name: 'Clinical Insights Feed', 
          tag: 'section', 
          description: 'Deep Analysis container', 
          path: '/src/features/dashboard/DashboardView.tsx',
          function: 'Displays Deep Analysis generated conditionally.',
          tierDiff: 'Basic sees LockedFeatureCard. Enhanced/Pro sees Clinical Insights feed and Deep Analysis summary.',
          maturityDiff: 'Requires hasNinetyLogsInFiveMonths (90 logs in last 5 months).',
          aiUsed: 'Calls generateDeepAnalysis() to generate summary and recommendations.',
          trigger: 'User clicks "Generate 30-Day Deep Analysis" or "Refresh Analysis".',
          dependsOn: ['ai-deep-analysis-locked', 'clinical-insights-maturity-lock', 'deep-analysis-summary', 'tonights-action-block', 'past-insights-wrapper', 'temporal-label'],
          children: [
            { id: 'ai-deep-analysis-locked', name: 'Clinical Insights Locked Card', tag: 'comp', description: 'Locked card shown when tier is Basic', path: '/src/features/dashboard/DashboardView.tsx', function: 'Displays upgrade CTA and fixed 4 sentences description.', tierDiff: 'Shown only for Basic tier.', maturityDiff: null, aiUsed: null, trigger: 'Upgrade click goes to Account', dependsOn: [] },
            { id: 'clinical-insights-maturity-lock', name: 'Clinical Insights Maturity Lock Card', tag: 'comp', description: 'Locked card shown when tier is enhanced but maturity is < 90 logs', path: '/src/features/dashboard/DashboardView.tsx', function: 'Displays maturity required info.', tierDiff: 'Shown only for Enhanced/Pro tier.', maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'temporal-label', name: 'Temporal Context Label', tag: 'comp', description: 'Shows timeframe for analysis', path: '/src/features/dashboard/DashboardView.tsx', function: 'Displays LONG-TERM ANALYSIS text.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'deep-analysis-summary', name: 'Deep Analysis Summary', tag: 'comp', description: 'Summary of significant trend', path: '/src/features/dashboard/DashboardView.tsx', function: 'Displays single sentence analysis.', tierDiff: null, maturityDiff: null, aiUsed: 'generateDeepAnalysis() summary JSON field', trigger: null, dependsOn: [] },
            { id: 'tonights-action-block', name: 'Tonight\'s Action Block', tag: 'comp', description: 'Actionable recommendation with confidence', path: '/src/features/dashboard/DashboardView.tsx', function: 'Displays actionable recommendation.', tierDiff: null, maturityDiff: null, aiUsed: 'generateDeepAnalysis() recommendation and confidence JSON fields', trigger: null, dependsOn: [] },
            { id: 'past-insights-wrapper', name: 'Past Insights Wrapper', tag: 'comp', description: 'Wrapper for Past Insights', path: '/src/features/dashboard/DashboardView.tsx', function: 'Displays past insights.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
              { id: 'insight-card', name: 'Insight Card', tag: 'comp', description: 'Shows past insight generated by AI, interactive with Guide glow effects.', path: '/src/features/dashboard/InsightCard.tsx', function: 'Shows past insights, confidence badges, type label.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] }
            ]}
          ]
        }
      ]
    },
    {
      id: 'db-actions',
      name: 'Engagement & Actions Section',
      tag: 'section',
      description: 'Log, fix, AI buttons',
      path: '/src/features/dashboard/DashboardView.tsx',
      function: 'Action buttons for log entry and deep analysis navigation.',
      tierDiff: 'Deep Analysis and AI Analysis gated by isEnhanced.',
      maturityDiff: 'Deep Analysis and AI Analysis gated by level 3.',
      aiUsed: null,
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'log-last-night-card', name: 'Log Last Night Card', tag: 'btn', description: 'Navigates to Log view via onLogClick', path: '/src/features/dashboard/DashboardView.tsx', function: 'Navigates to Log view.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'fix-missing-data-btn', name: 'Fix Missing Data Button', tag: 'btn', description: 'Shown only when correctionsCount > 0, navigates to corrections', path: '/src/features/dashboard/DashboardView.tsx', function: 'Navigates to corrections view to fix gaps.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: 'correctionsCount > 0', dependsOn: [] },
        { id: 'deep-analysis-btn', name: 'Deep Analysis Button', tag: 'btn', description: 'Triggers deep pattern analysis and navigation.', path: '/src/features/dashboard/DashboardView.tsx', function: 'Calls generateDeepAnalysis()', tierDiff: 'Requires isEnhanced', maturityDiff: 'Requires maturity level >= 3. Disabled below threshold.', aiUsed: 'Calls generateDeepAnalysis(), reading up to 90 full log documents.', trigger: 'User click', dependsOn: [] }
      ]
    },
    {
      id: 'db-growth',
      name: 'Growth Hub Section',
      tag: 'section',
      description: 'Educational resources',
      path: '/src/features/dashboard/DashboardView.tsx',
      function: 'Shows tier upgrade CTAs for Basic, personalization progress for Enhanced/Pro.',
      tierDiff: 'Basic sees upgrade CTA, Enhanced/Pro see personalization.',
      maturityDiff: 'No maturity gate.',
      aiUsed: 'No AI.',
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'sleep-guide-card', name: 'SleepGuideCard', tag: 'comp', description: 'Opens SleepGuideInteractive via onOpenSleepGuide', path: '/src/features/sleep/SleepGuideCard.tsx', function: 'Opens sleep guide.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: 'User click', dependsOn: [] },
      ]
    },
    {
      id: 'db-sia-intelligence',
      name: 'SIA Intelligence Feed Section',
      tag: 'section',
      description: 'Diagnostic monitoring',
      path: '/src/features/dashboard/DashboardView.tsx',
      function: 'Diagnostic monitoring feed.',
      tierDiff: 'Requires isEnhanced.',
      maturityDiff: 'Requires dataMaturity.level >= 3. Placeholder at level 3, activates at level 4 (90+ logs).',
      aiUsed: 'Uses patternDecoder service.',
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'sia-intel-feed-card', name: 'SIA Intelligence Feed Card', tag: 'card', description: 'Diagnostic monitoring', path: '/src/features/dashboard/DashboardView.tsx', function: 'Displays feed items.', tierDiff: 'Requires isEnhanced.', maturityDiff: 'Full feed at level 4.', aiUsed: 'Uses patternDecoder service.', trigger: null, dependsOn: [] },
      ]
    },
    {
      id: 'db-maturity',
      name: 'Data Maturity Section',
      tag: 'section',
      description: 'Progress bar for data calibration',
      path: '/src/features/dashboard/DashboardView.tsx',
      function: 'Shows data mapping progress to encourage logging.',
      tierDiff: 'None (Shows all users).',
      maturityDiff: 'Progress bar fills across 4 thresholds: 7, 14, 90.',
      aiUsed: 'Reads dataMaturity from Firestore via getCountFromServer.',
      trigger: null,
      dependsOn: ['maturity-tracker'],
      children: [
        { id: 'maturity-tracker', name: 'Data Maturity Tracker', tag: 'comp', description: 'Multi-bar roadmap for data calibration', path: '/src/features/data/DataMaturityTracker.tsx', function: 'Visualizes log count towards thresholds 7, 14, 90+.', tierDiff: null, maturityDiff: 'Shows tiers of logged days.', aiUsed: 'Reads from dataMaturity service.', trigger: null, dependsOn: [] },
      ]
    },
  ],
  Log: [
    {
      id: 'log-date-selector',
      name: 'Date Selector Bar',
      tag: 'section',
      description: 'Date navigation and context',
      path: '/src/App.tsx',
      function: 'Navigates between dates logically. selectedDate drives all other Log elements.',
      tierDiff: 'No tier gate.',
      maturityDiff: 'No maturity gate.',
      aiUsed: 'No AI.',
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'log-date-prev', name: 'Previous Date Button', tag: 'btn', description: 'Navigates to previous day', path: '/src/App.tsx', function: 'Changes selectedDate to previous day.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'log-date-heading', name: 'Date Heading', tag: 'comp', description: 'Displays current date', path: '/src/App.tsx', function: 'Shows active selectedDate.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'log-date-label', name: 'Date Label', tag: 'comp', description: 'Contextual date label', path: '/src/App.tsx', function: 'Shows relative date like Today, Yesterday.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'log-date-next', name: 'Next Date Button', tag: 'btn', description: 'Navigates to next day', path: '/src/App.tsx', function: 'Changes selectedDate to next day.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
      ]
    },
    {
      id: 'log-timeline',
      name: 'Timeline Section',
      tag: 'section',
      description: 'SIA learning, edit controls, sleep window grid',
      path: '/src/App.tsx',
      function: 'User paints sleep/awake states for the date, single source of truth.',
      tierDiff: 'No tier gate.',
      maturityDiff: 'No maturity gate.',
      aiUsed: 'No AI.',
      trigger: null,
      dependsOn: ['log-grid', 'log-state-selectors'],
      children: [
        { id: 'log-timeline-anchor', name: 'Timeline Anchor', tag: 'comp', description: 'Container for routine, learning, and controls', path: '/src/App.tsx', function: 'Groups routine and cancel/save controls.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'log-sia-routine-btn', name: 'SIA Routine Button', tag: 'btn', description: 'Toggles routine mode. Requires historyCount >= 3.', path: '/src/App.tsx', function: 'Triggers SIA Routine prefill popup.', tierDiff: 'Enhanced/Pro only - Basic sees locked state.', maturityDiff: 'Requires level 2+ (7+ logs).', aiUsed: 'Calls getSuggestedLog() from patternEngine.', trigger: 'User click', dependsOn: [] },
          { id: 'log-sia-learning-label', name: 'SIA Learning Label', tag: 'comp', description: 'Status indicator', path: '/src/App.tsx', function: 'Indicates learning status based on tier.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'log-edit-controls', name: 'Edit Controls', tag: 'comp', description: 'Undo/Cancel/Save buttons. Hidden unless isEditing is true.', path: '/src/App.tsx', function: 'Undo/Cancel/Save controls to revert or persist changes. Cancel restores initialTimeline and initialMetrics.', tierDiff: 'No tier gate.', maturityDiff: 'No maturity gate.', aiUsed: 'No AI.', trigger: 'Shown when isEditing = true.', dependsOn: [] },
        ]},
        { id: 'log-state-selectors', name: 'State Selectors', tag: 'comp', description: 'Awake/Sleep state toggle. Hidden unless isEditing is true.', path: '/src/App.tsx', function: 'Allows switching painting mode between sleep and awake.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'awake-btn', name: 'Awake Button', tag: 'btn', description: 'Set state to awake', path: '/src/App.tsx', function: 'Sets brush to awake.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'sleep-btn', name: 'Sleep Button', tag: 'btn', description: 'Set state to sleep', path: '/src/App.tsx', function: 'Sets brush to sleep.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
        { id: 'log-sleep-window-container', name: 'Sleep Window Container', tag: 'comp', description: 'Container for sleep window grid', path: '/src/App.tsx', function: 'Wraps the 96-slot interactive tracking grid.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'log-has-data-overlay', name: 'Data Overlay', tag: 'overlay', description: 'Shown when log view is loaded', path: '/src/App.tsx', function: 'Shows tracking state loading or missing.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'log-grid', name: 'Sleep Window Grid', tag: 'comp', description: 'SleepWindow component', path: '/src/features/sleep/SleepWindow.tsx', function: '96-slot visualTimeline array, 15 min slots. user paints. single source of truth.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'log-scroll-hint', name: 'Scroll Hint', tag: 'comp', description: 'Visual scroll indicator', path: '/src/App.tsx', function: 'Hints horizontal scroll.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
        { id: 'log-stats-footer', name: 'Stats Footer', tag: 'comp', description: 'Summary statistics', path: '/src/App.tsx', function: 'Vitality Score computed by calculateLogVitality(). shows -- if insufficient.', tierDiff: 'No tier gate.', maturityDiff: 'No maturity gate.', aiUsed: 'No AI.', trigger: 'Requires sleepEvents.length > 0 and 1+ metric > 0.', dependsOn: [] },
      ]
    },
    {
      id: 'log-metrics',
      name: 'Daily Metrics Section',
      tag: 'section',
      description: 'Slider inputs for sleep quality, restedness, and energy',
      path: '/src/App.tsx',
      function: 'Slider inputs to rate sleep quality, restedness, energy, stress, mood. Range 1-10.',
      tierDiff: 'No tier gate.',
      maturityDiff: 'No maturity gate.',
      aiUsed: 'No AI.',
      trigger: 'Each change calls updateLog() -> updateLogLocally() -> setSaveStatus(\'saving\'). save useEffect fires after 600ms debounce.',
      dependsOn: [],
      children: [
        { id: 'log-info-quality', name: 'Sleep Quality Info', tag: 'comp', description: 'Interactive label and info icon for sleep quality', path: '/src/App.tsx', function: 'Sleep quality slider.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'log-info-restedness', name: 'Restedness Info', tag: 'comp', description: 'Interactive label and info icon for restedness', path: '/src/App.tsx', function: 'Morning restedness slider.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'log-info-energy', name: 'Energy Level Info', tag: 'comp', description: 'Interactive label and info icon for energy level', path: '/src/App.tsx', function: 'Daytime energy slider.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'log-info-stress', name: 'Stress Level Info', tag: 'comp', description: 'Interactive label and info icon for stress level', path: '/src/App.tsx', function: 'Stress level slider.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'log-info-mood', name: 'Morning Mood Info', tag: 'comp', description: 'Interactive label and info icon for morning mood', path: '/src/App.tsx', function: 'Morning mood slider.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
      ]
    },
    {
      id: 'log-factors',
      name: 'Daily Factors & Disturbances Section',
      tag: 'section',
      description: 'Toggle rows for caffeine, alcohol, etc.',
      path: '/src/App.tsx',
      function: 'Toggle rows for daily factors to inform the pattern engine.',
      tierDiff: 'No tier gate.',
      maturityDiff: 'No maturity gate.',
      aiUsed: 'No AI. Consumed by patternEngine.',
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'factor-caffeine', name: 'Caffeine Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Caffeine consumption toggle calls updateFactors().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'caffeine-count-input', name: 'Caffeine Count', tag: 'input', description: 'Sub-input. Visible only when factor-caffeine is toggled.', path: '/src/App.tsx', function: 'Amount of cups.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'caffeine-time-input', name: 'Caffeine Time', tag: 'input', description: 'Sub-input. Visible only when factor-caffeine is toggled.', path: '/src/App.tsx', function: 'Time of last cup.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
        { id: 'factor-alcohol', name: 'Alcohol Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Alcohol consumption toggle calls updateFactors().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'alcohol-drinks-input', name: 'Alcohol Drinks', tag: 'input', description: 'Sub-input. Visible only when factor-alcohol is toggled.', path: '/src/App.tsx', function: 'Amount of drinks.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'alcohol-time-input', name: 'Alcohol Time', tag: 'input', description: 'Sub-input. Visible only when factor-alcohol is toggled.', path: '/src/App.tsx', function: 'Time of last drink.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
        { id: 'factor-medication', name: 'Medication Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Medication consumption toggle calls updateFactors().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'medication-type-input', name: 'Medication Type', tag: 'input', description: 'Sub-input. Visible only when factor-medication is toggled.', path: '/src/App.tsx', function: 'Type of medication.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'medication-time-input', name: 'Medication Time', tag: 'input', description: 'Sub-input. Visible only when factor-medication is toggled.', path: '/src/App.tsx', function: 'Time of medication.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
        { id: 'factor-screens-in-bed', name: 'Screens in Bed Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Screens in bed usage calls updateFactors().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'factor-stress-level', name: 'Stress Level Slider', tag: 'input', description: 'Stress level slider input', path: '/src/App.tsx', function: 'Stress factor update.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'factor-natural-wake', name: 'Natural Wake Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Woke up without alarm toggle calls updateFactors().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'factor-morning-mood', name: 'Morning Mood Slider', tag: 'input', description: 'Morning mood slider input', path: '/src/App.tsx', function: 'Mood factor update.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
      ]
    },
    {
      id: 'log-tools',
      name: 'Sleep Support Tools Section',
      tag: 'section',
      description: 'Collapsible interventions, passive aids, tracking',
      path: '/src/App.tsx',
      function: 'Collapsible gadgets and interventions tracking.',
      tierDiff: 'No tier gate.',
      maturityDiff: 'No maturity gate.',
      aiUsed: 'No AI (Consumed by patternEngine).',
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'support-toggle-btn', name: 'Support Tools Toggle', tag: 'btn', description: 'Collapsible toggle button', path: '/src/App.tsx', function: 'Expands grid.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'interventions-grid', name: 'Interventions Grid', tag: 'comp', description: 'Grid of intervention gadgets', path: '/src/App.tsx', function: 'Gadgets section 1.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'gadget-light-therapy', name: 'Light Therapy Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget() & updateGadgetDetails(). Stored in log.factors.sleepGadgets[]', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'gadget-breathing-trainer', name: 'Breathing Trainer Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'gadget-pre-sleep-heating', name: 'Pre-sleep Heating Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'gadget-aromatherapy', name: 'Aromatherapy Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'gadget-meditation-app', name: 'Meditation App Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
        { id: 'passive-aids-grid', name: 'Passive Aids Grid', tag: 'comp', description: 'Grid of passive aid gadgets', path: '/src/App.tsx', function: 'Gadgets section 2.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'gadget-cooling-pad', name: 'Cooling Pad Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'gadget-white-noise', name: 'White Noise Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'gadget-sleep-mask', name: 'Sleep Mask Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'gadget-earplugs', name: 'Earplugs Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'gadget-weighted-blanket', name: 'Weighted Blanket Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
        { id: 'tracking-grid', name: 'Tracking Grid', tag: 'comp', description: 'Grid of tracking gadgets', path: '/src/App.tsx', function: 'Gadgets section 3.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'gadget-smart-ring', name: 'Smart Ring Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'gadget-smartwatch', name: 'Smartwatch Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'gadget-fitness-band', name: 'Fitness Band Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'gadget-phone-app', name: 'Phone App Toggle', tag: 'comp', description: 'Toggle row', path: '/src/App.tsx', function: 'Calls toggleGadget().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
      ]
    },
    {
      id: 'log-remarks',
      name: 'Remarks Section',
      tag: 'section',
      description: 'Daily remarks textarea',
      path: '/src/App.tsx',
      function: 'Free-text remarks for context.',
      tierDiff: 'No tier gate.',
      maturityDiff: 'No maturity gate.',
      aiUsed: 'Included in AI context for chatWithSIA.',
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'log-remarks-textarea', name: 'Remarks Textarea', tag: 'input', description: 'Textarea for daily notes', path: '/src/App.tsx', function: 'Calls updateLog({ daily_remarks }).', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
      ]
    },
    {
      id: 'log-data-importer',
      name: 'Data Importer Section',
      tag: 'section',
      description: 'Import external data',
      path: '/src/App.tsx',
      function: 'Bulk import data points.',
      tierDiff: null,
      maturityDiff: null,
      aiUsed: null,
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'data-importer-comp', name: 'Data Importer', tag: 'comp', description: 'DataImporter component', path: '/src/features/data/DataImporter.tsx', function: 'Importer logic wrapper.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'imp-preflight-bar', name: 'Pre-Flight Check Bar', tag: 'comp', description: 'Consolidated constraints, credits, and template download', path: '/src/features/data/DataImporter.tsx', function: 'Preparation summary.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'imp-checklist-cards', name: 'Checklist Cards', tag: 'comp', description: 'Elevated preparation guidelines', path: '/src/features/data/DataImporter.tsx', function: 'Instructions.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'imp-action-zone', name: 'Action Zone', tag: 'comp', description: 'Unified paste and file dropzone', path: '/src/features/data/DataImporter.tsx', function: 'Inputs to submit data.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
      ]
    },
  ],
  Insights: [
    {
      id: 'ins-header',
      name: 'Insights Header',
      tag: 'section',
      description: 'View title, date range, tab bar, clinical report button',
      path: '/src/App.tsx',
      function: 'Fixed at top. Navigation between view periods (7-day, 30-day, custom range). Tab selection changes activeDates which filters logs subscription.',
      tierDiff: 'No tier gate.',
      maturityDiff: 'No maturity gate.',
      aiUsed: 'No AI.',
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'ins-view-title', name: 'View Title', tag: 'comp', description: 'Insights title', path: '/src/App.tsx', function: 'Displays view title.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'ins-date-range-label', name: 'Date Range Label', tag: 'comp', description: 'Selected date range', path: '/src/App.tsx', function: 'Shows active selected dates.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'ins-tab-bar', name: 'Tab Bar', tag: 'section', description: 'Date range navigation', path: '/src/App.tsx', function: 'Switches between view periods.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'ins-tab-7d', name: '7-Day Tab', tag: 'btn', description: 'Select 7-day range. Triggers 7d view state.', path: '/src/App.tsx', function: 'Sets view to 7-day.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'ins-tab-30d', name: '30-Day Tab', tag: 'btn', description: 'Select 30-day range. Triggers 30d view state.', path: '/src/App.tsx', function: 'Sets view to 30-day.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'ins-tab-custom', name: 'Custom Tab', tag: 'btn', description: 'Select custom range. Triggers custom view state.', path: '/src/App.tsx', function: 'Sets view to custom.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
        { id: 'ins-custom-pickers', name: 'Custom Date Pickers', tag: 'section', description: 'Visible only when view === custom', path: '/src/App.tsx', function: 'Sets customRange in UIStore. Gates activeDates computation.', tierDiff: 'No tier gate.', maturityDiff: null, aiUsed: 'No AI.', trigger: 'Only visible when "Custom" tab selected.', dependsOn: [], children: [
          { id: 'ins-picker-start', name: 'Start Date Picker', tag: 'input', description: 'Start date selection', path: '/src/App.tsx', function: 'Selects start date.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'ins-picker-end', name: 'End Date Picker', tag: 'input', description: 'End date selection', path: '/src/App.tsx', function: 'Selects end date.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
      ]
    },
    {
      id: 'ins-averages',
      name: 'Averages Grid',
      tag: 'section',
      description: '5 MetricDisplay components. Read-only visual components.',
      path: '/src/App.tsx',
      function: 'Computes mean sleep_quality, morning_alertness, daytime_energy, duration, efficiency across activeDates. Reads from logs state.',
      tierDiff: 'No tier gate.',
      maturityDiff: 'Shows empty state at level 1.',
      aiUsed: 'No AI.',
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'ins-avg-quality', name: 'Avg Quality', tag: 'comp', description: 'MetricDisplay component. Read-only visual component.', path: '/src/App.tsx', function: 'Displays average quality.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'ins-avg-restedness', name: 'Avg Restedness', tag: 'comp', description: 'MetricDisplay component. Read-only visual component.', path: '/src/App.tsx', function: 'Displays average restedness.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'ins-avg-energy', name: 'Avg Energy', tag: 'comp', description: 'MetricDisplay component. Read-only visual component.', path: '/src/App.tsx', function: 'Displays average energy.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'ins-avg-duration', name: 'Avg Duration', tag: 'comp', description: 'MetricDisplay component. Read-only visual component.', path: '/src/App.tsx', function: 'Displays average duration.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        { id: 'ins-avg-efficiency', name: 'Avg Efficiency', tag: 'comp', description: 'MetricDisplay component. Read-only visual component.', path: '/src/App.tsx', function: 'Displays average efficiency.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
      ]
    },
    {
      id: 'ins-breakdown',
      name: 'Breakdown List',
      tag: 'section',
      description: 'Daily breakdown rows with SleepRibbon',
      path: '/src/App.tsx',
      function: 'Lists each night in the selected period with individual scores and timeline thumbnail. Reads from logs state.',
      tierDiff: 'No tier gate.',
      maturityDiff: 'No maturity gate.',
      aiUsed: 'No AI.',
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'ins-breakdown-container', name: 'Breakdown Container', tag: 'comp', description: 'Container for daily rows', path: '/src/App.tsx', function: 'Scrollable container.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'ins-daily-row', name: 'Daily Row', tag: 'comp', description: 'Single day breakdown row', path: '/src/App.tsx', function: 'Shows a single night summary.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: 'Tapping a night navigates to that date in Log view.', dependsOn: ['setSelectedDate'], children: [
            { id: 'ins-sleep-ribbon', name: 'Sleep Ribbon', tag: 'comp', description: 'SleepRibbon component. Read-only visual component.', path: '/src/features/sleep/SleepRibbon.tsx', function: 'Mini timeline visualization.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          ]},
        ]},
      ]
    },
    {
      id: 'ins-pattern-summary-section',
      name: 'Sleep Pattern Summary Section',
      tag: 'section',
      description: 'Sleep pattern summary and export controls',
      path: '/src/App.tsx',
      function: 'Surfaces recurring factor patterns and export controls.',
      tierDiff: 'Enhanced/Pro see full breakdown. Basic sees a teaser with locked details.',
      maturityDiff: 'Requires level 2+ (7+ logs) — shows placeholder below.',
      aiUsed: 'No direct AI call — pure algorithmic analysis. Calls patternEngine.getSuggestedLog() reading last 14-30 logs.',
      trigger: null,
      dependsOn: [],
      children: [
        {
          id: 'ins-pattern-summary',
          name: 'Sleep Pattern Summary Card',
          tag: 'card',
          description: 'Pattern metric grid, export buttons',
          path: '/src/features/sleep/SleepPatternCard.tsx',
          function: 'Displays repetitive pattern insights.',
          tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [],
          children: [
            { id: 'ins-pattern-metric-grid', name: 'Pattern Metric Grid', tag: 'comp', description: 'Grid with hover tooltips', path: '/src/features/sleep/SleepPatternCard.tsx', function: 'Grid of insights.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'ins-export-ascii-btn', name: 'Export ASCII Button', tag: 'btn', description: 'Export pattern as ASCII', path: '/src/features/sleep/SleepPatternCard.tsx', function: 'Calls DataExporter utility. Exports filtered period as ASCII text.', tierDiff: 'Enhanced/Pro only', maturityDiff: null, aiUsed: 'No AI.', trigger: null, dependsOn: [] },
            { id: 'ins-export-pdf-btn', name: 'Export PDF Button', tag: 'btn', description: 'Export pattern as PDF. Dual State: Enhanced/Pro = Action, Basic = Upgrade Overlay.', path: '/src/features/sleep/SleepPatternCard.tsx', function: 'Calls DataExporter utility. Exports filtered period as CSV/PDF.', tierDiff: 'Enhanced/Pro only', maturityDiff: null, aiUsed: 'No AI.', trigger: null, dependsOn: [] },
            { id: 'ins-pdf-lock-overlay', name: 'PDF Lock Overlay', tag: 'overlay', description: 'LockedFeatureCard shown for Basic tier', path: '/src/components/LockedFeatureCard.tsx', function: 'Locks PDF export for basic.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          ]
        }
      ]
    },
  ],
  AI: [
    {
      id: 'ai-view',
      name: 'AI Analysis View',
      tag: 'view',
      description: 'Conversational AI analysis',
      path: '/src/features/ai/AIInsightsAgent.tsx',
      function: 'Main AI chat interface. Fetches 14 recent logs, personalizationProfile, and 10 unstructured data entries on first message.',
      tierDiff: null,
      maturityDiff: 'Requires level 1+ (any data).',
      aiUsed: 'Calls gemini-2.0-flash via aiService.',
      trigger: null,
      dependsOn: [],
      children: [
        {
          id: 'ai-agent-header',
          name: 'Agent Header',
          tag: 'section',
          description: 'Agent avatar, title, tier label',
          path: '/src/features/ai/AIInsightsAgent.tsx',
          function: 'Header showing agent status.',
          tierDiff: null,
          maturityDiff: null,
          aiUsed: null,
          trigger: null,
          dependsOn: [],
          children: [
            { id: 'ai-avatar', name: 'Agent Avatar', tag: 'comp', description: 'Agent avatar', path: '/src/features/ai/AIInsightsAgent.tsx', function: 'Displays avatar.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'ai-title-h2', name: 'Agent Title', tag: 'comp', description: 'Agent title', path: '/src/features/ai/AIInsightsAgent.tsx', function: 'Displays title.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'ai-tier-label', name: 'Tier Label', tag: 'comp', description: 'Agent tier label', path: '/src/features/ai/AIInsightsAgent.tsx', function: 'Displays current user tier.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'ai-analyzing-indicator', name: 'Analyzing Indicator', tag: 'comp', description: 'Pulse animation, visible during isAnalyzing', path: '/src/features/ai/AIInsightsAgent.tsx', function: 'Shown during Gemini API call. Blocks input.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: 'Visible when isAnalyzing = true.', dependsOn: [] },
          ]
        },
        {
          id: 'ai-messages-area',
          name: 'Messages Area',
          tag: 'section',
          description: 'Chat history area',
          path: '/src/features/ai/AIMessageList.tsx',
          function: 'Displays session chat history.',
          tierDiff: null,
          maturityDiff: null,
          aiUsed: null,
          trigger: null,
          dependsOn: [],
          children: [
            { id: 'ai-messages-scroll', name: 'Messages Scroll Container', tag: 'comp', description: 'Scrollable container for messages. Uses scrollRef to snap to the bottom on new messages.', path: '/src/features/ai/AIMessageList.tsx', function: 'Scroll bounds.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
              { id: 'ai-msg-sia', name: 'SIA Message Bubble', tag: 'comp', description: 'SIA message bubble', path: '/src/features/ai/AIMessageList.tsx', function: 'Displays AI response. Can trigger insight save action to users/{uid}/insights.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
              { id: 'ai-msg-user', name: 'User Message Bubble', tag: 'comp', description: 'User message bubble', path: '/src/features/ai/AIMessageList.tsx', function: 'Displays user prompt.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            ]},
            { id: 'ai-fidelity-warning', name: 'Fidelity Warning', tag: 'comp', description: 'Visible only if dataMaturity.level < 2', path: '/src/features/ai/AIChatInput.tsx', function: 'Warns about analysis limits.', tierDiff: null, maturityDiff: 'Visible if level < 2.', aiUsed: null, trigger: null, dependsOn: [] },
          ]
        },
        {
          id: 'ai-quick-ask-section',
          name: 'Quick Ask Section',
          tag: 'section',
          description: 'Quick ask toggles and pills',
          path: '/src/features/ai/AIChatInput.tsx',
          function: 'Pre-built prompt shortcuts.',
          tierDiff: 'Enhanced/Pro see deeper diagnostic prompts.',
          maturityDiff: 'Requires level 2+ for pattern-based pills.',
          aiUsed: 'Selects prompt to send to Gemini.',
          trigger: null,
          dependsOn: [],
          children: [
            { id: 'ai-quick-ask-panel', name: 'Quick Ask Panel', tag: 'comp', description: 'Panel for quick ask', path: '/src/features/ai/AIChatInput.tsx', function: 'Wraps toggles.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
              { id: 'ai-quick-ask-toggle', name: 'Quick Ask Toggle', tag: 'btn', description: 'Toggle quick ask', path: '/src/features/ai/AIChatInput.tsx', function: 'Toggles pills.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
              { id: 'ai-maturity-label', name: 'Maturity Label', tag: 'comp', description: 'Maturity label', path: '/src/features/ai/AIChatInput.tsx', function: 'Shows data maturity level.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            ]},
            { id: 'ai-quick-ask-pills', name: 'Quick Ask Pills', tag: 'comp', description: 'Container for quick ask pills', path: '/src/features/ai/AIChatInput.tsx', function: 'List of shortcuts.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
              { id: 'ai-pill-btn', name: 'Quick Ask Pill Button', tag: 'btn', description: 'Tapping a pill calls handleSend(prompt) directly. Disabled while isLoading or isAnalyzing is true.', path: '/src/features/ai/AIChatInput.tsx', function: 'Calls handleSend() with preset question.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            ]},
          ]
        },
        {
          id: 'ai-input-quota-area',
          name: 'Input & Quota Area',
          tag: 'section',
          description: 'Input field, send button, quota info',
          path: '/src/features/ai/AIChatInput.tsx',
          function: 'Input controls and quota gating.',
          tierDiff: null,
          maturityDiff: null,
          aiUsed: null,
          trigger: null,
          dependsOn: [],
          children: [
            { id: 'ai-input-wrapper', name: 'Input Wrapper', tag: 'comp', description: 'Wrapper for input and send button', path: '/src/features/ai/AIChatInput.tsx', function: 'Layout wrapper.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
              { id: 'ai-input-field', name: 'Input Field', tag: 'input', description: 'Chat input field. Disabled while isLoading or isAnalyzing is true.', path: '/src/features/ai/AIChatInput.tsx', function: 'Captures typed message.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
              { id: 'ai-send-btn', name: 'Send Button', tag: 'btn', description: 'Send message button. Disabled while isLoading or isAnalyzing is true.', path: '/src/features/ai/AIChatInput.tsx', function: 'Fires chatWithSIA().', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: 'handleSend()', dependsOn: [] },
            ]},
            { id: 'ai-quota-section', name: 'Quota Section', tag: 'comp', description: 'Quota info container', path: '/src/features/ai/AIChatInput.tsx', function: 'Quota display based on userProfile.quota.', tierDiff: 'Pro sees "Unlimited".', maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
              { id: 'ai-quota-bar', name: 'Quota Bar', tag: 'comp', description: 'Quota progress bar. Calculated as: chatMessagesUsed / getQuotaLimit(tier).', path: '/src/features/ai/AIChatInput.tsx', function: 'Visual quota usage.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
              { id: 'ai-quota-label', name: 'Quota Label', tag: 'comp', description: 'Quota label', path: '/src/features/ai/AIChatInput.tsx', function: 'Text quota usage.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            ]},
            { id: 'ai-upgrade-cta', name: 'Upgrade CTA', tag: 'comp', description: 'Visible for Basic tier only', path: '/src/features/ai/AIChatInput.tsx', function: 'Message quota gate overlay shown when exhausted.', tierDiff: 'Basic sees upgrade CTA, Enhanced sees come back tomorrow, Pro never sees.', maturityDiff: null, aiUsed: null, trigger: 'quota exhausted', dependsOn: [] },
          ]
        },
      ]
    },
  ],
  Account: [
    { 
      id: 'account-view', 
      name: 'Account View', 
      tag: 'view', 
      description: 'User account and subscription management', 
      path: '/src/features/account/AccountPage.tsx',
      function: 'Manages user profile, data, and settings.',
      tierDiff: null,
      maturityDiff: null,
      aiUsed: null,
      trigger: null,
      dependsOn: [],
      children: [
        { id: 'acc-header', name: 'Header Section', tag: 'section', description: 'User avatar and profile info', path: '/src/features/account/AccountPage.tsx', function: 'Displays avatar, name, email, tier badge. Reads from userProfile.', tierDiff: 'Tier badge shows Basic/Enhanced/Pro with distinct styling.', maturityDiff: 'No maturity gate.', aiUsed: 'No AI.', trigger: null, dependsOn: [], children: [
          { id: 'acc-back-btn', name: 'Back Button', tag: 'btn', description: 'Navigates back to Dashboard.', path: '/src/features/account/AccountPage.tsx', function: 'Navigation.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
        { id: 'acc-tier-section', name: 'Intelligence Tier Section', tag: 'section', description: 'Interactive dark section with ambient glow and staged entrance animation, displaying tier upgrade options.', path: '/src/features/account/AccountPage.tsx', function: 'Links to upgrade flow.', tierDiff: 'Basic sees Enhanced and Pro CTAs. Enhanced sees Pro CTA only. Pro sees no CTA.', maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'tier-option-basic', name: 'Basic Tier Option', tag: 'comp', description: 'Basic tier details and activation.', path: '/src/features/account/AccountPage.tsx', function: 'Basic tier info.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'tier-option-enhanced', name: 'Enhanced Tier Option', tag: 'comp', description: 'Enhanced tier details and activation.', path: '/src/features/account/AccountPage.tsx', function: 'Enhanced CTA or status.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'tier-option-pro', name: 'Pro Tier Option', tag: 'comp', description: 'Pro tier details and activation.', path: '/src/features/account/AccountPage.tsx', function: 'Pro CTA or status.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
        { id: 'acc-ethical-pledge', name: 'Ethical Data Pledge', tag: 'section', description: 'Interactive dark section with ambient glow and staged entrance animation, displaying toggle for sharing.', path: '/src/features/account/AccountPage.tsx', function: 'Toggles sharing flag.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [] },
        { id: 'acc-data-overview', name: 'Data Overview Section', tag: 'section', description: 'Sleep goals and demographics', path: '/src/features/account/AccountPage.tsx', function: 'Reads from personalizationProfile. Shows completion status of PersonalizationWizard.', tierDiff: null, maturityDiff: null, aiUsed: 'No AI in display - AI uses this data in chatWithSIA.', trigger: null, dependsOn: [], children: [
          { id: 'acc-maturity-tracker', name: 'Data Maturity Tracker', tag: 'comp', description: 'Multi-bar roadmap for data calibration. Source is Firestore count.', path: '/src/features/data/DataMaturityTracker.tsx', function: 'Progress visualizer.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'acc-goals-list', name: 'Goals List', tag: 'comp', description: 'List of sleep goals', path: '/src/features/account/AccountPage.tsx', function: 'Displays configured goals.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'acc-health-tags', name: 'Health Tags', tag: 'comp', description: 'Health tags', path: '/src/features/account/AccountPage.tsx', function: 'Displays health conditions.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'acc-demographics-row', name: 'Demographics Row', tag: 'comp', description: 'Age, Sex, Work, etc.', path: '/src/features/account/AccountPage.tsx', function: 'Displays demographics.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'acc-anonymized-toggle', name: 'Anonymized Sharing Toggle', tag: 'input', description: 'Writes to personalizationProfile.allowsAnonymizedSharing.', path: '/src/features/account/AccountPage.tsx', function: 'Toggles sharing flag.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
        { id: 'acc-actions', name: 'Actions Section', tag: 'section', description: 'Ledger, Assessment, Logout, Feedback, Element Map', path: '/src/features/account/AccountPage.tsx', function: 'User actions and data ledger.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'acc-element-map-btn', name: 'Element Map Button', tag: 'btn', description: 'Navigates to Element Map view.', path: '/src/features/account/AccountPage.tsx', function: 'Opens dev map.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'acc-modify-assessment-btn', name: 'Modify Assessment Button', tag: 'btn', description: 'Modify assessment', path: '/src/features/account/AccountPage.tsx', function: 'Re-opens wizard.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'acc-export-summary-btn', name: 'Export Summary Button', tag: 'btn', description: 'Downloads daily_trends_summary.csv.', path: '/src/features/account/AccountPage.tsx', function: 'Export gated by isEnhanced. Calls DataExporter utility.', tierDiff: 'Enhanced/Pro only', maturityDiff: null, aiUsed: 'No AI.', trigger: null, dependsOn: [] },
          { id: 'acc-export-deep-btn', name: 'Export Deep Architecture Button', tag: 'btn', description: 'Downloads deep_architecture.csv. Disabled for Basic tier.', path: '/src/features/account/AccountPage.tsx', function: 'Export data.', tierDiff: 'Enhanced/Pro only', maturityDiff: null, aiUsed: 'No AI.', trigger: null, dependsOn: [] },
          { id: 'acc-delete-account-btn', name: 'Delete Account Button', tag: 'btn', description: 'Delete account', path: '/src/features/account/AccountPage.tsx', function: 'Available to all tiers.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
        ]},
        { id: 'acc-dev-tools', name: 'Developer Tools Section', tag: 'section', description: 'Admin-only debugging and data management', path: '/src/features/account/AccountPage.tsx', function: 'Contains AdminMasterPanel (tier/maturity override), DevElementMap.', tierDiff: 'Only visible when userData.role === "admin". Section is hidden entirely for non-admins.', maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
          { id: 'dev-clear-local', name: 'Clear All Local Data Button', tag: 'btn', description: 'Wipes localStorage.', path: '/src/features/account/AccountPage.tsx', function: 'Hard reset.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          { id: 'admin-master-panel', name: 'Admin Master Panel', tag: 'comp', description: 'Admin override panel.', path: '/src/features/dev/AdminMasterPanel.tsx', function: 'Writes tier and levelOverride directly to Firestore.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [], children: [
            { id: 'admin-tier-override', name: 'Tier Toggle Buttons', tag: 'btn', description: 'Override tier', path: '/src/features/dev/AdminMasterPanel.tsx', function: 'Updates tier in DB.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'admin-level-override', name: 'Maturity Level Toggle Buttons', tag: 'btn', description: 'Override level', path: '/src/features/dev/AdminMasterPanel.tsx', function: 'Updates levelOverride in DB.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
            { id: 'admin-deactivate-btn', name: 'Deactivate Override Button', tag: 'btn', description: 'Clears override.', path: '/src/features/dev/AdminMasterPanel.tsx', function: 'Deletes levelOverride field from DB.', tierDiff: null, maturityDiff: null, aiUsed: null, trigger: null, dependsOn: [] },
          ]},
        ]},
      ]
    },
  ],
  Overlays: [
    {
      id: 'ovl-tier-details',
      name: 'Tier Details Modal',
      tag: 'overlay',
      description: 'Triggered by selectedTierDetail state in AccountPage. Shows architecture details for selected tier.',
      path: '/src/features/account/TierDetailsModal.tsx',
      children: [
        { id: 'ovl-tier-details-modal', name: 'Modal', tag: 'overlay', description: 'Modal backdrop and panel', path: '/src/features/account/TierDetailsModal.tsx' },
      ]
    },
    {
      id: 'ovl-ethical-pledge',
      name: 'Ethical Data Pledge Modal',
      tag: 'overlay',
      description: 'Triggered by showModal state in EthicalDataPledge. Backdrop: Clicking does not close the modal.',
      path: '/src/features/account/EthicalDataPledge.tsx',
      children: [
        { id: 'ovl-pledge-backdrop', name: 'Backdrop', tag: 'overlay', description: 'Modal backdrop', path: '/src/features/account/EthicalDataPledge.tsx' },
        { id: 'ovl-pledge-panel', name: 'Panel', tag: 'overlay', description: 'Content panel', path: '/src/features/account/EthicalDataPledge.tsx' },
      ]
    },
    {
      id: 'ovl-prefill-confirm',
      name: 'Prefill Confirmation Modal',
      tag: 'overlay',
      description: 'Triggered by showPrefillConfirm state. Backdrop: Clicking does not close the modal (confirm required).',
      path: '/src/features/ai/SiaPatternReview.tsx',
      children: [
        { id: 'ovl-prefill-backdrop', name: 'Backdrop', tag: 'overlay', description: 'Modal backdrop', path: '/src/features/ai/SiaPatternReview.tsx' },
        { id: 'ovl-prefill-panel', name: 'Panel', tag: 'overlay', description: 'Content panel', path: '/src/features/ai/SiaPatternReview.tsx', children: [
          { id: 'ovl-factor-row', name: 'Factor Row', tag: 'comp', description: 'Data factor row', path: '/src/features/ai/SiaPatternReview.tsx' },
          { id: 'ovl-conf-badge', name: 'Confirmation Badge', tag: 'comp', description: 'Status badge. Colors: emerald (>=75%), indigo (>=50%), amber (<50%) based on confidence.', path: '/src/features/ai/SiaPatternReview.tsx' },
          { id: 'ovl-prefill-cancel', name: 'Cancel Button', tag: 'btn', description: 'Cancel action', path: '/src/features/ai/SiaPatternReview.tsx' },
          { id: 'ovl-prefill-apply', name: 'Apply Button', tag: 'btn', description: 'Apply action', path: '/src/features/ai/SiaPatternReview.tsx' },
        ]},
      ]
    },
    {
      id: 'ovl-wizard',
      name: 'Personalization Wizard',
      tag: 'overlay',
      description: 'Triggered by showPersonalizationWizard state.',
      path: '/src/features/data/PersonalizationWizard.tsx',
      children: [
        { id: 'ovl-wizard-main', name: 'Wizard Main', tag: 'overlay', description: 'Main wizard container', path: '/src/features/data/PersonalizationWizard.tsx', children: [
          { id: 'ovl-wizard-progress', name: 'Progress Bar', tag: 'comp', description: 'Wizard progress', path: '/src/features/data/PersonalizationWizard.tsx' },
          { id: 'wiz-step-demographics', name: 'Step: Demographics', tag: 'comp', description: 'Wizard step 0', path: '/src/features/data/PersonalizationWizard.tsx' },
          { id: 'wiz-step-health', name: 'Step: Health', tag: 'comp', description: 'Wizard step 1', path: '/src/features/data/PersonalizationWizard.tsx' },
          { id: 'wiz-step-goals', name: 'Step: Goals', tag: 'comp', description: 'Wizard step 2', path: '/src/features/data/PersonalizationWizard.tsx' },
          { id: 'wiz-step-psqi', name: 'Step: PSQI', tag: 'comp', description: 'Wizard step 3', path: '/src/features/data/PersonalizationWizard.tsx' },
          { id: 'wiz-step-clinical', name: 'Step: Clinical', tag: 'comp', description: 'Wizard step 4', path: '/src/features/data/PersonalizationWizard.tsx' },
          { id: 'wiz-step-pledge', name: 'Step: Pledge', tag: 'comp', description: 'Wizard step 5', path: '/src/features/data/PersonalizationWizard.tsx' },
          { id: 'wiz-step-devices', name: 'Step: Devices', tag: 'comp', description: 'Wizard step 6', path: '/src/features/data/PersonalizationWizard.tsx' },
          { id: 'wiz-nav-back', name: 'Back Button', tag: 'btn', description: 'Navigate back', path: '/src/features/data/PersonalizationWizard.tsx' },
          { id: 'wiz-nav-next', name: 'Next Button', tag: 'btn', description: 'Navigate next. Calls "Save & Complete" on the final step.', path: '/src/features/data/PersonalizationWizard.tsx' },
        ]},
      ]
    },
    {
      id: 'ovl-sleep-guide',
      name: 'Sleep Guide Modal',
      tag: 'overlay',
      description: 'Triggered by showSleepGuide state.',
      path: '/src/features/sleep/SleepGuideInteractive.tsx',
      children: [
        { id: 'ovl-guide-nav', name: 'Navigation Buttons', tag: 'btn', description: 'Guide navigation', path: '/src/features/sleep/SleepGuideInteractive.tsx' },
        { id: 'ovl-guide-close', name: 'Close Button', tag: 'btn', description: 'Close guide', path: '/src/features/sleep/SleepGuideInteractive.tsx' },
      ]
    },
    {
      id: 'ovl-global-feedback',
      name: 'Global Feedback UI',
      tag: 'overlay',
      description: 'Global feedback components. Higher z-index than standard modals.',
      path: '/src/App.tsx',
      children: [
        { id: 'ovl-toast', name: 'Toast', tag: 'overlay', description: 'Auto-dismisses, fixed bottom-24. High z-index.', path: '/src/App.tsx' },
        { id: 'ovl-refresh-screen', name: 'Refresh Screen', tag: 'overlay', description: 'Shown during isRefreshing, z-[100]. Highest z-index.', path: '/src/App.tsx' },
      ]
    },
    {
      id: 'comp-locks',
      name: 'Inline Locks',
      tag: 'comp',
      description: 'Feature locking components.',
      path: '/src/components/LockedFeatureCard.tsx',
      children: [
        { id: 'comp-locked-card', name: 'Locked Feature Card', tag: 'comp', description: 'LockedFeatureCard component.', path: '/src/components/LockedFeatureCard.tsx' },
        { id: 'ovl-locked-abs', name: 'Locked Absolute Overlay', tag: 'overlay', description: 'Used in SleepPatternCard PDF button.', path: '/src/components/LockedFeatureCard.tsx' },
      ]
    },
  ],
  Navbar: [
    {
      id: 'nav-logo-link',
      name: 'Logo Group',
      tag: 'btn',
      description: 'Logo link. Contains avatar, wordmark, and tier badge.',
      path: '/src/components/Navbar.tsx',
      children: [
        { id: 'nav-avatar', name: 'Logo Avatar', tag: 'comp', description: 'Logo avatar', path: '/src/components/Navbar.tsx' },
        { id: 'nav-wordmark', name: 'Logo Wordmark', tag: 'comp', description: 'SIA wordmark', path: '/src/components/Navbar.tsx' },
        { id: 'nav-tier-badge', name: 'Tier Badge', tag: 'comp', description: 'Tier badge. Label and border color update dynamically based on current tier.', path: '/src/components/Navbar.tsx' },
      ]
    },
    {
      id: 'nav-desktop-links',
      name: 'Desktop Nav Links',
      tag: 'section',
      description: 'Primary navigation links. Active state color derived from getTierStyles().',
      path: '/src/components/Navbar.tsx',
      children: [
        { id: 'nav-link-dash', name: 'Dashboard Link', tag: 'btn', description: 'Navigates to Dashboard', path: '/src/components/Navbar.tsx' },
        { id: 'nav-link-log', name: 'Log Link', tag: 'btn', description: 'Navigates to Log', path: '/src/components/Navbar.tsx' },
        { id: 'nav-link-ins', name: 'Insights Link', tag: 'btn', description: 'Navigates to Insights', path: '/src/components/Navbar.tsx' },
        { id: 'nav-link-guide', name: 'Guide Link', tag: 'btn', description: 'Navigates to Guide', path: '/src/components/Navbar.tsx' },
        { id: 'nav-link-ai', name: 'AI Analysis Link', tag: 'btn', description: 'Navigates to AI Analysis', path: '/src/components/Navbar.tsx' },
      ]
    },
    {
      id: 'nav-user-actions',
      name: 'User Actions (Desktop)',
      tag: 'section',
      description: 'Account and logout actions',
      path: '/src/components/Navbar.tsx',
      children: [
        { id: 'nav-account-btn', name: 'Account Button', tag: 'btn', description: 'Navigates to Account view. AvatarFrame right side.', path: '/src/components/Navbar.tsx' },
        { id: 'nav-logout-btn', name: 'Logout Button', tag: 'btn', description: 'Triggers handleLogout(). LogOut icon.', path: '/src/components/Navbar.tsx' },
      ]
    },
    {
      id: 'nav-mobile',
      name: 'Mobile Navigation',
      tag: 'section',
      description: 'Mobile-specific navigation',
      path: '/src/components/Navbar.tsx',
      children: [
        { id: 'nav-hamburger', name: 'Hamburger Button', tag: 'btn', description: 'Toggles mobile drawer.', path: '/src/components/Navbar.tsx' },
        { id: 'nav-mobile-drawer', name: 'Mobile Drawer', tag: 'overlay', description: 'Slide-in panel containing nav links. Closes automatically upon any navigation event.', path: '/src/components/Navbar.tsx' },
      ]
    },
    {
      id: 'nav-fab-log',
      name: 'Global Floating Action',
      tag: 'btn',
      description: 'Dashboard view only. Routes to Log view for the previous day.',
      path: '/src/components/Navbar.tsx',
    },
  ],
  VOCABULARY_GUIDE_ROW_1: [
    { id: 'voc-view', name: 'View', tag: 'comp', description: 'The top-level page container.', path: 'N/A' },
    { id: 'voc-section', name: 'Section', tag: 'comp', description: 'A logical grouping within a view.', path: 'N/A' },
    { id: 'voc-sub-section', name: 'Sub-section', tag: 'comp', description: 'A nested grouping within a section.', path: 'N/A' },
    { id: 'voc-wrapper', name: 'Wrapper', tag: 'comp', description: 'A layout container for components.', path: 'N/A' },
    { id: 'voc-component', name: 'Component', tag: 'comp', description: 'A reusable UI element.', path: 'N/A' },
    { id: 'voc-card', name: 'Card', tag: 'comp', description: 'The base UI container. Never use box or panel.', path: 'N/A' },
    { id: 'voc-overlay', name: 'Overlay', tag: 'comp', description: 'A layer appearing above content.', path: 'N/A' },
    { id: 'voc-modal', name: 'Modal', tag: 'comp', description: 'A focused overlay requiring interaction.', path: 'N/A' },
    { id: 'voc-backdrop', name: 'Backdrop', tag: 'comp', description: 'The dimmed layer behind an overlay/modal.', path: 'N/A' },
    { id: 'voc-panel', name: 'Panel', tag: 'comp', description: 'A side-drawer or specific content area.', path: 'N/A' },
    { id: 'voc-drawer', name: 'Drawer', tag: 'comp', description: 'A sliding panel.', path: 'N/A' },
    { id: 'voc-button', name: 'Button', tag: 'comp', description: 'A standard interactive element.', path: 'N/A' },
  ],
};
