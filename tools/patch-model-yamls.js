// 汉化模型 yaml 的 customFields 显示文本（key 与功能不动，改前备份）
// 递归扫描 ~/.lmstudio/hub/models 下全部 model.yaml——包括以后新下载的模型，
// 对已知 customFields 文案做替换。程序文件补丁管不到模型自带数据，这个脚本补这一层；
// 遇到新版新文案时，把新字符串加进下面的 map 再跑一次即可（见 README「适配新版」）。
const fs = require('fs');
const path = require('path');

const base = path.join(process.env.USERPROFILE, '.lmstudio', 'hub', 'models');

const map = [
  // gemma / nemotron 等思考开关
  ['displayName: Enable Thinking', 'displayName: 启用思考'],
  ['displayName: Truncate Thinking History', 'displayName: 截断思考历史'],
  ['description: Controls whether the model will think before replying', 'description: 控制模型回复前是否先思考'],
  ['description: Controls whether thinking history will be truncated to save context space', 'description: 控制是否截断思考历史以节省上下文空间'],
  // gpt-oss 系列（openai/gpt-oss-20b 等）Reasoning Effort
  ['displayName: Reasoning Effort', 'displayName: 推理强度'],
  ['description: Controls how much reasoning the model should perform.', 'description: 控制模型应执行的推理量。'],
  ['label: Low', 'label: 低'],
  ['label: Medium', 'label: 中'],
  ['label: High', 'label: 高'],
];

// 同一语义兼容两种 YAML 写法：`key: value` 与 `key: "value"`
const pairs = [];
for (const [en, zh] of map) {
  pairs.push([en, zh]);
  const m = en.match(/^([A-Za-z]+): (.*)$/);
  if (m) pairs.push([`${m[1]}: "${m[2]}"`, `${m[1]}: "${zh}"`]);
}

function walk(dir, out) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'model.yaml') out.push(p);
  }
  return out;
}

const files = fs.existsSync(base) ? walk(base, []) : [];
if (!files.length) { console.log(`未找到任何 model.yaml（${base}）`); process.exit(0); }

let hitFiles = 0, total = 0;
for (const f of files) {
  let txt = fs.readFileSync(f, 'utf8');
  if (!fs.existsSync(f + '.bak')) fs.writeFileSync(f + '.bak', txt, 'utf8');
  let n = 0;
  for (const [en, zh] of pairs) {
    if (txt.includes(en)) { n += txt.split(en).length - 1; txt = txt.split(en).join(zh); }
  }
  if (n > 0) {
    fs.writeFileSync(f, txt, 'utf8');
    hitFiles++;
    total += n;
    console.log(`${path.relative(base, f)}: 替换 ${n} 处`);
  }
}
console.log(`\n共 ${hitFiles} 个模型文件、${total} 处（扫描 ${files.length} 个 model.yaml）`);
