# ClawMeMaybe (虾管) 项目记录

## 项目概述

ClawMeMaybe（虾管）是一个 AI-native 的企业级 OpenClaw 管理平台。

- **英文名**: ClawMeMaybe
- **中文名**: 虾管
- **定位**: 企业级 OpenClaw 资源管理与任务分配平台

## 两期规划

### 一期：Admin 端
- **目标用户**: 基础设施运维人员、采购人员
- **核心功能**: OpenClaw 实例监控、管理、生命周期管理
- **技术栈**: Next.js + TypeScript + MySQL + Prisma

### 二期：用户端
- **目标用户**: 业务团队、产研团队等执行人员
- **核心功能**: 资源申请、任务分配、项目推进
- **定位**: 类似 QoderWork，全能型 AI 助手管理平台

## 技术栈

| 领域 | 选择 |
|------|------|
| 前端框架 | Next.js + TypeScript (App Router) |
| 后端 | Next.js API Routes |
| 数据库 | MySQL + Prisma ORM |
| 认证 | 基础登录（一期简化） |
| UI 组件库 | shadcn/ui + Tailwind CSS |
| CI/CD | GitHub Actions |
| 代码托管 | GitHub（含 Kanban 项目管理） |
| Preview 部署 | GitHub Pages/Vercel + 远程机器 Docker |

## AI-Native 开发模式

- **开发环境**: 阿里云 RDS Claw 机器 + Claude Code
- **开发流程**: OpenClaw 多 Agent 指挥 Claude Code 写代码
- **用户角色**: PM（需求对齐、关键验证）
- **项目管理**: GitHub Kanban

## OpenClaw DevOps 进化策略

这是一个核心理念：**OpenClaw 本身随项目一起进化，最终成为项目的 DevOps。**

### 核心原则
1. **OpenClaw workspace 与代码同版本管理** — OpenClaw 的 workspace 配置、agent prompts、state 等必要文件全部提交到 GitHub repo
2. **开箱即用的 DevOps 分身** — 任何开发者/用户 clone 代码后，可以快速拉起一个 OpenClaw 分身，继续进行开发或 QA
3. **渐进式进化** — OpenClaw 在项目开发过程中不断学习项目上下文、积累领域知识，从"通用开发助手"进化为"项目专属 DevOps"

### 需要版本管理的 OpenClaw 资产
- Agent 角色定义与 prompt（PM、Tech Lead、Frontend Dev、Backend Dev、DevOps、QA）
- OpenClaw workspace 配置（CLAUDE.md、.claw/ 目录等）
- Agent 记忆/上下文快照（项目领域知识、架构决策、代码规范）
- 自动化脚本（CI/CD 触发、部署、监控）
- 开发工作流定义（Sprint 管理、PR review 规则等）

## 关键决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-03-31 | Next.js + TypeScript | 全栈框架，生态成熟，便于扩展 |
| 2026-03-31 | MySQL + Prisma | 已有阿里云 RDS MySQL |
| 2026-03-31 | GitHub Actions | 与 GitHub 深度集成，原生支持 Kanban |
| 2026-03-31 | 一期简化认证 | 先跑通核心功能，二期完善 RBAC |
| 2026-03-31 | 双 Preview 方案 | GitHub Pages 做页面测试 + Docker 做真实环境验证 |
| 2026-03-31 | OpenClaw 与代码同版本管理 | 实现开箱即用的 DevOps 分身，项目与 AI 共同进化 |
