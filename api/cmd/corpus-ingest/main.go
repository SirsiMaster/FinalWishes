// Command corpus-ingest loads the Legal RAG corpus (ADR-044, CR-10) from a manifest
// of OWNER-VERIFIED statute text into Cloud SQL (legal_corpus_sources + _chunks with
// pgvector embeddings). It NEVER generates or alters legal text — every chunk comes
// verbatim from the manifest (Rule 9, full-fidelity legal documents). Each chunk is
// embedded with RETRIEVAL_DOCUMENT (gemini-embedding-001) so the Shepherd retriever
// (RETRIEVAL_QUERY) matches.
//
// Usage:
//
//	RAG_DATABASE_URL=postgres://...  GOOGLE_CLOUD_PROJECT=finalwishes-prod \
//	  go run ./cmd/corpus-ingest -manifest path/to/manifest.json [-dry-run]
//
// Manifest schema: see docs/legal-corpus/MANIFEST.md. The owner populates the manifest
// with verified, full-text state statutes (IL/MD/MN launch states) and their citations.
package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"

	"github.com/sirsi-technologies/finalwishes-api/internal/guidance"
)

// maxChunkChars bounds a chunk so it stays well under the embedding model's input
// limit; chunks split only on paragraph boundaries so statute text is never cut
// mid-sentence.
const maxChunkChars = 2000

type manifest struct {
	Sources []source `json:"sources"`
}

type source struct {
	ID               string `json:"id"`
	Jurisdiction     string `json:"jurisdiction"`
	Title            string `json:"title"`
	StatuteReference string `json:"statuteReference"`
	SourceURL        string `json:"sourceUrl"`
	Publisher        string `json:"publisher"`
	LicenseNote      string `json:"licenseNote"`
	EffectiveAt      string `json:"effectiveAt"` // optional, YYYY-MM-DD
	VerifiedAt       string `json:"verifiedAt"`  // RFC3339
	Text             string `json:"text"`
}

func main() {
	manifestPath := flag.String("manifest", "", "path to the corpus manifest JSON (required)")
	dryRun := flag.Bool("dry-run", false, "parse + chunk + report, but do not embed or write")
	flag.Parse()

	if *manifestPath == "" {
		log.Fatal("-manifest is required")
	}

	raw, err := os.ReadFile(*manifestPath)
	if err != nil {
		log.Fatalf("read manifest: %v", err)
	}
	var m manifest
	if err := json.Unmarshal(raw, &m); err != nil {
		log.Fatalf("parse manifest: %v", err)
	}
	if len(m.Sources) == 0 {
		log.Fatal("manifest has no sources")
	}

	ctx := context.Background()

	var db *sql.DB
	var embedder *guidance.VertexEmbedder
	if !*dryRun {
		dsn := os.Getenv("RAG_DATABASE_URL")
		if dsn == "" {
			log.Fatal("RAG_DATABASE_URL is required (omit with -dry-run)")
		}
		db, err = sql.Open("postgres", dsn)
		if err != nil {
			log.Fatalf("open db: %v", err)
		}
		defer db.Close()
		if err := db.PingContext(ctx); err != nil {
			log.Fatalf("ping db: %v", err)
		}
		projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
		if projectID == "" {
			log.Fatal("GOOGLE_CLOUD_PROJECT is required (omit with -dry-run)")
		}
		embedder, err = guidance.NewVertexEmbedder(ctx, projectID, getenv("VERTEX_LOCATION", "us-central1"))
		if err != nil {
			log.Fatalf("vertex embedder: %v", err)
		}
	}

	totalChunks := 0
	for _, s := range m.Sources {
		if err := validate(s); err != nil {
			log.Fatalf("source %q invalid: %v", s.ID, err)
		}
		chunks := chunkText(s.Text)
		log.Printf("source %s (%s %s): %d chunks", s.ID, s.Jurisdiction, s.StatuteReference, len(chunks))
		totalChunks += len(chunks)

		if *dryRun {
			continue
		}

		sum := sha256.Sum256([]byte(s.Text))
		if err := upsertSource(ctx, db, s, hex.EncodeToString(sum[:])); err != nil {
			log.Fatalf("upsert source %s: %v", s.ID, err)
		}

		for i, chunk := range chunks {
			vec, err := embedder.EmbedDocument(ctx, chunk)
			if err != nil {
				log.Fatalf("embed %s chunk %d: %v", s.ID, i, err)
			}
			if err := upsertChunk(ctx, db, s, i, chunk, vec, embedder.Model()); err != nil {
				log.Fatalf("upsert %s chunk %d: %v", s.ID, i, err)
			}
		}
		log.Printf("  ingested %d chunks for %s", len(chunks), s.ID)
	}

	if *dryRun {
		log.Printf("DRY RUN: %d sources, %d chunks — nothing written or embedded", len(m.Sources), totalChunks)
		return
	}
	log.Printf("DONE: %d sources, %d chunks ingested", len(m.Sources), totalChunks)
}

