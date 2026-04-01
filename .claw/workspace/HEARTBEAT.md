# HEARTBEAT.md - Agile Multi-Agent Orchestration

This file is read on every heartbeat. Execute tasks in order.

## Immediate Actions (Every Heartbeat)

### 1. Check Active Subagents

```bash
subagents action=list
```

- If any agent running > 30min without progress → check status or restart
- If agent failed → spawn replacement

### 2. Check CI Status

```bash
gh pr checks <number> --repo ClawMeMaybe/cmmb
```

- Flag failing CI on open PRs
- Alert on PRs waiting > 24h for review

### 3. Capacity Check

- If active issues < 3 AND ready issues exist → assign next

## Scheduled Ceremonies

### Daily Standup (09:00 or on session start)

**Agent:** `tech-lead`
**Spawn command:**

```
sessions_spawn with:
  runtime: subagent
  label: standup-YYYY-MM-DD
  task: |
    ## Daily Standup

    Check all in-progress issues and report status:

    1. List all issues with `in-progress` label
    2. For each active subagent, check runtime and progress
    3. Identify blockers (issues stuck > 2h)
    4. Post standup summary as comment on a dedicated "Sprint" issue
```

### Sprint Planning (Monday 09:00 or sprint start)

**Agent:** `pm-architect`
**Spawn command:**

```
sessions_spawn with:
  runtime: subagent
  label: planning-sprint-N
  task: |
    ## Sprint Planning

    1. Review all `ready-for-dev` issues
    2. Prioritize by P0 > P1 > P2 > P3
    3. Select top 3 for sprint
    4. Create sprint milestone in GitHub
    5. Assign issues to milestone
    6. Update state.json with sprint goals
    7. Create "Sprint N Kickoff" issue with plan
```

### Backlog Grooming (Wednesday 14:00)

**Agent:** `pm-architect`
**Spawn command:**

```
sessions_spawn with:
  runtime: subagent
  label: grooming-YYYY-MM-DD
  task: |
    ## Backlog Grooming

    1. Review unassigned open issues
    2. Add acceptance criteria if missing
    3. Add size label (S/M/L)
    4. Break down `size/L` issues into sub-issues
    5. Check dependencies between issues
```

### Sprint Review (Friday 17:00)

**Agent:** `tech-lead`
**Spawn command:**

```
sessions_spawn with:
  runtime: subagent
  label: review-sprint-N
  task: |
    ## Sprint Review

    1. List completed issues this sprint
    2. Calculate velocity (issues/points)
    3. Review merged PRs
    4. Move incomplete issues back to backlog or next sprint
    5. Generate metrics:
       - Issues completed
       - Avg time per issue
       - CI pass rate
       - Code coverage (if available)
```

### Retrospective (Friday 17:30)

**Agent:** `pm-architect`
**Spawn command:**

```
sessions_spawn with:
  runtime: subagent
  label: retro-YYYY-MM-DD
  task: |
    ## Sprint Retrospective

    Analyze sprint and collect:

    1. What went well
    2. What could be improved
    3. Action items for next sprint

    Store in: .claw/memory/retrospectives/YYYY-MM-DD.md
```

## Issue Assignment Logic

### Priority Queue

1. P0 (Critical) → Immediate assignment
2. P1 (High) → Assign when capacity
3. P2 (Medium) → Fill remaining capacity
4. P3 (Low) → Backlog

### Type-to-Agent Mapping

| Type      | Spawn Agent                            |
| --------- | -------------------------------------- |
| research  | pm-architect                           |
| frontend  | frontend-dev                           |
| backend   | backend-dev                            |
| fullstack | backend-dev (first), then frontend-dev |
| devops    | devops                                 |
| test/qa   | qa                                     |

### Max Concurrent Issues: 3

## Current Sprint Status

**Sprint 3** (2026-04-01 - 2026-04-07)

| Issue | Title                    | Priority | Type      | Status         | PR   |
| ----- | ------------------------ | -------- | --------- | -------------- | ---- |
| #48   | API Rate Limiting        | P1       | backend   | 👀 Review      | #79  |
| #60   | Channel configuration UI | P2       | frontend  | 👀 Review      | #73  |
| #61   | Skills management        | P2       | frontend  | 👀 Review      | #74  |
| #55   | Production deployment    | P1       | devops    | 📋 Ready       | —    |
| #56   | Monitoring setup          | P2       | devops    | 📋 Ready       | —    |
| #57   | Bulk operations          | P3       | frontend  | 📋 Ready       | —    |

**Completed This Sprint:** 0
**In Review:** 3
**Capacity:** 0/3 used

**Sprint 2 Velocity:** 10 issues, 9 PRs merged

---

_Last updated: 2026-04-01T08:05:00+08:00_
_Next standup: On session start_
_Next planning: 2026-04-07 09:00_
