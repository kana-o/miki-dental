// SPで横スクロールを起こしている要素を特定する
import { chromium } from 'playwright';
const [,, url, widthArg] = process.argv;
const width = Number(widthArg || 375);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: '#__bs_notify__{display:none!important}' });
const out = await page.evaluate((vw) => {
  const res = [];
  document.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    const right = r.left + r.width;
    if (right > vw + 1 || r.left < -1) {
      res.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 60) : '',
        left: Math.round(r.left), right: Math.round(right), w: Math.round(r.width),
      });
    }
  });
  return res;
}, width);
// 親子で重複するので、はみ出し量が大きい順に上位だけ
out.sort((a,b) => (b.right - a.right) || (a.left - b.left));
console.log(`はみ出し要素 ${out.length} 件（viewport ${width}px）`);
for (const o of out.slice(0, 15)) {
  console.log(`  right=${o.right}  left=${o.left}  w=${o.w}  <${o.tag} class="${o.cls}">`);
}
await browser.close();
