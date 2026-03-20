/**
 * Firebase SDK Initialization — FinalWishes React App
 * 
 * Canonical Firebase config extracted from the legacy firebase-init.js
 * and wired into the React/Vite app via the firebase npm package.
 * 
 * Project: legacy-estate-os
 * @version 1.0.0
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase configuration — project: legacy-estate-os
const firebaseConfig = {
  apiKey: "AIzaSyANMDZXcdn2eI8JN8FxXlAkCt-f4BONuiU",
  authDomain: "legacy-estate-os.firebaseapp.com",
  projectId: "legacy-estate-os",
  storageBucket: "legacy-estate-os.firebasestorage.app",
  messagingSenderId: "1002875213628",
  appId: "1:1002875213628:web:59d3f4b04345f3f7abb039",
};

// Initialize Firebase — singleton
const app: FirebaseApp = initializeApp(firebaseConfig);

// Auth instance
const auth: Auth = getAuth(app);

// Firestore instance (for username lookups and user profiles)
const db: Firestore = getFirestore(app);

export { app, auth, db };
export default app;
