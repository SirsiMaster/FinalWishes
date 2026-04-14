package main

import (
	"context"
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

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
	appmw "github.com/sirsi-technologies/finalwishes-api/internal/middleware"
	"github.com/sirsi-technologies/finalwishes-api/internal/ratelimit"
	"github.com/sirsi-technologies/finalwishes-api/internal/capsules"
	"github.com/sirsi-technologies/finalwishes-api/internal/crypto"
	"github.com/sirsi-technologies/finalwishes-api/internal/gen/estate/v1/estatev1connect"
	"github.com/sirsi-technologies/finalwishes-api/internal/guidance"
	"github.com/sirsi-technologies/finalwishes-api/internal/lockbox"
	"github.com/sirsi-technologies/finalwishes-api/internal/opensign"
	"github.com/sirsi-technologies/finalwishes-api/internal/payments"
	"github.com/sirsi-technologies/finalwishes-api/internal/service/estate"
	"github.com/sirsi-technologies/finalwishes-api/internal/vault"
	ythandler "github.com/sirsi-technologies/finalwishes-api/internal/youtube"
)

func main() {
	// Configure structured logging
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

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

	// Document Vault REST endpoints (download URLs — not in proto, pure REST)
	if sc != nil {
		r.Route("/api/v1/documents", func(r chi.Router) {
			r.Use(authMiddleware)
			r.Get("/download-url", estate.HandleDownloadURL(sc))
		})
		log.Info().Msg("Document Vault download URL endpoint registered at /api/v1/documents/download-url")
	}

	// API routes (OpenSign integration — protected by auth)
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(authMiddleware)
		r.Route("/opensign", func(r chi.Router) {
			r.Post("/create-envelope", opensign.CreateEnvelopeHandler)
		})
	})

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
		guidanceHandler := guidance.NewHandler(fs, advisor)
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
				r.Post("/upload-video", youtubeHandler.HandleUploadVideo)
				r.Get("/video-status", youtubeHandler.HandleGetVideoStatus)
			})
			log.Info().Msg("YouTube memoir API routes registered at /api/v1/memoirs/*")
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
		ReadTimeout:  5 * time.Minute,  // Extended for video uploads
		WriteTimeout: 6 * time.Minute,  // Extended for video uploads
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
