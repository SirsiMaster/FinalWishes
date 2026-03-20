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

// Firebase configuration — project: finalwishes-prod
const firebaseConfig = {
  apiKey: "AIzaSyBTJSKV2jDAriiu4zbgw-Zmvz3J5rgZpLA",
  authDomain: "finalwishes-prod.firebaseapp.com",
  projectId: "finalwishes-prod",
  storageBucket: "finalwishes-prod.firebasestorage.app",
  messagingSenderId: "860699311615",
  appId: "1:860699311615:web:545c1e083bc6f4417e3bca",
};

// Initialize Firebase — singleton
const app: FirebaseApp = initializeApp(firebaseConfig);

// Auth instance
const auth: Auth = getAuth(app);

// Firestore instance (for username lookups and user profiles)
const db: Firestore = getFirestore(app);

export { app, auth, db };
export default app;
