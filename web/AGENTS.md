# AGENTS.md

## Universal Idea Router Startup Protocol

Every AI agent working in this repository, including Codex, Claude, Gemini, Qwen, or future agents, MUST learn and use the Idea Router before starting non-trivial work.

1. Read this `AGENTS.md` first.
2. Check for a repo-local router at `.agents/idea-router/`.
3. If no repo-local router exists, use the portfolio router at `/Users/thekryptodragon/Development/sirsi-pantheon/.agents/idea-router/`.
4. Read router `state.json`, `README.md`, and any pending item addressed to this repo's registered agent id before beginning unrelated work.
5. New work must include `/plan` and `/goal` and must continue until the `/goal` is met, blocked with evidence, or impossible with a stated reason.
6. Work is repo-segmented by default. Do not edit another repository unless a written super-agent mandate names the repos and grants that scope.
7. Router targets must use registered agent ids such as `codex-finalwishes-web`, `claude-finalwishes-web`, `codex-finalwishes`, or another entry in `agents.json`.

User shorthand: `ctr` means check the router.

## Net Goal-Weaving & Architecture Doctrine

Net 𓁯, The Weaver, keeps this repo aligned to the portfolio product goals. Agents must work independently toward the full `/goal` where possible and must include `eta_for_review`, `next_check_at`, or `estimated_duration` in router handoffs.

- Simplify vendor surface area: prefer GCP-native, Firebase-native, or open-source tools before paid third-party vendors.
- Use the Go API/domain engines for canonical business truth. Use Firestore only for real-time UX state, notifications, collaboration, presence, and denormalized dashboards.
- Use Cloud Storage for files, media, generated PDFs, evidence packets, and exports.
- Do not add a paid vendor without an ADR explaining why GCP/open-source is insufficient, data exposure, cost risk, exit path, and replacement plan.
- Do not reopen language choices without a measured blocker and ADR. FinalWishes web remains TypeScript/React.
- Product surface target: web and mobile.
