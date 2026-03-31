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

## Related Files
- `/root/.openclaw/workspace/RULES.md` - Agent rules (workspace level)
- `~claude/.zshrc` - Claude user credentials (system level)

<!-- source: claw-improvement -->
<!-- issue: 16 -->