# Changelog

## v1.0.1 (2026-03-31) - Login Flow Fix

### Bug Fixes
- **Login redirect issue**: Root page was statically rendered with redirect baked in
  - Fix: Added `export const dynamic = "force-dynamic"` to force server-side rendering
- **Cookie not working over HTTP**: Cookie had `Secure` flag which requires HTTPS
  - Fix: Only set `Secure` flag when both production AND HTTPS are enabled
- **E2E test strict mode violation**: Selector matched multiple elements
  - Fix: Use more specific selector (`h1` with containsText)

### PR Merged
- #31: fix/login-redirect

### Test Results
- Login → Instances redirect works ✅
- All 16 E2E tests pass ✅

<!-- source: login-fix -->

---

## v1.4 (2026-03-31) - Sprint 2 Start

### Sprint 1 Complete ✅

- 5 issues completed, 5 PRs merged
- Velocity: 5 issues / 1 day
- PRs merged: #15, #18, #19, #20, #21

### Sprint 2 Goals

- #22: Instance Start/Stop Actions (P1)
- #11: Monitoring Dashboard (P2)
- #14: Audit Log System (P3)

### New Issues Created

- #22: Instance Start/Stop Actions
- #23: Deployment Validation and Production Setup
- #24: E2E Testing with Playwright

### Auto Mode Active

- Tech Lead reviews PRs automatically
- PM plans next sprint when capacity available
- Memory updated after each milestone

<!-- source: sprint-2-start -->

## v1.3 (2026-03-31) - Sprint 1 Completion

### Features Implemented

- **#13 Admin Authentication**: Login/logout API, session cookies, middleware protection, seed script
- **#12 Instance CRUD**: API tests with Vitest (15 tests), full REST coverage
- **#10 Gateway Research**: OpenClaw auth patterns documented, implementation guide for #13
- **#16 i18n**: All Chinese docs translated to English

### Infrastructure

- Agile multi-agent orchestration system
- Sprint ceremonies (planning, standup, grooming, review, retro)
- HEARTBEAT.md for automated task triggers
- GitHub labels for workflow (ready-for-dev, in-progress, needs-review, blocked)

### Key Learnings

- Claude Code must run via `su - claude -c '...'` (ACP has env issues)
- Use `cmmb` agent for project work, `main` for cross-project
- Branch naming: `feature/`, `fix/`, `chore/`, `docs/`
<!-- source: sprint-1 -->

## v1.2 (2026-03-31) - Skills & Metrics Tracking

- Added 5 skills to project: github, gh-issues, coding-agent, tmux, skill-creator
- Created post-issue review process (workflows/post-issue-review.md)
- Initialized metrics tracking (memory/metrics-log.md)
- Updated heartbeat to include skill optimization checks
- Skills synced to GitHub as project state
<!-- source: skill-setup -->

## v1.1 (2026-03-31) - Main Agent Configuration

- Memory layered structure: conventions/ directory split (react/api/database/styling/git)
- Heartbeat active check mechanism (Issues/Subagents/PRs/Memory)
- Subagent templates created (frontend/backend/tech-lead/devops/qa)
- Issue state flow defined
- Memory version tagging mechanism
- state.json state tracking structure upgraded
<!-- source: workspace-setup -->

## v1.0 (2026-03-31) - Project Initialization

- Project docs created
- Tech stack: Next.js + TypeScript + MySQL + Prisma
- AI-native development mode defined
- OpenClaw DevOps evolution strategy defined
- `.claw/` directory structure created
- 6 Agent role definitions created
- Initial memory files created (architecture, conventions, domain-knowledge)
- Project docs created (PROJECT.md, PLAN.md, AI-DEV-GUIDE.md, README-DEVOPS.md)
<!-- source: initial -->

## v2026.04.01 - 2026-04-01
- Issue #82: #82 fix: E2E test strict mode violation on Add Instance button
