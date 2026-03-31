# Workflow Conventions

## Issue Management

### Starting Work on an Issue

**ALWAYS assign the issue before spawning subagent:**

```bash
gh issue edit <number> --repo ClawMeMaybe/cmmb --add-assignee "@me"
```

This ensures:

- Clear ownership visibility
- Avoids duplicate work
- GitHub Kanban shows correct assignee

### Issue State Flow

| State                | Trigger          | Action                          |
| -------------------- | ---------------- | ------------------------------- |
| Open → In Progress   | Subagent spawned | Assign issue, update state.json |
| In Progress → Review | PR created       | Update state.json               |
| Review → Done        | PR merged        | Close issue, update metrics     |
| Review → In Progress | PR rejected      | Notify subagent for fixes       |

### State File Updates

Always update `.claw/workspace/state.json` when:

- Starting an issue (move to inProgress)
- Creating a PR (move to review)
- Merging a PR (move to done)

## PR Creation

After PR is created:

1. Link to issue in PR body: `Fixes #<number>`
2. Update state.json with PR number
3. Create Tech Lead subagent for review

## Memory Updates

After each issue completion:

1. Run post-issue review process
2. Update metrics-log.md
3. Sync to GitHub

---

_This file tracks workflow conventions for the project._
