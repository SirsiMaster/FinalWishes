/**
 * Provision the E2E test account + estate so the authenticated Playwright specs
 * actually RUN (instead of skipping for lack of a real account).
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/finalwishes-claude-agent.json \
 *   E2E_PROV_PASSWORD='<choose-a-strong-pw>' \
 *   node scripts/e2e-provision.js
 *
 * Then run the suite with the same creds (serial — the Go API rate-limits
 * 100 req/60s with a 10-min ban, so run per-spec or paced, never parallel):
 *
 *   cd web
 *   E2E_TEST_EMAIL='e2e-principal@finalwishes.app' E2E_TEST_PASSWORD='<same-pw>' \
 *     npx playwright test e2e/smoke.spec.ts --workers=1
 *   # ...then authenticated.spec.ts, returning-user.spec.ts, life-first-features.spec.ts
 *   # (running ALL specs in one invocation can trip the 10-min API ban; pace them.)
 *
 * What it creates (idempotent; clearly TEST-only):
 *   auth user  e2e-principal@finalwishes.app   (known pw, emailVerified)
 *   estates/estate_e2e                          (isTestEstate)
 *   estate_users/<uid>_estate_e2e               (role principal)
 *   users/<uid>                                 (role principal, primaryEstateId=estate_e2e,
 *                                                createdAt=NOW so IdentityGate MFA-grace holds,
 *                                                loginCount=0)
 *
 * The createdAt=NOW is what keeps the account in the principal MFA grace window
 * (IdentityGate keys grace on the Firestore profile createdAt < 24h), so the
 * authenticated login flow works without a TOTP enrollment. Re-run before a test
 * session to reset the grace window.
 */
const admin = require('firebase-admin');

const EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-principal@finalwishes.app';
const PASSWORD = process.env.E2E_PROV_PASSWORD;
const ESTATE_ID = 'estate_e2e';
const PROJECT = process.env.SEED_PROJECT || 'finalwishes-prod';

if (!PASSWORD) { console.error('Set E2E_PROV_PASSWORD'); process.exit(1); }

admin.initializeApp({ projectId: PROJECT });
const auth = admin.auth(), db = admin.firestore(), FV = admin.firestore.FieldValue;

(async () => {
  let user;
  try {
    user = await auth.getUserByEmail(EMAIL);
    await auth.updateUser(user.uid, { password: PASSWORD, emailVerified: true });
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    user = await auth.createUser({ email: EMAIL, password: PASSWORD, displayName: 'E2E Principal', emailVerified: true });
  }
  const uid = user.uid;

  await db.collection('estates').doc(ESTATE_ID).set({
    name: 'E2E Test Estate', principalId: uid, status: 'active',
    createdAt: FV.serverTimestamp(), updatedAt: FV.serverTimestamp(), isTestEstate: true,
  }, { merge: true });

  await db.collection('estate_users').doc(`${uid}_${ESTATE_ID}`).set({
    estateId: ESTATE_ID, userId: uid, role: 'principal', accessGranted: true,
    accessGrantedAt: FV.serverTimestamp(), createdAt: FV.serverTimestamp(), updatedAt: FV.serverTimestamp(), isTestGrant: true,
  }, { merge: true });

  await db.collection('users').doc(uid).set({
    email: EMAIL, displayName: 'E2E Principal', role: 'principal', emailVerified: true, mfaEnabled: false,
    loginCount: 0, createdAt: FV.serverTimestamp(), lastLoginAt: FV.serverTimestamp(),
    primaryEstateId: ESTATE_ID, primaryEstateName: 'E2E Test Estate',
    profile: { firstName: 'E2E', lastName: 'Principal' }, isTestAccount: true,
  }, { merge: true });

  console.log(`Provisioned ${EMAIL} (uid ${uid}) + ${ESTATE_ID} on ${PROJECT}`);
  process.exit(0);
})().catch(e => { console.error('Provision failed:', e.message); process.exit(1); });
