// Package guidance — Sirsi AI integration for The Shepherd v4.
// Provides Claude-powered estate planning guidance with multi-model routing:
//   - Chat/legal guidance -> Claude Opus 4.6 (strongest reasoning)
//   - Obituary drafting -> Claude Sonnet 4.6 (creative, fast)
//   - Suggestions/scoring -> Gemma (cheapest)
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
// Routes to different models based on task type for cost/quality optimization.
type ShepherdAdvisor struct {
	ai sai.AIService
}

// NewShepherdAdvisor creates a Shepherd backed by sirsi-ai with multi-model routing.
// Returns nil if initialization fails — callers fall back to deterministic mode.
func NewShepherdAdvisor(ctx context.Context) *ShepherdAdvisor {
	engine, err := sai.New(ctx, sai.LoadConfig())
	if err != nil {
		log.Warn().Err(err).Msg("Sirsi AI initialization failed — falling back to deterministic guidance")
		return nil
	}

	log.Info().Msg("Shepherd AI advisor initialized (multi-model via sirsi-ai)")
	return &ShepherdAdvisor{ai: engine}
}

// GenerateInsight produces a personalized 1-2 sentence guidance insight
// using Gemma (fast/cheap), given the current estate completion score.
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
		sai.WithTask(sai.TaskAnalyzeSimple), // Routes to Gemma (cheap)
	)
	if err != nil {
		log.Warn().Err(err).Msg("Shepherd GenerateInsight failed — using fallback")
		return ""
	}

	return strings.TrimSpace(resp)
}

// GenerateObituary produces a draft obituary/life record using Claude Sonnet
// (creative writing, higher temperature).
func (a *ShepherdAdvisor) GenerateObituary(ctx context.Context, prompt string) string {
	resp, err := a.ai.Explain(ctx, prompt,
		sai.WithSystem(obituarySystemPrompt),
		sai.WithTemperature(0.9),
		sai.WithMaxTokens(1000),
		sai.WithTask(sai.TaskGenerate), // Routes to Sonnet (creative)
	)
	if err != nil {
		log.Error().Err(err).Msg("Shepherd GenerateObituary failed")
		return ""
	}

	return strings.TrimSpace(resp)
}

// SuggestNextActions returns 3-5 prioritized action suggestions using Gemma (cheap).
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
		sai.WithTask(sai.TaskAnalyzeSimple), // Routes to Gemma (cheapest)
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

// Chat handles a multi-turn estate planning conversation using Claude Opus
// (strongest reasoning for legal guidance questions).
func (a *ShepherdAdvisor) Chat(ctx context.Context, estateContext string, message string, history []ChatMessage) (*ChatResponse, error) {
	// Build conversation messages from history
	messages := make([]sai.Message, 0, len(history)+1)
	for _, h := range history {
		role := sai.RoleUser
		if h.Role == "assistant" {
			role = sai.RoleAssistant
		}
		messages = append(messages, sai.Message{Role: role, Content: h.Content})
	}

	// Append the current message with estate context prepended
	userContent := message
	if estateContext != "" {
		userContent = fmt.Sprintf("ESTATE CONTEXT:\n%s\n\nUSER QUESTION:\n%s", estateContext, message)
	}
	messages = append(messages, sai.Message{Role: sai.RoleUser, Content: userContent})

	resp, err := a.ai.Chat(ctx, messages,
		sai.WithSystem(chatSystemPrompt),
		sai.WithTemperature(0.7),
		sai.WithMaxTokens(500),
		sai.WithTask(sai.TaskChat), // Routes to Claude Opus (strongest reasoning)
	)
	if err != nil {
		return nil, fmt.Errorf("shepherd chat failed: %w", err)
	}

	reply := strings.TrimSpace(resp)

	// Extract suggested actions if the model included them
	suggestedActions := extractSuggestedActions(reply)

	return &ChatResponse{
		Reply:            reply,
		SuggestedActions: suggestedActions,
	}, nil
}

// extractSuggestedActions attempts to pull actionable suggestions from
// the AI reply. Returns an empty slice if none are detected.
func extractSuggestedActions(reply string) []string {
	// Look for a JSON array at the end of the reply (the model sometimes appends suggestions)
	if idx := strings.LastIndex(reply, "["); idx >= 0 {
		candidate := reply[idx:]
		if strings.HasSuffix(strings.TrimSpace(candidate), "]") {
			var actions []string
			if err := json.Unmarshal([]byte(candidate), &actions); err == nil && len(actions) > 0 {
				return actions
			}
		}
	}
	return []string{}
}
