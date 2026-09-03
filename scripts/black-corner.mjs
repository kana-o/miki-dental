// 角丸マスク付きで書き出された画像（四隅が黒く焼き込まれている）を検出する。
// JPEG は透過を持てないため、Figmaで角丸マスクを掛けたまま書き出すと角が黒になる。
import { Jimp } from 'jimp';
import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/img'];
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jpe?g|png)$/i.test(e.name)) files.push(p);
  }
};
roots.forEach(walk);

const hits = [];
for (const f of files) {
  let im;
  try { im = await Jimp.read(f); } catch { continue; }
  const w = im.width, h = im.height;
  const px = (x, y) => { const c = im.getPixelColor(x, y); return [(c >>> 24) & 255, (c >>> 16) & 255, (c >>> 8) & 255, c & 255]; };
  // 四隅の 2px 内側を見る（1px はアンチエイリアスの可能性）
  const corners = [px(1, 1), px(w - 2, 1), px(1, h - 2), px(w - 2, h - 2)];
  const dark = corners.filter(([r, g, b, a]) => a > 200 && r < 24 && g < 24 && b < 24).length;
  if (dark >= 3) {
    // 中央が黒くないこと（真っ黒な画像を除外）
    const [cr, cg, cb] = px(w >> 1, h >> 1);
    if (cr + cg + cb > 90) hits.push({ f, w, h, dark });
  }
}
console.log(`検査 ${files.length} 枚 → 角が黒く焼き込まれている画像 ${hits.length} 枚`);
const byDir = {};
for (const x of hits) { const d = path.dirname(x.f); (byDir[d] ||= []).push(path.basename(x.f)); }
for (const [d, list] of Object.entries(byDir).sort()) {
  console.log(`\n  ${d}  (${list.length}枚)`);
  console.log('    ' + list.join(', '));
}
