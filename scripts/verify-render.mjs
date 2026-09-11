// 書き出した画像が、カンプPNGの同じ位置と一致しているか照合する
//   node scripts/verify-render.mjs <map.json> <designPng> <frameDx> <frameDy>
// map.json の各要素に nodeDx / nodeDy / expect が必要。
import fs from 'node:fs';
import { Jimp } from 'jimp';

const [mapPath] = process.argv.slice(2);
const items = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const cache = new Map();
const design = async (p) => {
  if (!cache.has(p)) cache.set(p, await Jimp.read(p));
  return cache.get(p);
};

const fingerprint = (im) => {
  const c = im.clone().resize({ w: 16, h: 16 }).greyscale();
  const v = [];
  for (let i = 0; i < c.bitmap.data.length; i += 4) v.push(c.bitmap.data[i]);
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  return v.map((x) => (x > avg ? 1 : 0));
};
const dist = (a, b) => a.reduce((n, x, i) => n + (x !== b[i] ? 1 : 0), 0);

let ng = 0;
for (const it of items) {
  if (!fs.existsSync(it.out)) { console.log('  × ファイルなし ' + it.out); continue; }
  const dim = await design(it.design);
  const crop = dim.clone().crop({ x: it.dx, y: it.dy, w: Math.round(it.expect[0]), h: Math.round(it.expect[1]) });
  const mine = await Jimp.read(it.out);
  const d = dist(fingerprint(crop), fingerprint(mine));
  const mark = d <= 40 ? 'OK ' : '★NG';
  if (d > 40) ng++;
  console.log('  ' + mark + ' 差 ' + String(d).padStart(3) + '/256  ' + it.out.replace('src/img/', ''));
}
console.log(ng === 0 ? '\nすべてカンプと一致' : '\n' + ng + ' 件がカンプと不一致');
