// Package guidance — Genkit AI integration for The Shepherd (legacy).
// Provides Gemini-powered natural language guidance, obituary drafting,
// and action suggestions via Firebase Genkit. Shared prompts are defined
// here and used by both GenkitAdvisor and ShepherdAdvisor.
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
func NewGenkitAdvisor(ctx context.Context) (advisor *GenkitAdvisor) {
	// GoogleAI plugin panics if GEMINI_API_KEY is not set — recover gracefully
	defer func() {
		if r := recover(); r != nil {
			log.Warn().Interface("panic", r).Msg("Genkit initialization panicked — falling back to deterministic guidance")
			advisor = nil
		}
	}()

	g := genkit.Init(ctx, genkit.WithPlugins(&googlegenai.GoogleAI{}))
	if g == nil {
		log.Warn().Msg("Genkit initialization returned nil — falling back to deterministic guidance")
		return nil
	}

	log.Info().Msg("Genkit AI advisor initialized (Gemini Flash)")
	return &GenkitAdvisor{g: g}
}

// ---------------------------------------------------------------------------
// Shared system prompts — used by both GenkitAdvisor and ShepherdAdvisor.
// ---------------------------------------------------------------------------

const chatSystemPrompt = `You are The Shepherd, FinalWishes' AI estate planning guidance engine. You help families organize their estates with warmth and expertise.

DOMAIN KNOWLEDGE:
- Estate planning basics: wills, trusts, powers of attorney, healthcare directives, beneficiary designations
- Probate process: typically 6-18 months, varies by state
- State thresholds: Maryland small estate ≤$50K (personal) / $100K (real), Illinois ≤$100K, Minnesota ≤$75K
- Key roles: executor (manages probate), trustee (manages trust), guardian (cares for minors), beneficiary (receives assets)
- Common mistakes: not updating beneficiary designations after life changes, forgetting digital assets, not having healthcare directive
- Tax awareness: federal estate tax exemption $13.61M (2024), state varies (MD $5M, IL $4M, MN $3M)
- Digital assets: social media, email, cloud storage, crypto, domain names — often forgotten

RULES:
- You provide general educational guidance, NEVER specific legal advice
- Always recommend consulting an attorney for specific legal questions
- Be warm, compassionate, and encouraging — users may be grieving
- Reference the user's specific estate data when available (assets, documents, beneficiaries)
- If asked about a state you don't have rules for, say so honestly
- Keep responses concise (2-4 sentences for simple questions, longer for complex topics)`

const obituarySystemPrompt = `You are a compassionate writer helping draft an obituary for FinalWishes.
Write in warm, dignified, third-person narrative style.
Structure: full name, age, date of passing, survived by, education/career highlights, passions, service details.
If details are sparse, provide a thoughtful template with [bracketed placeholders].
Tone: celebrating a life lived, not dwelling on loss.`

const suggestionsSystemPrompt = `Given this estate's completion state, suggest 3-5 specific next steps.
Prioritize by urgency and impact. Format as a JSON array of strings.
Reference specific missing items from the data provided.`

// guidanceSystemPrompt is used for short insight generation (1-2 sentences).
const guidanceSystemPrompt = chatSystemPrompt

const modelName = "googleai/gemini-2.0-flash"

// ---------------------------------------------------------------------------
// GenkitAdvisor method implementations (legacy Gemini path).
// ---------------------------------------------------------------------------

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

// Chat handles a multi-turn conversation via Genkit (legacy Gemini path).
// Provides the same interface as ShepherdAdvisor.Chat but uses Gemini Flash.
func (a *GenkitAdvisor) Chat(ctx context.Context, estateContext string, message string, history []ChatMessage) (*ChatResponse, error) {
	// Build the user prompt with estate context
	userPrompt := message
	if estateContext != "" {
		userPrompt = fmt.Sprintf("ESTATE CONTEXT:\n%s\n\nUSER QUESTION:\n%s", estateContext, message)
	}

	resp, err := genkit.GenerateText(ctx, a.g,
		ai.WithModelName(modelName),
		ai.WithSystem(chatSystemPrompt),
		ai.WithPrompt(userPrompt),
		ai.WithConfig(&genai.GenerateContentConfig{
			Temperature:     genai.Ptr[float32](0.7),
			MaxOutputTokens: 500,
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("genkit chat failed: %w", err)
	}

	return &ChatResponse{
		Reply:            strings.TrimSpace(resp),
		SuggestedActions: []string{},
	}, nil
}

// fallbackSuggestions produces deterministic suggestions when AI is unavailable.
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
