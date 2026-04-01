#!/usr/bin/env bash
# =============================================================================
# auto-discovery.sh - Auto-generate GitHub Issues through two channels:
#
# 1. Product Discovery: Simulate real user usage, find bugs and UX gaps,
#    propose new features based on actual system behavior
#
# 2. Research: Scan the domain (OpenClaw management, admin dashboards,
#    similar products) for new concepts, patterns, and competitive features
#
# This script runs as a cron job (daily) and creates issues labeled
# needs-architect so the waterfall pipeline picks them up automatically.
# =============================================================================

set -euo pipefail

REPO="ClawMeMaybe/cmmb"
PROJECT_DIR="/home/claude/projects/cmmb"
TODAY=$(date +%Y-%m-%d)
DISCOVERY_DIR="/tmp/cmmb-discovery"
MEMORY_DIR="/root/.openclaw/workspaces/cmmb/memory"

mkdir -p "$DISCOVERY_DIR"
mkdir -p "$MEMORY_DIR"

log() {
  echo "[$(date '+%H:%M:%S')] [DISCOVERY] $1"
}

log "Starting auto-discovery cycle"

# ─── Step 0: Check if we should run ──────────────────────────────────────────
# Don't create issues if backlog is already large
OPEN_COUNT=$(gh issue list --repo "$REPO" --state open --limit 50 2>/dev/null | wc -l || echo "0")
if [ "$OPEN_COUNT" -gt 20 ]; then
  log "Backlog already has $OPEN_COUNT open issues. Skipping discovery."
  exit 0
fi

# Check if discovery already ran today
if [ -f "$DISCOVERY_DIR/last-run" ]; then
  LAST_RUN=$(cat "$DISCOVERY_DIR/last-run")
  if [ "$LAST_RUN" = "$TODAY" ]; then
    log "Already ran today. Skipping."
    exit 0
  fi
fi

# ─── Step 1: Product Discovery ───────────────────────────────────────────────
log "=== Product Discovery ==="

cd "$PROJECT_DIR"
git pull --rebase origin main 2>/dev/null || true

EXISTING_FEATURES=$(gh issue list --repo "$REPO" --state closed --limit 50 --json title -q '.[].title' 2>/dev/null || echo "")
OPEN_FEATURES=$(gh issue list --repo "$REPO" --state open --limit 50 --json title -q '.[].title' 2>/dev/null || echo "")

ARCH_MD=""
if [ -f "$PROJECT_DIR/.claw/memory/architecture.md" ]; then
  ARCH_MD=$(cat "$PROJECT_DIR/.claw/memory/architecture.md")
fi

log "Generating product discovery report..."

