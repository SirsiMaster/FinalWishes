// Package guidance — Sirsi AI integration for The Shepherd v3.
// Provides Claude Opus-powered guidance, obituary drafting,
// and action suggestions via the shared sirsi-ai engine.
package guidance

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/rs/zerolog/log"

	sai "github.com/SirsiMaster/sirsi-ai"
)

// ShepherdAdvisor wraps the sirsi-ai engine for FinalWishes AI features.
// Replaces GenkitAdvisor — same interface, Claude Opus instead of Gemini Flash.
type ShepherdAdvisor struct {
	ai sai.AIService
}

// NewShepherdAdvisor creates a Shepherd backed by Claude Opus via sirsi-ai.
// Returns nil if initialization fails — callers fall back to deterministic mode.
func NewShepherdAdvisor(ctx context.Context) *ShepherdAdvisor {
	engine, err := sai.New(ctx, sai.LoadConfig())
	if err != nil {
		log.Warn().Err(err).Msg("Sirsi AI initialization failed — falling back to deterministic guidance")
		return nil
	}

	log.Info().Msg("Shepherd AI advisor initialized (Claude Opus via sirsi-ai)")
	return &ShepherdAdvisor{ai: engine}
}

// GenerateInsight produces a personalized 1-2 sentence guidance insight
// using Claude Opus, given the current estate completion score.
func (a *ShepherdAdvisor) GenerateInsight(ctx context.Context, score *Score, estateName string) string {
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

	resp, err := a.ai.Explain(ctx, userPrompt,
		sai.WithSystem(guidanceSystemPrompt),
		sai.WithTemperature(0.7),
		sai.WithMaxTokens(200),
	)
	if err != nil {
		log.Warn().Err(err).Msg("Shepherd GenerateInsight failed — using fallback")
		return ""
	}

	return strings.TrimSpace(resp)
}

// GenerateObituary produces a draft obituary/life record using Claude Opus
// with higher creativity (temperature 0.9).
func (a *ShepherdAdvisor) GenerateObituary(ctx context.Context, prompt string) string {
	resp, err := a.ai.Explain(ctx, prompt,
		sai.WithSystem(obituarySystemPrompt),
		sai.WithTemperature(0.9),
		sai.WithMaxTokens(1000),
	)
	if err != nil {
		log.Error().Err(err).Msg("Shepherd GenerateObituary failed")
		return ""
	}

	return strings.TrimSpace(resp)
}

// SuggestNextActions returns 3-5 prioritized action suggestions based on
// which estate steps are still incomplete.
func (a *ShepherdAdvisor) SuggestNextActions(ctx context.Context, score *Score) []string {
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

	resp, err := a.ai.Explain(ctx, userPrompt,
		sai.WithSystem(suggestionsSystemPrompt),
		sai.WithTemperature(0.7),
		sai.WithMaxTokens(300),
		sai.WithTask(sai.TaskAnalyzeSimple),
	)
	if err != nil {
		log.Error().Err(err).Msg("Shepherd SuggestNextActions failed")
		return fallbackSuggestions(score)
	}

	// Parse JSON array from response
	text := strings.TrimSpace(resp)
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
