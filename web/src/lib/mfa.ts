/**
 * MFA (TOTP) Service — FinalWishes
 * 
 * Handles Multi-Factor Authentication enrollment and verification
 * using Time-based One-Time Passwords (TOTP) via Firebase Identity Platform.
 * 
 * Compatible with: Google Authenticator, 1Password, Authy, Microsoft Authenticator
 * 
 * @version 1.0.0
 */

import {
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  getMultiFactorResolver,
  type MultiFactorResolver,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MFAEnrollmentState {
  secret: TotpSecret | null;
  qrUrl: string;
  status: 'idle' | 'generating' | 'verifying' | 'enrolled' | 'error';
  error?: string;
}

export interface MFAStatus {
  enrolled: boolean;
  methods: string[];
}

// ─── Enrollment ───────────────────────────────────────────────────────────────

/**
 * Start TOTP MFA enrollment — generates a secret and returns a QR code URL.
 * The user must scan this QR code with their authenticator app.
 */
export async function startTotpEnrollment(user: User): Promise<{
  secret: TotpSecret;
  qrUrl: string;
} | { error: string }> {
  try {
    const multiFactorSession = await multiFactor(user).getSession();
    const totpSecret = await TotpMultiFactorGenerator.generateSecret(multiFactorSession);
    
    // Generate the otpauth:// URL for QR code
    const qrUrl = totpSecret.generateQrCodeUrl(
      user.email || 'user@finalwishes.app',
      'FinalWishes'
    );

    return { secret: totpSecret, qrUrl };
  } catch (error: unknown) {
    console.error('MFA enrollment start failed:', error);
    return { error: error instanceof Error ? error.message : 'Failed to start MFA enrollment.' };
  }
}

/**
 * Finalize TOTP enrollment — verify the user's first code and activate MFA.
 */
export async function finalizeTotpEnrollment(
  user: User,
  secret: TotpSecret,
  verificationCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(
      secret,
      verificationCode
    );

    await multiFactor(user).enroll(multiFactorAssertion, 'Authenticator App');

    return { success: true };
  } catch (error: unknown) {
    console.error('MFA enrollment finalization failed:', error);

    if ((error as { code?: string }).code === 'auth/invalid-verification-code') {
      return { success: false, error: 'Invalid code. Please check your authenticator app and try again.' };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Failed to complete MFA enrollment.' };
  }
}

// ─── Login Challenge ──────────────────────────────────────────────────────────

/**
 * Resolve an MFA challenge during login.
 * Called when signInWithEmailAndPassword throws auth/multi-factor-auth-required.
 */
export async function resolveTotpChallenge(
  resolver: MultiFactorResolver,
  verificationCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the TOTP hint in the resolver
    const totpHint = resolver.hints.find(
      (hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );

    if (!totpHint) {
      return { success: false, error: 'No authenticator app enrolled for this account.' };
    }

    const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(
      totpHint.uid,
      verificationCode
    );

    await resolver.resolveSignIn(multiFactorAssertion);

    return { success: true };
  } catch (error: unknown) {
    console.error('MFA challenge resolution failed:', error);

    if ((error as { code?: string }).code === 'auth/invalid-verification-code') {
      return { success: false, error: 'Invalid code. Please try again.' };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Failed to verify MFA code.' };
  }
}

// ─── Status Check ─────────────────────────────────────────────────────────────

/**
 * Check if a user has MFA enrolled and what methods they have.
 */
export function getMFAStatus(user: User | null): MFAStatus {
  if (!user) {
    return { enrolled: false, methods: [] };
  }

  const enrolledFactors = multiFactor(user).enrolledFactors;
  return {
    enrolled: enrolledFactors.length > 0,
    methods: enrolledFactors.map((f) => f.displayName || f.factorId),
  };
}

// ─── Unenroll ─────────────────────────────────────────────────────────────────

/**
 * Remove MFA from a user's account.
 */
export async function unenrollTotp(user: User): Promise<{ success: boolean; error?: string }> {
  try {
    const enrolledFactors = multiFactor(user).enrolledFactors;
    const totpFactor = enrolledFactors.find(
      (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );

    if (!totpFactor) {
      return { success: false, error: 'No authenticator app enrolled.' };
    }

    await multiFactor(user).unenroll(totpFactor);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove MFA.' };
  }
}

/**
 * Get the MFA resolver from an auth/multi-factor-auth-required error.
 * This is used in the login flow to extract the resolver from the error object.
 */
export function getMFAResolver(error: unknown): MultiFactorResolver | null {
  try {
    return getMultiFactorResolver(auth, error);
  } catch {
    return null;
  }
}
