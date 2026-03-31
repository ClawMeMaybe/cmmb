# 部署流程

## 环境

| 环境 | 用途 | 部署方式 |
|------|------|----------|
| Preview | PR 预览验证 | GitHub Actions 自动部署 |
| Dev | 开发环境 | 远程机器 Docker |
| Prod | 生产环境 | 待定（二期） |

## Preview 部署

- 触发条件: PR 提交或更新
- 部署方式: GitHub Pages 或 Vercel Preview
- 用途: UI 和页面流程验证

## Dev 部署（远程机器）

- 触发条件: PR 合并到 main
- 部署方式: Docker Compose
- 访问方式: IP:端口 或域名

### 部署步骤

```bash
git pull origin main
docker compose build
docker compose up -d
curl http://localhost:3000/api/health
```

## 健康检查

- 端点: `GET /api/health`
- 返回: `{ status: "ok", timestamp: "..." }`
- 检查频率: 每 30 秒
- 失败阈值: 连续 3 次失败标记为 unhealthy
