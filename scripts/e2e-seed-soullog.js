#!/usr/bin/env node
/**
 * Seed two Soul Log entries on the persona estate so persona-safety.spec.ts can
 * PROVE the read-privacy boundary (ADR-046): a heir SEES the owner's `shared`
 * entry but NEVER the owner's `private` diary.
 *
 * Idempotent: clears any prior `E2E `-prefixed entries the owner created, then
 * writes exactly one private + one shared (tagged to the heir's display name).
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS (Firebase Auth admin + Firestore on
 * finalwishes-prod) and firebase-admin (resolved from functions/node_modules).
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/finalwishes-claude-agent.json \
 *     node scripts/e2e-seed-soullog.js
 *
 * Env overrides: E2E_PERSONA_ESTATE_ID, E2E_PERSONA_OWNER_EMAIL, E2E_HEIR_DISPLAY_NAME.
 */
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

const ESTATE = process.env.E2E_PERSONA_ESTATE_ID || 'estate_e2e_personas';
const OWNER_EMAIL = process.env.E2E_PERSONA_OWNER_EMAIL || 'e2e-persona-owner@finalwishes.app';
const HEIR_NAME = process.env.E2E_HEIR_DISPLAY_NAME || 'E2E Persona Heir';

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'finalwishes-prod' });
const auth = admin.auth();
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

(async () => {
  const owner = await auth.getUserByEmail(OWNER_EMAIL);
  const col = db.collection(`estates/${ESTATE}/soul-log`);

  // Clear prior E2E-seeded entries (idempotent).
  const prior = await col.where('createdBy', '==', owner.uid).get();
  for (const d of prior.docs) {
    if ((d.data().title || '').startsWith('E2E ')) await d.ref.delete();
  }

  await col.doc('e2e_private').set({
    title: 'E2E Private Diary', type: 'text', visibility: 'private',
    createdBy: owner.uid, content: '<p>owner private</p>', taggedPeople: [],
    createdAt: FV.serverTimestamp(),
  });
  await col.doc('e2e_shared').set({
    title: 'E2E Shared Letter', type: 'text', visibility: 'shared',
    createdBy: owner.uid, content: '<p>for the heir</p>', taggedPeople: [HEIR_NAME],
    createdAt: FV.serverTimestamp(),
  });

  console.log(`Seeded soul-log on ${ESTATE}: 1 private + 1 shared (tagged "${HEIR_NAME}").`);
  process.exit(0);
})().catch((e) => { console.error('seed failed:', e.message); process.exit(1); });
