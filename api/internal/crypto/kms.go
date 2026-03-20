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
	client     *kms.KeyManagementClient
	keyName    string // Full resource name of the KMS key
	projectID  string
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

// Close releases the KMS client resources.
func (vc *VaultCrypto) Close() error {
	if vc.client != nil {
		return vc.client.Close()
	}
	return nil
}
