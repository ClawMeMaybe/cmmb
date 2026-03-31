# Sprint 管理流程

## Sprint 周期

- 建议周期: 1 周
- 每个 Sprint 开始时 PM Agent 从 Kanban 的 Todo 列选取任务

## Kanban 列定义

| 列 | 含义 | 进入条件 | 退出条件 |
|----|------|----------|----------|
| Backlog | 待排期需求 | PM 创建 Issue | 排入 Sprint |
| Todo | 本 Sprint 待开发 | 排入 Sprint | 开始开发 |
| In Progress | 开发中 | Claude Code 开始编码 | 提交 PR |
| Review | 待 Review | PR 已提交 | Tech Lead 审核通过 |
| Done | 已完成 | 合并到 main | - |

## PM Agent 职责

1. 从 Backlog 选取高优先级任务移入 Todo
2. 监控 In Progress 任务，识别阻塞项
3. Review 列的任务等待 Tech Lead 审核
4. 已合并的 PR 自动移入 Done

## 任务粒度

- 每个 Task 应在 1-2 个开发日内完成
- 超过 2 天的 Task 需要拆分为更小的子任务
- 每个 Task 必须有明确的 Acceptance Criteria
