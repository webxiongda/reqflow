# 需求工作区：${REQUIREMENT}

初始化时间：${DATE} · 工作流版本：${WORKFLOW_VERSION}

## 当前阶段

`intake`（需求进入）。先产出 `context-snapshot.md`，不要跳到澄清或方案。

## 文件说明

| 文件 | 阶段 | 用途 |
|---|---|---|
| `context-snapshot.md` | 0 需求进入 | 当前需求材料 + 长期业务知识的事实快照 |
| `requirements.md` | 1 需求澄清 | G1 的审阅对象 |
| `plan.md` | 2 技术方案 | G2 的审阅对象，含验收方式 |
| `progress.md` | 3 实现 | TDD 记录、diff-to-test 映射、门禁结果 |
| `decision-log.md` | 4 CR 协同 | 人机反馈与决策留痕 |
| `verification.md` | 5 验收 | 真实环境证据 |
| `closeout.md` | 7 结项 | 蒸馏清单 |
| `.reqflow.json` | 全程 | 状态与门禁记录，CLI 读写 |

## 常用命令

```bash
reqflow status
reqflow advance clarify --note "开始澄清"
reqflow gate requirements-confirmation --approve --by <name> --evidence <link>
reqflow list
```

## 硬规则

- G1 未通过不进入方案；G2 未通过不进入实现。
- 测试先于实现；每处生产代码变化都要有测试锚点。
- 反馈落到 CR 评论，不只留在聊天框。
- 结项蒸馏必须人工确认后才写入长期 wiki。
