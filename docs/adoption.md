# 接入指南

`reqflow` 不绑定特定平台。核心是 skill 组合编排 + 提示词设计，工具层按你的环境映射。

## 1. 让 Agent 读工作流规范

```bash
reqflow validate                 # 确认规范自洽
reqflow list                     # 看 4 层 / 8 阶段 / 4 门禁
reqflow list --json              # 机器可读，喂给 Agent
```

Agent 每轮推进前先回答两个问题：当前在哪个阶段？下一个门禁是什么？答案来自 `workflow/workflow.json`，不来自 Agent 记忆。

## 2. 初始化需求工作区

```bash
reqflow init order-status-refactor --dir ./requirements --hooks
cd ./requirements/order-status-refactor
reqflow status
```

产出模板 + `.reqflow.json` 状态文件。`--hooks` 会在当前 git 仓库安装 pre-push hook。

## 3. 注册 skill

`skills/<阶段>/SKILL.md` 是框架无关的 Markdown。按你的 Agent 框架加载：

| 框架 | 做法 |
|---|---|
| Claude Code | 把对应文件放进 `.claude/skills/` 或作为 project instructions |
| Cursor | 放进 `.cursor/rules/`，按阶段引用 |
| OMP / Magpie | 放进 Library skills 目录，用 `magpie library skill agents` 分配 |
| 自研 Agent | 作为 system prompt 片段按阶段注入 |

每个 SKILL.md 有固定结构：角色、输入、输出、步骤、门禁、停止条件、工具槽位。占位符用 `${...}`，在工作区初始化时替换。

## 4. 映射工具槽位

`stages[].tools` 是能力名，不是产品名。建一张你自己的映射表：

| 槽位 | 示例实现 | 本仓库是否依赖 |
|---|---|---|
| `requirement-platform` | Aone / Jira / Linear CLI | 否 |
| `cr-comments` | GitLab MR / GitHub PR API | 否 |
| `config-cli` | 天机星 CLI / 自研配置中心 | 否 |
| `log-query` | SLS / Loki / CloudWatch | 否 |
| `service-invoke` | HSF 泛化调用 / gRPC / HTTP | 否 |
| `metrics` | 监控 / Sunfire / Prometheus | 否 |

CLI 和 hook **不调用任何外部平台**，所以没有鉴权门槛。

## 5. 把门禁接进真实命令

编辑生成工作区的 `.reqflow.json`：

```json
{
  "quality": {
    "enabled": true,
    "base": "origin/main",
    "sourceGlobs": ["src/**/*.{ts,tsx,java}"],
    "testGlobs": ["**/*.{test,spec}.{ts,tsx}", "src/test/**"],
    "commands": { "lint": "npm run lint", "test": "npm test" }
  }
}
```

`base` 建议用 `origin/main`（或你的主干），hook 用它算 `base...HEAD` 的变更文件。

## 6. 推进与留痕

```bash
reqflow advance clarify --note "已完成第一轮澄清"
reqflow gate requirements-confirmation --approve --by zhangsan --evidence "CR #12 已确认"
reqflow advance plan
```

每次操作追加到 `.reqflow.json` 的 `decisions`，同时写入 `decision-log.md`。结项时这份日志是蒸馏判断的原料。

## 7. 结项

按 `templates/closeout.md` 生成三类清单：稳定知识 / 流程改进 / 仅归档。每一类都要人工确认才写入长期 wiki 或修改 skill。项目记忆 feature 分支合并回主干，长期 wiki 变更走独立 CR。

## 推荐的最小落地顺序

1. 先只装 `hooks/pre-push`——立即拿到 diff-to-test + lint + test 的硬卡口。
2. 再让 Agent 用 `requirements.md` / `plan.md` 模板做 G1 / G2，人只在 CR 上点头。
3. 最后接验收取证与结项蒸馏，形成闭环。

不要一次铺全。每一步都应该能独立验证：`reqflow selfcheck` 会跑完整自检。

## 常见问题

**必须联网吗？** 不需要。CLI 和 hook 只用 Node 内置模块，没有 npm 依赖。

**`npx reqflow` 找不到？** 仓库还没发布到 npm。用 `node bin/reqflow.mjs`，或 `npm link` 后直接用 `reqflow`。

**hook 会不会拦住非工作流仓库？** 不会。没有 `.reqflow.json` 直接放行。

**质量门禁能跳过吗？** 可以删 hook，但那就退回「靠提示词自觉」。需要临时豁免时把 `quality.enabled` 设为 `false`，会明确记录为豁免状态。
