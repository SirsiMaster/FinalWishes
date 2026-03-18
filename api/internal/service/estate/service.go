package estate

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	"connectrpc.com/connect"
	"google.golang.org/api/iterator"
	"google.golang.org/protobuf/types/known/timestamppb"

	estatev1 "github.com/sirsi-technologies/finalwishes-api/internal/gen/estate/v1"
	"github.com/sirsi-technologies/finalwishes-api/internal/gen/estate/v1/estatev1connect"
)

// Server implements the EstateService with Google Cloud integrations
type Server struct {
	estatev1connect.UnimplementedEstateServiceHandler
	fs *firestore.Client
	sc *storage.Client
}

// NewServer returns an initialized server
func NewServer(fs *firestore.Client, sc *storage.Client) *Server {
	return &Server{
		fs: fs,
		sc: sc,
	}
}

// --- Vault & Storage (Signed URLs) ---

func (s *Server) GenerateUploadUrl(ctx context.Context, req *connect.Request[estatev1.GenerateUploadUrlRequest]) (*connect.Response[estatev1.GenerateUploadUrlResponse], error) {
	if s.sc == nil {
		// Mock for development if GCS not available
		return connect.NewResponse(&estatev1.GenerateUploadUrlResponse{
			UploadUrl: "http://localhost:8080/mock-upload",
			FinalUrl:  fmt.Sprintf("/vault/mock/%s", req.Msg.FileName),
		}), nil
	}

	bucketName := "finalwishes-vault" // Should be env var
	objectName := fmt.Sprintf("%s/%d-%s", req.Msg.EstateId, time.Now().Unix(), req.Msg.FileName)

	opts := &storage.SignedURLOptions{
		Scheme:         storage.SigningSchemeV4,
		Method:         "PUT",
		GoogleAccessID: "sirsi-master@sirsi-nexus.iam.gserviceaccount.com", // Example
		Expires:        time.Now().Add(15 * time.Minute),
		ContentType:    req.Msg.ContentType,
	}

	// Note: In a real environment, you'd use a service account key or metadata server
	// For now, providing the conceptual bridge
	u, err := storage.SignedURL(bucketName, objectName, opts)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to sign URL: %w", err))
	}

	return connect.NewResponse(&estatev1.GenerateUploadUrlResponse{
		UploadUrl: u,
		FinalUrl:  fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucketName, objectName),
	}), nil
}

// --- Core Estate Management (Firestore) ---

func (s *Server) ListBeneficiaries(ctx context.Context, req *connect.Request[estatev1.ListBeneficiariesRequest]) (*connect.Response[estatev1.ListBeneficiariesResponse], error) {
	if s.fs == nil {
		return connect.NewResponse(&estatev1.ListBeneficiariesResponse{
			Beneficiaries: []*estatev1.Beneficiary{
				{Id: "1", Name: "Sarah Johnson", Relation: "Spouse", Share: "50%", Status: "Verified", Email: "sarah@example.com"},
			},
		}), nil
	}

	var beneficiaries []*estatev1.Beneficiary
	iter := s.fs.Collection("estates").Doc(req.Msg.EstateId).Collection("beneficiaries").Documents(ctx)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to fetch beneficiaries: %w", err))
		}

		var b estatev1.Beneficiary
		if err := doc.DataTo(&b); err != nil {
			continue
		}
		b.Id = doc.Ref.ID
		beneficiaries = append(beneficiaries, &b)
	}

	return connect.NewResponse(&estatev1.ListBeneficiariesResponse{Beneficiaries: beneficiaries}), nil
}

