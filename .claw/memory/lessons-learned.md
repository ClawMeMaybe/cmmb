# Lessons Learned - ClawMeMaybe Project

Retrospective findings from sprint boundaries. Updated at each sprint boundary.

---

## Sprint 1 - 2026-04-01 (Initial Sprint System Test)

### What Happened
- Set up Agile sprint-driven multi-agent system with OpenClaw
- Created 4 agents: cmmb-pm, cmmb-dev, cmmb-qa, cmmb-techlead
- Dispatched 2 issues: #55 (Production deployment automation) and #40 (Session management)
- Claude Code implemented both issues, created PRs #87 and #86
- Both PRs have CI failures that need investigation

### Key Learnings
1. **Agent dispatch works**: sprint-dispatcher.sh successfully fires Claude Code in background
2. **PR creation needs gh auth**: Claude user needs GitHub token for gh CLI
3. **Data authenticity is critical**: Agents must query GitHub API, not rely on local state.json
4. **Branch existence check**: Dispatcher should check for existing PRs, not just branches

### Action Items
- [ ] Investigate CI failures on PR #87 and #86
- [ ] Ensure all future reports use real GitHub API data only

---

_No additional sprints recorded yet. Each sprint boundary will append findings below._
