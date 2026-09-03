// 実装ページの主要セクションの高さ・Y座標を書き出す（カンプとの突き合わせ用）
import { chromium } from 'playwright';
const [,, url, widthArg, sel] = process.argv;
const width = Number(widthArg || 1600);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: '#__bs_notify__{display:none!important}' });
await page.evaluate(async () => {
  document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
  await Promise.all([...document.images].filter(i=>!i.complete).map(i=>new Promise(r=>{i.onload=i.onerror=r})));
});
await page.waitForTimeout(300);
const rows = await page.evaluate((sel) => {
  const out = [];
  document.querySelectorAll(sel || 'main > *, main > * > section, main section').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.height < 5) return;
    out.push({
      cls: (typeof el.className === 'string' ? el.className : '').split(' ')[0] || el.tagName.toLowerCase(),
      y: Math.round(r.top + window.scrollY),
      h: Math.round(r.height),
    });
  });
  return out;
}, sel);
const seen = new Set();
console.log('  Y座標   高さ    セクション');
for (const r of rows) {
  const k = r.cls + r.y;
  if (seen.has(k)) continue; seen.add(k);
  console.log(`  ${String(r.y).padStart(6)}  ${String(r.h).padStart(6)}   ${r.cls}`);
}
console.log(`  全体高さ: ${await page.evaluate(()=>document.documentElement.scrollHeight)}`);
await browser.close();
