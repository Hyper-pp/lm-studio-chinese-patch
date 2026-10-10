// 优化版：单次遍历提取逻辑值集合（=== / case / Zod literal / 状态机字符串），再与所有字典求交集
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const orig = fs.readFileSync(path.join(dir, '.backups', 'main_window.js.0.4.25+1.original'), 'utf8');

// 1) 收集所有"逻辑值"：出现在 === / !== / case / .literal(...) 语境中的字符串字面量
const logicVals = new Set();
const collect = re => { let m; while ((m = re.exec(orig)) !== null) logicVals.add(m[1]); };
collect(/===\s*"([^"\\]{1,80})"/g);
collect(/!==\s*"([^"\\]{1,80})"/g);
collect(/case\s*"([^"\\]{1,80})"\s*:/g);
collect(/\.literal\(\s*"([^"\\]{1,80})"\s*\)/g);
collect(/\.default\(\s*"([^"\\]{1,80})"\s*\)/g);
// 标识符特征传参：G("X") / U("X") / t("X") / 任意无空格短串传参（≥3 字符，避免误伤 UI 短词）
collect(/[A-Za-z_$]{1,4}\(\s*"([^"\\]{3,24})"\s*\)/g);
collect(/\(\s*"([^"\\\s]{3,24})"\s*\)/g);
console.log(`逻辑值集合大小: ${logicVals.size}`);

// 2) 载入所有字典，找出交集
const load = f => { const p = path.join(dir, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {}; };
const dicts = {
  T_dict: load('T_dict.json'),
  T_llm_title: load('T_llm_title.json'),
  T_llm_desc: load('T_llm_desc.json'),
  T_round2: load('T_round2.json'),
  T_missing2: load('T_missing2.json'),
};
const rp = f => {
  const p = path.join(dir, f); const o = {};
  if (fs.existsSync(p)) fs.readFileSync(p, 'utf8').split('\n').filter(l => l.includes('\t'))
    .forEach(l => { const i = l.indexOf('\t'); o[l.slice(0, i)] = l.slice(i + 1); });
  return o;
};
dicts.t_round3_pairs = rp('t_round3_pairs.txt');
dicts.t_round3_ctx = rp('t_round3_ctx.txt');

fs.writeFileSync(path.join(dir, 'logic-values.json'), JSON.stringify([...logicVals], null, 0), 'utf8');

let total = 0;
for (const [name, d] of Object.entries(dicts)) {
  const hits = [];
  for (const [k, zh] of Object.entries(d)) {
    const en = (name === 'T_dict' || name === 'T_round2') ? k : k;   // 键即英文原文
    if (logicVals.has(en)) hits.push(`${en} -> ${typeof zh === 'string' ? zh : JSON.stringify(zh)}`);
  }
  total += hits.length;
  console.log(`\n${name}: 命中逻辑值 ${hits.length} 项`);
  hits.slice(0, 25).forEach(h => console.log(`   ${h}`));
}
console.log(`\n合计需从字典中剔除: ${total}`);
