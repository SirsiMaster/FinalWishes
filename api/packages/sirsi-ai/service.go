// Package ai provides a multi-model AI service for the Sirsi portfolio.
// It routes requests to Claude (via Vertex AI), Gemma, or Gemini based on
// task type, with automatic fallback when the primary model is unavailable.
package ai

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"
)

// AIService is the primary interface for all AI operations across Sirsi products.
type AIService interface {
	// Explain generates a natural language explanation.
	Explain(ctx context.Context, prompt string, opts ...Option) (string, error)

	// Chat handles multi-turn conversation with context.
	Chat(ctx context.Context, messages []Message, opts ...Option) (string, error)

	// Analyze performs structured analysis and returns rich metadata.
	Analyze(ctx context.Context, prompt string, opts ...Option) (*AnalysisResult, error)

	// WithModel returns a copy pinned to a specific model.
	WithModel(model ModelID) AIService
}

// MultiModelService implements AIService with Claude, Gemma, and Gemini providers.
type MultiModelService struct {
	providers map[ModelID]ModelProvider
	config    Config
	pinned    ModelID // Empty = auto-route
}

// New creates a MultiModelService from configuration.
// It initializes all available providers and logs which are active.
func New(ctx context.Context, cfg Config) (*MultiModelService, error) {
	if cfg.ProjectID == "" {
		cfg = LoadConfig()
	}

	providers := make(map[ModelID]ModelProvider)

	// Initialize Claude Opus (primary)
	opus, err := newClaudeProvider(ctx, cfg)
	if err != nil {
		log.Printf("[sirsi-ai] Claude Opus not available: %v", err)
	} else {
		providers[ModelClaude] = opus
		providers[ModelMythos] = opus // Mythos routes to Opus until separate model available
		log.Printf("[sirsi-ai] Claude Opus initialized: %s (region: %s)", cfg.ClaudeModel, cfg.ClaudeRegion)
	}

	// Initialize Claude Sonnet (fallback)
	sonnetCfg := cfg
	sonnetCfg.ClaudeModel = "claude-sonnet-4-6"
	sonnet, err := newClaudeProvider(ctx, sonnetCfg)
	if err != nil {
		log.Printf("[sirsi-ai] Claude Sonnet not available: %v", err)
	} else {
		providers[ModelSonnet] = sonnet
		log.Printf("[sirsi-ai] Claude Sonnet initialized: claude-sonnet-4-6 (region: %s)", cfg.ClaudeRegion)
	}

	// Initialize Gemini 3 (absolute last resort only)
	gemini, err := newGeminiProvider(ctx, cfg)
	if err != nil {
		log.Printf("[sirsi-ai] Gemini not available: %v", err)
	} else {
		providers[ModelGemini] = gemini
		providers[ModelGemma] = gemini // Gemma routes through Gemini for now
		log.Printf("[sirsi-ai] Gemini initialized: %s (last resort only)", cfg.GeminiModel)
	}

	if len(providers) == 0 {
		return nil, fmt.Errorf("no AI providers available")
	}

	return &MultiModelService{
		providers: providers,
		config:    cfg,
	}, nil
}

// WithModel returns a copy of the service pinned to a specific model.
func (s *MultiModelService) WithModel(model ModelID) AIService {
	return &MultiModelService{
		providers: s.providers,
		config:    s.config,
		pinned:    model,
	}
}

// Explain generates a text explanation using the best available model.
func (s *MultiModelService) Explain(ctx context.Context, prompt string, opts ...Option) (string, error) {
	cfg := defaultConfig()
	cfg.task = TaskExplain
	for _, o := range opts {
		o(&cfg)
	}

	resp, err := s.generate(ctx, &GenerateRequest{
		Messages:    []Message{{Role: RoleUser, Content: prompt}},
		System:      cfg.system,
		Temperature: cfg.temperature,
		MaxTokens:   cfg.maxTokens,
	}, cfg)
	if err != nil {
		return "", err
	}
	return resp.Text, nil
}

// Chat handles multi-turn conversation.
func (s *MultiModelService) Chat(ctx context.Context, messages []Message, opts ...Option) (string, error) {
	cfg := defaultConfig()
	cfg.task = TaskChat
	for _, o := range opts {
		o(&cfg)
	}

	resp, err := s.generate(ctx, &GenerateRequest{
		Messages:    messages,
		System:      cfg.system,
		Temperature: cfg.temperature,
		MaxTokens:   cfg.maxTokens,
	}, cfg)
	if err != nil {
		return "", err
	}
	return resp.Text, nil
}

// Analyze performs structured analysis with rich metadata.
func (s *MultiModelService) Analyze(ctx context.Context, prompt string, opts ...Option) (*AnalysisResult, error) {
	cfg := defaultConfig()
	cfg.task = TaskAnalyzeComplex
	for _, o := range opts {
		o(&cfg)
	}

	start := time.Now()
	resp, err := s.generate(ctx, &GenerateRequest{
		Messages:    []Message{{Role: RoleUser, Content: prompt}},
		System:      cfg.system,
		Temperature: cfg.temperature,
		MaxTokens:   cfg.maxTokens,
	}, cfg)
	if err != nil {
		return nil, err
	}

	return &AnalysisResult{
		Text:      resp.Text,
		Model:     resp.Model,
		Provider:  resp.Provider,
		TokensIn:  resp.TokensIn,
		TokensOut: resp.TokensOut,
		LatencyMs: time.Since(start).Milliseconds(),
	}, nil
}

// generate is the core method that handles routing and fallback.
func (s *MultiModelService) generate(ctx context.Context, req *GenerateRequest, cfg requestConfig) (*GenerateResponse, error) {
	// Determine model chain
	var chain []ModelID
	if s.pinned != "" && s.pinned != ModelAuto {
		chain = []ModelID{s.pinned}
		if s.config.FallbackEnabled {
			// Add fallback models after the pinned one
			_, fallbacks := Route(cfg.task)
			chain = append(chain, fallbacks...)
		}
	} else if cfg.model != ModelAuto && cfg.model != "" {
		chain = []ModelID{cfg.model}
	} else {
		primary, fallbacks := Route(cfg.task)
		chain = append([]ModelID{primary}, fallbacks...)
	}

	var lastErr error
	for _, modelID := range chain {
		provider, ok := s.providers[modelID]
		if !ok {
			continue
		}
		if !provider.Available(ctx) {
			continue
		}

		resp, err := provider.Generate(ctx, req)
		if err != nil {
			lastErr = err
			// Check if error is retryable (quota, timeout, unavailable)
			if isRetryableError(err) && s.config.FallbackEnabled {
				log.Printf("[sirsi-ai] %s failed (retryable), trying next: %v", provider.Name(), err)
				continue
			}
			// Non-retryable error — return immediately
			return nil, fmt.Errorf("%s: %w", provider.Name(), err)
		}

		return resp, nil
	}

	if lastErr != nil {
		return nil, fmt.Errorf("all providers failed, last error: %w", lastErr)
	}
	return nil, fmt.Errorf("no providers available for task %d", cfg.task)
}

// isRetryableError checks if an error should trigger fallback.
func isRetryableError(err error) bool {
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "429") ||
		strings.Contains(msg, "quota") ||
		strings.Contains(msg, "rate") ||
		strings.Contains(msg, "unavailable") ||
		strings.Contains(msg, "timeout") ||
		strings.Contains(msg, "deadline") ||
		strings.Contains(msg, "resource_exhausted") ||
		strings.Contains(msg, "503")
}
