// カンプPNGと実装スクショの同じ縦位置帯を並べて1枚に出力する
// usage: node scripts/cmp-region.mjs <url> <compPng> <designW> <y> <h> <out.png>
import { chromium } from 'playwright';
import { Jimp } from 'jimp';
const [url, comp, dW, y, h, out] = process.argv.slice(2);
const W = Number(dW), Y = Number(y), H = Number(h);
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: W, height: 900 } });
const pg = await ctx.newPage();
await pg.goto(url, { waitUntil: 'networkidle' });
await pg.evaluate(() => new Promise(r => { window.scrollTo(0, document.body.scrollHeight); setTimeout(r, 600); }));
await pg.evaluate(() => window.scrollTo(0, 0));
await pg.screenshot({ path: out + '.impl.png', fullPage: true });
await br.close();

const ci = await Jimp.read(comp);
const s = ci.width / W;
ci.crop({ x: 0, y: Math.round(Y * s), w: ci.width, h: Math.round(H * s) });
if (ci.width !== W) ci.resize({ w: W });
const ii = await Jimp.read(out + '.impl.png');
ii.crop({ x: 0, y: Y, w: W, h: Math.min(H, ii.height - Y) });
const canvas = new Jimp({ width: W * 2 + 20, height: Math.max(ci.height, ii.height), color: 0xff00ffff });
canvas.composite(ci, 0, 0);
canvas.composite(ii, W + 20, 0);
if (canvas.width > 1400) canvas.resize({ w: 1400 });
await canvas.write(out);
console.log(out, canvas.width + 'x' + canvas.height, '(左=カンプ 右=実装)');
