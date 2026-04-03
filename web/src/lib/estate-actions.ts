/**
 * Estate Actions — Firestore Write Operations
 * 
 * All write operations for estate management.
 * Create, update, delete for estates, assets, heirs, executors, documents.
 * 
 * These are client-side writes protected by Firestore Security Rules v3.0.0.
 * PII writes (SSN, account numbers) go through the Go API → Cloud SQL.
 * 
 * @version 1.0.0
 */

import {
  doc,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Result Type ──────────────────────────────────────────────────────────────

interface ActionResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ─── Estate CRUD ──────────────────────────────────────────────────────────────

/**
 * Create a new estate and the principal's estate_users record.
 */
export async function createEstate(params: {
  name: string;
  principalId: string;
}): Promise<ActionResult> {
  try {
    const { name, principalId } = params;

    // Create estate document
    const estateRef = await addDoc(collection(db, 'estates'), {
      name,
      principalId,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Create estate_users junction record (principal)
    const euId = `${principalId}_${estateRef.id}`;
    await setDoc(doc(db, 'estate_users', euId), {
      estateId: estateRef.id,
      userId: principalId,
      role: 'principal',
      accessGranted: true,
      accessGrantedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update user profile with primary estate
    await updateDoc(doc(db, 'users', principalId), {
      primaryEstateId: estateRef.id,
      primaryEstateName: name,
      updatedAt: serverTimestamp(),
    });

    return { success: true, id: estateRef.id };
  } catch (err: unknown) {
    console.error('[createEstate] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Update estate metadata (name, status).
 */
export async function updateEstate(
  estateId: string,
  data: { name?: string; status?: string }
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, 'estates', estateId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateEstate] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Asset CRUD ───────────────────────────────────────────────────────────────

export async function addAsset(params: {
  estateId: string;
  name: string;
  category: string;
  description?: string;
  estimatedValue?: number;
  metadata?: Record<string, unknown>;
}): Promise<ActionResult> {
  try {
    const { estateId, ...data } = params;
    const ref = await addDoc(collection(db, `estates/${estateId}/assets`), {
      ...data,
      estateId,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: unknown) {
    console.error('[addAsset] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateAsset(
  estateId: string,
  assetId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `estates/${estateId}/assets`, assetId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateAsset] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function archiveAsset(estateId: string, assetId: string): Promise<ActionResult> {
  return updateAsset(estateId, assetId, { status: 'archived' });
}

// ─── Heir CRUD ────────────────────────────────────────────────────────────────

export async function addHeir(params: {
  estateId: string;
  fullName: string;
  email?: string;
  relationship?: string;
  isMinor?: boolean;
  isResiduary?: boolean;
  residuaryPercentage?: number;
}): Promise<ActionResult> {
  try {
    const { estateId, ...data } = params;
    const ref = await addDoc(collection(db, `estates/${estateId}/heirs`), {
      ...data,
      estateId,
      isMinor: data.isMinor ?? false,
      isResiduary: data.isResiduary ?? false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: unknown) {
    console.error('[addHeir] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateHeir(
  estateId: string,
  heirId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `estates/${estateId}/heirs`, heirId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateHeir] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Executor CRUD ────────────────────────────────────────────────────────────

export async function addExecutor(params: {
  estateId: string;
  fullName: string;
  email: string;
  phone?: string;
  relationship?: string;
  priority: number;
}): Promise<ActionResult> {
  try {
    const { estateId, ...data } = params;
    const ref = await addDoc(collection(db, `estates/${estateId}/executors`), {
      ...data,
      estateId,
      status: 'pending',
      confirmedDeath: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: unknown) {
    console.error('[addExecutor] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Vault Document Metadata ──────────────────────────────────────────────────
// Note: Actual file upload uses Cloud Storage signed URLs via Go API.
// This only writes the Firestore metadata record.

export async function createDocumentRecord(params: {
  estateId: string;
  originalName: string;
  displayName?: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  storageBucket: string;
  uploadedBy: string;
  folderId?: string;
  tags?: string[];
}): Promise<ActionResult> {
  try {
    const { estateId, ...data } = params;
    const ref = await addDoc(collection(db, `estates/${estateId}/documents`), {
      ...data,
      estateId,
      version: 1,
      status: 'active',
      ocrProcessed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: unknown) {
    console.error('[createDocumentRecord] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function archiveDocument(estateId: string, docId: string): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `estates/${estateId}/documents`, docId), {
      status: 'archived',
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error('[archiveDocument] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
