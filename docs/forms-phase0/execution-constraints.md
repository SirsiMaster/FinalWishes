# Execution Constraints — IL Phase-1 Forms

> # ⚠️ DRAFT — requires counsel review. NOT legal advice. NOT a product inference for execution rules.
> Values below are drafted from the FinalWishes repo's own IL knowledge
> (`api/internal/probate/directives.go`, `docs/user-guides/illinois-estate-planning.md`) and must be
> verified by a licensed Illinois attorney before any form is treated as executable. **Where a rule is
> ambiguous or unverified, default to WET-SIGN / PRINT-READY** (do not auto-assert e-sign eligibility).

## Table

| Form | Wet-sign required? | E-sign eligible? | # Witnesses | Notary required? | Filing / delivery | Citation (source) |
|------|--------------------|------------------|-------------|------------------|-------------------|-------------------|
| Health Care POA | **Default WET-SIGN** (print-ready) | Unverified → treat NO until counsel-confirmed | **1** (18+) | No | Deliver copies to agent + physicians; no court filing | 755 ILCS 45/ (repo `directives.go` hcpoa: WitnessRequired=1, NotaryRequired=false) |
| HIPAA Authorization | **Default WET-SIGN** | Unverified → treat NO | 0 (none statutorily required) | No | Deliver to providers / records custodians | 45 CFR 164.508 (federal); often subsumed in HCPOA records-access clause. No IL statutory PDF. |
| Financial / Property POA | **Default WET-SIGN** | Unverified → treat NO | **1** | **Yes if real-estate powers exercised / recording** | Record with County Recorder when used for real property | 755 ILCS 45/ Art. III; repo user guide §"Statutory Short Form POA for Property" (notary required for real-estate transactions) |
| Living Will | **Default WET-SIGN** | Unverified → treat NO | **1** (18+) | No | Deliver to physician; no court filing | 755 ILCS 35/ (repo `directives.go` living_will: WitnessRequired=1, NotaryRequired=false) |
| Mental Health Treatment Pref. Declaration | **Default WET-SIGN** | Unverified → treat NO | **1** (18+) | No | Deliver to mental-health providers; **expires 3 yrs**, re-execute | Mental Health Treatment Preference Declaration Act, 755 ILCS 43/ (repo `directives.go` mental_health: WitnessRequired=1, ValidityYears=3) |
| Disposition of Remains | **WET-SIGN** | NO | Per statute (agent signs) | **Yes (notarized)** | Effective on death; deliver to agent | 755 ILCS 65/ (Disposition of Remains Act); repo user guide: "Signed by you and your agent, notarized" |
| Small Estate Affidavit | **WET-SIGN** (sworn affidavit) | NO (sworn under oath) | 0 | **Typically notarized / sworn** — verify | Present to asset holders; **30-day** wait after death; cert. death cert attached | 755 ILCS 5/25-1; repo user guide §"Small Estate Affidavit" ($150K threshold, 30-day wait, death cert) |
| VSD 773 (Vehicle Beneficiary Affidavit) | **WET-SIGN** | NO | 0 | **Yes (notarized)** | Submit to IL SOS Vehicle Services | IL SOS VSD 773; repo user guide: "must be notarized" |

## Notes
- **Default-to-wet-sign rationale:** Illinois has not been confirmed (in repo or here) to accept
  remote/e-signature for these statutory instruments; advance directives and affidavits carry
  witness/notary formalities that e-sign flows must specifically satisfy. Until counsel confirms,
  every Phase-1 form is **print-ready output only** (fill → lock/flatten → print → wet-sign).
- **Witness counts** come directly from the repo's encoded directive rules; the statutory HCPOA short
  form historically requires one witness who is not the agent/attending physician — **confirm witness
  eligibility constraints with counsel** (the repo encodes count, not full eligibility logic).
- **HIPAA** has no IL statutory blank; its execution rules are federal and provider-driven — flagged
  as an app-generated form, not a government form-fill target.
