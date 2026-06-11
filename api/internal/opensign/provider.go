package opensign

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/rs/zerolog/log"
)

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

// hmacSignature returns the hex-encoded HMAC-SHA256 of payload under secret (ADR-006).
func hmacSignature(secret string, payload []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

// ─── Shared-services signing (ADR-047) ────────────────────────────────────────
//
// Portfolio policy: CONSUME THE WORKING SIRSI SERVICE FIRST, then self-consume
// dissociated infra ONLY if the Sirsi operational org fails. This keeps tenant apps
// (FinalWishes, Assiduous) buying Sirsi services — reducing cost and proving the
// shared-services model — while never being hard-coupled to Sirsi-org uptime.
//
// The canonical Sirsi Sign endpoint + HMAC scheme come from SirsiNexusApp's
// SERVICES_REGISTRY + ADR-006. Fallback fires ONLY on an AVAILABILITY failure of the
// Sirsi org (transport error / 5xx), NEVER on a clean business rejection (4xx) — a bad
// request must surface, not silently re-route.

// EnvelopeRequest is the provider-agnostic create-envelope input (signer identity is
// already resolved from the verified token by the handler — never the client body).
type EnvelopeRequest struct {
	TemplateID  string
	SignerName  string
	SignerEmail string
	RedirectURL string
}

// EnvelopeResult is the provider-agnostic result; ServedBy records which provider
// fulfilled the request for observability.
type EnvelopeResult struct {
	EnvelopeID string
	SigningURL string
	ServedBy   string
}

// SigningProvider creates signing envelopes against some signing backend.
type SigningProvider interface {
	CreateEnvelope(ctx context.Context, req EnvelopeRequest) (*EnvelopeResult, error)
	Name() string
}

// errBusinessRejection wraps a 4xx from a provider — the request itself is bad, so a
// resilient wrapper must NOT fall back (the fallback would reject it too).
type errBusinessRejection struct{ msg string }

func (e *errBusinessRejection) Error() string { return e.msg }

func isAvailabilityError(err error) bool {
	if err == nil {
		return false
	}
	var br *errBusinessRejection
	return !errors.As(err, &br) // anything that isn't a clean business rejection = availability/transport failure
}

// ResilientProvider is the shared-services policy: try the Sirsi service, fall back to
// dissociated infra on a Sirsi-org availability failure.
type ResilientProvider struct {
	primary  SigningProvider // Sirsi shared service (preferred)
	fallback SigningProvider // dissociated self-hosted (only if Sirsi org fails)
}

func (p *ResilientProvider) Name() string { return "resilient(sirsi→dissociated)" }

func (p *ResilientProvider) CreateEnvelope(ctx context.Context, req EnvelopeRequest) (*EnvelopeResult, error) {
	if p.primary != nil {
		res, err := p.primary.CreateEnvelope(ctx, req)
		if err == nil {
			return res, nil
		}
		if !isAvailabilityError(err) {
			// Clean business rejection from Sirsi — surface it, do not re-route.
			return nil, err
		}
		log.Warn().Err(err).Str("provider", p.primary.Name()).
			Msg("Sirsi signing service unavailable — falling back to dissociated infra")
	}
	if p.fallback == nil {
		return nil, errors.New("signing unavailable: Sirsi service failed and no dissociated fallback configured")
	}
	return p.fallback.CreateEnvelope(ctx, req)
}

// NewSigningProvider builds the resilient provider from env. PRIMARY is the Sirsi Sign
// service (SERVICES_REGISTRY default), FALLBACK is the dissociated/self-hosted path.
// Either may be nil if unconfigured; if both are nil the handler reports unavailable.
func NewSigningProvider() SigningProvider {
	httpClient := &http.Client{Timeout: 20 * time.Second}

	var primary SigningProvider
	sirsiURL := getenv("SIRSI_SIGN_API_URL", "https://us-central1-sirsi-opensign.cloudfunctions.net/api")
	if sirsiURL != "" && os.Getenv("SIRSI_SIGN_DISABLED") == "" {
		primary = &sirsiSignProvider{
			baseURL:    sirsiURL,
			apiKey:     os.Getenv("SIRSI_SIGN_API_KEY"),
			hmacSecret: os.Getenv("SIRSI_SIGN_HMAC_SECRET"),
			http:       httpClient,
		}
	}

	var fallback SigningProvider
	if createURL := dissociatedCreateURL(); createURL != "" {
		fallback = &dissociatedProvider{
			createURL: createURL,
			apiKey:    os.Getenv("OPENSIGN_API_KEY"),
			http:      httpClient,
		}
	}

	return &ResilientProvider{primary: primary, fallback: fallback}
}

func dissociatedCreateURL() string {
	if u := os.Getenv("OPENSIGN_CREATE_ENVELOPE_URL"); u != "" {
		return u
	}
	if u := os.Getenv("OPENSIGN_API_URL"); u != "" {
		return u + "/v1/envelopes"
	}
	return ""
}

// ─── Primary: Sirsi Sign shared service ───────────────────────────────────────

type sirsiSignProvider struct {
	baseURL    string
	apiKey     string
	hmacSecret string
	http       *http.Client
}

func (s *sirsiSignProvider) Name() string { return "sirsi-sign" }

func (s *sirsiSignProvider) CreateEnvelope(ctx context.Context, req EnvelopeRequest) (*EnvelopeResult, error) {
	if s.apiKey == "" && s.hmacSecret == "" {
		// No credential for the shared service — treat as unavailable so we fall back.
		return nil, fmt.Errorf("sirsi sign credential not configured")
	}
	body, _ := json.Marshal(map[string]any{
		"templateId":   req.TemplateID,
		"signerName":   req.SignerName,
		"signerEmail":  req.SignerEmail,
		"redirectUrl":  req.RedirectURL,
		"sourceTenant": "finalwishes",
	})
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+"/guest/envelopes", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if s.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+s.apiKey)
	}
	if s.hmacSecret != "" {
		// ADR-006 HMAC-SHA256 over (body + timestamp), tenant-attributed + replay-bound.
		ts := fmt.Sprintf("%d", time.Now().Unix())
		httpReq.Header.Set("X-Sirsi-Timestamp", ts)
		httpReq.Header.Set("X-Sirsi-Tenant", "finalwishes")
		httpReq.Header.Set("X-Sirsi-Signature", hmacSignature(s.hmacSecret, append(body, []byte(ts)...)))
	}

	resp, err := s.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("sirsi sign transport: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 && resp.StatusCode < 500 {
		return nil, &errBusinessRejection{msg: fmt.Sprintf("sirsi sign rejected (%d): %s", resp.StatusCode, string(raw))}
	}
	if resp.StatusCode >= 500 {
		return nil, fmt.Errorf("sirsi sign %d: %s", resp.StatusCode, string(raw))
	}
	id, url := parseEnvelopeResponse(raw)
	if id == "" {
		return nil, fmt.Errorf("sirsi sign returned no envelope id")
	}
	return &EnvelopeResult{EnvelopeID: id, SigningURL: url, ServedBy: s.Name()}, nil
}

