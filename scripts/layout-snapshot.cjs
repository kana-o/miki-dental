// 全ページ・全要素の矩形をスナップショットして JSON に落とす。
// 変更前後で2回撮って差分を取れば、意図しないレイアウト変化を検出できる。
//   node scripts/layout-snapshot.cjs before.json
//   node scripts/layout-snapshot.cjs after.json
//   node scripts/layout-diff.cjs before.json after.json
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
if (!OUT) { console.error('出力先を指定してください'); process.exit(1); }

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
  const snap = {};
  for (const [w, h, label] of [[1600, 1000, 'pc'], [375, 800, 'sp']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    for (const url of pages) {
      await page.goto('http://127.0.0.1:3100' + url, { waitUntil: 'load' });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      snap[label + ' ' + url] = await page.evaluate(() =>
        [...document.querySelectorAll('*')].map((el) => {
          const b = el.getBoundingClientRect();
          return [
            el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
            Math.round(b.x), Math.round(b.y + window.scrollY), Math.round(b.width), Math.round(b.height),
          ];
        })
      );
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(snap));
  console.log('保存: ' + OUT + '（' + pages.length + 'ページ × PC/SP）');
})();
