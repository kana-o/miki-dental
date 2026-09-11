// 指定セレクタの縦位置と「前の要素からの間隔」を一覧する（カンプとの余白合わせ用）
//   node scripts/section-gaps.cjs <url> <幅> <セレクタ...>
const { chromium } = require('playwright');
const [url, W, ...sels] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: Number(W), height: 900 } });
  await p.goto(url, { waitUntil: 'load' });
  await p.evaluate(() => new Promise((r) => { scrollTo(0, document.body.scrollHeight); setTimeout(r, 700); }));
  await p.evaluate(() => scrollTo(0, 0));
  const out = await p.evaluate((sel) => {
    let prev = null;
    return [...document.querySelectorAll(sel)]
      .filter((el) => el.getBoundingClientRect().height > 0)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const y = Math.round(r.y + scrollY);
        const g = prev === null ? 0 : y - prev;
        prev = y;
        return String(y).padStart(6) + '  前から ' + String(g).padStart(5) + '  ' + (el.textContent || '').trim().slice(0, 24);
      });
  }, sels.join(', '));
  console.log(out.join('\n'));
  await b.close();
})();
