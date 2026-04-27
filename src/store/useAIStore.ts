import { create } from 'zustand';
import { SuggestionResult, AICorrection } from '../utils/patternEngine';
import { DailyLog } from '../types';

interface AIStore {
  aiCorrections: AICorrection[];
  setAiCorrections: (corrections: AICorrection[]) => void;
  activeSuggestion: SuggestionResult | null;
  setActiveSuggestion: (suggestion: SuggestionResult | null) => void;
  prefillUsed: boolean;
  setPrefillUsed: (used: boolean) => void;
  originalSuggestion: Partial<DailyLog> | null;
  setOriginalSuggestion: (original: Partial<DailyLog> | null) => void;
  showPrefillConfirm: boolean;
  setShowPrefillConfirm: (show: boolean) => void;
  showPatternReview: boolean;
  setShowPatternReview: (show: boolean) => void;
  pendingSuggestion: SuggestionResult | null;
  setPendingSuggestion: (suggestion: SuggestionResult | null) => void;
}

export const useAIStore = create<AIStore>((set) => ({
  aiCorrections: [],
  setAiCorrections: (aiCorrections) => set({ aiCorrections }),
  activeSuggestion: null,
  setActiveSuggestion: (activeSuggestion) => set({ activeSuggestion }),
  prefillUsed: false,
  setPrefillUsed: (prefillUsed) => set({ prefillUsed }),
  originalSuggestion: null,
  setOriginalSuggestion: (originalSuggestion) => set({ originalSuggestion }),
  showPrefillConfirm: false,
  setShowPrefillConfirm: (showPrefillConfirm) => set({ showPrefillConfirm }),
  showPatternReview: false,
  setShowPatternReview: (showPatternReview) => set({ showPatternReview }),
  pendingSuggestion: null,
  setPendingSuggestion: (pendingSuggestion) => set({ pendingSuggestion }),
}));
