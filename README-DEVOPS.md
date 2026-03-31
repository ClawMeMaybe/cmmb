# OpenClaw DevOps Clone Quick Start Guide

## Overview

This document guides you on how to quickly set up an OpenClaw DevOps clone to take over the development and operations of the ClawMeMaybe project.

## Prerequisites

- A machine with OpenClaw installed (e.g., Alibaba Cloud RDS Claw)
- Claude Code installed and can execute `claude --dangerously-skip-permissions`
- GitHub access (SSH Key configured)
- Project code cloned

## Quick Start

### 1. Clone the Project

```bash
git clone git@github.com:ClawMeMaybe/cmmb.git
cd cmmb
```

### 2. Initialize OpenClaw Environment

```bash
# Switch to claude user
su - claude

# Enter project directory
cd /path/to/cmmb

# Load project context
# OpenClaw will read all configurations in the .claw/ directory
```

### 3. Start DevOps Agent

```bash
# Start PM Agent, let it read current project state and start working
claude --dangerously-skip-permissions -p "
You are the PM/Architect Agent for the ClawMeMaybe project.
Read the .claw/ directory to understand your role, the project context,
and current state. Then assess the current situation and determine
what needs to be done next.
"
```

### 4. Verify Clone Status

After the clone starts, it should be able to:

- Describe current project progress
- List pending GitHub Issues
- Identify what should be done in the next Sprint
- Direct Claude Code to start development

## `.claw/` Directory Description

| Directory/File         | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `agents/`              | Prompt definitions for each role Agent                               |
| `workspace/CLAUDE.md`  | Project context (auto-updated)                                       |
| `workspace/state.json` | Current task state                                                   |
| `memory/`              | Project memory (architecture decisions, standards, domain knowledge) |
| `workflows/`           | Development workflow definitions                                     |

## Agent Roles

| Role         | File                     | Responsibilities                                            |
| ------------ | ------------------------ | ----------------------------------------------------------- |
| PM/Architect | `agents/pm-architect.md` | Requirement breakdown, architecture design, task assignment |
| Tech Lead    | `agents/tech-lead.md`    | PR Review, code quality assurance                           |
| Frontend Dev | `agents/frontend-dev.md` | UI/Component development                                    |
| Backend Dev  | `agents/backend-dev.md`  | API/Database development                                    |
| DevOps       | `agents/devops.md`       | CI/CD, deployment, environment management                   |
| QA           | `agents/qa.md`           | Test writing, quality assurance                             |

## Memory Evolution

As the project progresses, OpenClaw continuously updates files in the `memory/` directory:

- `architecture.md` — Architecture decision records
- `conventions.md` — Code standards
- `domain-knowledge.md` — Domain knowledge (OpenClaw management, etc.)
- `changelog.md` — Important change log

New clones can seamlessly take over the project by reading these memory files after startup.
