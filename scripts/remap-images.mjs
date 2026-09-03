// 実装の <img> と カンプの画像ノードを「描画位置」で対応付ける。
// 内容の類似度で照合すると似た写真同士を取り違えるため、位置で紐づける。
//
// usage: node scripts/remap-images.mjs <url> <figmaNodesJson> <designW> [--apply <imagefills.json>]
import { chromium } from 'playwright';
import { Jimp } from 'jimp';
import fs from 'node:fs';

const [url, nodesPath, dWArg, applyFlag, fillsPath] = process.argv.slice(2);
const W = Number(dWArg);
const APPLY = applyFlag === '--apply';

// --- カンプ側：画像fillを持つノードの矩形 -----------------------------------
const doc = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));
let root = null;
const nodes = [];
const walk = (n, clip) => {
  const b = n.absoluteBoundingBox;
  if (!root && b) root = b;
  for (const f of n.fills || []) {
    if (f.type === 'IMAGE' && f.imageRef && b) {
      // マスクされている場合、実際に見えるのは親（クリップ枠）のサイズ
      const box = clip || b;
      nodes.push({ ref: f.imageRef, name: n.name,
        x: Math.round(box.x - root.x), y: Math.round(box.y - root.y),
        w: Math.round(box.width), h: Math.round(box.height) });
    }
  }
  // Mask group / clipsContent のフレームは子のクリップ枠になる
  const nextClip = (n.type === 'GROUP' && /mask/i.test(n.name || '')) || n.clipsContent ? b : clip;
  (n.children || []).forEach((c) => walk(c, nextClip));
};
Object.values(doc.nodes).forEach((v) => walk(v.document, null));

// --- 実装側：<img> の矩形 ---------------------------------------------------
const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: W, height: 900 } });
await pg.goto(url, { waitUntil: 'networkidle' });
await pg.evaluate(() => { document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; }); });
await pg.waitForTimeout(1200);
const imgs = await pg.evaluate(() => [...document.querySelectorAll('main img')].map((i) => {
  const b = i.getBoundingClientRect();
  return { src: new URL(i.currentSrc || i.src).pathname, cls: i.className,
    x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height) };
}));
await br.close();

// --- 位置で対応付け ---------------------------------------------------------
console.log(`カンプ画像ノード ${nodes.length} / 実装 <img> ${imgs.length}\n`);
const used = new Set();
const pairs = [];
for (const im of imgs) {
  let best = null;
  for (const n of nodes) {
    if (used.has(n.ref + n.y)) continue;
    // 位置は縦にドリフトするので、横位置とサイズを重視する
    const d = Math.abs(n.x - im.x) * 2 + Math.abs(n.w - im.w) * 2 + Math.abs(n.h - im.h) * 2
            + Math.abs(n.y - im.y) * 0.25;
    if (!best || d < best.d) best = { d, n };
  }
  if (best && best.d < 200) {
    used.add(best.n.ref + best.n.y);
    pairs.push({ im, n: best.n, d: best.d });
  } else {
    pairs.push({ im, n: null, d: best ? best.d : Infinity });
  }
}
for (const p of pairs) {
  const tag = p.n ? `← ${p.n.ref.slice(0, 10)} "${(p.n.name || '').slice(0, 14)}" (d=${p.d.toFixed(0)})` : `← 対応なし (d=${p.d.toFixed(0)})`;
  console.log(`  ${p.im.src.split('/').slice(-2).join('/').padEnd(34)} ${String(p.im.w).padStart(4)}x${String(p.im.h).padEnd(4)} ${tag}`);
}

if (!APPLY) { console.log('\n（--apply <imagefills.json> を付けると実ファイルを置き換えます）'); process.exit(0); }

const map = JSON.parse(fs.readFileSync(fillsPath, 'utf8')).meta.images;
let ok = 0;
for (const p of pairs) {
  if (!p.n) continue;
  const file = 'src' + p.im.src.replace('/assets', '').replace(/\.webp$/, '.jpg');
  if (!fs.existsSync(file)) { console.log(`  skip ${file}（ファイルなし）`); continue; }
  const u = map[p.n.ref];
  if (!u) continue;
  const out = await Jimp.read(Buffer.from(await (await fetch(u)).arrayBuffer()));
  const target = Math.min(out.width, p.im.w * 2);
  if (out.width > target) out.resize({ w: target });
  out.quality = 88;
  await out.write(file);
  const c = out.getPixelColor(1, 1);
  console.log(`  ✓ ${file}  ${out.width}x${out.height}  角=#${((c >>> 8).toString(16).padStart(6, '0'))}`);
  ok++;
}
console.log(`\n置換 ${ok} 件`);
