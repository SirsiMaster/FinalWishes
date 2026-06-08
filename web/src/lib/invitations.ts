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
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { estateInvitationEmail } from './email-templates';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvitationParams {
  estateId: string;
  email: string;
  phone?: string; // Optional phone number for SMS notification
  fullName: string;
  role: 'executor' | 'heir' | 'trustee' | 'legal' | 'cpa';
  relationship?: string;
  invitedBy: string; // UID of the principal
  inviterName?: string; // Display name of the principal (for email)
  estateName?: string; // Estate display name (for email)
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
  const { estateId, email, phone, fullName, role, relationship, invitedBy, inviterName, estateName, priority } = params;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // We deliberately do NOT look up the invitee's account from the client.
    // The `users` read rule only permits reading your OWN doc (PII siloing,
    // Rule 26), so a query by another person's email is denied with
    // "Missing or insufficient permissions" — which previously broke this whole
    // flow. Granting access to an invitee who ALREADY has an account is handled
    // SERVER-SIDE: the autoMatchOnInvitation trigger fires on invitation create,
    // and autoMatchInvitation fires on signup. The client only writes the
    // invitation (and the subcollection placeholder) as 'pending'.

    // 1. Write invitation record (always 'pending' per Firestore rules)
    const invRef = await addDoc(collection(db, 'estate_invitations'), {
      estateId,
      email: normalizedEmail,
      ...(phone ? { phone: phone.trim() } : {}),
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

    // 2. Write to estate subcollection (server trigger flips status on link)
    if (role === 'executor') {
      await addDoc(collection(db, `estates/${estateId}/executors`), {
        estateId,
        fullName,
        email: normalizedEmail,
        relationship: relationship || '',
        priority: priority || 1,
        status: 'invited',
        confirmedDeath: false,
        invitationId: invRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // heir, trustee, legal, cpa — all go to heirs subcollection
      await addDoc(collection(db, `estates/${estateId}/heirs`), {
        estateId,
        fullName,
        email: normalizedEmail,
        relationship: relationship || '',
        isMinor: false,
        isResiduary: false,
        status: 'pending',
        invitationId: invRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 3. Notify the invitee via the mail collection (Gmail Cloud Function).
    try {
      const acceptUrl = `https://finalwishes-prod.web.app/accept-invite?id=${invRef.id}`;
      const emailContent = estateInvitationEmail({
        inviterName: inviterName || 'A FinalWishes user',
        estateName: estateName || 'an estate',
        recipientName: fullName,
        role,
        acceptUrl,
      });

      await addDoc(collection(db, 'mail'), {
        to: [normalizedEmail],
        message: {
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        },
        createdAt: serverTimestamp(),
        createdBy: invitedBy,
      });
    } catch (emailErr) {
      // Email failure should not fail the invitation itself
      console.warn('[sendEstateInvitation] Email send failed (invitation still created):', emailErr);
    }

    // 6. Queue SMS notification if phone number was provided
    if (phone) {
      try {
        const smsBody = `${inviterName || 'Someone'} has invited you to ${estateName || 'an estate'} on FinalWishes. Open the invitation: https://finalwishes-prod.web.app/accept-invite?id=${invRef.id}`;
        await addDoc(collection(db, 'sms_queue'), {
          to: phone.trim(),
          body: smsBody,
          invitationId: invRef.id,
          estateId,
          status: 'pending',
          createdAt: serverTimestamp(),
          createdBy: invitedBy,
        });
      } catch (smsErr) {
        console.warn('[sendEstateInvitation] SMS queue failed (invitation still created):', smsErr);
      }
    }

    return { success: true, invitationId: invRef.id, autoLinked: false };
  } catch (err: unknown) {
    console.error('[sendEstateInvitation] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── List Pending Invitations ─────────────────────────────────────────────────

export interface PendingInvitation {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  createdAt: Timestamp | null;
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
  trustee: 'Trustee',
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
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
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
  } catch (err: unknown) {
    console.error('[revokeInvitation] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
