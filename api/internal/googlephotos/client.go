package googlephotos

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const defaultPickerBase = "https://photospicker.googleapis.com/v1"

type PickerClient struct {
	baseURL    string
	httpClient *http.Client
}

type PickerSession struct {
	ID            string `json:"id"`
	PickerURI     string `json:"pickerUri"`
	MediaItemsSet bool   `json:"mediaItemsSet"`
}

type PickedMediaItem struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	MediaFile MediaFile `json:"mediaFile"`
}

type MediaFile struct {
	BaseURL       string                 `json:"baseUrl"`
	MimeType      string                 `json:"mimeType"`
	Filename      string                 `json:"filename"`
	MediaMetadata map[string]interface{} `json:"mediaMetadata"`
}

func NewPickerClient(baseURL string, httpClient *http.Client) *PickerClient {
	if baseURL == "" {
		baseURL = defaultPickerBase
	}
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 30 * time.Second}
	}
	return &PickerClient{baseURL: baseURL, httpClient: httpClient}
}

func (c *PickerClient) CreateSession(ctx context.Context, accessToken string) (PickerSession, error) {
	req, err := c.authedRequest(ctx, http.MethodPost, c.baseURL+"/sessions", accessToken, bytes.NewReader([]byte(`{}`)))
	if err != nil {
		return PickerSession{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	var session PickerSession
	if err := c.doJSON(req, &session); err != nil {
		return PickerSession{}, err
	}
	return session, nil
}

func (c *PickerClient) GetSession(ctx context.Context, accessToken, sessionID string) (PickerSession, error) {
	req, err := c.authedRequest(ctx, http.MethodGet, c.baseURL+"/sessions/"+sessionID, accessToken, nil)
	if err != nil {
		return PickerSession{}, err
	}
	var session PickerSession
	if err := c.doJSON(req, &session); err != nil {
		return PickerSession{}, err
	}
	return session, nil
}

func (c *PickerClient) ListMediaItems(ctx context.Context, accessToken, sessionID string) ([]PickedMediaItem, error) {
	var all []PickedMediaItem
	pageToken := ""
	for {
		url := c.baseURL + "/mediaItems?sessionId=" + sessionID
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}
		req, err := c.authedRequest(ctx, http.MethodGet, url, accessToken, nil)
		if err != nil {
			return nil, err
		}
		var resp struct {
			MediaItems    []PickedMediaItem `json:"mediaItems"`
			NextPageToken string            `json:"nextPageToken"`
		}
		if err := c.doJSON(req, &resp); err != nil {
			return nil, err
		}
		all = append(all, resp.MediaItems...)
		if resp.NextPageToken == "" {
			return all, nil
		}
		pageToken = resp.NextPageToken
	}
}

func (c *PickerClient) DownloadMedia(ctx context.Context, accessToken string, item PickedMediaItem) ([]byte, error) {
	if item.MediaFile.BaseURL == "" {
		return nil, fmt.Errorf("missing media base url")
	}
	url := item.MediaFile.BaseURL
	if item.MediaFile.MimeType != "" && item.MediaFile.MimeType[:min(5, len(item.MediaFile.MimeType))] == "video" {
		url += "=dv"
	} else {
		url += "=d"
	}
	req, err := c.authedRequest(ctx, http.MethodGet, url, accessToken, nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("download media failed: status %d", resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, maxImportBytes+1))
}

func (c *PickerClient) authedRequest(ctx context.Context, method, url, token string, body io.Reader) (*http.Request, error) {
	if token == "" {
		return nil, fmt.Errorf("google photos access token is required")
	}
	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	return req, nil
}

func (c *PickerClient) doJSON(req *http.Request, out interface{}) error {
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	var apiErr struct {
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	var buf bytes.Buffer
	if _, err := io.Copy(&buf, resp.Body); err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		_ = json.Unmarshal(buf.Bytes(), &apiErr)
		if apiErr.Error != nil && apiErr.Error.Message != "" {
			return fmt.Errorf("google photos api failed: %s", apiErr.Error.Message)
		}
		return fmt.Errorf("google photos api failed: status %d", resp.StatusCode)
	}
	return json.Unmarshal(buf.Bytes(), out)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
