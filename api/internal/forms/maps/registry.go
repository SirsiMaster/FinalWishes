// Package maps holds per-form CoordinateMaps plus an embedded registry so the
// API can fill any supported statutory form by ID without touching the disk.
package maps

import (
	"embed"
	"fmt"
	"path"
	"sort"

	"github.com/sirsi-technologies/finalwishes-api/internal/forms"
)

// blankFS embeds the SHA-pinned official blanks so they ship inside the Cloud
// Run binary (the deploy builds from ./api only). Each map's BlankSHA256 is
// re-verified at fill time, so a corrupted embed fails closed.
//
//go:embed blanks/*.pdf
var blankFS embed.FS

// builder produces a fresh CoordinateMap. Maps are returned by value-producing
// funcs (not shared pointers) so callers can safely tune a copy.
type builder func() *forms.CoordinateMap

// registry maps a stable form ID to its CoordinateMap builder.
var registry = map[string]builder{
	"il_poa_property_2011":      PropertyPOA2011,
	"il_small_estate_3606":      SmallEstateAffidavit3606,
	"il_hcpoa_caringinfo":       HCPOACaringInfo,
	"il_living_will_caringinfo": LivingWillCaringInfo,
	"il_mhtpd_2016":             MentalHealthDeclaration2016,
}

// SupportedFormIDs returns the sorted list of fillable form IDs.
func SupportedFormIDs() []string {
	ids := make([]string, 0, len(registry))
	for id := range registry {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	return ids
}

// Lookup returns the CoordinateMap for a form ID (ok=false if unknown).
func Lookup(formID string) (*forms.CoordinateMap, bool) {
	b, ok := registry[formID]
	if !ok {
		return nil, false
	}
	return b(), true
}

// ErrUnknownForm is returned by FillByID for an unregistered form ID.
type ErrUnknownForm struct{ ID string }

func (e ErrUnknownForm) Error() string {
	return fmt.Sprintf("forms: unknown form ID %q (supported: %v)", e.ID, SupportedFormIDs())
}

// FillByID fills a supported statutory form from the embedded blank set. It
// resolves the form's CoordinateMap, reads the embedded blank named by the
// map's BlankFile, and delegates to forms.FillBytes (which re-verifies the
// pinned SHA256 and enforces the execution-field + true-flatten guarantees).
func FillByID(formID string, values map[string]string) ([]byte, *forms.Report, error) {
	m, ok := Lookup(formID)
	if !ok {
		return nil, nil, ErrUnknownForm{ID: formID}
	}

	blank, err := blankFS.ReadFile("blanks/" + path.Base(m.BlankFile))
	if err != nil {
		return nil, nil, fmt.Errorf("forms: embedded blank for %q (%s): %w", formID, m.BlankFile, err)
	}

	return forms.FillBytes(blank, m, values)
}
