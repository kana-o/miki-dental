// 角丸マスク付きで書き出されて四隅が黒くなっている画像を、
// Figma の元画像（imageRef のオリジナル＝マスク前）で置き換える。
//
// 対応付けは「中央部分の見た目が一致するもの」で行う（マスクの有無は中央に影響しないため）。
// usage: node scripts/refetch-masked.mjs <imagefills.json> <figmaNodesJson,...> <targetFile,...>
import { Jimp } from 'jimp';
import fs from 'node:fs';

const [fillsPath, nodesArg, filesArg] = process.argv.slice(2);
const map = JSON.parse(fs.readFileSync(fillsPath, 'utf8')).meta.images;

// --- カンプJSONから imageRef を集める ---------------------------------------
const refs = new Set();
for (const nf of nodesArg.split(',')) {
  const doc = JSON.parse(fs.readFileSync(nf, 'utf8'));
  const walk = (n) => {
    for (const f of n.fills || []) if (f.type === 'IMAGE' && f.imageRef) refs.add(f.imageRef);
    (n.children || []).forEach(walk);
  };
  Object.values(doc.nodes).forEach((v) => walk(v.document));
}
console.log(`カンプ内の画像参照: ${refs.size} 件`);

// --- 指紋（中央80%を16x16グレースケール）で突き合わせる ----------------------
const fingerprint = async (im) => {
  const w = im.width, h = im.height;
  const c = im.clone().crop({ x: Math.round(w * 0.1), y: Math.round(h * 0.1), w: Math.round(w * 0.8), h: Math.round(h * 0.8) });
  c.resize({ w: 16, h: 16 });
  const v = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const i = (16 * y + x) * 4, d = c.bitmap.data;
    v.push((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000);
  }
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return v.map((x) => x - m);
};
const dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));

const cand = [];
for (const ref of refs) {
  const url = map[ref];
  if (!url) continue;
  try {
    const im = await Jimp.read(Buffer.from(await (await fetch(url)).arrayBuffer()));
    cand.push({ ref, im, fp: await fingerprint(im) });
  } catch { /* 取得できないものは飛ばす */ }
}
console.log(`取得できた元画像: ${cand.length} 件\n`);

let ok = 0, ng = 0;
for (const file of filesArg.split(',')) {
  const local = await Jimp.read(file);
  const fp = await fingerprint(local);
  const scored = cand.map((c) => ({ d: dist(fp, c.fp), c })).sort((x, y) => x.d - y.d);
  const best = scored[0], second = scored[1];
  if (!best || best.d > 300) { console.log(`  ✗ ${file}  一致なし (d=${best ? best.d.toFixed(0) : '-'})`); ng++; continue; }
  // 2番目と僅差なら取り違えの危険があるので置き換えない
  if (second && second.d < best.d * 1.25) {
    console.log(`  ? ${file}  曖昧 (1位 ${best.d.toFixed(0)} / 2位 ${second.d.toFixed(0)}) → 手動確認`);
    ng++; continue;
  }
  const out = best.c.im.clone();
  if (out.width > local.width * 2) out.resize({ w: local.width * 2 });   // 2倍解像度で十分
  out.quality = 88;
  await out.write(file);
  const p = (x, y) => { const v = out.getPixelColor(x, y); return ((v >>> 8).toString(16).padStart(6, '0')); };
  console.log(`  ✓ ${file}  ← ${best.c.ref.slice(0, 10)} (d=${best.d.toFixed(0)})  ${out.width}x${out.height} 角=#${p(1, 1)}`);
  ok++;
}
console.log(`\n置換 ${ok} 件 / 未一致 ${ng} 件`);
