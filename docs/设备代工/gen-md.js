const fs = require('fs');
const data = require('E:/work Codex/健康管理/platform/docs/设备代工/报告参数对照表.json');
const OUT = 'E:/work Codex/健康管理/platform/docs/设备代工/报告参数对照表.md';

let md = '';
md += '# 健康检测仪 · 报告参数对照表（ODM 物料）\n\n';
md += '> 来源：原版 Quantum Analyzer 软件 50 类报告模板，共 522 项检测指标。\n';
md += '> 用途：交付代工厂，作为设备数据协议、正常范围、异常分级的唯一依据。\n\n';
md += '## 异常分级规则（全局统一）\n\n';
md += '| 分级 | 标识 | 含义 |\n|---|---|---|\n';
md += '| 正常 | `-` | 实测值落在正常范围内 |\n';
md += '| 轻度异常 | `+` | 实测值偏离正常范围 <10% |\n';
md += '| 中度异常 | `++` | 实测值偏离正常范围 10%~20% |\n';
md += '| 重度异常 | `+++` | 实测值偏离正常范围 >20% |\n';
md += '| 酸碱度专项 | 酸性/碱性 | pH 值偏离 7.35-7.45 |\n\n';
md += '---\n\n';

for (const r of data) {
  md += `## ${r.title}\n\n`;
  md += '| # | 检测项目 | 正常范围 | 结果分级 |\n|---|---------|---------|--------|\n';
  r.items.forEach((it, i) => {
    md += `| ${i + 1} | ${it.name} | ${it.range || '—'} | ${it.result || '—'} |\n`;
  });
  if (r.explanations.length) {
    md += '\n### 指标说明\n\n';
    r.explanations.forEach(e => {
      md += `- **${e.name}**：${e.text}\n`;
    });
  }
  md += '\n---\n\n';
}

fs.writeFileSync(OUT, md, 'utf8');
console.log('已生成:', OUT, '| 大小:', fs.statSync(OUT).size, '字节');
