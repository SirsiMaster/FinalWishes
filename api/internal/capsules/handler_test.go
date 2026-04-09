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

// TestHandleDeliverCapsule_InvalidPayload verifies that malformed JSON returns 400
// when Cloud Tasks headers are present.
func TestHandleDeliverCapsule_InvalidPayload(t *testing.T) {
	h := &Handler{}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/capsules/deliver", strings.NewReader("{bad json"))
	req.Header.Set("X-CloudTasks-TaskName", "task-789")
	req.Header.Set("X-CloudTasks-QueueName", "capsule-delivery")
	rr := httptest.NewRecorder()
	h.HandleDeliverCapsule(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Invalid task payload") {
		t.Errorf("expected 'Invalid task payload', got %q", rr.Body.String())
	}
}

// TestHandleDeliverCapsule_MissingPayloadFields verifies that empty estateId/capsuleId
// in the payload returns 400.
func TestHandleDeliverCapsule_MissingPayloadFields(t *testing.T) {
	h := &Handler{}

	body := `{"estateId":"","capsuleId":""}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/capsules/deliver", strings.NewReader(body))
	req.Header.Set("X-CloudTasks-TaskName", "task-789")
	req.Header.Set("X-CloudTasks-QueueName", "capsule-delivery")
	rr := httptest.NewRecorder()
	h.HandleDeliverCapsule(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Missing estateId or capsuleId") {
		t.Errorf("expected missing fields error, got %q", rr.Body.String())
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
