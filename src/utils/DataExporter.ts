import { 
  db, 
  collection, 
  getDocs, 
  doc, 
  getDoc 
} from '../lib/firebase';
import { DailyLog, PersonalizationProfile } from '../types';

/**
 * Utility for ethical data monetization.
 * Fetches anonymized sleep data from users who have consented to sharing.
 */
export const getAnonymizedData = async () => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const anonymizedExport: any[] = [];

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      
      // Check consent in personalization profile
      const profileRef = doc(db, 'users', userId, 'personalization', 'profile');
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const profile = profileSnap.data() as PersonalizationProfile;
        
        // The Consent Check: Only include if allowsAnonymizedSharing is true
        if (profile.allowsAnonymizedSharing) {
          // Fetch all sleep logs for this user
          const logsRef = collection(db, 'users', userId, 'sleep_logs');
          const logsSnap = await getDocs(logsRef);
          
          const sleepLogs = logsSnap.docs.map(d => {
            const data = d.data() as DailyLog;
            // Metadata Only: Ensure only relevant sleep metrics are exported
            return {
              date: data.date,
              sleep_quality: data.sleep_quality,
              morning_alertness: data.morning_alertness,
              daytime_energy: data.daytime_energy,
              factors: data.factors ? {
                caffeine: data.factors.caffeine.consumed,
                alcohol: data.factors.alcohol.consumed,
                exercise: data.factors.exercise.completed,
                stressLevel: data.factors.stressLevel
              } : null
            };
          });

          // The Anonymizer: Replace userId with a random UUID
          anonymizedExport.push({
            id: self.crypto?.randomUUID ? self.crypto.randomUUID() : Math.random().toString(36).substring(2),
            age: profile.demographics.age,
            gender: profile.demographics.sex,
            sleep_logs: sleepLogs
          });
        }
      }
    }
    
    return anonymizedExport;
  } catch (error) {
    console.error("Error exporting anonymized data:", error);
    throw error;
  }
};
