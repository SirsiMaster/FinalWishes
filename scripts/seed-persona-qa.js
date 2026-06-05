/**
 * Seed a persona-QA estate for browser-verifying persona safety (RoleGuard / Layer 2).
 * Lane: claude-finalwishes (seed recipe + data shape). Browser walkthrough: codex-finalwishes.
 *
 *   node scripts/seed-persona-qa.js          # seeds SEED_PROJECT (default finalwishes-prod)
 *   SEED_PROJECT=demo-finalwishes node scripts/seed-persona-qa.js
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/seed-persona-qa.js   # local emulator
 *
 * ── What it creates (all clearly TEST-only, isolated from real data) ──────────
 *   estates/estate_persona_qa                      — one QA estate (isTestEstate: true)
 *   users/<uid>            x7                       — test accounts (isTestAccount: true)
 *   estate_users/<uid>_estate_persona_qa  x7       — the per-persona access grants
 *   attestations/<uid>_estate_persona_qa  (fiduciaries) — status 'verified'
 *
 * ── The walk path (why global role = principal) ───────────────────────────────
 *   IdentityGate gates fiduciaries (heir/executor/trustee/legal/cpa) on MFA +
 *   attestation, and it currently keys `isFiduciary` on the GLOBAL profile.role
 *   (IdentityGate.tsx:53) — NOT the estate-scoped role. RoleGuard, by contrast,
 *   enforces the ESTATE role. So to walk RoleGuard for every persona WITHOUT
 *   enrolling TOTP MFA, each test user is seeded as:
 *       global profile.role = 'principal'   → passes IdentityGate (grace period)
 *       estate_users.role   = <persona>     → RoleGuard enforces the persona
 *   This also directly demonstrates the estate-scoped leak-fix: a user who is
 *   principal on their own estate must behave as heir/executor/... on THIS one.
 *
 *   NOTE (finding, routed to Codex): that IdentityGate uses the global role is a
 *   real inconsistency — a principal-on-their-own-estate could skip fiduciary
 *   attestation elsewhere. When IdentityGate is corrected to the estate role,
 *   the fiduciary walk will additionally require TOTP MFA enrollment (admin SDK
 *   cannot seed TOTP factors). The `attestations` verified docs are seeded now so
 *   that, post-fix, only MFA remains. Until then, the global-principal path walks
 *   cleanly.
 *
 * ── Suggested browser walk (per persona) ──────────────────────────────────────
 *   Log in as each persona-* account, open /estates/estate_persona_qa, then try
 *   the direct URLs and confirm RoleGuard's allow/block matches PERSONA_ACCESS:
 *     heir      → /vault, /lockbox, /dashboard, /settings  ⇒ BLOCKED (warm state)
 *               → /memoirs, /events, /obituary             ⇒ allowed
 *     executor  → /soul-log, /life-chapters, /pricing      ⇒ BLOCKED
 *               → /probate, /vault                          ⇒ allowed
 *     legal     → /soul-log, /lockbox                       ⇒ BLOCKED; /vault, /forms allowed
 *     cpa       → /directives, /forms                       ⇒ BLOCKED; /assets, /vault allowed
 *     trustee   → /events, /soul-log                         ⇒ BLOCKED; /probate, /vault allowed
 *     principal → everything allowed
 */

const admin = require('firebase-admin');

const PROJECT = process.env.SEED_PROJECT || 'finalwishes-prod';
admin.initializeApp({ projectId: PROJECT });

const auth = admin.auth();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const ESTATE_ID = 'estate_persona_qa';
const FIDUCIARY = new Set(['heir', 'executor', 'trustee', 'legal', 'cpa']);

// estateRole = what RoleGuard enforces. globalRole = what we set on users/<uid>.
// All non-principals are seeded global 'principal' so IdentityGate's grace lets
// them reach RoleGuard without MFA (see header).
const PERSONAS = [
  { key: 'principal', estateRole: 'principal', name: 'Pat Principal' },
  { key: 'heir',      estateRole: 'heir',      name: 'Hana Heir' },
  { key: 'executor',  estateRole: 'executor',  name: 'Evan Executor' },
  { key: 'trustee',   estateRole: 'trustee',   name: 'Tariq Trustee' },
  { key: 'legal',     estateRole: 'legal',     name: 'Lena Legal' },
  { key: 'cpa',       estateRole: 'cpa',       name: 'Cora CPA' },
];

const emailFor = (key) => `persona-${key}@finalwishes.app`;
const passwordFor = (key) => `PersonaQA2026!${key}`;

async function ensureUser(persona) {
  const email = emailFor(persona.key);
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    user = await auth.createUser({
      email,
      password: passwordFor(persona.key),
      displayName: persona.name,
      emailVerified: true,
    });
    console.log('  created auth user', email);
  }
  // Global profile role = principal for everyone (the walk path). The persona is
  // expressed through estate_users, not the global profile.
  await db.collection('users').doc(user.uid).set({
    email,
    displayName: persona.name,
    role: 'principal',
    emailVerified: true,
    mfaEnabled: false,
    loginCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    profile: { firstName: persona.name.split(' ')[0], lastName: persona.name.split(' ')[1] || '' },
    isTestAccount: true,
  }, { merge: true });
  return user;
}

async function seed() {
  console.log(`Seeding persona-QA estate '${ESTATE_ID}' on project '${PROJECT}'\n`);

  const principal = await ensureUser(PERSONAS[0]);

  // The QA estate, owned by the principal test account.
  await db.collection('estates').doc(ESTATE_ID).set({
    name: 'Persona QA Estate',
    ownerId: principal.uid,
    ownerUid: principal.uid,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    isTestEstate: true,
  }, { merge: true });
  console.log('  estate ready:', ESTATE_ID);

  for (const persona of PERSONAS) {
    const user = persona.key === 'principal' ? principal : await ensureUser(persona);
    const junctionId = `${user.uid}_${ESTATE_ID}`;

    await db.collection('estate_users').doc(junctionId).set({
      estateId: ESTATE_ID,
      userId: user.uid,
      role: persona.estateRole, // ← RoleGuard enforces THIS
      accessGranted: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      isTestGrant: true,
    }, { merge: true });

    // Pre-verify attestation for fiduciaries so the walk survives an IdentityGate
    // fix to estate-scoped roles (MFA still pending then; see header).
    if (FIDUCIARY.has(persona.estateRole)) {
      await db.collection('attestations').doc(junctionId).set({
        uid: user.uid,
        estateId: ESTATE_ID,
        role: persona.estateRole,
        status: 'verified',
        verifiedAt: FieldValue.serverTimestamp(),
        isTestAttestation: true,
      }, { merge: true });
    }

    console.log(`  ${persona.estateRole.padEnd(9)} ${emailFor(persona.key)}  (pw: ${passwordFor(persona.key)})`);
  }

  console.log(`\nDone. Walk: log in as each persona-* account → /estates/${ESTATE_ID}/<section>.`);
  process.exit(0);
}

seed().catch((e) => { console.error('Seed failed:', e); process.exit(1); });
