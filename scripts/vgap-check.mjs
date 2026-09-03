// カンプと実装で同じテキストを目印にして縦位置を突き合わせ、
// 「どの区間でズレが増えたか」を出す。
//
// 累積ズレは下に行くほど大きくなるので、絶対値ではなく
// 隣り合う目印どうしの間隔の差（＝その区間で入れすぎ／足りない余白）を見る。
//
// usage: node scripts/vgap-check.mjs <figmaJson> <url> <designW> [最小差分px]
import { chromium } from 'playwright';
import fs from 'node:fs';

const [jsonPath, url, dWArg, minArg] = process.argv.slice(2);
const W = Number(dWArg);
const MIN = Number(minArg || 12);

const norm = (s) => (s || '').replace(/\s+/g, '').replace(/[（）()［］\[\]【】]/g, '').trim();

// --- カンプ側のテキスト位置 ---------------------------------------------------
const doc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let root = null;
const dmap = new Map();
const walk = (n) => {
  const b = n.absoluteBoundingBox;
  if (!root && b) root = b;
  if (n.type === 'TEXT' && n.characters && b && n.visible !== false) {
    const k = norm(n.characters);
    if (k.length >= 6 && k.length <= 80) {
      if (dmap.has(k)) dmap.set(k, null);       // 同じ文字列が複数あるものは使わない
      else dmap.set(k, Math.round(b.y - root.y));
    }
  }
  (n.children || []).forEach(walk);
};
Object.values(doc.nodes).forEach((v) => walk(v.document));

// --- 実装側 -------------------------------------------------------------------
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: W, height: 1000 } });
const pg = await ctx.newPage();
await pg.goto(url, { waitUntil: 'networkidle' });
await pg.evaluate(() => { document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; }); });
await pg.waitForTimeout(1200);
const impl = await pg.evaluate(() => {
  const out = {};
  const sel = 'main h1,main h2,main h3,main h4,main p,main li,main dt,main dd,main th,main td,main span';
  for (const el of document.querySelectorAll(sel)) {
    if (el.querySelector(sel)) continue;
    const t = (el.textContent || '').replace(/\s+/g, '').replace(/[（）()［］\[\]【】]/g, '').trim();
    if (t.length < 6 || t.length > 80) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 4) continue;
    if (out[t] !== undefined) { out[t] = null; continue; }
    out[t] = Math.round(r.top + scrollY);
  }
  return out;
});
await br.close();

// --- 目印を照合して、区間ごとのズレを出す ------------------------------------
const scale = W / (root ? root.width : W);
const pairs = [];
for (const [k, dy] of dmap) {
  if (dy == null) continue;
  const iy = impl[k];
  if (iy == null) continue;
  pairs.push({ k, d: Math.round(dy * scale), i: iy });
}
pairs.sort((a, b) => a.d - b.d);

console.log(`目印 ${pairs.length} 件で照合（カンプ幅 ${root ? Math.round(root.width) : '?'} → ${W}）\n`);
console.log('  カンプy  実装y   ズレ   区間差  目印');
let prev = null;
const bad = [];
for (const p of pairs) {
  const off = p.i - p.d;
  let delta = '';
  if (prev) {
    const dGap = p.d - prev.d;
    const iGap = p.i - prev.i;
    const diff = iGap - dGap;
    delta = (diff > 0 ? '+' : '') + diff;
    if (Math.abs(diff) >= MIN) bad.push({ from: prev.k, to: p.k, diff, dGap, iGap, dy: prev.d });
  }
  console.log(`  ${String(p.d).padStart(6)} ${String(p.i).padStart(7)} ${String((off > 0 ? '+' : '') + off).padStart(7)} ${String(delta).padStart(7)}  ${p.k.slice(0, 26)}`);
  prev = p;
}

console.log(`\n===== ズレが ${MIN}px 以上ふえた区間（${bad.length}件） =====`);
for (const b of bad.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff))) {
  console.log(`  ${b.diff > 0 ? '広い' : '狭い'} ${String(Math.abs(b.diff)).padStart(4)}px  カンプ${b.dGap} → 実装${b.iGap}   （カンプy=${b.dy}付近）`);
  console.log(`      「${b.from.slice(0, 24)}」→「${b.to.slice(0, 24)}」`);
}
