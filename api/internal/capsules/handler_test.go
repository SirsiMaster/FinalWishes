package capsules

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestHandleDeliverCapsule_MissingHeaders verifies that requests without Cloud Tasks headers
// are rejected with 403.
func TestHandleDeliverCapsule_MissingHeaders(t *testing.T) {
	h := &Handler{}

	body := `{"estateId":"est-123","capsuleId":"cap-456"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/capsules/deliver", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.HandleDeliverCapsule(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Cloud Tasks") {
		t.Errorf("expected Cloud Tasks error message, got %q", rr.Body.String())
	}
}

// TestHandleDeliverCapsule_MissingTaskName verifies that a request with only queue header
// but no task name is rejected.
func TestHandleDeliverCapsule_MissingTaskName(t *testing.T) {
	h := &Handler{}

	body := `{"estateId":"est-123","capsuleId":"cap-456"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/capsules/deliver", strings.NewReader(body))
	req.Header.Set("X-CloudTasks-QueueName", "capsule-delivery")
	// Missing X-CloudTasks-TaskName
	rr := httptest.NewRecorder()
	h.HandleDeliverCapsule(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rr.Code)
	}
}

// TestHandleDeliverCapsule_MissingQueueHeader verifies that a request with only task name
// but no queue header is rejected.
func TestHandleDeliverCapsule_MissingQueueHeader(t *testing.T) {
	h := &Handler{}

	body := `{"estateId":"est-123","capsuleId":"cap-456"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/capsules/deliver", strings.NewReader(body))
	req.Header.Set("X-CloudTasks-TaskName", "task-789")
	// Missing X-CloudTasks-QueueName
	rr := httptest.NewRecorder()
	h.HandleDeliverCapsule(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rr.Code)
	}
}

// TestHandleDeliverCapsule_RejectsSpoofedHeaders verifies the deliver endpoint now
// requires a VALID OIDC bearer token (minted by Cloud Tasks for the finalwishes-api
// SA) and rejects a request that merely sets the spoofable X-CloudTasks-* headers.
// Auth runs BEFORE payload parsing, so this fires regardless of body validity —
// closing the premature-delivery vector (an external caller forging the headers).
func TestHandleDeliverCapsule_RejectsSpoofedHeaders(t *testing.T) {
	h := &Handler{}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/capsules/deliver", strings.NewReader("{bad json"))
	req.Header.Set("X-CloudTasks-TaskName", "task-789")
	req.Header.Set("X-CloudTasks-QueueName", "capsule-delivery")
	rr := httptest.NewRecorder()
	h.HandleDeliverCapsule(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403 (no OIDC token), got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "only Cloud Tasks requests") {
		t.Errorf("expected Cloud Tasks rejection, got %q", rr.Body.String())
	}
}

// TestHandleDeliverCapsule_RejectsNoBearer verifies a request with no Authorization
// bearer token is denied even with a well-formed payload.
func TestHandleDeliverCapsule_RejectsNoBearer(t *testing.T) {
	h := &Handler{}

	body := `{"estateId":"e1","capsuleId":"c1"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/capsules/deliver", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.HandleDeliverCapsule(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403 (no OIDC token), got %d", rr.Code)
	}
}

// TestBuildDeliveryEmail verifies that composeEmail produces valid HTML
// with the recipient name and message included.
func TestBuildDeliveryEmail(t *testing.T) {
	html := composeEmail("John Doe", "Jane Smith", "I love you always.")

	if !strings.Contains(html, "Dear Jane Smith") {
		t.Error("expected email to contain 'Dear Jane Smith'")
	}
	if !strings.Contains(html, "John Doe") {
		t.Error("expected email to contain sender name 'John Doe'")
	}
	if !strings.Contains(html, "I love you always.") {
		t.Error("expected email to contain the message")
	}
	if !strings.Contains(html, "<!DOCTYPE html>") {
		t.Error("expected email to be valid HTML")
	}
	if !strings.Contains(html, "FinalWishes") {
		t.Error("expected email to contain 'FinalWishes' branding")
	}
}

// TestBuildDeliveryEmail_EmptyRecipient verifies fallback greeting when recipient is empty.
func TestBuildDeliveryEmail_EmptyRecipient(t *testing.T) {
	html := composeEmail("John Doe", "", "Hello there.")

	if !strings.Contains(html, "Dear Friend") {
		t.Error("expected 'Dear Friend' fallback when recipient name is empty")
	}
}

// TestBuildDeliveryEmail_EmptySender verifies fallback sender name.
func TestBuildDeliveryEmail_EmptySender(t *testing.T) {
	html := composeEmail("", "Jane", "A message for you.")

	if !strings.Contains(html, "Someone who cares about you") {
		t.Error("expected fallback sender name when sender is empty")
	}
}
