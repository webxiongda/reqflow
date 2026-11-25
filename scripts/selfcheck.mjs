#!/usr/bin/env node
// 端到端自检：规范校验 + CLI 冒烟 + 质量门正反例
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'bin', 'reqflow.mjs');
const HOOK = path.join(ROOT, 'hooks', 'pre-push');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reqflow-selfcheck-'));

let passed = 0;
function check(cond, message) {
  if (!cond) {
    console.error(`✗ ${message}`);
    process.exitCode = 1;
    throw new Error(message);
  }
  console.log(`✓ ${message}`);
  passed++;
}
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', cwd: ROOT, ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} 失败：\n${r.stdout || ''}${r.stderr || ''}`);
  }
  return r;
}

try {
  // 1. 规范校验
  const v = run('node', [CLI, 'validate']);
  check(/校验通过/.test(v.stdout), 'workflow.json 校验通过');

  // 2. 坏规范必须被拒
  const bad = path.join(tmp, 'bad-workflow.json');
  const wf = JSON.parse(fs.readFileSync(path.join(ROOT, 'workflow', 'workflow.json'), 'utf8'));
  wf.stages[1].gate = 'not-a-real-gate';
  fs.writeFileSync(bad, JSON.stringify(wf));
  const badRun = run('node', [CLI, 'validate', '--workflow', bad], { allowFail: true });
  check(badRun.status !== 0 && /引用不存在的门禁/.test(badRun.stderr), '坏规范（无效门禁引用）被校验器拒绝');

  // 3. init 生成工作区
  const work = path.join(tmp, 'workspace');
  fs.mkdirSync(work);
  const init = run('node', [CLI, 'init', 'demo', '--dir', work]);
  check(init.status === 0, 'reqflow init 成功');
  const target = path.join(work, 'demo');
  const required = ['README.md', 'context-snapshot.md', 'requirements.md', 'plan.md', 'progress.md', 'decision-log.md', 'verification.md', 'closeout.md', '.reqflow.json'];
  check(required.every((f) => fs.existsSync(path.join(target, f))), 'init 生成全部产物模板与状态文件');
  const req = fs.readFileSync(path.join(target, 'requirements.md'), 'utf8');
  check(req.includes('demo') && !req.includes('${REQUIREMENT}'), '模板占位符已替换');

  // 4. status / advance / gate 留痕
  const st = run('node', [CLI, 'status', '--dir', target]);
  check(/需求进入/.test(st.stdout), 'reqflow status 显示当前阶段');
  run('node', [CLI, 'advance', 'clarify', '--note', '开始澄清', '--dir', target]);
  run('node', [CLI, 'gate', 'requirements-confirmation', '--approve', '--by', 'tester', '--evidence', 'CR#1', '--dir', target]);
  const state = JSON.parse(fs.readFileSync(path.join(target, '.reqflow.json'), 'utf8'));
  check(state.currentStage === 'clarify' && state.gates['requirements-confirmation'].status === 'passed', 'advance 与 gate 正确写入状态');
  const log = fs.readFileSync(path.join(target, 'decision-log.md'), 'utf8');
  check(log.includes('开始澄清') && log.includes('approve by tester'), '决策与确认写入 decision-log.md 留痕');

  // 5. 质量门反例：只改生产代码、无测试 → 拒绝
  const repo = path.join(tmp, 'repo');
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  run('git', ['init', '-q', '-b', 'main'], { cwd: repo });
  run('git', ['config', 'user.email', 'selfcheck@example.com'], { cwd: repo });
  run('git', ['config', 'user.name', 'selfcheck'], { cwd: repo });
  fs.writeFileSync(path.join(repo, 'README.md'), 'init\n');
  run('git', ['add', '-A'], { cwd: repo });
  run('git', ['commit', '-q', '-m', 'init'], { cwd: repo });
  const baseHash = run('git', ['rev-parse', 'HEAD'], { cwd: repo }).stdout.trim();

  const qstate = {
    gates: {},
    quality: {
      enabled: true,
      base: baseHash,
      sourceGlobs: ['src/**/*.{ts,tsx,js,jsx,java}'],
      testGlobs: ['**/*.{test,spec}.{ts,tsx,js,jsx}', '**/__tests__/**', 'src/test/**'],
      commands: {},
    },
  };
  fs.writeFileSync(path.join(repo, '.reqflow.json'), JSON.stringify(qstate, null, 2));

  fs.writeFileSync(path.join(repo, 'src', 'foo.ts'), 'export const foo = 1;\n');
  run('git', ['add', '-A'], { cwd: repo });
  run('git', ['commit', '-q', '-m', 'feat: foo'], { cwd: repo });
  const neg = run(HOOK, [], { cwd: repo, allowFail: true });
  check(neg.status !== 0 && /diff-to-test 失败/.test(neg.stderr), '质量门反例：无测试锚点的生产代码变更被拒绝');

  // 6. 质量门正例：补上测试 → 通过并记录
  fs.writeFileSync(path.join(repo, 'src', 'foo.test.ts'), "import { foo } from './foo';\nif (foo !== 1) throw new Error('bad');\n");
  run('git', ['add', '-A'], { cwd: repo });
  run('git', ['commit', '-q', '-m', 'test: foo'], { cwd: repo });
  const pos = run(HOOK, [], { cwd: repo, allowFail: true });
  check(pos.status === 0 && /G3 内部质量门通过/.test(pos.stdout), '质量门正例：diff-to-test 映射通过后放行');
  const after = JSON.parse(fs.readFileSync(path.join(repo, '.reqflow.json'), 'utf8'));
  check(after.gates['internal-quality']?.status === 'passed', '门禁通过状态写回 .reqflow.json');

  // 7. 命令失败必须拒绝 push
  after.quality.commands = { test: 'node -e "process.exit(1)"' };
  fs.writeFileSync(path.join(repo, '.reqflow.json'), JSON.stringify(after, null, 2));
  const fail = run(HOOK, [], { cwd: repo, allowFail: true });
  check(fail.status !== 0 && /test 失败/.test(fail.stderr), '质量门：配置的 test 命令失败时拒绝 push');
} catch (e) {
  console.error(`\n自检失败：${e.message}`);
  process.exit(1);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
