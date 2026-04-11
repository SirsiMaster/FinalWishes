package guidance

import "context"

// Advisor is the interface for AI-powered estate guidance.
// Both GenkitAdvisor (legacy Gemini) and ShepherdAdvisor (Claude Opus) implement this.
type Advisor interface {
	GenerateInsight(ctx context.Context, score *Score, estateName string) string
	GenerateObituary(ctx context.Context, prompt string) string
	SuggestNextActions(ctx context.Context, score *Score) []string
}
