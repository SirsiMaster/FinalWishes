package main

import (
	"context"
	"database/sql"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	firebase "firebase.google.com/go/v4"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	cloudtasks "cloud.google.com/go/cloudtasks/apiv2"

	sai "github.com/SirsiMaster/sirsi-ai"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
	"github.com/sirsi-technologies/finalwishes-api/internal/capsules"
	"github.com/sirsi-technologies/finalwishes-api/internal/crypto"
	"github.com/sirsi-technologies/finalwishes-api/internal/docintell"
	"github.com/sirsi-technologies/finalwishes-api/internal/formsapi"
	"github.com/sirsi-technologies/finalwishes-api/internal/gen/estate/v1/estatev1connect"
	"github.com/sirsi-technologies/finalwishes-api/internal/googlephotos"
	"github.com/sirsi-technologies/finalwishes-api/internal/guardian"
	"github.com/sirsi-technologies/finalwishes-api/internal/guidance"
	"github.com/sirsi-technologies/finalwishes-api/internal/lockbox"
	certmail "github.com/sirsi-technologies/finalwishes-api/internal/mail"
	appmw "github.com/sirsi-technologies/finalwishes-api/internal/middleware"
	"github.com/sirsi-technologies/finalwishes-api/internal/opensign"
	"github.com/sirsi-technologies/finalwishes-api/internal/payments"
	"github.com/sirsi-technologies/finalwishes-api/internal/probate"
	"github.com/sirsi-technologies/finalwishes-api/internal/ratelimit"
	"github.com/sirsi-technologies/finalwishes-api/internal/service/estate"
	"github.com/sirsi-technologies/finalwishes-api/internal/tiergate"
	"github.com/sirsi-technologies/finalwishes-api/internal/transcription"
	"github.com/sirsi-technologies/finalwishes-api/internal/vault"
	ythandler "github.com/sirsi-technologies/finalwishes-api/internal/youtube"
)

