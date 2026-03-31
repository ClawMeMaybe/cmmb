# ClawMeMaybe Project Record

## Project Overview

ClawMeMaybe is an AI-native enterprise OpenClaw management platform.

- **Name**: ClawMeMaybe
- **Positioning**: Enterprise OpenClaw resource management and task allocation platform

## Two-Phase Plan

### Phase 1: Admin Portal

- **Target Users**: Infrastructure operations staff, procurement staff
- **Core Features**: OpenClaw instance monitoring, management, lifecycle management
- **Tech Stack**: Next.js + TypeScript + MySQL + Prisma

### Phase 2: User Portal

- **Target Users**: Business teams, product/engineering teams and other execution staff
- **Core Features**: Resource requests, task allocation, project advancement
- **Positioning**: Similar to QoderWork, all-in-one AI assistant management platform

## Tech Stack

| Domain               | Choice                                      |
| -------------------- | ------------------------------------------- |
| Frontend Framework   | Next.js + TypeScript (App Router)           |
| Backend              | Next.js API Routes                          |
| Database             | MySQL + Prisma ORM                          |
| Authentication       | Basic login (Phase 1 simplified)            |
| UI Component Library | shadcn/ui + Tailwind CSS                    |
| CI/CD                | GitHub Actions                              |
| Code Hosting         | GitHub (includes Kanban project management) |
| Preview Deployment   | GitHub Pages/Vercel + Remote machine Docker |

## AI-Native Development Model

- **Development Environment**: Alibaba Cloud RDS Claw machine + Claude Code
- **Development Workflow**: OpenClaw multi-agent orchestrates Claude Code for coding
- **User Role**: PM (requirement alignment, key validation)
- **Project Management**: GitHub Kanban

## OpenClaw DevOps Evolution Strategy

This is a core concept: **OpenClaw evolves with the project and ultimately becomes the project's DevOps.**

### Core Principles

1. **OpenClaw workspace versioned with code** — All OpenClaw workspace configurations, agent prompts, state files are committed to the GitHub repo
2. **Out-of-the-box DevOps clone** — Any developer/user can quickly spin up an OpenClaw clone after cloning the code, continuing development or QA
3. **Progressive evolution** — OpenClaw continuously learns project context and accumulates domain knowledge during development, evolving from a "general development assistant" to a "project-specific DevOps"

### OpenClaw Assets to Version

- Agent role definitions and prompts (PM, Tech Lead, Frontend Dev, Backend Dev, DevOps, QA)
- OpenClaw workspace configuration (CLAUDE.md, .claw/ directory, etc.)
- Agent memory/context snapshots (project domain knowledge, architecture decisions, code conventions)
- Automation scripts (CI/CD triggers, deployment, monitoring)
- Development workflow definitions (Sprint management, PR review rules, etc.)

## Key Decision Log

| Date       | Decision                     | Reason                                                                 |
| ---------- | ---------------------------- | ---------------------------------------------------------------------- |
| 2026-03-31 | Next.js + TypeScript         | Full-stack framework, mature ecosystem, easy to extend                 |
| 2026-03-31 | MySQL + Prisma               | Existing Alibaba Cloud RDS MySQL                                       |
| 2026-03-31 | GitHub Actions               | Deep GitHub integration, native Kanban support                         |
| 2026-03-31 | Phase 1 simplified auth      | Focus on core features first, complete RBAC in Phase 2                 |
| 2026-03-31 | Dual Preview solution        | GitHub Pages for page testing + Docker for real environment validation |
| 2026-03-31 | OpenClaw versioned with code | Implement out-of-the-box DevOps clone, project and AI co-evolution     |
