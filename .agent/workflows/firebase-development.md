---
description: Firebase infrastructure development workflow for FinalWishes
---
// turbo-all

# Firebase Development Workflow

## Pre-Flight
1. Verify Firebase project: `firebase projects:list` (must show `legacy-estate-os`)
2. Verify login: `firebase login:list`
3. Check current config: `cat /Users/thekryptodragon/Development/FinalWishes/firebase.json`

## Firestore Rules
- Source: `/Users/thekryptodragon/Development/FinalWishes/firestore.rules`
- Deploy: `cd /Users/thekryptodragon/Development/FinalWishes && firebase deploy --only firestore:rules`
- Test: Use Firebase emulator — `firebase emulators:start --only firestore`

## Storage Rules
- Source: `/Users/thekryptodragon/Development/FinalWishes/storage.rules`
- Deploy: `cd /Users/thekryptodragon/Development/FinalWishes && firebase deploy --only storage`

## Hosting
- Source: `web/dist` (built by Vite)
- Deploy: `cd /Users/thekryptodragon/Development/FinalWishes && firebase deploy --only hosting`
- URL: https://legacy-estate-os.web.app

## Full Deploy
```bash
cd /Users/thekryptodragon/Development/FinalWishes && firebase deploy
```

## Security Rules Testing
- All estate data scoped by `estateId`
- Users can only read/write their own `users/{userId}` doc
- Estate access requires `estate_users/{userId}_{estateId}` doc to exist
- PII NEVER in Firestore — Cloud SQL only
