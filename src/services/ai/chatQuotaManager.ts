import { handleFirestoreError, OperationType } from "../../lib/errorHandling";
import { 
  db, 
  serverTimestamp, 
  doc, 
  getDoc, 
  updateDoc,
  setDoc
} from "../../lib/firebase";
import { UserTier, UserQuota } from "../../types";
import { startOfDay } from "date-fns";

export class ChatQuotaManager {
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

  static async incrementQuota(userId: string, currentQuota: UserQuota): Promise<void> {
    const userRef = doc(db!, 'users', userId);
    try {
        await updateDoc(userRef, {
            'quota.chatMessagesUsed': currentQuota.chatMessagesUsed + 1
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  }
}
