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
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
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

/**
 * Create a document record with version awareness.
 * If a document with the same displayName already exists (active),
 * archives the old one (pushing its metadata to previousVersions)
 * and creates the new one with version = old.version + 1.
 */
export async function createOrReplaceDocumentRecord(params: {
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
    const displayName = data.displayName || data.originalName;

    // Look for an existing active document with the same displayName
    const colRef = collection(db, `estates/${estateId}/documents`);
    const q = query(
      colRef,
      where('status', '==', 'active'),
      where('displayName', '==', displayName),
      orderBy('version', 'desc'),
    );
    const snapshot = await getDocs(q);

    let newVersion = 1;

    if (!snapshot.empty) {
      // Archive the most recent existing version
      const existingDoc = snapshot.docs[0];
      const existingData = existingDoc.data();
      const oldVersion = existingData.version || 1;
      newVersion = oldVersion + 1;

      // Archive old document and push its metadata to previousVersions on the new doc later
      await updateDoc(existingDoc.ref, {
        status: 'archived',
        updatedAt: serverTimestamp(),
      });
    }

    // Build previousVersions from the archived doc (if any)
    const previousVersions: { version: number; storageKey: string; uploadedAt: string; uploadedBy: string }[] = [];
    if (!snapshot.empty) {
      const existingData = snapshot.docs[0].data();
      // Carry forward any existing previousVersions from the old doc
      if (existingData.previousVersions && Array.isArray(existingData.previousVersions)) {
        previousVersions.push(...existingData.previousVersions);
      }
      // Add the old doc itself as a previous version
      previousVersions.push({
        version: existingData.version || 1,
        storageKey: existingData.storageKey,
        uploadedAt: existingData.createdAt?.toDate?.()
          ? existingData.createdAt.toDate().toISOString()
          : new Date().toISOString(),
        uploadedBy: existingData.uploadedBy || 'unknown',
      });
    }

    // Create new document record
    const ref = await addDoc(colRef, {
      ...data,
      displayName,
      estateId,
      version: newVersion,
      previousVersions: previousVersions.length > 0 ? previousVersions : [],
      status: 'active',
      ocrProcessed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: unknown) {
    console.error('[createOrReplaceDocumentRecord] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateVaultDocument(
  estateId: string,
  docId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `estates/${estateId}/documents`, docId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateVaultDocument] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Lockbox CRUD ────────────────────────────────────────────────────────────

export async function addLockboxItem(params: {
  estateId: string;
  accountName: string;
  category: string;
  institution?: string;
  accountIdentifier?: string;
  notes?: string;
  transitionInstructions?: string;
  hasSecureCredentials?: boolean;
}): Promise<ActionResult> {
  try {
    const { estateId, ...data } = params;
    const ref = await addDoc(collection(db, `estates/${estateId}/lockbox`), {
      ...data,
      estateId,
      hasSecureCredentials: data.hasSecureCredentials ?? false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: unknown) {
    console.error('[addLockboxItem] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateLockboxItem(
  estateId: string,
  itemId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `estates/${estateId}/lockbox`, itemId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateLockboxItem] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function archiveLockboxItem(estateId: string, itemId: string): Promise<ActionResult> {
  return updateLockboxItem(estateId, itemId, { status: 'archived' });
}

// ─── Directive CRUD ──────────────────────────────────────────────────────────

export async function addDirective(params: {
  estateId: string;
  type: 'ethical_will' | 'funeral_preferences' | 'final_message' | 'care_instructions';
  title: string;
  content?: string;
  recipientName?: string;
  recipientRelationship?: string;
}): Promise<ActionResult> {
  try {
    const { estateId, ...data } = params;
    const ref = await addDoc(collection(db, `estates/${estateId}/directives`), {
      ...data,
      estateId,
      content: data.content ?? '',
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: unknown) {
    console.error('[addDirective] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateDirective(
  estateId: string,
  directiveId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `estates/${estateId}/directives`, directiveId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateDirective] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Time Capsule CRUD ──────────────────────────────────────────────────────

export async function addTimeCapsule(params: {
  estateId: string;
  title: string;
  message: string;
  recipientName: string;
  recipientEmail: string;
  recipientRelationship?: string;
  deliveryType: 'scheduled_date' | 'on_death' | 'on_settlement' | 'anniversary';
  scheduledDate?: Date;
  anniversaryDate?: string;
  voiceMemoUrl?: string;
  photoUrls?: string[];
}): Promise<ActionResult> {
  try {
    const { estateId, scheduledDate, ...data } = params;
    const ref = await addDoc(collection(db, `estates/${estateId}/capsules`), {
      ...data,
      estateId,
      ...(scheduledDate ? { scheduledDate } : {}),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: unknown) {
    console.error('[addTimeCapsule] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateTimeCapsule(
  estateId: string,
  capsuleId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `estates/${estateId}/capsules`, capsuleId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateTimeCapsule] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function cancelTimeCapsule(estateId: string, capsuleId: string): Promise<ActionResult> {
  return updateTimeCapsule(estateId, capsuleId, { status: 'cancelled' });
}

// ─── Heirloom CRUD ──────────────────────────────────────────────────────────

export async function addHeirloom(params: {
  estateId: string;
  name: string;
  category: string;
  description: string;
  estimatedValue?: number;
  designatedHeir?: string;
  photoUrls?: string[];
  location?: string;
  provenance?: string;
}): Promise<ActionResult> {
  try {
    const { estateId, ...data } = params;
    const ref = await addDoc(collection(db, `estates/${estateId}/heirlooms`), {
      ...data,
      estateId,
      photoUrls: data.photoUrls ?? [],
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: unknown) {
    console.error('[addHeirloom] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateHeirloom(
  estateId: string,
  heirloomId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `estates/${estateId}/heirlooms`, heirloomId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateHeirloom] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function archiveHeirloom(estateId: string, heirloomId: string): Promise<ActionResult> {
  return updateHeirloom(estateId, heirloomId, { status: 'archived' });
}

// ─── Notification Actions ──────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  estateId: string,
  notificationId: string
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `estates/${estateId}/notifications`, notificationId), {
      read: true,
      readAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error('[markNotificationRead] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Batch-mark all unread notifications as read for an estate.
 */
export async function markAllNotificationsRead(estateId: string): Promise<ActionResult> {
  try {
    const colRef = collection(db, `estates/${estateId}/notifications`);
    const q = query(colRef, where('read', '==', false));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return { success: true };

    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.update(d.ref, { read: true, readAt: serverTimestamp() });
    });
    await batch.commit();

    return { success: true };
  } catch (err: unknown) {
    console.error('[markAllNotificationsRead] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Life Chapter CRUD ────────────────────────────────────────────────────────

export async function addLifeChapter(params: {
  estateId: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  dateFrom?: string;
  dateTo?: string;
  order: number;
}): Promise<ActionResult> {
  try {
    const { estateId, ...data } = params;
    await addDoc(collection(db, `estates/${estateId}/life-chapters`), {
      ...data,
      entryRefs: [],
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error('[addLifeChapter] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateLifeChapter(
  estateId: string,
  chapterId: string,
  updates: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `estates/${estateId}/life-chapters/${chapterId}`), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateLifeChapter] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function archiveLifeChapter(estateId: string, chapterId: string): Promise<ActionResult> {
  return updateLifeChapter(estateId, chapterId, { status: 'archived' });
}
