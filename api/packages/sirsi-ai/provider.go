package ai

import "context"

// GenerateRequest is the internal request format all providers accept.
type GenerateRequest struct {
	Messages    []Message
	System      string
	Temperature float64
	MaxTokens   int
}

// GenerateResponse is what all providers return.
type GenerateResponse struct {
	Text      string
	Model     string
	Provider  string
	TokensIn  int
	TokensOut int
}

// ModelProvider is the interface each AI backend implements.
type ModelProvider interface {
	Generate(ctx context.Context, req *GenerateRequest) (*GenerateResponse, error)
	Available(ctx context.Context) bool
	Name() string
}
