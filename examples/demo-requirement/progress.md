# 实现进度：积分过期提醒

> 示例 · 阶段 3 · G3 内部质量门记录

## 1. 阶段时间线

| 时间 | 事件 | commit / 链接 |
|---|---|---|
| 示例 | 写 `ExpiryBatchRepositorySpec` | c1 |
| 示例 | 实现查询逻辑 | c2 |
| 示例 | 写 scheduler 重跑测试 | c3 |
| 示例 | 实现提醒分支与幂等键 | c4 |
| 示例 | self review 修复时区处理 | c5 |

## 2. TDD 记录

| # | 验收标准（来自 plan） | 测试文件 | 先写测试? | 实现 commit |
|---|---|---|---|---|
| 1 | 距到期 7 天发送 | `ExpiryBatchRepositorySpec` | 是 | c2 |
| 2 | 重跑不重复 | `ExpirySchedulerSpec` | 是 | c4 |
| 3 | 6 天不发 | `ExpiryBatchRepositorySpec` | 是 | c2 |
| 4 | 幂等键稳定 | `ReminderIdempotencyKeySpec` | 是 | c4 |

## 3. diff-to-test 映射

| 生产文件变更 | 对应测试锚点 | 覆盖的行为 |
|---|---|---|
| `repository/ExpiryBatchRepository` | `ExpiryBatchRepositorySpec` | 提前天数边界、业务时区 |
| `scheduler/ExpiryScheduler` | `ExpirySchedulerSpec` | 提醒分支、重跑 |
| `service/ReminderIdempotencyKey` | `ReminderIdempotencyKeySpec` | 幂等键稳定性 |

## 4. 门禁结果

| 检查 | 命令 | 结果 | 时间 |
|---|---|---|---|
| diff-to-test | hook 自动 | 通过 | 示例 |
| lint / PMD | `mvn pmd:check` | 通过 | 示例 |
| unit test | `mvn test` | 通过 | 示例 |
| self review | 结构化 review | 通过 | 示例 |

## 5. Self Review 记录

| # | 问题 | 严重度 | 处理 | 状态 |
|---|---|---|---|---|
| 1 | 日期计算用了系统默认时区 | 高 | 改为业务时区常量并补边界测试 | 已修 |
| 2 | 幂等键未包含批次号 | 中 | 加入批次号 | 已修 |
