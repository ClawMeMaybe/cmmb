# PR Review 流程

## 流程

```
开发完成 -> 提交 PR -> CI 自动检查 -> Tech Lead Review -> 通过 -> 合并 -> 部署
                                          |
                                      不通过 -> 修改 -> 重新提交
```

## CI 自动检查（必须全部通过）

- [ ] ESLint 无错误
- [ ] Prettier 格式正确
- [ ] TypeScript 类型检查通过
- [ ] 单元测试通过
- [ ] E2E 测试通过
- [ ] 测试覆盖率达标（> 80%）

## Tech Lead Review 检查项

- [ ] 代码逻辑正确
- [ ] 遵循项目代码规范
- [ ] 无安全隐患
- [ ] 无性能问题
- [ ] 有适当的测试覆盖
- [ ] 错误处理完善
- [ ] 代码可读性好

## PR 描述要求

```markdown
## 变更内容
- 简要描述本次变更做了什么

## 相关 Issue
- Closes #123

## 测试方法
- 如何验证本次变更

## 截图（如适用）
- UI 变更需要提供截图
```

## 合并策略

- 使用 Squash and Merge
- Commit message 遵循 Conventional Commits
