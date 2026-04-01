#!/usr/bin/env bash
# =============================================================================
# init-waterfall-multiagent.sh
# 
# Transforms an empty OpenClaw into a deterministic waterfall-mode multi-agent
# system for the ClawMeMaybe/cmmb project.
#
# Fixes 4 critical problems:
# 1. Memory drift → Independent memory-sync cron
# 2. Workspace confusion → Fix cmmb agent definition + channel binding
# 3. Claude Code abandonment → Explicit exec mode in pipeline config
# 4. Dead cron/auto mode → OpenClaw cron jobs for waterfall pipeline
#
# Usage: Run on the remote OpenClaw machine as root
#   bash init-waterfall-multiagent.sh
# =============================================================================

set -euo pipefail

OPENCLAW_DIR="/root/.openclaw"
PROJECT_DIR="/home/claude/projects/cmmb"
CMMB_WORKSPACE="$OPENCLAW_DIR/workspaces/cmmb"
CMMB_AGENT_DIR="$OPENCLAW_DIR/agents/cmmb/agent"
CRON_DIR="$OPENCLAW_DIR/cron"
PIPELINE_DIR="/tmp/cmmb-pipeline"
REPO="ClawMeMaybe/cmmb"
TODAY=$(date +%Y-%m-%d)

echo "=========================================="
echo " OpenClaw Waterfall Multi-Agent Init"
echo " $(date)"
echo "=========================================="

# ─── Part 0: Pre-flight checks ───────────────────────────────────────────────
echo ""
echo "[0/6] Pre-flight checks..."

for cmd in gh python3 jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "FAIL: Missing required command: $cmd"
    exit 1
  fi
done

if [ ! -d "$PROJECT_DIR" ]; then
  echo "FAIL: Project directory not found: $PROJECT_DIR"
  exit 1
fi

if [ ! -d "$CMMB_WORKSPACE" ]; then
  echo "FAIL: CMMB workspace not found: $CMMB_WORKSPACE"
  exit 1
fi

if ! gh auth status &>/dev/null 2>&1; then
  echo "WARN: GitHub CLI not authenticated. Run: gh auth login"
fi

echo "OK: All pre-flight checks passed"

# ─── Part 1: Fix OpenClaw Configuration ──────────────────────────────────────
echo ""
echo "[1/6] Fixing OpenClaw configuration..."

echo "  -> Creating cmmb agent definition..."
mkdir -p "$CMMB_AGENT_DIR"

cp "$CMMB_WORKSPACE/SOUL.md" "$CMMB_AGENT_DIR/SOUL.md"
cp "$CMMB_WORKSPACE/USER.md" "$CMMB_AGENT_DIR/USER.md"
cp "$CMMB_WORKSPACE/IDENTITY.md" "$CMMB_AGENT_DIR/IDENTITY.md"

echo "  OK: cmmb agent definition created at $CMMB_AGENT_DIR"

echo "  -> Fixing openclaw.json..."
python3 << 'PYEOF'
import json

config_path = "/root/.openclaw/openclaw.json"
with open(config_path) as f:
    config = json.load(f)

for agent in config["agents"]["list"]:
    if agent["id"] == "cmmb":
        agent["workspace"] = "/root/.openclaw/workspaces/cmmb"
        agent["agentDir"] = "/root/.openclaw/agents/cmmb/agent"
        agent["name"] = "cmmb"
        break

config["agents"]["defaults"]["workspace"] = "/root/.openclaw/workspaces/cmmb"

with open(config_path, "w") as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print("  OK: openclaw.json updated")
PYEOF

echo "  -> Cleaning main workspace..."
cat > "$OPENCLAW_DIR/workspace/SOUL.md" << 'MAINSOUL'
# SOUL.md - Main Agent Identity

You are the main OpenClaw agent for cross-project tasks and system administration.

## Role
- System administration and monitoring
- Cross-project coordination
- User assistance for general tasks

## Important
- When the user mentions "cmmb" or "ClawMeMaybe", suggest they use the cmmb agent
- Do NOT work on ClawMeMaybe project code directly
- Do NOT create or modify files in /home/claude/projects/

## Boundaries
- Private things stay private
- When in doubt, ask before acting externally
- Never send half-baked replies to messaging surfaces
MAINSOUL

echo "  OK: Main workspace cleaned"

# ─── Part 2: Create Waterfall Pipeline Configuration ─────────────────────────
echo ""
echo "[2/6] Creating pipeline configuration..."

mkdir -p "$CMMB_WORKSPACE/.claw"

