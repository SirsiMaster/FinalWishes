# KMS-Encrypted Lockbox

> Envelope encryption for sensitive credentials stored in Firestore.

## Architecture

Lockbox items live at `estates/{estateId}/lockbox/{itemId}`. Sensitive fields (password, pin, notes) are encrypted using the shared `crypto.VaultCrypto` module with Cloud KMS envelope encryption (ADR-037).

**Encryption flow:**
1. Generate random 256-bit DEK
2. Encrypt field data with AES-256-GCM using DEK
3. Encrypt DEK with Cloud KMS KEK
4. Store encrypted data + encrypted DEK + nonce in Firestore

**Per-field nonce derivation:** Each field has a stable index (password=0, pin=1, notes=2). Changing these indices breaks decryption of existing data.

**Per-estate AAD binding:** Additional Authenticated Data ties each encryption to the estate ID + item ID, preventing cross-estate decryption attacks.

## API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/lockbox/store-credentials` | POST | Encrypt and store credentials |
| `/api/v1/lockbox/retrieve-credentials` | POST | Decrypt and return credentials |

## Dependencies

- `internal/crypto` — VaultCrypto (Cloud KMS envelope encryption)
- `internal/auth` — Firebase Auth middleware

## Known Limitations

- Field indices are immutable — adding new fields requires appending to the index list, never reordering
- No key rotation mechanism yet for DEKs
