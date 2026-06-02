// Package payments implements Stripe checkout and webhook handling for FinalWishes.
//
// Currently uses Sirsi's shared Stripe account (STRIPE_SECRET_KEY).
// Post-launch: swap to FinalWishes-specific Stripe keys via env vars.
package payments

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/stripe/stripe-go/v81"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
	portalsession "github.com/stripe/stripe-go/v81/billingportal/session"
	"github.com/stripe/stripe-go/v81/checkout/session"
	"github.com/stripe/stripe-go/v81/webhook"

	"cloud.google.com/go/firestore"
)

// Handler holds dependencies for payment endpoints.
type Handler struct {
	fs             *firestore.Client
	webhookSecret  string
	successURL     string
	cancelURL      string
	appBaseURL     string
	publishableKey string
}

// Config holds payment configuration from environment.
type Config struct {
	SecretKey      string // STRIPE_SECRET_KEY
	WebhookSecret  string // STRIPE_WEBHOOK_SECRET
	PublishableKey string // STRIPE_PUBLISHABLE_KEY
	SuccessURL     string // STRIPE_SUCCESS_URL (e.g., https://finalwishes-prod.web.app/estates/{ESTATE_ID}/settings?payment=success)
	CancelURL      string // STRIPE_CANCEL_URL
	AppBaseURL     string // APP_BASE_URL (e.g., https://finalwishes.app)
}

// Tier represents a pricing tier.
type Tier struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	PriceCents  int64    `json:"priceCents"`
	Interval    string   `json:"interval"` // "month" or "year" or "one_time"
	Features    []string `json:"features"`
}

// DefaultTiers are the FinalWishes pricing tiers.
// These match the contract: Concierge ($95K one-time for the platform build).
// For end-users, the tiers are subscription-based.
var DefaultTiers = []Tier{
	{
		ID:          "free",
		Name:        "Guardian",
		Description: "Essential estate organization",
		PriceCents:  0,
		Interval:    "month",
		Features: []string{
			"1 estate plan",
			"5 document uploads",
			"Basic asset inventory",
			"Email support",
		},
	},
	{
		ID:          "concierge",
		Name:        "Concierge",
		Description: "Complete legacy management",
		PriceCents:  2900,
		Interval:    "month",
		Features: []string{
			"Unlimited estate plans",
			"Unlimited document uploads",
			"PII encryption vault",
			"Video memorials",
			"Digital lockbox",
			"Time capsules",
			"Priority support",
		},
	},
	{
		ID:          "white_glove",
		Name:        "White Glove",
		Description: "Premium estate concierge with legal guidance",
		PriceCents:  9900,
		Interval:    "month",
		Features: []string{
			"Everything in Concierge",
			"AI guidance engine",
			"Legal document review",
			"Dedicated estate advisor",
			"Multi-executor coordination",
			"Probate preparation",
			"Phone support",
		},
	},
}

// TierLimits defines upload quotas for each tier.
type TierLimits struct {
	MaxMedia  int // -1 = unlimited
	MaxVideos int // -1 = unlimited
}

// DefaultTierLimits maps tier IDs to their upload quotas.
var DefaultTierLimits = map[string]TierLimits{
	"free":        {MaxMedia: 10, MaxVideos: 0},
	"concierge":   {MaxMedia: 25, MaxVideos: 0},
	"white_glove": {MaxMedia: -1, MaxVideos: -1},
}

// GetTierLimits returns upload limits for a tier (defaults to free).
func GetTierLimits(tierID string) TierLimits {
	if lim, ok := DefaultTierLimits[tierID]; ok {
		return lim
	}
	return DefaultTierLimits["free"]
}

// NewHandler creates a payment handler with Stripe configured.
func NewHandler(fs *firestore.Client, cfg Config) *Handler {
	stripe.Key = cfg.SecretKey
	return &Handler{
		fs:             fs,
		webhookSecret:  cfg.WebhookSecret,
		successURL:     cfg.SuccessURL,
		cancelURL:      cfg.CancelURL,
		appBaseURL:     cfg.AppBaseURL,
		publishableKey: cfg.PublishableKey,
	}
}

// HandleGetTiers returns available pricing tiers.
func (h *Handler) HandleGetTiers(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"tiers":          DefaultTiers,
		"publishableKey": h.publishableKey,
	})
}