func (s *Server) AddBeneficiary(ctx context.Context, req *connect.Request[estatev1.AddBeneficiaryRequest]) (*connect.Response[estatev1.AddBeneficiaryResponse], error) {
	if s.fs == nil {
		return nil, connect.NewError(connect.CodeUnimplemented, fmt.Errorf("firestore not initialized"))
	}

	newBene := &estatev1.Beneficiary{
		Name:     req.Msg.Name,
		Relation: req.Msg.Relation,
		Email:    req.Msg.Email,
		Share:    "TBD",
		Status:   "Invited",
	}

	docRef, _, err := s.fs.Collection("estates").Doc(req.Msg.EstateId).Collection("beneficiaries").Add(ctx, map[string]interface{}{
		"name":     newBene.Name,
		"relation": newBene.Relation,
		"email":    newBene.Email,
		"share":    newBene.Share,
		"status":   newBene.Status,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to add beneficiary: %w", err))
	}

	newBene.Id = docRef.ID
	return connect.NewResponse(&estatev1.AddBeneficiaryResponse{Beneficiary: newBene}), nil
}

func (s *Server) ListEstates(ctx context.Context, req *connect.Request[estatev1.ListEstatesRequest]) (*connect.Response[estatev1.ListEstatesResponse], error) {
	if s.fs == nil {
		estates := []*estatev1.EstateSummary{
			{Id: "estate-77b", Name: "The Collymore Portfolio", Role: "Owner"},
			{Id: "estate-99c", Name: "The Collymore Dynasty Trust", Role: "Executor"},
		}
		return connect.NewResponse(&estatev1.ListEstatesResponse{Estates: estates}), nil
	}

	var estates []*estatev1.EstateSummary
	iter := s.fs.Collection("estates").Where("user_id", "==", req.Msg.UserId).Documents(ctx)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to list estates: %w", err))
		}

		var summary estatev1.EstateSummary
		if err := doc.DataTo(&summary); err != nil {
			continue
		}
		summary.Id = doc.Ref.ID
		estates = append(estates, &summary)
	}

	return connect.NewResponse(&estatev1.ListEstatesResponse{Estates: estates}), nil
}

func (s *Server) RegisterEstate(ctx context.Context, req *connect.Request[estatev1.RegisterEstateRequest]) (*connect.Response[estatev1.RegisterEstateResponse], error) {
	if s.fs == nil {
		return nil, connect.NewError(connect.CodeUnimplemented, fmt.Errorf("firestore not initialized"))
	}

	docRef, _, err := s.fs.Collection("estates").Add(ctx, map[string]interface{}{
		"user_id":               req.Msg.UserId,
		"name":                  req.Msg.Name,
		"type":                  req.Msg.Type,
		"role":                  "Owner", // Default for creator
		"status":                "Active",
		"completion_percentage": 10,
		"authority_mode":        int32(estatev1.AuthorityMode_AUTHORITY_MODE_OWNER),
		"next_review_date":      time.Now().AddDate(0, 1, 0),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to register estate: %w", err))
	}

	return connect.NewResponse(&estatev1.RegisterEstateResponse{
		Estate: &estatev1.EstateSummary{
			Id:   docRef.ID,
			Name: req.Msg.Name,
			Role: "Owner",
		},
	}), nil
}

func (s *Server) GetEstateMetadata(ctx context.Context, req *connect.Request[estatev1.GetEstateMetadataRequest]) (*connect.Response[estatev1.GetEstateMetadataResponse], error) {
	if s.fs == nil {
		return connect.NewResponse(&estatev1.GetEstateMetadataResponse{
			Status:               "Active",
			CompletionPercentage: 34,
			Tier:                 "Concierge",
			MfaEnabled:           true,
			LastLogin:            timestamppb.Now(),
			NextReviewDate:       timestamppb.Now(),
			AuthorityMode:        estatev1.AuthorityMode_AUTHORITY_MODE_OWNER,
		}), nil
	}

	doc, err := s.fs.Collection("estates").Doc(req.Msg.EstateId).Get(ctx)
	if err != nil {
		// Provide default if not in Firestore yet for demo
		return connect.NewResponse(&estatev1.GetEstateMetadataResponse{
			Status:               "Active",
			CompletionPercentage: 34,
			AuthorityMode:        estatev1.AuthorityMode_AUTHORITY_MODE_OWNER,
		}), nil
	}

	var meta estatev1.GetEstateMetadataResponse
	if err := doc.DataTo(&meta); err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to decode metadata: %w", err))
	}

	return connect.NewResponse(&meta), nil
}

func (s *Server) ListAssets(ctx context.Context, req *connect.Request[estatev1.ListAssetsRequest]) (*connect.Response[estatev1.ListAssetsResponse], error) {
	if s.fs == nil {
		assets := []*estatev1.Asset{
			{Name: "Family Home", Type: "Real Estate", Value: "$485,000", Status: "Verified"},
			{Name: "Savings Account (Chase)", Type: "Cash", Value: "$124,500", Status: "Pending"},
		}
		return connect.NewResponse(&estatev1.ListAssetsResponse{Assets: assets, TotalCount: int32(len(assets))}), nil
	}

	var assets []*estatev1.Asset
	iter := s.fs.Collection("estates").Doc(req.Msg.EstateId).Collection("assets").Documents(ctx)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to fetch assets: %w", err))
		}

		var a estatev1.Asset
		if err := doc.DataTo(&a); err != nil {
			continue
		}
		assets = append(assets, &a)
	}

	return connect.NewResponse(&estatev1.ListAssetsResponse{Assets: assets, TotalCount: int32(len(assets))}), nil
}

