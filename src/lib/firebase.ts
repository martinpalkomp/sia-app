import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Re-export necessary members from Firebase SDKs for centralized access
export { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  GoogleAuthProvider,
  type User 
} from "firebase/auth";
export { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  type Firestore
} from "firebase/firestore";
export { 
  httpsCallable 
} from "firebase/functions";
export { 
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
export { initializeApp, type FirebaseApp } from "firebase/app";

// Safely attempt to load the fallback config
// We use import.meta.glob to avoid build errors if the file is missing
// PROD guard: only load fallback in development
const configs = !import.meta.env.PROD ? import.meta.glob('/firebase-applet-config.json', { eager: true }) : {};
const fallbackConfig = (configs['/firebase-applet-config.json'] as any)?.default || {};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallbackConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || fallbackConfig.measurementId,
};

const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || fallbackConfig.firestoreDatabaseId || "(default)";

// Startup guard
const requiredFields = [
  'apiKey',
  'authDomain',
  'projectId',
  'appId'
];

const missingFields = requiredFields.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingFields.length > 0) {
  console.warn(`Firebase is not fully configured. Missing fields: ${missingFields.join(', ')}. 
Note: For a standard Firebase setup, the Firestore Database ID (VITE_FIREBASE_FIRESTORE_DATABASE_ID) is expected to be "(default)".`);
}

export const isFirebaseConfigured = missingFields.length === 0;

// Initialize Firebase only if configured
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();
export const db = app ? getFirestore(app, firestoreDatabaseId) : null;
export const storage = app ? getStorage(app) : null;
export const functions = app ? getFunctions(app) : null;
