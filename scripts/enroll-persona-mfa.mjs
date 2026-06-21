// Enroll TOTP MFA for the 5 fiduciary persona-QA accounts so IdentityGate (which
// gates fiduciaries on getMFAStatus().enrolled) lets them through to RoleGuard.
// Real client-SDK enrollment (admin SDK can't seed TOTP factors). Idempotent-ish:
// skips an account that already has a factor (a re-enroll mints a NEW secret).
// Writes base32 secrets to scripts/.persona-mfa-secrets.json (GITIGNORED).
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, multiFactor, TotpMultiFactorGenerator } from 'firebase/auth';
import { authenticator } from 'otplib';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const firebaseConfig = { apiKey: 'AIzaSyBTJSKV2jDAriiu4zbgw-Zmvz3J5rgZpLA', authDomain: 'finalwishes-prod.firebaseapp.com', projectId: 'finalwishes-prod' };
const FIDUCIARIES = ['heir', 'executor', 'trustee', 'legal', 'cpa'];
const SECRETS_FILE = 'scripts/.persona-mfa-secrets.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const secrets = existsSync(SECRETS_FILE) ? JSON.parse(readFileSync(SECRETS_FILE, 'utf8')) : {};

for (const key of FIDUCIARIES) {
  const email = `persona-${key}@finalwishes.app`;
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, `PersonaQA2026!${key}`);
    if (multiFactor(user).enrolledFactors.length > 0) {
      console.log(`  ${key.padEnd(9)} already enrolled — ${secrets[key] ? 'secret on file' : 'NO stored secret (unenroll+rerun to capture)'}`);
      continue;
    }
    const session = await multiFactor(user).getSession();
    const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
    const secretKey = totpSecret.secretKey;
    const code = authenticator.generate(secretKey);
    const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, code);
    await multiFactor(user).enroll(assertion, 'QA TOTP');
    secrets[key] = secretKey;
    console.log(`  ${key.padEnd(9)} enrolled ✓`);
  } catch (e) {
    console.log(`  ${key.padEnd(9)} FAILED: ${e.code || e.message}`);
  }
}
writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2));
console.log(`\nSecrets → ${SECRETS_FILE} (gitignored). Enrolled keys: ${Object.keys(secrets).join(', ')}`);
process.exit(0);
