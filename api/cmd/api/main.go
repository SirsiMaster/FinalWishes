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
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/gen/estate/v1/estatev1connect"
	"github.com/sirsi-technologies/finalwishes-api/internal/opensign"
	"github.com/sirsi-technologies/finalwishes-api/internal/service/estate"
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

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // For local development, will be restricted in production
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID", "Connect-Protocol-Version"},
		ExposedHeaders:   []string{"Link", "Connect-Error-Code", "Connect-Error-Message"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("FinalWishes API is running"))
	})

	// Initialize Google Firestore Client
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		log.Warn().Msg("GOOGLE_CLOUD_PROJECT not set, running in mock mode")
	}

	var fs *firestore.Client
	var sc *storage.Client

	if projectID != "" {
		ctx := context.Background()
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

	// ConnectRPC Services
	estateService := estate.NewServer(fs, sc)
	path, handler := estatev1connect.NewEstateServiceHandler(estateService)
	r.Handle(path+"*", handler)

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/opensign", func(r chi.Router) {
			r.Post("/create-envelope", opensign.CreateEnvelopeHandler)
		})
	})

	r.Post("/api/guest/envelopes", opensign.CreateEnvelopeHandler)
	r.Post("/api/envelopes", opensign.CreateEnvelopeHandler)

	// Create server
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
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

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Server exited properly")
}
