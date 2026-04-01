---
name: sprint-orchestration
description: 'Agile sprint orchestration for the ClawMeMaybe multi-agent system. Manages sprint lifecycle: Plan → Do → Review → Retrospective → Evolve. Use when: (1) starting a new sprint, (2) ending a sprint boundary, (3) running retrospective, (4) dispatching subagents for issues. NOT for: single issue fixes (use coding-agent), PR reviews (use tech-lead agent), or status checks (use standup).'
metadata:
  {
    "openclaw":
      {
        "emoji": "🔄",
        "requires": { "bins": ["gh", "git", "claude"] },
      },
  }
---

# Sprint Orchestration

Agile sprint-driven workflow for the ClawMeMaybe project.

## Sprint Configuration

**Duration:** 2 hours (default, adjustable in `.claw/memory/sprint-config.json`)
**Max concurrent subagents:** 3
**Buffer:** 20% of capacity reserved for unexpected issues

---

## Phase 1: SPRINT PLANNING

When triggered for planning:

### 1.1 Read Context

```bash
cd /home/claude/projects/cmmb

# Read project memory
cat .claw/workspace/CLAUDE.md
cat .claw/memory/architecture.md
cat .claw/memory/conventions.md
cat .claw/memory/lessons-learned.md 2>/dev/null || echo "No lessons yet"
cat .claw/memory/metrics-log.md 2>/dev/null || echo "No metrics yet"

# Read current state
cat .claw/workspace/state.json 2>/dev/null || echo '{"sprint": {"number": 0}}'
```

### 1.2 Calculate Velocity

From `.claw/memory/metrics-log.md`, calculate:
- Average issues completed per sprint (last 3 sprints)
- Average time per issue
- Failure rate by issue type

If no history yet, use conservative defaults:
- Capacity: 2 issues per sprint
- Max concurrent: 2 subagents

### 1.3 Fetch Candidates

```bash
# Get issues ready for development
gh issue list --repo ClawMeMaybe/cmmb --label needs-architect --limit 20 --json number,title,labels,body
```

### 1.4 Prioritize and Select

Priority order:
1. P0 (blocking) issues first
2. Then P1
3. Then P2
4. Within same priority: oldest first

Select issues that fit within capacity. Leave 20% buffer.

### 1.5 Generate Specs

For each selected issue, generate a brief technical spec:
- What files need to change
- What the change involves
- Which agent role should handle it (frontend/backend/fullstack)
- Estimated complexity (S/M/L based on similar past issues)

### 1.6 Record Sprint Plan

Update `.claw/workspace/state.json`:
```json
{
  "sprint": {
    "number": N,
    "startedAt": "ISO timestamp",
    "endsAt": "ISO timestamp (2h later)",
    "goals": ["#issue1", "#issue2"],
    "capacity": 3,
    "issues": {
      "issue_number": {
        "title": "...",
        "role": "frontend-dev|backend-dev|qa",
        "spec": "...",
        "status": "dispatched|in-progress|completed|failed"
      }
    }
  }
}
```

### 1.7 Comment on Issues

For each selected issue:
```bash
gh issue comment <number> --repo ClawMeMaybe/cmmb --body "
🔄 **Picked up in Sprint #N**

Spec: {brief spec}
Assigned to: {role}
Expected completion: end of sprint ({time})
"
```

---

## Phase 2: DISPATCH — Spawn Subagents

For each issue in the sprint, spawn the appropriate subagent.

### 2.1 Determine Subagent Configuration

| Issue Type | Agent | Role File | Model |
|-----------|-------|-----------|-------|
| Frontend UI | cmmb-dev | .claw/agents/frontend-dev.md | bailian/qwen3-coder-next |
| Backend API | cmmb-dev | .claw/agents/backend-dev.md | bailian/qwen3-coder-next |
| Fullstack | cmmb-dev (2 instances) | frontend-dev.md + backend-dev.md | bailian/qwen3-coder-next |
| DevOps/CI | cmmb-dev | .claw/agents/devops.md | bailian/qwen3-coder-next |
| Testing | cmmb-qa | .claw/agents/qa.md | bailian/qwen3-max-2026-01-23 |
| PR Review | cmmb-techlead | .claw/agents/tech-lead.md | bailian/qwen3.5-plus |

### 2.2 Construct Task Prompt

For each subagent, build a prompt that includes:

