import { handleFirestoreError, OperationType } from "../lib/errorHandling";
import { 
  db, 
  collection, 
  query, 
  where, 
  getDocs, 
  getCountFromServer,
  serverTimestamp, 
  doc, 
  getDoc, 
  updateDoc,
  setDoc
} from "../lib/firebase";
import { UserTier, UserQuota } from "../types";
import { startOfDay } from "date-fns";

export interface MaturityInfo {
  level: 1 | 2 | 3 | 4;
  count: number;
  label?: string;
  nextThreshold: number;
}

export class AIService {

  static async getUserDataMaturity(userId: string): Promise<MaturityInfo> {
    try {
      if (!db) throw new Error('Firestore not initialized');
      const userSnap = await getDoc(doc(db, 'users', userId));
      const userData = userSnap.data();
      if (userData?.levelOverride) {
        const level = userData.levelOverride;
        if (level === 4) return { level: 4, count: 90, label: 'Advanced Diagnostic', nextThreshold: 90 };
        if (level === 3) return { level: 3, count: 14, label: 'Deep Analysis', nextThreshold: 90 };
        if (level === 2) return { level: 2, count: 7, label: 'Trends', nextThreshold: 14 };
        return { level: 1, count: 0, label: 'Baseline', nextThreshold: 7 };
      }

      const logsRef = collection(db, 'users', userId, 'sleep_logs');
      const countSnapshot = await getCountFromServer(
        query(logsRef, where('type', '==', 'log'))
      );
      const count = countSnapshot.data().count;

      if (count >= 90) return { level: 4, count, label: 'Advanced Diagnostic', nextThreshold: 90 };
      if (count >= 14) return { level: 3, count, label: 'Deep Analysis', nextThreshold: 90 };
      if (count >= 7) return { level: 2, count, label: 'Trends', nextThreshold: 14 };
      return { level: 1, count, label: 'Baseline', nextThreshold: 7 };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      return { level: 1, count: 0, label: 'Baseline', nextThreshold: 7 };
    }
  }

  static async checkAndResetQuota(userId: string, tier: UserTier): Promise<UserQuota> {
    const userRef = doc(db!, 'users', userId);
    let userSnap;
    try {
      userSnap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    }
    
    let quota: UserQuota = {
      chatMessagesUsed: 0,
      lastPromptReset: serverTimestamp()
    };

    if (userSnap?.exists()) {
      const data = userSnap.data();
      if (data.quota) {
        quota = data.quota;
        
        const lastReset = quota.lastPromptReset?.toDate?.() || new Date(0);
        const now = new Date();
        
        // Reset if it's a new day
        if (startOfDay(lastReset).getTime() < startOfDay(now).getTime()) {
          quota.chatMessagesUsed = 0;
          quota.lastPromptReset = serverTimestamp();
          try {
            await updateDoc(userRef, { quota });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
          }
        }
      } else {
        try {
          await updateDoc(userRef, { quota });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
        }
      }
    } else {
      // Create user doc if it doesn't exist (though it should)
      try {
        await setDoc(userRef, { 
          uid: userId, 
          tier: 'Basic', 
          quota,
          createdAt: serverTimestamp() 
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
      }
    }

    return quota;
  }

  static getQuotaLimit(tier: UserTier): number {
    switch (tier) {
      case 'Pro': return Infinity;
      case 'Enhanced': return 10;
      case 'Basic': return 3;
      default: return 3;
    }
  }

}

