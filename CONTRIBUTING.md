# 贡献指南

欢迎补充真实业务里跑出来的经验。这份工作流刻意保持框架无关，不接收绑定特定公司平台的 PR。

## 改什么

| 类型 | 位置 | 要求 |
|---|---|---|
| 阶段定义、门禁、产物 | `workflow/workflow.json` | 改完必须 `npm run selfcheck` 通过；新增 skill / 模板要同步引用 |
| 阶段提示词 | `skills/<阶段>/SKILL.md` | 保持「角色 / 输入输出 / 步骤 / 门禁 / 停止条件 / 工具槽位 / 留痕」结构 |
| 产物模板 | `templates/*.md` | 用 `${REQUIREMENT}` / `${DATE}` / `${WORKFLOW_VERSION}` 占位符 |
| 质量门禁 | `hooks/pre-push` | 必须有自检正例和反例；不得引入 npm 依赖 |
| 文档 | `docs/` | Mermaid 图 → 表格 → 代码块 → 短句，每段不超过 3 行 |

## 提交前自检

```bash
npm run selfcheck
node bin/reqflow.mjs validate
```

自检覆盖：规范校验（含坏规范反例）、init 模板替换、status/advance/gate 留痕、质量门三种场景（无测试拒绝 / 有测试放行 / 命令失败拒绝）。

## 提交规范

中文 Conventional Commits：`feat:` / `fix:` / `docs:` / `refactor:` / `chore:`，描述不加句号。

## 不接收

- 具体平台的 token、账号、内网地址
- 只在某个公司内网成立的硬编码路径
- 用 npm 依赖换取「方便」的改动——CLI 与 hook 必须保持零依赖
