package guidance

import "context"

// Advisor is the interface for AI-powered estate guidance.
// Both GenkitAdvisor (legacy Gemini) and ShepherdAdvisor (Claude Opus) implement this.
type Advisor interface {
	GenerateInsight(ctx context.Context, score *Score, estateName string) string
	GenerateObituary(ctx context.Context, prompt string) string
	SuggestNextActions(ctx context.Context, score *Score) []string
	Chat(ctx context.Context, estateContext string, message string, history []ChatMessage) (*ChatResponse, error)
}

// ChatMessage represents a single message in a conversation.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatResponse is the AI reply from a chat interaction.
type ChatResponse struct {
	Reply            string           `json:"reply"`
	SuggestedActions []string         `json:"suggestedActions"`
	Citations        []CorpusCitation `json:"citations,omitempty"`
}

// EstateContext holds enriched estate metadata for prompt construction.
type EstateContext struct {
	Name            string
	State           string
	AssetCount      int
	HeirCount       int
	ExecutorCount   int
	DocumentCount   int
	CompletionScore int
	HasMinors       bool
	OwnsProperty    bool
	HasBusiness     bool
	IsMarried       bool
	PlanningAhead   bool // true = planning ahead, false = after loss
}