```
You are {role_name} for the ClawMeMaybe project.

## Your Role Definition
{content of .claw/agents/{role}.md}

## Project Context
{content of .claw/workspace/CLAUDE.md}

## Your Task

Implement GitHub Issue #{N}: {title}

### Spec
{generated spec}

### Instructions
1. Read the relevant existing code first
2. Implement the fix/feature following your role standards
3. Run: npm run lint && npm run type-check && npm test -- --run
4. Commit with conventional commit message including issue reference
5. Create a PR targeting main branch
6. Push the branch
7. Report: PR URL, files changed, summary

### Constraints
- Follow the standards in your role definition file
- Do NOT modify files outside your scope
- If blocked, report WHY and STOP (don't guess)
- Keep changes minimal and focused
- When done, run: openclaw system event --text "Done: #{N} {brief summary}" --mode now

### Branch Naming
Use: feat/{N}-{short-slug} for features, fix/{N}-{short-slug} for bugs
```

### 2.3 Dispatch via Background Claude Code Process

CRITICAL: Claude Code must handle the ENTIRE flow including branch creation, commit, push, and PR creation. The orchestrator (cmmb-pm) does NOT wait for completion — it fires and forgets.

For each issue:

```bash
cd /home/claude/projects/cmmb

# Step 1: Create feature branch
git checkout main
git pull --rebase origin main
git checkout -b {branch-name} 2>/dev/null || git checkout {branch-name}

# Step 2: Write comprehensive task to temp file
TASK_FILE="/tmp/cmmb-sprint-task-{N}.txt"
cat > "$TASK_FILE" << 'TASK_EOF'
{full task prompt from 2.2 — MUST include the complete instructions below}

## CRITICAL: You MUST complete ALL these steps in order:

1. Read the relevant existing code first
2. Implement the fix/feature following your role standards
3. Run: npm run lint && npm run type-check && npm test -- --run
4. Fix any issues found
5. Commit ALL changes:
   git add -A
   git commit -m "{conventional commit message}: {description}

Fixes #{N}"
6. Push the branch:
   git push -u origin {branch-name}
7. Create a PR:
   gh pr create \
     --title "{conventional commit message} (closes #{N})" \
     --body "## Summary

{one paragraph description}

## Changes

- {bullet list of changes}

## Self-Test Report

| Check | Status |
|-------|--------|
| Lint | Passed |
| Type Check | Passed |
| Tests | Passed |

Fixes #{N}" \
     --label "{appropriate labels}"
8. Report the PR URL

If you cannot complete any step, explain WHY and stop.
TASK_EOF
chmod 644 "$TASK_FILE"

# Step 3: Execute Claude Code in BACKGROUND (fire and forget)
nohup su - claude -c "cd /home/claude/projects/cmmb && claude --permission-mode bypassPermissions --print \"\$(cat ${TASK_FILE})\" > /tmp/cmmb-sprint-output-{N}.log 2>&1" &>/dev/null &

echo "Dispatched #{N} to Claude Code (PID: $!)"

# Clean up temp file after a delay (give Claude Code time to read it)
(sleep 5 && rm -f "$TASK_FILE") &
```

The orchestrator moves to the next issue immediately. Claude Code runs in the background.

### 2.4 Track Dispatch

Update state.json for each dispatched issue:
```json
{
  "issues": {
    "N": {
      "status": "in-progress",
      "dispatchedAt": "ISO timestamp",
      "branch": "{branch-name}",
      "agent": "{role}"
    }
  }
}
```

---

## Phase 3: MONITOR — Standup Check

Lightweight check every 30 minutes. Do NOT interrupt running agents.

### 3.1 Check Subagent Status

```bash
# Check if Claude Code processes are still running
ps aux | grep 'claude --permission-mode' | grep -v grep

# Check git status for each branch
cd /home/claude/projects/cmmb
git status --porcelain  # Any uncommitted work?
```

### 3.2 Check PR Status

```bash
# Check if any PRs were created
gh pr list --repo ClawMeMaybe/cmmb --state open --json number,title,headRefName

# Check CI status for each PR
gh pr checks <number> --repo ClawMeMaybe/cmmb
```

### 3.3 Report Status

Generate a brief standup:
```
## Standup {time}

### In Progress
| Issue | Agent | Status | Time Elapsed |
|-------|-------|--------|-------------|
| #N | frontend-dev | 🏃 Coding | 45m |
| #M | backend-dev | ✅ PR created | 1h 20m |

### Completed
- #M: PR #{PR} created, CI passing

### Blockers
- None / {description}
```

---

## Phase 4: SPRINT BOUNDARY — Review + Retrospective

When the sprint time is up (2 hours):

### 4.1 Halt Running Subagents

```bash
# Find and kill running Claude Code processes
ps aux | grep 'claude --permission-mode' | grep -v grep | awk '{print $2}' | xargs kill -TERM 2>/dev/null

# Commit any partial work
cd /home/claude/projects/cmmb
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "chore: save partial work at sprint boundary" 2>/dev/null || true
fi
```

