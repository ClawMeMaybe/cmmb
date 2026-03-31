# DevOps Guide

## Overview

This document covers development environment setup, deployment procedures, and operational tasks for the ClawMeMaybe (cmmb) project.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Production Deployment](#production-deployment)
3. [Health Checks](#health-checks)
4. [Environment Variables](#environment-variables)
5. [Database Operations](#database-operations)
6. [Monitoring & Logging](#monitoring--logging)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+ (for local development)

### Local Development Setup

```bash
# Clone the repository
git clone git@github.com:ClawMeMaybe/cmmb.git
cd cmmb

# Copy environment file
cp .env.example .env

# Start services
docker-compose up -d

# Check health
curl http://localhost:3000/api/health
```

---

## Production Deployment

### 1. Prepare Environment

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with your production values
# IMPORTANT: Change all passwords and secrets!
vim .env.production
```

### 2. Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/cmmb` |
| `NEXTAUTH_SECRET` | NextAuth.js secret key | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Public URL of your app | `https://your-domain.com` |
| `MYSQL_ROOT_PASSWORD` | MySQL root password | Secure random password |
| `MYSQL_USER` | MySQL application user | `cmmb_user` |
| `MYSQL_PASSWORD` | MySQL user password | Secure random password |

### 3. Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f app
```

### 4. Run Database Migrations

```bash
# Run Prisma migrations
docker-compose exec app npx prisma migrate deploy

# Seed initial data (if needed)
docker-compose exec app npm run db:seed
```

### 5. Verify Deployment

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":"...","version":"0.1.0","checks":{"database":{"status":"ok"}}}
```

### Production Checklist

- [ ] All environment variables set
- [ ] Strong passwords for MySQL (not defaults)
- [ ] `NEXTAUTH_SECRET` generated with secure random
- [ ] `NEXTAUTH_URL` uses HTTPS in production
- [ ] Database migrations applied
- [ ] Health check returns `status: ok`
- [ ] SSL/TLS configured (via nginx or load balancer)
- [ ] Backup strategy configured for MySQL volume

---

## Health Checks

### Application Health Endpoint

```bash
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0",
  "checks": {
    "database": {
      "status": "ok"
    }
  }
}
```

### Health Status Codes

| Status | HTTP Code | Description |
|--------|-----------|-------------|
| `ok` | 200 | All checks passed |
| `error` | 503 | One or more checks failed |

### Individual Check Status

| Status | Description |
|--------|-------------|
| `ok` | Check passed |
| `error` | Check failed (see `message` for details) |
| `pending` | Check in progress |
| `skipped` | Check skipped (not configured) |

### Docker Health Check

Each container has a health check configured:

- **App**: Checks `/api/health` endpoint every 30s
- **MySQL**: Uses `mysqladmin ping` every 10s
- **Nginx**: Depends on app health

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' cmmb-app-1
```

---

## Environment Variables

### Application Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | MySQL connection string |
| `NEXTAUTH_SECRET` | Yes | - | Secret for JWT signing |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` | Public URL |
| `NODE_ENV` | No | `production` | Environment mode |
| `OPENCLAW_GATEWAY_TOKEN` | No | - | Gateway API token |

### MySQL Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MYSQL_ROOT_PASSWORD` | Yes | - | Root password |
| `MYSQL_USER` | No | `cmmb_user` | Application user |
| `MYSQL_PASSWORD` | Yes | - | Application user password |
| `MYSQL_DATABASE` | No | `cmmb` | Database name |

---

## Database Operations

### Migrations

```bash
# Create a new migration
npx prisma migrate dev --name description_of_change

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset
```

### Backups

```bash
# Create backup
docker-compose exec mysql mysqldump -u root -p cmmb > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T mysql mysql -u root -p cmmb < backup_20240115.sql
```

### Database Connection

```bash
# Connect to MySQL
docker-compose exec mysql mysql -u cmmb_user -p cmmb

# Or via Prisma Studio
npm run db:studio
```

---

## Monitoring & Logging

### Container Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f mysql
docker-compose logs -f nginx
```

### Log Configuration

Logs are configured with rotation:
- Max size: 10MB per file
- Max files: 3 retained
- Driver: JSON file

### Resource Limits

Default resource limits in production:

| Service | CPU Limit | Memory Limit |
|---------|-----------|--------------|
| App | 2 cores | 1GB |
| MySQL | 2 cores | 2GB |
| Nginx | 0.5 cores | 128MB |

---

## Troubleshooting

### App Won't Start

1. Check environment variables:
   ```bash
   docker-compose config
   ```

2. Check logs:
   ```bash
   docker-compose logs app
   ```

3. Verify database connection:
   ```bash
   docker-compose exec app npx prisma db pull
   ```

### Database Connection Failed

1. Verify MySQL is healthy:
   ```bash
   docker-compose ps mysql
   ```

2. Check MySQL logs:
   ```bash
   docker-compose logs mysql
   ```

3. Verify credentials:
   ```bash
   docker-compose exec mysql mysql -u cmmb_user -p
   ```

### Health Check Failing

1. Check detailed health response:
   ```bash
   curl -v http://localhost:3000/api/health
   ```

2. If database check fails:
   - Verify `DATABASE_URL` format
   - Check MySQL container health
   - Verify network connectivity

### Reset Everything

```bash
# Stop and remove all containers, volumes, and networks
docker-compose down -v

# Rebuild from scratch
docker-compose up -d --build
```

---

## OpenClaw DevOps Clone Quick Start

This section guides you on quickly setting up an OpenClaw DevOps clone to take over development and operations.

### Prerequisites

- A machine with OpenClaw installed (e.g., Alibaba Cloud RDS Claw)
- Claude Code installed and can execute `claude --dangerously-skip-permissions`
- GitHub access (SSH Key configured)
- Project code cloned

### Quick Start

```bash
# Clone the Project
git clone git@github.com:ClawMeMaybe/cmmb.git
cd cmmb

# Switch to claude user
su - claude

# Enter project directory
cd /path/to/cmmb
```

### `.claw/` Directory Description

| Directory/File         | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `agents/`              | Prompt definitions for each role Agent                               |
| `workspace/CLAUDE.md`  | Project context (auto-updated)                                       |
| `workspace/state.json` | Current task state                                                   |
| `memory/`              | Project memory (architecture decisions, standards, domain knowledge) |
| `workflows/`           | Development workflow definitions                                     |

### Agent Roles

| Role         | File                     | Responsibilities                                            |
| ------------ | ------------------------ | ----------------------------------------------------------- |
| PM/Architect | `agents/pm-architect.md` | Requirement breakdown, architecture design, task assignment |
| Tech Lead    | `agents/tech-lead.md`    | PR Review, code quality assurance                           |
| Frontend Dev | `agents/frontend-dev.md` | UI/Component development                                    |
| Backend Dev  | `agents/backend-dev.md`  | API/Database development                                    |
| DevOps       | `agents/devops.md`       | CI/CD, deployment, environment management                   |
| QA           | `agents/qa.md`           | Test writing, quality assurance                             |

---

## Security Recommendations

1. **Never commit secrets** to version control
2. **Use strong, unique passwords** for all services
3. **Enable HTTPS** in production via nginx or load balancer
4. **Restrict database access** to application containers only
5. **Regular backups** of the MySQL volume
6. **Monitor logs** for suspicious activity
7. **Keep dependencies updated** with security patches