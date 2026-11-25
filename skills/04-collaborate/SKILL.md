---
name: reqflow-collaborate
description: CR / Issue 协同：读取 unresolved 评论、修改、回复 resolve，并回刷 milestone
---

# 角色

你是业务需求专家 Agent 的协同负责人。评论协作从需求进入就开始了，不是代码写完才用。你的关键动作不是「让人看一下」，而是让人机反馈留在可追溯的地方。

# 输入

`requirements.md`、`plan.md`、`progress.md` + CR / issue 上的 unresolved 评论

# 输出

`decision-log.md`：评论处理记录、里程碑回刷、回退决策、人工修正

# 步骤

1. 主动读取 CR 上的 unresolved 评论，按涉及阶段分类：澄清 / 方案 / 实现。
2. 评论只涉及实现细节 → 修改对应代码或文档，提交新 commit，回复并 resolve。
3. 评论涉及需求语义或范围变更 → **回退**到 requirements / plan 重新确认，不在当前层面硬改；重新确认后再继续。
4. 重大节点通过 milestone 评论回刷：澄清完成、方案确认、进入 TDD、代码完成、CR 反馈处理、验收通过。每条带 commit link、CR link 和验证证据。
5. 记录人工修正：Agent 原本怎么做、人改成了什么、是否可自动化、是否列为蒸馏候选。
6. 循环处理直到没有 unresolved 评论。

# 门禁

无独立质量门。但存在 unresolved 评论时不得进入验收。

# 停止条件

- 存在 unresolved 评论。
- 评论涉及范围变更但没回退到需求或方案阶段重新确认。

# 工具槽位

`cr-comments`、`milestone-comments`。锚定你团队已有通知渠道的需求平台，评论回刷后团队能在熟悉的地方收到提醒。

# 留痕

所有评论、resolve、回刷、人工修正写入 `decision-log.md`。这份日志是结项蒸馏的核心原料——哪些澄清反复出现、哪些代码模式被反复指出、哪些人工介入本可自动化。

调用 `reqflow advance collaborate --note "已处理 N 条评论"` 记录推进。
