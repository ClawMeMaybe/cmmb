# Post-Issue Review Process

Execute after each issue is completed and merged.

## Metrics to Track

| Metric | Description | Target |
|--------|-------------|--------|
| `duration` | Time from issue start to PR merge | < 2 hours |
| `tokens_in` | Input tokens used by sub-agent | Track for cost |
| `tokens_out` | Output tokens used by sub-agent | Track for cost |
| `iterations` | Number of code review cycles | < 3 |
| `test_coverage` | Test coverage of new code | > 80% |
| `accuracy` | First-attempt success rate | > 90% |

## Review Steps

### 1. Collect Metrics

```bash
# Get sub-agent stats from session
# Check token usage from subagent completion event
# Calculate duration from state.json timestamps
```

### 2. Skill Optimization Check

Ask: **Did this issue reveal gaps in our skills?**

Check:
- [ ] Was there repeated manual work that could be automated?
- [ ] Were there patterns that keep appearing across issues?
- [ ] Did the sub-agent struggle with something a skill could help?
- [ ] Is there domain knowledge that should be captured?

### 3. Search for Applicable Skills

```bash
# Search ClawHub for relevant skills
clawhub search "<topic>"

# Check OpenClaw built-in skills
ls /usr/lib/node_modules/openclaw/skills/
```

### 4. Create/Update Skills

If optimization identified:
- Use `skill-creator` skill to create new skill
- Or update existing skill with new patterns
- Store in `.claw/skills/` for project-specific skills
- Document in `.claw/memory/domain-knowledge.md`

### 5. Update Metrics Log

Record metrics to track improvement:

```markdown
## Issue #N - YYYY-MM-DD

| Metric | Value |
|--------|-------|
| Duration | Xh Ym |
| Tokens In | N |
| Tokens Out | N |
| Iterations | N |
| Test Coverage | N% |

### Skill Optimizations
- Added/Updated: [skill name]
- Reason: [why]

### Learnings
- [What worked well]
- [What could improve]
```

## Skill Categories for This Project

### Development Skills (Already Added)
- `coding-agent` - Delegate to Claude Code/Codex
- `github` - GitHub CLI operations
- `gh-issues` - Auto-process issues with sub-agents
- `tmux` - Session management

### Skills to Consider Creating
- `nextjs-patterns` - Common Next.js patterns for this project
- `prisma-helpers` - Prisma query patterns
- `openclaw-gateway` - OpenClaw Gateway API client
- `instance-mgmt` - Instance CRUD patterns

## Process Flow

```
Issue Complete → Collect Metrics → Skill Optimization Check → Search/Create Skills → Update Log → Sync to GitHub
```

## Sync to GitHub

After each review:
1. Update `.claw/memory/metrics-log.md`
2. Update `.claw/skills/` if new/modified
3. Commit: `git add .claw/ && git commit -m "docs: post-issue review for #N"`
4. Push: `git push origin main`

---

_This process ensures continuous improvement of development efficiency._