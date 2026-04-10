package ai

// RoutingRule maps a task type to its primary model and fallback chain.
type RoutingRule struct {
	Primary  ModelID
	Fallback []ModelID
}

// DefaultRoutes returns the standard routing table.
// Opus is the default. Sonnet is the fallback. Gemma for fast/lightweight only.
// Never Gemini — Claude models handle everything.
var DefaultRoutes = map[TaskType]RoutingRule{
	TaskExplain:        {Primary: ModelClaude, Fallback: []ModelID{ModelSonnet}},
	TaskChat:           {Primary: ModelClaude, Fallback: []ModelID{ModelSonnet}},
	TaskAnalyzeComplex: {Primary: ModelClaude, Fallback: []ModelID{ModelSonnet}},
	TaskAnalyzeSimple:  {Primary: ModelGemma, Fallback: []ModelID{ModelSonnet}},
	TaskGenerate:       {Primary: ModelClaude, Fallback: []ModelID{ModelSonnet}},
	TaskClassify:       {Primary: ModelGemma, Fallback: []ModelID{ModelSonnet}},
}

// Route returns the primary model and fallback chain for a task.
func Route(task TaskType) (ModelID, []ModelID) {
	if rule, ok := DefaultRoutes[task]; ok {
		return rule.Primary, rule.Fallback
	}
	// Default: Claude with Gemini fallback
	return ModelClaude, []ModelID{ModelGemini}
}
