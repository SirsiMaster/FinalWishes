package probate

import (
	"testing"
	"time"
)

// ── State Transitions ──

func TestCanTransition_ValidPaths(t *testing.T) {
	valid := []struct {
		from, to EstatePhase
	}{
		{PhaseActive, PhaseDeathReported},
		{PhaseDeathReported, PhaseExecutorConfirmed},
		{PhaseDeathReported, PhaseSmallEstate},
		{PhaseExecutorConfirmed, PhaseInProbate},
		{PhaseExecutorConfirmed, PhaseSmallEstate},
		{PhaseInProbate, PhaseProbateComplete},
		{PhaseProbateComplete, PhaseClosed},
		{PhaseSmallEstate, PhaseClosed},
	}
	for _, tt := range valid {
		if !CanTransition(tt.from, tt.to) {
			t.Errorf("expected %s → %s to be valid", tt.from, tt.to)
		}
	}
}

func TestCanTransition_InvalidPaths(t *testing.T) {
	invalid := []struct {
		from, to EstatePhase
	}{
		{PhaseActive, PhaseInProbate},        // skip executor confirmation
		{PhaseActive, PhaseClosed},           // skip everything
		{PhaseDeathReported, PhaseInProbate}, // must confirm executor first
		{PhaseInProbate, PhaseClosed},        // must complete first
		{PhaseClosed, PhaseActive},           // no resurrection
		{PhaseSmallEstate, PhaseInProbate},   // small estate skips full probate
	}
	for _, tt := range invalid {
		if CanTransition(tt.from, tt.to) {
			t.Errorf("expected %s → %s to be INVALID", tt.from, tt.to)
		}
	}
}

func TestCanTransition_UnknownPhase(t *testing.T) {
	if CanTransition("nonexistent", PhaseActive) {
		t.Error("unknown phase should not have valid transitions")
	}
}

// ── Illinois Engine: Thresholds ──

func TestIllinoisSmallEstateThreshold(t *testing.T) {
	e := &IllinoisEngine{}
	if e.SmallEstateThreshold() != 150_000 {
		t.Errorf("expected $150,000 threshold, got %f", e.SmallEstateThreshold())
	}
}

func TestIllinoisSmallEstate_Qualifies(t *testing.T) {
	e := &IllinoisEngine{}
	result := e.EvaluateSmallEstate(120_000, false)
	if !result.Qualifies {
		t.Error("$120K estate without real property should qualify")
	}
	if !result.VehiclesExcluded {
		t.Error("vehicles should be excluded from count")
	}
}

func TestIllinoisSmallEstate_ExceedsThreshold(t *testing.T) {
	e := &IllinoisEngine{}
	result := e.EvaluateSmallEstate(200_000, false)
	if result.Qualifies {
		t.Error("$200K estate should NOT qualify for small estate")
	}
}

func TestIllinoisSmallEstate_HasRealEstate(t *testing.T) {
	e := &IllinoisEngine{}
	result := e.EvaluateSmallEstate(50_000, true)
	if result.Qualifies {
		t.Error("estate with real property should NOT qualify regardless of value")
	}
}

func TestIllinoisSmallEstate_ExactThreshold(t *testing.T) {
	e := &IllinoisEngine{}
	result := e.EvaluateSmallEstate(150_000, false)
	if !result.Qualifies {
		t.Error("$150K exactly should qualify (threshold is <=)")
	}
}

func TestIllinoisSmallEstate_ZeroValue(t *testing.T) {
	e := &IllinoisEngine{}
	result := e.EvaluateSmallEstate(0, false)
	if !result.Qualifies {
		t.Error("$0 estate should qualify")
	}
}

// ── Illinois Engine: Deadlines ──

func TestIllinoisDeadlines_Count(t *testing.T) {
	e := &IllinoisEngine{}
	deadlines := e.ComputeDeadlines(time.Now())
	if len(deadlines) != 5 {
		t.Errorf("expected 5 deadlines, got %d", len(deadlines))
	}
}

