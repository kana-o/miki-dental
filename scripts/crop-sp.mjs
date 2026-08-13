/**
 * カンプのSP表示領域に合わせて元画像を切り出す。
 * 使い方: node scripts/crop-sp.mjs <元画像> <出力> <x> <y> <w> <h> <出力幅>
 */
import { Jimp } from 'jimp';
const [src, out, x, y, w, h, outW] = process.argv.slice(2).map((v, i) => (i >= 2 ? Number(v) : v));
const img = await Jimp.read(src);
img.crop({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
img.resize({ w: outW, h: Math.round((outW * h) / w) });
await img.write(out, { quality: 82 });
console.log(`${out} — ${img.bitmap.width}x${img.bitmap.height}`);
