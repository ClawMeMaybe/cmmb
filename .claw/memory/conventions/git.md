# Git Standards

## v1.0 (2026-03-31) - Initial Standards

- Conventional Commits: `type(scope): description`
- type: feat, fix, docs, style, refactor, test, chore
- Each PR corresponds to one Issue
- PR description includes: change content, test method, screenshots

## v1.1 (2026-03-31) - Branch Naming Convention

### Branch Naming Pattern

| Type     | Pattern           | Example                |
| -------- | ----------------- | ---------------------- |
| Feature  | `feature/<name>`  | `feature/auth-system`  |
| Fix      | `fix/<name>`      | `fix/login-validation` |
| Chore    | `chore/<name>`    | `chore/i18n-cn-to-en`  |
| Docs     | `docs/<name>`     | `docs/api-reference`   |
| Refactor | `refactor/<name>` | `refactor/auth-module` |

### Rules

- **Never use:** `issue-<number>-<name>` pattern
- Use kebab-case for `<name>` part
- Branch name should describe what the branch does
- One branch per PR, one PR per Issue

### PR Workflow

1. Create branch: `git checkout -b <type>/<name>`
2. Commit with conventional message: `git commit -m "type: description"`
3. Push branch: `git push -u origin <type>/<name>`
4. Create PR with title matching commit convention
5. Reference issue in PR body: `Closes #<number>`

<!-- source: claw-improvement -->
<!-- issue: 16 -->

---

_This file is appended by sub-agents, main Agent consolidates and deduplicates._
