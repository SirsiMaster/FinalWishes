/**
 * Provision the persona-safety E2E fixtures: ONE shared estate with three
 * members at three different ESTATE-SCOPED roles, so the Playwright persona
 * specs exercise resolveEffectiveRole() / RoleGuard / IdentityGate against LIVE
 * prod instead of skipping for lack of real accounts.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/finalwishes-claude-agent.json \
 *   E2E_PERSONA_PASSWORD='<choose-a-strong-pw>' \
 *   node scripts/e2e-provision-personas.js
 *
 * Idempotent — re-run before a test session to reset the principal's MFA-grace
 * window (createdAt=NOW) and re-assert the seeded data.
 *
 * ── What it creates (all clearly TEST-only) ─────────────────────────────────
 *   estates/estate_e2e_personas                       (isTestEstate, principalId = owner uid)
 *
 *   e2e-persona-owner@finalwishes.app      → estate role  principal   (sees everything)
 *   e2e-persona-heir@finalwishes.app       → estate role  heir        (sacred HeirDashboard)
 *   e2e-persona-executor@finalwishes.app   → estate role  executor    (settlement dashboard)
 *
 * For each: an auth user (known pw via env, emailVerified), a users/<uid>
 * profile, and an estate_users/<uid>_estate_e2e_personas junction carrying the
 * estate-scoped role. For the two fiduciaries we ALSO write a verified
 * attestations doc so IdentityGate's attestation check is satisfied.
 *
 * ── Role strategy (DOCUMENTED, per task) ────────────────────────────────────
 * Every users/<uid>.role is set to 'principal' (GLOBAL profile role), while the
 * persona role lives ONLY on the estate_users junction. This is deliberate and
 * is the whole point of the test:
 *
 *   resolveEffectiveRole(estateUser.role, profile.role) must return the
 *   ESTATE-scoped role (heir/executor), NOT the global profile role
 *   (principal). Seeding profile.role='principal' for the fiduciaries means a
 *   green RoleGuard/HeirDashboard assertion can ONLY be explained by the estate
 *   role winning — if the code ever regressed to reading profile.role, the heir
 *   would wrongly see the owner timeline and the test would fail. Seeding
 *   profile.role='heir' would mask that regression. So: global principal,
 *   estate-scoped persona — the adversarial choice.
 *
 * The owner is principal both globally and on the estate (no divergence needed).
 *
 * ── MFA caveat (see e2e/persona-safety.spec.ts header for the full finding) ──
 * IdentityGate gates fiduciaries on getMFAStatus(user).enrolled, which reads the
 * Firebase Auth user's enrolled TOTP factors via the CLIENT SDK. The Admin SDK
 * (firebase-admin v13) can only create/update PHONE second factors, NOT TOTP —
 * so this script CANNOT seed MFA enrollment for the fiduciaries. The attestation
 * half of the gate is satisfied here; the MFA half is not, and the fiduciary
 * specs are honestly test.skip()'d until MFA can be seeded (recommendation in
 * the spec header). createdAt=NOW only buys grace for PRINCIPALS — fiduciaries
 * get no grace, by design.
 */
const admin = require('firebase-admin');

const PASSWORD = process.env.E2E_PERSONA_PASSWORD;
const PROJECT = process.env.SEED_PROJECT || 'finalwishes-prod';
const ESTATE_ID = process.env.E2E_PERSONA_ESTATE_ID || 'estate_e2e_personas';
const ESTATE_NAME = 'E2E Persona Test Estate';

if (!PASSWORD) { console.error('Set E2E_PERSONA_PASSWORD'); process.exit(1); }

/**
 * The three members. `estateRole` is the estate-scoped persona (what
 * resolveEffectiveRole must return); the global profile role is always
 * 'principal' (see role strategy above). `fiduciary` drives the attestation
 * seed.
 */
