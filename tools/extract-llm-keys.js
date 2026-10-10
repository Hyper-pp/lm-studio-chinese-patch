// 提取所有 llm.* 等 i18n 键值对（值以大写字母开头的英文）
const fs = require('fs');
const path = require('path');

const FILE = 'D:/Program Files/LM Studio/resources/app/.webpack/renderer/main_window.js';
const src = fs.readFileSync(FILE, 'utf8');

// 匹配 "llm.xxx/yyy":"Value" 形式的键值对（键含 llm./embedding./diffusion. 等前缀）
const re = /"((?:llm|embedding|diffusion|tts|asr)\.[a-zA-Z0-9./_-]+)":"([^"\\]{2,400})"/g;
const pairs = {};
let m;
while ((m = re.exec(src)) !== null) {
  const [, k, v] = m;
  if (/^[A-Z]/.test(v) && !pairs[k]) pairs[k] = v;   // 值为英文（大写开头）
}
const entries = Object.entries(pairs);
console.log(`提取到英文键值对: ${entries.length}`);

// 分文件输出：title 类（短）与 description 类（长）
const titles = entries.filter(([k, v]) => v.length <= 60);
const descs = entries.filter(([k, v]) => v.length > 60);
console.log(`短值(title 类): ${titles.length}, 长值(description 类): ${descs.length}`);

fs.writeFileSync(path.join(__dirname, 'todo-llm-title.txt'),
  titles.map((e, i) => `${i + 1}|${e[0]}|${e[1]}`).join('\n'), 'utf8');
fs.writeFileSync(path.join(__dirname, 'todo-llm-desc.txt'),
  descs.map((e, i) => `${i + 1}|${e[0]}|${e[1]}`).join('\n'), 'utf8');
console.log('已输出 todo-llm-title.txt / todo-llm-desc.txt');

// 抽样看内容
console.log('\ntitle 抽样:');
titles.slice(0, 8).forEach(([k, v]) => console.log(`  ${k} = ${v}`));
console.log('\ndesc 抽样:');
descs.slice(0, 5).forEach(([k, v]) => console.log(`  ${k} = ${v.slice(0, 80)}`));
