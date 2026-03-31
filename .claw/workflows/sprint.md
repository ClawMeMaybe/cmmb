# Async Development Workflow

## Overview

This project uses a fully async, GitHub-driven development model. GitHub Issues are the task queue. OpenClaw picks up tasks via cron, implements them through Claude Code, and creates PRs for human review.

## Issue Label Pipeline

```
(no label) --human creates--> ready-for-dev --cron picks--> in-progress --PR created--> needs-review --human merges--> done
                                                          |
                                                      blocked (with comment)
```

| Label                 | Meaning                           | Who Sets    | Who Clears              |
| --------------------- | --------------------------------- | ----------- | ----------------------- |
| `ready-for-dev`       | Ready to be picked up by OpenClaw | Human PM    | Cron script             |
| `in-progress`         | OpenClaw is working on it         | Cron script | Claude Code (after PR)  |
| `needs-review`        | PR created, waiting for human     | Claude Code | Human (after merge)     |
| `blocked`             | OpenClaw hit a blocker            | Claude Code | Human (after resolving) |
| `needs-clarification` | Requirements unclear              | Claude Code | Human (after answering) |

## Cron Schedule

```
*/15 * * * *  bash /root/.openclaw/cron/pick-issues.sh
```

Runs every 15 minutes. Each run:

1. Pulls latest code from GitHub
2. Checks for open issues labeled `ready-for-dev`
3. Picks the highest priority one (first by GitHub ordering)
4. **Assigns the issue**: `gh issue edit <number> --add-assignee "@me"`
5. Marks it `in-progress` and comments on the issue
6. Invokes Claude Code to implement it
7. Claude Code creates a PR and updates labels
8. Moves to the next issue if time permits

## Human Workflow

1. **Create an Issue** with clear description and acceptance criteria
2. **Label it** `ready-for-dev` when ready
3. **Review PRs** when they appear (OpenClaw comments on the issue with the PR link)
4. **Merge** when satisfied, or request changes via PR review

## Claude Code Pre-Commit Routine

Before EVERY commit:

1. `npm run lint` — fix all issues
2. `npm run type-check` — fix all errors
3. `npm test` — ensure tests pass
4. Run `/simplify` (Claude Code code review)
5. Update unit tests to maintain coverage
6. Update docs in `.claw/memory/` if anything changed

## Task Granularity

- Each issue should be completable in a single Claude Code session
- If an issue is too large, OpenClaw will create sub-issues
- Every issue must have clear acceptance criteria
