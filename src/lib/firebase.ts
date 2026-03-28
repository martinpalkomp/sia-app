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
  setPersistence,
  browserLocalPersistence,
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
  getDocFromServer,
  doc, 
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  deleteField,
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

// Safely attempt to load the config from firebase-applet-config.json
const configs = import.meta.glob('/firebase-applet-config.json', { eager: true });
const jsonConfig = (configs['/firebase-applet-config.json'] as any)?.default ?? {};

const getRequiredEnv = (key: string): string => {
  const value = import.meta.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
};

const getOptionalEnv = (key: string): string => {
  return import.meta.env[key]?.trim() || '';
};

const firebaseConfig = {
  apiKey:            getRequiredEnv('VITE_FIREBASE_API_KEY'),
  authDomain:        getRequiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId:         getRequiredEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket:     getRequiredEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getRequiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId:             getRequiredEnv('VITE_FIREBASE_APP_ID'),
  measurementId:     getOptionalEnv('VITE_FIREBASE_MEASUREMENT_ID'),
};

const firestoreDatabaseId = getOptionalEnv('VITE_FIREBASE_FIRESTORE_DATABASE_ID') || jsonConfig.firestoreDatabaseId || '(default)';

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
const isDefaultDb = (id: string) =>
  !id ||
  id.trim() === '' ||
  id.replace(/['"]/g, '').trim() === '(default)';

export const db = app
  ? isDefaultDb(firestoreDatabaseId)
    ? getFirestore(app)
    : getFirestore(app, firestoreDatabaseId)
  : null;
export const storage = app ? getStorage(app) : null;
export const functions = app ? getFunctions(app) : null;
