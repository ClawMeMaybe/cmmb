# 代码规范

## TypeScript

- 严格模式 (`strict: true`)
- 禁止使用 `any`，使用 `unknown` 代替
- 所有函数参数和返回值必须有类型
- 使用 interface 定义对象类型，type 定义联合类型

## React

- 函数式组件 + Hooks
- 使用 `export default` 导出组件
- 组件名使用 PascalCase
- Props 使用 interface 定义，命名为 `ComponentNameProps`

## 样式

- 使用 Tailwind CSS 工具类
- 避免内联样式

## API 设计

- RESTful 风格
- 使用标准 HTTP 状态码
- 统一错误响应格式: `{ error: { code: string, message: string } }`
- 统一成功响应格式: `{ data: T }`

## 命名规范

- 文件: kebab-case (`user-list.tsx`)
- 组件: PascalCase (`UserList`)
- 函数/变量: camelCase (`getUserList`)
- 常量: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- 类型/接口: PascalCase (`UserInstance`)

## Git 规范

- Conventional Commits: `type(scope): description`
- type: feat, fix, docs, style, refactor, test, chore
- 每个 PR 对应一个 Issue

## 测试规范

- 测试文件名: `*.test.ts` 或 `*.spec.ts`
- 单元测试覆盖率目标: > 80%