func (s *Server) AddAsset(ctx context.Context, req *connect.Request[estatev1.AddAssetRequest]) (*connect.Response[estatev1.AddAssetResponse], error) {
	if s.fs == nil {
		return nil, connect.NewError(connect.CodeUnimplemented, fmt.Errorf("firestore not initialized"))
	}

	newAsset := &estatev1.Asset{
		Name:   req.Msg.Name,
		Type:   req.Msg.Type,
		Value:  req.Msg.Value,
		Status: "Verified",
	}

	_, _, err := s.fs.Collection("estates").Doc(req.Msg.EstateId).Collection("assets").Add(ctx, map[string]interface{}{
		"name":   newAsset.Name,
		"type":   newAsset.Type,
		"value":  newAsset.Value,
		"status": newAsset.Status,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to add asset: %w", err))
	}

	return connect.NewResponse(&estatev1.AddAssetResponse{Asset: newAsset}), nil
}

func (s *Server) ListVaultDocuments(ctx context.Context, req *connect.Request[estatev1.ListVaultDocumentsRequest]) (*connect.Response[estatev1.ListVaultDocumentsResponse], error) {
	if s.fs == nil {
		docs := []*estatev1.VaultDocument{
			{Name: "Last_Will_Testament_2025.pdf", Date: "Mar 14, 2025", Size: "2.4 MB", Category: "Legal"},
		}
		return connect.NewResponse(&estatev1.ListVaultDocumentsResponse{Documents: docs}), nil
	}

	var docs []*estatev1.VaultDocument
	iter := s.fs.Collection("estates").Doc(req.Msg.EstateId).Collection("vault").Documents(ctx)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to fetch vault docs: %w", err))
		}

		var d estatev1.VaultDocument
		if err := doc.DataTo(&d); err != nil {
			continue
		}
		docs = append(docs, &d)
	}

	return connect.NewResponse(&estatev1.ListVaultDocumentsResponse{Documents: docs}), nil
}

func (s *Server) ListMemoirs(ctx context.Context, req *connect.Request[estatev1.ListMemoirsRequest]) (*connect.Response[estatev1.ListMemoirsResponse], error) {
	if s.fs == nil {
		memoirs := []*estatev1.Memoir{
			{Id: "1", Title: "Legacy Tape 01", Type: "video", Url: "/memoirs/legacy.mp4", DateAdded: "Today", Visibility: "private"},
		}
		return connect.NewResponse(&estatev1.ListMemoirsResponse{Memoirs: memoirs}), nil
	}

	var memoirs []*estatev1.Memoir
	iter := s.fs.Collection("estates").Doc(req.Msg.EstateId).Collection("memoirs").Documents(ctx)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to fetch memoirs: %w", err))
		}

		var m estatev1.Memoir
		if err := doc.DataTo(&m); err != nil {
			continue
		}
		m.Id = doc.Ref.ID
		memoirs = append(memoirs, &m)
	}

	return connect.NewResponse(&estatev1.ListMemoirsResponse{Memoirs: memoirs}), nil
}

func (s *Server) UploadMemoir(ctx context.Context, req *connect.Request[estatev1.UploadMemoirRequest]) (*connect.Response[estatev1.UploadMemoirResponse], error) {
	if s.fs == nil {
		return nil, connect.NewError(connect.CodeUnimplemented, fmt.Errorf("firestore not initialized"))
	}

	newMemoir := &estatev1.Memoir{
		Title:     req.Msg.Title,
		Type:      req.Msg.Type,
		Url:       req.Msg.Url,
		DateAdded: time.Now().Format("Jan 02, 2006"),
		Visibility: "private",
	}

	docRef, _, err := s.fs.Collection("estates").Doc(req.Msg.EstateId).Collection("memoirs").Add(ctx, map[string]interface{}{
		"title":       newMemoir.Title,
		"type":        newMemoir.Type,
		"url":         newMemoir.Url,
		"date_added":  newMemoir.DateAdded,
		"visibility":  newMemoir.Visibility,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to save memoir: %w", err))
	}

	newMemoir.Id = docRef.ID
	return connect.NewResponse(&estatev1.UploadMemoirResponse{Memoir: newMemoir}), nil
}

func (s *Server) GetObituary(ctx context.Context, req *connect.Request[estatev1.GetObituaryRequest]) (*connect.Response[estatev1.GetObituaryResponse], error) {
	if s.fs == nil {
		return connect.NewResponse(&estatev1.GetObituaryResponse{
			Content:     "Marcus Aurelius was a philosopher-king.",
			Status:      "Draft",
			LastUpdated: timestamppb.Now(),
		}), nil
	}

	doc, err := s.fs.Collection("estates").Doc(req.Msg.EstateId).Collection("governance").Doc("obituary").Get(ctx)
	if err != nil {
		// If document doesn't exist, return a default draft
		return connect.NewResponse(&estatev1.GetObituaryResponse{
			Content:     "",
			Status:      "None",
			LastUpdated: timestamppb.Now(),
		}), nil
	}

	var obit estatev1.GetObituaryResponse
	if err := doc.DataTo(&obit); err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to decode obituary: %w", err))
	}
	
	// Handle timestamp conversion if needed, otherwise firestore stores it
	return connect.NewResponse(&obit), nil
}

