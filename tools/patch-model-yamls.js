// 汉化模型 yaml 的 customFields 显示文本（key 与功能不动，改前备份）
const fs = require('fs');
const path = require('path');

const base = path.join(process.env.USERPROFILE, '.lmstudio', 'hub', 'models');
const files = [
  'nvidia/nemotron-3-nano-4b/model.yaml',
  'google/gemma-4-e4b/model.yaml',
  'google/gemma-4-12b/model.yaml',
];
const map = [
  ['displayName: Enable Thinking', 'displayName: 启用思考'],
  ['displayName: Truncate Thinking History', 'displayName: 截断思考历史'],
  ['description: Controls whether the model will think before replying', 'description: 控制模型回复前是否先思考'],
  ['description: Controls whether thinking history will be truncated to save context space', 'description: 控制是否截断思考历史以节省上下文空间'],
];

for (const rel of files) {
  const f = path.join(base, rel);
  if (!fs.existsSync(f)) { console.log(`跳过(不存在): ${rel}`); continue; }
  let txt = fs.readFileSync(f, 'utf8');
  if (!fs.existsSync(f + '.bak')) fs.writeFileSync(f + '.bak', txt, 'utf8');
  let n = 0;
  for (const [en, zh] of map) {
    if (txt.includes(en)) { n += txt.split(en).length - 1; txt = txt.split(en).join(zh); }
  }
  fs.writeFileSync(f, txt, 'utf8');
  console.log(`${rel}: 替换 ${n} 处`);
}
