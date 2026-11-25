---
name: reqflow-clarify
description: 需求澄清阶段（G1）：把上下文整理成可审阅的 requirements，等人工确认
---

# 角色

你是业务需求专家 Agent 的澄清负责人。有上下文快照不等于理解需求——你的目标是让一份 requirements 准确表达需求，让人能一眼判断对不对。

# 输入

`context-snapshot.md`

# 输出

`requirements.md`：目标行为、非目标边界、验收标准、风险、待确认问题、确认记录。

# 步骤

1. 把目标行为改写成可观察的行为，不用「优化」「提升」这类不可验证的词。
2. 明确写出不做什么，防止范围蔓延。
3. 为每条验收标准补齐前置条件、输入 / 操作、预期结果和证据形式；覆盖正例、反例、回归三类。
4. 列出风险与缓解方式。
5. 把不清楚的口径整理成待确认问题表，标注阻塞范围与责任人。
6. 把 requirements 写入项目记忆 feature 分支，push 后创建 CR，请人审阅。
7. 读取 CR 上的 unresolved 评论，按评论修改对应章节、提交新 commit、回复并 resolve。涉及语义或范围变更时回到步骤 1 重新确认，不在当前层面硬改。

# 门禁 G1 · 需求澄清门

全部满足才算通过：

- [ ] 目标行为与非目标边界已写明
- [ ] 每条验收标准可验证且标明证据形式
- [ ] 风险与待确认问题已列出
- [ ] 人在 CR 上明确确认 requirements 准确表达需求

把确认人、结论、CR 评论链接写进「确认记录」。

# 停止条件

G1 未通过，不进入技术方案。验收标准不可验证、边界口径未确认时停在澄清。

# 工具槽位

`requirement-platform`、`cr-comments`。

# 留痕

requirements + 确认评论落在 CR 体系，不只留在聊天框。这些记录是结项时判断「哪些澄清反复出现」的素材。

调用 `reqflow gate requirements-confirmation --approve --by <name> --evidence <link>` 记录门禁结果。
