# Technical Design Document
## FinalWishes - The Estate Operating System
**Version:** 2.0.0
**Date:** December 5, 2025

---

## 1. Overview

This document provides detailed technical design specifications for key system components, integration patterns, and implementation guidelines.

**Technology Stack:**
- Backend: Go on Cloud Run
- Frontend: React 18 + Vite
- Mobile: React Native + Expo
- Database: Firestore + Cloud SQL
- Auth: Firebase Authentication
- Storage: Cloud Storage + Cloud KMS

---

## 2. Authentication & Authorization

### 2.1 Firebase Auth Integration

**Configuration:**
```go
// Firebase Auth configuration
import (
    firebase "firebase.google.com/go/v4"
    "firebase.google.com/go/v4/auth"
)

func initFirebaseAuth(ctx context.Context) (*auth.Client, error) {
    app, err := firebase.NewApp(ctx, nil)
    if err != nil {
        return nil, fmt.Errorf("error initializing firebase: %v", err)
    }
    return app.Auth(ctx)
}
```

**Token Validation Middleware:**
```go
func AuthMiddleware(authClient *auth.Client) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Extract token from Authorization header
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
                respondError(w, 401, "Missing authorization token")
                return
            }
            
            idToken := strings.TrimPrefix(authHeader, "Bearer ")
            
            // Verify Firebase ID token
            token, err := authClient.VerifyIDToken(r.Context(), idToken)
            if err != nil {
                respondError(w, 401, "Invalid token")
                return
            }
            
            // Add user context
            ctx := context.WithValue(r.Context(), "uid", token.UID)
            ctx = context.WithValue(ctx, "email", token.Claims["email"])
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

### 2.2 Multi-Factor Authentication

**TOTP Implementation:**
- Firebase Auth handles MFA enrollment
- Backup codes: 10 single-use codes stored in Firestore (hashed)
- Recovery: Email-based with identity verification

### 2.3 Role-Based Access Control

**Permission Matrix:**

| Resource | Principal | Executor (Pre-Death) | Executor (Post-Death) | Heir |
|----------|-----------|---------------------|----------------------|------|
| Estate | CRUD | R | CRUD | R |
| Assets | CRUD | - | RU | R |
| Documents | CRUD | - | CRUD | R |
| Beneficiaries | CRUD | - | R | - |
| Notifications | - | - | CRUD | R |

**Implementation:**
```go
type Role string

const (
    RolePrincipal Role = "principal"
    RoleExecutor  Role = "executor"
    RoleHeir      Role = "heir"
)

type EstateRole struct {
    EstateID string
    UserID   string
    Role     Role
    Active   bool
}

func (s *AuthService) CheckPermission(ctx context.Context, estateID, action string) error {
    uid := ctx.Value("uid").(string)
    
    // Get user's role for this estate from Firestore
    role, err := s.repo.GetEstateRole(ctx, estateID, uid)
    if err != nil {
        return ErrUnauthorized
    }
    
    // Check estate status for executor permissions
    estate, _ := s.estateRepo.Get(ctx, estateID)
    if role.Role == RoleExecutor && estate.Status == "active" {
        return ErrAccessDenied // No access pre-death
    }
    
    if !hasPermission(role.Role, action, estate.Status) {
        return ErrAccessDenied
    }
    
    return nil
}
```

---

## 3. Document Management

### 3.1 Upload Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client  │────▶│   API   │────▶│ Cloud   │────▶│Document │
│         │     │         │     │ Storage │     │ Analysis│
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │               │               │
     │  1. Request   │               │               │
     │  upload URL   │               │               │
     │──────────────▶│               │               │
     │               │  2. Generate  │               │
     │  3. Signed    │  signed URL   │               │
     │     URL + DEK │               │               │
     │◀──────────────│               │               │
     │               │               │               │
     │  4. Client encrypts with DEK  │               │
     │  5. Upload encrypted file     │               │
     │──────────────────────────────▶│               │
     │               │               │  6. Trigger   │
     │               │               │──────────────▶│
     │               │  7. Update    │               │
     │               │  document     │  8. OCR/AI    │
     │               │◀──────────────┼───────────────│
     │  9. Confirm   │               │               │
     │◀──────────────│               │               │
```

