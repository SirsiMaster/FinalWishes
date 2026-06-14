package estate

import (
	"context"
	"testing"

	"connectrpc.com/connect"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
	estatev1 "github.com/sirsi-technologies/finalwishes-api/internal/gen/estate/v1"
)

// These tests pin the HONEST EstateService contract (2026-06-14): the service
// implements ONLY GenerateUploadUrl. Every other proto RPC is intentionally not
// overridden, so the embedded UnimplementedEstateServiceHandler answers it with
// connect.CodeUnimplemented instead of fabricated "Lockhart Estate" / "Sarah
// Johnson" / "34% complete" demo data. The previous suite asserted that
// fabricated data; it has been replaced to assert the real, non-mock behavior.

// --- Helpers ---

// newTestServer returns a Server with nil Firestore/Storage clients.
func newTestServer() *Server {
	return NewServer(nil, nil)
}

// testCtx returns a context with a test user ID injected.
func testCtx() context.Context {
	return auth.InjectUserIDForTest(context.Background(), "test-user")
}

// =========================================================
// checkEstateAccess — without an estate store, membership cannot be proven,
// so access is DENIED (FailedPrecondition), never silently granted.
// =========================================================

func TestCheckEstateAccess_NoStore_Denied(t *testing.T) {
	s := newTestServer()
	err := s.checkEstateAccess(testCtx(), "estate_x", false)
	if err == nil {
		t.Fatal("expected error when estate store is not configured")
	}
	if connect.CodeOf(err) != connect.CodeFailedPrecondition {
		t.Errorf("expected FailedPrecondition, got %v", connect.CodeOf(err))
	}
}

func TestCheckEstateAccess_Unauthenticated(t *testing.T) {
	s := newTestServer()
	err := s.checkEstateAccess(context.Background(), "estate_x", false)
	if err == nil {
		t.Fatal("expected error when no user is in context")
	}
	if connect.CodeOf(err) != connect.CodeUnauthenticated {
		t.Errorf("expected Unauthenticated, got %v", connect.CodeOf(err))
	}
}

// =========================================================
// GenerateUploadUrl — the only implemented RPC. With nil clients it is gated
// by checkEstateAccess (no store -> FailedPrecondition) before any signing.
// =========================================================

func TestGenerateUploadUrl_NoStore_FailsClosed(t *testing.T) {
	s := newTestServer()
	_, err := s.GenerateUploadUrl(testCtx(), connect.NewRequest(&estatev1.GenerateUploadUrlRequest{
		EstateId:    "estate_x",
		FileName:    "test.pdf",
		ContentType: "application/pdf",
	}))
	if err == nil {
		t.Fatal("expected error when estate store / storage client is nil")
	}
	if connect.CodeOf(err) != connect.CodeFailedPrecondition {
		t.Errorf("expected FailedPrecondition, got %v", connect.CodeOf(err))
	}
}

func TestGenerateUploadUrl_Unauthenticated(t *testing.T) {
	s := newTestServer()
	_, err := s.GenerateUploadUrl(context.Background(), connect.NewRequest(&estatev1.GenerateUploadUrlRequest{
		EstateId:    "estate_x",
		FileName:    "test.pdf",
		ContentType: "application/pdf",
	}))
	if err == nil {
		t.Fatal("expected error when caller is unauthenticated")
	}
	if connect.CodeOf(err) != connect.CodeUnauthenticated {
		t.Errorf("expected Unauthenticated, got %v", connect.CodeOf(err))
	}
}

// =========================================================
// Unimplemented surface — every formerly-mocked RPC now returns Unimplemented
// (no fabricated data, no hardcoded Lockhart/Sarah-Johnson/percentages).
// =========================================================