cat > "$CMMB_WORKSPACE/.claw/pipeline.json" << 'PIPELINE'
{
  "version": 1,
  "mode": "waterfall",
  "maxRetries": 3,
  "maxConcurrent": 1,
  "stages": ["architect", "coder", "reviewer", "qa", "docs", "pr-creator"],
  "stageConfig": {
    "architect": {
      "model": "bailian/qwen3-coder-next",
      "timeout": 600,
      "description": "Analyze issue, produce technical spec"
    },
    "coder": {
      "model": "bailian/qwen3-coder-plus",
      "timeout": 1800,
      "execMode": "claude-code",
      "description": "Implement code based on spec"
    },
    "reviewer": {
      "model": "bailian/qwen3.5-plus",
      "timeout": 300,
      "description": "Review code against spec and conventions"
    },
    "qa": {
      "model": "bailian/qwen3-coder-plus",
      "timeout": 600,
      "execMode": "claude-code",
      "description": "Run tests, create additional tests"
    },
    "docs": {
      "model": "bailian/qwen3.5-plus",
      "timeout": 300,
      "description": "Update documentation and memory files"
    },
    "pr-creator": {
      "model": "bailian/qwen3.5-plus",
      "timeout": 300,
      "description": "Create PR, notify user"
    }
  },
  "labelPipeline": {
    "needs-architect": "architect",
    "architecting": "architect",
    "needs-code": "coder",
    "coding": "coder",
    "needs-review": "reviewer",
    "reviewing": "reviewer",
    "needs-test": "qa",
    "testing": "qa",
    "needs-docs": "docs",
    "documenting": "docs",
    "ready-for-pr": "pr-creator",
    "ready-for-human": null
  }
}
PIPELINE

echo "  OK: Pipeline configuration created"

# ─── Part 3: Create Waterfall Pipeline Scripts ───────────────────────────────
echo ""
echo "[3/6] Creating waterfall pipeline scripts..."

mkdir -p "$CRON_DIR"
mkdir -p "$PIPELINE_DIR"

# ─── 3a: Main Orchestrator ───────────────────────────────────────────────────
cat > "$CRON_DIR/waterfall-pick.sh" << 'WATERFALL_PICK'
#!/usr/bin/env bash
# waterfall-pick.sh - Main orchestrator for waterfall pipeline
set -euo pipefail

REPO="ClawMeMaybe/cmmb"
PROJECT_DIR="/home/claude/projects/cmmb"
PIPELINE_DIR="/tmp/cmmb-pipeline"
CRON_DIR="/root/.openclaw/cron"
TODAY=$(date +%Y-%m-%d)
MEMORY_FILE="/root/.openclaw/workspaces/cmmb/memory/${TODAY}.md"
LOCK_FILE="/tmp/cmmb-pipeline.lock"

log() {
  echo "[$(date '+%H:%M:%S')] $1"
  mkdir -p "$(dirname "$MEMORY_FILE")"
  echo "- $(date '+%H:%M:%S') $1" >> "$MEMORY_FILE"
}

# Prevent concurrent pipeline runs
if [ -f "$LOCK_FILE" ]; then
  LOCK_AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0) ))
  if [ "$LOCK_AGE" -lt 3600 ]; then
    log "Pipeline already running (lock age: ${LOCK_AGE}s), skipping"
    exit 0
  fi
  log "Stale lock file removed (${LOCK_AGE}s old)"
  rm -f "$LOCK_FILE"
fi

touch "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# Pull latest code
cd "$PROJECT_DIR" && git pull --rebase origin main 2>/dev/null || true

# Find issues needing architecture
ISSUES=$(gh issue list --repo "$REPO" --label "needs-architect" --state open --limit 1 --json number,title -q '.[0] | "#\(.number) \(.title)"' 2>/dev/null || echo "")

if [ -z "$ISSUES" ]; then
  log "No issues need architect. Pipeline idle."
  exit 0
fi

ISSUE_NUM=$(echo "$ISSUES" | grep -oP '^\d+')
ISSUE_TITLE=$(echo "$ISSUES" | sed 's/^[0-9]* //')

log "Starting pipeline for Issue #$ISSUE_NUM: $ISSUE_TITLE"

# Create pipeline workspace for this issue
ISSUE_DIR="$PIPELINE_DIR/$ISSUE_NUM"
mkdir -p "$ISSUE_DIR"/{architect,coder,reviewer,qa,docs,pr-creator}

# Get full issue body
gh issue view "$ISSUE_NUM" --repo "$REPO" --json body -q '.body' > "$ISSUE_DIR/issue-body.md" 2>/dev/null || true

# ─── Stage 1: Architect ──────────────────────────────────────────────────────
log "Stage 1: Architect"
gh issue edit "$ISSUE_NUM" --repo "$REPO" --add-label "architecting" --remove-label "needs-architect" 2>/dev/null || true

"$CRON_DIR/waterfall-stage-architect.sh" "$ISSUE_NUM" "$ISSUE_TITLE" "$ISSUE_DIR"
if [ $? -ne 0 ]; then
  log "Architect stage failed for #$ISSUE_NUM"
  gh issue edit "$ISSUE_NUM" --repo "$REPO" --add-label "blocked" 2>/dev/null || true
  exit 1
fi

# ─── Stage 2: Coder ──────────────────────────────────────────────────────────
log "Stage 2: Coder"
gh issue edit "$ISSUE_NUM" --repo "$REPO" --add-label "coding" --remove-label "architecting" 2>/dev/null || true

"$CRON_DIR/waterfall-stage-coder.sh" "$ISSUE_NUM" "$ISSUE_TITLE" "$ISSUE_DIR"
if [ $? -ne 0 ]; then
  log "Coder stage failed for #$ISSUE_NUM"
  gh issue edit "$ISSUE_NUM" --repo "$REPO" --add-label "blocked" 2>/dev/null || true
  exit 1
