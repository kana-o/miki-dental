// カンプ画像の実寸 vs 実装ページの実寸（fullPage高さ）を突き合わせる第一次スクリーニング
import { Jimp } from 'jimp';
import { chromium } from 'playwright';
import fs from 'fs';
const DESIGNS = process.argv[2], BASE = process.argv[3];
const PAGES = [
 ['general','/general/'], ['periodontal','/general/periodontal/'], ['implant','/general/implant/'],
 ['aesthetic','/general/aesthetic/'], ['whitening','/general/whitening/'], ['preventive','/general/preventive/'],
 ['pediatric','/pediatric/'], ['pediatric-preventive','/pediatric/preventive/'],
 ['pediatric-orthodontics','/pediatric/orthodontics/'], ['space-maintainer','/pediatric/space-maintainer/'],
 ['sealant','/pediatric/sealant/'], ['clinic','/clinic/'], ['staff','/staff/'], ['recruit','/recruit/'],
 ['news','/news/'], ['news-detail','/news/detail/'], ['price','/price/'],
 ['reservation','/reservation/'], ['access','/access/'],
];
const VP = { pc: 1600, sp: 375 };
const browser = await chromium.launch();
const rows = [];
for (const [slug, path] of PAGES) {
  for (const vp of ['pc','sp']) {
    const dp = `${DESIGNS}/${slug}-${vp}.png`;
    if (!fs.existsSync(dp)) { rows.push([slug, vp, null, null, 'カンプ未取得']); continue; }
    const d = await Jimp.read(dp);
    const page = await browser.newPage({ viewport: { width: VP[vp], height: 900 } });
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
      await page.addStyleTag({ content: '#__bs_notify__{display:none!important}' });
      await page.evaluate(async () => {
        document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
        await Promise.all([...document.images].filter(i=>!i.complete).map(i=>new Promise(r=>{i.onload=i.onerror=r})));
      });
      await page.waitForTimeout(400);
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      const ow = await page.evaluate(() => document.documentElement.scrollWidth);
      const overflow = ow > VP[vp] + 1 ? `横スク ${ow}px` : '';
      const diff = h - d.height;
      const pct = d.height ? (diff / d.height * 100) : 0;
      rows.push([slug, vp, d.height, h, `${diff>=0?'+':''}${diff}px (${pct.toFixed(1)}%) ${overflow}`.trim()]);
    } catch(e) {
      rows.push([slug, vp, d.height, null, '取得失敗: '+e.message.slice(0,40)]);
    }
    await page.close();
  }
}
await browser.close();
const pad=(s,n)=>String(s??'-').padEnd(n);
console.log(pad('page',24)+pad('vp',4)+pad('カンプ高',10)+pad('実装高',10)+'差分');
console.log('-'.repeat(72));
for(const r of rows) console.log(pad(r[0],24)+pad(r[1],4)+pad(r[2],10)+pad(r[3],10)+r[4]);
