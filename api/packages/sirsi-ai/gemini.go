package ai

import (
	"context"
	"fmt"
	"strings"

	"google.golang.org/genai"
)

// GeminiProvider accesses Gemini models via Google GenAI SDK.
// Used as fallback and for embeddings.
type GeminiProvider struct {
	client *genai.Client
	model  string
}

func newGeminiProvider(ctx context.Context, cfg Config) (*GeminiProvider, error) {
	var clientCfg genai.ClientConfig

	if cfg.GeminiAPIKey != "" {
		// API key auth (existing behavior, for backward compat)
		clientCfg = genai.ClientConfig{
			APIKey:  cfg.GeminiAPIKey,
			Backend: genai.BackendGeminiAPI,
		}
	} else if cfg.ProjectID != "" {
		// Vertex AI auth (preferred, uses ADC)
		clientCfg = genai.ClientConfig{
			Project:  cfg.ProjectID,
			Location: cfg.Region,
			Backend:  genai.BackendVertexAI,
		}
	} else {
		return nil, fmt.Errorf("either GeminiAPIKey or ProjectID required for Gemini")
	}

	client, err := genai.NewClient(ctx, &clientCfg)
	if err != nil {
		return nil, fmt.Errorf("gemini client: %w", err)
	}

	model := cfg.GeminiModel
	if model == "" {
		model = "gemini-2.0-flash"
	}

	return &GeminiProvider{client: client, model: model}, nil
}

func (p *GeminiProvider) Generate(ctx context.Context, req *GenerateRequest) (*GenerateResponse, error) {
	// Build content parts
	var contents []*genai.Content
	for _, m := range req.Messages {
		role := "user"
		if m.Role == RoleAssistant {
			role = "model"
		}
		contents = append(contents, &genai.Content{
			Role:  role,
			Parts: []*genai.Part{genai.NewPartFromText(m.Content)},
		})
	}

	// System instruction via config
	var config *genai.GenerateContentConfig
	if req.System != "" {
		config = &genai.GenerateContentConfig{
			SystemInstruction: &genai.Content{
				Parts: []*genai.Part{genai.NewPartFromText(req.System)},
			},
		}
	}

	resp, err := p.client.Models.GenerateContent(ctx, p.model, contents, config)
	if err != nil {
		return nil, fmt.Errorf("gemini generate: %w", err)
	}

	// Extract text
	var sb strings.Builder
	if resp != nil && len(resp.Candidates) > 0 && resp.Candidates[0].Content != nil {
		for _, part := range resp.Candidates[0].Content.Parts {
			if part.Text != "" {
				sb.WriteString(part.Text)
			}
		}
	}

	tokensIn, tokensOut := 0, 0
	if resp != nil && resp.UsageMetadata != nil {
		tokensIn = int(resp.UsageMetadata.PromptTokenCount)
		tokensOut = int(resp.UsageMetadata.CandidatesTokenCount)
	}

	return &GenerateResponse{
		Text:      sb.String(),
		Model:     p.model,
		Provider:  "gemini",
		TokensIn:  tokensIn,
		TokensOut: tokensOut,
	}, nil
}

func (p *GeminiProvider) Available(ctx context.Context) bool {
	return p.client != nil
}

func (p *GeminiProvider) Name() string {
	return "gemini"
}
