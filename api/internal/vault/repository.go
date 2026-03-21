// Package vault provides the Cloud SQL PII Vault repository.
//
// This is the ONLY code path that touches sensitive PII data.
// All operations require:
//   - Authenticated Firebase user (via auth middleware)
//   - Estate-scoped access verification
//   - Envelope encryption via Cloud KMS
//   - Audit logging
//
// Architecture: ADR-037 (Cloud SQL PII Vault)
package vault

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq" // PostgreSQL driver
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/crypto"
)

// Repository handles all PII vault database operations.
type Repository struct {
	db     *sql.DB
	crypto *crypto.VaultCrypto
}

// Config holds Cloud SQL connection parameters.
type Config struct {
	// ConnectionName is the Cloud SQL instance connection name
	// Format: project:region:instance
	ConnectionName string
	// DatabaseName is the database name (e.g., "pii_vault")
	DatabaseName string
	// User is the database user
	User string
	// Password is the database password
	Password string
	// Host is the database host (for direct TCP connections)
	Host string
	// Port is the database port (default: 5432)
	Port string
}

// UserPII represents the decrypted user PII fields.
type UserPII struct {
	ID          string
	FirebaseUID string
	EstateID    string
	SSN         string // Plaintext SSN (only in memory, never logged)
	DateOfBirth string // ISO date format
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// AssetPII represents the decrypted asset PII fields.
type AssetPII struct {
	ID            string
	AssetID       string
	EstateID      string
	AccountNumber string // Plaintext account number
	RoutingNumber string // Plaintext routing number
	VIN           string // Plaintext VIN
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// HeirPII represents the decrypted heir PII fields.
type HeirPII struct {
	ID          string
	HeirID      string
	EstateID    string
	SSN         string // Plaintext SSN
	DateOfBirth string // ISO date format
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// NewRepository creates a new PII Vault repository with a connection pool.
func NewRepository(ctx context.Context, cfg Config, vc *crypto.VaultCrypto) (*Repository, error) {
	var dsn string

	if cfg.Host != "" {
		// Direct TCP connection (local dev or Cloud SQL Proxy)
		port := cfg.Port
		if port == "" {
			port = "5432"
		}
		dsn = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=require",
			cfg.Host, port, cfg.User, cfg.Password, cfg.DatabaseName,
		)
	} else {
		// Cloud SQL socket connection (Cloud Run)
		dsn = fmt.Sprintf(
			"host=/cloudsql/%s user=%s password=%s dbname=%s",
			cfg.ConnectionName, cfg.User, cfg.Password, cfg.DatabaseName,
		)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool for Cloud Run
	db.SetMaxOpenConns(5) // Cloud Run scales horizontally, keep per-instance low
	db.SetMaxIdleConns(2) // Minimum idle connections
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetConnMaxIdleTime(10 * time.Minute)

	// Verify connection
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Info().
		Str("database", cfg.DatabaseName).
		Msg("PII Vault database connection established")

	return &Repository{
		db:     db,
		crypto: vc,
	}, nil
}

// RunMigrations creates the PII vault tables if they don't exist.
func (r *Repository) RunMigrations(ctx context.Context) error {
	migrations := []string{
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

		`CREATE TABLE IF NOT EXISTS user_pii (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			firebase_uid VARCHAR(128) NOT NULL,
			estate_id VARCHAR(128) NOT NULL,
			ssn_encrypted TEXT,
			ssn_dek TEXT,
			ssn_nonce TEXT,
			dob_encrypted TEXT,
			dob_dek TEXT,
			dob_nonce TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW(),
			accessed_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(firebase_uid, estate_id)
		)`,

		`CREATE TABLE IF NOT EXISTS asset_pii (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			asset_id VARCHAR(128) NOT NULL,
			estate_id VARCHAR(128) NOT NULL,
			account_number_encrypted TEXT,
			account_number_dek TEXT,
			account_number_nonce TEXT,
			routing_number_encrypted TEXT,
			routing_number_dek TEXT,
			routing_number_nonce TEXT,
			vin_encrypted TEXT,
			vin_dek TEXT,
			vin_nonce TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW(),
			accessed_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(asset_id, estate_id)
		)`,

		`CREATE TABLE IF NOT EXISTS heir_pii (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			heir_id VARCHAR(128) NOT NULL,
			estate_id VARCHAR(128) NOT NULL,
			ssn_encrypted TEXT,
			ssn_dek TEXT,
			ssn_nonce TEXT,
			dob_encrypted TEXT,
			dob_dek TEXT,
			dob_nonce TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW(),
			accessed_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(heir_id, estate_id)
		)`,

		`CREATE TABLE IF NOT EXISTS vault_audit_log (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			user_id VARCHAR(128) NOT NULL,
			estate_id VARCHAR(128) NOT NULL,
			action VARCHAR(32) NOT NULL,
			resource_type VARCHAR(32) NOT NULL,
			resource_id VARCHAR(128),
			ip_address VARCHAR(45),
			user_agent TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,

		// Indexes
		`CREATE INDEX IF NOT EXISTS idx_user_pii_firebase ON user_pii(firebase_uid)`,
		`CREATE INDEX IF NOT EXISTS idx_user_pii_estate ON user_pii(estate_id)`,
		`CREATE INDEX IF NOT EXISTS idx_asset_pii_asset ON asset_pii(asset_id)`,
		`CREATE INDEX IF NOT EXISTS idx_asset_pii_estate ON asset_pii(estate_id)`,
		`CREATE INDEX IF NOT EXISTS idx_heir_pii_heir ON heir_pii(heir_id)`,
		`CREATE INDEX IF NOT EXISTS idx_heir_pii_estate ON heir_pii(estate_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_estate ON vault_audit_log(estate_id, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_user ON vault_audit_log(user_id, created_at DESC)`,
	}

	for _, m := range migrations {
		if _, err := r.db.ExecContext(ctx, m); err != nil {
			return fmt.Errorf("migration failed: %w\nSQL: %s", err, m)
		}
	}

	log.Info().Msg("PII Vault migrations completed successfully")
	return nil
}

// --- User PII Operations ---

// StoreUserPII encrypts and stores user PII data.
func (r *Repository) StoreUserPII(ctx context.Context, pii *UserPII) (string, error) {
	// Encrypt SSN
	var ssnPayload *crypto.EncryptedPayload
	if pii.SSN != "" {
		var err error
		ssnPayload, err = r.crypto.Encrypt(ctx, []byte(pii.SSN), pii.EstateID)
		if err != nil {
			return "", fmt.Errorf("failed to encrypt SSN: %w", err)
		}
	}

	// Encrypt DOB
	var dobPayload *crypto.EncryptedPayload
	if pii.DateOfBirth != "" {
		var err error
		dobPayload, err = r.crypto.Encrypt(ctx, []byte(pii.DateOfBirth), pii.EstateID)
		if err != nil {
			return "", fmt.Errorf("failed to encrypt DOB: %w", err)
		}
	}

	var id string
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO user_pii (firebase_uid, estate_id, ssn_encrypted, ssn_dek, ssn_nonce, dob_encrypted, dob_dek, dob_nonce)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (firebase_uid, estate_id) DO UPDATE SET
			ssn_encrypted = COALESCE(EXCLUDED.ssn_encrypted, user_pii.ssn_encrypted),
			ssn_dek = COALESCE(EXCLUDED.ssn_dek, user_pii.ssn_dek),
			ssn_nonce = COALESCE(EXCLUDED.ssn_nonce, user_pii.ssn_nonce),
			dob_encrypted = COALESCE(EXCLUDED.dob_encrypted, user_pii.dob_encrypted),
			dob_dek = COALESCE(EXCLUDED.dob_dek, user_pii.dob_dek),
			dob_nonce = COALESCE(EXCLUDED.dob_nonce, user_pii.dob_nonce),
			updated_at = NOW()
		RETURNING id
	`,
		pii.FirebaseUID, pii.EstateID,
		nullableString(ssnPayload, "ciphertext"), nullableString(ssnPayload, "dek"), nullableString(ssnPayload, "nonce"),
		nullableString(dobPayload, "ciphertext"), nullableString(dobPayload, "dek"), nullableString(dobPayload, "nonce"),
	).Scan(&id)

	if err != nil {
		return "", fmt.Errorf("failed to store user PII: %w", err)
	}

	log.Info().
		Str("estate_id", pii.EstateID).
		Str("pii_id", id).
		Msg("User PII stored (encrypted)")

	return id, nil
}

// RetrieveUserPII decrypts and returns user PII data.
func (r *Repository) RetrieveUserPII(ctx context.Context, firebaseUID, estateID string) (*UserPII, error) {
	var (
		id                       string
		ssnEnc, ssnDek, ssnNonce sql.NullString
		dobEnc, dobDek, dobNonce sql.NullString
		createdAt, updatedAt     time.Time
	)

	err := r.db.QueryRowContext(ctx, `
		UPDATE user_pii SET accessed_at = NOW()
		WHERE firebase_uid = $1 AND estate_id = $2
		RETURNING id, ssn_encrypted, ssn_dek, ssn_nonce, dob_encrypted, dob_dek, dob_nonce, created_at, updated_at
	`, firebaseUID, estateID).Scan(
		&id, &ssnEnc, &ssnDek, &ssnNonce, &dobEnc, &dobDek, &dobNonce, &createdAt, &updatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil // Not found is not an error
	}
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve user PII: %w", err)
	}

	result := &UserPII{
		ID:          id,
		FirebaseUID: firebaseUID,
		EstateID:    estateID,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
	}

	// Decrypt SSN
	if ssnEnc.Valid && ssnDek.Valid && ssnNonce.Valid {
		payload := &crypto.EncryptedPayload{
			CiphertextBase64:   ssnEnc.String,
			EncryptedDEKBase64: ssnDek.String,
			NonceBase64:        ssnNonce.String,
		}
		plaintext, err := r.crypto.Decrypt(ctx, payload, estateID)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt SSN: %w", err)
		}
		result.SSN = string(plaintext)
	}

	// Decrypt DOB
	if dobEnc.Valid && dobDek.Valid && dobNonce.Valid {
		payload := &crypto.EncryptedPayload{
			CiphertextBase64:   dobEnc.String,
			EncryptedDEKBase64: dobDek.String,
			NonceBase64:        dobNonce.String,
		}
		plaintext, err := r.crypto.Decrypt(ctx, payload, estateID)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt DOB: %w", err)
		}
		result.DateOfBirth = string(plaintext)
	}

	return result, nil
}

// --- Asset PII Operations ---

// StoreAssetPII encrypts and stores asset PII data.
func (r *Repository) StoreAssetPII(ctx context.Context, pii *AssetPII) (string, error) {
	// Encrypt account number
	var acctPayload *crypto.EncryptedPayload
	if pii.AccountNumber != "" {
		var err error
		acctPayload, err = r.crypto.Encrypt(ctx, []byte(pii.AccountNumber), pii.EstateID)
		if err != nil {
			return "", fmt.Errorf("failed to encrypt account number: %w", err)
		}
	}

	// Encrypt routing number
	var routingPayload *crypto.EncryptedPayload
	if pii.RoutingNumber != "" {
		var err error
		routingPayload, err = r.crypto.Encrypt(ctx, []byte(pii.RoutingNumber), pii.EstateID)
		if err != nil {
			return "", fmt.Errorf("failed to encrypt routing number: %w", err)
		}
	}

	// Encrypt VIN
	var vinPayload *crypto.EncryptedPayload
	if pii.VIN != "" {
		var err error
		vinPayload, err = r.crypto.Encrypt(ctx, []byte(pii.VIN), pii.EstateID)
		if err != nil {
			return "", fmt.Errorf("failed to encrypt VIN: %w", err)
		}
	}

	var id string
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO asset_pii (asset_id, estate_id,
			account_number_encrypted, account_number_dek, account_number_nonce,
			routing_number_encrypted, routing_number_dek, routing_number_nonce,
			vin_encrypted, vin_dek, vin_nonce)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		ON CONFLICT (asset_id, estate_id) DO UPDATE SET
			account_number_encrypted = COALESCE(EXCLUDED.account_number_encrypted, asset_pii.account_number_encrypted),
			account_number_dek = COALESCE(EXCLUDED.account_number_dek, asset_pii.account_number_dek),
			account_number_nonce = COALESCE(EXCLUDED.account_number_nonce, asset_pii.account_number_nonce),
			routing_number_encrypted = COALESCE(EXCLUDED.routing_number_encrypted, asset_pii.routing_number_encrypted),
			routing_number_dek = COALESCE(EXCLUDED.routing_number_dek, asset_pii.routing_number_dek),
			routing_number_nonce = COALESCE(EXCLUDED.routing_number_nonce, asset_pii.routing_number_nonce),
			vin_encrypted = COALESCE(EXCLUDED.vin_encrypted, asset_pii.vin_encrypted),
			vin_dek = COALESCE(EXCLUDED.vin_dek, asset_pii.vin_dek),
			vin_nonce = COALESCE(EXCLUDED.vin_nonce, asset_pii.vin_nonce),
			updated_at = NOW()
		RETURNING id
	`,
		pii.AssetID, pii.EstateID,
		nullableString(acctPayload, "ciphertext"), nullableString(acctPayload, "dek"), nullableString(acctPayload, "nonce"),
		nullableString(routingPayload, "ciphertext"), nullableString(routingPayload, "dek"), nullableString(routingPayload, "nonce"),
		nullableString(vinPayload, "ciphertext"), nullableString(vinPayload, "dek"), nullableString(vinPayload, "nonce"),
	).Scan(&id)

	if err != nil {
		return "", fmt.Errorf("failed to store asset PII: %w", err)
	}

	log.Info().
		Str("estate_id", pii.EstateID).
		Str("asset_id", pii.AssetID).
		Msg("Asset PII stored (encrypted)")

	return id, nil
}

// RetrieveAssetPII decrypts and returns asset PII data.
func (r *Repository) RetrieveAssetPII(ctx context.Context, assetID, estateID string) (*AssetPII, error) {
	var (
		id                                   string
		acctEnc, acctDek, acctNonce          sql.NullString
		routingEnc, routingDek, routingNonce sql.NullString
		vinEnc, vinDek, vinNonce             sql.NullString
		createdAt, updatedAt                 time.Time
	)

	err := r.db.QueryRowContext(ctx, `
		UPDATE asset_pii SET accessed_at = NOW()
		WHERE asset_id = $1 AND estate_id = $2
		RETURNING id,
			account_number_encrypted, account_number_dek, account_number_nonce,
			routing_number_encrypted, routing_number_dek, routing_number_nonce,
			vin_encrypted, vin_dek, vin_nonce,
			created_at, updated_at
	`, assetID, estateID).Scan(
		&id,
		&acctEnc, &acctDek, &acctNonce,
		&routingEnc, &routingDek, &routingNonce,
		&vinEnc, &vinDek, &vinNonce,
		&createdAt, &updatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve asset PII: %w", err)
	}

	result := &AssetPII{
		ID:        id,
		AssetID:   assetID,
		EstateID:  estateID,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}

	// Decrypt fields
	if acctEnc.Valid && acctDek.Valid && acctNonce.Valid {
		p := &crypto.EncryptedPayload{CiphertextBase64: acctEnc.String, EncryptedDEKBase64: acctDek.String, NonceBase64: acctNonce.String}
		plaintext, err := r.crypto.Decrypt(ctx, p, estateID)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt account number: %w", err)
		}
		result.AccountNumber = string(plaintext)
	}

	if routingEnc.Valid && routingDek.Valid && routingNonce.Valid {
		p := &crypto.EncryptedPayload{CiphertextBase64: routingEnc.String, EncryptedDEKBase64: routingDek.String, NonceBase64: routingNonce.String}
		plaintext, err := r.crypto.Decrypt(ctx, p, estateID)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt routing number: %w", err)
		}
		result.RoutingNumber = string(plaintext)
	}

	if vinEnc.Valid && vinDek.Valid && vinNonce.Valid {
		p := &crypto.EncryptedPayload{CiphertextBase64: vinEnc.String, EncryptedDEKBase64: vinDek.String, NonceBase64: vinNonce.String}
		plaintext, err := r.crypto.Decrypt(ctx, p, estateID)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt VIN: %w", err)
		}
		result.VIN = string(plaintext)
	}

	return result, nil
}

// --- Heir PII Operations ---

// StoreHeirPII encrypts and stores heir PII data.
func (r *Repository) StoreHeirPII(ctx context.Context, pii *HeirPII) (string, error) {
	var ssnPayload *crypto.EncryptedPayload
	if pii.SSN != "" {
		var err error
		ssnPayload, err = r.crypto.Encrypt(ctx, []byte(pii.SSN), pii.EstateID)
		if err != nil {
			return "", fmt.Errorf("failed to encrypt heir SSN: %w", err)
		}
	}

	var dobPayload *crypto.EncryptedPayload
	if pii.DateOfBirth != "" {
		var err error
		dobPayload, err = r.crypto.Encrypt(ctx, []byte(pii.DateOfBirth), pii.EstateID)
		if err != nil {
			return "", fmt.Errorf("failed to encrypt heir DOB: %w", err)
		}
	}

	var id string
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO heir_pii (heir_id, estate_id, ssn_encrypted, ssn_dek, ssn_nonce, dob_encrypted, dob_dek, dob_nonce)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (heir_id, estate_id) DO UPDATE SET
			ssn_encrypted = COALESCE(EXCLUDED.ssn_encrypted, heir_pii.ssn_encrypted),
			ssn_dek = COALESCE(EXCLUDED.ssn_dek, heir_pii.ssn_dek),
			ssn_nonce = COALESCE(EXCLUDED.ssn_nonce, heir_pii.ssn_nonce),
			dob_encrypted = COALESCE(EXCLUDED.dob_encrypted, heir_pii.dob_encrypted),
			dob_dek = COALESCE(EXCLUDED.dob_dek, heir_pii.dob_dek),
			dob_nonce = COALESCE(EXCLUDED.dob_nonce, heir_pii.dob_nonce),
			updated_at = NOW()
		RETURNING id
	`,
		pii.HeirID, pii.EstateID,
		nullableString(ssnPayload, "ciphertext"), nullableString(ssnPayload, "dek"), nullableString(ssnPayload, "nonce"),
		nullableString(dobPayload, "ciphertext"), nullableString(dobPayload, "dek"), nullableString(dobPayload, "nonce"),
	).Scan(&id)

	if err != nil {
		return "", fmt.Errorf("failed to store heir PII: %w", err)
	}

	log.Info().
		Str("estate_id", pii.EstateID).
		Str("heir_id", pii.HeirID).
		Msg("Heir PII stored (encrypted)")

	return id, nil
}

// RetrieveHeirPII decrypts and returns heir PII data.
func (r *Repository) RetrieveHeirPII(ctx context.Context, heirID, estateID string) (*HeirPII, error) {
	var (
		id                       string
		ssnEnc, ssnDek, ssnNonce sql.NullString
		dobEnc, dobDek, dobNonce sql.NullString
		createdAt, updatedAt     time.Time
	)

	err := r.db.QueryRowContext(ctx, `
		UPDATE heir_pii SET accessed_at = NOW()
		WHERE heir_id = $1 AND estate_id = $2
		RETURNING id, ssn_encrypted, ssn_dek, ssn_nonce, dob_encrypted, dob_dek, dob_nonce, created_at, updated_at
	`, heirID, estateID).Scan(
		&id, &ssnEnc, &ssnDek, &ssnNonce, &dobEnc, &dobDek, &dobNonce, &createdAt, &updatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve heir PII: %w", err)
	}

	result := &HeirPII{
		ID:        id,
		HeirID:    heirID,
		EstateID:  estateID,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}

	if ssnEnc.Valid && ssnDek.Valid && ssnNonce.Valid {
		payload := &crypto.EncryptedPayload{CiphertextBase64: ssnEnc.String, EncryptedDEKBase64: ssnDek.String, NonceBase64: ssnNonce.String}
		plaintext, err := r.crypto.Decrypt(ctx, payload, estateID)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt heir SSN: %w", err)
		}
		result.SSN = string(plaintext)
	}

	if dobEnc.Valid && dobDek.Valid && dobNonce.Valid {
		payload := &crypto.EncryptedPayload{CiphertextBase64: dobEnc.String, EncryptedDEKBase64: dobDek.String, NonceBase64: dobNonce.String}
		plaintext, err := r.crypto.Decrypt(ctx, payload, estateID)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt heir DOB: %w", err)
		}
		result.DateOfBirth = string(plaintext)
	}

	return result, nil
}

// --- Audit Operations ---

// LogAccess records a PII access event in the vault audit log.
func (r *Repository) LogAccess(ctx context.Context, userID, estateID, action, resourceType, resourceID, ipAddress, userAgent string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO vault_audit_log (user_id, estate_id, action, resource_type, resource_id, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, userID, estateID, action, resourceType, resourceID, ipAddress, userAgent)
	if err != nil {
		log.Error().Err(err).
			Str("user_id", userID).
			Str("estate_id", estateID).
			Str("action", action).
			Msg("Failed to write vault audit log")
		return fmt.Errorf("failed to log access: %w", err)
	}
	return nil
}

// Close releases the database connection.
func (r *Repository) Close() error {
	if r.db != nil {
		return r.db.Close()
	}
	return nil
}

// --- Helpers ---

// nullableString safely extracts a field from an EncryptedPayload.
func nullableString(p *crypto.EncryptedPayload, field string) interface{} {
	if p == nil {
		return nil
	}
	switch field {
	case "ciphertext":
		return p.CiphertextBase64
	case "dek":
		return p.EncryptedDEKBase64
	case "nonce":
		return p.NonceBase64
	default:
		return nil
	}
}
