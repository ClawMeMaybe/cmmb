# PR Review Workflow

## Flow

```
Development complete -> Create PR -> CI auto-check -> Human Review -> Approve -> Merge -> Deploy
                                                    |
                                                Request changes -> Fix -> Re-submit
```

## CI Auto-Checks (Must All Pass)

- [ ] ESLint no errors
- [ ] Prettier formatting correct
- [ ] TypeScript type check passes
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Test coverage meets threshold (> 80%)

## Human Review Checklist

- [ ] Code logic is correct
- [ ] Follows project coding conventions
- [ ] No security issues
- [ ] No performance problems
- [ ] Adequate test coverage
- [ ] Error handling is complete
- [ ] Code is readable and maintainable

## PR Description Requirements

```markdown
## Summary

- Brief description of what this PR does

## Related Issue

- Closes #123

## How to Test

- Steps to verify this change

## Screenshots (if applicable)

- UI changes should include screenshots
```

## Merge Strategy

- Use Squash and Merge
- Commit message follows Conventional Commits
