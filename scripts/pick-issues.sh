#!/bin/bash
# pick-issues.sh - Async task runner for ClawMeMaybe
#
# This script is called by cron (or manually). It:
# 1. Checks for open GitHub Issues labeled "ready-for-dev"
# 2. Picks the highest priority one
# 3. Invokes Claude Code to implement it
# 4. Creates a PR
#
# Usage: bash /root/.openclaw/cron/pick-issues.sh

set -e

PROJECT_DIR="/home/claude/projects/cmmb"
MEMORY_DIR="/root/.openclaw/workspace/memory"
TODAY=$(date +%Y-%m-%d)
MEMORY_FILE="$MEMORY_DIR/${TODAY}.md"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$MEMORY_FILE"
}

log "=== Cron task started: pick-issues ==="

# Ensure we're in the project directory
cd "$PROJECT_DIR"

# Pull latest
su - claude -c "cd $PROJECT_DIR && git pull origin main" 2>&1 | tee -a "$MEMORY_FILE"

# Check for open issues labeled "ready-for-dev"
ISSUES=$(su - claude -c "cd $PROJECT_DIR && gh issue list --label 'ready-for-dev' --state open --limit 1 --json number,title,url" 2>/dev/null)

if [ -z "$ISSUES" ] || [ "$ISSUES" = "[]" ]; then
    log "No open issues with 'ready-for-dev' label. Nothing to do."
    exit 0
fi

ISSUE_NUMBER=$(echo "$ISSUES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['number'])" 2>/dev/null)
ISSUE_TITLE=$(echo "$ISSUES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['title'])" 2>/dev/null)

if [ -z "$ISSUE_NUMBER" ]; then
    log "Failed to parse issue data. Exiting."
    exit 1
fi

log "Found issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}"

# Mark issue as "in-progress"
su - claude -c "cd $PROJECT_DIR && gh issue edit ${ISSUE_NUMBER} --add-label 'in-progress' --remove-label 'ready-for-dev'" 2>&1 | tee -a "$MEMORY_FILE"

# Comment on the issue
su - claude -c "cd $PROJECT_DIR && gh issue comment ${ISSUE_NUMBER} --body 'Picked up by OpenClaw agent. Working on it now.'" 2>&1 | tee -a "$MEMORY_FILE"

log "Starting implementation of issue #${ISSUE_NUMBER}..."

# Prepare the task prompt for Claude Code
BRANCH_SUFFIX=$(echo "${ISSUE_TITLE}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-' | cut -c1-40)

TASK_PROMPT="You are working on the ClawMeMaybe project.

Current Task: Implement GitHub Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}

Read the full issue details:
  cd /home/claude/projects/cmmb && gh issue view ${ISSUE_NUMBER}

Project Context - read these files before coding:
- /home/claude/projects/cmmb/.claw/agents/backend-dev.md
- /home/claude/projects/cmmb/.claw/agents/frontend-dev.md
- /home/claude/projects/cmmb/.claw/memory/conventions.md
- /home/claude/projects/cmmb/.claw/memory/architecture.md

Workflow:
1. Read the issue and understand the acceptance criteria
2. Create a feature branch: feat/${ISSUE_NUMBER}-${BRANCH_SUFFIX}
3. Implement the feature
4. Before each commit, run the pre-commit routine:
   - npm run lint (fix all issues)
   - npm run type-check (fix all errors)
   - npm test (ensure tests pass)
   - Run code review with /simplify
   - Update unit tests for coverage
   - Update docs in .claw/memory/ if needed
5. Push the branch and create a PR
6. Comment on the issue with the PR link
7. Update the issue labels: remove in-progress, add needs-review

Rules:
- TypeScript strict mode - no any type
- Conventional commits
- One PR per issue
- If you hit a blocker, comment on the issue with details and add blocked label"

# Run Claude Code with the task prompt
log "Invoking Claude Code for issue #${ISSUE_NUMBER}..."
su - claude -c "cd $PROJECT_DIR && claude --dangerously-skip-permissions --print \"$TASK_PROMPT\"" 2>&1 | tee -a "$MEMORY_FILE"

log "Claude Code session completed for issue #${ISSUE_NUMBER}"
log "=== Cron task finished ==="
