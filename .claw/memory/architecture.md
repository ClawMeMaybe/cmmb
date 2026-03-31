# Architecture Decision Records

## v1.0 (2026-03-31) - Initial Architecture
<!-- source: initial -->

## Project Architecture

### Overall Architecture

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

### Directory Structure

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

## Technical Decisions

| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Frontend Framework | Next.js + TypeScript | Full-stack framework, SSR support, mature ecosystem | 2026-03-31 |
| Backend | Next.js API Routes | Frontend-backend isomorphic, simplified deployment | 2026-03-31 |
| Database | MySQL + Prisma | Existing Alibaba Cloud RDS MySQL | 2026-03-31 |
| UI Components | shadcn/ui + Tailwind | High customizability, TypeScript friendly | 2026-03-31 |
| CI/CD | GitHub Actions | Deep GitHub integration | 2026-03-31 |
| Authentication | Basic login (Phase 1) | Prioritize core functionality first | 2026-03-31 |
| OpenClaw Management | Gateway + Token | Mature solution, specific implementation to be researched | 2026-03-31 |
| DevOps Evolution | .claw/ directory version management | Out-of-the-box DevOps clone | 2026-03-31 |

## Pending Decisions

- OpenClaw Gateway specific implementation (to be researched)
- Phase 2 RBAC permission solution
- Preview environment deployment solution (Vercel vs self-hosted)