// HandleCreateCheckout creates a Stripe Checkout session.
func (h *Handler) HandleCreateCheckout(w http.ResponseWriter, r *http.Request) {
	// Verify authenticated caller
	callerUID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Parse request
	var req struct {
		TierID   string `json:"tierId"`
		EstateID string `json:"estateId"`
		UserID   string `json:"userId"`
		Email    string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.TierID == "" || req.EstateID == "" {
		writeError(w, http.StatusBadRequest, "tierId and estateId are required")
		return
	}

	// Enforce caller identity — prevent cross-user checkout
	if req.UserID != "" && req.UserID != callerUID {
		writeError(w, http.StatusForbidden, "Cannot create checkout for another user")
		return
	}
	req.UserID = callerUID // Always use the authenticated UID

	// Verify caller owns this estate (principal check via estate_users)
	if h.fs != nil {
		euDocID := callerUID + "_" + req.EstateID
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		euSnap, fsErr := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
		if fsErr != nil || !euSnap.Exists() {
			writeError(w, http.StatusForbidden, "You do not have access to this estate")
			return
		}
	}

	// Find tier
	var tier *Tier
	for _, t := range DefaultTiers {
		if t.ID == req.TierID {
			tier = &t
			break
		}
	}
	if tier == nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("Unknown tier: %s", req.TierID))
		return
	}

	if tier.PriceCents == 0 {
		writeError(w, http.StatusBadRequest, "Free tier does not require checkout")
		return
	}

	// Build success/cancel URLs with estate context
	successURL := h.successURL
	cancelURL := h.cancelURL
	if successURL == "" {
		successURL = fmt.Sprintf("%s/estates/%s/settings?payment=success&session_id={CHECKOUT_SESSION_ID}", h.webAppBaseURL(), req.EstateID)
	}
	if cancelURL == "" {
		cancelURL = fmt.Sprintf("%s/estates/%s/pricing?payment=cancelled", h.webAppBaseURL(), req.EstateID)
	}

	// Create Stripe Checkout Session
	mode := stripe.String(string(stripe.CheckoutSessionModeSubscription))
	if tier.Interval == "one_time" {
		mode = stripe.String(string(stripe.CheckoutSessionModePayment))
	}

	params := &stripe.CheckoutSessionParams{
		Mode: mode,
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency:   stripe.String("usd"),
					UnitAmount: stripe.Int64(tier.PriceCents),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(fmt.Sprintf("FinalWishes %s Plan", tier.Name)),
						Description: stripe.String(tier.Description),
					},
				},
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		Metadata: map[string]string{
			"estate_id": req.EstateID,
			"user_id":   req.UserID,
			"tier_id":   req.TierID,
			"source":    "finalwishes",
		},
	}

	// Add recurring interval for subscriptions
	if tier.Interval == "month" || tier.Interval == "year" {
		params.LineItems[0].PriceData.Recurring = &stripe.CheckoutSessionLineItemPriceDataRecurringParams{
			Interval: stripe.String(tier.Interval),
		}
	}

	// Set customer email if provided
	if req.Email != "" {
		params.CustomerEmail = stripe.String(req.Email)
	}

	sess, err := session.New(params)
	if err != nil {
		log.Error().Err(err).Str("tier", req.TierID).Str("estate", req.EstateID).Msg("Stripe checkout session creation failed")
		writeError(w, http.StatusInternalServerError, "Failed to create checkout session")
		return
	}

	log.Info().Str("session_id", sess.ID).Str("tier", req.TierID).Str("estate", req.EstateID).Msg("Stripe checkout session created")

	writeJSON(w, http.StatusOK, map[string]string{
		"sessionId":   sess.ID,
		"checkoutUrl": sess.URL,
	})
}

