package ai

import "os"

// Config holds all configuration for the multi-model AI service.
type Config struct {
	ProjectID string // GCP project ID (required for Vertex AI)
	Region    string // General region (default: us-central1)

	// Claude on Vertex AI (via Anthropic SDK)
	ClaudeModel  string // Model ID (default: claude-sonnet-4-6)
	ClaudeRegion string // Claude-specific region (default: us-east5)

	// Gemma on Vertex AI (via Google GenAI SDK)
	GemmaModel string // Model ID (default: gemma-3-27b-it)

	// Gemini fallback (via Google GenAI SDK)
	GeminiModel  string // Model ID (default: gemini-3.1-flash-lite-preview)
	GeminiRegion string // Gemini-specific region (default: global — 3.1 Flash Lite is global-only)
	GeminiAPIKey string // Optional API key for Gemini API (non-Vertex)

	// Routing
	DefaultMode     ModelID // Default model selection (default: auto)
	FallbackEnabled bool    // Enable fallback chain (default: true)
}

// LoadConfig reads configuration from environment variables with sensible defaults.
func LoadConfig() Config {
	return Config{
		ProjectID:       envOr("SIRSI_AI_PROJECT_ID", envOr("GCP_PROJECT_ID", envOr("GOOGLE_CLOUD_PROJECT", ""))),
		Region:          envOr("SIRSI_AI_REGION", envOr("GCP_REGION", "us-central1")),
		ClaudeModel:     envOr("SIRSI_AI_CLAUDE_MODEL", "claude-opus-4-6"),
		ClaudeRegion:    envOr("SIRSI_AI_CLAUDE_REGION", "us-east5"),
		GemmaModel:      envOr("SIRSI_AI_GEMMA_MODEL", "gemma-4-27b-it"),
		GeminiModel:     envOr("SIRSI_AI_GEMINI_MODEL", "gemini-3.1-flash-lite-preview"),
		GeminiRegion:    envOr("SIRSI_AI_GEMINI_REGION", "global"), // 3.1 Flash Lite is global-endpoint only
		GeminiAPIKey:    os.Getenv("GEMINI_API_KEY"),
		DefaultMode:     ModelID(envOr("SIRSI_AI_DEFAULT_MODE", string(ModelAuto))),
		FallbackEnabled: envOr("SIRSI_AI_FALLBACK", "true") == "true",
	}
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
