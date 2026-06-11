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

    // name → SET of registered-heir UIDs. A name that maps to MORE THAN ONE heir is
    // AMBIGUOUS (two heirs share a display name) — we must NOT guess which one the
    // entry was shared with, or we'd mis-share. Such names are skipped + logged for
    // manual resolution (claude-home PR #3 review).
    const heirs = await db.collection(`estates/${estateId}/heirs`).get();
    const nameToUids = {};
    for (const h of heirs.docs) {
      const d = h.data();
      if (d.fullName && d.userId) (nameToUids[d.fullName] = nameToUids[d.fullName] || new Set()).add(d.userId);
    }

    const entries = await db.collection(`estates/${estateId}/soul-log`)
      .where('visibility', '==', 'shared').get();
    for (const e of entries.docs) {
      scanned++;
      const data = e.data();
      const tagged = Array.isArray(data.taggedPeople) ? data.taggedPeople : [];
      const want = [];
      for (const n of tagged) {
        const uids = nameToUids[n];
        if (!uids) continue;
        if (uids.size > 1) {
          console.warn(`SKIP ambiguous name "${n}" in ${estateId}/${e.id}: maps to ${uids.size} registered heirs — resolve manually`);
          continue;
        }
        want.push([...uids][0]);
      }
      const wantSet = Array.from(new Set(want));
      const have = Array.isArray(data.sharedWith) ? data.sharedWith : [];
      if (!sameSet(wantSet, have)) {
        changed++;
        console.log(`${APPLY ? 'WRITE' : 'DRY '} ${estateId}/${e.id}: sharedWith ${JSON.stringify(have)} -> ${JSON.stringify(wantSet)}`);
        if (APPLY) await e.ref.update({ sharedWith: wantSet });
      }
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Dry run'}: ${changed} of ${scanned} shared entries ${APPLY ? 'updated' : 'would change'}.`);
  process.exit(0);
})().catch((err) => { console.error('migration failed:', err.message); process.exit(1); });