### 4.2 Collect Results

For each issue in the sprint:
```bash
# Check if PR was created
gh pr list --repo ClawMeMaybe/cmmb --head "{branch-name}" --json number,state

# Check CI status
gh pr checks {pr_number} --repo ClawMeMaybe/cmmb

# Check if tests pass
npm test -- --run 2>&1 | tail -20
```

Categorize each issue:
- **completed** — PR created, CI passing, ready for merge
- **in-review** — PR created, CI pending or has review comments
- **failed** — Subagent errored or couldn't complete
- **abandoned** — Killed at sprint boundary, partial work
- **blocked** — Subagent reported a blocker

### 4.3 Retrospective Analysis

For each issue, analyze:

**If completed successfully:**
- What made it work well?
- Was the spec accurate?
- Did the subagent follow conventions?
- Were tests adequate?

**If failed:**
- Root cause analysis:
  - Spec was unclear → Update PM/Architect process
  - Subagent made wrong decisions → Update role definition
  - Subagent couldn't find code → Update project context
  - Issue too large → Split into smaller issues
  - CI failed repeatedly → Improve pre-commit checks

**If abandoned:**
- How much progress was made?
- Was the estimate wrong?
- Should the issue be split?
- Should the sprint duration be adjusted?

### 4.4 Evolve the System

Based on retrospective findings:

#### Update Role Definitions

If a role consistently makes the same mistake:
```bash
# Example: frontend-dev keeps forgetting Suspense boundaries
# Append to .claw/agents/frontend-dev.md:
cat >> .claw/agents/frontend-dev.md << 'EOF'

## Critical Rules (added Sprint #N)
- All useSearchParams() calls MUST be wrapped in <Suspense boundary>
- See e2e/instances.spec.ts for strict mode locator patterns
EOF
```

#### Create/Update Skills

If a repeated pattern is identified:
```bash
# Create a new skill
cat > .claw/skills/{skill-name}.md << 'EOF'
---
name: {skill-name}
description: '{description}'
---

# {Skill Name}

{skill content}
EOF
```

#### Update Project Memory

```bash
# Update lessons learned
cat >> .claw/memory/lessons-learned.md << EOF

## Sprint #N - {date}
- {lesson 1}
- {lesson 2}
- {lesson 3}
EOF

# Update metrics log
cat >> .claw/memory/metrics-log.md << EOF

## Sprint #N - {date}
| Metric | Value |
|--------|-------|
| Issues attempted | N |
| Issues completed | N |
| Completion rate | N% |
| Avg time per issue | N min |
| CI pass rate | N% |
| Failures | {list} |
EOF
```

#### Adjust Sprint Parameters

Based on velocity:
```json
{
  "sprint": {
    "durationMinutes": 120,
    "maxConcurrent": 3,
    "capacityPerSprint": 3,
    "modelOverrides": {
      "frontend-dev": "bailian/qwen3-coder-next",
      "backend-dev": "bailian/qwen3-coder-next",
      "qa": "bailian/qwen3-max-2026-01-23",
      "tech-lead": "bailian/qwen3.5-plus"
    }
  }
}
```

### 4.5 Generate Sprint Report

```markdown
## Sprint #N Report ({start} → {end})

### Summary
- Issues completed: N/M
- PRs created: N
- PRs merged: N
- CI pass rate: N%

### Completed Issues
- #N: {title} — PR #{PR} ✅
- #M: {title} — PR #{PR} ✅

### Incomplete Issues
- #X: {title} — {reason: failed/abandoned/blocked}

### Velocity
- This sprint: N issues
- Average (last 3): N issues
- Trend: ↑ / → / ↓

### Retrospective
**What went well:**
- ...

**What needs improvement:**
- ...

**Actions for next sprint:**
- [ ] ...
- [ ] ...

### System Evolution
- Updated: {role definition / skill / memory file}
- Created: {new skill}
- Adjusted: {sprint parameter}
```

---

## Phase 5: NEXT SPRINT

After retrospective, immediately start the next sprint:
1. Go back to Phase 1 (Planning)
2. Use updated role definitions and skills
3. Apply lessons learned to issue selection and dispatch

---

## Event Handling

Subagents notify completion via:
```bash
openclaw system event --text "Done: #{N} {brief summary}" --mode now
```

When this event fires:
1. Update state.json: issue status → "completed"
2. Check the PR was actually created
3. If PR exists, spawn cmmb-techlead for review
4. If no PR, check if subagent failed — record for retrospective