func validate(s source) error {
	if s.ID == "" || s.Jurisdiction == "" || s.Title == "" || s.StatuteReference == "" ||
		s.SourceURL == "" || s.Publisher == "" || s.LicenseNote == "" || s.VerifiedAt == "" {
		return fmt.Errorf("missing required field(s)")
	}
	if strings.TrimSpace(s.Text) == "" {
		return fmt.Errorf("empty text")
	}
	if _, err := time.Parse(time.RFC3339, s.VerifiedAt); err != nil {
		return fmt.Errorf("verifiedAt must be RFC3339: %w", err)
	}
	if s.EffectiveAt != "" {
		if _, err := time.Parse("2006-01-02", s.EffectiveAt); err != nil {
			return fmt.Errorf("effectiveAt must be YYYY-MM-DD: %w", err)
		}
	}
	return nil
}

// chunkText splits on blank-line paragraph boundaries, then greedily packs paragraphs
// into chunks up to maxChunkChars. A single paragraph longer than the limit is kept
// whole (legal text is never cut mid-sentence).
func chunkText(text string) []string {
	paras := strings.Split(strings.ReplaceAll(text, "\r\n", "\n"), "\n\n")
	var chunks []string
	var cur strings.Builder
	flush := func() {
		if cur.Len() > 0 {
			chunks = append(chunks, strings.TrimSpace(cur.String()))
			cur.Reset()
		}
	}
	for _, p := range paras {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if cur.Len() > 0 && cur.Len()+len(p)+2 > maxChunkChars {
			flush()
		}
		if cur.Len() > 0 {
			cur.WriteString("\n\n")
		}
		cur.WriteString(p)
	}
	flush()
	return chunks
}

// estimateTokens is a coarse word→token estimate (the schema requires token_count > 0;
// exact tokenization isn't needed for retrieval, only for budgeting/observability).
func estimateTokens(text string) int {
	n := len(strings.Fields(text))
	if n < 1 {
		return 1
	}
	return n
}

func upsertSource(ctx context.Context, db *sql.DB, s source, sha string) error {
	_, err := db.ExecContext(ctx,
		`INSERT INTO legal_corpus_sources
		   (id, jurisdiction, title, source_url, publisher, retrieved_at, verified_at, sha256, license_note)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		 ON CONFLICT (id) DO UPDATE SET
		   jurisdiction=EXCLUDED.jurisdiction, title=EXCLUDED.title, source_url=EXCLUDED.source_url,
		   publisher=EXCLUDED.publisher, retrieved_at=EXCLUDED.retrieved_at, verified_at=EXCLUDED.verified_at,
		   sha256=EXCLUDED.sha256, license_note=EXCLUDED.license_note`,
		s.ID, s.Jurisdiction, s.Title, s.SourceURL, s.Publisher, time.Now().UTC(), s.VerifiedAt, sha, s.LicenseNote,
	)
	return err
}

func upsertChunk(ctx context.Context, db *sql.DB, s source, idx int, chunk string, vec []float32, model string) error {
	var effective any
	if s.EffectiveAt != "" {
		effective = s.EffectiveAt
	}
	_, err := db.ExecContext(ctx,
		`INSERT INTO legal_corpus_chunks
		   (id, source_id, jurisdiction, title, statute_reference, source_url, effective_at, verified_at,
		    chunk_text, token_count, embedding_model, embedding)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::vector)
		 ON CONFLICT (id) DO UPDATE SET
		   chunk_text=EXCLUDED.chunk_text, token_count=EXCLUDED.token_count,
		   embedding_model=EXCLUDED.embedding_model, embedding=EXCLUDED.embedding,
		   verified_at=EXCLUDED.verified_at`,
		fmt.Sprintf("%s-%04d", s.ID, idx), s.ID, s.Jurisdiction, s.Title, s.StatuteReference,
		s.SourceURL, effective, s.VerifiedAt, chunk, estimateTokens(chunk), model, vectorLiteral(vec),
	)
	return err
}

// vectorLiteral formats a float slice as a pgvector input literal: "[v1,v2,...]".
func vectorLiteral(vec []float32) string {
	var b strings.Builder
	b.WriteByte('[')
	for i, v := range vec {
		if i > 0 {
			b.WriteByte(',')
		}
		fmt.Fprintf(&b, "%g", v)
	}
	b.WriteByte(']')
	return b.String()
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
