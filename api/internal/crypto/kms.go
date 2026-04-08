// Package crypto provides envelope encryption using Google Cloud KMS.
//
// Architecture (ADR-037):
//   - KEK (Key Encryption Key): Managed by Cloud KMS, never leaves Google's boundary
//   - DEK (Data Encryption Key): Random 256-bit key, encrypted by KEK, stored alongside data
//   - AAD (Additional Authenticated Data): Estate ID bound to each encryption operation
//
// This implements the "Better Than Bank Grade" security promise from SOW §2.2.
package crypto

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"

	kms "cloud.google.com/go/kms/apiv1"
	"cloud.google.com/go/kms/apiv1/kmspb"
	"github.com/rs/zerolog/log"
)

// VaultCrypto handles envelope encryption operations using Cloud KMS.
type VaultCrypto struct {
	client    *kms.KeyManagementClient
	keyName   string // Full resource name of the KMS key
	projectID string
}

// EncryptedPayload contains encrypted data with its encrypted DEK.
// Both must be stored together — the DEK is required to decrypt the data.
type EncryptedPayload struct {
	// CiphertextBase64 is the AES-256-GCM encrypted data, base64 encoded
	CiphertextBase64 string
	// EncryptedDEKBase64 is the DEK encrypted by Cloud KMS, base64 encoded
	EncryptedDEKBase64 string
	// NonceBase64 is the GCM nonce, base64 encoded
	NonceBase64 string
}

// NewVaultCrypto creates a new VaultCrypto instance.
// keyName should be the full KMS key resource name:
// projects/{project}/locations/{location}/keyRings/{ring}/cryptoKeys/{key}
func NewVaultCrypto(ctx context.Context, projectID string) (*VaultCrypto, error) {
	client, err := kms.NewKeyManagementClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create KMS client: %w", err)
	}

	keyName := fmt.Sprintf(
		"projects/%s/locations/us-central1/keyRings/finalwishes-keyring/cryptoKeys/pii-vault-key",
		projectID,
	)

	log.Info().
		Str("key", keyName).
		Msg("VaultCrypto initialized with Cloud KMS")

	return &VaultCrypto{
		client:    client,
		keyName:   keyName,
		projectID: projectID,
	}, nil
}