func (s *Server) SaveObituary(ctx context.Context, req *connect.Request[estatev1.SaveObituaryRequest]) (*connect.Response[estatev1.SaveObituaryResponse], error) {
	if s.fs == nil {
		return nil, connect.NewError(connect.CodeUnimplemented, fmt.Errorf("firestore not initialized"))
	}

	_, err := s.fs.Collection("estates").Doc(req.Msg.EstateId).Collection("governance").Doc("obituary").Set(ctx, map[string]interface{}{
		"content":      req.Msg.Content,
		"status":       "Draft",
		"last_updated": timestamppb.Now(),
	}, firestore.MergeAll)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to save obituary: %w", err))
	}

	return connect.NewResponse(&estatev1.SaveObituaryResponse{Success: true}), nil
}

func (s *Server) GetAIInsight(ctx context.Context, req *connect.Request[estatev1.GetAIInsightRequest]) (*connect.Response[estatev1.GetAIInsightResponse], error) {
	insight := "Your estate is currently 34% complete. We've detected that you have registered beneficiaries but haven't assigned their specific shares. Legally, unassigned shares default to statutory probate in many jurisdictions, which may not align with your wishes."
	return connect.NewResponse(&estatev1.GetAIInsightResponse{
		Insight:     insight,
		ActionLabel: "Assign Shares",
		ActionUrl:   "/dashboard/beneficiaries",
	}), nil
}

func (s *Server) GetGovernanceSettings(ctx context.Context, req *connect.Request[estatev1.GetGovernanceSettingsRequest]) (*connect.Response[estatev1.GetGovernanceSettingsResponse], error) {
	if s.fs == nil {
		return connect.NewResponse(&estatev1.GetGovernanceSettingsResponse{
			Settings: &estatev1.GovernanceSettings{
				MfaEnabled:             true,
				BiometricRelease:       false,
				EmailAlerts:            true,
				RecoveryKeyStatus:      "Verified",
				StatusReportsFrequency: "Weekly",
			},
		}), nil
	}

	doc, err := s.fs.Collection("estates").Doc(req.Msg.EstateId).Collection("governance").Doc("settings").Get(ctx)
	if err != nil {
		return connect.NewResponse(&estatev1.GetGovernanceSettingsResponse{
			Settings: &estatev1.GovernanceSettings{MfaEnabled: true},
		}), nil
	}

	var settings estatev1.GovernanceSettings
	if err := doc.DataTo(&settings); err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to decode settings: %w", err))
	}

	return connect.NewResponse(&estatev1.GetGovernanceSettingsResponse{Settings: &settings}), nil
}

func (s *Server) ListNotifications(ctx context.Context, req *connect.Request[estatev1.ListNotificationsRequest]) (*connect.Response[estatev1.ListNotificationsResponse], error) {
	if s.fs == nil {
		notifications := []*estatev1.Notification{
			{Title: "Security Active", Time: "10 mins ago", Type: "success", Desc: "Protocols verified."},
		}
		return connect.NewResponse(&estatev1.ListNotificationsResponse{Notifications: notifications}), nil
	}

	var notifications []*estatev1.Notification
	iter := s.fs.Collection("estates").Doc(req.Msg.EstateId).Collection("notifications").OrderBy("time", firestore.Desc).Limit(10).Documents(ctx)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break // Graceful degradation
		}

		var n estatev1.Notification
		if err := doc.DataTo(&n); err != nil {
			continue
		}
		notifications = append(notifications, &n)
	}

	return connect.NewResponse(&estatev1.ListNotificationsResponse{Notifications: notifications}), nil
}
