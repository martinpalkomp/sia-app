import { create } from 'zustand';
import { getTodayDate } from '../utils/dateUtils';

interface UIStore {
  view: 'dashboard' | 'log' | 'weekly' | 'monthly' | 'custom' | 'ai' | 'corrections' | 'legal' | 'account' | 'import' | 'dev-map' | 'guide';
  setView: (view: 'dashboard' | 'log' | 'weekly' | 'monthly' | 'custom' | 'ai' | 'corrections' | 'legal' | 'account' | 'import' | 'dev-map' | 'guide') => void;
  direction: number;
  setDirection: (direction: number) => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
  showSleepGuide: boolean;
  setShowSleepGuide: (show: boolean) => void;
  isSleepToolsExpanded: boolean;
  setIsSleepToolsExpanded: (expanded: boolean) => void;
  highlightTier: boolean;
  setHighlightTier: (highlight: boolean) => void;
  showPersonalizationWizard: boolean;
  setShowPersonalizationWizard: (show: boolean) => void;
  customRange: { start: string; end: string };
  setCustomRange: (range: { start: string; end: string }) => void;
  isRefreshing: boolean;
  setIsRefreshing: (refreshing: boolean) => void;
  refreshKey: number;
  setRefreshKey: (key: number) => void;
  isImporting: boolean;
  setIsImporting: (importing: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  view: 'dashboard',
  setView: (view) => set({ view }),
  direction: 0,
  setDirection: (direction) => set({ direction }),
  toast: null,
  setToast: (toast) => set({ toast }),
  showSleepGuide: false,
  setShowSleepGuide: (show) => set({ showSleepGuide: show }),
  isSleepToolsExpanded: false,
  setIsSleepToolsExpanded: (isSleepToolsExpanded) => set({ isSleepToolsExpanded }),
  highlightTier: false,
  setHighlightTier: (highlightTier) => set({ highlightTier }),
  showPersonalizationWizard: false,
  setShowPersonalizationWizard: (showPersonalizationWizard) => set({ showPersonalizationWizard }),
  customRange: { start: getTodayDate(), end: getTodayDate() },
  setCustomRange: (customRange) => set({ customRange }),
  isRefreshing: false,
  setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
  refreshKey: 0,
  setRefreshKey: (refreshKey) => set({ refreshKey }),
  isImporting: false,
  setIsImporting: (isImporting) => set({ isImporting }),
}));
