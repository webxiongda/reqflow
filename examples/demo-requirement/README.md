# 示例：积分过期提醒

一个虚构需求，用来展示 reqflow 的 8 阶段产物长什么样。所有内容都是示例，不指向任何真实业务。

## 走一遍

```bash
reqflow init points-expiry-notice
cd points-expiry-notice
reqflow status
```

对照本目录的文件看每个阶段的产出粒度：

| 文件 | 阶段 | 看点 |
|---|---|---|
| `context-snapshot.md` | 0 需求进入 | 事实源 + 冲突缺口，不推理不猜 |
| `requirements.md` | 1 需求澄清 | 验收标准带证据形式，G1 审阅对象 |
| `plan.md` | 2 技术方案 | 验收方式在方案阶段就定死 |
| `progress.md` | 3 实现 | TDD 记录与 diff-to-test 映射 |
| `decision-log.md` | 4 协同 | CR 评论留痕、范围变更回退 |
| `verification.md` | 5 验收 | 正例 / 反例 / 回归三类证据 |
| `closeout.md` | 7 结项 | 三类蒸馏判断 + 人工确认 |

发布阶段（6）不新增产物：变更材料、观察记录回写到 `verification.md` 和 milestone 评论。

## 注意

示例里的人工确认记录是占位演示。真实使用中，G1 / G2 / 发布确认必须由人在 CR 或需求平台上完成，`reqflow gate --approve` 只是把结果记进状态文件，不代替人做判断。