const MEMBERS = [
  { key: 'owner',    email: process.env.E2E_PERSONA_OWNER_EMAIL    || 'e2e-persona-owner@finalwishes.app',    displayName: 'E2E Persona Owner',    first: 'Olivia', last: 'Owner',    estateRole: 'principal', fiduciary: false },
  { key: 'heir',     email: process.env.E2E_PERSONA_HEIR_EMAIL     || 'e2e-persona-heir@finalwishes.app',     displayName: 'E2E Persona Heir',     first: 'Henry',  last: 'Heir',     estateRole: 'heir',      fiduciary: true  },
  { key: 'executor', email: process.env.E2E_PERSONA_EXECUTOR_EMAIL || 'e2e-persona-executor@finalwishes.app', displayName: 'E2E Persona Executor', first: 'Eve',    last: 'Executor', estateRole: 'executor',  fiduciary: true  },
];

admin.initializeApp({ projectId: PROJECT });
const auth = admin.auth();
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

/** Create-or-update an auth user with the known pw + emailVerified. Returns uid. */
async function upsertAuthUser({ email, displayName }) {
  try {
    const u = await auth.getUserByEmail(email);
    await auth.updateUser(u.uid, { password: PASSWORD, emailVerified: true, displayName });
    return u.uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    const u = await auth.createUser({ email, password: PASSWORD, displayName, emailVerified: true });
    return u.uid;
  }
}

(async () => {
  // 1) auth users
  const uids = {};
  for (const m of MEMBERS) {
    uids[m.key] = await upsertAuthUser(m);
  }
  const ownerUid = uids.owner;

  // 2) shared estate (principalId = the owner)
  await db.collection('estates').doc(ESTATE_ID).set({
    name: ESTATE_NAME, principalId: ownerUid, status: 'active',
    createdAt: FV.serverTimestamp(), updatedAt: FV.serverTimestamp(), isTestEstate: true,
  }, { merge: true });

  // 3) per-member: estate_users junction + users profile (+ attestation for fiduciaries)
  for (const m of MEMBERS) {
    const uid = uids[m.key];

    // estate_users junction — carries the ESTATE-SCOPED role (the one that wins)
    await db.collection('estate_users').doc(`${uid}_${ESTATE_ID}`).set({
      estateId: ESTATE_ID, userId: uid, role: m.estateRole, accessGranted: true,
      accessGrantedAt: FV.serverTimestamp(), createdAt: FV.serverTimestamp(),
      updatedAt: FV.serverTimestamp(), isTestGrant: true,
    }, { merge: true });

    // users profile — GLOBAL role is principal for ALL members (see role strategy).
    // createdAt=NOW keeps the OWNER inside the principal MFA-grace window; it does
    // nothing for the fiduciaries (IdentityGate gives fiduciaries no grace).
    await db.collection('users').doc(uid).set({
      email: m.email, displayName: m.displayName, role: 'principal',
      emailVerified: true, mfaEnabled: false, loginCount: 0,
      createdAt: FV.serverTimestamp(), lastLoginAt: FV.serverTimestamp(),
      primaryEstateId: ESTATE_ID, primaryEstateName: ESTATE_NAME,
      profile: { firstName: m.first, lastName: m.last }, isTestAccount: true,
    }, { merge: true });

    // verified attestation — satisfies the ATTESTATION half of IdentityGate's
    // fiduciary gate (the MFA half cannot be seeded via Admin SDK; see header).
    // Keyed deterministically (<uid>_<estate>) so re-runs are idempotent.
    if (m.fiduciary) {
      await db.collection('attestations').doc(`${uid}_${ESTATE_ID}`).set({
        uid, estateId: ESTATE_ID, role: m.estateRole, status: 'verified',
        fullLegalName: `${m.first} ${m.last}`,
        attestationText: `I, ${m.first} ${m.last}, attest to my identity and role as ${m.estateRole} for this estate. (E2E TEST FIXTURE)`,
        signatureData: 'e2e-test-fixture',
        verifiedAt: FV.serverTimestamp(), createdAt: FV.serverTimestamp(),
        isTestAttestation: true,
      }, { merge: true });
    }

    console.log(`  ${m.key.padEnd(9)} ${m.email}  uid=${uid}  estateRole=${m.estateRole}${m.fiduciary ? '  +attestation' : ''}`);
  }

  console.log(`\nProvisioned estate ${ESTATE_ID} (${PROJECT}) with principal + heir + executor.`);
  console.log('Fiduciaries have verified attestations but NO seeded MFA — fiduciary specs skip (see spec header).');
  process.exit(0);
})().catch((e) => { console.error('Persona provision failed:', e.message); process.exit(1); });
