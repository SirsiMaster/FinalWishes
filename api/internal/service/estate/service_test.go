package estate

import (
	"context"
	"testing"

	"connectrpc.com/connect"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
	estatev1 "github.com/sirsi-technologies/finalwishes-api/internal/gen/estate/v1"
)

// --- Helper ---

// newTestServer returns a Server with nil Firestore/Storage clients (demo mode).
func newTestServer() *Server {
	return NewServer(nil, nil)
}

// testCtx returns a context with a test user ID injected, so checkEstateAccess passes.
func testCtx() context.Context {
	return auth.InjectUserIDForTest(context.Background(), "test-user")
}

// =========================================================
// ListEstates
// =========================================================

func TestListEstates_DemoMode_KnownUser(t *testing.T) {
	s := newTestServer()
	resp, err := s.ListEstates(testCtx(), connect.NewRequest(&estatev1.ListEstatesRequest{
		UserId: "user_tameeka",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Estates) != 2 {
		t.Fatalf("expected 2 estates, got %d", len(resp.Msg.Estates))
	}
	if resp.Msg.Estates[0].Name != "Lockhart Estate" {
		t.Errorf("expected 'Lockhart Estate', got %q", resp.Msg.Estates[0].Name)
	}
	if resp.Msg.Estates[1].Role != "Executor" {
		t.Errorf("expected Executor role for second estate, got %q", resp.Msg.Estates[1].Role)
	}
}

func TestListEstates_DemoMode_UnknownUser(t *testing.T) {
	s := newTestServer()
	resp, err := s.ListEstates(testCtx(), connect.NewRequest(&estatev1.ListEstatesRequest{
		UserId: "some_other_user",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Estates) != 2 {
		t.Fatalf("expected 2 estates for unknown user, got %d", len(resp.Msg.Estates))
	}
	if resp.Msg.Estates[0].Id != "estate-77b" {
		t.Errorf("expected estate-77b, got %q", resp.Msg.Estates[0].Id)
	}
}

// =========================================================
// GetEstateMetadata
// =========================================================

func TestGetEstateMetadata_DemoMode(t *testing.T) {
	s := newTestServer()
	resp, err := s.GetEstateMetadata(testCtx(), connect.NewRequest(&estatev1.GetEstateMetadataRequest{
		EstateId: "estate_lockhart",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Name != "Lockhart Estate" {
		t.Errorf("expected 'Lockhart Estate', got %q", resp.Msg.Name)
	}
	if resp.Msg.CompletionPercentage != 100 {
		t.Errorf("expected 100%% completion, got %d", resp.Msg.CompletionPercentage)
	}
	if resp.Msg.Status != "Active" {
		t.Errorf("expected Active status, got %q", resp.Msg.Status)
	}
	if resp.Msg.AuthorityMode != estatev1.AuthorityMode_AUTHORITY_MODE_OWNER {
		t.Errorf("expected OWNER authority mode, got %v", resp.Msg.AuthorityMode)
	}
}

func TestGetEstateMetadata_PreservesEstateID(t *testing.T) {
	s := newTestServer()
	resp, err := s.GetEstateMetadata(testCtx(), connect.NewRequest(&estatev1.GetEstateMetadataRequest{
		EstateId: "custom-id-123",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Id != "custom-id-123" {
		t.Errorf("expected estate ID to be echoed back, got %q", resp.Msg.Id)
	}
}

// =========================================================
// ListBeneficiaries
// =========================================================

func TestListBeneficiaries_DemoMode(t *testing.T) {
	s := newTestServer()
	resp, err := s.ListBeneficiaries(testCtx(), connect.NewRequest(&estatev1.ListBeneficiariesRequest{
		EstateId: "estate_lockhart",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Beneficiaries) != 1 {
		t.Fatalf("expected 1 beneficiary, got %d", len(resp.Msg.Beneficiaries))
	}
	b := resp.Msg.Beneficiaries[0]
	if b.Name != "Sarah Johnson" {
		t.Errorf("expected Sarah Johnson, got %q", b.Name)
	}
	if b.Share != "50%" {
		t.Errorf("expected 50%% share, got %q", b.Share)
	}
}

// =========================================================
// AddBeneficiary — requires Firestore, should fail in demo mode
// =========================================================

func TestAddBeneficiary_DemoMode_FailsGracefully(t *testing.T) {
	s := newTestServer()
	_, err := s.AddBeneficiary(testCtx(), connect.NewRequest(&estatev1.AddBeneficiaryRequest{
		EstateId: "estate_lockhart",
		Name:     "New Heir",
		Relation: "Child",
		Email:    "newhier@test.com",
	}))
	if err == nil {
		t.Fatal("expected error when Firestore is nil, got nil")
	}
	// Should be an Unimplemented error since fs is nil
	if connect.CodeOf(err) != connect.CodeUnimplemented {
		t.Errorf("expected Unimplemented code, got %v", connect.CodeOf(err))
	}
}

// =========================================================
// ListAssets
// =========================================================

func TestListAssets_DemoMode_LockhartEstate(t *testing.T) {
	s := newTestServer()
	resp, err := s.ListAssets(testCtx(), connect.NewRequest(&estatev1.ListAssetsRequest{
		EstateId: "estate_lockhart",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Assets) != 4 {
		t.Fatalf("expected 4 assets for lockhart, got %d", len(resp.Msg.Assets))
	}
	if resp.Msg.TotalCount != 4 {
		t.Errorf("expected total count 4, got %d", resp.Msg.TotalCount)
	}
	// Verify first asset
	if resp.Msg.Assets[0].Type != "Real Estate" {
		t.Errorf("expected Real Estate type, got %q", resp.Msg.Assets[0].Type)
	}
}

func TestListAssets_DemoMode_OtherEstate(t *testing.T) {
	s := newTestServer()
	resp, err := s.ListAssets(testCtx(), connect.NewRequest(&estatev1.ListAssetsRequest{
		EstateId: "other-estate",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Assets) != 2 {
		t.Fatalf("expected 2 assets for other estate, got %d", len(resp.Msg.Assets))
	}
}

// =========================================================
// AddAsset — requires Firestore
// =========================================================

func TestAddAsset_DemoMode_FailsGracefully(t *testing.T) {
	s := newTestServer()
	_, err := s.AddAsset(testCtx(), connect.NewRequest(&estatev1.AddAssetRequest{
		EstateId: "estate_lockhart",
		Name:     "New Car",
		Type:     "Vehicle",
		Value:    "$50,000",
	}))
	if err == nil {
		t.Fatal("expected error when Firestore is nil")
	}
	if connect.CodeOf(err) != connect.CodeUnimplemented {
		t.Errorf("expected Unimplemented code, got %v", connect.CodeOf(err))
	}
}

// =========================================================
// ListVaultDocuments
// =========================================================

func TestListVaultDocuments_DemoMode_Lockhart(t *testing.T) {
	s := newTestServer()
	resp, err := s.ListVaultDocuments(testCtx(), connect.NewRequest(&estatev1.ListVaultDocumentsRequest{
		EstateId: "estate_lockhart",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Documents) != 4 {
		t.Fatalf("expected 4 documents, got %d", len(resp.Msg.Documents))
	}
	// Verify categories
	categories := map[string]bool{}
	for _, d := range resp.Msg.Documents {
		categories[d.Category] = true
	}
	for _, expected := range []string{"Legal", "Tax", "Property", "Protocol"} {
		if !categories[expected] {
			t.Errorf("expected category %q in documents", expected)
		}
	}
}

func TestListVaultDocuments_DemoMode_Other(t *testing.T) {
	s := newTestServer()
	resp, err := s.ListVaultDocuments(testCtx(), connect.NewRequest(&estatev1.ListVaultDocumentsRequest{
		EstateId: "other-estate",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Documents) != 1 {
		t.Fatalf("expected 1 document, got %d", len(resp.Msg.Documents))
	}
}

// =========================================================
// GenerateUploadUrl — requires Storage client
// =========================================================

func TestGenerateUploadUrl_DemoMode_FailsGracefully(t *testing.T) {
	s := newTestServer()
	_, err := s.GenerateUploadUrl(testCtx(), connect.NewRequest(&estatev1.GenerateUploadUrlRequest{
		EstateId:    "estate_lockhart",
		FileName:    "test.pdf",
		ContentType: "application/pdf",
	}))
	if err == nil {
		t.Fatal("expected error when storage client is nil")
	}
	if connect.CodeOf(err) != connect.CodeFailedPrecondition {
		t.Errorf("expected FailedPrecondition code, got %v", connect.CodeOf(err))
	}
}

// =========================================================
// ListMemoirs
// =========================================================

func TestListMemoirs_DemoMode_Lockhart(t *testing.T) {
	s := newTestServer()
	resp, err := s.ListMemoirs(testCtx(), connect.NewRequest(&estatev1.ListMemoirsRequest{
		EstateId: "estate_lockhart",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Memoirs) != 4 {
		t.Fatalf("expected 4 memoirs, got %d", len(resp.Msg.Memoirs))
	}
	// Verify mix of types
	types := map[string]int{}
	for _, m := range resp.Msg.Memoirs {
		types[m.Type]++
	}
	if types["video"] != 2 {
		t.Errorf("expected 2 videos, got %d", types["video"])
	}
	if types["photo"] != 2 {
		t.Errorf("expected 2 photos, got %d", types["photo"])
	}
}

func TestListMemoirs_DemoMode_Other(t *testing.T) {
	s := newTestServer()
	resp, err := s.ListMemoirs(testCtx(), connect.NewRequest(&estatev1.ListMemoirsRequest{
		EstateId: "other",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Memoirs) != 1 {
		t.Fatalf("expected 1 memoir, got %d", len(resp.Msg.Memoirs))
	}
}

// =========================================================
// UploadMemoir — requires Firestore
// =========================================================

func TestUploadMemoir_DemoMode_FailsGracefully(t *testing.T) {
	s := newTestServer()
	_, err := s.UploadMemoir(testCtx(), connect.NewRequest(&estatev1.UploadMemoirRequest{
		EstateId: "estate_lockhart",
		Title:    "Test Memoir",
		Type:     "video",
		Url:      "/test.mp4",
	}))
	if err == nil {
		t.Fatal("expected error when Firestore is nil")
	}
	if connect.CodeOf(err) != connect.CodeUnimplemented {
		t.Errorf("expected Unimplemented code, got %v", connect.CodeOf(err))
	}
}

// =========================================================
// GetObituary
// =========================================================

func TestGetObituary_DemoMode_Lockhart(t *testing.T) {
	s := newTestServer()
	resp, err := s.GetObituary(testCtx(), connect.NewRequest(&estatev1.GetObituaryRequest{
		EstateId: "estate_lockhart",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Status != "Verified" {
		t.Errorf("expected Verified status, got %q", resp.Msg.Status)
	}
	if resp.Msg.Content == "" {
		t.Error("expected non-empty obituary content")
	}
	if resp.Msg.LastUpdated == nil {
		t.Error("expected LastUpdated timestamp")
	}
}

func TestGetObituary_DemoMode_Other(t *testing.T) {
	s := newTestServer()
	resp, err := s.GetObituary(testCtx(), connect.NewRequest(&estatev1.GetObituaryRequest{
		EstateId: "other",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Status != "Draft" {
		t.Errorf("expected Draft status, got %q", resp.Msg.Status)
	}
}

// =========================================================
// SaveObituary — requires Firestore
// =========================================================

func TestSaveObituary_DemoMode_FailsGracefully(t *testing.T) {
	s := newTestServer()
	_, err := s.SaveObituary(testCtx(), connect.NewRequest(&estatev1.SaveObituaryRequest{
		EstateId: "estate_lockhart",
		Content:  "Updated content",
	}))
	if err == nil {
		t.Fatal("expected error when Firestore is nil")
	}
	if connect.CodeOf(err) != connect.CodeUnimplemented {
		t.Errorf("expected Unimplemented code, got %v", connect.CodeOf(err))
	}
}

// =========================================================
// GetAIInsight
// =========================================================

func TestGetAIInsight_LockhartEstate(t *testing.T) {
	s := newTestServer()
	resp, err := s.GetAIInsight(testCtx(), connect.NewRequest(&estatev1.GetAIInsightRequest{
		EstateId: "estate_lockhart",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Insight == "" {
		t.Error("expected non-empty insight")
	}
	if resp.Msg.ActionLabel != "View Ledger" {
		t.Errorf("expected 'View Ledger', got %q", resp.Msg.ActionLabel)
	}
}

func TestGetAIInsight_OtherEstate(t *testing.T) {
	s := newTestServer()
	resp, err := s.GetAIInsight(testCtx(), connect.NewRequest(&estatev1.GetAIInsightRequest{
		EstateId: "other",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Msg.Insight == "" {
		t.Error("expected non-empty insight for other estate")
	}
}

// =========================================================
// GetGovernanceSettings
// =========================================================

func TestGetGovernanceSettings_DemoMode(t *testing.T) {
	s := newTestServer()
	resp, err := s.GetGovernanceSettings(testCtx(), connect.NewRequest(&estatev1.GetGovernanceSettingsRequest{
		EstateId: "estate_lockhart",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	settings := resp.Msg.Settings
	if settings == nil {
		t.Fatal("expected non-nil settings")
	}
	if !settings.MfaEnabled {
		t.Error("expected MFA enabled in demo mode")
	}
	if !settings.EmailAlerts {
		t.Error("expected email alerts enabled")
	}
	if settings.RecoveryKeyStatus != "Verified" {
		t.Errorf("expected Verified recovery key, got %q", settings.RecoveryKeyStatus)
	}
}

// =========================================================
// ListNotifications
// =========================================================

func TestListNotifications_DemoMode(t *testing.T) {
	s := newTestServer()
	resp, err := s.ListNotifications(testCtx(), connect.NewRequest(&estatev1.ListNotificationsRequest{
		EstateId: "estate_lockhart",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Msg.Notifications) != 1 {
		t.Fatalf("expected 1 notification, got %d", len(resp.Msg.Notifications))
	}
	if resp.Msg.Notifications[0].Type != "success" {
		t.Errorf("expected success type, got %q", resp.Msg.Notifications[0].Type)
	}
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
