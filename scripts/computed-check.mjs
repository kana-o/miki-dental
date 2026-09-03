import { chromium } from 'playwright';
const B = 'http://localhost:3000';
const CASES = [
  ['/general/periodontal/', '.icon-check', ['width','height','backgroundImage']],
  ['/price/', '.icon-check', ['width','height']],
  ['/general/whitening/', '.icon-check', ['width','height']],
  ['/recruit/', '.cta__tel-number', ['fontSize','fontWeight','color','lineHeight']],
  ['/recruit/', '.cta__tel-icon', ['width','height','backgroundColor']],
  ['/general/implant/', '.implant-intro__text', ['fontSize','fontWeight','color','lineHeight','marginTop']],
  ['/general/preventive/', '.preventive-text', ['fontSize','lineHeight','color']],
  ['/pediatric/', '.pediatric-lead p', ['fontSize','lineHeight','color']],
  ['/general/whitening/', '.whitening-dual__text p', ['fontSize','lineHeight','color']],
  ['/pediatric/orthodontics/', '.pedortho-text', ['fontSize','lineHeight','color','marginTop']],
  ['/staff/', '.staff-doctor__policy-text', ['fontSize','lineHeight','color']],
  ['/price/', '.price-table-block__note', ['fontSize','lineHeight','color','marginTop']],
];
const br = await chromium.launch();
for (const vp of [[1600,900,'pc'],[375,812,'sp']]) {
  const ctx = await br.newContext({ viewport: { width: vp[0], height: vp[1] } });
  const pg = await ctx.newPage();
  console.log('===== ' + vp[2] + ' =====');
  for (const [path, sel, props] of CASES) {
    await pg.goto(B + path, { waitUntil: 'domcontentloaded' });
    const r = await pg.evaluate(([s, ps]) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const c = getComputedStyle(el);
      return ps.map(p => p + '=' + c[p]).join('  ');
    }, [sel, props]);
    console.log((path + ' ' + sel).padEnd(48) + (r ?? '!! 要素なし'));
  }
  await ctx.close();
}
await br.close();
