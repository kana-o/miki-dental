import { chromium } from 'playwright';
const out = process.argv[2];
const br = await chromium.launch();
for (const [w,h,tag] of [[1600,470,'pc'],[375,280,'sp']]) {
  const ctx = await br.newContext({ viewport:{width:w,height:h} });
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:3000/general/', { waitUntil:'networkidle' });
  await pg.screenshot({ path: `${out}/fv-impl-${tag}.png`, clip:{x:0,y:0,width:w,height:h} });
  await ctx.close();
}
await br.close();
console.log('ok');
