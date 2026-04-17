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
  useRef,
  type ReactNode,
} from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { type MultiFactorResolver } from 'firebase/auth';
import { auth, db } from './firebase';
import { getMFAResolver } from './mfa';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: 'principal' | 'executor' | 'heir' | 'legal' | 'cpa' | 'admin';
  phone?: string;
  status: 'active' | 'suspended' | 'deleted';
  profilePhotoUrl?: string;
  birthDate?: string;
  deathDate?: string;
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
  /** Whether the user's email has been verified */
  emailVerified: boolean;
  /** Sign in with email or username + password */
  signIn: (identifier: string, password: string) => Promise<{
    success: boolean;
    error?: string;
    mfaRequired?: boolean;
    mfaResolver?: MultiFactorResolver;
  }>;
  /** Create a new account */
  signUp: (params: SignUpParams) => Promise<{ success: boolean; error?: string }>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Send password reset email */
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  /** Resend email verification */
  resendVerification: () => Promise<{ success: boolean; error?: string }>;
  /** Activate demo session (sets synthetic user + profile without Firebase Auth) */
  loginDemo: (session: Record<string, string | undefined>) => void;
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

// eslint-disable-next-line react-refresh/only-export-components
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
        birthDate: data.birthDate,
        deathDate: data.deathDate,
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
function formatAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
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
  return errorMap[code] || (error instanceof Error ? error.message : 'An unexpected error occurred.');
}

// ─── Check username availability ──────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
  return !usernameDoc.exists();
}

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Check if demo mode is active via URL param.
 */
function isDemoMode(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';
}

/**
 * Load demo session from localStorage (set by login.tsx in demo mode).
 * Returns a synthetic UserProfile or null if no demo session exists.
 */
function loadDemoSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem('finalwishes_user');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return {
      uid: session.id || 'demo_user',
      email: session.email || '',
      username: session.login,
      firstName: session.name?.split(' ')[0] || '',
      lastName: session.name?.split(' ').slice(1).join(' ') || '',
      displayName: session.name || 'Demo User',
      role: (session.role === 'owner' ? 'principal' : session.role) || 'principal',
      phone: session.phone,
      status: 'active',
      profilePhotoUrl: session.profilePhotoUrl,
      primaryEstateId: session.primaryEstateId,
      primaryEstateName: session.primaryEstateName,
    };
  } catch {
    return null;
  }
}

/**
 * Create a minimal User-like shim for demo mode.
 * AuthGuard only checks truthiness and emailVerified, so a partial shim works.
 */
function createDemoUserShim(profile: UserProfile): User {
  return {
    uid: profile.uid,
    email: profile.email,
    emailVerified: true,
    displayName: profile.displayName,
    isAnonymous: false,
    // Stub methods required by consumer code
    getIdToken: async () => 'demo-token',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Ref tracks demo activation so the Firebase listener skips overrides
  const demoActiveRef = useRef(false);
  // Ref holds unsubscribe so loginDemo can detach the Firebase listener
  const unsubRef = useRef<(() => void) | null>(null);

  // Listen for Firebase auth state changes
  useEffect(() => {
    // Demo mode: check if a demo session exists in localStorage
    const demoProfile = loadDemoSession();
    if (demoProfile && isDemoMode() && !demoActiveRef.current) {
      demoActiveRef.current = true;
      // Schedule state updates outside the synchronous effect body
      const id = requestAnimationFrame(() => {
        setUser(createDemoUserShim(demoProfile));
        setProfile(demoProfile);
        setLoading(false);
      });
      return () => cancelAnimationFrame(id);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Skip if demo mode was activated after mount (via loginDemo)
      if (demoActiveRef.current) return;

      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user profile from Firestore
        let userProfile = await fetchUserProfile(firebaseUser.uid);

        // Handle edge case: Firebase Auth account exists but Firestore profile doesn't
        // (e.g., previous registration failed mid-write due to permissions)
        if (!userProfile && firebaseUser.email) {
          try {
            const displayName = firebaseUser.displayName || firebaseUser.email.split('@')[0];
            const nameParts = displayName.split(' ');
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              displayName,
              role: 'principal',
              tier: 'free',
              status: 'active',
              idVerified: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            userProfile = await fetchUserProfile(firebaseUser.uid);
          } catch {
            // If this also fails, user will see limited UI — they can try again
          }
        }

        setProfile(userProfile);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    unsubRef.current = unsubscribe;
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

      return { success: true, profile: userProfile };
    } catch (error: unknown) {
      // Check if this is an MFA challenge
      if ((error as { code?: string }).code === 'auth/multi-factor-auth-required') {
        const resolver = getMFAResolver(error);
        if (resolver) {
          return { success: false, mfaRequired: true, mfaResolver: resolver };
        }
      }
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

      // Send email verification
      await sendEmailVerification(credential.user);

      // Set profile in state
      const userProfile = await fetchUserProfile(uid);
      setProfile(userProfile);

      return { success: true, profile: userProfile };
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      return { success: false, error: formatAuthError(error) };
    }
  }, []);

  // Resend email verification
  const resendVerification = useCallback(async () => {
    try {
      if (!auth.currentUser) {
        return { success: false, error: 'No user signed in.' };
      }
      await sendEmailVerification(auth.currentUser);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: formatAuthError(error) };
    }
  }, []);

  // Activate demo session — sets synthetic user + profile in state
  const loginDemo = useCallback((session: Record<string, string | undefined>) => {
    const demoProfile: UserProfile = {
      uid: session.id || 'demo_user',
      email: session.email || '',
      username: session.login,
      firstName: session.name?.split(' ')[0] || '',
      lastName: session.name?.split(' ').slice(1).join(' ') || '',
      displayName: session.name || 'Demo User',
      role: (session.role === 'owner' ? 'principal' : (session.role as UserProfile['role'])) || 'principal',
      phone: session.phone,
      status: 'active',
      profilePhotoUrl: session.profilePhotoUrl,
      primaryEstateId: session.primaryEstateId,
      primaryEstateName: session.primaryEstateName,
    };
    // Mark demo as active so Firebase listener stops overriding state
    demoActiveRef.current = true;
    // Detach Firebase listener if it was attached
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    setUser(createDemoUserShim(demoProfile));
    setProfile(demoProfile);
    setLoading(false);
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    emailVerified: user?.emailVerified ?? false,
    signIn,
    signUp,
    signOut: handleSignOut,
    resetPassword,
    resendVerification,
    loginDemo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
