// 横スクロールの原因を、はみ出している要素の親子関係をたどって特定する
//   node scripts/overflow-find.cjs <url> <幅>
const { chromium } = require('playwright');
const [url, W] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: Number(W), height: 900 } });
  await p.goto(url, { waitUntil: 'load' });
  await p.evaluate(() => new Promise((r) => { scrollTo(0, document.body.scrollHeight); setTimeout(r, 600); }));
  await p.evaluate(() => scrollTo(0, 0));
  const out = await p.evaluate((vw) => {
    const name = (el) =>
      el.tagName.toLowerCase() +
      (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
    const over = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= vw + 1) continue;
      let clipped = false;
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if (ox === 'hidden' || ox === 'clip') { clipped = true; break; }
      }
      if (clipped) continue;
      // 子ではみ出しているものが無い＝この要素が末端の原因
      const leaf = ![...el.children].some((c) => c.getBoundingClientRect().right > vw + 1);
      if (!leaf) continue;
      const cs = getComputedStyle(el);
      const chain = [];
      for (let a = el; a && a !== document.body; a = a.parentElement) chain.unshift(name(a));
      over.push({
        sel: name(el),
        right: Math.round(r.right),
        w: Math.round(r.width),
        pos: cs.position,
        width: cs.width,
        minW: cs.minWidth,
        flex: cs.flex,
        chain: chain.slice(-5).join(' > '),
      });
    }
    return { scrollW: document.documentElement.scrollWidth, over };
  }, Number(W));
  console.log('scrollWidth ' + out.scrollW + ' / viewport ' + W + '  (+' + (out.scrollW - Number(W)) + 'px)');
  const seen = new Set();
  for (const o of out.over) {
    if (seen.has(o.chain)) continue;
    seen.add(o.chain);
    console.log('  ' + o.sel.padEnd(44) + ' right=' + o.right + ' w=' + o.w + ' pos=' + o.pos + ' width:' + o.width + ' min-width:' + o.minW);
    console.log('      ' + o.chain);
  }
  await b.close();
})();
