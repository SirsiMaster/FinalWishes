/**
 * Firestore Data Hooks — FinalWishes
 * 
 * Real-time Firestore hooks for estate data.
 * Uses onSnapshot for live updates — no polling.
 * 
 * Architecture: Client reads directly from Firestore (ADR-036).
 * The Go API handles Cloud SQL PII + Cloud Storage only.
 * 
 * @version 1.0.0
 */

import { useState, useEffect, useMemo, startTransition } from 'react';
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type DocumentData as _DocumentData,
  type QueryConstraint,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FirestoreResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface FirestoreListResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

// Estate (root collection)
export interface Estate {
  id: string;
  name: string;
  principalId: string;
  status: 'active' | 'death_reported' | 'executor_confirmed' | 'in_settlement' | 'closed';
  estimatedValue?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tier?: 'free' | 'concierge' | 'white_glove';
  tierUpdatedAt?: Timestamp;
  paymentStatus?: 'active' | 'cancelled';
}

// Asset (subcollection)
export interface Asset {
  id: string;
  estateId: string;
  category: 'financial' | 'real_estate' | 'vehicle' | 'digital' | 'personal_property';
  name: string;
  description?: string;
  estimatedValue?: number;
  notes?: string;
  status: 'active' | 'transferred' | 'archived';
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Heir (subcollection)
export interface Heir {
  id: string;
  estateId: string;
  fullName: string;
  email?: string;
  relationship?: string;
  isMinor: boolean;
  isResiduary: boolean;
  residuaryPercentage?: number;
  status: 'active' | 'removed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Executor (subcollection)
export interface Executor {
  id: string;
  estateId: string;
  fullName: string;
  email: string;
  phone?: string;
  relationship?: string;
  priority: number;
  status: 'pending' | 'invited' | 'accepted' | 'declined' | 'active' | 'removed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Document (subcollection — vault)
export interface VaultDocument {
  id: string;
  estateId: string;
  originalName: string;
  displayName?: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  storageBucket: string;
  folderId?: string;
  tags?: string[];
  version: number;
  status: 'pending' | 'active' | 'archived' | 'deleted';
  uploadedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// EstateUser (junction table)
export interface EstateUser {
  id: string;
  estateId: string;
  userId: string;
  role: 'principal' | 'executor' | 'heir' | 'legal' | 'cpa';
  accessGranted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Lockbox Item (subcollection)
export interface LockboxItem {
  id: string;
  estateId: string;
  category: 'banking' | 'investment' | 'insurance' | 'digital_account' | 'crypto' | 'physical_safe' | 'other';
  accountName: string;
  institution?: string;
  accountIdentifier?: string;
  notes?: string;
  transitionInstructions?: string;
  hasSecureCredentials: boolean;
  status: 'active' | 'archived';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Directive (subcollection)
export interface Directive {
  id: string;
  estateId: string;
  type: 'ethical_will' | 'funeral_preferences' | 'final_message' | 'care_instructions';
  title: string;
  content: string; // HTML from TipTap
  recipientName?: string;
  recipientRelationship?: string;
  status: 'draft' | 'finalized';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Time Capsule (subcollection)
export interface TimeCapsule {
  id: string;
  estateId: string;
  title: string;
  message: string;
  recipientName: string;
  recipientEmail: string;
  recipientRelationship?: string;
  deliveryType: 'scheduled_date' | 'on_death' | 'on_settlement' | 'anniversary';
  scheduledDate?: Timestamp;
  anniversaryDate?: string; // MM-DD format
  status: 'pending' | 'delivered' | 'cancelled';
  deliveredAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Heirloom (subcollection)
export interface Heirloom {
  id: string;
  estateId: string;
  name: string;
  category: 'jewelry' | 'artwork' | 'furniture' | 'vehicle' | 'collectible' | 'family_artifact' | 'other';
  description: string;
  estimatedValue?: number;
  designatedHeir?: string;
  photoUrls: string[];
  location?: string;
  provenance?: string;
  status: 'active' | 'archived';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Notification (subcollection)
export interface EstateNotification {
  id: string;
  estateId: string;
  title?: string;
  message?: string;
  type?: string;
  status?: string;
  read?: boolean;
  readAt?: Timestamp;
  createdAt: Timestamp;
}

// ─── Generic Hooks ────────────────────────────────────────────────────────────

/**
 * Subscribe to a single Firestore document.
 */
export function useDocument<T>(path: string | null): FirestoreResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      startTransition(() => {
        setData(null);
        setLoading(false);
      });
      return;
    }

    startTransition(() => setLoading(true));

    const docRef = doc(db, path);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`[Firestore] Error on ${path}:`, err.message);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [path]);

  return { data, loading, error };
}

/**
 * Subscribe to a Firestore collection or subcollection with optional constraints.
 */
export function useCollection<T>(
  collectionPath: string | null,
  constraints?: QueryConstraint[]
): FirestoreListResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialize constraints to a stable key for dependency tracking
  const constraintKey = useMemo(
    () => JSON.stringify(constraints?.map((c) => c.type) || []),
    [constraints]
  );

