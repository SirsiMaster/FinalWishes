# How Your Information Is Protected

## Your Privacy Is Our Foundation

FinalWishes is built from the ground up to protect your most sensitive information — Social Security Numbers, dates of birth, financial account details, and legal documents. We use the same encryption technology trusted by banks, hospitals, and government agencies.

## What We Protect

| Information Type | Examples | How It's Protected |
|-----------------|----------|-------------------|
| **Identity** | Social Security Number, Date of Birth | Encrypted and stored in an isolated vault |
| **Financial** | Bank account numbers, routing numbers | Encrypted per-field, per-estate |
| **Vehicles** | VIN numbers | Encrypted in the secure vault |
| **Documents** | Wills, trusts, deeds, death certificates | Encrypted before upload |
| **Health Records** | Medical directives, HIPAA data | Isolated and encrypted |

## How It Works (In Plain English)

### 🔐 Your Data Is Locked With Its Own Key

Every piece of sensitive information gets its own unique encryption key — like having a separate lock for every drawer in a safe. Even if someone broke into one drawer (which our system prevents), they couldn't open any other drawer.

### 🏛️ Your Estate Has Its Own Vault

Your estate's data is kept completely separate from every other estate on the platform. It's not just a different folder — it's a different lock, a different key, and a different safe. One estate's key cannot unlock another estate's data. Period.

### 🔑 Keys Are Managed By Google

We don't hold your encryption keys — Google Cloud's Key Management Service does. These keys are stored in hardware security modules that even Google's own engineers cannot access. The keys automatically rotate every year.

### 👁️ Every Access Is Recorded

Every time your sensitive data is accessed — by you, by your executor, by anyone — it's logged with the exact time, the person's identity, and where they accessed it from. This audit trail cannot be edited or deleted.

## The Technical Details

For the technically curious, here's what's under the hood:

- **Encryption Standard:** AES-256-GCM (the same standard used by the U.S. government for classified information)
- **Key Exchange:** TLS 1.3 with ECDHE (Elliptic Curve Diffie-Hellman Ephemeral) — provides "perfect forward secrecy," meaning even if a key were compromised in the future, past communications remain secure
- **Key Management:** Google Cloud KMS with automatic annual rotation
- **Data Isolation:** Cloud SQL PostgreSQL in a physically separate database from your dashboard data
- **Compliance:** SOC 2 Type II ready, HIPAA eligible, GDPR compliant

## What This Means For You

1. **Your SSN is never stored in plain text** — not in our database, not in our logs, not anywhere
2. **Your executor can access what they need** — but only after proper authentication and only the data you've authorized
3. **You can see who accessed what** — every access to your sensitive data is logged and visible to you
4. **Even our engineers can't read your data** — the encryption keys are managed by Google Cloud, not by our team
5. **Your data follows you** — you can export or delete your information at any time

## Questions?

If you have questions about how your data is protected, contact us at **support@finalwishes.app**.
