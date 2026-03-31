# OpenClaw DevOps 分身快速启动指南

## 概述

本文档指导你如何快速拉起一个 OpenClaw DevOps 分身，接管 ClawMeMaybe 项目的开发和运维工作。

## 前置条件

- 一台已安装 OpenClaw 的机器（如阿里云 RDS Claw）
- Claude Code 已安装并可执行 `claude --dangerously-skip-permissions`
- GitHub 访问权限（SSH Key 已配置）
- 项目代码已 clone

## 快速启动

### 1. Clone 项目

```bash
git clone git@github.com:ClawMeMaybe/cmmb.git
cd cmmb
```

### 2. 初始化 OpenClaw 环境

```bash
# 切换到 claude 用户
su - claude

# 进入项目目录
cd /path/to/cmmb

# 加载项目上下文
# OpenClaw 会读取 .claw/ 目录下的所有配置
```

### 3. 启动 DevOps Agent

```bash
# 启动 PM Agent，让它读取当前项目状态并开始工作
claude --dangerously-skip-permissions -p "
You are the PM/Architect Agent for the ClawMeMaybe project.
Read the .claw/ directory to understand your role, the project context,
and current state. Then assess the current situation and determine
what needs to be done next.
"
```

### 4. 验证分身状态

分身启动后应该能够：
- 描述项目当前进展
- 列出待完成的 GitHub Issues
- 识别下一个 Sprint 应该做什么
- 指挥 Claude Code 开始开发

## `.claw/` 目录说明

| 目录/文件 | 用途 |
|-----------|------|
| `agents/` | 各角色 Agent 的 prompt 定义 |
| `workspace/CLAUDE.md` | 项目上下文（自动更新） |
| `workspace/state.json` | 当前任务状态 |
| `memory/` | 项目记忆（架构决策、规范、领域知识） |
| `workflows/` | 开发工作流定义 |

## Agent 角色

| 角色 | 文件 | 职责 |
|------|------|------|
| PM/Architect | `agents/pm-architect.md` | 需求拆解、架构设计、任务分配 |
| Tech Lead | `agents/tech-lead.md` | PR Review、代码质量把关 |
| Frontend Dev | `agents/frontend-dev.md` | UI/组件开发 |
| Backend Dev | `agents/backend-dev.md` | API/数据库开发 |
| DevOps | `agents/devops.md` | CI/CD、部署、环境管理 |
| QA | `agents/qa.md` | 测试编写、质量保障 |

## 记忆进化

随着项目推进，OpenClaw 会持续更新 `memory/` 目录下的文件：

- `architecture.md` — 架构决策记录
- `conventions.md` — 代码规范
- `domain-knowledge.md` — 领域知识（OpenClaw 纳管等）
- `changelog.md` — 重要变更日志

新的分身启动后读取这些记忆文件，即可无缝接管项目。