func TestIllinoisDeadlines_InventoryAt60Days(t *testing.T) {
	e := &IllinoisEngine{}
	issued := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	deadlines := e.ComputeDeadlines(issued)

	var inventory *Deadline
	for i := range deadlines {
		if deadlines[i].ID == "inventory" {
			inventory = &deadlines[i]
			break
		}
	}
	if inventory == nil {
		t.Fatal("inventory deadline not found")
	}

	expected := issued.AddDate(0, 0, 60)
	if !inventory.DueDate.Equal(expected) {
		t.Errorf("expected inventory due %v, got %v", expected, inventory.DueDate)
	}
}

func TestIllinoisDeadlines_CreditorClaimsAt6Months(t *testing.T) {
	e := &IllinoisEngine{}
	issued := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
	deadlines := e.ComputeDeadlines(issued)

	var claims *Deadline
	for i := range deadlines {
		if deadlines[i].ID == "creditor_claims_close" {
			claims = &deadlines[i]
			break
		}
	}
	if claims == nil {
		t.Fatal("creditor claims deadline not found")
	}

	expected := issued.AddDate(0, 6, 0)
	if !claims.DueDate.Equal(expected) {
		t.Errorf("expected creditor claims due %v, got %v", expected, claims.DueDate)
	}
}

func TestIllinoisDeadlines_OverdueDetection(t *testing.T) {
	e := &IllinoisEngine{}
	// Letters issued 1 year ago — all deadlines should be overdue
	issued := time.Now().AddDate(-1, 0, 0)
	deadlines := e.ComputeDeadlines(issued)

	for _, d := range deadlines {
		if !d.Overdue {
			t.Errorf("deadline %q should be overdue (issued 1 year ago)", d.Name)
		}
	}
}

func TestIllinoisDeadlines_FutureNotOverdue(t *testing.T) {
	e := &IllinoisEngine{}
	// Letters issued today — no deadlines should be overdue
	deadlines := e.ComputeDeadlines(time.Now())
	for _, d := range deadlines {
		if d.Overdue {
			t.Errorf("deadline %q should NOT be overdue (just issued)", d.Name)
		}
	}
}

// ── Illinois Engine: Checklist ──

func TestIllinoisChecklist_NotEmpty(t *testing.T) {
	e := &IllinoisEngine{}
	checklist := e.Checklist()
	if len(checklist) == 0 {
		t.Fatal("checklist should not be empty")
	}
}

func TestIllinoisChecklist_OrderedSequentially(t *testing.T) {
	e := &IllinoisEngine{}
	checklist := e.Checklist()
	for i := 1; i < len(checklist); i++ {
		if checklist[i].Order <= checklist[i-1].Order {
			t.Errorf("checklist items not in order: %d (%s) followed by %d (%s)",
				checklist[i-1].Order, checklist[i-1].Title, checklist[i].Order, checklist[i].Title)
		}
	}
}

func TestIllinoisChecklist_HasRequiredItems(t *testing.T) {
	e := &IllinoisEngine{}
	requiredIDs := []string{
		"death_certificate", "petition_probate", "oath_bond",
		"letters_office", "notify_creditors", "file_inventory",
		"final_accounting", "close_estate",
	}
	checklist := e.Checklist()
	found := map[string]bool{}
	for _, item := range checklist {
		found[item.ID] = true
	}
	for _, id := range requiredIDs {
		if !found[id] {
			t.Errorf("required checklist item %q not found", id)
		}
	}
}

func TestIllinoisChecklist_FormRefsPresent(t *testing.T) {
	e := &IllinoisEngine{}
	checklist := e.Checklist()
	formItems := 0
	for _, item := range checklist {
		if item.FormRef != "" || item.FormURL != "" {
			formItems++
		}
	}
	if formItems < 4 {
		t.Errorf("expected at least 4 checklist items with form references, got %d", formItems)
	}
}

// ── Illinois Engine: Metadata ──

func TestIllinoisEngine_Metadata(t *testing.T) {
	e := &IllinoisEngine{}
	if e.StateCode() != "IL" {
		t.Errorf("expected IL, got %s", e.StateCode())
	}
	if e.InventoryDeadline() != 60 {
		t.Errorf("expected 60-day inventory, got %d", e.InventoryDeadline())
	}
	if !e.EFilingAvailable() {
		t.Error("Cook County supports e-filing")
	}
	if e.ProbableTimeline() != "12–24 months" {
		t.Errorf("expected 12–24 months, got %s", e.ProbableTimeline())
	}
}
