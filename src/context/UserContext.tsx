import React, { createContext, useContext, useMemo } from 'react';
import { DailyLog, PersonalizationProfile, UserProfile } from '../types';
import { MaturityInfo } from '../services/aiService';
import { User } from '../lib/firebase';

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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{
  children: React.ReactNode;
  logs: Record<string, DailyLog>;
  user: User | null;
  userProfile: UserProfile | null;
  personalizationProfile: PersonalizationProfile | null;
  isProfileLoading: boolean;
  tier: string;
  maturity: MaturityInfo | null;
  highlightTier: boolean;
}> = ({ children, logs, user, userProfile, personalizationProfile, isProfileLoading, tier, maturity, highlightTier }) => {
  
  const dataDepth = useMemo(() => {
    const count = Object.keys(logs).length;
    if (count >= 90) return { level: 3, label: 'Advanced Analysis', nextThreshold: 90, count };
    if (count >= 15) return { level: 2, label: 'Pattern Discovery', nextThreshold: 90, count };
    return { level: 1, label: 'Initializing', nextThreshold: 15, count };
  }, [logs]);

  const value = useMemo(() => ({
    logs,
    user,
    userProfile,
    personalizationProfile,
    isProfileLoading,
    tier,
    dataDepth,
    maturity,
    highlightTier
  }), [logs, user, userProfile, personalizationProfile, isProfileLoading, tier, dataDepth, maturity, highlightTier]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
