// 素材の実寸とカンプ枠（実際の描画サイズ）を突き合わせ、
// 「比率が違う（＝トリミングが効いていない）」「拡大表示になっている」画像を洗い出す。
//   node scripts/img-frame-audit.cjs <suspects.json>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const suspects = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
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
  const found = new Map();
  for (const url of pages) {
    await page.goto('http://127.0.0.1:3100' + url, { waitUntil: 'load' });
    await page.evaluate(() => new Promise((r) => { scrollTo(0, document.body.scrollHeight); setTimeout(r, 500); }));
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('img')].map((el) => {
        const b = el.getBoundingClientRect();
        return {
          src: new URL(el.currentSrc || el.src, location.href).pathname,
          base: new URL(el.getAttribute('src'), location.href).pathname,
          w: Math.round(b.width), h: Math.round(b.height),
          fit: getComputedStyle(el).objectFit,
          cls: el.className,
        };
      })
    );
    for (const r of rows) if (!found.has(r.base)) found.set(r.base, { ...r, url });
  }
  await browser.close();

  console.log('素材                                     素材実寸    枠(PC)     素材比  枠比   判定');
  for (const s of suspects) {
    const u = found.get(s.file);
    if (!u) { console.log(s.file.padEnd(40) + ' ' + (s.w + 'x' + s.h).padEnd(11) + ' 未使用'); continue; }
    const sr = s.w / s.h, fr = u.w / u.h;
    const crop = Math.abs(sr - fr) / fr;
    const scale = s.w / (u.w * 2); // 2x基準
    const flags = [];
    if (crop > 0.03) flags.push('比率ズレ' + (crop * 100).toFixed(0) + '%');
    if (scale < 0.9) flags.push('解像度不足(2x比 ' + scale.toFixed(2) + ')');
    console.log(
      s.file.replace('/assets/img/', '').padEnd(40) + ' ' +
      (s.w + 'x' + s.h).padEnd(11) + ' ' + (u.w + 'x' + u.h).padEnd(10) + ' ' +
      sr.toFixed(2).padEnd(7) + fr.toFixed(2).padEnd(6) + ' ' + (flags.join(' / ') || 'OK')
    );
  }
})();