  useEffect(() => {
    if (!collectionPath) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const colRef = collection(db, collectionPath);
    const q = constraints?.length ? query(colRef, ...constraints) : query(colRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as T[];
        setData(docs);
        setLoading(false);
      },
      (err) => {
        console.error(`[Firestore] Error on ${collectionPath}:`, err.message);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPath, constraintKey]);

  return { data, loading, error };
}

// ─── Domain Hooks ─────────────────────────────────────────────────────────────

/**
 * Subscribe to a single estate document.
 */
export function useEstate(estateId: string | null): FirestoreResult<Estate> {
  const path = estateId ? `estates/${estateId}` : null;
  return useDocument<Estate>(path);
}

/**
 * Subscribe to assets for an estate (sorted by creation date).
 */
export function useEstateAssets(estateId: string | null): FirestoreListResult<Asset> {
  const path = estateId ? `estates/${estateId}/assets` : null;
  const constraints = useMemo(
    () => [orderBy('createdAt', 'desc')],
    []
  );
  return useCollection<Asset>(path, constraints);
}

/**
 * Subscribe to heirs for an estate.
 */
export function useEstateHeirs(estateId: string | null): FirestoreListResult<Heir> {
  const path = estateId ? `estates/${estateId}/heirs` : null;
  const constraints = useMemo(
    () => [where('status', '==', 'active'), orderBy('createdAt', 'asc')],
    []
  );
  return useCollection<Heir>(path, constraints);
}

/**
 * Subscribe to executors for an estate (sorted by priority).
 */
export function useEstateExecutors(estateId: string | null): FirestoreListResult<Executor> {
  const path = estateId ? `estates/${estateId}/executors` : null;
  const constraints = useMemo(
    () => [orderBy('priority', 'asc')],
    []
  );
  return useCollection<Executor>(path, constraints);
}

/**
 * Subscribe to vault documents for an estate.
 */
export function useEstateDocuments(estateId: string | null): FirestoreListResult<VaultDocument> {
  const path = estateId ? `estates/${estateId}/documents` : null;
  const constraints = useMemo(
    () => [where('status', '==', 'active'), orderBy('createdAt', 'desc')],
    []
  );
  return useCollection<VaultDocument>(path, constraints);
}

/**
 * Subscribe to estates a user has access to (via estate_users junction).
 */
export function useUserEstates(userId: string | null): FirestoreListResult<EstateUser> {
  const constraints = useMemo(
    () => (userId ? [where('userId', '==', userId), where('accessGranted', '==', true)] : []),
    [userId]
  );
  return useCollection<EstateUser>(userId ? 'estate_users' : null, constraints);
}

/**
 * Subscribe to lockbox items for an estate (sorted by creation date).
 */
export function useLockboxItems(estateId: string | null): FirestoreListResult<LockboxItem> {
  const path = estateId ? `estates/${estateId}/lockbox` : null;
  const constraints = useMemo(
    () => [orderBy('createdAt', 'desc')],
    []
  );
  return useCollection<LockboxItem>(path, constraints);
}

/**
 * Subscribe to notifications for an estate (latest 20).
 */
export function useEstateNotifications(estateId: string | null): FirestoreListResult<EstateNotification> {
  const path = estateId ? `estates/${estateId}/notifications` : null;
  const constraints = useMemo(
    () => [orderBy('createdAt', 'desc'), limit(20)],
    []
  );
  return useCollection<EstateNotification>(path, constraints);
}

/**
 * Subscribe to unread notifications for an estate (latest 5, real-time).
 * Used by the notification bell in AdminHeader.
 */
export function useUnreadNotifications(estateId: string | null): FirestoreListResult<EstateNotification> {
  const path = estateId ? `estates/${estateId}/notifications` : null;
  const constraints = useMemo(
    () => [where('read', '==', false), orderBy('createdAt', 'desc'), limit(5)],
    []
  );
  return useCollection<EstateNotification>(path, constraints);
}

/**
 * Subscribe to directives for an estate (sorted by creation date).
 */
export function useDirectives(estateId: string | null): FirestoreListResult<Directive> {
  const path = estateId ? `estates/${estateId}/directives` : null;
  const constraints = useMemo(
    () => [orderBy('createdAt', 'desc')],
    []
  );
  return useCollection<Directive>(path, constraints);
}

/**
 * Subscribe to time capsules for an estate (sorted by creation date).
 */
export function useTimeCapsules(estateId: string | null): FirestoreListResult<TimeCapsule> {
  const path = estateId ? `estates/${estateId}/capsules` : null;
  const constraints = useMemo(
    () => [orderBy('createdAt', 'desc')],
    []
  );
  return useCollection<TimeCapsule>(path, constraints);
}

/**
 * Subscribe to heirlooms for an estate (sorted by creation date).
 */
export function useHeirlooms(estateId: string | null): FirestoreListResult<Heirloom> {
  const path = estateId ? `estates/${estateId}/heirlooms` : null;
  const constraints = useMemo(
    () => [orderBy('createdAt', 'desc')],
    []
  );
  return useCollection<Heirloom>(path, constraints);
}
