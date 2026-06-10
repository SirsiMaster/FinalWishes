#!/usr/bin/env node
/**
 * One-time migration for ADR-046 #1 (Soul Log per-recipient narrowing).
 *
 * Backfills `sharedWith` (array of Firebase UIDs) on every EXISTING `shared` Soul Log
 * entry by resolving its `taggedPeople` display names → the UID of the matching heir
 * (estates/{estateId}/heirs whose fullName matches AND has a userId, i.e. has accepted).
 *
 * Why: the new Firestore read rule + non-owner query gate on
 *   `request.auth.uid in resource.data.sharedWith`
 * so without this backfill, existing entries (which have no sharedWith) would become
 * invisible to the heirs they were shared with until the entry is re-saved.
 *
 * IDEMPOTENT: recomputes sharedWith from taggedPeople each run; only writes on change.
 * Names that don't resolve to a registered heir are skipped (that heir gets backfilled
 * later by autoMatchInvitation when they accept).
 *
 * DRY RUN by default. Pass --apply to write.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/finalwishes-claude-agent.json \
 *     node scripts/migrate-soullog-sharedwith.js [--apply]
 *
 * DO NOT run against prod without review (modifies estate data).
 */
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

const APPLY = process.argv.includes('--apply');
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'finalwishes-prod' });
const db = admin.firestore();

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

(async () => {
  const estates = await db.collection('estates').get();
  let scanned = 0, changed = 0;
  for (const estate of estates.docs) {
    const estateId = estate.id;

    // name → userId for heirs that have registered
    const heirs = await db.collection(`estates/${estateId}/heirs`).get();
    const nameToUid = {};
    for (const h of heirs.docs) {
      const d = h.data();
      if (d.fullName && d.userId) nameToUid[d.fullName] = d.userId;
    }

    const entries = await db.collection(`estates/${estateId}/soul-log`)
      .where('visibility', '==', 'shared').get();
    for (const e of entries.docs) {
      scanned++;
      const data = e.data();
      const tagged = Array.isArray(data.taggedPeople) ? data.taggedPeople : [];
      const want = Array.from(new Set(tagged.map((n) => nameToUid[n]).filter(Boolean)));
      const have = Array.isArray(data.sharedWith) ? data.sharedWith : [];
      if (!sameSet(want, have)) {
        changed++;
        console.log(`${APPLY ? 'WRITE' : 'DRY '} ${estateId}/${e.id}: sharedWith ${JSON.stringify(have)} -> ${JSON.stringify(want)}`);
        if (APPLY) await e.ref.update({ sharedWith: want });
      }
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Dry run'}: ${changed} of ${scanned} shared entries ${APPLY ? 'updated' : 'would change'}.`);
  process.exit(0);
})().catch((err) => { console.error('migration failed:', err.message); process.exit(1); });
