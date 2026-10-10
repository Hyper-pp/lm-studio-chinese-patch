#!/usr/bin/env node
/**
 * LM Studio 简体中文补充汉化补丁
 * ============================================
 * 适用：LM Studio 0.4.25 (Windows x64)，其他版本请先跑 tools/ 内的扫描脚本确认兼容
 *
 * 工作原理（详见 README）：
 *   LM Studio 的界面文本分三层：
 *   ① i18n 键翻译（内联 JSON chunk，官方 zh_CN 已覆盖约 98%）
 *   ② 硬编码 JSX 属性文本（约 3100 处，无论选什么语言都是英文）
 *   ③ Chromium 原生对话框（.pak 文件，本补丁不碰）
 *   本补丁替换 ② + 补齐 ① 的缺失键，共约 6700 处。
 *
 * 安全闸门（按顺序）：
 *   1. 基线固定：始终从原版备份重算，幂等，绝不在旧补丁上叠加
 *   2. 转义感知：值里含 \\" \\\\ 等转义序列的一律跳过（曾导致 JSON 断裂白屏）
 *   3. 逻辑值黑名单：Inference/Overrides/loading/ready/Enter 等 27 个字符串同时充当
 *      tabId/panelId、状态机 case、Zod literal、键盘 key —— 翻了它们会导致
 *      右侧参数面板消失、点设置无反应、回车失效（语法与 JSON 校验都查不出此类错误）
 *   4. 产出前强制校验：全部内联 JSON 可解析 + 整文件语法合法，任一不过拒绝写盘
 *
 * 用法：
 *   node apply-patch.js                 # 应用汉化（自动检测安装目录）
 *   node apply-patch.js --path "目录"    # 手动指定 LM Studio 安装目录
 *   node apply-patch.js --dry-run       # 预览命中数，不写任何文件
 *   node apply-patch.js --restore       # 恢复英文原版
 *   node apply-patch.js --info          # 只显示检测结果
 *
 * 依赖：Node.js 16+（无第三方依赖）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
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
  console.error('请用 --path 参数指定，例如: node apply-patch.js --path "D:\\\\Program Files\\\\LM Studio"');
  process.exit(1);
}
const JS = path.join(LM_DIR, 'resources', 'app', '.webpack', 'renderer', 'main_window.js');
const PKG = path.join(LM_DIR, 'resources', 'app', 'package.json');
const version = JSON.parse(fs.readFileSync(PKG, 'utf8')).version;

// 备份放家目录：restore 不需要管理员权限
const BACKUP_DIR = path.join(os.homedir(), '.lmstudio-chinese-patch', 'backups');

console.log(`LM Studio: ${version}`);
console.log(`安装目录:  ${LM_DIR}`);
if (INFO) process.exit(0);

// ---------- 加载字典 ----------
const loadJSON = f => JSON.parse(fs.readFileSync(path.join(HERE, 'dicts', f), 'utf8'));
const readPairs = f => {
  const p = path.join(HERE, 'dicts', f);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.includes('\t'))
    .map(l => { const i = l.indexOf('\t'); return [l.slice(0, i), l.slice(i + 1)]; });
};
const dict = loadJSON('T_dict.json');                 // 基础字典（含源自 C2H12O6 的 1084 条）
const T_llm_title = loadJSON('T_llm_title.json');     // 参数面板 title 键
const T_llm_desc = loadJSON('T_llm_desc.json');       // 参数面板描述键
const T_round2 = loadJSON('T_round2.json');           // 聊天输入框/侧栏等杂项
const T_missing2 = loadJSON('T_missing2.json');       // i18n 默认值补键
const r3_pairs = readPairs('t_round3_pairs.txt');     // 全局唯一短语
const r3_ctx = readPairs('t_round3_ctx.txt');         // 上下文限定短语
const LOGIC_VALUES = new Set(loadJSON('logic-values.json'));  // 逻辑值黑名单（必须先跑 tools/diag-risky-all.js 生成）

// ---------- 恢复 ----------
if (RESTORE) {
  const bak = path.join(BACKUP_DIR, `main_window.js.${version}.original`);
  if (!fs.existsSync(bak)) {
    console.error(`未找到 ${version} 的备份: ${bak}`);
    console.error('如果从未打过补丁则无需恢复；如果备份丢失，请重新安装 LM Studio。');
    process.exit(1);
  }
  fs.copyFileSync(bak, JS);
  console.log('已恢复英文原版。重启 LM Studio 生效。');
  process.exit(0);
}

// ---------- 基线：优先原版备份（幂等） ----------
fs.mkdirSync(BACKUP_DIR, { recursive: true });
const bakPath = path.join(BACKUP_DIR, `main_window.js.${version}.original`);
const useBak = fs.existsSync(bakPath);
const src = fs.readFileSync(useBak ? bakPath : JS, 'utf8');
console.log(`基线: ${useBak ? '原版备份（幂等重算）' : '当前文件（首次运行，将创建备份）'}`);
console.log(`bundle: ${src.length.toLocaleString()} 字符\n`);

let count = 0;
let content = src;

// ---------- Step1: i18next 初始语言切换 ----------
const i18nOld = 'lng:"en",defaultNS:"sidebar",fallbackLng:"en"';
if (content.includes(i18nOld)) {
  content = content.replace(i18nOld, 'lng:"zh_CN",defaultNS:"sidebar",fallbackLng:"en"');
  count++; console.log('Step1 i18n 切换: 已应用');
} else if (content.includes('lng:"zh_CN"')) console.log('Step1 i18n 切换: 已是中文（跳过）');

// ---------- Step2: JSX 属性替换（带逻辑值黑名单 + 转义跳过） ----------
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const attrs = ['children', 'title', 'label', 'tooltip', 'placeholder',
  'aria-label', 'description', 'prettyName', 'subtitle', 'sectionTitle', 'labelSubtext'];
let s2 = 0, s2skip = 0;
content = content.replace(new RegExp('(?:' + attrs.join('|') + '):"([^"]+)"', 'g'), (m, en) => {
  if (dict[en] === undefined) return m;
  if (LOGIC_VALUES.has(en)) { s2skip++; return m; }   // 逻辑标识不翻
  s2++;
  return `${m.slice(0, m.indexOf(':"'))}:"${dict[en]}"`;
});
console.log(`Step2 属性替换: ${s2} 处 (逻辑值跳过 ${s2skip})`);
count += s2;

// ---------- Step3: children:["..."] 数组首元素 ----------
let s3 = 0;
for (const [en, zh] of Object.entries(dict)) {
  if (LOGIC_VALUES.has(en)) continue;
  const old = `children:["${en}"`;
  if (content.includes(old)) {
    s3 += content.split(old).length - 1;
    content = content.split(old).join(`children:["${zh}"`);
  }
}
console.log(`Step3 数组首元素: ${s3} 处`);
count += s3;

// ---------- Step4: 常量赋值 =“English” —— 已禁用 ----------
// 实证危害：会翻掉状态机常量（t.DOWNLOADING="Downloading"）与 TS 枚举反向映射
// （t[t.Custom=4]="Custom"），导致状态判断与 UI 逻辑失配。收益 34 处，风险致命。
console.log('Step4 常量赋值: 已禁用（安全优先）');

// ---------- Step5: i18n 键值对精准替换（参数面板 llm.*/embedding.* 键） ----------
let s5 = 0, s5skip = 0;
for (const d of [T_llm_title, T_llm_desc]) {
  for (const [k, zh] of Object.entries(d)) {
    // 转义感知：完整匹配含转义序列的值，含转义则跳过（曾导致 JSON 断裂白屏）
    const reKey = new RegExp('("' + esc(k) + '":"(?:[^"\\\\]|\\\\.)*")', 'g');
    content = content.replace(reKey, m => {
      if (m.endsWith(`:"${zh}"`)) return m;
      const rawVal = m.slice(m.indexOf(':"') + 2, -1);
      if (rawVal.includes('\\') || LOGIC_VALUES.has(rawVal)) { s5skip++; return m; }
      s5++;
      return m.slice(0, m.indexOf(':"') + 2) + zh + '"';
    });
  }
}
console.log(`Step5 键值对替换: ${s5} 处 (跳过 ${s5skip})`);
count += s5;

