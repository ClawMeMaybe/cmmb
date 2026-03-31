# Claw Workflow Improvements

## v1.0 (2026-03-31) - Claude Code Execution Pattern

### Problem
ACP (`sessions_spawn` with `runtime: "acp"`) failed due to environment variable issues. The gateway runs as root but Claude credentials are in the `claude` user's environment.

### Solution
Use direct `exec` to run Claude Code under the `claude` system user:

```bash
su - claude -c 'source ~/.zshrc; cd <repo> && claude --dangerously-skip-permissions "<task>"'
```

### Claude User Environment
The `claude` user has API credentials in `~/.zshrc`:
- `ANTHROPIC_API_KEY` - API key for Anthropic/DashScope
- `ANTHROPIC_BASE_URL` - DashScope endpoint (`https://dashscope.aliyuncs.com/apps/anthropic`)
- `ANTHROPIC_MODEL` - Model identifier (`glm-5`)

### Authentication Check
Before coding tasks, verify Claude auth:
```bash
su - claude -c 'source ~/.zshrc; claude auth status'
```
Expected: `{"loggedIn": true, "authMethod": "api_key"}`

### Rules
- **Do NOT** use `sessions_spawn` with `runtime: "acp"` for coding tasks
- **Do NOT** use `runtime: "subagent"` (native) for code generation
- **DO** use direct exec with Claude Code for all coding work
- Claude Code handles file editing, git operations, and code generation better than native subagents

## v1.1 (2026-03-31) - Agent Routing

### Problem
Main agent was used for cmmb project work → wrote to wrong memory location (global instead of project).

### Solution
Route project work to project-specific agents:

| Project | Agent | Workspace |
|---------|-------|-----------|
| ClawMeMaybe/cmmb | `cmmb` | `/root/.openclaw/workspaces/cmmb/` |
| General/cross-project | `main` | `/root/.openclaw/workspace/` |

### Rules
- User says "cmmb", "ClawMeMaybe", or project-specific work → use `cmmb` agent
- If unclear which agent to use → ASK before proceeding
- Project memory lives in `repo/.claw/memory/`, symlinked via `memory-project`

## Related Files
- `/root/.openclaw/workspace/RULES.md` - Main agent rules (cross-project)
- `/root/.openclaw/workspaces/cmmb/` - cmmb agent workspace
- `~claude/.zshrc` - Claude user credentials (system level)

<!-- source: claw-improvement -->
<!-- issue: 16 -->