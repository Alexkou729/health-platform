const fs = require('fs');
const path = require('path');

const SRC = 'D:/Tools/Quantum Analyzer(13)/ReportC';
const OUT = 'E:/work Codex/健康管理/platform/docs/设备代工/报告参数对照表.json';

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.html') && f !== 'DuiBi.html');

const clean = (s) => (s || '')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

function extractReport(html) {
  let title = '';
  const tm = html.match(/<font[^>]*size\s*=\s*6[^>]*>\s*([^<]+?)\s*<\/font>/i);
  if (tm) title = clean(tm[1]);

  const items = [];
  const idx = html.indexOf('实际检测结果');
  const tail = idx >= 0 ? html.slice(idx) : html;

  const trRe = /<TR[^>]*class\s*=\s*td[^>]*>([\s\S]*?)<\/TR>/gi;
  let m;
  while ((m = trRe.exec(tail)) !== null) {
    const tds = [];
    const tdRe = /<TD[^>]*>([\s\S]*?)<\/TD>/gi;
    let t;
    while ((t = tdRe.exec(m[1])) !== null) tds.push(clean(t[1]));
    if (tds.length >= 2) {
      const name = tds[0], range = tds[1], result = tds.length >= 4 ? tds[3] : '';
      if (name && name.length < 40 && !/检测项目|正常范围|实际测量值|检测结果/.test(name)) {
        items.push({ name, range, result });
      }
    }
  }

  const explanations = [];
  const exRe = /<TD><B>([^<]+?)<\/B><\/TD><\/TR><TR><TD>([\s\S]*?)<\/TD><\/TR>/gi;
  let e;
  while ((e = exRe.exec(html)) !== null) {
    const name = clean(e[1]), text = clean(e[2]);
    if (name && text) explanations.push({ name, text });
  }

  return { title, items, explanations };
}

const result = [];
for (const f of files) {
  const html = fs.readFileSync(path.join(SRC, f), 'utf8'); // 实际 UTF-8
  const r = extractReport(html);
  r.file = f;
  // 若正文标题没抓到，用文件名兜底
  if (!r.title) r.title = f.replace(/\.html$/i, '');
  result.push(r);
}

fs.writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');

let totalItems = 0;
for (const r of result) {
  totalItems += r.items.length;
  console.log(`${r.title} | 指标 ${r.items.length} | 详解 ${r.explanations.length}`);
}
console.log(`\n总计: ${result.length} 类报告, ${totalItems} 个检测指标`);
console.log('已写入:', OUT);
