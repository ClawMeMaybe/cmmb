# ClawMeMaybe (虾管)

> AI-native 企业级 OpenClaw 管理平台

## 概述

ClawMeMaybe（虾管）是一个 AI-native 的企业级 OpenClaw 管理平台，由 AI 驱动开发全流程。

### 一期：Admin 端
面向基础设施运维人员、采购人员，实现 OpenClaw 实例的监控、管理和生命周期管理。

### 二期：用户端
面向业务团队、产研团队，实现资源申请、任务分配、高效推进项目。

## 技术栈

- **前端**: Next.js + TypeScript (App Router)
- **后端**: Next.js API Routes
- **数据库**: MySQL + Prisma ORM
- **UI**: shadcn/ui + Tailwind CSS
- **CI/CD**: GitHub Actions

## AI-Native 开发

本项目采用 AI-native 开发模式，OpenClaw 多 Agent 系统指挥 Claude Code 完成代码编写。

详见 [AI-DEV-GUIDE.md](./AI-DEV-GUIDE.md) 和 [README-DEVOPS.md](./README-DEVOPS.md)

## 快速开始

```bash
git clone git@github.com:ClawMeMaybe/cmmb.git
cd cmmb
npm install
npm run dev
```

## 文档

- [项目总览](./PROJECT.md)
- [执行计划](./PLAN.md)
- [AI 开发指南](./AI-DEV-GUIDE.md)
- [DevOps 分身启动指南](./README-DEVOPS.md)
