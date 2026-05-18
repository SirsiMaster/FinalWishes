// Package probate implements the pluggable probate engine for FinalWishes.
// Each state (IL, MD, MN) provides its own implementation of StateEngine,
// encoding jurisdiction-specific deadlines, thresholds, and filing requirements.
//
// Illinois is the first implementation. Maryland and Minnesota follow the same
// interface without changing the UI contract or API surface.
package probate

import "time"

// EstatePhase represents a stage in the probate lifecycle.
type EstatePhase string

const (
	PhaseActive            EstatePhase = "active"
	PhaseDeathReported     EstatePhase = "death_reported"
	PhaseExecutorConfirmed EstatePhase = "executor_confirmed"
	PhaseInProbate         EstatePhase = "in_probate"
	PhaseProbateComplete   EstatePhase = "probate_complete"
	PhaseClosed            EstatePhase = "closed"
	PhaseSmallEstate       EstatePhase = "small_estate"
)

// ValidTransitions defines the allowed state transitions.
// Each key maps to the set of phases it can transition to.
var ValidTransitions = map[EstatePhase][]EstatePhase{
	PhaseActive:            {PhaseDeathReported},
	PhaseDeathReported:     {PhaseExecutorConfirmed, PhaseSmallEstate},
	PhaseExecutorConfirmed: {PhaseInProbate, PhaseSmallEstate},
	PhaseInProbate:         {PhaseProbateComplete},
	PhaseProbateComplete:   {PhaseClosed},
	PhaseSmallEstate:       {PhaseClosed},
}

// CanTransition checks if moving from one phase to another is valid.
func CanTransition(from, to EstatePhase) bool {
	targets, ok := ValidTransitions[from]
	if !ok {
		return false
	}
	for _, t := range targets {
		if t == to {
			return true
		}
	}
	return false
}

// Deadline represents a probate deadline with its due date and description.
type Deadline struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	DueDate     time.Time `json:"dueDate"`
	DaysFromNow int       `json:"daysFromNow"`
	Overdue     bool      `json:"overdue"`
	Category    string    `json:"category"` // "filing", "notice", "accounting"
}

// ChecklistItem represents a step in the probate process.
type ChecklistItem struct {
	ID          string `json:"id"`
	Order       int    `json:"order"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Phase       string `json:"phase"`    // which estate phase this belongs to
	Category    string `json:"category"` // "court_filing", "notification", "document", "financial"
	Required    bool   `json:"required"`
	FormRef     string `json:"formRef,omitempty"` // e.g., "CCP0315" or "VSD773"
	FormURL     string `json:"formUrl,omitempty"` // direct link to the form
}

// SmallEstateResult indicates whether an estate qualifies for the small estate path.
type SmallEstateResult struct {
	Qualifies       bool    `json:"qualifies"`
	EstateValue     float64 `json:"estateValue"`
	Threshold       float64 `json:"threshold"`
	VehiclesExcluded bool   `json:"vehiclesExcluded"`
	Reason          string  `json:"reason,omitempty"`
}

// StateEngine defines the interface that each jurisdiction must implement.
// The engine encodes state-specific probate rules, deadlines, filing requirements,
// and threshold calculations. Designed for IL first, extensible to MD/MN.
type StateEngine interface {
	// StateCode returns the two-letter state code (e.g., "IL").
	StateCode() string

	// StateName returns the full state name.
	StateName() string

	// SmallEstateThreshold returns the dollar threshold for small estate eligibility.
	SmallEstateThreshold() float64

	// EvaluateSmallEstate checks if an estate qualifies for simplified processing.
	EvaluateSmallEstate(totalPersonalProperty float64, hasRealEstate bool) SmallEstateResult

	// InventoryDeadline returns the number of days after appointment to file inventory.
	InventoryDeadline() int

	// CreditorClaimsPeriod returns the duration of the creditor claims window.
	CreditorClaimsPeriod() time.Duration

	// ComputeDeadlines calculates all applicable deadlines from a reference date
	// (typically the date letters of office were issued).
	ComputeDeadlines(lettersIssuedAt time.Time) []Deadline

	// Checklist returns the ordered list of probate steps for this jurisdiction.
	Checklist() []ChecklistItem

	// ProbableTimeline returns a human-readable estimate of the total probate duration.
	ProbableTimeline() string

	// CourtSystem returns the name of the court system (e.g., "Cook County Circuit Court").
	CourtSystem() string

	// EFilingAvailable indicates whether electronic filing is available.
	EFilingAvailable() bool
}
