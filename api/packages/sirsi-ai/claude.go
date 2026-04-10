package ai

import (
	"context"
	"fmt"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/vertex"
)

// ClaudeProvider accesses Claude models via Anthropic SDK on Vertex AI.
// No API key needed — uses Google Cloud Application Default Credentials.
type ClaudeProvider struct {
	client *anthropic.Client
	model  string
}

func newClaudeProvider(ctx context.Context, cfg Config) (*ClaudeProvider, error) {
	if cfg.ProjectID == "" {
		return nil, fmt.Errorf("ProjectID required for Claude on Vertex AI")
	}

	region := cfg.ClaudeRegion
	if region == "" {
		region = "us-east5"
	}

	client := anthropic.NewClient(
		vertex.WithGoogleAuth(ctx, region, cfg.ProjectID),
	)

	model := cfg.ClaudeModel
	if model == "" {
		model = "claude-sonnet-4-6"
	}

	return &ClaudeProvider{client: &client, model: model}, nil
}

func (p *ClaudeProvider) Generate(ctx context.Context, req *GenerateRequest) (*GenerateResponse, error) {
	// Build Anthropic message params
	var msgs []anthropic.MessageParam
	for _, m := range req.Messages {
		switch m.Role {
		case RoleUser:
			msgs = append(msgs, anthropic.NewUserMessage(anthropic.NewTextBlock(m.Content)))
		case RoleAssistant:
			msgs = append(msgs, anthropic.NewAssistantMessage(anthropic.NewTextBlock(m.Content)))
		}
	}

	maxTokens := int64(req.MaxTokens)
	if maxTokens <= 0 {
		maxTokens = 1024
	}

	params := anthropic.MessageNewParams{
		Model:     p.model,
		MaxTokens: maxTokens,
		Messages:  msgs,
	}

	if req.System != "" {
		params.System = []anthropic.TextBlockParam{
			{Text: req.System},
		}
	}

	if req.Temperature > 0 {
		params.Temperature = anthropic.Float(req.Temperature)
	}

	msg, err := p.client.Messages.New(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("claude generate: %w", err)
	}

	// Extract text from response
	var text string
	for _, block := range msg.Content {
		if block.Type == "text" {
			text += block.Text
		}
	}

	return &GenerateResponse{
		Text:      text,
		Model:     p.model,
		Provider:  "claude",
		TokensIn:  int(msg.Usage.InputTokens),
		TokensOut: int(msg.Usage.OutputTokens),
	}, nil
}

func (p *ClaudeProvider) Available(ctx context.Context) bool {
	return p.client != nil
}

func (p *ClaudeProvider) Name() string {
	return "claude"
}
