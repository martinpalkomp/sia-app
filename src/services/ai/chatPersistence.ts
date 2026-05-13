import { 
  db, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  where, 
  getDocs, 
  updateDoc, 
  doc 
} from '../../lib/firebase';
import { Insight } from '../../types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: any;
}

export const subscribeToChatHistory = (
  userId: string, 
  onMessagesUpdate: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void
) => {
  const q = query(
    collection(db, 'users', userId, 'chats'),
    where('role', 'in', ['user', 'assistant']),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const fetchedMessages: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      fetchedMessages.push(docSnap.data() as ChatMessage);
    });
    
    if (fetchedMessages.length === 0) {
      onMessagesUpdate([
        { 
          role: 'assistant', 
          content: "Clinical Intelligence Activated. I'm SIA, your Sleep Intelligence Agent. I've initialized your data fidelity tier and am ready to perform a multi-vector correlation analysis on your sleep history. What clinical parameters or trends should we evaluate today?" 
        }
      ]);
    } else {
      onMessagesUpdate(fetchedMessages);
    }
  }, (error) => {
    console.error("Chat history load error:", error);
    onError(error as Error);
  });
};

export const saveChatMessage = async (userId: string, role: 'user' | 'assistant', content: string) => {
  await addDoc(collection(db, 'users', userId, 'chats'), {
    role,
    content,
    createdAt: serverTimestamp()
  });
};

export const saveAIInsights = async (userId: string, newInsights: any[]) => {
  if (!newInsights || newInsights.length === 0) return;
  
  const insightsRef = collection(db, 'users', userId, 'insights');
  
  const computeConfidence = (linkedDates: string[]): number => {
    const count = linkedDates.length;
    if (count > 5) return 0.9;
    if (count >= 2) return 0.65;
    return 0.3;
  };

  for (const insight of newInsights) {
    const q = query(insightsRef, where('type', '==', insight.type));
    const querySnapshot = await getDocs(q);
    
    let existingInsightId: string | null = null;
    let existingData: Insight | null = null;

    const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const targetSummary = normalize(insight.summary || '');

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Insight;
      if (normalize(data.summary) === targetSummary) {
        existingInsightId = docSnap.id;
        existingData = data;
      }
    });

    if (existingInsightId && existingData) {
      const updatedDates = Array.from(new Set([...(existingData.linkedDates || []), ...(insight.linkedDates || [])]));
      await updateDoc(doc(db, 'users', userId, 'insights', existingInsightId), {
        confidence: computeConfidence(updatedDates),
        linkedDates: updatedDates,
        lastSeen: serverTimestamp(),
        occurrences: (existingData.occurrences || 1) + 1,
        details: insight.details || existingData.details
      });
    } else {
      await addDoc(insightsRef, {
        ...insight,
        confidence: computeConfidence(insight.linkedDates || []),
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        occurrences: 1,
        status: 'active'
      });
    }
  }
};