// ---------- Step6: 长短语直替（≥10 字符防误伤） ----------
let s6 = 0;
for (const [en, zh] of Object.entries(T_round2)) {
  if (en.length < 10 || LOGIC_VALUES.has(en)) continue;
  if (content.includes(en)) { s6 += content.split(en).length - 1; content = content.split(en).join(zh); }
}
console.log(`Step6 短语直替: ${s6} 处`);
count += s6;

// ---------- Step7: i18n 调用默认值补键（"key","English Default" → 中文） ----------
let s7 = 0, s7skip = 0;
for (const [k, zh] of Object.entries(T_missing2)) {
  const reCall = new RegExp('("' + esc(k) + '","(?:[^"\\\\]|\\\\.)*")', 'g');
  content = content.replace(reCall, m => {
    if (m.endsWith(`,"${zh}"`)) return m;
    const rawVal = m.slice(m.indexOf('","') + 3, -1);
    if (rawVal.includes('\\') || LOGIC_VALUES.has(rawVal)) { s7skip++; return m; }
    s7++;
    return m.slice(0, m.indexOf('","') + 3) + zh + '"';
  });
}
console.log(`Step7 默认键补齐: ${s7} 处 (跳过 ${s7skip})`);
count += s7;

// ---------- Step8: 全局唯一短语 + 上下文限定替换 ----------
let s8a = 0, s8b = 0;
for (const [en, zh] of r3_pairs) {
  if (LOGIC_VALUES.has(en)) continue;
  if (content.includes(en)) { s8a += content.split(en).length - 1; content = content.split(en).join(zh); }
}
for (const [ctx, zh] of r3_ctx) {
  if (content.includes(ctx)) { s8b += content.split(ctx).length - 1; content = content.split(ctx).join(zh); }
}
console.log(`Step8 唯一短语: ${s8a} 处, 上下文限定: ${s8b} 处`);
count += s8a + s8b;

