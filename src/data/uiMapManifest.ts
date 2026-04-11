export interface UIElement {
  id: string;
  name: string;
  tag: 'view' | 'section' | 'card' | 'btn' | 'input' | 'overlay' | 'comp';
  description: string;
  path: string;
  children?: UIElement[];
  role?: string;
}

export const UI_MAP_DATA: Record<string, UIElement[]> = {
  Dashboard: [
    {
      id: 'db-header',
      name: 'Header Section',
      tag: 'section',
      description: 'Main dashboard header',
      path: '/src/components/Dashboard.tsx',
      children: [
        { id: 'sia-avatar', name: 'SIA Avatar', tag: 'comp', description: 'AvatarFrame component', path: '/src/components/Dashboard.tsx' },
        { id: 'intel-badge', name: 'Intelligence Agent Badge', tag: 'comp', description: 'Pill label above greeting', path: '/src/components/Dashboard.tsx' },
        { id: 'greeting-h1', name: 'Greeting Heading', tag: 'comp', description: 'Time-aware greeting', path: '/src/components/Dashboard.tsx' },
        { id: 'greeting-subtext', name: 'Greeting Subtext', tag: 'comp', description: 'Context line', path: '/src/components/Dashboard.tsx' },
      ]
    },
    {
      id: 'db-daily-brief',
      name: 'Weekly Brief Section',
      tag: 'section',
      description: 'AI-generated summary container',
      path: '/src/components/Dashboard.tsx',
      children: [
        { id: 'daily-brief-card', name: 'Weekly Brief Card', tag: 'card', description: 'Tier-coloured container', path: '/src/components/Dashboard.tsx', children: [
          { id: 'brief-body', name: 'Brief Body Text', tag: 'comp', description: 'AI-generated summary', path: '/src/components/Dashboard.tsx' },
          { id: 'discuss-btn', name: 'Discuss with SIA Button', tag: 'btn', description: 'Navigates to AI view via onViewChange(ai). Mutually exclusive with fallback-ui.', path: '/src/components/Dashboard.tsx' },
          { id: 'fallback-ui', name: 'Static Fallback UI', tag: 'comp', description: 'Displays dynamic countdown to 7-day unlock.', path: '/src/components/Dashboard.tsx' },
          { id: 'loading-spinner', name: 'Loading Spinner', tag: 'comp', description: 'Shown while generating brief', path: '/src/components/Dashboard.tsx' },
        ]}
      ]
    },
    {
      id: 'db-status-report',
      name: 'Status Report Section',
      tag: 'section',
      description: '5-card grid of metrics',
      path: '/src/components/Dashboard.tsx',
      children: [
        { id: 'avg-quality', name: 'Avg Quality Card', tag: 'card', description: '7-day average SQ score', path: '/src/components/Dashboard.tsx' },
        { id: 'avg-restedness', name: 'Avg Restedness Card', tag: 'card', description: '7-day average R score', path: '/src/components/Dashboard.tsx' },
        { id: 'avg-energy', name: 'Avg Energy Card', tag: 'card', description: '7-day average L score', path: '/src/components/Dashboard.tsx' },
        { id: 'avg-duration', name: 'Avg Sleep Duration Card', tag: 'card', description: '7-day average duration', path: '/src/components/Dashboard.tsx' },
        { id: 'avg-efficiency', name: 'Avg Efficiency Card', tag: 'card', description: '7-day average efficiency', path: '/src/components/Dashboard.tsx' },
      ]
    },
    {
      id: 'db-quick-insight',
      name: 'SIA Quick Insight Section',
      tag: 'section',
      description: 'Quick insight card and clinical feed',
      path: '/src/components/Dashboard.tsx',
      children: [
        { id: 'quick-insight-card', name: 'Quick Insight Card', tag: 'card', description: 'Full-width clickable card, navigates to AI view', path: '/src/components/Dashboard.tsx', children: [
          { id: 'insight-body', name: 'Insight Body Text', tag: 'comp', description: 'AI-generated insight', path: '/src/components/Dashboard.tsx' },
          { id: 'deep-analysis-row', name: 'Deep Analysis CTA Row', tag: 'comp', description: 'Container for analysis button', path: '/src/components/Dashboard.tsx' },
          { id: 'run-analysis-btn', name: 'Run Deep Analysis Button', tag: 'btn', description: 'Triggers handleDeepAnalysis if user maturity level is 4 (90+ days)', path: '/src/components/Dashboard.tsx' },
          { id: 'disclaimer-text', name: 'Disclaimer Text', tag: 'comp', description: 'Italic disclaimer', path: '/src/components/Dashboard.tsx' },
        ]},
        { id: 'clinical-insights-feed', name: 'Clinical Insights Feed', tag: 'section', description: 'List of insights (InsightCard.tsx for Pro/Enhanced) or locked card (LockedFeatureCard.tsx for Basic)', path: '/src/components/Dashboard.tsx', children: [
          { id: 'insight-card', name: 'InsightCard', tag: 'comp', description: 'Pattern/Risk/Recommendation card', path: '/src/components/InsightCard.tsx' },
          { id: 'locked-feature-card', name: 'LockedFeatureCard', tag: 'comp', description: 'Basic tier locked card', path: '/src/components/LockedFeatureCard.tsx' },
        ]}
      ]
    },
    {
      id: 'db-actions',
      name: 'Engagement & Actions Section',
      tag: 'section',
      description: 'Log, fix, AI buttons',
      path: '/src/components/Dashboard.tsx',
      children: [
        { id: 'log-last-night-card', name: 'Log Last Night Card', tag: 'btn', description: 'Navigates to Log view via onLogClick', path: '/src/components/Dashboard.tsx' },
        { id: 'fix-missing-data-btn', name: 'Fix Missing Data Button', tag: 'btn', description: 'Shown only when correctionsCount > 0, navigates to corrections', path: '/src/components/Dashboard.tsx' },
        { id: 'ai-analysis-card', name: 'AI Analysis Card', tag: 'btn', description: 'Navigates to AI view via onViewChange(ai)', path: '/src/components/Dashboard.tsx' },
      ]
    },
    {
      id: 'db-growth',
      name: 'Growth Hub Section',
      tag: 'section',
      description: 'Educational resources',
      path: '/src/components/Dashboard.tsx',
      children: [
        { id: 'sleep-guide-card', name: 'SleepGuideCard', tag: 'comp', description: 'Opens SleepGuideInteractive via onOpenSleepGuide', path: '/src/components/SleepGuideCard.tsx' },
      ]
    },
    {
      id: 'db-sia-intelligence',
      name: 'SIA Intelligence Feed Section',
      tag: 'section',
      description: 'Diagnostic monitoring',
      path: '/src/components/Dashboard.tsx',
      children: [
        { id: 'sia-intel-feed-card', name: 'SIA Intelligence Feed Card', tag: 'card', description: 'Diagnostic monitoring', path: '/src/components/Dashboard.tsx' },
      ]
    },
    {
      id: 'db-maturity',
      name: 'Data Maturity Section',
      tag: 'section',
      description: 'Progress bar for data calibration',
      path: '/src/components/Dashboard.tsx',
      children: [
        { id: 'maturity-tracker', name: 'Data Maturity Tracker', tag: 'comp', description: 'Progress bar for data calibration', path: '/src/components/DataMaturityTracker.tsx' },
      ]
    },
  ],
  Log: [
    {
      id: 'log-date-selector',
      name: 'Date Selector Bar',
      tag: 'section',
      description: 'Date navigation and context',
      path: '/src/pages/Log.tsx',
      children: [
        { id: 'log-date-prev', name: 'Previous Date Button', tag: 'btn', description: 'Navigates to previous day', path: '/src/pages/Log.tsx' },
        { id: 'log-date-heading', name: 'Date Heading', tag: 'comp', description: 'Displays current date', path: '/src/pages/Log.tsx' },
        { id: 'log-date-label', name: 'Date Label', tag: 'comp', description: 'Contextual date label', path: '/src/pages/Log.tsx' },
        { id: 'log-date-next', name: 'Next Date Button', tag: 'btn', description: 'Navigates to next day', path: '/src/pages/Log.tsx' },
      ]
    },
    {
      id: 'log-timeline',
      name: 'Timeline Section',
      tag: 'section',
      description: 'SIA learning, edit controls, sleep window grid',
      path: '/src/pages/Log.tsx',
      children: [
        { id: 'log-timeline-anchor', name: 'Timeline Anchor', tag: 'comp', description: 'Container for routine, learning, and controls', path: '/src/pages/Log.tsx', children: [
          { id: 'log-sia-routine-btn', name: 'SIA Routine Button', tag: 'btn', description: 'Toggles routine mode. Requires historyCount >= 3.', path: '/src/pages/Log.tsx' },
          { id: 'log-sia-learning-label', name: 'SIA Learning Label', tag: 'comp', description: 'Status indicator', path: '/src/pages/Log.tsx' },
          { id: 'log-edit-controls', name: 'Edit Controls', tag: 'comp', description: 'Undo/Cancel/Save buttons. Hidden unless isEditing is true.', path: '/src/pages/Log.tsx' },
        ]},
        { id: 'log-state-selectors', name: 'State Selectors', tag: 'comp', description: 'Awake/Sleep state toggle. Hidden unless isEditing is true.', path: '/src/pages/Log.tsx', children: [
          { id: 'awake-btn', name: 'Awake Button', tag: 'btn', description: 'Set state to awake', path: '/src/pages/Log.tsx' },
          { id: 'sleep-btn', name: 'Sleep Button', tag: 'btn', description: 'Set state to sleep', path: '/src/pages/Log.tsx' },
        ]},
        { id: 'log-sleep-window-container', name: 'Sleep Window Container', tag: 'comp', description: 'Container for sleep window grid', path: '/src/pages/Log.tsx', children: [
          { id: 'log-has-data-overlay', name: 'Data Overlay', tag: 'overlay', description: 'Shown when log view is loaded', path: '/src/pages/Log.tsx' },
          { id: 'log-grid', name: 'Sleep Window Grid', tag: 'comp', description: 'SleepWindow component', path: '/src/components/SleepWindow.tsx' },
          { id: 'log-scroll-hint', name: 'Scroll Hint', tag: 'comp', description: 'Visual scroll indicator', path: '/src/pages/Log.tsx' },
        ]},
        { id: 'log-stats-footer', name: 'Stats Footer', tag: 'comp', description: 'Summary statistics', path: '/src/pages/Log.tsx' },
      ]
    },
    {
      id: 'log-factors',
      name: 'Daily Factors & Disturbances Section',
      tag: 'section',
      description: 'Toggle rows for caffeine, alcohol, etc.',
      path: '/src/pages/Log.tsx',
      children: [
        { id: 'factor-caffeine', name: 'Caffeine Toggle', tag: 'comp', description: 'Toggle row', path: '/src/pages/Log.tsx', children: [
          { id: 'caffeine-count-input', name: 'Caffeine Count', tag: 'input', description: 'Sub-input. Visible only when factor-caffeine is toggled.', path: '/src/pages/Log.tsx' },
          { id: 'caffeine-time-input', name: 'Caffeine Time', tag: 'input', description: 'Sub-input. Visible only when factor-caffeine is toggled.', path: '/src/pages/Log.tsx' },
        ]},
        { id: 'factor-alcohol', name: 'Alcohol Toggle', tag: 'comp', description: 'Toggle row', path: '/src/pages/Log.tsx' },
        { id: 'factor-medication', name: 'Medication Toggle', tag: 'comp', description: 'Toggle row', path: '/src/pages/Log.tsx' },
      ]
    },
    {
      id: 'log-tools',
      name: 'Sleep Support Tools Section',
      tag: 'section',
      description: 'Collapsible interventions, passive aids, tracking',
      path: '/src/pages/Log.tsx',
      children: [
        { id: 'support-toggle-btn', name: 'Support Tools Toggle', tag: 'btn', description: 'Collapsible toggle button', path: '/src/pages/Log.tsx' },
        { id: 'interventions-grid', name: 'Interventions Grid', tag: 'comp', description: 'Grid of intervention gadgets', path: '/src/pages/Log.tsx' },
        { id: 'passive-aids-grid', name: 'Passive Aids Grid', tag: 'comp', description: 'Grid of passive aid gadgets', path: '/src/pages/Log.tsx' },
        { id: 'tracking-grid', name: 'Tracking Grid', tag: 'comp', description: 'Grid of tracking gadgets', path: '/src/pages/Log.tsx' },
        { id: 'gadget-toggle-btn', name: 'Gadget Toggle', tag: 'btn', description: 'Toggle for individual gadget', path: '/src/pages/Log.tsx' },
      ]
    },
    {
      id: 'log-remarks',
      name: 'Remarks Section',
      tag: 'section',
      description: 'Daily remarks textarea',
      path: '/src/pages/Log.tsx',
      children: [
        { id: 'log-remarks-textarea', name: 'Remarks Textarea', tag: 'input', description: 'Textarea for daily notes', path: '/src/pages/Log.tsx' },
      ]
    },
  ],
  Insights: [
    {
      id: 'ins-header',
      name: 'Insights Header',
      tag: 'section',
      description: 'View title, date range, tab bar, clinical report button',
      path: '/src/pages/Insights.tsx',
      children: [
        { id: 'ins-view-title', name: 'View Title', tag: 'comp', description: 'Insights title', path: '/src/pages/Insights.tsx' },
        { id: 'ins-date-range-label', name: 'Date Range Label', tag: 'comp', description: 'Selected date range', path: '/src/pages/Insights.tsx' },
        { id: 'ins-tab-bar', name: 'Tab Bar', tag: 'section', description: 'Date range navigation', path: '/src/pages/Insights.tsx', children: [
          { id: 'ins-tab-7d', name: '7-Day Tab', tag: 'btn', description: 'Select 7-day range. Triggers 7d view state.', path: '/src/pages/Insights.tsx' },
          { id: 'ins-tab-30d', name: '30-Day Tab', tag: 'btn', description: 'Select 30-day range. Triggers 30d view state.', path: '/src/pages/Insights.tsx' },
          { id: 'ins-tab-custom', name: 'Custom Tab', tag: 'btn', description: 'Select custom range. Triggers custom view state.', path: '/src/pages/Insights.tsx' },
        ]},
        { id: 'ins-custom-pickers', name: 'Custom Date Pickers', tag: 'section', description: 'Visible only when view === custom', path: '/src/pages/Insights.tsx', children: [
          { id: 'ins-picker-start', name: 'Start Date Picker', tag: 'input', description: 'Start date selection', path: '/src/pages/Insights.tsx' },
          { id: 'ins-picker-end', name: 'End Date Picker', tag: 'input', description: 'End date selection', path: '/src/pages/Insights.tsx' },
        ]},
      ]
    },
    {
      id: 'ins-averages',
      name: 'Averages Grid',
      tag: 'section',
      description: '5 MetricDisplay components. Read-only visual components.',
      path: '/src/pages/Insights.tsx',
      children: [
        { id: 'ins-avg-quality', name: 'Avg Quality', tag: 'comp', description: 'MetricDisplay component. Read-only visual component.', path: '/src/pages/Insights.tsx' },
        { id: 'ins-avg-restedness', name: 'Avg Restedness', tag: 'comp', description: 'MetricDisplay component. Read-only visual component.', path: '/src/pages/Insights.tsx' },
        { id: 'ins-avg-energy', name: 'Avg Energy', tag: 'comp', description: 'MetricDisplay component. Read-only visual component.', path: '/src/pages/Insights.tsx' },
        { id: 'ins-avg-duration', name: 'Avg Duration', tag: 'comp', description: 'MetricDisplay component. Read-only visual component.', path: '/src/pages/Insights.tsx' },
        { id: 'ins-avg-efficiency', name: 'Avg Efficiency', tag: 'comp', description: 'MetricDisplay component. Read-only visual component.', path: '/src/pages/Insights.tsx' },
      ]
    },
    {
      id: 'ins-breakdown',
      name: 'Breakdown List',
      tag: 'section',
      description: 'Daily breakdown rows with SleepRibbon',
      path: '/src/pages/Insights.tsx',
      children: [
        { id: 'ins-breakdown-container', name: 'Breakdown Container', tag: 'comp', description: 'Container for daily rows', path: '/src/pages/Insights.tsx', children: [
          { id: 'ins-daily-row', name: 'Daily Row', tag: 'comp', description: 'Single day breakdown row', path: '/src/pages/Insights.tsx', children: [
            { id: 'ins-sleep-ribbon', name: 'Sleep Ribbon', tag: 'comp', description: 'SleepRibbon component. Read-only visual component.', path: '/src/components/SleepRibbon.tsx' },
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
      children: [
        {
          id: 'ins-pattern-summary',
          name: 'Sleep Pattern Summary Card',
          tag: 'card',
          description: 'Pattern metric grid, export buttons',
          path: '/src/components/SleepPatternCard.tsx',
          children: [
            { id: 'ins-pattern-metric-grid', name: 'Pattern Metric Grid', tag: 'comp', description: 'Grid with hover tooltips', path: '/src/components/SleepPatternCard.tsx' },
            { id: 'ins-export-ascii-btn', name: 'Export ASCII Button', tag: 'btn', description: 'Export pattern as ASCII', path: '/src/components/SleepPatternCard.tsx' },
            { id: 'ins-export-pdf-btn', name: 'Export PDF Button', tag: 'btn', description: 'Export pattern as PDF. Dual State: Pro = Action, Basic = Upgrade Overlay.', path: '/src/components/SleepPatternCard.tsx' },
            { id: 'ins-pdf-lock-overlay', name: 'PDF Lock Overlay', tag: 'overlay', description: 'LockedFeatureCard shown for Basic tier', path: '/src/components/LockedFeatureCard.tsx' },
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
      path: '/src/components/AIInsightsAgent.tsx',
      children: [
        {
          id: 'ai-agent-header',
          name: 'Agent Header',
          tag: 'section',
          description: 'Agent avatar, title, tier label',
          path: '/src/components/AIInsightsAgent.tsx',
          children: [
            { id: 'ai-avatar', name: 'Agent Avatar', tag: 'comp', description: 'Agent avatar', path: '/src/components/AIInsightsAgent.tsx' },
            { id: 'ai-title-h2', name: 'Agent Title', tag: 'comp', description: 'Agent title', path: '/src/components/AIInsightsAgent.tsx' },
            { id: 'ai-tier-label', name: 'Tier Label', tag: 'comp', description: 'Agent tier label', path: '/src/components/AIInsightsAgent.tsx' },
            { id: 'ai-analyzing-indicator', name: 'Analyzing Indicator', tag: 'comp', description: 'Pulse animation, visible during isAnalyzing', path: '/src/components/AIInsightsAgent.tsx' },
          ]
        },
        {
          id: 'ai-messages-area',
          name: 'Messages Area',
          tag: 'section',
          description: 'Chat history area',
          path: '/src/components/AIInsightsAgent.tsx',
          children: [
            { id: 'ai-messages-scroll', name: 'Messages Scroll Container', tag: 'comp', description: 'Scrollable container for messages. Uses scrollRef to snap to the bottom on new messages.', path: '/src/components/AIInsightsAgent.tsx', children: [
              { id: 'ai-msg-sia', name: 'SIA Message Bubble', tag: 'comp', description: 'SIA message bubble', path: '/src/components/AIInsightsAgent.tsx' },
              { id: 'ai-msg-user', name: 'User Message Bubble', tag: 'comp', description: 'User message bubble', path: '/src/components/AIInsightsAgent.tsx' },
            ]},
            { id: 'ai-fidelity-warning', name: 'Fidelity Warning', tag: 'comp', description: 'Visible only if dataMaturity.level < 2', path: '/src/components/AIInsightsAgent.tsx' },
          ]
        },
        {
          id: 'ai-quick-ask-section',
          name: 'Quick Ask Section',
          tag: 'section',
          description: 'Quick ask toggles and pills',
          path: '/src/components/AIInsightsAgent.tsx',
          children: [
            { id: 'ai-quick-ask-panel', name: 'Quick Ask Panel', tag: 'comp', description: 'Panel for quick ask', path: '/src/components/AIInsightsAgent.tsx', children: [
              { id: 'ai-quick-ask-toggle', name: 'Quick Ask Toggle', tag: 'btn', description: 'Toggle quick ask', path: '/src/components/AIInsightsAgent.tsx' },
              { id: 'ai-maturity-label', name: 'Maturity Label', tag: 'comp', description: 'Maturity label', path: '/src/components/AIInsightsAgent.tsx' },
            ]},
            { id: 'ai-quick-ask-pills', name: 'Quick Ask Pills', tag: 'comp', description: 'Container for quick ask pills', path: '/src/components/AIInsightsAgent.tsx', children: [
              { id: 'ai-pill-btn', name: 'Quick Ask Pill Button', tag: 'btn', description: 'Tapping a pill calls handleSend(prompt) directly. Disabled while isLoading or isAnalyzing is true.', path: '/src/components/AIInsightsAgent.tsx' },
            ]},
          ]
        },
        {
          id: 'ai-input-quota-area',
          name: 'Input & Quota Area',
          tag: 'section',
          description: 'Input field, send button, quota info',
          path: '/src/components/AIInsightsAgent.tsx',
          children: [
            { id: 'ai-input-wrapper', name: 'Input Wrapper', tag: 'comp', description: 'Wrapper for input and send button', path: '/src/components/AIInsightsAgent.tsx', children: [
              { id: 'ai-input-field', name: 'Input Field', tag: 'input', description: 'Chat input field. Disabled while isLoading or isAnalyzing is true.', path: '/src/components/AIInsightsAgent.tsx' },
              { id: 'ai-send-btn', name: 'Send Button', tag: 'btn', description: 'Send message button. Disabled while isLoading or isAnalyzing is true.', path: '/src/components/AIInsightsAgent.tsx' },
            ]},
            { id: 'ai-quota-section', name: 'Quota Section', tag: 'comp', description: 'Quota info container', path: '/src/components/AIInsightsAgent.tsx', children: [
              { id: 'ai-quota-bar', name: 'Quota Bar', tag: 'comp', description: 'Quota progress bar. Calculated as: chatMessagesUsed / getQuotaLimit(tier).', path: '/src/components/AIInsightsAgent.tsx' },
              { id: 'ai-quota-label', name: 'Quota Label', tag: 'comp', description: 'Quota label', path: '/src/components/AIInsightsAgent.tsx' },
            ]},
            { id: 'ai-upgrade-cta', name: 'Upgrade CTA', tag: 'comp', description: 'Visible for Basic tier only', path: '/src/components/AIInsightsAgent.tsx' },
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
      path: '/src/pages/Account.tsx',
      children: [
        { id: 'acc-header', name: 'Header Section', tag: 'section', description: 'User avatar and profile info', path: '/src/pages/Account.tsx', children: [
          { id: 'acc-back-btn', name: 'Back Button', tag: 'btn', description: 'Navigates back to Dashboard.', path: '/src/pages/Account.tsx' },
        ]},
        { id: 'acc-tier-section', name: 'Intelligence Tier Section', tag: 'section', description: 'Display and upgrade for SIA tiers', path: '/src/pages/Account.tsx', children: [
          { id: 'tier-container', name: 'Tier Container', tag: 'section', description: 'Container for tier cards', path: '/src/pages/Account.tsx', children: [
            { id: 'tier-card-basic', name: 'Basic Tier Card', tag: 'card', description: 'Basic tier details. Border: Green.', path: '/src/pages/Account.tsx' },
            { id: 'tier-card-enhanced', name: 'Enhanced Tier Card', tag: 'card', description: 'Enhanced tier details. Border: Indigo.', path: '/src/pages/Account.tsx' },
            { id: 'tier-card-pro', name: 'Pro Tier Card', tag: 'card', description: 'Pro tier details. Border: Violet.', path: '/src/pages/Account.tsx' },
          ]},
          { id: 'acc-upgrade-btn', name: 'Upgrade Button', tag: 'btn', description: 'Triggers onModifyAssessment(). Links to PersonalizationWizard global overlay.', path: '/src/pages/Account.tsx' },
        ]},
        { id: 'acc-maturity-tracker', name: 'Data Maturity Tracker', tag: 'comp', description: 'Progress bar for data calibration. Source is Firestore count.', path: '/src/components/DataMaturityTracker.tsx' },
        { id: 'acc-data-overview', name: 'Data Overview Section', tag: 'section', description: 'Sleep goals and demographics', path: '/src/pages/Account.tsx', children: [
          { id: 'acc-import-credit-label', name: 'Imported Data Credit Label', tag: 'comp', description: 'Displays imported log count', path: '/src/pages/Account.tsx' },
          { id: 'acc-goals-list', name: 'Goals List', tag: 'comp', description: 'List of sleep goals', path: '/src/pages/Account.tsx' },
          { id: 'acc-health-tags', name: 'Health Tags', tag: 'comp', description: 'Health tags', path: '/src/pages/Account.tsx' },
          { id: 'acc-demographics-row', name: 'Demographics Row', tag: 'comp', description: 'Age, Sex, Work, etc.', path: '/src/pages/Account.tsx' },
          { id: 'acc-anonymized-toggle', name: 'Anonymized Sharing Toggle', tag: 'input', description: 'Writes to personalizationProfile.allowsAnonymizedSharing.', path: '/src/pages/Account.tsx' },
        ]},
        { id: 'acc-actions', name: 'Actions Section', tag: 'section', description: 'Ledger, Assessment, Logout, Feedback', path: '/src/pages/Account.tsx', children: [
          { id: 'acc-modify-assessment-btn', name: 'Modify Assessment Button', tag: 'btn', description: 'Modify assessment', path: '/src/pages/Account.tsx' },
          { id: 'acc-export-summary-btn', name: 'Export Summary Button', tag: 'btn', description: 'Downloads daily_trends_summary.csv.', path: '/src/pages/Account.tsx' },
          { id: 'acc-export-deep-btn', name: 'Export Deep Architecture Button', tag: 'btn', description: 'Downloads deep_architecture.csv. Disabled for Basic tier.', path: '/src/pages/Account.tsx' },
          { id: 'acc-delete-account-btn', name: 'Delete Account Button', tag: 'btn', description: 'Delete account', path: '/src/pages/Account.tsx' },
        ]},
        { id: 'acc-dev-tools', name: 'Developer Tools Section', tag: 'section', description: 'Admin-only debugging and data management', path: '/src/pages/Account.tsx', children: [
          { id: 'dev-maturity-input', name: 'Maturity Override Input', tag: 'input', description: 'Dev Environment Only / Admin only.', path: '/src/pages/Account.tsx' },
          { id: 'dev-tier-switcher', name: 'Tier Switcher', tag: 'input', description: 'Dev Environment Only / Admin only.', path: '/src/pages/Account.tsx' },
          { id: 'dev-open-map-btn', name: 'Open Map Button', tag: 'btn', description: 'Navigates to /dev/map. Dev Environment Only / Admin only.', path: '/src/pages/Account.tsx' },
        ]}
      ]
    },
  ],
  Overlays: [
    {
      id: 'ovl-prefill-confirm',
      name: 'Prefill Confirmation Modal',
      tag: 'overlay',
      description: 'Triggered by showPrefillConfirm state. Backdrop: Clicking does not close the modal (confirm required).',
      path: '/src/components/SiaPatternReview.tsx',
      children: [
        { id: 'ovl-prefill-backdrop', name: 'Backdrop', tag: 'overlay', description: 'Modal backdrop', path: '/src/components/SiaPatternReview.tsx' },
        { id: 'ovl-prefill-panel', name: 'Panel', tag: 'overlay', description: 'Content panel', path: '/src/components/SiaPatternReview.tsx', children: [
          { id: 'ovl-factor-row', name: 'Factor Row', tag: 'comp', description: 'Data factor row', path: '/src/components/SiaPatternReview.tsx' },
          { id: 'ovl-conf-badge', name: 'Confirmation Badge', tag: 'comp', description: 'Status badge. Colors: emerald (>=75%), indigo (>=50%), amber (<50%) based on confidence.', path: '/src/components/SiaPatternReview.tsx' },
          { id: 'ovl-prefill-cancel', name: 'Cancel Button', tag: 'btn', description: 'Cancel action', path: '/src/components/SiaPatternReview.tsx' },
          { id: 'ovl-prefill-apply', name: 'Apply Button', tag: 'btn', description: 'Apply action', path: '/src/components/SiaPatternReview.tsx' },
        ]},
      ]
    },
    {
      id: 'ovl-wizard',
      name: 'Personalization Wizard',
      tag: 'overlay',
      description: 'Triggered by showPersonalizationWizard state.',
      path: '/src/components/PersonalizationWizard.tsx',
      children: [
        { id: 'ovl-wizard-main', name: 'Wizard Main', tag: 'overlay', description: 'Main wizard container', path: '/src/components/PersonalizationWizard.tsx', children: [
          { id: 'ovl-wizard-progress', name: 'Progress Bar', tag: 'comp', description: 'Wizard progress', path: '/src/components/PersonalizationWizard.tsx' },
          { id: 'wiz-step-demographics', name: 'Step: Demographics', tag: 'comp', description: 'Wizard step 0', path: '/src/components/PersonalizationWizard.tsx' },
          { id: 'wiz-step-health', name: 'Step: Health', tag: 'comp', description: 'Wizard step 1', path: '/src/components/PersonalizationWizard.tsx' },
          { id: 'wiz-step-goals', name: 'Step: Goals', tag: 'comp', description: 'Wizard step 2', path: '/src/components/PersonalizationWizard.tsx' },
          { id: 'wiz-step-psqi', name: 'Step: PSQI', tag: 'comp', description: 'Wizard step 3', path: '/src/components/PersonalizationWizard.tsx' },
          { id: 'wiz-step-clinical', name: 'Step: Clinical', tag: 'comp', description: 'Wizard step 4', path: '/src/components/PersonalizationWizard.tsx' },
          { id: 'wiz-step-pledge', name: 'Step: Pledge', tag: 'comp', description: 'Wizard step 5', path: '/src/components/PersonalizationWizard.tsx' },
          { id: 'wiz-step-devices', name: 'Step: Devices', tag: 'comp', description: 'Wizard step 6', path: '/src/components/PersonalizationWizard.tsx' },
          { id: 'wiz-nav-back', name: 'Back Button', tag: 'btn', description: 'Navigate back', path: '/src/components/PersonalizationWizard.tsx' },
          { id: 'wiz-nav-next', name: 'Next Button', tag: 'btn', description: 'Navigate next. Calls "Save & Complete" on the final step.', path: '/src/components/PersonalizationWizard.tsx' },
        ]},
      ]
    },
    {
      id: 'ovl-sleep-guide',
      name: 'Sleep Guide Modal',
      tag: 'overlay',
      description: 'Triggered by showSleepGuide state.',
      path: '/src/components/SleepGuideInteractive.tsx',
      children: [
        { id: 'ovl-guide-nav', name: 'Navigation Buttons', tag: 'btn', description: 'Guide navigation', path: '/src/components/SleepGuideInteractive.tsx' },
        { id: 'ovl-guide-close', name: 'Close Button', tag: 'btn', description: 'Close guide', path: '/src/components/SleepGuideInteractive.tsx' },
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
