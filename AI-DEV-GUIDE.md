# AI-Native Development Guide

## Development Mode

This project adopts an AI-native development mode, where the OpenClaw multi-Agent system directs Claude Code to write code.

**Core Philosophy**: OpenClaw itself evolves along with the project, eventually becoming the project's DevOps. All OpenClaw workspace configurations, agent definitions, memory states, and code are version-managed together, achieving an out-of-the-box DevOps clone.

## OpenClaw Configuration Structure

### `.claw/` Directory (Version-managed with Code)

```
.claw/
+-- agents/                    # Agent definitions for each role
|   +-- pm-architect.md        # PM/Architect agent prompt
|   +-- tech-lead.md           # Tech Lead agent prompt
|   +-- frontend-dev.md        # Frontend Dev agent prompt
|   +-- backend-dev.md         # Backend Dev agent prompt
|   +-- devops.md              # DevOps agent prompt
|   +-- qa.md                  # QA agent prompt
+-- workspace/                 # OpenClaw workspace state
|   +-- CLAUDE.md              # Project context (auto-updated)
|   +-- state.json             # Current task state
+-- memory/                    # Project memory (accumulated during development)
|   +-- architecture.md        # Architecture decision records
|   +-- conventions.md         # Code standards
|   +-- domain-knowledge.md    # Domain knowledge (OpenClaw management, etc.)
|   +-- changelog.md           # Important change log
+-- workflows/                 # Development workflow definitions
    +-- sprint.md              # Sprint management process
    +-- pr-review.md           # PR Review rules
    +-- deploy.md              # Deployment process
```

### Agent Memory Evolution Mechanism

As the project progresses, OpenClaw continuously accumulates project context:

1. **Architecture Decisions** -> Recorded in `memory/architecture.md`
2. **Code Standards** -> Recorded in `memory/conventions.md`
3. **Domain Knowledge** -> Recorded in `memory/domain-knowledge.md`
4. **Change History** -> Recorded in `memory/changelog.md`

These memory files are committed along with the code. A new OpenClaw clone can quickly get up to speed by reading these files after startup.

## Role Definitions

### PM / Architect Agent

- Break down requirements into Epic -> Story -> Task
- Architecture design and technical decisions
- Task assignment to GitHub Kanban

### Tech Lead Agent

- PR Review
- Code quality assurance
- Technical solution review

### Frontend Dev Agent

- UI component development
- Page interaction implementation
- Styling and responsiveness

### Backend Dev Agent

- API development
- Database operations
- Business logic implementation

### DevOps Agent

- CI/CD configuration
- Docker deployment
- Environment management

### QA Agent

- Unit test writing
- E2E testing
- Quality assurance

## Workflow

```
Requirement Confirmation -> Issue Creation -> Task Assignment -> Development -> PR -> Review -> Verification -> Merge -> Deploy
```

## Development Standards

### Commit Message

Follow Conventional Commits:

```
<type>(<scope>): <description>

feat(auth): add login page
fix(api): resolve token refresh issue
docs(readme): update setup instructions
```

### PR Standards

- Each PR corresponds to one Issue
- PR description includes: change content, test method, screenshots (if applicable)
- Must pass CI checks

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Components use functional style + Hooks

## Claude Code Usage Guide

### Environment

- User: `claude` (switch via `su - claude`)
- Permissions: All permissions except root
- Command: `claude --dangerously-skip-permissions`

### Best Practices

1. Read Issue description and acceptance criteria first
2. Understand existing code structure
3. Small commits, frequent commits
4. Write tests to cover new features
5. Update related documentation

## Verification Process

1. After CI auto-check passes
2. Deploy to Preview environment
3. PM verifies functionality via link
4. Confirm and merge PR
