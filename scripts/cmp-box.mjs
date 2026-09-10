// カンプと実装の同じ領域を「上下に並べ＋差分」で1枚に出す
//   node scripts/cmp-box.mjs <デザインPNG名> <designY> <url> <幅> <implY> <x> <w> <h> <out>
import { chromium } from 'playwright';
import { Jimp } from 'jimp';
const [name, dY, url, W, iY, X, w, h, out] = process.argv.slice(2);

const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: Number(W), height: 1000 } });
await pg.goto(url, { waitUntil: 'networkidle' });
await pg.evaluate(() => new Promise((r) => { window.scrollTo(0, document.body.scrollHeight); setTimeout(r, 800); }));
await pg.evaluate(() => window.scrollTo(0, 0));
await pg.screenshot({ path: out + '.impl.png', fullPage: true });
await br.close();

const comp = await Jimp.read('.page-info/designs/' + name);
const impl = await Jimp.read(out + '.impl.png');
const x = Number(X), ww = Number(w), hh = Number(h);
const a = comp.clone().crop({ x, y: Number(dY), w: ww, h: hh });
const b = impl.clone().crop({ x, y: Number(iY), w: ww, h: hh });

// 差分（|カンプ − 実装|）。一致＝黒
const d = a.clone();
for (let i = 0; i < d.bitmap.data.length; i += 4) {
  for (let k = 0; k < 3; k++) d.bitmap.data[i + k] = Math.abs(a.bitmap.data[i + k] - b.bitmap.data[i + k]);
  d.bitmap.data[i + 3] = 255;
}
const canvas = new Jimp({ width: ww, height: hh * 3 + 16, color: 0xff00ffff });
canvas.composite(a, 0, 0).composite(b, 0, hh + 8).composite(d, 0, hh * 2 + 16);
await canvas.write(out);
let diff = 0;
for (let i = 0; i < d.bitmap.data.length; i += 4)
  if (d.bitmap.data[i] + d.bitmap.data[i + 1] + d.bitmap.data[i + 2] > 90) diff++;
console.log('不一致 ' + (diff / (ww * hh) * 100).toFixed(2) + '%  -> ' + out + '（上:カンプ 中:実装 下:差分）');