console.log(`\n共替换: ${count} 处`);
if (DRY) { console.log('\n[dry-run] 未写入任何文件'); process.exit(0); }

// ---------- 产出闸门 1: 全部内联 JSON 可解析 ----------
const reJson = /\d+:\w=>\{"use strict";\w\.exports=JSON\.parse\('((?:[^'\\]|\\.)*)'\)/g;
let jm, total = 0, bad = 0;
while ((jm = reJson.exec(content)) !== null) {
  total++;
  try { JSON.parse(eval("'" + jm[1] + "'")); }
  catch (e) { bad++; if (bad === 1) console.error(`首个失败 chunk: ${e.message}`); }
}
console.log(`JSON 校验: ${total} 个 chunk, 失败 ${bad}`);
if (bad > 0) { console.error('校验未通过，已中止。请到项目仓库提交 issue 并附上本输出。'); process.exit(2); }

// ---------- 写入（带版本号备份） ----------
if (!fs.existsSync(bakPath)) fs.writeFileSync(bakPath, src, 'utf8');
console.log(`原版备份: ${bakPath}`);
fs.writeFileSync(JS, content, 'utf8');
console.log(`写回完成: ${JS} (${fs.statSync(JS).size.toLocaleString()} 字节)`);

// ---------- 产出闸门 2: 写回后语法校验，失败自动回滚 ----------
try {
  execFileSync(process.execPath, ['--check', JS], { stdio: 'ignore', timeout: 300000 });
  console.log('语法校验: 通过');
} catch (e) {
  fs.copyFileSync(bakPath, JS);
  console.error('语法校验未通过，已自动回滚到原版。请到项目仓库提交 issue。');
  process.exit(2);
}

console.log('\n完成！请完全退出并重启 LM Studio 查看效果。');
console.log(`恢复英文: node apply-patch.js --restore`);
