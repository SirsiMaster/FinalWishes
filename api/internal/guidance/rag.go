package guidance

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"google.golang.org/genai"
)

const (
	DefaultEmbeddingModel      = "gemini-embedding-001"
	DefaultEmbeddingDimensions = 3072
	defaultMinRetrievalScore   = 0.72
)

var legalTopicKeywords = []string{
	"advance directive",
	"beneficiary",
	"claim",
	"court",
	"creditor",
	"directive",
	"estate tax",
	"executor",
	"federal tax",
	"health care power",
	"healthcare power",
	"hipaa",
	"inherit",
	"intestate",
	"letters of office",
	"living will",
	"maryland",
	"minnesota",
	"power of attorney",
	"probate",
	"small estate",
	"statute",
	"trust",
	"will",
}

// CorpusCitation is returned to clients whenever Shepherd uses legal corpus
// material. IDs are opaque database identifiers, not user or estate IDs.
type CorpusCitation struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Jurisdiction string    `json:"jurisdiction"`
	Reference    string    `json:"reference"`
	SourceURL    string    `json:"sourceUrl"`
	EffectiveAt  string    `json:"effectiveAt,omitempty"`
	VerifiedAt   time.Time `json:"verifiedAt"`
	Score        float64   `json:"score"`
	Preview      string    `json:"preview"`
}

// CorpusChunk contains the text Shepherd may quote or cite.
type CorpusChunk struct {
	CorpusCitation
	Text string `json:"-"`
}

// RAGRetriever finds legal corpus chunks relevant to a user question.
type RAGRetriever interface {
	Retrieve(ctx context.Context, query string, k int) ([]CorpusChunk, error)
}

// Embedder converts a query into the vector dimension configured for pgvector.
type Embedder interface {
	EmbedQuery(ctx context.Context, text string) ([]float32, error)
	Model() string
	Dimensions() int
}

// VertexEmbedder uses Vertex AI embeddings through the Google GenAI SDK.
type VertexEmbedder struct {
	client     *genai.Client
	model      string
	dimensions int
}

func NewVertexEmbedder(ctx context.Context, projectID, location string) (*VertexEmbedder, error) {
	if projectID == "" {
		return nil, errors.New("projectID is required")
	}
	if location == "" {
		location = "us-central1"
	}
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		Project:  projectID,
		Location: location,
		Backend:  genai.BackendVertexAI,
	})
	if err != nil {
		return nil, fmt.Errorf("vertex embedder client: %w", err)
	}
	return &VertexEmbedder{
		client:     client,
		model:      DefaultEmbeddingModel,
		dimensions: DefaultEmbeddingDimensions,
	}, nil
}

func (e *VertexEmbedder) EmbedQuery(ctx context.Context, text string) ([]float32, error) {
	return e.embed(ctx, text, "RETRIEVAL_QUERY")
}

// EmbedDocument embeds corpus text for INGESTION. gemini-embedding-001 is asymmetric
// — documents must use RETRIEVAL_DOCUMENT (queries use RETRIEVAL_QUERY) for the cosine
// retrieval to match, so the corpus-ingest pipeline calls this, not EmbedQuery.
func (e *VertexEmbedder) EmbedDocument(ctx context.Context, text string) ([]float32, error) {
	return e.embed(ctx, text, "RETRIEVAL_DOCUMENT")
}

