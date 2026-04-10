# The Shepherd — AI Guidance Engine

> Estate completion scoring with optional Gemini-powered natural language insights.

## Architecture

**v1 (deterministic):** Counts Firestore subcollections across 8 areas (assets, heirs, executors, documents, lockbox, memoirs, directives, capsules) plus 3 governance checks. Returns a completion percentage, step list, and next action.

**v2 (Genkit/Gemini):** Wraps v1 scores with AI-generated insights via Firebase Genkit + Gemini 2.0 Flash. Three flows:
- `GenerateInsight` — personalized 1-2 sentence guidance based on completion state
- `GenerateObituary` — compassionate obituary draft from user-provided details
- `GenerateSuggestions` — 3-5 actionable next steps as JSON array

**Fallback:** If `GEMINI_API_KEY` is missing or Genkit panics, the handler falls back to deterministic mode silently. AI is always optional.

## Configuration

| Env Var | Description | Required |
|---------|-------------|----------|
| `GEMINI_API_KEY` | Google AI API key for Gemini Flash | No |

## Scoring

11 steps across 4 categories: Foundation (assets, heirs, executors), Vault (documents x2), Security (lockbox), Legacy (memoirs, directives, capsules, obituary, settings).

## Known Limitations

- Scoring is snapshot-based (not cached) — recalculated on every request
- Genkit initialization can panic; recovered via `defer/recover`