**Signed URL Generation with Encryption Key:**
```go
func (s *DocumentService) GenerateUploadURL(ctx context.Context, estateID, filename string) (*UploadURLResponse, error) {
    // Generate unique document ID
    docID := uuid.New().String()
    
    // Generate Cloud Storage signed URL
    bucket := s.storageClient.Bucket(s.config.Bucket)
    key := fmt.Sprintf("estates/%s/documents/%s/%s", estateID, docID, sanitizeFilename(filename))
    
    opts := &storage.SignedURLOptions{
        Method:      "PUT",
        Expires:     time.Now().Add(15 * time.Minute),
        ContentType: "application/octet-stream",
    }
    
    url, err := bucket.SignedURL(key, opts)
    if err != nil {
        return nil, fmt.Errorf("failed to generate signed URL: %w", err)
    }
    
    // Generate data encryption key via Cloud KMS
    dek, encryptedDEK, err := s.kmsService.GenerateDataKey(ctx, estateID)
    if err != nil {
        return nil, fmt.Errorf("failed to generate DEK: %w", err)
    }
    
    // Store document metadata in Firestore
    doc := &Document{
        ID:              docID,
        EstateID:        estateID,
        OriginalName:    filename,
        StorageKey:      key,
        EncryptedDEK:    encryptedDEK, // Store encrypted DEK only
        Status:          "pending",
        CreatedAt:       time.Now(),
    }
    
    if err := s.repo.Create(ctx, doc); err != nil {
        return nil, err
    }
    
    return &UploadURLResponse{
        UploadURL:    url,
        DocumentID:   docID,
        PlaintextDEK: dek, // Client uses this to encrypt, then discards
        ExpiresAt:    time.Now().Add(15 * time.Minute),
    }, nil
}
```

### 3.2 Client-Side Encryption

**Browser/React Native Implementation:**
```typescript
// Client-side encryption using Web Crypto API
async function encryptDocument(
  file: ArrayBuffer,
  plaintextDEK: Uint8Array
): Promise<ArrayBuffer> {
  // Import the DEK as a CryptoKey
  const key = await crypto.subtle.importKey(
    'raw',
    plaintextDEK,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the document
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    file
  );

  // Prepend IV to ciphertext
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);

  return result.buffer;
}
```

### 3.3 Cloud KMS Integration

**Data Encryption Key Management:**
```go
type KMSService struct {
    client    *kms.KeyManagementClient
    keyName   string // projects/{project}/locations/{location}/keyRings/{keyRing}/cryptoKeys/{key}
}

func (s *KMSService) GenerateDataKey(ctx context.Context, estateID string) ([]byte, []byte, error) {
    // Generate a random 256-bit data encryption key
    dek := make([]byte, 32)
    if _, err := rand.Read(dek); err != nil {
        return nil, nil, err
    }
    
    // Encrypt the DEK with Cloud KMS
    req := &kmspb.EncryptRequest{
        Name:      s.keyName,
        Plaintext: dek,
        AdditionalAuthenticatedData: []byte(estateID), // Bind to estate
    }
    
    resp, err := s.client.Encrypt(ctx, req)
    if err != nil {
        return nil, nil, fmt.Errorf("failed to encrypt DEK: %w", err)
    }
    
    return dek, resp.Ciphertext, nil
}

func (s *KMSService) DecryptDataKey(ctx context.Context, encryptedDEK []byte, estateID string) ([]byte, error) {
    req := &kmspb.DecryptRequest{
        Name:       s.keyName,
        Ciphertext: encryptedDEK,
        AdditionalAuthenticatedData: []byte(estateID),
    }
    
    resp, err := s.client.Decrypt(ctx, req)
    if err != nil {
        return nil, fmt.Errorf("failed to decrypt DEK: %w", err)
    }
    
    return resp.Plaintext, nil
}
```

---

## 4. Estate Settlement Workflow

### 4.1 State Machine

```
                    ┌─────────────┐
                    │   ACTIVE    │
                    │ (Principal  │
                    │  Building)  │
                    └──────┬──────┘
                           │
                    Death Reported
                           │
                    ┌──────▼──────┐
                    │   DEATH_    │
                    │  REPORTED   │
                    └──────┬──────┘
                           │
                    Executor(s) Confirm
                           │
                    ┌──────▼──────┐
                    │  EXECUTOR_  │
                    │  CONFIRMED  │
                    └──────┬──────┘
                           │
                    72hr Cooling Off
                           │
                    ┌──────▼──────┐
                    │    IN_      │
                    │ SETTLEMENT  │
                    └──────┬──────┘
                           │
                    All Tasks Complete
                           │
                    ┌──────▼──────┐
                    │   CLOSED    │
                    └─────────────┘
```

