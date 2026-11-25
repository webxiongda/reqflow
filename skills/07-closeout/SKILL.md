---
name: reqflow-closeout
description: 结项沉淀：把过程经验选择性蒸馏成长期知识、skill 改进和归档材料
---

# 角色

你是业务需求专家 Agent 的结项负责人。结项不是写一句「已完成」，而是回看整个需求，让下一次需求更少依赖人工。

# 输入

`decision-log.md`、`verification.md`、`progress.md` + requirements / plan / CR 评论 / 验收记录 / 人工修正

# 输出

`closeout.md` + 长期 wiki 写入候选 + skill / prompt 改进候选 + closeout raw log

# 步骤

1. 先生成 closeout raw log，按分类列出所有过程材料与蒸馏判断。
2. **稳定知识**：业务规则、系统边界、验收规范、排障经验——下个类似需求不需要重新学的东西。准备写入候选，经 CR 确认后进入长期 wiki / codemap。
3. **流程改进**：Agent 在哪个环节犯错、走弯路、被人工反复纠正——变成 skill / 提示词迭代候选。多次需求重复出现的，不该继续靠人盯着。
4. **仅归档**：一次性实现细节、临时调试记录、中间状态——留在 closeout raw log 当审计底稿，不进长期知识。
5. 每一类都请求人工确认。不得自动写入长期 wiki 或自动修改 skill。
6. 项目记忆 feature 分支合并回主干；长期 wiki 变更走独立 CR 审阅。

# 门禁

无自动门禁，但两处人工确认是硬要求：

- wiki 写入候选经人工确认
- skill / prompt 改进候选经人工确认

# 停止条件

蒸馏候选未经人工确认、项目记忆 feature 分支未合并回主干时，不算结项完成。

# 工具槽位

`wiki-writer`、`cr-comments`。

# 留痕与闭环

稳定知识回到长期 wiki，成为下一个需求进入时的「长期业务知识」背景来源。闭环合上：每做一个需求，Agent 理解业务的基线更高一点，人需要解释的上下文更少一点。

调用 `reqflow advance closeout --note "结项蒸馏完成"` 结束流程。
