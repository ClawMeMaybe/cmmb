# AI-Native 开发指南

## 开发模式

本项目采用 AI-native 开发模式，由 OpenClaw 多 Agent 系统指挥 Claude Code 完成代码编写。

**核心理念**: OpenClaw 本身随项目一起进化，最终成为项目的 DevOps。所有 OpenClaw 的 workspace 配置、agent 定义、记忆状态与代码一起版本管理，实现开箱即用的 DevOps 分身。

## OpenClaw 配置结构

### `.claw/` 目录（与代码同版本管理）

```
.claw/
+-- agents/                    # 各角色 agent 定义
|   +-- pm-architect.md        # PM/架构师 agent prompt
|   +-- tech-lead.md           # Tech Lead agent prompt
|   +-- frontend-dev.md        # 前端开发 agent prompt
|   +-- backend-dev.md         # 后端开发 agent prompt
|   +-- devops.md              # DevOps agent prompt
|   +-- qa.md                  # QA agent prompt
+-- workspace/                 # OpenClaw workspace 状态
|   +-- CLAUDE.md              # 项目上下文（自动更新）
|   +-- state.json             # 当前任务状态
+-- memory/                    # 项目记忆（随开发积累）
|   +-- architecture.md        # 架构决策记录
|   +-- conventions.md         # 代码规范
|   +-- domain-knowledge.md    # 领域知识（OpenClaw 纳管等）
|   +-- changelog.md           # 重要变更日志
+-- workflows/                 # 开发工作流定义
    +-- sprint.md              # Sprint 管理流程
    +-- pr-review.md           # PR Review 规则
    +-- deploy.md              # 部署流程
```

### Agent 记忆进化机制

随着项目推进，OpenClaw 会持续积累项目上下文：
1. **架构决策** -> 记录到 `memory/architecture.md`
2. **代码规范** -> 记录到 `memory/conventions.md`
3. **领域知识** -> 记录到 `memory/domain-knowledge.md`
4. **变更历史** -> 记录到 `memory/changelog.md`

这些记忆文件随代码一起提交，新的 OpenClaw 分身启动后读取这些文件即可快速进入状态。

## 角色定义

### PM / Architect Agent
- 需求拆解为 Epic -> Story -> Task
- 架构设计与技术决策
- 任务分配到 GitHub Kanban

### Tech Lead Agent
- PR Review
- 代码质量把关
- 技术方案审核

### Frontend Dev Agent
- UI 组件开发
- 页面交互实现
- 样式与响应式

### Backend Dev Agent
- API 开发
- 数据库操作
- 业务逻辑实现

### DevOps Agent
- CI/CD 配置
- Docker 部署
- 环境管理

### QA Agent
- 单元测试编写
- E2E 测试
- 质量保障

## 工作流程

```
需求确认 -> Issue 创建 -> 任务分配 -> 开发 -> PR -> Review -> 验证 -> 合并 -> 部署
```

## 开发规范

### Commit Message
遵循 Conventional Commits:
```
<type>(<scope>): <description>

feat(auth): add login page
fix(api): resolve token refresh issue
docs(readme): update setup instructions
```

### PR 规范
- 每个 PR 对应一个 Issue
- PR 描述包含：变更内容、测试方法、截图（如适用）
- 必须通过 CI 检查

### 代码风格
- TypeScript 严格模式
- ESLint + Prettier
- 组件使用函数式 + Hooks

## Claude Code 使用指南

### 环境
- 用户: `claude` (通过 `su - claude` 切换)
- 权限: 除 root 外的所有权限
- 命令: `claude --dangerously-skip-permissions`

### 最佳实践
1. 先阅读 Issue 描述和验收标准
2. 理解现有代码结构
3. 小步提交，频繁 commit
4. 编写测试覆盖新功能
5. 更新相关文档

## 验证流程

1. CI 自动检查通过后
2. 部署到 Preview 环境
3. PM 通过链接验证功能
4. 确认后合并 PR
