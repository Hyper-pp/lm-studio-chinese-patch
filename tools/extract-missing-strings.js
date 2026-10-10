// 提取 T_dict 未覆盖的硬编码英文短语 → 生成补充翻译清单
const fs = require('fs');
const path = require('path');

const BUNDLE = 'D:/Program Files/LM Studio/resources/app/.webpack/renderer/main_window.js';
const dict = JSON.parse(fs.readFileSync(path.join(__dirname, 'T_dict.json'), 'utf8'));
const src = fs.readFileSync(BUNDLE, 'utf8');

const attrs = ["children", "title", "label", "tooltip", "placeholder",
  "aria-label", "description", "prettyName", "subtitle", "sectionTitle", "labelSubtext"];
const re = new RegExp('(?:' + attrs.join("|") + '):"([^"]+)"', 'g');

const missing = new Set();
let m;
while ((m = re.exec(src)) !== null) {
  if (!dict[m[1]]) missing.add(m[1]);
}

// 分类统计：值得翻的 vs 不用翻的（专名/超短/含占位符）
const isProper = s => /^(LM Studio|LM |GPT|API|MCP|OpenAI|JSON|URL|USB|GPU|CPU|HPU|TPS|KV|PDF|CSV|GGUF|MLX|LMatrix|LMstruct|ChatML|Safe\.|SRGi|Vision|Markdown)/.test(s) || /^[A-Z0-9 ._\/-]+$/.test(s) && !/ /.test(s);
const worth = [], skip = [];
for (const s of missing) {
  const t = s.trim();
  if (t.length < 4 || !/[a-zA-Z]{3}/.test(t) || isProper(t) || /^[\s\d.,:%-]+$/.test(t)) skip.push(s);
  else worth.push(s);
}
// 长的排前面（通常是完整句子，最影响阅读）
worth.sort((a, b) => b.length - a.length);

const out = { meta: { date: new Date().toISOString(), bundle: BUNDLE, totalMissing: missing.size, worthCount: worth.length, skipCount: skip.length } };
out.worth = Object.fromEntries(worth.map(s => [s, '']));  // 空值待填中文
out.skip = skip;
fs.writeFileSync(path.join(__dirname, 'hardcoded-missing-strings.json'), JSON.stringify(out, null, 2), 'utf8');

console.log(`未覆盖短语总数: ${missing.size}`);
console.log(`值得翻译(完整词句): ${worth.length}`);
console.log(`可跳过(专名/超短/符号): ${skip.length}`);
console.log(`\n最长的 25 条(最影响阅读):`);
worth.slice(0, 25).forEach(s => console.log(`  [${s.length}] ${s.slice(0, 100)}`));
console.log(`\n清单已写入: hardcoded-missing-strings.json`);