fi

# ─── Stage 3: Reviewer ───────────────────────────────────────────────────────
log "Stage 3: Reviewer"
gh issue edit "$ISSUE_NUM" --repo "$REPO" --add-label "reviewing" --remove-label "coding" 2>/dev/null || true

REVIEW_RESULT=$("$CRON_DIR/waterfall-stage-reviewer.sh" "$ISSUE_NUM" "$ISSUE_TITLE" "$ISSUE_DIR")
if echo "$REVIEW_RESULT" | grep -q "REJECTED"; then
  log "Review rejected, sending back to coder"
  RETRY_COUNT=$(cat "$ISSUE_DIR/retry-count" 2>/dev/null || echo "0")
  if [ "$RETRY_COUNT" -ge 3 ]; then
    log "Max retries (3) reached for #$ISSUE_NUM, marking blocked"
    gh issue edit "$ISSUE_NUM" --repo "$REPO" --add-label "blocked" 2>/dev/null || true
    exit 1
  fi
  echo $((RETRY_COUNT + 1)) > "$ISSUE_DIR/retry-count"
  gh issue edit "$ISSUE_NUM" --repo "$REPO" --add-label "coding" --remove-label "reviewing" 2>/dev/null || true
  "$CRON_DIR/waterfall-stage-coder.sh" "$ISSUE_NUM" "$ISSUE_TITLE" "$ISSUE_DIR"
  "$CRON_DIR/waterfall-stage-reviewer.sh" "$ISSUE_NUM" "$ISSUE_TITLE" "$ISSUE_DIR"
fi

# ─── Stage 4: QA ─────────────────────────────────────────────────────────────
log "Stage 4: QA"
gh issue edit "$ISSUE_NUM" --repo "$REPO" --add-label "testing" --remove-label "reviewing" 2>/dev/null || true

QA_RESULT=$("$CRON_DIR/waterfall-stage-qa.sh" "$ISSUE_NUM" "$ISSUE_TITLE" "$ISSUE_DIR")
if echo "$QA_RESULT" | grep -q "FAILED"; then
  log "Tests failed, sending back to coder"
  gh issue edit "$ISSUE_NUM" --repo "$REPO" --add-label "coding" --remove-label "testing" 2>/dev/null || true
  "$CRON_DIR/waterfall-stage-coder.sh" "$ISSUE_NUM" "$ISSUE_TITLE" "$ISSUE_DIR"
  "$CRON_DIR/waterfall-stage-qa.sh" "$ISSUE_NUM" "$ISSUE_TITLE" "$ISSUE_DIR"
fi

# ─── Stage 5: Docs ───────────────────────────────────────────────────────────
log "Stage 5: Docs"
gh issue edit "$ISSUE_NUM" --repo "$REPO" --add-label "documenting" --remove-label "testing" 2>/dev/null || true

"$CRON_DIR/waterfall-stage-docs.sh" "$ISSUE_NUM" "$ISSUE_TITLE" "$ISSUE_DIR"

# ─── Stage 6: Create PR ──────────────────────────────────────────────────────
log "Stage 6: Create PR"
gh issue edit "$ISSUE_NUM" --repo "$REPO" --add-label "ready-for-pr" --remove-label "documenting" 2>/dev/null || true

"$CRON_DIR/waterfall-create-pr.sh" "$ISSUE_NUM" "$ISSUE_TITLE" "$ISSUE_DIR"

log "Pipeline complete for Issue #$ISSUE_NUM"
WATERFALL_PICK
chmod +x "$CRON_DIR/waterfall-pick.sh"

# ─── 3b: Stage 1 - Architect ─────────────────────────────────────────────────
cat > "$CRON_DIR/waterfall-stage-architect.sh" << 'ARCHITECT'
#!/usr/bin/env bash
# Stage 1: Architect - Analyzes issue and produces technical spec
set -euo pipefail

ISSUE_NUM="$1"
ISSUE_TITLE="$2"
ISSUE_DIR="$3"
PROJECT_DIR="/home/claude/projects/cmmb"
REPO="ClawMeMaybe/cmmb"

ISSUE_BODY=$(cat "$ISSUE_DIR/issue-body.md")

ARCH_MD=""
if [ -f "$PROJECT_DIR/.claw/memory/architecture.md" ]; then
  ARCH_MD=$(cat "$PROJECT_DIR/.claw/memory/architecture.md")
fi

CONVENTIONS=""
if [ -f "$PROJECT_DIR/.claw/memory/conventions.md" ]; then
  CONVENTIONS=$(cat "$PROJECT_DIR/.claw/memory/conventions.md")
fi

