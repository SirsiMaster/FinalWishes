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
import { useAuth } from './auth';

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
  // Guardian Protocol fields
  lastActivityAt?: Timestamp;
  guardianThreshold?: number;
  escalationLevel?: string;
  ownerName?: string;
  ownerEmail?: string;
  executorName?: string;
  settlementType?: string;
  settlementReportedAt?: string;
  settlementReportedBy?: string;
}

// Asset (subcollection)
export interface Asset {
  id: string;
  estateId: string;
  category: 'financial' | 'real_estate' | 'vehicle' | 'digital' | 'personal_property' | 'debt' | 'insurance' | 'charitable';
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
  /** Set by autoMatchInvitation when the heir accepts + registers — their Firebase UID. */
  userId?: string;
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

// Document Intelligence analysis result
export interface DocumentAnalysis {
  documentType: 'will' | 'trust' | 'insurance' | 'deed' | 'financial' | 'medical' | 'other';
  signingDate: string | null;
  notarized: boolean | null;
  namedBeneficiaries: string[];
  namedExecutor: string | null;
  namedTrustee: string | null;
  assetsMentioned: string[];
  jurisdiction: string | null;
  summary: string;
  flags: string[];
}

export interface DocumentDiscrepancy {
  type: 'unknown_beneficiary' | 'unknown_executor' | 'unknown_trustee';
  name: string;
  message: string;
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
  // Document Intelligence fields (populated after AI analysis)
  analysis?: DocumentAnalysis;
  analysisStatus?: 'processing' | 'complete' | 'failed';
  discrepancies?: DocumentDiscrepancy[];
  analyzedAt?: Timestamp;
  // Per-document role/person visibility (empty = visible to everyone)
  visibleTo?: string[];
  // Version history metadata
  previousVersions?: { version: number; storageKey: string; uploadedAt: string; uploadedBy: string }[];
}

// EstateUser (junction table)
export interface EstateUser {
  id: string;
  estateId: string;
  userId: string;
  role: 'principal' | 'executor' | 'heir' | 'trustee' | 'legal' | 'cpa';
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
  signingEnvelopeId?: string;
  signingInitiatedAt?: string;
  signedAt?: string;
  visibleTo?: string[]; // UIDs or names — empty means visible to all
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
  voiceMemoUrl?: string;
  photoUrls?: string[];
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
  visibleTo?: string[]; // Heir names — empty means visible to all
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
 * Build a stable, value-aware key fragment for a single QueryConstraint.
 *
 * The Firebase Web SDK keeps a constraint's field path, operator, value,
 * direction and limit on non-public underscore-prefixed properties. We read
 * them defensively: if the SDK shape changes (e.g. heavy minification renames
 * them), we degrade to the constraint's own JSON / string representation rather
 * than silently dropping the value — never to the type alone, which is the
 * latent stale-list bug this normalizer exists to prevent.
 */
function normalizeConstraint(c: QueryConstraint): unknown {
  const anyC = c as unknown as Record<string, unknown>;
  const field = anyC._field;
  const fieldPath =
    field && typeof field === 'object'
      ? String((field as { toString?: () => string }).toString?.() ?? '')
      : field;

  const projection: Record<string, unknown> = {
    type: c.type,
    field: fieldPath,
    op: anyC._op,
    value: anyC._value,
    direction: anyC._direction,
    limit: anyC._limit,
  };

  // If none of the discriminating internals were present (minified/renamed),
  // fall back to a structural serialization so distinct constraints still key
  // distinctly. JSON first (captures own enumerable props), then String().
  const hasInternals =
    fieldPath !== undefined ||
    anyC._op !== undefined ||
    anyC._value !== undefined ||
    anyC._direction !== undefined ||
    anyC._limit !== undefined;

  if (hasInternals) return projection;

  try {
    return { type: c.type, raw: JSON.parse(JSON.stringify(c)) };
  } catch {
    return { type: c.type, raw: String(c) };
  }
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

  // Serialize constraints to a stable key for dependency tracking.
  //
  // We must key on the FULL constraint — not just `c.type` — otherwise a query
  // whose field path is fixed but whose value changes (e.g.
  // `where('userId', '==', userId)` as `userId` updates) would NOT re-subscribe,
  // serving a stale list. The Firebase SDK does not expose a public serializer,
  // so we defensively read the well-known internal fields (`_field`, `_op`,
  // `_value`, `_direction`, `_limit`) and fall back to the constraint's own
  // JSON / string form when they are absent or minified away.
  const constraintKey = useMemo(
    () => JSON.stringify((constraints || []).map(normalizeConstraint)),
    [constraints]
  );

  useEffect(() => {
    if (!collectionPath) {
      // Mirror useDocument: defer the cleared-state writes via startTransition so
      // they don't cascade as a synchronous render. Behavior is unchanged — the
      // list still clears and loading still settles when the path goes null.
      startTransition(() => {
        setData([]);
        setLoading(false);
      });
      return;
    }

    // Same deferral as useDocument: mark loading via startTransition so the
    // subscribe-time state write doesn't cascade synchronously.
    startTransition(() => {
      setLoading(true);
      setError(null);
    });

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
  // Show ALL non-removed heirs. Added family members are created with
  // status:'pending'; filtering to =='active' hid every newly-added family
  // member until they accepted an invite, so "add family member" looked broken.
  const constraints = useMemo(
    () => [where('status', 'in', ['active', 'pending', 'invited']), orderBy('createdAt', 'asc')],
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
// Lockbox is the most sensitive collection — firestore.rules gates reads on
// isEstatePrincipal() (estate.principalId == uid) || isAdmin(). Pass enabled=false
// from callers where the current persona can't read it, so non-principal personas
// (heir/executor/trustee/legal/cpa) don't fire `Missing or insufficient permissions`
// on every page. The lockbox ROUTE is principal-only (RoleGuard) so it omits the arg
// (enabled defaults true); the always-mounted global search (AdminHeader) and the
// settings page gate it on estate-principal status. See useIsEstatePrincipal.
export function useLockboxItems(
  estateId: string | null,
  enabled: boolean = true,
): FirestoreListResult<LockboxItem> {
  const path = estateId && enabled ? `estates/${estateId}/lockbox` : null;
  const constraints = useMemo(
    () => [orderBy('createdAt', 'desc')],
    []
  );
  return useCollection<LockboxItem>(path, constraints);
}

// Returns true when the current authenticated user can read the estate's lockbox
// (estate principal or admin) — mirrors firestore.rules isEstatePrincipal()||isAdmin().
// Used to gate the lockbox subscription at always-mounted call sites.
export function useIsEstatePrincipal(estateId: string | null): boolean {
  const { profile } = useAuth();
  const { data: estate } = useEstate(estateId);
  return !!estate && !!profile && (estate.principalId === profile.uid || profile.role === 'admin');
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

// ─── Life Chapters ────────────────────────────────────────────────────────────

export interface LifeChapter {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  dateFrom?: string;
  dateTo?: string;
  entryRefs: ChapterEntryRef[];
  order: number;
  status: 'active' | 'archived';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface ChapterEntryRef {
  collection: 'soul-log' | 'memoirs' | 'capsules' | 'directives' | 'heirlooms';
  docId: string;
  title: string;
  addedAt: string;
}

/**
 * Subscribe to life chapters for an estate (sorted by display order).
 */
export function useLifeChapters(estateId: string | null): FirestoreListResult<LifeChapter> {
  const path = estateId ? `estates/${estateId}/life-chapters` : null;
  const constraints = useMemo(
    () => [where('status', '==', 'active'), orderBy('order', 'asc')],
    []
  );
  return useCollection<LifeChapter>(path, constraints);
}
