import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { DailyLog, PersonalizationProfile, UserProfile } from '../types';
import { MaturityInfo } from '../services/ai/core/maturitySystem';
import { User } from '../lib/firebase';
import { useSleepStore } from '../store/useSleepStore';

interface UserContextType {
  logs: Record<string, DailyLog>;
  user: User | null;
  userProfile: UserProfile | null;
  personalizationProfile: PersonalizationProfile | null;
  isProfileLoading: boolean;
  tier: string;
  dataDepth: {
    level: number;
    label: string;
    nextThreshold: number;
    count: number;
  };
  maturity: MaturityInfo | null;
  highlightTier: boolean;
  setMockLogs: (logs: Record<string, DailyLog> | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{
  children: React.ReactNode;
  user: User | null;
  userProfile: UserProfile | null;
  personalizationProfile: PersonalizationProfile | null;
  isProfileLoading: boolean;
  tier: string;
  maturity: MaturityInfo | null;
  highlightTier: boolean;
}> = ({ children, user, userProfile, personalizationProfile, isProfileLoading, tier, maturity, highlightTier }) => {
  
  const [mockLogs, setMockLogs] = useState<Record<string, DailyLog> | null>(null);
  const { logs: storeLogs } = useSleepStore();

  useEffect(() => {
    // mockLogs removed
  }, [mockLogs]);

  const activeLogs = mockLogs || storeLogs;

  const dataDepth = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const devMaturity = process.env.NODE_ENV === 'development' 
      ? (params.get('dev_maturity') || localStorage.getItem('dev_maturity'))
      : null;

    if (devMaturity) {
      const maturityMap: Record<string, { level: number; label: string; nextThreshold: number; count: number }> = {
        'Baseline': { level: 1, label: 'Baseline', nextThreshold: 7, count: 0 },
        'Trends': { level: 2, label: 'Trends', nextThreshold: 14, count: 7 },
        'Deep': { level: 3, label: 'Deep Analysis', nextThreshold: 90, count: 14 },
        'Advanced': { level: 4, label: 'Advanced Diagnostic', nextThreshold: 90, count: 90 },
      };
      return maturityMap[devMaturity] || { level: 1, label: 'Baseline', nextThreshold: 7, count: 0 };
    }

    const firestoreCount = maturity?.count ?? 0;
    const localCount = Object.keys(activeLogs).length;
    const count = Math.max(firestoreCount, localCount);
    
    if (count >= 90) return { level: 4, label: 'Advanced Diagnostic', nextThreshold: 90, count };
    if (count >= 14) return { level: 3, label: 'Deep Analysis', nextThreshold: 90, count };
    if (count >= 7) return { level: 2, label: 'Trends', nextThreshold: 14, count };
    return { level: 1, label: 'Baseline', nextThreshold: 7, count };
  }, [activeLogs, maturity]);

  const activeTier = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const devTier = process.env.NODE_ENV === 'development' 
      ? (params.get('dev_tier') || localStorage.getItem('dev_tier'))
      : null;
    return devTier || tier;
  }, [tier]);

  const value = useMemo(() => ({
    logs: activeLogs,
    user,
    userProfile,
    personalizationProfile,
    isProfileLoading,
    tier: activeTier,
    dataDepth,
    maturity,
    highlightTier,
    setMockLogs
  }), [activeLogs, user, userProfile, personalizationProfile, isProfileLoading, activeTier, dataDepth, maturity, highlightTier]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
