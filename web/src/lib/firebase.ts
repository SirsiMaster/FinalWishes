/**
 * Firebase SDK Initialization — FinalWishes React App
 * 
 * Firebase config for the standalone FinalWishes GCP project.
 * Migrated from legacy-estate-os (shared SirsiMaster project)
 * to finalwishes-prod (independent FinalWishes project).
 * 
 * Project: finalwishes-prod
 * @version 2.0.0
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getPerformance, type FirebasePerformance } from 'firebase/performance';
import { getAnalytics, type Analytics } from 'firebase/analytics';

// Firebase configuration — project: finalwishes-prod
const firebaseConfig = {
  apiKey: "AIzaSyBTJSKV2jDAriiu4zbgw-Zmvz3J5rgZpLA",
  authDomain: "finalwishes-prod.firebaseapp.com",
  projectId: "finalwishes-prod",
  storageBucket: "finalwishes-prod.firebasestorage.app",
  messagingSenderId: "860699311615",
  appId: "1:860699311615:web:545c1e083bc6f4417e3bca",
  // measurementId required for GA4 — enable Analytics in Firebase Console,
  // then paste the G-XXXXXXX value here. Analytics will no-op until set.
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

// Initialize Firebase — singleton
const app: FirebaseApp = initializeApp(firebaseConfig);

// Auth instance
const auth: Auth = getAuth(app);

// Firestore instance (for username lookups and user profiles)
const db: Firestore = getFirestore(app);

// Performance Monitoring — auto-collects page load (LCP, FID, CLS) and network traces
const perf: FirebasePerformance | null =
  typeof window !== 'undefined' ? getPerformance(app) : null;

// Google Analytics 4 — requires measurementId in config
// Enable Analytics in Firebase Console → Project Settings → General → Your apps
let analytics: Analytics | null = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  analytics = getAnalytics(app);
}

export { app, auth, db, perf, analytics };
export default app;
