package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
)

type probe struct {
	ID                string   `json:"id"`
	Jurisdiction      string   `json:"jurisdiction"`
	Question          string   `json:"question"`
	ExpectedCitations []string `json:"expectedCitations"`
}

func main() {
	probeSet := flag.String("probe-set", "", "path to legal RAG probe-set JSON")
	flag.Parse()

	if *probeSet == "" {
		fmt.Fprintln(os.Stderr, "-probe-set is required")
		os.Exit(2)
	}

	data, err := os.ReadFile(*probeSet)
	if err != nil {
		fmt.Fprintf(os.Stderr, "read probe set: %v\n", err)
		os.Exit(1)
	}

	var probes []probe
	if err := json.Unmarshal(data, &probes); err != nil {
		fmt.Fprintf(os.Stderr, "parse probe set: %v\n", err)
		os.Exit(1)
	}
	if len(probes) == 0 {
		fmt.Fprintln(os.Stderr, "probe set is empty")
		os.Exit(1)
	}

	missing := 0
	for _, p := range probes {
		if p.ID == "" || p.Question == "" || p.Jurisdiction == "" || len(p.ExpectedCitations) == 0 {
			missing++
		}
	}
	if missing > 0 {
		fmt.Fprintf(os.Stderr, "probe set has %d incomplete probes\n", missing)
		os.Exit(1)
	}

	fmt.Printf("loaded_probes=%d\n", len(probes))
	fmt.Println("rag_eval_status=ready_for_live_corpus")
	fmt.Println("note=live hallucination/citation scoring requires deployed Shepherd RAG endpoint and curated corpus")
}
