---
description: How to monitor context window and token usage during development sessions
---

# Context & Token Monitoring Workflow

## Overview
Use the AG Monitor Pro extension to track context window usage and token consumption.
Report status to the user after every sprint/phase to prevent context exhaustion.

## Pre-Sprint Check
// turbo
1. Open AG Monitor Pro status bar (bottom of IDE) — note current token counts
2. Record the starting input/output token count for the session

## During Work
- AG Monitor Pro runs passively in the status bar
- Monitor for context window fill warnings (>80% = wrap session soon)
- If approaching limits, proactively suggest creating a checkpoint/continuation prompt

## Post-Sprint Report (MANDATORY after every sprint)
After completing each sprint or phase, report the following to the user:

```
## 📊 Session Status Report
- **Commits this session:** [count]
- **Context window:** [estimate: healthy / getting deep / critical]
- **Recommendation:** [continue / wrap soon / wrap now]
```

### Context Health Indicators
| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 Healthy | Early in context, plenty of room | Continue working |
| 🟡 Getting Deep | Checkpoint has occurred or context is filling | Plan wrap within 2-3 more tasks |
| 🔴 Critical | Multiple checkpoints, frequent truncation | Wrap NOW — generate continuation prompt |

### Signs You're Deep in Context
- System checkpoint messages appear (context truncation)
- Earlier file views no longer in memory (need to re-read)
- Vite build output or git status must be re-viewed
- Response quality may degrade

## Session Wrap Protocol (when context is 🟡 or 🔴)
1. Commit all work with Rule 29 format
2. Push to GitHub
3. Update CHANGELOG.md
4. Generate fresh CONTINUATION-PROMPT.md
5. Report final session metrics to user

## AG Monitor Pro Commands
- `Ctrl+Shift+P` → "AG Monitor: Show Dashboard" — full token breakdown
- Status bar shows real-time token count
- Select interaction mode: "Code Gen" for development sessions