**State Transition Logic:**
```go
type EstateStatus string

const (
    StatusActive           EstateStatus = "active"
    StatusDeathReported    EstateStatus = "death_reported"
    StatusExecutorConfirmed EstateStatus = "executor_confirmed"
    StatusInSettlement     EstateStatus = "in_settlement"
    StatusClosed           EstateStatus = "closed"
)

var validTransitions = map[EstateStatus][]EstateStatus{
    StatusActive:           {StatusDeathReported},
    StatusDeathReported:    {StatusExecutorConfirmed},
    StatusExecutorConfirmed: {StatusInSettlement},
    StatusInSettlement:     {StatusClosed},
}

func (e *Estate) TransitionTo(newStatus EstateStatus) error {
    allowed := validTransitions[e.Status]
    for _, s := range allowed {
        if s == newStatus {
            e.Status = newStatus
            e.UpdatedAt = time.Now()
            return nil
        }
    }
    return ErrInvalidStateTransition
}
```

### 4.2 Multi-Executor Confirmation

**2-of-3 Confirmation Logic:**
```go
func (s *EstateService) CheckExecutorConfirmation(ctx context.Context, estateID string) (*ConfirmationStatus, error) {
    estate, err := s.repo.Get(ctx, estateID)
    if err != nil {
        return nil, err
    }
    
    executors, err := s.executorRepo.ListByEstate(ctx, estateID)
    if err != nil {
        return nil, err
    }
    
    // Count confirmations
    confirmed := 0
    for _, exec := range executors {
        if exec.ConfirmedDeath {
            confirmed++
        }
    }
    
    // High-value estates require 2-of-3
    requiredConfirmations := 1
    if estate.EstimatedValue > 100000 {
        requiredConfirmations = min(2, len(executors))
    }
    
    if confirmed >= requiredConfirmations && estate.Status == StatusDeathReported {
        // Transition estate and start cooling-off
        estate.TransitionTo(StatusExecutorConfirmed)
        estate.CoolingOffEndsAt = time.Now().Add(72 * time.Hour)
        
        if err := s.repo.Update(ctx, estate); err != nil {
            return nil, err
        }
        
        // Schedule cooling-off completion via Cloud Tasks
        s.scheduler.ScheduleAt(estate.CoolingOffEndsAt, "complete_cooling_off", estateID)
    }
    
    return &ConfirmationStatus{
        Required:  requiredConfirmations,
        Confirmed: confirmed,
        Complete:  confirmed >= requiredConfirmations,
    }, nil
}
```

---

## 5. Payment Integration

### 5.1 Stripe Checkout Flow

```go
func (s *PaymentService) CreateCheckoutSession(ctx context.Context, userID, tier string) (*CheckoutSession, error) {
    user, err := s.userRepo.Get(ctx, userID)
    if err != nil {
        return nil, err
    }
    
    prices := map[string]string{
        "concierge":   "price_xxx", // $2,997
        "white_glove": "price_yyy", // $9,997
    }
    
    params := &stripe.CheckoutSessionParams{
        Customer: stripe.String(user.StripeCustomerID),
        Mode:     stripe.String(string(stripe.CheckoutSessionModePayment)),
        SuccessURL: stripe.String("https://app.finalwishes.app/payment/success?session_id={CHECKOUT_SESSION_ID}"),
        CancelURL:  stripe.String("https://app.finalwishes.app/pricing"),
        LineItems: []*stripe.CheckoutSessionLineItemParams{
            {
                Price:    stripe.String(prices[tier]),
                Quantity: stripe.Int64(1),
            },
        },
        Metadata: map[string]string{
            "user_id": userID,
            "tier":    tier,
        },
    }
    
    session, err := session.New(params)
    if err != nil {
        return nil, err
    }
    
    return &CheckoutSession{
        URL:       session.URL,
        SessionID: session.ID,
    }, nil
}
```

### 5.2 Webhook Handling

