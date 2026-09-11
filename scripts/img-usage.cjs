// 全ページの img を走査し、素材の実寸・実描画サイズ・使用ページを JSON で出す
//   node scripts/img-usage.cjs <out.json>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
const ROOT = path.join(__dirname, '..', 'public_html');
const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'assets') walk(p); }
    else if (e.name === 'index.html') pages.push('/' + path.relative(ROOT, dir).split(path.sep).filter(Boolean).concat('').join('/'));
  }
})(ROOT);
pages.sort();

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const map = new Map();
  for (const url of pages) {
    await page.goto('http://127.0.0.1:3100' + url, { waitUntil: 'load' });
    await page.evaluate(() => new Promise((r) => { scrollTo(0, document.body.scrollHeight); setTimeout(r, 500); }));
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('img')].map((el) => {
        const b = el.getBoundingClientRect();
        return {
          src: new URL(el.getAttribute('src'), location.href).pathname,
          w: Math.round(b.width), h: Math.round(b.height),
          nw: el.naturalWidth, nh: el.naturalHeight,
          fit: getComputedStyle(el).objectFit,
          cls: typeof el.className === 'string' ? el.className : '',
          y: Math.round(b.y + scrollY), x: Math.round(b.x),
        };
      })
    );
    for (const r of rows) if (!map.has(r.src)) map.set(r.src, { ...r, url });
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify([...map.values()], null, 1));
  console.log(map.size + ' 件の img を記録 -> ' + OUT);
})();
