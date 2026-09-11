// 差し替え前の素材とカンプの候補位置を突き合わせ、ページ×サイズのグループごとに
// 1対1で割り当て直す（同じノードが重複して選ばれないようにする）。
//   node scripts/rematch.mjs <groups.json> <out.json>
// groups.json: [{ key, design, items:[{out, orig, nodeId}], cands:[{id,dx,dy,w,h}] }]
import fs from 'node:fs';
import { Jimp } from 'jimp';

const [inPath, outPath] = process.argv.slice(2);
const groups = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const cache = new Map();
const load = async (p) => { if (!cache.has(p)) cache.set(p, await Jimp.read(p)); return cache.get(p); };

// 中央60%を 6x6 の RGB 平均にする（トリミング違いに強い指紋）
const sig = (im) => {
  const W = im.bitmap.width, H = im.bitmap.height;
  const c = im.clone()
    .crop({ x: Math.round(W * 0.2), y: Math.round(H * 0.2), w: Math.round(W * 0.6), h: Math.round(H * 0.6) })
    .resize({ w: 6, h: 6 });
  const v = [];
  for (let i = 0; i < c.bitmap.data.length; i += 4) v.push(c.bitmap.data[i], c.bitmap.data[i + 1], c.bitmap.data[i + 2]);
  return v;
};
const diff = (a, b) => a.reduce((n, x, i) => n + Math.abs(x - b[i]), 0) / a.length;

const res = [];
for (const g of groups) {
  const dim = await load(g.design);
  const cands = g.cands.filter((c) =>
    c.dx >= 0 && c.dy >= 0 && c.dx + c.w <= dim.bitmap.width && c.dy + c.h <= dim.bitmap.height);
  const csig = [];
  for (const c of cands) {
    csig.push(sig(dim.clone().crop({ x: Math.round(c.dx), y: Math.round(c.dy), w: Math.round(c.w), h: Math.round(c.h) })));
  }
  const isig = [];
  for (const it of g.items) isig.push(fs.existsSync(it.orig) ? sig(await Jimp.read(it.orig)) : null);

  const cost = [];
  for (let i = 0; i < g.items.length; i++) {
    if (!isig[i]) continue;
    for (let k = 0; k < cands.length; k++) cost.push([diff(isig[i], csig[k]), i, k]);
  }
  cost.sort((a, b) => a[0] - b[0]);
  const ui = new Set(), uk = new Set();
  for (const [d, i, k] of cost) {
    if (ui.has(i) || uk.has(k)) continue;
    ui.add(i); uk.add(k);
    const it = g.items[i], c = cands[k];
    const changed = c.id !== it.nodeId;
    if (changed) console.log('  ★変更 ' + it.out.replace('src/img/', '').padEnd(38) + ' ' + it.nodeId + ' -> ' + c.id + '  差' + d.toFixed(1));
    res.push({ nodeId: c.id, out: it.out, expect: [c.w, c.h], dx: c.dx, dy: c.dy, design: g.design, changed });
  }
}
fs.writeFileSync(outPath, JSON.stringify(res, null, 1));
console.log('割り当て ' + res.length + ' 件 / 変更 ' + res.filter((r) => r.changed).length + ' 件');
