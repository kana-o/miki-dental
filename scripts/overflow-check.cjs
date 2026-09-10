// 全ページ × 複数幅で横スクロールの発生と、はみ出している要素を洗い出す
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WIDTHS = (process.argv[2] || '360,375,414,600,769,900,1024,1080,1100,1200,1280,1440,1600,1920')
  .split(',').map(Number);
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
  let hits = 0;
  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    for (const url of pages) {
      await page.goto('http://127.0.0.1:3100' + url, { waitUntil: 'load' });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const r = await page.evaluate((vw) => {
        const over = document.documentElement.scrollWidth - vw;
        if (over <= 1) return null;
        const bad = [];
        for (const el of document.querySelectorAll('body *')) {
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0) continue;
          if (b.right <= vw + 1) continue;
          // 親もはみ出しているなら親のせい。自分が原因の要素だけ拾う
          const p = el.parentElement;
          if (p && p !== document.body && p.getBoundingClientRect().right > vw + 1) continue;
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed') continue;
          // overflow: hidden / clip の祖先に切られている装飾は実際にはスクロールを生まない
          let clipped = false;
          for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
            const ox = getComputedStyle(a).overflowX;
            if (ox === 'hidden' || ox === 'clip') { clipped = true; break; }
          }
          if (clipped) continue;
          bad.push(
            el.tagName.toLowerCase() +
              (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '') +
              ' → right ' + Math.round(b.right) + ' (幅 ' + Math.round(b.width) + ')'
          );
        }
        return { over: Math.round(over), bad: [...new Set(bad)].slice(0, 6) };
      }, w);
      if (r) { hits++; console.log('[' + w + 'px] ' + url + '  +' + r.over + 'px'); r.bad.forEach((b) => console.log('        ' + b)); }
    }
    await page.close();
  }
  await browser.close();
  console.log(hits === 0 ? '\n横はみ出しなし' : '\n' + hits + ' 件');
})();
