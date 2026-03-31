# Agile Ceremonies for Multi-Agent System

## Sprint Cadence

**Sprint Duration:** 1 week (Monday - Sunday)
**Ceremony Schedule:**

| Ceremony         | Frequency          | Agent Lead   | Duration |
| ---------------- | ------------------ | ------------ | -------- |
| Sprint Planning  | Every Monday 09:00 | PM/Architect | 30 min   |
| Daily Standup    | Every 09:00        | Tech Lead    | 5 min    |
| Backlog Grooming | Wednesday 14:00    | PM/Architect | 15 min   |
| Sprint Review    | Friday 17:00       | Tech Lead    | 20 min   |
| Retrospective    | Friday 17:30       | All          | 10 min   |

## Ceremony Details

### 1. Sprint Planning (PM/Architect)

**Trigger:** Monday 09:00 or on-demand
**Spawn:** `pm-architect` agent

**Tasks:**

1. Review open issues with `ready-for-dev` label
2. Prioritize by: P0 > P1 > P2 > P3
3. Assign sprint capacity (max 3 concurrent issues)
4. Update `state.json` with sprint goals
5. Comment on sprint-start issue with plan

**Output:**

```json
{
  "sprint": {
    "number": 2,
    "startDate": "2026-04-01",
    "goals": ["#10", "#12", "#13"],
    "capacity": 3
  }
}
```

### 2. Daily Standup (Tech Lead)

**Trigger:** Every 09:00
**Spawn:** `tech-lead` agent

**Tasks:**

1. Check all `in-progress` issues
2. Report status for each active subagent
3. Identify blockers (issues stuck > 2h without progress)
4. Alert if any PR has been waiting > 24h for review
5. Post standup summary to GitHub Discussion or comment

**Output format:**

```
## Standup 2026-03-31

### In Progress
| Issue | Agent | Status | Time |
|-------|-------|--------|------|
| #10 | research | 🏃 Working | 2h |
| #13 | auth | 🏃 Working | 2h |

### Blockers
- None

### PRs Needing Review
- #18 (chore/i18n) - waiting 1h

### Action Items
- [ ] Assign #12 when capacity available
```

### 3. Backlog Grooming (PM/Architect)

**Trigger:** Wednesday 14:00
**Spawn:** `pm-architect` agent

**Tasks:**

1. Review unassigned issues
2. Add acceptance criteria if missing
3. Estimate complexity (S/M/L)
4. Break down large issues into sub-issues
5. Re-prioritize based on dependencies

**Labels for sizing:**

- `size/S` - < 4 hours
- `size/M` - 4-8 hours
- `size/L` - > 8 hours (should be split)

### 4. Sprint Review (Tech Lead)

**Trigger:** Friday 17:00
**Spawn:** `tech-lead` agent

**Tasks:**

1. List completed issues this sprint
2. Calculate velocity (issues completed)
3. Review merged PRs
4. Identify incomplete issues → move to next sprint or backlog
5. Generate metrics report

**Output:**

```
## Sprint 1 Review

### Completed (5 issues)
- #9 Initialize Boilerplate
- #16 Replace Chinese text

### Velocity
- Issues: 2
- PRs Merged: 2
- Avg Time: 21min

### Incomplete
- #10 Research Gateway (in progress)
- #13 Admin Auth (in progress)

### Metrics
- Code Coverage: N/A
- CI Pass Rate: 100%
```

### 5. Retrospective (All Agents)

**Trigger:** Friday 17:30
**Spawn:** `pm-architect` agent (collects input from all)

**Tasks:**

1. Collect "What went well"
2. Collect "What could be improved"
3. Collect "Action items for next sprint"
4. Update `memory/lessons-learned.md`

**Output stored in:** `.claw/memory/retrospectives/YYYY-MM-DD.md`

## Agent Coordination Protocol

### Issue Assignment Rules

| Issue Type | Primary Agent              | Backup Agent |
| ---------- | -------------------------- | ------------ |
| Research   | pm-architect               | tech-lead    |
| Frontend   | frontend-dev               | tech-lead    |
| Backend    | backend-dev                | tech-lead    |
| Fullstack  | backend-dev + frontend-dev | tech-lead    |
| DevOps     | devops                     | tech-lead    |
| QA/Test    | qa                         | tech-lead    |

### Handoff Protocol

When issue needs handoff between agents:

1. Agent A completes their part
2. Comments on issue with summary
3. Removes own assignee, adds next agent
4. Updates issue label if needed

### Blocking Protocol

When agent is blocked:

1. Add `blocked` label to issue
2. Comment with blocker description
3. Create follow-up issue if needed
4. PM/Architect notified to resolve

## GitHub Project Board Columns

```
Backlog → Ready → In Progress → In Review → Done
                   ↑              ↑
              Agent picks    PR created
```

Column-to-label mapping:

- Backlog: no label
- Ready: `ready-for-dev`
- In Progress: `in-progress`
- In Review: `needs-review`
- Done: closed issue

## Automation Hooks

### On Issue Created

- PM/Architect reviews within 1 hour
- Adds priority label (P0-P3)
- Adds type label (frontend/backend/devops/etc)
- Estimates size

### On PR Created

- Tech Lead auto-assigned for review
- CI must pass before review
- Review within 4 hours

### On PR Merged

- Issue auto-closed
- `done` label added
- State.json updated
- Metrics recorded

<!-- This file defines agile ceremonies for the multi-agent system -->
