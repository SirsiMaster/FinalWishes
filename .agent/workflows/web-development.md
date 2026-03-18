---
description: React web dashboard development workflow for FinalWishes
---
// turbo-all

# Web Development Workflow

## Pre-Flight
1. Read `GEMINI.md` — confirm this is FinalWishes, NOT SirsiNexusApp
2. Read `docs/DATA_MODEL_LOCK.md` — schemas are LOCKED
3. Check current branch: `git branch --show-current` (must be `develop`)

## Development Cycle
1. Run dev server: `cd /Users/thekryptodragon/Development/FinalWishes/web && npm run dev`
2. Make changes to files in `web/src/`
3. Verify build: `cd /Users/thekryptodragon/Development/FinalWishes/web && npm run build`
4. Check for TypeScript errors in build output (zero errors required)

## Design Rules (Royal Neo-Deco — HiFi Executive)
- Headers: `text-5xl font-cinzel font-bold text-[#0F172A]`
- Descriptions: `text-[#64748B] text-lg font-medium` — sentence case
- Cards: `bg-white rounded-[2.5rem] border border-slate-100 shadow-sm`
- Buttons: `bg-[#133378] hover:bg-[#1E3A5F] text-white rounded-2xl font-bold`
- Labels: `text-[11px] font-bold text-slate-400 uppercase tracking-widest`
- NO `font-black`, NO uppercase body text, NO slate/grey for primary content

## Deploy
1. Build: `cd /Users/thekryptodragon/Development/FinalWishes/web && npm run build`
2. Deploy: `cd /Users/thekryptodragon/Development/FinalWishes && firebase deploy --only hosting`
3. Push: `cd /Users/thekryptodragon/Development/FinalWishes && git add -A && git commit -m "message" && git push origin develop`
4. Verify: https://legacy-estate-os.web.app