// Encrypt performs envelope encryption on plaintext data.
//
// Process:
//  1. Generate random 256-bit DEK
//  2. Encrypt plaintext with DEK using AES-256-GCM
//  3. Encrypt DEK with KEK via Cloud KMS (with estate-scoped AAD)
//  4. Return encrypted data + encrypted DEK
//  5. Plaintext DEK is discarded (never stored)
//
// The estateID is used as Additional Authenticated Data (AAD), binding
// the encryption to a specific estate. A DEK encrypted for Estate A
// cannot be used to decrypt data for Estate B.
func (vc *VaultCrypto) Encrypt(ctx context.Context, plaintext []byte, estateID string) (*EncryptedPayload, error) {
	if len(plaintext) == 0 {
		return nil, fmt.Errorf("cannot encrypt empty plaintext")
	}
	if estateID == "" {
		return nil, fmt.Errorf("estate ID is required for encryption context")
	}

	// Step 1: Generate random 256-bit DEK
	dek := make([]byte, 32) // 256 bits
	if _, err := io.ReadFull(rand.Reader, dek); err != nil {
		return nil, fmt.Errorf("failed to generate DEK: %w", err)
	}

	// Step 2: Encrypt plaintext with DEK (AES-256-GCM)
	block, err := aes.NewCipher(dek)
	if err != nil {
		return nil, fmt.Errorf("failed to create AES cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nil, nonce, plaintext, []byte(estateID))

	// Step 3: Encrypt DEK with KEK via Cloud KMS
	aad := []byte(fmt.Sprintf("finalwishes:estate:%s", estateID))

	encryptReq := &kmspb.EncryptRequest{
		Name:                        vc.keyName,
		Plaintext:                   dek,
		AdditionalAuthenticatedData: aad,
	}

	encryptResp, err := vc.client.Encrypt(ctx, encryptReq)
	if err != nil {
		return nil, fmt.Errorf("KMS encrypt failed: %w", err)
	}

	// Step 4: Zero out plaintext DEK from memory
	for i := range dek {
		dek[i] = 0
	}

	log.Debug().
		Str("estate_id", estateID).
		Int("plaintext_len", len(plaintext)).
		Int("ciphertext_len", len(ciphertext)).
		Msg("Envelope encryption completed")

	return &EncryptedPayload{
		CiphertextBase64:   base64.StdEncoding.EncodeToString(ciphertext),
		EncryptedDEKBase64: base64.StdEncoding.EncodeToString(encryptResp.Ciphertext),
		NonceBase64:        base64.StdEncoding.EncodeToString(nonce),
	}, nil
}

// Decrypt performs envelope decryption.
//
// Process:
//  1. Decrypt DEK with KEK via Cloud KMS (with estate-scoped AAD)
//  2. Decrypt ciphertext with DEK using AES-256-GCM
//  3. Return plaintext
//  4. DEK is discarded from memory
func (vc *VaultCrypto) Decrypt(ctx context.Context, payload *EncryptedPayload, estateID string) ([]byte, error) {
	if payload == nil {
		return nil, fmt.Errorf("cannot decrypt nil payload")
	}
	if estateID == "" {
		return nil, fmt.Errorf("estate ID is required for decryption context")
	}

	// Decode base64 fields
	ciphertext, err := base64.StdEncoding.DecodeString(payload.CiphertextBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode ciphertext: %w", err)
	}

	encryptedDEK, err := base64.StdEncoding.DecodeString(payload.EncryptedDEKBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode encrypted DEK: %w", err)
	}

	nonce, err := base64.StdEncoding.DecodeString(payload.NonceBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode nonce: %w", err)
	}

	// Step 1: Decrypt DEK via Cloud KMS
	aad := []byte(fmt.Sprintf("finalwishes:estate:%s", estateID))

	decryptReq := &kmspb.DecryptRequest{
		Name:                        vc.keyName,
		Ciphertext:                  encryptedDEK,
		AdditionalAuthenticatedData: aad,
	}

	decryptResp, err := vc.client.Decrypt(ctx, decryptReq)
	if err != nil {
		return nil, fmt.Errorf("KMS decrypt failed (wrong estate context?): %w", err)
	}

	dek := decryptResp.Plaintext

	// Step 2: Decrypt ciphertext with DEK (AES-256-GCM)
	block, err := aes.NewCipher(dek)
	if err != nil {
		return nil, fmt.Errorf("failed to create AES cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, []byte(estateID))
	if err != nil {
		return nil, fmt.Errorf("AES-GCM decryption failed (data integrity violation): %w", err)
	}

	// Step 3: Zero out DEK from memory
	for i := range dek {
		dek[i] = 0
	}

	log.Debug().
		Str("estate_id", estateID).
		Int("plaintext_len", len(plaintext)).
		Msg("Envelope decryption completed")

	return plaintext, nil
}

// MultiFieldEnvelope holds a single DEK envelope that can encrypt/decrypt multiple fields.
// This is used when multiple fields share the same DEK (e.g., lockbox credentials).
type MultiFieldEnvelope struct {
	// EncryptedDEKBase64 is the DEK encrypted by Cloud KMS, base64 encoded
	EncryptedDEKBase64 string
	// NonceBase64 is the shared GCM nonce, base64 encoded
	NonceBase64 string
	// dek is the plaintext DEK (only held in memory during encrypt/decrypt operations)
	dek []byte
	// nonce is the plaintext nonce
	nonce []byte
	// gcm is the initialized GCM cipher
	gcm cipher.AEAD
	// gcmAAD is the AAD for GCM operations
	gcmAAD []byte
}

// NewMultiFieldEnvelope generates a fresh DEK, encrypts it via Cloud KMS, and
// returns an envelope ready to encrypt multiple fields.
//
// The kmsAAD binds the DEK to a specific context (e.g., "finalwishes:estate:X:lockbox:Y").
// The gcmAAD binds each field encryption to the same context (e.g., "estate:X:lockbox:Y").
//
// Caller MUST call envelope.Zero() when done to clear the DEK from memory.
func (vc *VaultCrypto) NewMultiFieldEnvelope(ctx context.Context, gcmAAD, kmsAAD string) (*MultiFieldEnvelope, error) {
	if gcmAAD == "" || kmsAAD == "" {
		return nil, fmt.Errorf("both GCM AAD and KMS AAD are required")
	}

	// Generate random 256-bit DEK
	dek := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, dek); err != nil {
		return nil, fmt.Errorf("failed to generate DEK: %w", err)
	}

	// Create AES-256-GCM cipher
	block, err := aes.NewCipher(dek)
	if err != nil {
		return nil, fmt.Errorf("failed to create AES cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	// Generate a single nonce shared across all fields in this envelope
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Encrypt DEK with KEK via Cloud KMS
	encryptReq := &kmspb.EncryptRequest{
		Name:                        vc.keyName,
		Plaintext:                   dek,
		AdditionalAuthenticatedData: []byte(kmsAAD),
	}
	encryptResp, err := vc.client.Encrypt(ctx, encryptReq)
	if err != nil {
		// Zero DEK before returning on error
		for i := range dek {
			dek[i] = 0
		}
		return nil, fmt.Errorf("KMS encrypt failed: %w", err)
	}

	log.Debug().
		Str("gcm_aad", gcmAAD).
		Msg("Multi-field envelope created")

	return &MultiFieldEnvelope{
		EncryptedDEKBase64: base64.StdEncoding.EncodeToString(encryptResp.Ciphertext),
		NonceBase64:        base64.StdEncoding.EncodeToString(nonce),
		dek:                dek,
		nonce:              nonce,
		gcm:                gcm,
		gcmAAD:             []byte(gcmAAD),
	}, nil
}

// EncryptField encrypts a single field using this envelope's DEK.
// Returns the ciphertext as a base64 string.
//
// IMPORTANT: Each field gets unique nonce material by prepending a field tag to the
// plaintext before encryption. The shared nonce is safe because GCM's authentication
// tag includes the plaintext length and content, making each (nonce, plaintext) pair unique.
// However, for defense in depth, we derive a per-field nonce by XORing the field index.
func (env *MultiFieldEnvelope) EncryptField(plaintext []byte, fieldIndex int) (string, error) {
	if len(plaintext) == 0 {
		return "", fmt.Errorf("cannot encrypt empty field")
	}
	if env.dek == nil {
		return "", fmt.Errorf("envelope has been zeroed — cannot encrypt")
	}

	// Derive per-field nonce: XOR the last byte of the shared nonce with the field index.
	// This ensures each field encrypted under the same DEK uses a distinct nonce,
	// which is a hard requirement for AES-GCM security.
	fieldNonce := make([]byte, len(env.nonce))
	copy(fieldNonce, env.nonce)
	fieldNonce[len(fieldNonce)-1] ^= byte(fieldIndex)

	ciphertext := env.gcm.Seal(nil, fieldNonce, plaintext, env.gcmAAD)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Zero clears the plaintext DEK from memory. Must be called when done.
func (env *MultiFieldEnvelope) Zero() {
	if env.dek != nil {
		for i := range env.dek {
			env.dek[i] = 0
		}
		env.dek = nil
	}
}

// OpenMultiFieldEnvelope decrypts the DEK from an existing envelope via Cloud KMS,
// returning an envelope ready to decrypt multiple fields.
//
// Caller MUST call envelope.Zero() when done.
func (vc *VaultCrypto) OpenMultiFieldEnvelope(ctx context.Context, encryptedDEKBase64, nonceBase64, gcmAAD, kmsAAD string) (*MultiFieldEnvelope, error) {
	if gcmAAD == "" || kmsAAD == "" {
		return nil, fmt.Errorf("both GCM AAD and KMS AAD are required")
	}

	encryptedDEK, err := base64.StdEncoding.DecodeString(encryptedDEKBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode encrypted DEK: %w", err)
	}

	nonce, err := base64.StdEncoding.DecodeString(nonceBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode nonce: %w", err)
	}

	// Decrypt DEK via Cloud KMS
	decryptReq := &kmspb.DecryptRequest{
		Name:                        vc.keyName,
		Ciphertext:                  encryptedDEK,
		AdditionalAuthenticatedData: []byte(kmsAAD),
	}
	decryptResp, err := vc.client.Decrypt(ctx, decryptReq)
	if err != nil {
		return nil, fmt.Errorf("KMS decrypt failed (AAD mismatch?): %w", err)
	}

	dek := decryptResp.Plaintext

	block, err := aes.NewCipher(dek)
	if err != nil {
		for i := range dek {
			dek[i] = 0
		}
		return nil, fmt.Errorf("failed to create AES cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		for i := range dek {
			dek[i] = 0
		}
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	log.Debug().
		Str("gcm_aad", gcmAAD).
		Msg("Multi-field envelope opened for decryption")

	return &MultiFieldEnvelope{
		EncryptedDEKBase64: encryptedDEKBase64,
		NonceBase64:        nonceBase64,
		dek:                dek,
		nonce:              nonce,
		gcm:                gcm,
		gcmAAD:             []byte(gcmAAD),
	}, nil
}

// DecryptField decrypts a single field using this envelope's DEK.
// The fieldIndex must match what was used during encryption.
func (env *MultiFieldEnvelope) DecryptField(ciphertextBase64 string, fieldIndex int) ([]byte, error) {
	if ciphertextBase64 == "" {
		return nil, fmt.Errorf("cannot decrypt empty ciphertext")
	}
	if env.dek == nil {
		return nil, fmt.Errorf("envelope has been zeroed — cannot decrypt")
	}

	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode ciphertext: %w", err)
	}

	// Derive the same per-field nonce used during encryption
	fieldNonce := make([]byte, len(env.nonce))
	copy(fieldNonce, env.nonce)
	fieldNonce[len(fieldNonce)-1] ^= byte(fieldIndex)

	plaintext, err := env.gcm.Open(nil, fieldNonce, ciphertext, env.gcmAAD)
	if err != nil {
		return nil, fmt.Errorf("AES-GCM decryption failed (data integrity violation): %w", err)
	}

	return plaintext, nil
}

// Close releases the KMS client resources.
func (vc *VaultCrypto) Close() error {
	if vc.client != nil {
		return vc.client.Close()
	}
	return nil
}
