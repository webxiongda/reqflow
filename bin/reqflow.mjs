#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};
const ok = (m) => console.log(`${C.green}✓${C.reset} ${m}`);
const err = (m) => console.error(`${C.red}✗${C.reset} ${m}`);
const warn = (m) => console.log(`${C.yellow}!${C.reset} ${m}`);
const die = (m, code = 1) => { err(m); process.exit(code); };

function parseArgs(args) {
  const opts = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) { opts[key] = next; i++; }
      else opts[key] = true;
    } else opts._.push(a);
  }
  return opts;
}

function workflowPath(explicit) {
  const candidates = [
    explicit,
    process.env.REQFLOW_WORKFLOW,
    path.join(process.cwd(), 'workflow', 'workflow.json'),
    path.join(ROOT, 'workflow', 'workflow.json'),
  ].filter(Boolean);
  for (const c of candidates) {
    const p = path.resolve(c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function loadWorkflow(explicit) {
  const file = workflowPath(explicit);
  if (!file) die('找不到 workflow.json；用 --workflow <path> 或 REQFLOW_WORKFLOW 指定');
  try {
    return { data: JSON.parse(fs.readFileSync(file, 'utf8')), file };
  } catch (e) {
    die(`workflow.json 解析失败：${e.message}`);
  }
}

function validateWorkflow(wf) {
  const problems = [];
  const need = (cond, msg) => { if (!cond) problems.push(msg); };
  const uniq = (set, id, label) => {
    if (set.has(id)) problems.push(`${label} id 重复：${id}`);
    set.add(id);
  };

  for (const key of ['name', 'version', 'description', 'principles', 'layers', 'repositories', 'gates', 'stages', 'artifacts']) {
    need(wf[key] !== undefined, `缺少顶层字段：${key}`);
  }
  if (problems.length) return problems;

  const layerIds = new Set();
  wf.layers.forEach((l, i) => {
    need(typeof l.id === 'string' && l.id.length > 0, `layers[${i}].id 无效`);
    need(!!l.name && !!l.question && Array.isArray(l.capabilities) && l.capabilities.length > 0, `layers[${i}] 信息不完整`);
    uniq(layerIds, l.id, 'layers');
  });

  const stageIds = new Set();
  wf.stages.forEach((s, i) => {
    need(typeof s.id === 'string' && s.id.length > 0, `stages[${i}].id 无效`);
    need(!!s.name && Number.isInteger(s.index), `stages[${i}] 缺少 name 或 index`);
    need(layerIds.has(s.layer), `stages[${i}].layer 引用不存在的层：${s.layer}`);
    need(typeof s.autonomous === 'boolean', `stages[${i}].autonomous 必须是布尔值`);
    need(Array.isArray(s.inputs) && Array.isArray(s.outputs) && Array.isArray(s.tools) && Array.isArray(s.stopWhen),
      `stages[${i}] 的 inputs / outputs / tools / stopWhen 必须是数组`);
    need(!!s.skill && fs.existsSync(path.join(ROOT, s.skill)), `stages[${i}].skill 文件不存在：${s.skill}`);
    uniq(stageIds, s.id, 'stages');
  });
  const indices = wf.stages.map((s) => s.index).sort((a, b) => a - b);
  need(indices.every((v, i) => v === i), 'stages.index 必须从 0 开始连续递增');

  const gateIds = new Set();
  wf.gates.forEach((g, i) => {
    need(typeof g.id === 'string' && g.id.length > 0, `gates[${i}].id 无效`);
    need(['quality', 'approval'].includes(g.type), `gates[${i}].type 必须是 quality 或 approval`);
    need(stageIds.has(g.stage), `gates[${i}].stage 引用不存在的阶段：${g.stage}`);
    need(typeof g.requiresHuman === 'boolean', `gates[${i}].requiresHuman 必须是布尔值`);
    need(!!g.name && !!g.onFail, `gates[${i}] 缺少 name 或 onFail`);
    uniq(gateIds, g.id, 'gates');
  });
  wf.stages.forEach((s, i) => {
    if (s.gate) need(gateIds.has(s.gate), `stages[${i}].gate 引用不存在的门禁：${s.gate}`);
  });

  for (const [name, a] of Object.entries(wf.artifacts)) {
    need(stageIds.has(a.stage), `artifacts.${name}.stage 引用不存在的阶段：${a.stage}`);
    need(['code', 'project-memory', 'long-term-wiki'].includes(a.repo), `artifacts.${name}.repo 无效`);
    need(!!a.template && fs.existsSync(path.join(ROOT, a.template)), `artifacts.${name}.template 文件不存在：${a.template}`);
  }
  wf.stages.forEach((s, i) => {
    s.outputs.forEach((out) => need(!!wf.artifacts[out], `stages[${i}] 产出 ${out} 未在 artifacts 中定义`));
  });
  return problems;
}

function cmdValidate(opts) {
  const { data: wf, file } = loadWorkflow(opts.workflow);
  const problems = validateWorkflow(wf);
  if (problems.length) {
    err(`workflow 校验失败（${file}）：`);
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
  const gates = wf.gates.length;
  const quality = wf.gates.filter((g) => g.type === 'quality').length;
  ok(`workflow 校验通过：${wf.layers.length} 层 / ${wf.stages.length} 阶段 / ${gates} 门禁（${quality} 质量门） / ${Object.keys(wf.artifacts).length} 产物`);
}

function loadState(dir) {
  const file = path.join(dir, '.reqflow.json');
  if (!fs.existsSync(file)) die(`未找到 ${file}，请先在该目录运行 reqflow init`);
  try { return { data: JSON.parse(fs.readFileSync(file, 'utf8')), file }; }
  catch (e) { die(`.reqflow.json 解析失败：${e.message}`); }
}

function saveState(file, state) {
  fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
}

function appendDecisionLog(dir, decision) {
  const file = path.join(dir, 'decision-log.md');
  if (!fs.existsSync(file)) return;
  const note = String(decision.note || '').replace(/\|/g, '\\|');
  const line = `| ${decision.at.slice(0, 10)} | CLI | ${decision.type}: ${decision.from || '-'} → ${decision.to || '-'} | ${note} | | |\n`;
  fs.appendFileSync(file, line);
}

function gitInfo(start) {
  try {
    const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: start, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const gitDir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: start, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return { top, gitDir };
  } catch { return null; }
}

function installHooks(dir) {
  const info = gitInfo(dir);
  if (!info) die(`目录不在 git 仓库中，无法安装 hook：${dir}`);
  const dest = path.join(info.gitDir, 'hooks', 'pre-push');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'hooks', 'pre-push'), dest);
  fs.chmodSync(dest, 0o755);
  ok(`已安装 pre-push hook：${dest}`);
}

function cmdInit(opts) {
  const name = opts._[0];
  if (!name) die('用法：reqflow init <name> [--dir <path>] [--hooks]');
  const base = path.resolve(opts.dir || process.cwd());
  const target = path.join(base, name);
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) die(`目标目录非空：${target}`);

  const { data: wf } = loadWorkflow(opts.workflow);
  const now = new Date().toISOString();
  const vars = {
    REQUIREMENT: name,
    DATE: now.slice(0, 10),
    WORKFLOW_VERSION: `${wf.name}/${wf.version}`,
  };
  const fill = (text) => text.replace(/\$\{(REQUIREMENT|DATE|WORKFLOW_VERSION)\}/g, (m, k) => vars[k] ?? m);

  fs.mkdirSync(target, { recursive: true });
  for (const [file, meta] of Object.entries(wf.artifacts)) {
    const src = path.join(ROOT, meta.template);
    fs.writeFileSync(path.join(target, file), fill(fs.readFileSync(src, 'utf8')));
  }
  fs.writeFileSync(path.join(target, 'README.md'), fill(fs.readFileSync(path.join(ROOT, 'templates', 'README.md'), 'utf8')));

  const gates = {};
  wf.gates.forEach((g) => { gates[g.id] = { status: 'pending', approver: null, evidence: null, at: null }; });
  const stages = {};
  wf.stages.forEach((s, i) => {
    stages[s.id] = { status: i === 0 ? 'in_progress' : 'pending', at: i === 0 ? now : null };
  });
  const state = {
    workflow: `${wf.name}/${wf.version}`,
    requirement: name,
    createdAt: now,
    currentStage: wf.stages[0]?.id ?? null,
    stages,
    gates,
    decisions: [],
    quality: {
      enabled: true,
      base: 'HEAD~1',
      sourceGlobs: ['src/**/*.{ts,tsx,js,jsx,java}'],
      testGlobs: ['**/*.{test,spec}.{ts,tsx,js,jsx}', '**/__tests__/**', 'src/test/**'],
      commands: { lint: '', test: '' },
    },
  };
  saveState(path.join(target, '.reqflow.json'), state);
  ok(`已生成需求工作区：${target}`);
  console.log(`  阶段：${wf.stages.length} · 门禁：${wf.gates.length} · 产物：${Object.keys(wf.artifacts).length}`);
  console.log(`  下一步：cd ${target} && reqflow status`);
  if (opts.hooks) installHooks(target);
}

function cmdStatus(opts) {
  const dir = path.resolve(opts.dir || process.cwd());
  const { data: state } = loadState(dir);
  const { data: wf } = loadWorkflow(opts.workflow);
  const stage = wf.stages.find((s) => s.id === state.currentStage);

  console.log(`${C.bold}${state.requirement}${C.reset} · ${state.workflow}`);
  console.log(`当前阶段：${stage ? stage.name : state.currentStage} (${state.currentStage})`);

  console.log(`\n${C.cyan}阶段${C.reset}`);
  wf.stages.forEach((s) => {
    const st = state.stages[s.id]?.status ?? 'pending';
    const mark = st === 'done' ? `${C.green}✓` : st === 'in_progress' ? `${C.yellow}→` : `${C.gray}·`;
    console.log(`  ${mark}${C.reset} ${s.index}. ${s.name} [${st}]`);
  });

  console.log(`\n${C.cyan}门禁${C.reset}`);
  wf.gates.forEach((g) => {
    const rec = state.gates[g.id] ?? {};
    const st = rec.status ?? 'pending';
    const mark = st === 'passed' ? `${C.green}✓` : st === 'failed' ? `${C.red}✗` : `${C.gray}·`;
    const by = rec.approver ? ` by ${rec.approver}` : '';
    console.log(`  ${mark}${C.reset} ${g.name} [${st}]${by}`);
  });

  const pending = wf.gates.filter((g) => (state.gates[g.id]?.status ?? 'pending') !== 'passed');
  if (pending.length) console.log(`\n待过门禁：${pending.map((g) => g.name).join('、')}`);
}

function cmdList(opts) {
  const { data: wf } = loadWorkflow(opts.workflow);
  if (opts.json) {
    console.log(JSON.stringify({ layers: wf.layers, stages: wf.stages, gates: wf.gates }, null, 2));
    return;
  }
  console.log(`${C.cyan}四层架构${C.reset}`);
  wf.layers.forEach((l) => console.log(`  ${l.id}: ${l.name} — ${l.question}`));
  console.log(`\n${C.cyan}八个阶段${C.reset}`);
  wf.stages.forEach((s) => console.log(`  ${s.index}. ${s.id} — ${s.name} [${s.layer}]${s.gate ? ` → ${s.gate}` : ''}`));
  console.log(`\n${C.cyan}门禁${C.reset}`);
  wf.gates.forEach((g) => console.log(`  ${g.id}: ${g.name} [${g.type}${g.requiresHuman ? ', 人确认' : ', 自动'}]`));
}

function cmdAdvance(opts) {
  const stageId = opts._[0];
  if (!stageId) die('用法：reqflow advance <stage-id> [--note <text>] [--dir <path>]');
  const dir = path.resolve(opts.dir || process.cwd());
  const { data: state, file } = loadState(dir);
  const { data: wf } = loadWorkflow(opts.workflow);
  const target = wf.stages.find((s) => s.id === stageId);
  if (!target) die(`未知阶段：${stageId}`);
  const cur = wf.stages.find((s) => s.id === state.currentStage);
  if (cur && target.index > cur.index + 1) warn(`跳过了 ${target.index - cur.index - 1} 个阶段`);

  const at = new Date().toISOString();
  if (cur) state.stages[cur.id] = { ...state.stages[cur.id], status: 'done', at };
  state.currentStage = stageId;
  state.stages[stageId] = { ...(state.stages[stageId] || {}), status: 'in_progress', at };
  const decision = { at, type: 'advance', from: cur?.id ?? null, to: stageId, note: typeof opts.note === 'string' ? opts.note : '' };
  state.decisions.push(decision);
  saveState(file, state);
  appendDecisionLog(dir, decision);
  ok(`已推进到「${target.name}」`);
}

function cmdGate(opts) {
  const gateId = opts._[0];
  if (!gateId) die('用法：reqflow gate <gate-id> --approve [--by <name>] [--evidence <link>]');
  if (opts.approve !== true) die('需要 --approve 才记录门禁通过');
  const dir = path.resolve(opts.dir || process.cwd());
  const { data: state, file } = loadState(dir);
  const { data: wf } = loadWorkflow(opts.workflow);
  const gate = wf.gates.find((g) => g.id === gateId);
  if (!gate) die(`未知门禁：${gateId}`);

  const at = new Date().toISOString();
  state.gates[gateId] = {
    status: 'passed',
    approver: typeof opts.by === 'string' ? opts.by : 'unknown',
    evidence: typeof opts.evidence === 'string' ? opts.evidence : '',
    at,
  };
  const decision = { at, type: 'gate', from: gateId, to: null, note: `approve by ${state.gates[gateId].approver}` };
  state.decisions.push(decision);
  saveState(file, state);
  appendDecisionLog(dir, decision);
  ok(`门禁「${gate.name}」已记录通过`);
}

const HELP = `reqflow — 端到端业务需求 Agent 工作流

用法：
  reqflow validate [--workflow <path>]             校验工作流规范
  reqflow list [--json] [--workflow <path>]        列出架构 / 阶段 / 门禁
  reqflow init <name> [--dir <path>] [--hooks]     生成需求工作区
  reqflow status [--dir <path>]                    查看当前阶段与门禁
  reqflow advance <stage-id> [--note <text>]       推进到某阶段并留痕
  reqflow gate <gate-id> --approve [--by <n>] [--evidence <link>]
                                                   记录人工确认
  reqflow hooks install [--dir <path>]             安装 git pre-push 质量门
  reqflow help                                     显示本帮助
`;

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const opts = parseArgs(rest);
  switch (cmd) {
    case 'validate': return cmdValidate(opts);
    case 'list': return cmdList(opts);
    case 'init': return cmdInit(opts);
    case 'status': return cmdStatus(opts);
    case 'advance': return cmdAdvance(opts);
    case 'gate': return cmdGate(opts);
    case 'hooks':
      if (rest[0] !== 'install') die('用法：reqflow hooks install [--dir <path>]');
      return installHooks(path.resolve(opts.dir || process.cwd()));
    case 'help':
    case undefined:
      console.log(HELP);
      return;
    default: die(`未知命令：${cmd}\n\n${HELP}`);
  }
}

main();
