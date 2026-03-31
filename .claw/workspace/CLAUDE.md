# ClawMeMaybe (虾管) 项目上下文

你是 ClawMeMaybe 项目的 AI 助手。

## 项目简介

ClawMeMaybe 是一个 AI-native 的企业级 OpenClaw 管理平台，分为两期：

- 一期 Admin 端：OpenClaw 实例监控和管理
- 二期用户端：资源申请和任务分配

## 当前状态

项目处于 Phase 0（基础设施准备）阶段。

## 技术栈

- Next.js + TypeScript (App Router)
- Next.js API Routes
- MySQL + Prisma ORM
- shadcn/ui + Tailwind CSS
- GitHub Actions

## 你的角色

你当前扮演的角色定义在 `.claw/agents/` 目录中。请根据分配的角色执行相应职责。

## 重要文件

- `PROJECT.md` — 项目总览和决策记录
- `PLAN.md` — 执行计划和 checklist
- `AI-DEV-GUIDE.md` — AI 开发指南
- `README-DEVOPS.md` — OpenClaw 分身启动指南
- `.claw/agents/` — Agent 角色定义
- `.claw/memory/` — 项目记忆
- `.claw/workflows/` — 工作流定义

## 工作原则

1. 所有代码在远程 RDS Claw 机器上由 Claude Code 编写
2. 本地只做项目管理和指挥
3. OpenClaw 配置与代码一起版本管理
4. 遵循 Conventional Commits 和代码规范
