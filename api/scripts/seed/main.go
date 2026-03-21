package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"cloud.google.com/go/firestore"
)

func main() {
	ctx := context.Background()
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = "finalwishes-prod" // Default for this project
	}

	fmt.Printf("Seeding Firestore for project: %s\n", projectID)

	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("Failed to create firestore client: %v", err)
	}
	defer client.Close()

	// 1. Seed Tameeka Lockhart User
	tameekaID := "user_tameeka"
	_, err = client.Collection("users").Doc(tameekaID).Set(ctx, map[string]interface{}{
		"name":                "Tameeka Lockhart",
		"email":               "Tameekalockhart@gmail.com",
		"phone":               "123-456-7890",
		"username":            "Tameeka116",
		"profile_photo_url":   "/assets/tameeka/mom dance.jpg",
		"primary_estate_id":   "estate_lockhart",
		"primary_estate_name": "Lockhart Estate",
		"role":                "SuperAdmin",
		"status":              "Active",
	})
	if err != nil {
		log.Fatalf("Failed to seed Tameeka user: %v", err)
	}
	fmt.Println("✅ Seeded Tameeka Lockhart User")

	// 2. Seed Lockhart Estate
	estateID := "estate_lockhart"
	_, err = client.Collection("estates").Doc(estateID).Set(ctx, map[string]interface{}{
		"name":                  "Lockhart Estate",
		"user_id":               tameekaID,
		"status":                "Active",
		"completion_percentage": 100,
		"authority_mode":        1, // Owner
		"tier":                  "Concierge+",
		"mfa_enabled":           true,
	})
	if err != nil {
		log.Fatalf("Failed to seed Lockhart Estate: %v", err)
	}
	fmt.Println("✅ Seeded Lockhart Estate Metadata")

	// 3. Seed Assets for Lockhart Estate
	assets := []map[string]interface{}{
		{"name": "Lockhart Family Residence (Chicago)", "type": "Real Estate", "value": "$1,250,000", "status": "Verified"},
		{"name": "Lockhart Heritage Investment Fund", "type": "Securities", "value": "$2,450,000", "status": "Verified"},
		{"name": "Chase Private Client - Savings", "type": "Cash", "value": "$425,000", "status": "Verified"},
		{"name": "Digital Vault - Rare Collectibles", "type": "Digital Assets", "value": "$85,000", "status": "Verified"},
	}

	assetsColl := client.Collection("estates").Doc(estateID).Collection("assets")
	for _, asset := range assets {
		_, _, err = assetsColl.Add(ctx, asset)
		if err != nil {
			log.Fatalf("Failed to seed asset %s: %v", asset["name"], err)
		}
	}
	fmt.Println("✅ Seeded Lockhart Estate Assets")

	// 4. Seed Beneficiaries
	beneficiaries := []map[string]interface{}{
		{"name": "Lockhart Family Trust", "relation": "Primary Heir", "share": "100%", "status": "Verified", "email": "trustees@lockhart.legacy"},
	}
	beneColl := client.Collection("estates").Doc(estateID).Collection("beneficiaries")
	for _, bene := range beneficiaries {
		_, _, err = beneColl.Add(ctx, bene)
		if err != nil {
			log.Fatalf("Failed to seed beneficiary %s: %v", bene["name"], err)
		}
	}
	fmt.Println("✅ Seeded Lockhart Beneficiaries")

	// 5. Seed Vault Documents
	docs := []map[string]interface{}{
		{"name": "Lockhart_Master_Trust_2026.pdf", "date": "Feb 10, 2026", "size": "4.2 MB", "category": "Legal"},
		{"name": "Estate_Tax_Clearance_IL.pdf", "date": "Mar 01, 2026", "size": "1.1 MB", "category": "Tax"},
		{"name": "Family_Heritage_Deed.pdf", "date": "Jan 15, 2026", "size": "8.5 MB", "category": "Property"},
		{"name": "Final_Wishes_Protocol_Auth.pdf", "date": "Mar 17, 2026", "size": "0.5 MB", "category": "Protocol"},
	}
	vaultColl := client.Collection("estates").Doc(estateID).Collection("vault")
	for _, d := range docs {
		_, _, err = vaultColl.Add(ctx, d)
		if err != nil {
			log.Fatalf("Failed to seed vault document %s: %v", d["name"], err)
		}
	}
	fmt.Println("✅ Seeded Lockhart Vault Documents")

	// 6. Seed Memoirs
	memoirs := []map[string]interface{}{
		{"title": "Mommy - Legacy Tape 01", "type": "video", "url": "/assets/tameeka/mommy.mp4", "date_added": "Mar 17, 2026", "visibility": "private"},
		{"title": "Musical Tribute - Live Session", "type": "video", "url": "/assets/tameeka/musical tribute.mp4", "date_added": "Mar 17, 2026", "visibility": "all_heirs"},
		{"title": "Mom Memorial - Heritage Photo", "type": "photo", "url": "/assets/tameeka/mom memorial.jpg", "date_added": "Feb 10, 2026", "visibility": "private"},
		{"title": "Mom Dance - Legacy Profile", "type": "photo", "url": "/assets/tameeka/mom dance.jpg", "date_added": "Jan 15, 2026", "visibility": "private"},
	}
	memoirsColl := client.Collection("estates").Doc(estateID).Collection("memoirs")
	for _, m := range memoirs {
		_, _, err = memoirsColl.Add(ctx, m)
		if err != nil {
			log.Fatalf("Failed to seed memoir %s: %v", m["title"], err)
		}
	}
	fmt.Println("✅ Seeded Lockhart Memoirs")

	// 7. Seed Obituary
	_, err = client.Collection("estates").Doc(estateID).Collection("governance").Doc("obituary").Set(ctx, map[string]interface{}{
		"content":      "Tameeka Lockhart, the guardian of the Lockhart Legacy, has established this final record as a testament to strength, family, and the enduring spirit of the Lockhart Estate. Her contributions to the community and her family remain indelible.",
		"status":       "Verified",
		"last_updated": firestore.ServerTimestamp,
	})
	if err != nil {
		log.Fatalf("Failed to seed obituary: %v", err)
	}
	fmt.Println("✅ Seeded Lockhart Obituary")

	fmt.Println("\n🚀 Firestore Seeding Complete for Tameeka Lockhart (Lockhart Estate)")
}
