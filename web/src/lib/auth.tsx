/**
 * Authentication Service — FinalWishes
 * 
 * Provides React context, hooks, and auth helpers.
 * Supports login via email OR username (username → email lookup via Firestore).
 * 
 * Firestore collections used:
 *   - usernames/{username_lowercase} → { email, uid }  (lookup index)
 *   - users/{uid} → user profile (per DATA_MODEL_LOCK)
 * 
 * @version 1.0.0
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: 'principal' | 'executor' | 'heir' | 'admin';
  phone?: string;
  status: 'active' | 'suspended' | 'deleted';
  profilePhotoUrl?: string;
  primaryEstateId?: string;
  primaryEstateName?: string;
}

export interface AuthContextValue {
  /** Firebase user object (null if not authenticated) */
  user: User | null;
  /** User profile from Firestore (null if not loaded) */
  profile: UserProfile | null;
  /** True while Firebase is determining auth state */
  loading: boolean;
  /** Sign in with email or username + password */
  signIn: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  /** Create a new account */
  signUp: (params: SignUpParams) => Promise<{ success: boolean; error?: string }>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Send password reset email */
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

export interface SignUpParams {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a username to an email address via Firestore lookup.
 * Returns null if the username is not found.
 */
async function resolveUsernameToEmail(username: string): Promise<string | null> {
  try {
    const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
    if (usernameDoc.exists()) {
      return usernameDoc.data().email || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a string looks like an email (contains @).
 */
function isEmail(identifier: string): boolean {
  return identifier.includes('@');
}

/**
 * Fetch user profile from Firestore.
 */
async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        uid,
        email: data.email || '',
        username: data.username,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        displayName: data.displayName || data.firstName || '',
        role: data.role || 'principal',
        phone: data.phone,
        status: data.status || 'active',
        profilePhotoUrl: data.profilePhotoUrl,
        primaryEstateId: data.primaryEstateId,
        primaryEstateName: data.primaryEstateName,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format Firebase auth errors to friendly messages.
 */
function formatAuthError(error: any): string {
  const code = error?.code || '';
  const errorMap: Record<string, string> = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email or username.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
  };
  return errorMap[code] || error?.message || 'An unexpected error occurred.';
}

// ─── Check username availability ──────────────────────────────────────────────

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
  return !usernameDoc.exists();
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userProfile = await fetchUserProfile(firebaseUser.uid);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign in with email or username
  const signIn = useCallback(async (identifier: string, password: string) => {
    try {
      let email = identifier;

      // If the identifier doesn't contain @, treat it as a username
      if (!isEmail(identifier)) {
        const resolved = await resolveUsernameToEmail(identifier);
        if (!resolved) {
          return { success: false, error: 'No account found with this username.' };
        }
        email = resolved;
      }

      const credential = await signInWithEmailAndPassword(auth, email, password);

      // Fetch and set profile
      const userProfile = await fetchUserProfile(credential.user.uid);
      setProfile(userProfile);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: formatAuthError(error) };
    }
  }, []);

  // Sign up with email + username + password
  const signUp = useCallback(async (params: SignUpParams) => {
    try {
      const { email, username, password, firstName, lastName } = params;

      // Check username availability
      const available = await isUsernameAvailable(username);
      if (!available) {
        return { success: false, error: 'This username is already taken. Please choose another.' };
      }

      // Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;
      const displayName = `${firstName} ${lastName}`.trim();

      // Update Firebase Auth profile
      await updateProfile(credential.user, { displayName });

      // Write user profile to Firestore (per DATA_MODEL_LOCK)
      await setDoc(doc(db, 'users', uid), {
        id: uid,
        email,
        emailVerified: false,
        firstName,
        lastName,
        username: username.toLowerCase(),
        displayName,
        role: 'principal',
        tier: 'free',
        status: 'active',
        idVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Write username → email lookup index
      await setDoc(doc(db, 'usernames', username.toLowerCase()), {
        email,
        uid,
        createdAt: serverTimestamp(),
      });

      // Set profile in state
      const userProfile = await fetchUserProfile(uid);
      setProfile(userProfile);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: formatAuthError(error) };
    }
  }, []);

  // Sign out
  const handleSignOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: formatAuthError(error) };
    }
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut: handleSignOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
