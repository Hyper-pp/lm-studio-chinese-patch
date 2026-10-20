#!/usr/bin/env node
/**
 * LM Studio 简体中文补充汉化补丁 · 附加件
 * ============================================
 * 适用：LM Studio 0.4.25 (Windows x64)
 *
 * 覆盖 apply-patch.js 够不到的两处文本层：
 *   ① 主进程 main/index.js（混淆代码，单引号 + \x20 转义）——
 *     模型参数 schema 的 displayName/subtitle 由主进程定义并经内部 API 提供给
 *     渲染层，"Enable Thinking" 开关文案就在这里，渲染层字典打不到。
 *   ② 内置插件包 .webpack/bundled-plugins/*.tar.gz 内的 .lmstudio/production.js——
 *     插件设置面板（如 rag-v1 的检索选项）文案在压缩包里，需解压→改→重打包。
 *     LM Studio 运行时直读 tar.gz（~/.lmstudio 下无解压目录），所以必须改包本身。
 *
 * 安全闸门：
 *   1. 基线固定：始终从原版备份重算，幂等，绝不在旧补丁上叠加
 *   2. 主进程写回后 node --check 语法校验，失败自动回滚
 *   3. 插件包重打包后重新解压校验（新文案在、旧文案消失），失败保留原包不动
 *   4. 已汉化则跳过（重复运行安全）
 *
 * 用法：
 *   node patch-extra.js                 # 应用（自动检测安装目录）
 *   node patch-extra.js --path "目录"    # 手动指定 LM Studio 安装目录
 *   node patch-extra.js --dry-run       # 预览命中数，不写任何文件
 *   node patch-extra.js --restore       # 恢复英文原版（主进程 + 插件包）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

// ---------- CLI ----------
const args = process.argv.slice(2);
const has = f => args.includes(f);
const argOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const DRY = has('--dry-run'), RESTORE = has('--restore'), INFO = has('--info');
const HERE = __dirname;

// ---------- 安装目录自动检测 ----------
function detectInstall() {
  const custom = argOf('--path');
  const candidates = custom ? [custom] : [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'LM Studio'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'LM-Studio'),
    'C:\\Program Files\\LM Studio',
    'D:\\Program Files\\LM Studio',
    '/Applications/LM Studio.app/Contents/Resources',
    path.join(os.homedir(), 'Applications', 'LM Studio.app', 'Contents', 'Resources'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(path.join(p, 'resources', 'app', '.webpack', 'renderer', 'main_window.js'))) return p;
  }
  return null;
}

const LM_DIR = detectInstall();
if (!LM_DIR) {
  console.error('未找到 LM Studio 安装目录。');
  console.error('请用 --path 参数指定，例如: node patch-extra.js --path "D:\\Program Files\\LM Studio"');
  process.exit(1);
}
const PKG = path.join(LM_DIR, 'resources', 'app', 'package.json');
const version = JSON.parse(fs.readFileSync(PKG, 'utf8')).version;
const BACKUP_DIR = path.join(os.homedir(), '.lmstudio-chinese-patch', 'backups');
const MAIN_JS = path.join(LM_DIR, 'resources', 'app', '.webpack', 'main', 'index.js');
const PLUGIN_DIR = path.join(LM_DIR, 'resources', 'app', '.webpack', 'bundled-plugins');

console.log(`LM Studio: ${version}`);
console.log(`安装目录:  ${LM_DIR}`);
if (INFO) process.exit(0);
if (!fs.existsSync(MAIN_JS)) { console.error(`未找到主进程文件: ${MAIN_JS}`); process.exit(1); }

// ---------- 替换表 ----------
// 主进程是混淆代码：字符串用单引号，空格写成 \x20 转义序列（字面量 backslash-x-2-0）
const MAIN_PAIRS = [
  [
    "{'displayName':'Enable\\x20Thinking','subtitle':'Controls\\x20thinking\\x20for\\x20chat\\x20templates\\x20that\\x20support\\x20enable_thinking.'}",
    "{'displayName':'启用思考','subtitle':'控制支持 enable_thinking 的对话模板是否让模型先思考。'}",
  ],
];
// 插件包内 .lmstudio/production.js（普通双引号，无转义）
const PLUGIN_PAIRS = [
  ['displayName: "Retrieval Limit"', 'displayName: "检索数量上限"'],
  ['subtitle: "When retrieval is triggered, this is the maximum number of chunks to return."',
    'subtitle: "触发检索时，返回的文本块最大数量。"'],
  ['displayName: "Retrieval Affinity Threshold"', 'displayName: "检索相似度阈值"'],
  ['subtitle: "The minimum similarity score for a chunk to be considered relevant."',
    'subtitle: "文本块被视为相关所需的最低相似度分数。"'],
];

// ---------- 恢复 ----------
if (RESTORE) {
  let ok = 0, miss = 0;
  const restoreFile = (target, bakName, label) => {
    const bak = path.join(BACKUP_DIR, bakName);
    if (!fs.existsSync(bak)) { console.log(`跳过(无备份): ${label}`); miss++; return; }
    fs.copyFileSync(bak, target);
    console.log(`已恢复: ${label}`);
    ok++;
  };
  restoreFile(MAIN_JS, `main.index.js.${version}.original`, 'main/index.js（主进程）');
  if (fs.existsSync(PLUGIN_DIR)) {
    for (const f of fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith('.tar.gz'))) {
      restoreFile(path.join(PLUGIN_DIR, f), `${f}.${version}.original`, `bundled-plugins/${f}`);
    }
  }
  console.log(`\n恢复完成：${ok} 个文件${miss ? `，${miss} 个无备份（从未打过补丁）` : ''}。重启 LM Studio 生效。`);
  process.exit(0);
}

// ---------- 任务 ①：主进程 main/index.js ----------
function patchMain() {
  const bakPath = path.join(BACKUP_DIR, `main.index.js.${version}.original`);
  const useBak = fs.existsSync(bakPath);
  const src = fs.readFileSync(useBak ? bakPath : MAIN_JS, 'utf8');
  console.log(`\n[主进程] 基线: ${useBak ? '原版备份（幂等重算）' : '当前文件（首次运行，将创建备份）'}`);
  let content = src, n = 0;
  for (const [en, zh] of MAIN_PAIRS) {
    const c = content.split(en).length - 1;
    if (c > 0) { content = content.split(en).join(zh); n += c; }
    else if (content.includes(zh)) console.log('  已是中文（跳过）');
    else console.log(`  未找到目标: ${en.slice(0, 60)}…（版本可能已变，请提交 issue）`);
  }
  console.log(`[主进程] 替换 ${n} 处`);
  if (DRY || n === 0) return n;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  if (!fs.existsSync(bakPath)) fs.writeFileSync(bakPath, src, 'utf8');
  fs.writeFileSync(MAIN_JS, content, 'utf8');
  try {
    execFileSync(process.execPath, ['--check', MAIN_JS], { stdio: 'ignore', timeout: 300000 });
    console.log('[主进程] 语法校验: 通过');
  } catch (e) {
    fs.copyFileSync(bakPath, MAIN_JS);
    console.error('[主进程] 语法校验未通过，已自动回滚。请到项目仓库提交 issue。');
    process.exit(2);
  }
  return n;
}

// ---------- 任务 ②：内置插件包 tar.gz ----------
function patchOneTarGz(file) {
  const full = path.join(PLUGIN_DIR, file);
  const bakPath = path.join(BACKUP_DIR, `${file}.${version}.original`);
  const useBak = fs.existsSync(bakPath);
  const raw = fs.readFileSync(useBak ? bakPath : full);
  const plain = zlib.gunzipSync(raw);           // tar 字节流
  // 目标字符串是否在包里（Buffer 级查找，避免解码问题）
  const targets = PLUGIN_PAIRS.filter(([en]) => plain.includes(Buffer.from(en, 'utf8')));
  const already = PLUGIN_PAIRS.filter(([, zh]) => plain.includes(Buffer.from(zh, 'utf8')));
  if (targets.length === 0) {
    if (already.length > 0) console.log(`  ${file}: 已是中文（跳过 ${already.length} 条）`);
    return 0;
  }
  console.log(`  ${file}: 命中 ${targets.length} 条${useBak ? '（自原版备份重算）' : ''}`);
  if (DRY) return targets.length;

  // 解压到临时目录 → 改 production.js → 重打包 → 校验 → 替换
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lmstudio-patch-extra-'));
  const exDir = path.join(tmp, 'x');
  fs.mkdirSync(exDir, { recursive: true });
  try {
    execFileSync('tar', ['-xzf', full, '-C', exDir], { timeout: 120000 });
    const prod = path.join(exDir, '.lmstudio', 'production.js');
    if (!fs.existsSync(prod)) { console.log(`    未找到 .lmstudio/production.js，跳过`); return 0; }
    let txt = fs.readFileSync(prod, 'utf8');
    let n = 0;
    for (const [en, zh] of PLUGIN_PAIRS) {
      if (txt.includes(en)) { n += txt.split(en).length - 1; txt = txt.split(en).join(zh); }
    }
    fs.writeFileSync(prod, txt, 'utf8');
    // 重打包（与官方同结构：顶层即包内容，无 ./ 前缀由 tar 自行处理）
    const outTar = path.join(tmp, 'out.tar.gz');
    execFileSync('tar', ['-czf', outTar, '-C', exDir, '.'], { timeout: 120000 });
    // 校验：新包能解压、新文案在、旧英文文案消失
    const vDir = path.join(tmp, 'v');
    fs.mkdirSync(vDir, { recursive: true });
    execFileSync('tar', ['-xzf', outTar, '-C', vDir], { timeout: 120000 });
    const vTxt = fs.readFileSync(path.join(vDir, '.lmstudio', 'production.js'), 'utf8');
    const bad = PLUGIN_PAIRS.filter(([en]) => vTxt.includes(en));
    if (bad.length > 0) { console.error('    校验失败：旧文案仍在新包中，保留原包不动'); return 0; }
    if (!useBak) { fs.mkdirSync(BACKUP_DIR, { recursive: true }); fs.writeFileSync(bakPath, raw); }
    fs.copyFileSync(outTar, full);
    console.log(`    已重打包并替换（${n} 处），备份: ${bakPath}`);
    return n;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function patchPlugins() {
  if (!fs.existsSync(PLUGIN_DIR)) { console.log('\n[插件包] 目录不存在，跳过'); return 0; }
  const files = fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith('.tar.gz'));
  console.log(`\n[插件包] 发现 ${files.length} 个包: ${files.join(', ')}`);
  let total = 0;
  for (const f of files) total += patchOneTarGz(f);
  console.log(`[插件包] 合计替换 ${total} 处`);
  return total;
}

// ---------- 执行 ----------
const nMain = patchMain();
const nPlug = patchPlugins();
if (DRY) { console.log('\n[dry-run] 未写入任何文件'); process.exit(0); }
console.log(`\n完成！主进程 ${nMain} 处 + 插件包 ${nPlug} 处。请完全退出并重启 LM Studio 查看效果。`);
console.log('恢复英文: node patch-extra.js --restore');