// HandleCreatePortalSession creates a Stripe Billing Portal session so the user
// can manage their subscription (cancel, change plan, update payment method).
//
// PREREQUISITE: The Stripe Customer Portal must be configured in the Stripe Dashboard
// (Settings > Billing > Customer Portal). Without this configuration, the portal URL
// will return a Stripe error. This is a one-time manual step for the account owner.
func (h *Handler) HandleCreatePortalSession(w http.ResponseWriter, r *http.Request) {
	// Verify authenticated caller
	callerUID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Parse request
	var req struct {
		EstateID string `json:"estateId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.EstateID == "" {
		writeError(w, http.StatusBadRequest, "estateId is required")
		return
	}

	// Verify caller has access to this estate
	if h.fs != nil {
		euDocID := callerUID + "_" + req.EstateID
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		euSnap, fsErr := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
		if fsErr != nil || !euSnap.Exists() {
			writeError(w, http.StatusForbidden, "You do not have access to this estate")
			return
		}
	}

	// Look up the Stripe customer ID from the estate document
	if h.fs == nil {
		writeError(w, http.StatusServiceUnavailable, "Firestore unavailable")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	estateSnap, err := h.fs.Collection("estates").Doc(req.EstateID).Get(ctx)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to fetch estate for portal session")
		writeError(w, http.StatusNotFound, "Estate not found")
		return
	}

	customerID, _ := estateSnap.DataAt("stripeCustomerId")
	customerIDStr, ok := customerID.(string)
	if !ok || customerIDStr == "" {
		writeError(w, http.StatusBadRequest, "No active subscription found. Please subscribe to a plan first.")
		return
	}

	// Verify the subscription is still active before creating a portal session.
	// A cancelled subscription still has a stripeCustomerId but shouldn't get portal access.
	paymentStatus, _ := estateSnap.DataAt("paymentStatus")
	if paymentStatus == "cancelled" {
		writeError(w, http.StatusBadRequest, "Your subscription has been cancelled. Please subscribe to a new plan to manage billing.")
		return
	}

	// Build return URL — user returns here after managing subscription
	returnURL := fmt.Sprintf("%s/estates/%s/settings", h.webAppBaseURL(), req.EstateID)
	if os.Getenv("GOOGLE_CLOUD_PROJECT") == "" {
		returnURL = fmt.Sprintf("http://localhost:5173/estates/%s/settings", req.EstateID)
	}

	// Create Stripe Billing Portal session
	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerIDStr),
		ReturnURL: stripe.String(returnURL),
	}

	sess, err := portalsession.New(params)
	if err != nil {
		log.Error().Err(err).Str("customer_id", customerIDStr).Str("estate_id", req.EstateID).Msg("Stripe portal session creation failed")
		writeError(w, http.StatusInternalServerError, "Failed to create subscription management session")
		return
	}

	log.Info().Str("estate_id", req.EstateID).Str("customer_id", customerIDStr).Msg("Stripe portal session created")

	writeJSON(w, http.StatusOK, map[string]string{
		"url": sess.URL,
	})
}

// HandleWebhook processes Stripe webhook events.
func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 65536))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Failed to read body")
		return
	}

	// Verify webhook signature — fail closed in production
	var event stripe.Event
	if h.webhookSecret != "" {
		event, err = webhook.ConstructEvent(body, r.Header.Get("Stripe-Signature"), h.webhookSecret)
		if err != nil {
			log.Warn().Err(err).Msg("Stripe webhook signature verification failed")
			writeError(w, http.StatusBadRequest, "Invalid webhook signature")
			return
		}
	} else if os.Getenv("GOOGLE_CLOUD_PROJECT") != "" {
		// Production with missing secret — reject all webhooks (fail closed)
		log.Error().Msg("STRIPE_WEBHOOK_SECRET not configured in production — rejecting webhook")
		writeError(w, http.StatusServiceUnavailable, "Webhook not configured")
		return
	} else {
		// Local dev only: no signature verification
		if err := json.Unmarshal(body, &event); err != nil {
			writeError(w, http.StatusBadRequest, "Invalid event JSON")
			return
		}
		log.Warn().Msg("Stripe webhook signature verification DISABLED (local dev only)")
	}

	switch event.Type {
	case "checkout.session.completed":
		h.handleCheckoutCompleted(event)
	case "checkout.session.expired":
		h.handleCheckoutExpired(event)
	case "customer.subscription.deleted":
		h.handleSubscriptionCancelled(event)
	default:
		log.Debug().Str("type", string(event.Type)).Msg("Unhandled Stripe event")
	}

	w.WriteHeader(http.StatusOK)
}

func (h *Handler) handleCheckoutCompleted(event stripe.Event) {
	var sess stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
		log.Error().Err(err).Msg("Failed to parse checkout session from webhook")
		return
	}

	estateID := sess.Metadata["estate_id"]
	tierID := sess.Metadata["tier_id"]
	userID := sess.Metadata["user_id"]

	if estateID == "" || tierID == "" {
		log.Warn().Str("session_id", sess.ID).Msg("Checkout completed but missing metadata")
		return
	}

	log.Info().
		Str("session_id", sess.ID).
		Str("estate_id", estateID).
		Str("tier_id", tierID).
		Str("user_id", userID).
		Int64("amount", sess.AmountTotal).
		Msg("Payment completed")

	// Update estate tier in Firestore
	if h.fs != nil {
		fctx, cancel := newCtx()
		defer cancel()
		_, err := h.fs.Collection("estates").Doc(estateID).Set(fctx, map[string]interface{}{
			"tier":             tierID,
			"tierUpdatedAt":    time.Now(),
			"stripeSessionId":  sess.ID,
			"stripeCustomerId": sess.Customer,
			"subscriptionId":   sess.Subscription,
			"paymentStatus":    "active",
		}, firestore.MergeAll)
		if err != nil {
			log.Error().Err(err).Str("estate_id", estateID).Msg("Failed to update estate tier in Firestore")
		}

		// Write payment record
		_, _, err = h.fs.Collection("payments").Add(fctx, map[string]interface{}{
			"estateId":        estateID,
			"userId":          userID,
			"tierId":          tierID,
			"stripeSessionId": sess.ID,
			"amountCents":     sess.AmountTotal,
			"currency":        string(sess.Currency),
			"status":          "completed",
			"createdAt":       time.Now(),
		})
		if err != nil {
			log.Error().Err(err).Str("estate_id", estateID).Msg("Failed to write payment record")
		}
	}
}

func (h *Handler) handleCheckoutExpired(event stripe.Event) {
	var sess stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
		log.Error().Err(err).Str("event_id", event.ID).Msg("Failed to parse expired checkout session from webhook")
		return
	}
	log.Info().Str("session_id", sess.ID).Str("estate_id", sess.Metadata["estate_id"]).Msg("Checkout session expired")
}

func (h *Handler) handleSubscriptionCancelled(event stripe.Event) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		log.Error().Err(err).Str("event_id", event.ID).Msg("Failed to parse subscription cancellation from webhook")
		return
	}

	estateID := sub.Metadata["estate_id"]
	if estateID == "" || h.fs == nil {
		log.Warn().Str("subscription_id", sub.ID).Msg("Subscription cancelled but no estate_id in metadata")
		return
	}

	fctx, cancel := newCtx()
	defer cancel()

	// HIGH-2 fix: verify this subscription actually belongs to the estate
	// before downgrading. Prevents metadata spoofing via crafted webhooks.
	estateSnap, err := h.fs.Collection("estates").Doc(estateID).Get(fctx)
	if err != nil {
		log.Error().Err(err).Str("estate_id", estateID).Msg("Failed to fetch estate for subscription cancel verification")
		return
	}
	storedSubID, _ := estateSnap.DataAt("subscriptionId")
	if storedSubID != sub.ID {
		log.Warn().
			Str("estate_id", estateID).
			Str("webhook_sub", sub.ID).
			Interface("stored_sub", storedSubID).
			Msg("Subscription cancel rejected — subscription ID mismatch")
		return
	}

	_, err = h.fs.Collection("estates").Doc(estateID).Set(fctx, map[string]interface{}{
		"tier":          "free",
		"tierUpdatedAt": time.Now(),
		"paymentStatus": "cancelled",
	}, firestore.MergeAll)
	if err != nil {
		log.Error().Err(err).Str("estate_id", estateID).Msg("Failed to downgrade estate tier")
	}

	log.Info().Str("subscription_id", sub.ID).Str("estate_id", estateID).Msg("Subscription cancelled — downgraded to free")
}

// ctx returns a background context with timeout for Firestore writes in webhooks.
func newCtx() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

// ── Helpers ──

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]interface{}{
		"error": map[string]interface{}{
			"code":    http.StatusText(status),
			"message": message,
		},
	})
}

// ConfigFromEnv reads payment config from environment variables.
func ConfigFromEnv() Config {
	return Config{
		SecretKey:      os.Getenv("STRIPE_SECRET_KEY"),
		WebhookSecret:  os.Getenv("STRIPE_WEBHOOK_SECRET"),
		PublishableKey: os.Getenv("STRIPE_PUBLISHABLE_KEY"),
		SuccessURL:     os.Getenv("STRIPE_SUCCESS_URL"),
		CancelURL:      os.Getenv("STRIPE_CANCEL_URL"),
		AppBaseURL:     os.Getenv("APP_BASE_URL"),
	}
}

func (h *Handler) webAppBaseURL() string {
	if h.appBaseURL != "" {
		return h.appBaseURL
	}
	return "https://finalwishes-prod.web.app"
}
