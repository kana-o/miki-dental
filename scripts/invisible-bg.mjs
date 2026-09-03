// 背景色を持つのに、直近の背景色つき祖先と同色で「見えていない」要素を全ページ検出する
import { chromium } from 'playwright';
const PAGES = ['/', '/about/', '/general/', '/general/periodontal/', '/general/implant/',
  '/general/aesthetic/', '/general/whitening/', '/general/preventive/', '/pediatric/',
  '/pediatric/preventive/', '/pediatric/orthodontics/', '/pediatric/space-maintainer/',
  '/pediatric/sealant/', '/clinic/', '/staff/', '/recruit/', '/news/', '/news/detail/',
  '/price/', '/reservation/', '/access/'];
const br = await chromium.launch();
for (const [w, tag] of [[1600, 'pc'], [375, 'sp']]) {
  const ctx = await br.newContext({ viewport: { width: w, height: 900 } });
  const pg = await ctx.newPage();
  for (const p of PAGES) {
    await pg.goto('http://localhost:3000' + p, { waitUntil: 'domcontentloaded' });
    const hits = await pg.evaluate(() => {
      const out = [];
      const seen = new Set();
      for (const el of document.querySelectorAll('main *')) {
        const c = getComputedStyle(el).backgroundColor;
        if (c === 'rgba(0, 0, 0, 0)' || !c) continue;
        let n = el.parentElement, pc = 'rgb(255, 255, 255)';
        while (n) {
          const q = getComputedStyle(n).backgroundColor;
          if (q !== 'rgba(0, 0, 0, 0)') { pc = q; break; }
          n = n.parentElement;
        }
        if (c !== pc) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 60 || r.height < 12) continue;
        const key = el.className.toString();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(`${key.split(' ').join('.')}  ${Math.round(r.width)}x${Math.round(r.height)}  ${c}`);
      }
      return out;
    });
    if (hits.length) console.log(`### ${tag} ${p}\n` + hits.map(h => '    ' + h).join('\n'));
  }
  await ctx.close();
}
await br.close();
