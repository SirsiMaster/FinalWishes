package ai

// ModelID identifies which model family to use.
type ModelID string

const (
	ModelClaude ModelID = "claude" // Claude Opus 4.6 (primary)
	ModelSonnet ModelID = "sonnet" // Claude Sonnet 4.6 (fallback)
	ModelMythos ModelID = "mythos" // Claude Mythos (when available)
	ModelGemma  ModelID = "gemma"  // Gemma for fast/lightweight tasks only
	ModelGemini ModelID = "gemini" // Gemini 3 (absolute last resort only)
	ModelAuto   ModelID = "auto"   // Router decides based on task
)

// TaskType categorizes AI requests for routing.
type TaskType int

const (
	TaskExplain        TaskType = iota // General explanation
	TaskChat                           // Multi-turn conversation
	TaskAnalyzeComplex                 // Deep reasoning (deals, legal, code)
	TaskAnalyzeSimple                  // Quick scoring, classification
	TaskGenerate                       // Creative writing
	TaskClassify                       // Fast categorization
)

// Role in a conversation.
type Role string

const (
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
	RoleSystem    Role = "system"
)

// Message represents a single message in a conversation.
type Message struct {
	Role    Role   `json:"role"`
	Content string `json:"content"`
}

// AnalysisResult holds structured AI analysis output.
type AnalysisResult struct {
	Text      string            `json:"text"`
	Model     string            `json:"model"`
	Provider  string            `json:"provider"` // "claude", "gemma", "gemini"
	TokensIn  int               `json:"tokens_in,omitempty"`
	TokensOut int               `json:"tokens_out,omitempty"`
	LatencyMs int64             `json:"latency_ms"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}

// Option configures an AI request.
type Option func(*requestConfig)

type requestConfig struct {
	model       ModelID
	task        TaskType
	temperature float64
	maxTokens   int
	system      string
}

func defaultConfig() requestConfig {
	return requestConfig{
		model:       ModelAuto,
		task:        TaskExplain,
		temperature: 0.7,
		maxTokens:   1024,
	}
}

// WithModel pins the request to a specific model.
func WithModel(m ModelID) Option {
	return func(c *requestConfig) { c.model = m }
}

// WithTask sets the task type for routing.
func WithTask(t TaskType) Option {
	return func(c *requestConfig) { c.task = t }
}

// WithTemperature sets the sampling temperature.
func WithTemperature(t float64) Option {
	return func(c *requestConfig) { c.temperature = t }
}

// WithMaxTokens sets the max output tokens.
func WithMaxTokens(n int) Option {
	return func(c *requestConfig) { c.maxTokens = n }
}

// WithSystem sets a system prompt.
func WithSystem(s string) Option {
	return func(c *requestConfig) { c.system = s }
}