func TestUnimplementedRPCs_ReturnUnimplemented(t *testing.T) {
	s := newTestServer()
	ctx := testCtx()

	assertUnimplemented := func(t *testing.T, name string, err error) {
		t.Helper()
		if err == nil {
			t.Fatalf("%s: expected Unimplemented error, got nil (fabricated response?)", name)
		}
		if connect.CodeOf(err) != connect.CodeUnimplemented {
			t.Errorf("%s: expected Unimplemented, got %v", name, connect.CodeOf(err))
		}
	}

	_, err := s.ListEstates(ctx, connect.NewRequest(&estatev1.ListEstatesRequest{UserId: "user_tameeka"}))
	assertUnimplemented(t, "ListEstates", err)

	_, err = s.RegisterEstate(ctx, connect.NewRequest(&estatev1.RegisterEstateRequest{Name: "X", Type: "Trust"}))
	assertUnimplemented(t, "RegisterEstate", err)

	_, err = s.GetEstateMetadata(ctx, connect.NewRequest(&estatev1.GetEstateMetadataRequest{EstateId: "estate_lockhart"}))
	assertUnimplemented(t, "GetEstateMetadata", err)

	_, err = s.ListAssets(ctx, connect.NewRequest(&estatev1.ListAssetsRequest{EstateId: "estate_lockhart"}))
	assertUnimplemented(t, "ListAssets", err)

	_, err = s.AddAsset(ctx, connect.NewRequest(&estatev1.AddAssetRequest{EstateId: "estate_lockhart", Name: "Car"}))
	assertUnimplemented(t, "AddAsset", err)

	_, err = s.ListBeneficiaries(ctx, connect.NewRequest(&estatev1.ListBeneficiariesRequest{EstateId: "estate_lockhart"}))
	assertUnimplemented(t, "ListBeneficiaries", err)

	_, err = s.AddBeneficiary(ctx, connect.NewRequest(&estatev1.AddBeneficiaryRequest{EstateId: "estate_lockhart", Name: "Heir"}))
	assertUnimplemented(t, "AddBeneficiary", err)

	_, err = s.ListVaultDocuments(ctx, connect.NewRequest(&estatev1.ListVaultDocumentsRequest{EstateId: "estate_lockhart"}))
	assertUnimplemented(t, "ListVaultDocuments", err)

	_, err = s.ListMemoirs(ctx, connect.NewRequest(&estatev1.ListMemoirsRequest{EstateId: "estate_lockhart"}))
	assertUnimplemented(t, "ListMemoirs", err)

	_, err = s.UploadMemoir(ctx, connect.NewRequest(&estatev1.UploadMemoirRequest{EstateId: "estate_lockhart", Title: "M"}))
	assertUnimplemented(t, "UploadMemoir", err)

	_, err = s.GetObituary(ctx, connect.NewRequest(&estatev1.GetObituaryRequest{EstateId: "estate_lockhart"}))
	assertUnimplemented(t, "GetObituary", err)

	_, err = s.SaveObituary(ctx, connect.NewRequest(&estatev1.SaveObituaryRequest{EstateId: "estate_lockhart", Content: "x"}))
	assertUnimplemented(t, "SaveObituary", err)

	_, err = s.GetAIInsight(ctx, connect.NewRequest(&estatev1.GetAIInsightRequest{EstateId: "estate_lockhart"}))
	assertUnimplemented(t, "GetAIInsight", err)

	_, err = s.GetGovernanceSettings(ctx, connect.NewRequest(&estatev1.GetGovernanceSettingsRequest{EstateId: "estate_lockhart"}))
	assertUnimplemented(t, "GetGovernanceSettings", err)

	_, err = s.ListNotifications(ctx, connect.NewRequest(&estatev1.ListNotificationsRequest{EstateId: "estate_lockhart"}))
	assertUnimplemented(t, "ListNotifications", err)
}

// =========================================================
// Server Construction
// =========================================================

func TestNewServer_NilClients(t *testing.T) {
	s := NewServer(nil, nil)
	if s == nil {
		t.Fatal("expected non-nil server")
	}
	if s.fs != nil {
		t.Error("expected nil Firestore client")
	}
	if s.sc != nil {
		t.Error("expected nil Storage client")
	}
}
