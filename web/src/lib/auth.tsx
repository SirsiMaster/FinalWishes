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
  sendEmailVerification,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
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
  role: 'principal' | 'executor' | 'heir' | 'trustee' | 'legal' | 'cpa' | 'admin';
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
  /** User profile from Firestore (null if not loaded, not yet fetched, or fetch failed) */
  profile: UserProfile | null;
  /** True while Firebase is determining auth state (auth init only — NOT the profile read) */
  loading: boolean;
  /**
   * True once the profile question has a *definitive* answer for the current
   * auth state: the profile was fetched (success), confirmed absent, or there
   * is no user. It stays false while a fetch is in flight AND while a fetch is
   * failing — because `profile === null` alone conflates "not loaded yet",
   * "user has no profile doc", and "fetch failed".
   *
   * Gate new-vs-returning routing on this (NOT on `!loading`): a returning user
   * with a `primaryEstateId` must never be classified as new and dumped on
   * /estates/create just because their profile read hadn't settled.
   */
  profileResolved: boolean;
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
 *
 * Returns the profile when the doc exists, or `null` when it is *confirmed
 * absent* (the read succeeded but no doc exists). Crucially it does NOT catch —
 * a failed read (network/permissions) propagates so callers can tell "this user
 * has no profile" apart from "we couldn't find out". Swallowing both into `null`
 * is exactly what let a returning user be misrouted to /estates/create.
 */
async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileResolved, setProfileResolved] = useState(false);

  // Listen for Firebase auth state changes
  useEffect(() => {
    // Purge any legacy demo/guest session left in localStorage by older builds
    // so it can never be mistaken for a real account.
    try { localStorage.removeItem('finalwishes_user'); } catch { /* ignore */ }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // A profile fetch is now in flight for this auth state — the answer is
        // not yet definitive. (No-op on first run since it starts false, but
        // correct on re-fires such as token refresh.)
        setProfileResolved(false);
        try {
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

          // Set profile BEFORE user: the login modal redirects the instant `user`
          // is truthy (index.tsx LoginModal effect). If `user` flipped true with a
          // null profile, navigatePostLogin would route to /estates/create instead
          // of the user's own estate dashboard — a visible post-login bounce.
          setProfile(userProfile);
          setUser(firebaseUser);
          // Definitive answer reached (found OR confirmed-absent): routing may run.
          setProfileResolved(true);
        } catch (err) {
          // The profile READ failed (network/permissions) — this is NOT the same
          // as "user has no profile". Leave profileResolved false so the
          // new-vs-returning routing waits instead of misclassifying a returning
          // user as new and dumping them on /estates/create. The user is still
          // authenticated; surface the failure rather than swallowing it.
          console.error('[auth] profile fetch failed; routing deferred:', err);
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
        setProfile(null);
        // No user → nothing to fetch → the profile question is resolved.
        setProfileResolved(true);
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

      // Fetch the profile BEFORE exposing `user`. The login modal redirects the
      // moment `user` is truthy (index.tsx LoginModal effect); if `user` flipped
      // true while `profile` was still null, navigatePostLogin would route to
      // /estates/create instead of the user's estate dashboard — a visible bounce.
      const userProfile = await fetchUserProfile(credential.user.uid);
      setProfile(userProfile);
      setUser(credential.user);
      setProfileResolved(true);

      // Record the successful sign-in. IdentityGate expires the principal MFA
      // grace period only after 24h AND loginCount >= 3 (ADR-035). Counting here
      // — on an explicit credential sign-in, NOT on every onAuthStateChanged
      // token refresh — is what makes that enforcement reachable instead of dead
      // code. Best-effort: a failed write must never block the user from logging
      // in, so we swallow and log rather than reject the sign-in.
      try {
        await updateDoc(doc(db, 'users', credential.user.uid), {
          loginCount: increment(1),
          lastLoginAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('[auth] loginCount increment failed (non-blocking):', err);
      }

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
      setProfileResolved(true);

      return { success: true, profile: userProfile };
    } catch (error: unknown) {
      return { success: false, error: formatAuthError(error) };
    }
  }, []);

  // Sign out
  const handleSignOut = useCallback(async () => {
    // Purge any legacy demo key that an older build may have left behind.
    try { localStorage.removeItem('finalwishes_user'); } catch { /* ignore */ }
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      // Do NOT swallow silently: a failed Firebase sign-out leaves the user
      // persisted in IndexedDB, so the next mount's onAuthStateChanged can
      // restore them. Surface it; the hard reload + cleared state below is a
      // best-effort fallback, not a guarantee Firebase actually signed out.
      console.error('[auth] firebaseSignOut failed; session may persist:', err);
    }
    setUser(null);
    setProfile(null);
    setProfileResolved(true); // resolved: signed out → no profile
    // Hard navigation guarantees a clean re-init: it re-attaches the Firebase
    // listener and discards all stale in-memory auth state.
    window.location.assign('/login');
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

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    profileResolved,
    emailVerified: user?.emailVerified ?? false,
    signIn,
    signUp,
    signOut: handleSignOut,
    resetPassword,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
