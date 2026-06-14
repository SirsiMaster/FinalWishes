#!/usr/bin/env node
/**
 * Backfill estates/{id}.principalId for legacy estates created before the field
 * existed. The OpenSign signer=principal change (PR #10) resolves the signer from
 * estates/{id}.principalId; an estate missing it now 400s on signing. This sets
 * principalId from the authoritative role=="principal" estate_users junction.
 *
 * DRY RUN by default (read-only: reports counts, writes nothing).
 * Apply with --apply.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/finalwishes-claude-agent.json \
 *   GCLOUD_PROJECT=finalwishes-prod node scripts/backfill-estate-principalid.js [--apply]
 *
 * Refs: ADR-047, claude-home signer=principal decision 2026-06-14
 */
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

const APPLY = process.argv.includes('--apply');
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'finalwishes-prod' });
const db = admin.firestore();

(async () => {
  const estatesSnap = await db.collection('estates').get();
  let total = 0, hasField = 0, backfilled = 0, unresolved = 0, ambiguous = 0;
  const unresolvedIds = [];

  for (const estate of estatesSnap.docs) {
    total++;
    const data = estate.data();
    if (data.principalId) { hasField++; continue; }

    // Resolve the principal from the authoritative junction.
    const principals = await db.collection('estate_users')
      .where('estateId', '==', estate.id)
      .where('role', '==', 'principal')
      .get();

    if (principals.empty) { unresolved++; unresolvedIds.push(estate.id); continue; }
    if (principals.size > 1) {
      // More than one principal junction — ambiguous, do NOT guess.
      ambiguous++; unresolvedIds.push(estate.id + ' (ambiguous: ' + principals.size + ' principals)'); continue;
    }
    const principalId = principals.docs[0].data().userId;
    if (!principalId) { unresolved++; unresolvedIds.push(estate.id + ' (junction has no userId)'); continue; }

    if (APPLY) {
      await estate.ref.update({ principalId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    backfilled++;
    console.log(`${APPLY ? 'SET' : 'WOULD SET'} estates/${estate.id}.principalId = ${principalId}`);
  }

  console.log('\n--- backfill summary ---');
  console.log(`mode:                 ${APPLY ? 'APPLY (writes)' : 'DRY RUN (no writes)'}`);
  console.log(`estates total:        ${total}`);
  console.log(`already had field:    ${hasField}`);
  console.log(`backfilled:           ${backfilled}`);
  console.log(`unresolved (no junction / no userId): ${unresolved}`);
  console.log(`ambiguous (>1 principal):            ${ambiguous}`);
  if (unresolvedIds.length) {
    console.log('\nEstates needing manual attention:');
    unresolvedIds.forEach((id) => console.log('  - ' + id));
  }
  if (!APPLY && backfilled > 0) console.log('\nRe-run with --apply to write these changes.');
  process.exit(0);
})().catch((err) => { console.error('backfill failed:', err); process.exit(1); });