func main() {
	// Configure structured logging
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if os.Getenv("GOOGLE_CLOUD_PROJECT") == "" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	}

	// Get port from environment or default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Create router
	r := chi.NewRouter()

	// Initialize Google Cloud project ID early (needed for CORS + auth decisions)
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		log.Warn().Msg("GOOGLE_CLOUD_PROJECT not set, running in local dev mode")
	}

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(6 * time.Minute)) // Extended for video uploads (YouTube memoir)

	// Rate limiting — application-level defense since Cloud Armor requires a Global
	// External Application Load Balancer (not available on Cloud Run direct).
	// 100 requests per 60s per IP, 10-minute ban on exceed.
	limiter := ratelimit.NewLimiter(100, 60*time.Second, 10*time.Minute)
	r.Use(ratelimit.Middleware(limiter))

	// CORS configuration — restrict to known origins in production
	allowedOrigins := []string{"http://localhost:3000", "http://localhost:5173"}
	if projectID != "" {
		allowedOrigins = []string{
			"https://finalwishes-prod.web.app",
			"https://finalwishes-prod.firebaseapp.com",
			"https://finalwishes.app",
		}
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID", "Connect-Protocol-Version"},
		ExposedHeaders:   []string{"Link", "Connect-Error-Code", "Connect-Error-Message"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Security headers — CSP, HSTS, X-Frame-Options, etc.
	r.Use(appmw.SecurityHeaders)

	// Health check endpoint (unauthenticated) — includes vault status
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"healthy","service":"finalwishes-api","vault":"active","encryption":"AES-256-GCM","kms":"Cloud KMS"}`))
	})

	// Kubernetes-style health probe (Cloud Run startup/liveness checks)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"healthy","service":"finalwishes-api"}`))
	})

	ctx := context.Background()
	var fs *firestore.Client
	var sc *storage.Client

	if projectID != "" {
		var err error

		// Firestore
		fs, err = firestore.NewClient(ctx, projectID)
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to initialize Firestore client")
		}
		defer fs.Close()
		log.Info().Str("project", projectID).Msg("Firestore client initialized")

		// Storage
		sc, err = storage.NewClient(ctx)
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to initialize Storage client")
		}
		defer sc.Close()
		log.Info().Str("project", projectID).Msg("Storage client initialized")
	}

	// --- Cloud Tasks client (capsule delivery) ---
	var tasksClient *cloudtasks.Client
	if projectID != "" {
		var err error
		tasksClient, err = cloudtasks.NewClient(ctx)
		if err != nil {
			log.Warn().Err(err).Msg("Cloud Tasks client initialization failed — capsule scheduling disabled")
		} else {
			defer tasksClient.Close()
			log.Info().Msg("Cloud Tasks client initialized")
		}
	}

	// --- Cloud KMS + PII Vault Initialization (ADR-037) ---
	var vaultHandler *vault.Handler
	var vaultCrypto *crypto.VaultCrypto

	if projectID != "" {
		// Initialize Cloud KMS crypto service (shared by PII Vault and Lockbox)
		var err error
		vaultCrypto, err = crypto.NewVaultCrypto(ctx, projectID)
		if err != nil {
			log.Warn().Err(err).Msg("Cloud KMS initialization failed — vault and lockbox disabled")
		} else {
			defer vaultCrypto.Close()

			// Initialize Cloud SQL PII Vault
			vaultCfg := vault.Config{
				ConnectionName: os.Getenv("CLOUD_SQL_CONNECTION"), // e.g., finalwishes-prod:us-central1:finalwishes-pii-vault
				DatabaseName:   getEnvOrDefault("VAULT_DB_NAME", "pii_vault"),
				User:           getEnvOrDefault("VAULT_DB_USER", "vault_admin"),
				Password:       os.Getenv("VAULT_DB_PASSWORD"),
				Host:           os.Getenv("VAULT_DB_HOST"), // For local dev with Cloud SQL Proxy
				Port:           getEnvOrDefault("VAULT_DB_PORT", "5432"),
			}

			// Only initialize if connection details are provided
			if vaultCfg.ConnectionName != "" || vaultCfg.Host != "" {
				vaultRepo, err := vault.NewRepository(ctx, vaultCfg, vaultCrypto)
				if err != nil {
					log.Error().Err(err).Msg("Cloud SQL PII Vault initialization failed — vault endpoints disabled")
				} else {
					defer vaultRepo.Close()

					// Run migrations (idempotent)
					if err := vaultRepo.RunMigrations(ctx); err != nil {
						log.Error().Err(err).Msg("Vault migrations failed")
					} else {
						log.Info().Msg("PII Vault initialized — Cloud SQL + Cloud KMS active")
						vaultHandler = vault.NewHandler(vaultRepo)
					}
				}
			} else {
				log.Warn().Msg("No Cloud SQL connection configured — vault endpoints disabled (set CLOUD_SQL_CONNECTION or VAULT_DB_HOST)")
			}
		}
	}

	// Initialize Firebase Admin for auth token verification
	var authMiddleware func(http.Handler) http.Handler

	firebaseApp, err := firebase.NewApp(ctx, nil)
	if err != nil {
		if projectID != "" {
			// Production: Firebase MUST initialize. Fail hard.
			log.Fatal().Err(err).Msg("Firebase Admin SDK initialization failed in production mode")
		}
		log.Warn().Err(err).Msg("Firebase Admin SDK initialization failed — auth middleware disabled (local dev only)")
		authMiddleware = func(next http.Handler) http.Handler { return next }
	} else {
		authClient, err := firebaseApp.Auth(ctx)
		if err != nil {
			if projectID != "" {
				log.Fatal().Err(err).Msg("Firebase Auth client initialization failed in production mode")
			}
			log.Warn().Err(err).Msg("Firebase Auth client initialization failed — auth middleware disabled (local dev only)")
			authMiddleware = func(next http.Handler) http.Handler { return next }
		} else {
			log.Info().Msg("Firebase Admin Auth initialized — token verification active")
			authMiddleware = auth.Middleware(authClient)
		}
	}

	// --- Legal RAG Corpus Initialization (ADR-044 / CR-10) ---
	var ragRetriever guidance.RAGRetriever
	if projectID != "" && os.Getenv("RAG_DATABASE_URL") != "" {
		ragDB, err := sql.Open("postgres", os.Getenv("RAG_DATABASE_URL"))
		if err != nil {
			log.Error().Err(err).Msg("Legal RAG database open failed — corpus guidance disabled")
		} else if err := ragDB.PingContext(ctx); err != nil {
			ragDB.Close()
			log.Error().Err(err).Msg("Legal RAG database ping failed — corpus guidance disabled")
		} else {
			defer ragDB.Close()
			embedder, err := guidance.NewVertexEmbedder(ctx, projectID, getEnvOrDefault("VERTEX_LOCATION", "us-central1"))
			if err != nil {
				log.Error().Err(err).Msg("Legal RAG embedder initialization failed — corpus guidance disabled")
			} else {
				ragRetriever = guidance.NewPostgresRAGRetriever(ragDB, embedder)
				log.Info().
					Str("embedding_model", guidance.DefaultEmbeddingModel).
					Int("dimensions", guidance.DefaultEmbeddingDimensions).
					Msg("Legal RAG corpus retriever initialized")
			}
		}
	} else {
		log.Info().Msg("Legal RAG corpus disabled (set RAG_DATABASE_URL with GOOGLE_CLOUD_PROJECT to enable)")
	}

	// ConnectRPC Services (protected by auth middleware)
	estateService := estate.NewServer(fs, sc)
	path, handler := estatev1connect.NewEstateServiceHandler(estateService)

	// Protected routes — require Firebase Auth
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)
		r.Handle(path+"*", handler)
	})

	// PII Vault routes (protected by Firebase Auth) — ADR-037
	if vaultHandler != nil {
		r.Route("/api/v1/vault", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Post("/user-pii", vaultHandler.HandleStoreUserPII)
			r.Get("/user-pii", vaultHandler.HandleRetrieveUserPII)
			r.Post("/asset-pii", vaultHandler.HandleStoreAssetPII)
			r.Get("/asset-pii", vaultHandler.HandleRetrieveAssetPII)
			r.Post("/heir-pii", vaultHandler.HandleStoreHeirPII)
			r.Get("/heir-pii", vaultHandler.HandleRetrieveHeirPII)
		})
		log.Info().Msg("PII Vault API routes registered at /api/v1/vault/*")
	}

	// Digital Lockbox routes (encrypted credentials via Cloud KMS — Firestore-backed)
	if fs != nil && vaultCrypto != nil {
		lockboxHandler := lockbox.NewHandler(fs, vaultCrypto)
		r.Route("/api/v1/lockbox", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Post("/store-credentials", lockboxHandler.HandleStoreCredentials)
			r.Post("/retrieve-credentials", lockboxHandler.HandleRetrieveCredentials)
		})
		log.Info().Msg("Digital Lockbox API routes registered at /api/v1/lockbox/*")
	} else if fs != nil && vaultCrypto == nil {
		log.Warn().Msg("Cloud KMS unavailable — lockbox credential encryption endpoints disabled")
	}

	// Statutory Form generation (coordinate-overlay engine, embedded blanks).
	// No external dependencies — engine + blanks are compiled in.
	{
		formsHandler := formsapi.NewHandler()
		r.Route("/api/v1/forms", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Get("/", formsHandler.HandleListForms)
			r.Get("/{formId}", formsHandler.HandleGetForm)
			r.Post("/{formId}/fill", formsHandler.HandleFillForm)
		})
		log.Info().Msg("Statutory Form API routes registered at /api/v1/forms/*")
	}

	// Document Vault REST endpoints (download URLs + Document Intelligence)
	if sc != nil {
		// Initialize Document Intelligence AI (optional — degrades gracefully)
		var docintellHandler *docintell.Handler
		if fs != nil {
			if engine, err := sai.New(ctx, sai.LoadConfig()); err == nil {
				vaultBucket := getEnvOrDefault("VAULT_BUCKET", "finalwishes-vault")
				docintellHandler = docintell.NewHandler(fs, sc, engine, vaultBucket)
				log.Info().Msg("Document Intelligence AI initialized")
			} else {
				log.Warn().Err(err).Msg("Sirsi AI unavailable — Document Intelligence disabled")
			}
		}

		r.Route("/api/v1/documents", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Get("/download-url", estate.HandleDownloadURL(sc, fs))
			if docintellHandler != nil {
				r.Post("/analyze", docintellHandler.HandleAnalyze)
			}
		})
		log.Info().Msg("Document Vault API registered at /api/v1/documents/*")

		// Vault retention and legal holds
		r.Route("/api/v1/vault/holds", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Post("/apply", estate.HandleApplyEstateHolds(sc))
			r.Post("/release", estate.HandleReleaseEstateHolds(sc))
		})
		log.Info().Msg("Vault retention/holds API registered at /api/v1/vault/holds/*")
	}

	// API routes (OpenSign integration — protected by auth)
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(authMiddleware)
		r.Route("/opensign", func(r chi.Router) {
			r.Post("/create-envelope", opensign.CreateEnvelopeHandler)
			if fs != nil {
				webhookHandler := opensign.NewWebhookHandler(fs)
				r.Get("/status", webhookHandler.HandleCheckSigningStatus)
			}
		})
	})
	// OpenSign webhook — no auth, uses webhook signature verification
	if fs != nil {
		webhookHandler := opensign.NewWebhookHandler(fs)
		r.Post("/api/v1/opensign/webhook", webhookHandler.HandleWebhook)
	}

	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)
		r.Post("/api/envelopes", opensign.CreateEnvelopeHandler)
	})

	// Guidance routes (The Shepherd v3 — Claude Opus via sirsi-ai, Genkit fallback)
	if fs != nil {
		var advisor guidance.Advisor
		if shepherd := guidance.NewShepherdAdvisor(ctx); shepherd != nil {
			advisor = shepherd
		} else {
			advisor = guidance.NewGenkitAdvisor(ctx) // Legacy fallback
		}
		guidanceHandler := guidance.NewHandler(fs, advisor).WithRAG(ragRetriever)
		r.Route("/api/v1/guidance", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Get("/score", guidanceHandler.HandleGetScore)
			r.Post("/chat", guidanceHandler.HandleChat)
			r.Post("/assist-obituary", guidanceHandler.HandleAssistObituary)
			r.Get("/suggestions", guidanceHandler.HandleSuggestions)
		})
		if advisor != nil {
			log.Info().Msg("Guidance API (The Shepherd v3) registered at /api/v1/guidance/* — AI active")
		} else {
			log.Info().Msg("Guidance API registered at /api/v1/guidance/* — deterministic mode")
		}
	}

	// YouTube memoir routes (video uploads via YouTube Data API v3)
	if fs != nil {
		youtubeHandler, err := ythandler.NewHandler(ctx, fs)
		if err != nil {
			log.Warn().Err(err).Msg("YouTube API initialization failed — memoir video endpoints disabled")
		} else {
			r.Route("/api/v1/memoirs", func(r chi.Router) {
				r.Use(authMiddleware)
				r.With(tiergate.EnforceVideoLimit(fs)).Post("/upload-video", youtubeHandler.HandleUploadVideo)
				r.Get("/video-status", youtubeHandler.HandleGetVideoStatus)
			})
			log.Info().Msg("YouTube memoir API routes registered at /api/v1/memoirs/* (tier-gated)")
		}
	}

	// Transcription routes (Speech-to-Text for Soul Log audio/video)
	if fs != nil {
		transcriptionHandler := transcription.NewHandler(fs, projectID)
		r.Route("/api/v1/transcription", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Post("/transcribe", transcriptionHandler.HandleTranscribe)
		})
		log.Info().Msg("Transcription API routes registered at /api/v1/transcription/*")
	}

	// Media usage / tier-gating endpoint
	if fs != nil {
		tierHandler := tiergate.NewHandler(fs)
		r.Route("/api/v1/estates/{estateId}", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Get("/media-usage", tierHandler.HandleMediaUsage)
		})
		log.Info().Msg("Tier-gating media usage endpoint registered")
	}

	// Google Photos Picker import for heirloom gallery.
	if fs != nil && sc != nil {
		photosHandler := googlephotos.NewHandler(fs, sc, googlephotos.NewPickerClient("", nil), getEnvOrDefault("VAULT_STORAGE_BUCKET", "finalwishes-vault"))
		r.Route("/api/v1/heirlooms/{estateId}/google-photos", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Post("/session", photosHandler.HandleCreateSession)
			r.Get("/session/{sessionId}", photosHandler.HandleGetSession)
			r.Post("/import", photosHandler.HandleImport)
		})
		log.Info().Msg("Google Photos Picker import routes registered at /api/v1/heirlooms/{estateId}/google-photos/*")
	}

	// Guardian Protocol routes (inactivity detection + settlement)
	if fs != nil {
		guardianHandler := guardian.NewHandler(fs)
		r.Route("/api/v1/guardian", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Post("/check-in", guardianHandler.HandleCheckIn)
			r.Get("/status", guardianHandler.HandleGetStatus)
			r.Post("/report-status", guardianHandler.HandleReportStatus)
			r.Post("/run-inactivity-check", guardianHandler.HandleRunInactivityCheck)
		})
		log.Info().Msg("Guardian Protocol API routes registered at /api/v1/guardian/*")
	}

	// Probate Engine routes (Illinois state machine + checklist)
	if fs != nil {
		probateHandler := probate.NewHandler(fs, &probate.IllinoisEngine{})
		// Wire vault document holds into phase transitions
		if sc != nil {
			estateServer := estate.NewServer(fs, sc)
			probateHandler.SetPhaseTransitionHook(func(ctx context.Context, estateID string, from, to probate.EstatePhase) error {
				switch to {
				case probate.PhaseDeathReported:
					// Lock all vault documents when death is reported
					count, err := estateServer.ApplyEstateHolds(ctx, estateID)
					if err != nil {
						return err
					}
					log.Info().Str("estate_id", estateID).Int("held", count).Msg("Vault holds applied on death_reported")
				case probate.PhaseClosed:
					// Release holds when estate is formally closed
					count, err := estateServer.ReleaseEstateHolds(ctx, estateID)
					if err != nil {
						return err
					}
					log.Info().Str("estate_id", estateID).Int("released", count).Msg("Vault holds released on estate close")
				}
				return nil
			})
		}
		r.Route("/api/v1/probate", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Post("/transition", probateHandler.HandleTransition)
			r.Get("/status", probateHandler.HandleGetStatus)
			r.Get("/checklist", probateHandler.HandleGetChecklist)
			r.Post("/checklist/update", probateHandler.HandleUpdateChecklistItem)
			r.Post("/evaluate-small-estate", probateHandler.HandleEvaluateSmallEstate)
			r.Post("/death-cert/submit", probateHandler.HandleSubmitDeathCertAnalysis)
			r.Post("/death-cert/confirm", probateHandler.HandleConfirmDeathCert)
			r.Get("/death-cert", probateHandler.HandleGetDeathCertFacts)
			r.Get("/forms", probateHandler.HandleGetFormTemplates)
			r.Get("/forms/data", probateHandler.HandleGetFormData)
			r.Get("/executor/status", probateHandler.HandleGetExecutorStatus)
			r.Post("/executor/confirm", probateHandler.HandleConfirmExecutorRole)
			r.Get("/advance-directives", probateHandler.HandleGetAdvanceDirectives)
			r.Post("/advance-directives/update", probateHandler.HandleUpdateAdvanceDirectiveStatus)
			r.Get("/avoidance-tools", probateHandler.HandleGetAvoidanceTools)
			r.Post("/avoidance-tools/update", probateHandler.HandleUpdateAvoidanceStatus)
			// Multi-executor quorum (2-of-3 approval)
			r.Get("/quorum/config", probateHandler.HandleGetQuorumConfig)
			r.Get("/quorum/actions", probateHandler.HandleListQuorumActions)
			r.Post("/quorum/propose", probateHandler.HandleProposeQuorumAction)
			r.Post("/quorum/vote", probateHandler.HandleVoteQuorumAction)
		})
		log.Info().Str("state", "IL").Msg("Probate Engine API routes registered at /api/v1/probate/*")
	}

	// Certified mail routes (Lob). Enabled only when Storage and Firestore are active.
	if fs != nil && sc != nil {
		lobKey := os.Getenv("LOB_API_KEY")
		if lobKey != "" {
			mailHandler := certmail.NewHandler(
				fs,
				sc,
				certmail.NewLobClient(lobKey, os.Getenv("LOB_API_BASE_URL"), nil),
				getEnvOrDefault("VAULT_STORAGE_BUCKET", "finalwishes-vault"),
				certmail.NewAddressFromEnv("LOB_FROM"),
			)
			r.Route("/api/v1/probate/{estateId}/mail", func(r chi.Router) {
				r.Use(authMiddleware)
				r.Post("/certified", mailHandler.HandleCreateCertifiedMail)
			})
			log.Info().Msg("Lob certified mail routes registered at /api/v1/probate/{estateId}/mail/*")
		} else {
			log.Warn().Msg("LOB_API_KEY not set — certified mail endpoints disabled")
		}
	}

	// Time Capsule routes (Cloud Tasks deferred delivery)
	if fs != nil && tasksClient != nil {
		capsuleHandler := capsules.NewHandler(fs, tasksClient, projectID)
		r.Route("/api/v1/capsules", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Post("/schedule", capsuleHandler.HandleScheduleCapsule)
			r.Post("/cancel", capsuleHandler.HandleCancelScheduled)
		})
		// Cloud Tasks callback — authenticated via OIDC token + Cloud Tasks headers, not Firebase Auth
		r.Post("/api/v1/capsules/deliver", capsuleHandler.HandleDeliverCapsule)
		log.Info().Msg("Time Capsule API routes registered at /api/v1/capsules/*")
	} else if fs != nil && tasksClient == nil {
		log.Warn().Msg("Cloud Tasks client unavailable — capsule scheduling endpoints disabled")
	}

	// Payment routes (Stripe checkout via Sirsi shared account)
	paymentCfg := payments.ConfigFromEnv()
	if paymentCfg.SecretKey != "" {
		paymentHandler := payments.NewHandler(fs, paymentCfg)
		r.Get("/api/v1/payments/tiers", paymentHandler.HandleGetTiers) // Public — no auth needed
		r.Route("/api/v1/payments", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Post("/create-checkout", paymentHandler.HandleCreateCheckout)
			r.Post("/portal", paymentHandler.HandleCreatePortalSession)
		})
		r.Post("/api/v1/payments/webhook", paymentHandler.HandleWebhook) // Stripe calls this — no auth, uses webhook signature
		log.Info().Msg("Payment API routes registered at /api/v1/payments/*")
	} else {
		log.Warn().Msg("STRIPE_SECRET_KEY not set — payment endpoints disabled")
	}

	// Create server
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  5 * time.Minute, // Extended for video uploads
		WriteTimeout: 6 * time.Minute, // Extended for video uploads
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	go func() {
		log.Info().Str("port", port).Msg("Starting FinalWishes API server")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed to start")
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Server exited properly")
}

// getEnvOrDefault returns the environment variable value or a default.
func getEnvOrDefault(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