// ─── Fallback: dissociated / self-hosted ──────────────────────────────────────

type dissociatedProvider struct {
	createURL string
	apiKey    string
	http      *http.Client
}

func (d *dissociatedProvider) Name() string { return "dissociated" }

func (d *dissociatedProvider) CreateEnvelope(ctx context.Context, req EnvelopeRequest) (*EnvelopeResult, error) {
	payload, _ := json.Marshal(map[string]any{
		"template_id": req.TemplateID,
		"signers": []map[string]string{
			{"name": req.SignerName, "email": req.SignerEmail, "role": "Signer"},
		},
		"redirect_url": req.RedirectURL,
	})
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, d.createURL, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if d.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+d.apiKey)
	}
	resp, err := d.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("dissociated transport: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 && resp.StatusCode < 500 {
		return nil, &errBusinessRejection{msg: fmt.Sprintf("dissociated rejected (%d): %s", resp.StatusCode, string(raw))}
	}
	if resp.StatusCode >= 500 {
		return nil, fmt.Errorf("dissociated %d: %s", resp.StatusCode, string(raw))
	}
	id, url := parseEnvelopeResponse(raw)
	if id == "" {
		return nil, fmt.Errorf("dissociated returned no envelope id")
	}
	return &EnvelopeResult{EnvelopeID: id, SigningURL: url, ServedBy: d.Name()}, nil
}

// parseEnvelopeResponse extracts the envelope id + signing url from either response
// shape (top-level id/url, or nested data.url).
func parseEnvelopeResponse(raw []byte) (id, url string) {
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		return "", ""
	}
	id, _ = m["id"].(string)
	if id == "" {
		id, _ = m["envelopeId"].(string)
	}
	url, _ = m["url"].(string)
	if url == "" {
		url, _ = m["signingUrl"].(string)
	}
	if url == "" {
		if data, ok := m["data"].(map[string]any); ok {
			url, _ = data["url"].(string)
		}
	}
	return id, url
}