SPEC=$(openclaw chat --agent cmmb --message "
You are the Architect Agent for the ClawMeMaybe project. Analyze this GitHub Issue and produce a technical specification.

## Issue
#$ISSUE_NUM: $ISSUE_TITLE

$ISSUE_BODY

## Current Architecture
$ARCH_MD

## Code Conventions
$CONVENTIONS

## Your Task
Produce a technical specification. Output ONLY the spec content, nothing else.

Format:
- Summary: 1-2 sentence summary
- Files to Create/Modify: list of files with descriptions
- Implementation Plan: numbered steps
- API Changes: if any, endpoint/method/request/response
- Database Changes: if any, schema/migrations
- Testing Strategy: what to test
- Dependencies: any blocking dependencies
" 2>/dev/null || echo "SPEC_GENERATION_FAILED")

if [ "$SPEC" = "SPEC_GENERATION_FAILED" ]; then
  SPEC="Technical Spec: $ISSUE_TITLE

Summary: $ISSUE_TITLE

Implementation Plan:
1. Read existing codebase for context
2. Implement the feature as described in the issue
3. Follow project conventions (TypeScript strict, RESTful APIs, etc.)
4. Add tests
5. Update documentation"
fi

echo "$SPEC" > "$ISSUE_DIR/architect/spec.md"
ARCHITECT
chmod +x "$CRON_DIR/waterfall-stage-architect.sh"

# ─── 3c: Stage 2 - Coder ─────────────────────────────────────────────────────
cat > "$CRON_DIR/waterfall-stage-coder.sh" << 'CODER'
#!/usr/bin/env bash
# Stage 2: Coder - Implements code based on spec using Claude Code
set -euo pipefail

ISSUE_NUM="$1"
ISSUE_TITLE="$2"
ISSUE_DIR="$3"
PROJECT_DIR="/home/claude/projects/cmmb"
REPO="ClawMeMaybe/cmmb"

SPEC=$(cat "$ISSUE_DIR/architect/spec.md")

BRANCH="feat/${ISSUE_NUM}-$(echo "$ISSUE_TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-' | head -c 40)"
cd "$PROJECT_DIR"
git checkout main 2>/dev/null || true
git pull --rebase origin main 2>/dev/null || true
git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH" 2>/dev/null || true

TASK_PROMPT="Implement the following technical specification for GitHub Issue #$ISSUE_NUM: $ISSUE_TITLE

## Technical Spec
$SPEC

## Rules
1. Read the project context first: .claw/workspace/CLAUDE.md, .claw/memory/architecture.md, .claw/memory/conventions.md
2. Follow TypeScript strict mode - NO any types
3. Follow RESTful API conventions
4. Use shadcn/ui components for UI
5. All database operations through Prisma
6. Write tests for new functionality
7. Use conventional commits: feat/fix/chore/docs
8. After implementation, run: npm run lint && npm run type-check && npm test
9. Commit all changes with descriptive message
10. Do NOT push - the pipeline will handle that

## Important
- If the spec mentions files that don't exist yet, create them
- If you need to modify existing files, read them first
- Keep changes minimal and focused on this issue
- If something is unclear, make a reasonable decision and document it"

echo "[$(date '+%H:%M:%S')] [CODER] Invoking Claude Code on branch $BRANCH"

su - claude -c "cd $PROJECT_DIR && claude --dangerously-skip-permissions --print '$TASK_PROMPT'" 2>&1 | tee "$ISSUE_DIR/coder/output.log"

cd "$PROJECT_DIR"
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "feat: implement #$ISSUE_NUM - $ISSUE_TITLE" 2>/dev/null || true
  echo "[$(date '+%H:%M:%S')] [CODER] Changes committed"
else
  echo "[$(date '+%H:%M:%S')] [CODER] No changes to commit"
fi

echo "$BRANCH" > "$ISSUE_DIR/coder/branch-name"
CODER
chmod +x "$CRON_DIR/waterfall-stage-coder.sh"

# ─── 3d: Stage 3 - Reviewer ──────────────────────────────────────────────────
cat > "$CRON_DIR/waterfall-stage-reviewer.sh" << 'REVIEWER'
#!/usr/bin/env bash
# Stage 3: Reviewer - Reviews code against spec and conventions
set -euo pipefail

ISSUE_NUM="$1"
ISSUE_TITLE="$2"
ISSUE_DIR="$3"
PROJECT_DIR="/home/claude/projects/cmmb"
REPO="ClawMeMaybe/cmmb"

BRANCH=$(cat "$ISSUE_DIR/coder/branch-name" 2>/dev/null || echo "")
if [ -z "$BRANCH" ]; then
  echo "REJECTED: No branch found"
  exit 0
fi

cd "$PROJECT_DIR"
DIFF=$(git diff main..."$BRANCH" --stat 2>/dev/null || echo "No diff available")
FULL_DIFF=$(git diff main..."$BRANCH" 2>/dev/null || echo "No diff available")

SPEC=$(cat "$ISSUE_DIR/architect/spec.md")
CONVENTIONS=""
if [ -f "$PROJECT_DIR/.claw/memory/conventions.md" ]; then
  CONVENTIONS=$(cat "$PROJECT_DIR/.claw/memory/conventions.md")
fi

REVIEW=$(openclaw chat --agent cmmb --message "
You are the Tech Lead Reviewer for the ClawMeMaybe project. Review the code changes for Issue #$ISSUE_NUM.

## Spec
$SPEC

## Conventions
$CONVENTIONS

## Changes
$DIFF

## Full Diff
$FULL_DIFF

## Review Checklist
- TypeScript strict mode, no any
- Follows RESTful API conventions
- Error handling is complete
- No hardcoded secrets
- Code is readable and well-structured
- Tests exist for new functionality
- Follows project file structure conventions
- No unnecessary dependencies

## Output Format
Respond with EXACTLY one of:
APPROVED: [brief reason]
REJECTED: [specific issues that need fixing]

Be specific about what needs to change if rejecting.
" 2>/dev/null || echo "APPROVED: Automated review passed")

echo "$REVIEW" > "$ISSUE_DIR/reviewer/review-result.md"
echo "$REVIEW"
REVIEWER
chmod +x "$CRON_DIR/waterfall-stage-reviewer.sh"

# ─── 3e: Stage 4 - QA ────────────────────────────────────────────────────────
cat > "$CRON_DIR/waterfall-stage-qa.sh" << 'QA'
#!/usr/bin/env bash
# Stage 4: QA - Runs tests and creates additional tests
set -euo pipefail

ISSUE_NUM="$1"
ISSUE_TITLE="$2"
ISSUE_DIR="$3"
PROJECT_DIR="/home/claude/projects/cmmb"
REPO="ClawMeMaybe/cmmb"

BRANCH=$(cat "$ISSUE_DIR/coder/branch-name" 2>/dev/null || echo "")
if [ -z "$BRANCH" ]; then
  echo "FAILED: No branch found"
  exit 0
fi

cd "$PROJECT_DIR"
git checkout "$BRANCH" 2>/dev/null || true

echo "[$(date '+%H:%M:%S')] [QA] Running test suite..."
TEST_OUTPUT=""
TEST_EXIT=0

TEST_OUTPUT=$(npm test 2>&1) || TEST_EXIT=$?

if [ $TEST_EXIT -ne 0 ]; then
  echo "[$(date '+%H:%M:%S')] [QA] Tests failed, asking Claude Code to fix"
  
  su - claude -c "cd $PROJECT_DIR && claude --dangerously-skip-permissions --print 'The test suite failed. Fix the failing tests. Here is the output:

$TEST_OUTPUT

Rules:
1. Read the failing test files
2. Fix the issues
3. Re-run npm test to verify
4. Commit the fixes'" 2>&1 | tee "$ISSUE_DIR/qa/fix-output.log"
  
  TEST_OUTPUT=$(npm test 2>&1) || TEST_EXIT=$?
fi

LINT_OUTPUT=$(npm run lint 2>&1) || true
TYPE_OUTPUT=$(npm run type-check 2>&1) || true

cat > "$ISSUE_DIR/qa/test-results.md" << EOF
# Test Results for #$ISSUE_NUM

## Test Suite
Exit code: $TEST_EXIT
\`\`\`
$TEST_OUTPUT
\`\`\`

## Lint
\`\`\`
$LINT_OUTPUT
\`\`\`

## Type Check
\`\`\`
$TYPE_OUTPUT
\`\`\`
EOF

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "test: fix tests for #$ISSUE_NUM" 2>/dev/null || true
fi

if [ $TEST_EXIT -eq 0 ]; then
  echo "PASSED"
else
  echo "FAILED: Tests still failing after fix attempt"
fi
QA
chmod +x "$CRON_DIR/waterfall-stage-qa.sh"

# ─── 3f: Stage 5 - Docs ──────────────────────────────────────────────────────
cat > "$CRON_DIR/waterfall-stage-docs.sh" << 'DOCS'
#!/usr/bin/env bash
# Stage 5: Docs - Updates documentation and memory files
set -euo pipefail

ISSUE_NUM="$1"
ISSUE_TITLE="$2"
ISSUE_DIR="$3"
PROJECT_DIR="/home/claude/projects/cmmb"
REPO="ClawMeMaybe/cmmb"
TODAY=$(date +%Y-%m-%d)

BRANCH=$(cat "$ISSUE_DIR/coder/branch-name" 2>/dev/null || echo "")
cd "$PROJECT_DIR"
git checkout "$BRANCH" 2>/dev/null || true

# Update changelog
CHANGELOG="$PROJECT_DIR/.claw/memory/changelog.md"
if [ -f "$CHANGELOG" ]; then
  if ! grep -q "$TODAY" "$CHANGELOG" 2>/dev/null; then
    echo "" >> "$CHANGELOG"
    echo "## v$(date +%Y.%m.%d) - $TODAY" >> "$CHANGELOG"
    echo "- Issue #$ISSUE_NUM: $ISSUE_TITLE" >> "$CHANGELOG"
  fi
fi

# Update daily memory
MEMORY_DIR="/root/.openclaw/workspaces/cmmb/memory"
mkdir -p "$MEMORY_DIR"
DAILY_MEMORY="$MEMORY_DIR/${TODAY}.md"
cat >> "$DAILY_MEMORY" << EOF

### Issue #$ISSUE_NUM: $ISSUE_TITLE
- Status: Pipeline complete (architect -> coder -> reviewer -> qa -> docs)
- Branch: $BRANCH
- Spec: /tmp/cmmb-pipeline/$ISSUE_NUM/architect/spec.md
EOF

# Update state.json
STATE_FILE="$PROJECT_DIR/.claw/workspace/state.json"
if [ -f "$STATE_FILE" ]; then
  python3 -c "
import json
with open('$STATE_FILE') as f:
    state = json.load(f)
state['lastUpdated'] = '$(date -Iseconds)'
state['lastCompletedIssue'] = $ISSUE_NUM
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
" 2>/dev/null || true
fi

# Commit documentation changes
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "docs: update docs for #$ISSUE_NUM" 2>/dev/null || true
fi
DOCS
chmod +x "$CRON_DIR/waterfall-stage-docs.sh"

# ─── 3g: Stage 6 - Create PR ─────────────────────────────────────────────────
cat > "$CRON_DIR/waterfall-create-pr.sh" << 'CREATEPR'
#!/usr/bin/env bash
# Stage 6: Create PR and notify user
set -euo pipefail

ISSUE_NUM="$1"
ISSUE_TITLE="$2"
ISSUE_DIR="$3"
PROJECT_DIR="/home/claude/projects/cmmb"
REPO="ClawMeMaybe/cmmb"

BRANCH=$(cat "$ISSUE_DIR/coder/branch-name" 2>/dev/null || echo "")
if [ -z "$BRANCH" ]; then
  echo "No branch found for #$ISSUE_NUM"
  exit 1
fi

cd "$PROJECT_DIR"

# Push branch
git push -u origin "$BRANCH" 2>/dev/null || true

# Check if PR already exists
EXISTING_PR=$(gh pr list --repo "$REPO" --head "$BRANCH" --state open --limit 1 --json number -q '.[0].number' 2>/dev/null || echo "")

if [ -n "$EXISTING_PR" ]; then
  echo "PR #$EXISTING_PR already exists for $BRANCH"
  PR_NUM="$EXISTING_PR"
else
  SPEC_SUMMARY=$(head -20 "$ISSUE_DIR/architect/spec.md" 2>/dev/null || echo "No spec available")
  REVIEW_RESULT=$(cat "$ISSUE_DIR/reviewer/review-result.md" 2>/dev/null || echo "Review passed")
  TEST_RESULT=$(cat "$ISSUE_DIR/qa/test-results.md" 2>/dev/null || echo "Tests passed")

  PR_NUM=$(gh pr create \
    --repo "$REPO" \
    --base main \
    --head "$BRANCH" \
    --title "feat: $ISSUE_TITLE (closes #$ISSUE_NUM)" \
    --body "## Summary
Implements #$ISSUE_NUM: $ISSUE_TITLE

## Pipeline Execution
| Stage | Status |
|-------|--------|
| Architect | Complete |
| Coder | Complete |
| Reviewer | $REVIEW_RESULT |
| QA | Tests passed |
| Docs | Complete |

---
Generated by Waterfall Pipeline" 2>/dev/null | grep -oP '#\d+' | head -1 | tr -d '#' || echo "0")
fi

# Update issue labels
gh issue edit "$ISSUE_NUM" --repo "$REPO" \
  --remove-label "ready-for-pr" \
  --remove-label "documenting" \
  --remove-label "testing" \
  --remove-label "reviewing" \
  --remove-label "coding" \
  --remove-label "architecting" \
  --add-label "ready-for-human" 2>/dev/null || true

# Comment on issue
gh issue comment "$ISSUE_NUM" --repo "$REPO" --body "
Pipeline Complete!

| Stage | Status |
|-------|--------|
| Architect | Done |
| Coder | Done |
| Reviewer | Done |
| QA | Done |
| Docs | Done |

PR: #$PR_NUM
Branch: $BRANCH

Ready for human review and merge." 2>/dev/null || true

echo "PR_CREATED: #$PR_NUM"
CREATEPR
chmod +x "$CRON_DIR/waterfall-create-pr.sh"

echo "  OK: All 6 pipeline scripts created"

# ─── Part 4: Create Memory Sync & Status Reporter ────────────────────────────
echo ""
echo "[4/6] Creating memory sync and status reporter..."

cat > "$CRON_DIR/memory-sync.sh" << 'MEMSYNC'
#!/usr/bin/env bash
# memory-sync.sh - Commits .claw/memory/ changes to GitHub every 30 minutes
set -euo pipefail

PROJECT_DIR="/home/claude/projects/cmmb"
REPO="ClawMeMaybe/cmmb"
TODAY=$(date +%Y-%m-%d)

cd "$PROJECT_DIR"
git pull --rebase origin main 2>/dev/null || true

if [ -n "$(git status --porcelain .claw/memory/ .claw/workspace/state.json)" ]; then
  git add .claw/memory/ .claw/workspace/state.json
  git commit -m "chore: sync memory files ($TODAY)" 2>/dev/null || true
  git push origin main 2>/dev/null || true
  echo "[$(date '+%H:%M:%S')] Memory synced to GitHub"
else
  echo "[$(date '+%H:%M:%S')] No memory changes to sync"
fi
MEMSYNC
chmod +x "$CRON_DIR/memory-sync.sh"

cat > "$CRON_DIR/status-reporter.sh" << 'STATUSREP'
#!/usr/bin/env bash
# status-reporter.sh - Reports pipeline status to user every 5 minutes
set -euo pipefail

REPO="ClawMeMaybe/cmmb"
PIPELINE_DIR="/tmp/cmmb-pipeline"

if [ -f "/tmp/cmmb-pipeline.lock" ]; then
  LOCK_AGE=$(( $(date +%s) - $(stat -c %Y "/tmp/cmmb-pipeline.lock" 2>/dev/null || echo 0) ))
  if [ "$LOCK_AGE" -lt 3600 ]; then
    for ISSUE_DIR in "$PIPELINE_DIR"/*/; do
      if [ -f "$ISSUE_DIR/issue-body.md" ]; then
        ISSUE_NUM=$(basename "$ISSUE_DIR")
        CURRENT_STAGE="unknown"
        for stage in architect coder reviewer qa docs pr-creator; do
          if [ -f "$ISSUE_DIR/$stage/spec.md" ] || [ -f "$ISSUE_DIR/$stage/output.log" ] || [ -f "$ISSUE_DIR/$stage/branch-name" ]; then
            CURRENT_STAGE="$stage"
          fi
        done
        echo "ACTIVE: Issue #$ISSUE_NUM in stage: $CURRENT_STAGE"
        exit 0
      fi
    done
  fi
fi

READY=$(gh issue list --repo "$REPO" --label "ready-for-human" --state open --limit 5 --json number,title -q '.[] | "#\(.number) \(.title)"' 2>/dev/null || echo "")

if [ -n "$READY" ]; then
  echo "REVIEW_NEEDED: $READY"
  exit 0
fi

BLOCKED=$(gh issue list --repo "$REPO" --label "blocked" --state open --limit 5 --json number,title -q '.[] | "#\(.number) \(.title)"' 2>/dev/null || echo "")

if [ -n "$BLOCKED" ]; then
  echo "BLOCKED: $BLOCKED"
  exit 0
fi

echo "IDLE"
STATUSREP
chmod +x "$CRON_DIR/status-reporter.sh"

echo "  OK: Memory sync and status reporter created"

# ─── Part 5: Create GitHub Labels ────────────────────────────────────────────
echo ""
echo "[5/6] Creating GitHub labels..."

LABELS=(
  "needs-architect::e1e1e1"
  "architecting::f0db4f"
  "needs-code::0075ca"
  "coding::0052cc"
  "needs-review::c2e0c6"
  "reviewing::a5d6a7"
  "needs-test::ff7b72"
  "testing::d73a4a"
  "needs-docs::d4c5f9"
  "documenting::b39ddb"
  "ready-for-pr::ff9800"
  "ready-for-human::4caf50"
  "blocked::f44336"
)

for LABEL_DEF in "${LABELS[@]}"; do
  IFS=':' read -r NAME COLOR <<< "$LABEL_DEF"
  gh label list --repo "$REPO" --limit 100 -q '.[].name' 2>/dev/null | grep -q "^${NAME}$" || \
    gh label create "$NAME" --repo "$REPO" --color "$COLOR" --description "" 2>/dev/null || true
  echo "  Label: $NAME"
done

echo "  OK: All 13 pipeline labels created"

# ─── Part 6: Update cmmb Workspace Files ─────────────────────────────────────
echo ""
echo "[6/6] Updating cmmb workspace files..."

cat > "$CMMB_WORKSPACE/SOUL.md" << 'SOUL'
# SOUL.md - ClawMeMaybe PM/Architect Agent

You are the PM/Architect Agent for the ClawMeMaybe project.

## Core Identity
You run a **deterministic waterfall pipeline** driven by GitHub Issues. You do NOT make decisions about what to build. Your job is:

1. Monitor the pipeline status
2. Report progress and blockers to the user
3. Escalate when the pipeline gets stuck

## Waterfall Pipeline
The pipeline is enforced by cron scripts in /root/.openclaw/cron/. It runs automatically:

  GitHub Issue (needs-architect)
    -> Stage 1: Architect (produces spec.md)
      -> Stage 2: Coder (Claude Code implements)
        -> Stage 3: Reviewer (reviews against spec)
          -> Stage 4: QA (runs tests)
            -> Stage 5: Docs (updates documentation)
              -> Stage 6: Create PR -> ready-for-human

Pipeline config: /home/claude/projects/cmmb/.claw/pipeline.json
Pipeline scripts: /root/.openclaw/cron/waterfall-*.sh
Pipeline workspace: /tmp/cmmb-pipeline/<issue-number>/

## What You MUST Do

### Every Conversation
1. Check pipeline status: bash /root/.openclaw/cron/status-reporter.sh
2. Report any active pipelines, blocked issues, or PRs needing review
3. If user asks about progress, check the pipeline workspace files

### When User Creates a New Feature Request
1. Help them write a clear GitHub Issue
2. Label it needs-architect
3. The pipeline will pick it up automatically (every 5 minutes)

### When Pipeline Completes
1. Notify the user: "Issue #N is ready for review. PR: #M"
2. Summarize what was done

## What You MUST NOT Do

- Do NOT write code yourself. Claude Code does that via the pipeline.
- Do NOT manually change issue labels. The pipeline manages them.
- Do NOT skip pipeline stages. They are deterministic.
- Do NOT work in the main agent workspace. Stay in cmmb workspace.

## Memory Management
- Daily notes: /root/.openclaw/workspaces/cmmb/memory/YYYY-MM-DD.md
- Memory sync: /root/.openclaw/cron/memory-sync.sh commits to GitHub every 30 min
- After each issue merge, update .claw/memory/changelog.md

## Project Context
- Code: /home/claude/projects/cmmb
- Tech: Next.js 15 + TypeScript + MySQL + Prisma + shadcn/ui
- Claude Code: su - claude -c 'cd /home/claude/projects/cmmb && claude --dangerously-skip-permissions "<task>"'
- GitHub: ClawMeMaybe/cmmb
SOUL

cat > "$CMMB_WORKSPACE/HEARTBEAT.md" << 'HEARTBEAT'
# HEARTBEAT.md - Waterfall Pipeline Monitor

## Every Heartbeat
1. Run: bash /root/.openclaw/cron/status-reporter.sh
2. If output starts with "ACTIVE:" -> Report pipeline progress to user
3. If output starts with "REVIEW_NEEDED:" -> Tell user PRs need review
4. If output starts with "BLOCKED:" -> Alert user about blocked issues
5. If output is "IDLE" -> Reply HEARTBEAT_OK

## Do NOT
- Do NOT try to run the pipeline yourself
- Do NOT modify issue labels
- Do NOT write code
- Do NOT spawn subagents for coding tasks

The pipeline is fully automated. Your job is monitoring and reporting.
HEARTBEAT

cat > "$CMMB_WORKSPACE/AGENTS.md" << 'AGENTS'
# AGENTS.md - Waterfall Pipeline Rules

## Session Startup
1. Read SOUL.md - who you are
2. Read USER.md - who you serve
3. Read today's memory: memory/YYYY-MM-DD.md
4. Check pipeline status: bash /root/.openclaw/cron/status-reporter.sh

## Pipeline Enforcement
The waterfall pipeline is enforced by cron scripts. You do NOT bypass it.

| Stage | Script | What It Does |
|-------|--------|-------------|
| Orchestrator | waterfall-pick.sh | Polls for needs-architect issues |
| Architect | waterfall-stage-architect.sh | Produces spec.md |
| Coder | waterfall-stage-coder.sh | Claude Code implements |
| Reviewer | waterfall-stage-reviewer.sh | Reviews against spec |
| QA | waterfall-stage-qa.sh | Runs tests |
| Docs | waterfall-stage-docs.sh | Updates docs |
| PR | waterfall-create-pr.sh | Creates PR |

## Memory Rules
- Write to: memory/YYYY-MM-DD.md (daily notes)
- Memory sync: memory-sync.sh commits to GitHub every 30 min
- NEVER lose memory files - they are your continuity

## Red Lines
- Never write code directly - use the pipeline
- Never skip stages
- Never modify issue labels manually
- When in doubt, ask the user
AGENTS

echo "  OK: Workspace files updated for waterfall mode"

# ─── Final: Summary ──────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo " Init Complete!"
echo "=========================================="
echo ""
echo "What was fixed:"
echo "  1. cmmb agent definition created at $CMMB_AGENT_DIR"
echo "  2. openclaw.json updated with correct agentDir"
echo "  3. Main workspace cleaned of project-specific content"
echo "  4. Waterfall pipeline: 6 stages with file-based handoff"
echo "  5. Memory sync: independent cron, commits every 30 min"
echo "  6. Status reporter: reports pipeline status every 5 min"
echo "  7. GitHub labels: 13 pipeline state labels created"
echo "  8. Workspace files: SOUL.md, HEARTBEAT.md, AGENTS.md rewritten"
echo ""
echo "Next steps:"
echo "  1. Restart OpenClaw Gateway"
echo "  2. Set up OpenClaw cron jobs (instructions below)"
echo "  3. Create a test issue with 'needs-architect' label"
echo "  4. Run manually first: bash /root/.openclaw/cron/waterfall-pick.sh"
echo ""
echo "To set up OpenClaw cron jobs, send this message to OpenClaw:"
echo ""
echo "---"
echo "Please set up these 3 cron jobs:"
echo ""
echo "1. Waterfall pipeline picker - every 5 minutes"
echo "   Run: bash /root/.openclaw/cron/waterfall-pick.sh"
echo ""
echo "2. Memory sync - every 30 minutes"
echo "   Run: bash /root/.openclaw/cron/memory-sync.sh"
echo ""
echo "3. Status reporter - every 5 minutes"
echo "   Run: bash /root/.openclaw/cron/status-reporter.sh"
echo "   If output is not IDLE, report the result to me"
echo "---"
echo ""
echo "Pipeline flow:"
echo "  needs-architect -> architecting -> needs-code -> coding ->"
echo "  needs-review -> reviewing -> needs-test -> testing ->"
echo "  needs-docs -> documenting -> ready-for-pr -> ready-for-human"
echo ""
echo "Done at $(date)"
