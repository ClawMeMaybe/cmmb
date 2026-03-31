# Domain Knowledge

## v1.0 (2026-03-31) - Initial Knowledge

<!-- source: initial -->

## OpenClaw Management

### Topics to Research

1. **OpenClaw Gateway Solution**
   - LiteLLM Gateway
   - OpenWebUI
   - Other mature open-source solutions
   - Comparison dimensions: feature completeness, community activity, deployment complexity, Alibaba Cloud compatibility

2. **Token Management**
   - Token generation and distribution mechanism
   - Token rotation strategy
   - Token permission granularity

3. **Instance Communication**
   - OpenClaw instance API interfaces
   - Health check methods
   - Log collection methods

### Alibaba Cloud RDS Claw

- RDS Claw is Alibaba Cloud's product for quickly creating OpenClaw VMs from images
- Current development environment: One RDS Claw machine, Claude Code installed
- Claude user: Switch via `su - claude`, no password, all permissions except root
- Execution command: `claude --dangerously-skip-permissions`

## Phase 1 Functional Domains

### Instance Management

- Instance lifecycle: Create -> Start -> Run -> Stop -> Delete
- Instance states: running, stopped, error, creating, deleting

### Monitoring

- Resource metrics: CPU, memory, disk, network
- Health status: healthy, degraded, unhealthy

### Auditing

- Operation logs: Who, when, what action, result

## Phase 2 Functional Domains (Reserved)

### Resource Application

- User submits resource application
- Approval process
- Resource allocation

### Task Assignment

- Task creation and assignment
- Progress tracking
- Result collection
