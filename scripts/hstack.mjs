// 2枚を左右に並べた比較画像を作る。使い方: node scripts/hstack.mjs <左> <右> <出力>
import { Jimp } from 'jimp';
const [a, b, out] = process.argv.slice(2);
const [ia, ib] = await Promise.all([Jimp.read(a), Jimp.read(b)]);
const gap = 12;
const w = ia.bitmap.width + ib.bitmap.width + gap;
const h = Math.max(ia.bitmap.height, ib.bitmap.height);
const canvas = new Jimp({ width: w, height: h, color: 0xff00ffff });
canvas.composite(ia, 0, 0);
canvas.composite(ib, ia.bitmap.width + gap, 0);
await canvas.write(out);
console.log(`${out} — ${w}x${h}`);
