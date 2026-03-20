/**
 * Invitation Service — FinalWishes
 *
 * Manages estate invitations: create invitation records in Firestore,
 * send email notifications, and track invitation status.
 *
 * Flow:
 * 1. Principal invites someone → writes to estate_invitations + estates/{id}/executors or heirs
 * 2. Cloud Function autoMatchInvitation fires when invitee registers
 * 3. This module also checks if invitee already exists and auto-links
 *
 * @version 1.0.0
 */

import {
  doc,
  collection,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvitationParams {
  estateId: string;
  email: string;
  fullName: string;
  role: 'executor' | 'heir' | 'legal' | 'cpa';
  relationship?: string;
  invitedBy: string; // UID of the principal
  priority?: number; // For executors — 1 = primary
}

interface InvitationResult {
  success: boolean;
  invitationId?: string;
  autoLinked?: boolean; // True if the invitee already has an account
  error?: string;
}

// ─── Send Invitation ──────────────────────────────────────────────────────────

/**
 * Create an estate invitation.
 *
 * 1. Check if a user with this email already exists
 * 2. Write the invitation record to estate_invitations
 * 3. Write the role record to the appropriate subcollection (executors/heirs)
 * 4. If user exists → auto-link via estate_users (skip Cloud Function)
 * 5. If user doesn't exist → Cloud Function autoMatchInvitation handles it on signup
 */
export async function sendEstateInvitation(params: InvitationParams): Promise<InvitationResult> {
  const { estateId, email, fullName, role, relationship, invitedBy, priority } = params;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 1. Check if invitee already has an account
    const existingUserSnap = await getDocs(
      query(collection(db, 'users'), where('email', '==', normalizedEmail))
    );
    const existingUser = existingUserSnap.empty ? null : existingUserSnap.docs[0];

    // 2. Write invitation record (always 'pending' per Firestore rules, then update if auto-linking)
    const invRef = await addDoc(collection(db, 'estate_invitations'), {
      estateId,
      email: normalizedEmail,
      fullName,
      role,
      relationship: relationship || '',
      invitedBy,
      status: 'pending',
      userId: null,
      invitationAcceptedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 3. Write to estate subcollection
    if (role === 'executor') {
      await addDoc(collection(db, `estates/${estateId}/executors`), {
        estateId,
        fullName,
        email: normalizedEmail,
        relationship: relationship || '',
        priority: priority || 1,
        status: existingUser ? 'accepted' : 'invited',
        confirmedDeath: false,
        invitationId: invRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // heir, legal, cpa — all go to heirs subcollection
      await addDoc(collection(db, `estates/${estateId}/heirs`), {
        estateId,
        fullName,
        email: normalizedEmail,
        relationship: relationship || '',
        isMinor: false,
        isResiduary: false,
        status: existingUser ? 'active' : 'pending',
        invitationId: invRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 4. If user exists, auto-link immediately
    if (existingUser) {
      const uid = existingUser.id;
      const euDocId = `${uid}_${estateId}`;
      await setDoc(doc(db, 'estate_users', euDocId), {
        estateId,
        userId: uid,
        role,
        accessGranted: true,
        accessGrantedAt: serverTimestamp(),
        invitationId: invRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update invitation status to accepted (principal has update permission)
      await updateDoc(invRef, {
        status: 'accepted',
        userId: uid,
        invitationAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { success: true, invitationId: invRef.id, autoLinked: true };
    }

    // 5. User doesn't exist — Cloud Function will handle on signup
    // TODO: Send email via SendGrid when integrated
    return { success: true, invitationId: invRef.id, autoLinked: false };
  } catch (err: any) {
    console.error('[sendEstateInvitation] Error:', err);
    return { success: false, error: err.message };
  }
}

// ─── List Pending Invitations ─────────────────────────────────────────────────

export interface PendingInvitation {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  createdAt: any;
}

/**
 * Get all pending invitations for an estate.
 */
export async function listPendingInvitations(estateId: string): Promise<PendingInvitation[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'estate_invitations'),
        where('estateId', '==', estateId),
        where('status', '==', 'pending')
      )
    );

    return snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as PendingInvitation[];
  } catch (err) {
    console.error('[listPendingInvitations] Error:', err);
    return [];
  }
}

/**
 * Check if a specific email already has a pending or accepted invitation for an estate.
 */
export async function hasExistingInvitation(estateId: string, email: string): Promise<boolean> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'estate_invitations'),
        where('estateId', '==', estateId),
        where('email', '==', email.toLowerCase().trim())
      )
    );
    return !snap.empty;
  } catch {
    return false;
  }
}

// ─── Backward-compatible exports for InviteTeamMember component ───────────────

export const ROLE_LABELS: Record<string, string> = {
  executor: 'Executor',
  heir: 'Beneficiary',
  legal: 'Legal Counsel',
  cpa: 'CPA Advisor',
  principal: 'Estate Owner',
  admin: 'Administrator',
};

export interface EstateInvitation {
  id: string;
  estateId: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  invitedBy: string;
  createdAt: any;
  updatedAt: any;
}

/**
 * Alias for sendEstateInvitation — used by InviteTeamMember component.
 */
export const inviteTeamMember = sendEstateInvitation;

/**
 * Get all invitations for an estate (all statuses).
 */
export async function getEstateInvitations(estateId: string): Promise<EstateInvitation[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'estate_invitations'),
        where('estateId', '==', estateId)
      )
    );

    return snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as EstateInvitation[];
  } catch (err) {
    console.error('[getEstateInvitations] Error:', err);
    return [];
  }
}

/**
 * Revoke a pending invitation.
 */
export async function revokeInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const invRef = doc(db, 'estate_invitations', invitationId);
    await updateDoc(invRef, {
      status: 'revoked',
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: any) {
    console.error('[revokeInvitation] Error:', err);
    return { success: false, error: err.message };
  }
}
