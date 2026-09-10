// 指定セレクタの絶対座標を出す（デザイン画像と突き合わせる用）
const { chromium } = require('playwright');
const [url, width, ...sels] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
  await page.goto('http://127.0.0.1:3100' + url, { waitUntil: 'load' });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const doc = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log('ページ全体の高さ: ' + doc);
  for (const s of sels) {
    const r = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) };
    }, s);
    console.log('  ' + s.padEnd(40) + (r ? 'x' + r.x + ' y' + r.y + ' ' + r.w + 'x' + r.h : '見つからず'));
  }
  await browser.close();
})();
