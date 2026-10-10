// 根治方案：找出 zh_CN 资源缺失、但代码里以默认值形式出现的 i18n 键
const fs = require('fs');
const path = require('path');
const FILE = 'D:/Program Files/LM Studio/resources/app/.webpack/renderer/main_window.js';
const src = fs.readFileSync(FILE, 'utf8');

// 1) 收集所有 JSON 资源块的键 → 找出哪些键已有中文值
const reJson = /(\d+):\w=>\{"use strict";\w\.exports=JSON\.parse\('((?:[^'\\]|\\.)*)'\)/g;
let m, allKeys = {}, zhKeys = new Set();
while ((m = reJson.exec(src)) !== null) {
  let obj;
  try { obj = JSON.parse(eval("'" + m[2] + "'")); } catch (e) { continue; }
  if (!obj || typeof obj !== 'object') continue;
  const isZh = Object.values(obj).some(v => typeof v === 'string' && /[一-鿿]/.test(v));
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'string' || v.includes('\\')) continue;
    allKeys[k] = v;
    if (isZh) zhKeys.add(k);
  }
}
console.log(`资源块总键数(去重): ${Object.keys(allKeys).length}, 其中含中文值的块覆盖键: ${zhKeys.size}`);

// 2) 收集代码里 i18n 调用的 (key, englishDefault) 二元组
//    形式: X("some.key","English Default")  —— 排除含 { } 的代码
const reCall = /[A-Za-z_$]{1,4}\("([a-zA-Z][a-zA-Z0-9_.\/-]{1,60})","([A-Z][^"{}]{1,200})"\)/g;
const calls = {};
while ((m = reCall.exec(src)) !== null) {
  const [, k, v] = m;
  if (k.includes('.')) calls[k] = v;
}
console.log(`代码中 i18n 默认值调用: ${Object.keys(calls).length} 个`);

// 3) 差集：值本身不是中文的键（界面实际显示英文的那些）
//    注意：必须按"值"判断而非按"块"——zh_CN 块里也混着未翻译的英文值
const missing = Object.entries(calls).filter(([k, v]) => {
  const val = allKeys[k];
  const hasZh = typeof val === 'string' && /[一-鿿]/.test(val);
  return !hasZh && !/[一-鿿]/.test(v);
});
console.log(`\n值仍为英文的键: ${missing.length} 个`);

// 分类：monaco 编辑器类（跳过）vs 其他（翻）
const isMonaco = k => /^(editor|find|folding|wordWrap|wordBreak|minimap|scrollbar|inline|bracket|colorized|render|lineNumbers|guides|rulers|padding|suggest|quick|inlay|tabCompletion|unicode|unusual|wrapping|wrappingIndent|cursor|dropInto|experimentalWhitespace|multiCursor|occurrences|parameterHints|peekWidget|pasteAs|quickSuggestions|snippet|showFolding|diffAlgorithm|hideUnchanged|accessibilitySupport|comments\.|mouseWheelZoom|detectIndentation|glyphMargin|lightbulb|inDiffEditor|matchBrackets)\./.test(k);
const ui = missing.filter(([k]) => !isMonaco(k));
const monaco = missing.filter(([k]) => isMonaco(k));
console.log(`  用户可见(需翻): ${ui.length} / 编辑器内部(跳过): ${monaco.length}`);

fs.writeFileSync(path.join(__dirname, 'todo-ui-missing.txt'),
  ui.map((e, i) => `${i + 1}|${e[0]}|${e[1]}`).join('\n'), 'utf8');
console.log('已输出 todo-ui-missing.txt');
console.log('\n用户可见缺失键:');
ui.forEach(([k, v]) => console.log(`  ${k} = ${v.slice(0, 70)}`));
