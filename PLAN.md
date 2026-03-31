# ClawMeMaybe 项目计划

## 执行步骤

### Phase 0: 基础设施准备
- [x] 确认 RDS Claw 机器 SSH 访问
- [x] 配置 GitHub 仓库 + SSH Key
- [ ] 创建 GitHub Project Board (Kanban)
- [ ] 配置 Claude Code 环境验证

### Phase 1: Boilerplate 搭建
- [ ] 初始化 Next.js + TypeScript 项目
- [ ] 配置 Prisma + MySQL 连接
- [ ] 配置 ESLint、Prettier、Husky
- [ ] 设置 GitHub Actions workflows
- [ ] 配置 Docker Compose
- [ ] 初始化 GitHub Kanban
- [x] 创建 `.claw/` 目录结构（agent 定义、workspace、memory、workflows）
- [x] 编写初始 Agent prompts（PM、Tech Lead、Frontend、Backend、DevOps、QA）
- [x] 编写初始项目记忆文件（架构、规范、领域知识模板）
- [x] 编写 OpenClaw 分身快速启动指南（README-DEVOPS.md）

### Phase 2: 一期核心功能开发
- [ ] 基础认证（登录页）
- [ ] OpenClaw 实例管理 CRUD
- [ ] 监控 Dashboard
- [ ] Gateway + Token 纳管集成
- [ ] 操作日志/审计

### Phase 3: 部署与验证
- [ ] 远程机器 Docker 部署
- [ ] Nginx 配置 + 域名/端口映射
- [ ] E2E 测试
- [ ] 用户验收

### Phase 4: 二期规划
- [ ] 用户端需求细化
- [ ] RBAC 权限体系完善
- [ ] 资源申请/审批流程
- [ ] 任务分配系统
