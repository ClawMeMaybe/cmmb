# 数据库规范

## v1.0 (2026-03-31) - 初始规范

- 所有数据库操作通过 Prisma
- N+1 查询优化：使用 include 或 select
- 软删除字段：`deletedAt DateTime?`
<!-- source: initial -->

---

_此文件由子代理追加更新，主 Agent 整合去重。_