```go
func (h *WebhookHandler) HandleStripeWebhook(w http.ResponseWriter, r *http.Request) {
    payload, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Error reading body", http.StatusBadRequest)
        return
    }
    
    sig := r.Header.Get("Stripe-Signature")
    event, err := webhook.ConstructEvent(payload, sig, h.webhookSecret)
    if err != nil {
        http.Error(w, "Invalid signature", http.StatusBadRequest)
        return
    }
    
    switch event.Type {
    case "checkout.session.completed":
        var session stripe.CheckoutSession
        if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
            http.Error(w, "Error parsing webhook", http.StatusBadRequest)
            return
        }
        
        userID := session.Metadata["user_id"]
        tier := session.Metadata["tier"]
        
        ctx := r.Context()
        
        // Update user tier in Firestore
        if err := h.userService.UpdateTier(ctx, userID, tier); err != nil {
            log.Printf("Failed to update user tier: %v", err)
        }
        
        // Create payment record
        if err := h.paymentService.RecordPayment(ctx, userID, session.ID, session.AmountTotal, tier); err != nil {
            log.Printf("Failed to record payment: %v", err)
        }
        
        // Send confirmation email
        h.emailService.SendUpgradeConfirmation(ctx, userID, tier)
        
    case "payment_intent.payment_failed":
        // Handle failure
        log.Printf("Payment failed: %s", event.ID)
    }
    
    w.WriteHeader(http.StatusOK)
}
```

---

## 6. API Rate Limiting

### 6.1 Implementation

```go
type RateLimiter struct {
    client *firestore.Client
    limit  int
    window time.Duration
}

func (rl *RateLimiter) Allow(ctx context.Context, userID string) (bool, error) {
    now := time.Now()
    windowStart := now.Add(-rl.window)
    
    // Use Firestore for distributed rate limiting
    ref := rl.client.Collection("rate_limits").Doc(userID)
    
    // Transaction to check and update
    err := rl.client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
        doc, err := tx.Get(ref)
        
        var requests []time.Time
        if err == nil {
            doc.DataTo(&requests)
        }
        
        // Filter to current window
        var inWindow []time.Time
        for _, t := range requests {
            if t.After(windowStart) {
                inWindow = append(inWindow, t)
            }
        }
        
        if len(inWindow) >= rl.limit {
            return ErrRateLimitExceeded
        }
        
        inWindow = append(inWindow, now)
        return tx.Set(ref, map[string]interface{}{
            "requests": inWindow,
        })
    })
    
    return err == nil, err
}

func RateLimitMiddleware(limiter *RateLimiter) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            userID := r.Context().Value("uid").(string)
            
            allowed, err := limiter.Allow(r.Context(), userID)
            if !allowed || err == ErrRateLimitExceeded {
                w.Header().Set("Retry-After", "60")
                http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
                return
            }
            
            next.ServeHTTP(w, r)
        })
    }
}
```

### 6.2 Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 10 | 1 minute |
| Document Upload | 50 | 1 hour |
| General API | 100 | 1 minute |
| Notification Generation | 100 | 1 hour |

---

## 7. Error Handling

### 7.1 Error Response Format

```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid input data",
        "details": [
            {
                "field": "email",
                "message": "must be a valid email address"
            }
        ],
        "request_id": "abc123"
    }
}
```

### 7.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_ERROR` | 401 | Invalid or missing token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 8. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function hasEstateAccess(estateId) {
      return exists(/databases/$(database)/documents/estate_users/$(request.auth.uid + '_' + estateId));
    }
    
    function getEstateRole(estateId) {
      return get(/databases/$(database)/documents/estate_users/$(request.auth.uid + '_' + estateId)).data.role;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && isOwner(userId);
      allow write: if isAuthenticated() && isOwner(userId);
    }
    
    // Estates collection
    match /estates/{estateId} {
      allow read: if isAuthenticated() && hasEstateAccess(estateId);
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && 
        hasEstateAccess(estateId) && 
        getEstateRole(estateId) == 'principal';
    }
    
    // Assets collection
    match /estates/{estateId}/assets/{assetId} {
      allow read: if isAuthenticated() && hasEstateAccess(estateId);
      allow write: if isAuthenticated() && 
        hasEstateAccess(estateId) && 
        getEstateRole(estateId) == 'principal';
    }
    
    // Documents collection
    match /estates/{estateId}/documents/{docId} {
      allow read: if isAuthenticated() && hasEstateAccess(estateId);
      allow write: if isAuthenticated() && 
        hasEstateAccess(estateId) && 
        getEstateRole(estateId) == 'principal';
    }
  }
}
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | Legacy Team | Initial draft |
| 2.0.0 | 2025-12-05 | Claude | Complete rewrite for Go/GCP/Firebase Auth/Cloud KMS stack |
