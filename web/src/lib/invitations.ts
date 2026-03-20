/**
 * Estate Invitations Service — Manages team member invitations
 * 
 * Creates estate_users records in Firestore and manages invitation state.
 * 
 * @version 1.0.0
 */

import { db } from './firebase';
import { 
  collection, doc, setDoc, getDocs, deleteDoc, 
  query, where, serverTimestamp, Timestamp 
} from 'firebase/firestore';

export interface EstateInvitation {
  id: string;           // {userId}_{estateId} or {email}_{estateId}
  estateId: string;
  userId?: string;      // Set when invitee creates account
  email: string;
  role: 'executor' | 'heir' | 'legal' | 'cpa';
  fullName: string;
  accessGranted: boolean;
  invitedAt: Timestamp;
  invitedBy: string;    // UID of inviting principal
  invitationAcceptedAt?: Timestamp;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const ROLE_LABELS: Record<string, string> = {
  executor: 'Executor',
  heir: 'Beneficiary / Heir',
  legal: 'Legal Counsel',
  cpa: 'CPA / Tax Advisor',
};

export { ROLE_LABELS };

/**
 * Send an invitation to join an estate team
 */
export async function inviteTeamMember(params: {
  estateId: string;
  email: string;
  fullName: string;
  role: 'executor' | 'heir' | 'legal' | 'cpa';
  invitedBy: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { estateId, email, fullName, role, invitedBy } = params;
    
    // Use email-based ID for pending invitations (before user creates account)
    const docId = `${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${estateId}`;
    
    await setDoc(doc(db, 'estate_invitations', docId), {
      estateId,
      email: email.toLowerCase(),
      fullName,
      role,
      invitedBy,
      accessGranted: false,
      status: 'pending',
      invitedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (err: any) {
    console.error('[inviteTeamMember] Error:', err);
    return { success: false, error: err.message || 'Failed to send invitation.' };
  }
}

/**
 * Get all invitations for an estate
 */
export async function getEstateInvitations(estateId: string): Promise<EstateInvitation[]> {
  try {
    const q = query(
      collection(db, 'estate_invitations'),
      where('estateId', '==', estateId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EstateInvitation));
  } catch (err) {
    console.error('[getEstateInvitations] Error:', err);
    return [];
  }
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'estate_invitations', invitationId));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to revoke invitation.' };
  }
}
