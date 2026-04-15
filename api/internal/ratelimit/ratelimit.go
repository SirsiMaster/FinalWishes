// Package ratelimit provides HTTP rate limiting middleware for the FinalWishes API.
// This serves as the application-level rate limiter since Cloud Armor cannot be
// attached directly to Cloud Run services (Cloud Armor requires a Global External
// Application Load Balancer with backend services).
package ratelimit

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// visitor tracks request counts per IP.
type visitor struct {
	count    int
	lastSeen time.Time
}

// Limiter implements a sliding-window rate limiter per IP.
type Limiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	limit    int
	window   time.Duration
	ban      time.Duration
	banned   map[string]time.Time
}

// NewLimiter creates a rate limiter.
//   - limit: max requests per window per IP
//   - window: time window for counting requests
//   - ban: duration to ban IPs that exceed the limit
func NewLimiter(limit int, window, ban time.Duration) *Limiter {
	l := &Limiter{
		visitors: make(map[string]*visitor),
		banned:   make(map[string]time.Time),
		limit:    limit,
		window:   window,
		ban:      ban,
	}
	// Background cleanup every 2 minutes
	go l.cleanup()
	return l
}

// cleanup removes stale visitors and expired bans.
func (l *Limiter) cleanup() {
	for {
		time.Sleep(2 * time.Minute)
		l.mu.Lock()
		now := time.Now()
		for ip, v := range l.visitors {
			if now.Sub(v.lastSeen) > l.window*2 {
				delete(l.visitors, ip)
			}
		}
		for ip, banExpiry := range l.banned {
			if now.After(banExpiry) {
				delete(l.banned, ip)
			}
		}
		l.mu.Unlock()
	}
}

// allow checks if the IP is within rate limits.
func (l *Limiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()

	// Check if IP is banned
	if banExpiry, ok := l.banned[ip]; ok {
		if now.Before(banExpiry) {
			return false
		}
		delete(l.banned, ip)
	}

	v, exists := l.visitors[ip]
	if !exists {
		l.visitors[ip] = &visitor{count: 1, lastSeen: now}
		return true
	}

	// Reset counter if window has elapsed
	if now.Sub(v.lastSeen) > l.window {
		v.count = 1
		v.lastSeen = now
		return true
	}

	v.count++
	v.lastSeen = now

	if v.count > l.limit {
		// Ban the IP
		l.banned[ip] = now.Add(l.ban)
		log.Warn().
			Str("ip", ip).
			Int("count", v.count).
			Dur("ban_duration", l.ban).
			Msg("Rate limit exceeded — IP banned")
		return false
	}

	return true
}

// Middleware returns an HTTP middleware that enforces rate limiting.
// Default: 100 requests per 60 seconds per IP, 10-minute ban on exceed.
func Middleware(limiter *Limiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr
			if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
				parts := strings.Split(xff, ",")
				ip = strings.TrimSpace(parts[len(parts)-1])
			}

			if !limiter.allow(ip) {
				w.Header().Set("Retry-After", "600")
				http.Error(w, `{"error":{"code":"RATE_LIMITED","message":"Too many requests. Please try again later."}}`, http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
