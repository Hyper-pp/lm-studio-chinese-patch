// 合并原字典与全部补充翻译 → 新 T_dict.json（原版备份为 T_dict.json.orig）
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const orig = JSON.parse(fs.readFileSync(path.join(dir, 'T_dict.json'), 'utf8'));
const extras = ['T_extra_a1.json', 'T_extra_a2.json', 'T_extra_a3.json', 'T_extra_b.json', 'T_extra_c.json'];

// 备份原版
fs.writeFileSync(path.join(dir, 'T_dict.json.orig'), JSON.stringify(orig, null, 2), 'utf8');

const merged = { ...orig };
let added = 0, dupDiff = 0;
for (const f of extras) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const [k, v] of Object.entries(d)) {
    if (k in merged && merged[k] !== v) dupDiff++;
    if (!(k in merged)) added++;
    merged[k] = v;
  }
}
fs.writeFileSync(path.join(dir, 'T_dict.json'), JSON.stringify(merged, null, 2), 'utf8');
console.log(`原字典: ${Object.keys(orig).length} 条`);
console.log(`新增翻译: ${added} 条, 覆盖已有(以新版为准): ${dupDiff} 条`);
console.log(`合并后总计: ${Object.keys(merged).length} 条`);
console.log(`原版备份: T_dict.json.orig`);
