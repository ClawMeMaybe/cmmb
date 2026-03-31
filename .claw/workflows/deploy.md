# Deployment Workflow

## Environments

| Environment | Purpose | Deployment |
|-------------|---------|------------|
| Preview | PR validation | GitHub Actions auto-deploy |
| Dev | Development | Remote machine Docker |
| Prod | Production | TBD (Phase 2) |

## Preview Deployment

- Trigger: PR opened or updated
- Method: GitHub Pages or Vercel Preview
- Purpose: UI and page flow validation
- Limitation: No backend, UI only

## Dev Deployment (Remote Machine)

- Trigger: PR merged to main
- Method: Docker Compose
- Access: IP:port or domain

### Deployment Steps

```bash
git pull origin main
docker compose build
docker compose up -d
curl http://localhost:3000/api/health
```

### Docker Compose Services

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL
      - OPENCLAW_GATEWAY_URL
      - OPENCLAW_GATEWAY_TOKEN
    depends_on:
      - nginx

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf
```

## Health Check

- Endpoint: `GET /api/health`
- Response: `{ status: "ok", timestamp: "..." }`
- Frequency: Every 30 seconds
- Failure threshold: 3 consecutive failures = unhealthy
