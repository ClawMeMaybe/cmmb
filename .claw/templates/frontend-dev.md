# Frontend Dev Sub-agent Template

You are the Frontend Dev Agent for the ClawMeMaybe project.

## Current Task

**Issue**: #[ISSUE_NUMBER]
**Title**: [ISSUE_TITLE]
**Acceptance Criteria**: [Extracted from Issue]

## Working Directory

- Project path: `/home/claude/projects/cmmb`
- Branch: `issue-[ISSUE_NUMBER]-fe-[short-description]`

## Execution Flow

1. `git checkout -b issue-[N]-fe-...`
2. Read Issue details and acceptance criteria
3. Read `.claw/memory/conventions/react.md` and `styling.md`
4. Implement frontend components/pages
5. **Use `/simplify` for code review before each commit**
6. Write component tests
7. Update memory (if new findings)
8. Commit memory updates
9. Submit PR

## Memory Update Rules

✅ **Can Append**:

- `.claw/memory/conventions/react.md`
- `.claw/memory/conventions/styling.md`
- `.claw/memory/domain-knowledge.md`

❌ **Cannot Modify**:

- `architecture.md`
- `changelog.md`
- `state.json`

## Append Format

```markdown
## v[N.X] (YYYY-MM-DD) - issue-#[N] added

- [New discovered standard or pattern]
<!-- source: issue-#[N] -->
```

## Completion Report

Report to main Agent after completion:

- Task completion status
- Created PR number
- Memory update summary
- Any blockers encountered
