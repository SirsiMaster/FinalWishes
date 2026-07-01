/**
 * Create Test Accounts for FinalWishes (finalwishes-prod).
 * Run with: node scripts/create-test-accounts.js
 *
 * SECURITY (Credential & Secret Safety Law, 2026-06-30): NO credentials are
 * committed. Each newly-created account gets a strong random password generated
 * at runtime and printed ONCE to the operator's console — capture it into a
 * password manager / Secret Manager. It is never written to disk or committed.
 * Existing accounts are left untouched (delete + re-run to rotate).
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp({
  projectId: "finalwishes-prod",
});

const auth = admin.auth();
const db = admin.firestore();

// Strong random password: 24 url-safe chars + a guaranteed upper/digit/symbol
// so it always satisfies Firebase Auth complexity requirements.
function generatePassword() {
  return (
    crypto.randomBytes(18).toString("base64").replace(/[+/=]/g, "") + "A1!"
  );
}

const testAccounts = [
  {
    email: "admin@finalwishes.app",
    displayName: "Legacy Admin",
    role: "admin",
    subscription: { plan: "whiteglove", status: "active" },
  },
  {
    email: "principal@finalwishes.app",
    displayName: "John Principal",
    role: "principal",
    subscription: { plan: "concierge", status: "active" },
  },
  {
    email: "executor@finalwishes.app",
    displayName: "Sarah Executor",
    role: "executor",
    subscription: { plan: "concierge", status: "active" },
  },
  {
    email: "heir@finalwishes.app",
    displayName: "Michael Heir",
    role: "heir",
    subscription: { plan: "free", status: "active" },
  },
];

async function createAccounts() {
  console.log("Creating test accounts...\n");
  const generated = [];

  for (const account of testAccounts) {
    try {
      let user;
      try {
        user = await auth.getUserByEmail(account.email);
        console.log("Exists (password unchanged):", account.email);
      } catch (e) {
        if (e.code === "auth/user-not-found") {
          const password = generatePassword();
          user = await auth.createUser({
            email: account.email,
            password,
            displayName: account.displayName,
            emailVerified: true,
          });
          generated.push({ email: account.email, password });
          console.log("Created:", account.email);
        } else throw e;
      }

      await db
        .collection("users")
        .doc(user.uid)
        .set(
          {
            email: account.email,
            displayName: account.displayName,
            role: account.role,
            subscription: {
              ...account.subscription,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            mfaEnabled: false,
            emailVerified: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
            profile: {
              firstName: account.displayName.split(" ")[0],
              lastName: account.displayName.split(" ")[1] || "",
            },
            isTestAccount: true,
          },
          { merge: true },
        );
    } catch (error) {
      console.error("Error:", account.email, error.message);
    }
  }

  if (generated.length) {
    console.log(
      "\n=== GENERATED PASSWORDS — shown ONCE. Store in a password manager / Secret Manager. NEVER commit. ===",
    );
    for (const g of generated) console.log(`  ${g.email}\t${g.password}`);
    console.log(
      "===============================================================================================\n",
    );
  }

  console.log("Done!\n");
  process.exit(0);
}

createAccounts();