func (e *VertexEmbedder) embed(ctx context.Context, text, taskType string) ([]float32, error) {
	dimensions := int32(e.dimensions)
	resp, err := e.client.Models.EmbedContent(
		ctx,
		e.model,
		genai.Text(text),
		&genai.EmbedContentConfig{
			TaskType:             taskType,
			OutputDimensionality: &dimensions,
			AutoTruncate:         true,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("vertex embed content: %w", err)
	}
	if resp == nil || len(resp.Embeddings) == 0 || resp.Embeddings[0] == nil {
		return nil, errors.New("vertex embed content returned no embeddings")
	}
	return resp.Embeddings[0].Values, nil
}

func (e *VertexEmbedder) Model() string {
	return e.model
}

func (e *VertexEmbedder) Dimensions() int {
	return e.dimensions
}

// PostgresRAGRetriever uses Cloud SQL PostgreSQL with pgvector. The database is
// separate from the PII vault; corpus text is public-source legal material.
type PostgresRAGRetriever struct {
	db       *sql.DB
	embedder Embedder
	minScore float64
}

func NewPostgresRAGRetriever(db *sql.DB, embedder Embedder) *PostgresRAGRetriever {
	return &PostgresRAGRetriever{
		db:       db,
		embedder: embedder,
		minScore: defaultMinRetrievalScore,
	}
}

func (r *PostgresRAGRetriever) Retrieve(ctx context.Context, query string, k int) ([]CorpusChunk, error) {
	if r == nil || r.db == nil || r.embedder == nil {
		return nil, errors.New("rag retriever is not configured")
	}
	if k <= 0 {
		k = 5
	}
	vector, err := r.embedder.EmbedQuery(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("embed query: %w", err)
	}
	if len(vector) != r.embedder.Dimensions() {
		return nil, fmt.Errorf("embedding dimension mismatch: got %d want %d", len(vector), r.embedder.Dimensions())
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, title, jurisdiction, statute_reference, source_url,
		       COALESCE(effective_at::text, ''), verified_at, chunk_text,
		       1 - (embedding <=> $1::vector) AS score
		FROM legal_corpus_chunks
		WHERE embedding_model = $2
		ORDER BY embedding <=> $1::vector
		LIMIT $3
	`, vectorLiteral(vector), r.embedder.Model(), k)
	if err != nil {
		return nil, fmt.Errorf("retrieve corpus chunks: %w", err)
	}
	defer rows.Close()

	var chunks []CorpusChunk
	for rows.Next() {
		var c CorpusChunk
		if err := rows.Scan(
			&c.ID,
			&c.Title,
			&c.Jurisdiction,
			&c.Reference,
			&c.SourceURL,
			&c.EffectiveAt,
			&c.VerifiedAt,
			&c.Text,
			&c.Score,
		); err != nil {
			return nil, fmt.Errorf("scan corpus chunk: %w", err)
		}
		if c.Score >= r.minScore {
			c.Preview = preview(c.Text, 320)
			chunks = append(chunks, c)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate corpus chunks: %w", err)
	}
	return chunks, nil
}

func IsLegalGuidanceTopic(message string) bool {
	text := strings.ToLower(message)
	for _, keyword := range legalTopicKeywords {
		if strings.Contains(text, keyword) {
			return true
		}
	}
	return false
}

func formatCorpusContext(chunks []CorpusChunk) string {
	if len(chunks) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("\nLEGAL CORPUS CONTEXT:\n")
	for _, c := range chunks {
		fmt.Fprintf(&b, "[%s] %s (%s, %s, verified %s)\n%s\n\n",
			c.ID,
			c.Reference,
			c.Jurisdiction,
			c.SourceURL,
			c.VerifiedAt.Format("2006-01-02"),
			c.Text,
		)
	}
	b.WriteString("Rules: cite the bracketed corpus ID for every legal claim. If the corpus does not support a claim, remove it or say the corpus does not answer it. State that this is informational guidance, not legal advice, and recommend attorney review for jurisdiction-specific decisions.")
	return b.String()
}

func citationList(chunks []CorpusChunk) []CorpusCitation {
	citations := make([]CorpusCitation, 0, len(chunks))
	for _, c := range chunks {
		citations = append(citations, c.CorpusCitation)
	}
	return citations
}

func vectorLiteral(v []float32) string {
	parts := make([]string, len(v))
	for i, f := range v {
		if math.IsNaN(float64(f)) || math.IsInf(float64(f), 0) {
			parts[i] = "0"
			continue
		}
		parts[i] = strconv.FormatFloat(float64(f), 'f', -1, 32)
	}
	return "[" + strings.Join(parts, ",") + "]"
}

func preview(text string, max int) string {
	text = strings.Join(strings.Fields(text), " ")
	if len(text) <= max {
		return text
	}
	return strings.TrimSpace(text[:max]) + "..."
}
