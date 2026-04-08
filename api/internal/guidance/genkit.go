// Package guidance — Genkit AI integration for The Shepherd v2.
// Provides Gemini-powered natural language guidance, obituary drafting,
// and action suggestions via Firebase Genkit.
package guidance

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/firebase/genkit/go/ai"
	"github.com/firebase/genkit/go/genkit"
	"github.com/firebase/genkit/go/plugins/googlegenai"
	"github.com/rs/zerolog/log"
	"google.golang.org/genai"
)

// GenkitAdvisor wraps a Genkit instance configured with the Google AI plugin
// to provide Gemini-powered guidance flows.
type GenkitAdvisor struct {
	g *genkit.Genkit
}

// NewGenkitAdvisor initializes Genkit with the Google AI (Gemini) plugin.
// Returns nil if initialization fails — callers must check for nil and fall
// back to deterministic mode.
func NewGenkitAdvisor(ctx context.Context) *GenkitAdvisor {
	g := genkit.Init(ctx, genkit.WithPlugins(&googlegenai.GoogleAI{}))
	if g == nil {
		log.Warn().Msg("Genkit initialization returned nil — falling back to deterministic guidance")
		return nil
	}

	log.Info().Msg("Genkit AI advisor initialized (Gemini Flash)")
	return &GenkitAdvisor{g: g}
}

const (
	guidanceSystemPrompt = "You are The Shepherd, an AI estate planning advisor for FinalWishes. " +
		"You provide warm, professional guidance to help users complete their estate plan. " +
		"Never provide legal advice — always recommend consulting an attorney for legal matters. " +
		"Keep responses concise (1-2 sentences)."

	obituarySystemPrompt = "You are a compassionate writer helping draft an obituary/life record. " +
		"Write in a warm, dignified, third-person narrative style. " +
		"Use the details provided to craft a complete obituary. " +
		"If details are sparse, provide a thoughtful template with placeholders."

	suggestionsSystemPrompt = "Given the estate completion state, suggest 3-5 specific, actionable next steps. " +
		"Format as a JSON array of strings. Be specific — reference the actual missing items."

	modelName = "googleai/gemini-2.0-flash"
)

// GenerateInsight produces a personalized 1-2 sentence guidance insight
// using Gemini Flash, given the current estate completion score.
func (a *GenkitAdvisor) GenerateInsight(ctx context.Context, score *Score, estateName string) string {
	completedSteps := []string{}
	missingSteps := []string{}
	for _, s := range score.Steps {
		if s.Complete {
			completedSteps = append(completedSteps, s.Label)
		} else {
			missingSteps = append(missingSteps, s.Label+" — "+s.Description)
		}
	}

	userPrompt := fmt.Sprintf(
		"Estate: %q\nCompletion: %d%% (%d/%d steps)\nCompleted: %s\nMissing: %s\n\nProvide a brief, encouraging guidance insight.",
		estateName,
		score.CompletionPercent,
		score.CompletedSteps, score.TotalSteps,
		strings.Join(completedSteps, ", "),
		strings.Join(missingSteps, "; "),
	)

	resp, err := genkit.GenerateText(ctx, a.g,
		ai.WithModelName(modelName),
		ai.WithSystem(guidanceSystemPrompt),
		ai.WithPrompt(userPrompt),
		ai.WithConfig(&genai.GenerateContentConfig{
			Temperature:     genai.Ptr[float32](0.7),
			MaxOutputTokens: 200,
		}),
	)
	if err != nil {
		log.Warn().Err(err).Msg("Genkit GenerateInsight failed — using fallback")
		return ""
	}

	return strings.TrimSpace(resp)
}

// GenerateObituary produces a draft obituary/life record from user-provided
// details (name, dates, accomplishments, etc.) using Gemini Flash with
// higher creativity (temperature 0.9).
func (a *GenkitAdvisor) GenerateObituary(ctx context.Context, prompt string) string {
	resp, err := genkit.GenerateText(ctx, a.g,
		ai.WithModelName(modelName),
		ai.WithSystem(obituarySystemPrompt),
		ai.WithPrompt(prompt),
		ai.WithConfig(&genai.GenerateContentConfig{
			Temperature:     genai.Ptr[float32](0.9),
			MaxOutputTokens: 1000,
		}),
	)
	if err != nil {
		log.Error().Err(err).Msg("Genkit GenerateObituary failed")
		return ""
	}

	return strings.TrimSpace(resp)
}

// SuggestNextActions returns 3-5 prioritized action suggestions based on
// which estate steps are still incomplete.
func (a *GenkitAdvisor) SuggestNextActions(ctx context.Context, score *Score) []string {
	var missing []string
	for _, s := range score.Steps {
		if !s.Complete {
			missing = append(missing, fmt.Sprintf("- %s: %s (category: %s)", s.Label, s.Description, s.Category))
		}
	}

	if len(missing) == 0 {
		return []string{"Your estate plan is complete. Review periodically to keep it up to date."}
	}

	userPrompt := fmt.Sprintf(
		"Completion: %d%% (%d/%d steps)\nIncomplete steps:\n%s\n\nReturn a JSON array of 3-5 actionable suggestions.",
		score.CompletionPercent,
		score.CompletedSteps, score.TotalSteps,
		strings.Join(missing, "\n"),
	)

	resp, err := genkit.GenerateText(ctx, a.g,
		ai.WithModelName(modelName),
		ai.WithSystem(suggestionsSystemPrompt),
		ai.WithPrompt(userPrompt),
		ai.WithConfig(&genai.GenerateContentConfig{
			Temperature:     genai.Ptr[float32](0.7),
			MaxOutputTokens: 300,
		}),
	)
	if err != nil {
		log.Error().Err(err).Msg("Genkit SuggestNextActions failed")
		return fallbackSuggestions(score)
	}

	// Parse JSON array from response
	text := strings.TrimSpace(resp)
	// Strip markdown code fences if present
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	var suggestions []string
	if err := json.Unmarshal([]byte(text), &suggestions); err != nil {
		log.Warn().Err(err).Str("raw", text).Msg("Failed to parse suggestions JSON — using fallback")
		return fallbackSuggestions(score)
	}

	return suggestions
}

// fallbackSuggestions produces deterministic suggestions when Genkit is unavailable.
func fallbackSuggestions(score *Score) []string {
	var suggestions []string
	for _, s := range score.Steps {
		if !s.Complete {
			suggestions = append(suggestions, s.Label+": "+s.Description)
			if len(suggestions) >= 5 {
				break
			}
		}
	}
	return suggestions
}
