# 架构决策记录

## 项目架构

### 整体架构

```
+-------------------------------------------------+
|                   Next.js App                    |
|  +-------------+  +--------------------------+  |
|  |  Frontend    |  |     API Routes           |  |
|  |  (App Router)|  |     (Backend)            |  |
|  +-------------+  +--------------------------+  |
|         |                    |                   |
+---------+--------------------+-------------------+
          |                    |
          |         +----------+----------+
          |         |                     |
          v         v                     v
    +----------+  +----------+    +--------------+
    |  MySQL   |  | OpenClaw |    | OpenClaw     |
    |  (RDS)   |  | Gateway  |    | Instances    |
    +----------+  +----------+    +--------------+
```

### 目录结构

```
clawmemaybe/
+-- .claw/                    # OpenClaw DevOps config
+-- .github/workflows/        # CI/CD
+-- src/
|   +-- app/                  # Next.js App Router
|   |   +-- (auth)/           # Auth pages
|   |   +-- (dashboard)/      # Dashboard pages
|   |   +-- api/              # API Routes
|   +-- components/           # React components
|   +-- lib/                  # Utilities
|   +-- server/               # Server logic
|   +-- types/                # TypeScript types
+-- prisma/                   # DB schema
+-- tests/                    # Test files
+-- docker/                   # Docker config
+-- docs/                     # Documentation
```

## 技术决策

| 决策 | 选择 | 原因 | 日期 |
|------|------|------|------|
| 前端框架 | Next.js + TypeScript | 全栈框架，SSR 支持，生态成熟 | 2026-03-31 |
| 后端 | Next.js API Routes | 前后端同构，简化部署 | 2026-03-31 |
| 数据库 | MySQL + Prisma | 已有阿里云 RDS MySQL | 2026-03-31 |
| UI 组件 | shadcn/ui + Tailwind | 可定制性强，TypeScript 友好 | 2026-03-31 |
| CI/CD | GitHub Actions | 与 GitHub 深度集成 | 2026-03-31 |
| 认证 | 基础登录（一期） | 先跑通核心功能 | 2026-03-31 |
| OpenClaw 纳管 | Gateway + Token | 成熟方案，待调研具体实现 | 2026-03-31 |
| DevOps 进化 | .claw/ 目录版本管理 | 开箱即用的 DevOps 分身 | 2026-03-31 |

## 待决策

- OpenClaw Gateway 具体实现方案（待调研）
- 二期 RBAC 权限方案
- 预览环境部署方案（Vercel vs 自建）
