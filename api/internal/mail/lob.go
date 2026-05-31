package mail

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const defaultLobAPIBase = "https://api.lob.com/v1"

type LobClient struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

type Address struct {
	Name         string `json:"name"`
	AddressLine1 string `json:"address_line1"`
	AddressLine2 string `json:"address_line2,omitempty"`
	City         string `json:"address_city"`
	State        string `json:"address_state"`
	Zip          string `json:"address_zip"`
	Country      string `json:"address_country,omitempty"`
}

type CreateCertifiedLetterRequest struct {
	To          Address `json:"to"`
	From        Address `json:"from"`
	FileURL     string  `json:"file"`
	Description string  `json:"description,omitempty"`
}

type CertifiedLetter struct {
	ID          string `json:"id"`
	URL         string `json:"url"`
	TrackingID  string `json:"tracking_id"`
	TrackingURL string `json:"tracking_url"`
	Status      string `json:"status"`
}

func NewLobClient(apiKey, baseURL string, httpClient *http.Client) *LobClient {
	if baseURL == "" {
		baseURL = defaultLobAPIBase
	}
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 30 * time.Second}
	}
	return &LobClient{apiKey: apiKey, baseURL: baseURL, httpClient: httpClient}
}

func (c *LobClient) CreateCertifiedLetter(ctx context.Context, req CreateCertifiedLetterRequest) (CertifiedLetter, error) {
	if c.apiKey == "" {
		return CertifiedLetter{}, fmt.Errorf("lob api key is not configured")
	}
	body := map[string]interface{}{
		"to":            req.To,
		"from":          req.From,
		"file":          req.FileURL,
		"color":         false,
		"double_sided":  false,
		"mail_type":     "usps_first_class",
		"extra_service": "certified",
		"description":   req.Description,
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return CertifiedLetter{}, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/letters", bytes.NewReader(payload))
	if err != nil {
		return CertifiedLetter{}, err
	}
	httpReq.SetBasicAuth(c.apiKey, "")
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return CertifiedLetter{}, err
	}
	defer resp.Body.Close()

	var result struct {
		ID          string `json:"id"`
		URL         string `json:"url"`
		TrackingID  string `json:"tracking_id"`
		TrackingURL string `json:"tracking_url"`
		Status      string `json:"status"`
		Error       *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return CertifiedLetter{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if result.Error != nil && result.Error.Message != "" {
			return CertifiedLetter{}, fmt.Errorf("lob create letter failed: %s", result.Error.Message)
		}
		return CertifiedLetter{}, fmt.Errorf("lob create letter failed: status %d", resp.StatusCode)
	}

	status := result.Status
	if status == "" {
		status = "queued"
	}
	return CertifiedLetter{
		ID:          result.ID,
		URL:         result.URL,
		TrackingID:  firstNonEmpty(result.TrackingID, result.ID),
		TrackingURL: result.TrackingURL,
		Status:      status,
	}, nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}
