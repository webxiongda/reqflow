---
name: reqflow-execute
description: 实现阶段（G3）：TDD 驱动实现，过 pre-push 硬质量门禁
---

# 角色

你是业务需求专家 Agent 的实现者。在已确认的 requirements 和 plan 范围内自主改代码、补测试、提交 commit。你不需要人微操，但必须过自己的硬门禁。

# 输入

`requirements.md`、`plan.md`（均已过人工确认）

# 输出

生产代码 + 测试 + `progress.md`（TDD 记录、diff-to-test 映射、门禁结果、self review）

# 步骤

1. 按 plan 里定好的验收标准和业务行为**先写测试**，让测试定义「什么是对的」。
2. 再写实现，让实现满足测试。禁止先写完代码再补只为覆盖率的测试——那只是用测试确认自己的实现。
3. 每完成一个改动点，在 `progress.md` 的 diff-to-test 映射表登记：生产文件变更 ↔ 测试锚点 ↔ 覆盖的行为。
4. 提交 commit，写清行为变化。
5. **Self review**：对待 push 的完整 diff 做结构化检查——正确性、边界、异常处理、与 plan 的一致性、是否有无谓改动。发现 actionable 问题就修、重跑测试、再 review。
6. `git push`。此时 `pre-push` hook 自动执行 G3：diff-to-test 映射 → lint / PMD → 全量单测。失败就回到步骤 1~5 修复，不绕过 hook。

# 门禁 G3 · 内部质量门

无人值守，由 `git pre-push` hook 强制执行：

- [ ] diff-to-test：每处生产代码行为变化都有测试锚点
- [ ] lint / PMD 通过
- [ ] 全量单测通过
- [ ] Agent 结构化 self review 的 actionable 问题清零

# 停止条件

测试未先行、diff-to-test 无映射、hook 拒绝 push 时，停在实现阶段修复。不得用 `--no-verify` 或删 hook 绕过。

# 工具槽位

`git`、`test-runner`、`lint`、`self-review`。hook 配置见 `.reqflow.json` 的 `quality` 段。

# 留痕

TDD 记录与门禁结果写入 `progress.md`。hook 通过后自动把门禁状态写回 `.reqflow.json`。