DISCOVERY_REPORT=$(openclaw chat --agent cmmb --message "
You are a Product Discovery Agent for the ClawMeMaybe project. Simulate being a real user and identify gaps.

## Project
ClawMeMaybe manages enterprise OpenClaw instances.
Tech: Next.js 15 + TypeScript + MySQL + Prisma + shadcn/ui

## What Exists (Closed Issues)
$EXISTING_FEATURES

## What is Open (In Progress or Planned)
$OPEN_FEATURES

## Architecture
$ARCH_MD

## Your Task

### 1. User Journey Simulation
Imagine you are an admin managing 50 OpenClaw instances. Walk through:
- Logging in and seeing the dashboard
- Creating a new instance
- Monitoring instance health
- Stopping/starting instances
- Viewing audit logs
- Configuring channels and skills

For each step identify: what could go wrong, what information is missing, what would make this easier.

### 2. Gap Analysis
Compare what exists vs what an admin would actually need:
- Missing error handling scenarios
- Missing UI states (loading, empty, error)
- Missing data relationships
- Missing operational concerns (backup, restore, migration)

### 3. Competitive Patterns
Think about AWS ECS console, Datadog, Vercel dashboard, Kubernetes dashboard.
What patterns could we adopt?

### 4. Technical Debt Indicators
From the architecture: missing infrastructure, security gaps, performance concerns at scale.

## Output Format

For each finding, output:

ISSUE_PROPOSAL:
title: [clear, actionable title]
type: [bug|feature|improvement]
priority: [P0|P1|P2|P3]
description: [2-3 sentences explaining the gap and why it matters]
acceptance_criteria: [bullet list of what done looks like]
END_PROPOSAL

Generate 3-5 high-quality proposals. Focus on things actually missing.
" 2>/dev/null || echo "")

if [ -n "$DISCOVERY_REPORT" ]; then
  echo "$DISCOVERY_REPORT" > "$DISCOVERY_DIR/product-discovery-$TODAY.md"
  log "Product discovery report generated"
fi

# ─── Step 2: Research ────────────────────────────────────────────────────────
log "=== Research ==="

log "Running research on key topics..."

RESEARCH_REPORT=$(openclaw chat --agent cmmb --message "
You are a Research Agent for the ClawMeMaybe project. Research the domain and identify patterns that could improve our product.

## Project
ClawMeMaybe manages enterprise OpenClaw instances.
Tech: Next.js 15 + TypeScript + MySQL + Prisma + shadcn/ui

## What We Have
Completed: $EXISTING_FEATURES
Open/Planned: $OPEN_FEATURES

## Research Topics
1. OpenClaw management best practices - how do teams manage multiple instances?
2. Admin dashboard UX patterns - what do the best admin consoles do?
3. AI agent orchestration patterns - latest research on multi-agent systems
4. Real-time monitoring for AI services - what metrics matter?
5. Enterprise SSO and RBAC for AI platforms
6. AI agent skill marketplace patterns
7. Conversation analytics and insights
8. Cost optimization for AI service management

## Your Task

For each topic:
1. Summarize key findings and best practices
2. Identify 1-2 concrete feature ideas or design improvements
3. Note any technical concepts or patterns we should know
4. Reference specific products or tools as examples

## Output Format

For each actionable finding:

ISSUE_PROPOSAL:
title: [clear, actionable title]
type: [research|feature|improvement]
priority: [P1|P2|P3]
description: [2-3 sentences with research context]
acceptance_criteria: [bullet list]
research_notes: [key findings that led to this]
END_PROPOSAL

Generate 2-4 high-quality proposals. Focus on genuinely interesting findings.
" 2>/dev/null || echo "")

if [ -n "$RESEARCH_REPORT" ]; then
  echo "$RESEARCH_REPORT" > "$DISCOVERY_DIR/research-$TODAY.md"
  log "Research report generated"
fi

# ─── Step 3: Create Issues ───────────────────────────────────────────────────
log "=== Creating Issues ==="

# Parse and create issues from product discovery
if [ -f "$DISCOVERY_DIR/product-discovery-$TODAY.md" ]; then
  python3 << 'PYEOF'
import subprocess, re, json, os, sys

TODAY = os.environ.get("TODAY", "unknown")
REPO = "ClawMeMaybe/cmmb"
DISCOVERY_DIR = "/tmp/cmmb-discovery"

report_file = f"{DISCOVERY_DIR}/product-discovery-{TODAY}.md"
try:
    with open(report_file) as f:
        content = f.read()
except:
    print("No discovery report found")
    sys.exit(0)

proposals = re.findall(r'ISSUE_PROPOSAL:(.*?)END_PROPOSAL', content, re.DOTALL)

# Get existing issues for dedup
result = subprocess.run(
    ["gh", "issue", "list", "--repo", REPO, "--state", "all", "--limit", "100", "--json", "title"],
    capture_output=True, text=True
)
existing_titles = []
try:
    existing = json.loads(result.stdout)
    existing_titles = [i["title"].lower() for i in existing]
except:
    pass

created = 0
for p in proposals:
    title_m = re.search(r'title:\s*(.+)', p)
    type_m = re.search(r'type:\s*(.+)', p)
    priority_m = re.search(r'priority:\s*(.+)', p)
    desc_m = re.search(r'description:\s*(.+)', p, re.DOTALL)
    criteria_m = re.search(r'acceptance_criteria:\s*(.+?)(?:\n\w+:|$)', p, re.DOTALL)

    if not title_m or not desc_m:
        continue

    title_text = title_m.group(1).strip()
    desc_text = desc_m.group(1).strip()
    priority_text = priority_m.group(1).strip() if priority_m else "P2"
    type_text = type_m.group(1).strip() if type_m else "feature"
    criteria_text = criteria_m.group(1).strip() if criteria_m else ""

    # Dedup
    if any(title_text.lower() in t or t in title_text.lower() for t in existing_titles):
        print(f"Skipping duplicate: {title_text}")
        continue

    body = f"## Description\n{desc_text}\n\n"
    if criteria_text:
        body += f"## Acceptance Criteria\n{criteria_text}\n\n"
    body += f"## Source\nAuto-discovered by Product Discovery Agent on {TODAY}\n\n"
    body += f"*Type: {type_text} | Priority: {priority_text}*"

    result = subprocess.run(
        ["gh", "issue", "create", "--repo", REPO, "--title", title_text, "--body", body, "--label", "needs-architect", "--label", priority_text],
        capture_output=True, text=True
    )

    if result.returncode == 0:
        print(f"Created: {title_text}")
        created += 1
    else:
        print(f"Failed: {title_text} - {result.stderr[:200]}")

print(f"Created {created} issues from product discovery")
PYEOF
fi

# Parse and create issues from research
if [ -f "$DISCOVERY_DIR/research-$TODAY.md" ]; then
  python3 << 'PYEOF'
import subprocess, re, json, os, sys

TODAY = os.environ.get("TODAY", "unknown")
REPO = "ClawMeMaybe/cmmb"
DISCOVERY_DIR = "/tmp/cmmb-discovery"

report_file = f"{DISCOVERY_DIR}/research-{TODAY}.md"
try:
    with open(report_file) as f:
        content = f.read()
except:
    sys.exit(0)

proposals = re.findall(r'ISSUE_PROPOSAL:(.*?)END_PROPOSAL', content, re.DOTALL)

result = subprocess.run(
    ["gh", "issue", "list", "--repo", REPO, "--state", "all", "--limit", "100", "--json", "title"],
    capture_output=True, text=True
)
existing_titles = []
try:
    existing = json.loads(result.stdout)
    existing_titles = [i["title"].lower() for i in existing]
except:
    pass

created = 0
for p in proposals:
    title_m = re.search(r'title:\s*(.+)', p)
    priority_m = re.search(r'priority:\s*(.+)', p)
    desc_m = re.search(r'description:\s*(.+)', p, re.DOTALL)
    criteria_m = re.search(r'acceptance_criteria:\s*(.+?)(?:\n\w+:|$)', p, re.DOTALL)
    notes_m = re.search(r'research_notes:\s*(.+?)(?:\n\w+:|$)', p, re.DOTALL)

    if not title_m or not desc_m:
        continue

    title_text = title_m.group(1).strip()
    desc_text = desc_m.group(1).strip()
    priority_text = priority_m.group(1).strip() if priority_m else "P2"
    criteria_text = criteria_m.group(1).strip() if criteria_m else ""
    notes_text = notes_m.group(1).strip() if notes_m else ""

    if any(title_text.lower() in t or t in title_text.lower() for t in existing_titles):
        print(f"Skipping duplicate: {title_text}")
        continue

    body = f"## Description\n{desc_text}\n\n"
    if criteria_text:
        body += f"## Acceptance Criteria\n{criteria_text}\n\n"
    if notes_text:
        body += f"## Research Notes\n{notes_text}\n\n"
    body += f"## Source\nAuto-discovered by Research Agent on {TODAY}\n\n"
    body += f"*Priority: {priority_text}*"

    result = subprocess.run(
        ["gh", "issue", "create", "--repo", REPO, "--title", title_text, "--body", body, "--label", "needs-architect", "--label", priority_text],
        capture_output=True, text=True
    )

    if result.returncode == 0:
        print(f"Created: {title_text}")
        created += 1
    else:
        print(f"Failed: {title_text} - {result.stderr[:200]}")

print(f"Created {created} issues from research")
PYEOF
fi

# ─── Step 4: Record ──────────────────────────────────────────────────────────
echo "$TODAY" > "$DISCOVERY_DIR/last-run"

cat >> "$MEMORY_DIR/${TODAY}.md" << EOF

### Auto-Discovery Cycle ($TODAY)
- Product discovery: /tmp/cmmb-discovery/product-discovery-$TODAY.md
- Research: /tmp/cmmb-discovery/research-$TODAY.md

EOF

log "Auto-discovery cycle complete"
