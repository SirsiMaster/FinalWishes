package ai

// RoutingRule maps a task type to its primary model and fallback chain.
type RoutingRule struct {
	Primary  ModelID
	Fallback []ModelID
}

// DefaultRoutes returns the standard routing table.
// Chat/legal guidance -> Opus (strongest reasoning).
// Creative writing (obituaries) -> Sonnet (creative, fast).
// Scoring/suggestions/classification -> Gemma (cheapest).
var DefaultRoutes = map[TaskType]RoutingRule{
	TaskExplain:        {Primary: ModelClaude, Fallback: []ModelID{ModelSonnet, ModelGemini}},
	TaskChat:           {Primary: ModelClaude, Fallback: []ModelID{ModelSonnet, ModelGemini}},
	TaskAnalyzeComplex: {Primary: ModelClaude, Fallback: []ModelID{ModelSonnet, ModelGemini}},
	TaskAnalyzeSimple:  {Primary: ModelGemma, Fallback: []ModelID{ModelSonnet, ModelGemini}},
	TaskGenerate:       {Primary: ModelSonnet, Fallback: []ModelID{ModelClaude, ModelGemini}},
	TaskClassify:       {Primary: ModelGemma, Fallback: []ModelID{ModelSonnet, ModelGemini}},
}

// Route returns the primary model and fallback chain for a task.
func Route(task TaskType) (ModelID, []ModelID) {
	if rule, ok := DefaultRoutes[task]; ok {
		return rule.Primary, rule.Fallback
	}
	// Default: Claude with Gemini fallback
	return ModelClaude, []ModelID{ModelGemini}
}
