# 领域知识

## OpenClaw 纳管

### 待调研内容

1. **OpenClaw Gateway 方案**
   - LiteLLM Gateway
   - OpenWebUI
   - 其他成熟开源方案
   - 对比维度: 功能完整性、社区活跃度、部署复杂度、与阿里云兼容性

2. **Token 管理**
   - Token 生成与分发机制
   - Token 轮换策略
   - Token 权限粒度

3. **实例通信**
   - OpenClaw 实例的 API 接口
   - 健康检查方式
   - 日志采集方式

### 阿里云 RDS Claw

- RDS Claw 是阿里云推出的基于镜像快速创建 OpenClaw VM 的产品
- 当前开发环境: 一台 RDS Claw 机器，已安装 Claude Code
- Claude 用户: `su - claude` 切换，无密码，有除 root 外所有权限
- 执行命令: `claude --dangerously-skip-permissions`

## 一期功能域

### 实例管理
- 实例生命周期: 创建 -> 启动 -> 运行 -> 停止 -> 删除
- 实例状态: running, stopped, error, creating, deleting

### 监控
- 资源指标: CPU、内存、磁盘、网络
- 健康状态: healthy, degraded, unhealthy

### 审计
- 操作日志: 谁、什么时间、做了什么、结果如何

## 二期功能域（预留）

### 资源申请
- 用户提交资源申请
- 审批流程
- 资源分配

### 任务分配
- 任务创建与分配
- 进度跟踪
- 结果收集
