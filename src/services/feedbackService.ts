import { 
  db, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';

export interface FeedbackData {
  userId: string;
  userName: string;
  category: 'Bug Report' | 'Feature Request' | 'Data Issue' | 'UI/UX' | 'Other';
  message: string;
  timestamp: any;
  status: 'open' | 'resolved';
  version: string;
  attachedLogs?: any;
}

export const submitFeedback = async (data: Omit<FeedbackData, 'timestamp' | 'status' | 'version'>) => {
  const feedbackRef = collection(db, 'feedback');
  try {
    return await addDoc(feedbackRef, {
      ...data,
      timestamp: serverTimestamp(),
      status: 'open',
      version: '1.0.2'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'feedback');
  }
};

export const getFeedback = async () => {
  const feedbackRef = collection(db, 'feedback');
  const q = query(feedbackRef, orderBy('timestamp', 'desc'));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (FeedbackData & { id: string })[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'feedback');
  }
};

export const updateFeedbackStatus = async (feedbackId: string, status: 'open' | 'resolved') => {
  const feedbackDoc = doc(db, 'feedback', feedbackId);
  try {
    return await updateDoc(feedbackDoc, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `feedback/${feedbackId}`);
  }
};

export const deleteFeedback = async (feedbackId: string) => {
  const feedbackDoc = doc(db, 'feedback', feedbackId);
  try {
    return await deleteDoc(feedbackDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `feedback/${feedbackId}`);
  }
};
