package guidance

import (
	"strings"
	"testing"
)

func TestIsLegalGuidanceTopic(t *testing.T) {
	cases := []struct {
		name string
		msg  string
		want bool
	}{
		{name: "probate", msg: "How long does Illinois probate take?", want: true},
		{name: "directive", msg: "Can I update my health care power of attorney?", want: true},
		{name: "non legal", msg: "Write a warm obituary introduction", want: false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := IsLegalGuidanceTopic(tc.msg); got != tc.want {
				t.Fatalf("IsLegalGuidanceTopic() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestFormatCorpusContextIncludesSafetyRules(t *testing.T) {
	chunks := []CorpusChunk{{
		CorpusCitation: CorpusCitation{
			ID:           "IL-755-5-18-3-0001",
			Title:        "Illinois Probate Act",
			Jurisdiction: "IL",
			Reference:    "755 ILCS 5/18-3",
			SourceURL:    "https://www.ilga.gov/",
		},
		Text: "Claims against an Illinois estate follow statutory notice rules.",
	}}

	got := formatCorpusContext(chunks)
	for _, want := range []string{"[IL-755-5-18-3-0001]", "informational guidance, not legal advice", "cite the bracketed corpus ID"} {
		if !strings.Contains(got, want) {
			t.Fatalf("context missing %q:\n%s", want, got)
		}
	}
}

func TestVectorLiteral(t *testing.T) {
	got := vectorLiteral([]float32{0.25, -1, 2})
	if got != "[0.25,-1,2]" {
		t.Fatalf("vectorLiteral() = %q", got)
	}
}
