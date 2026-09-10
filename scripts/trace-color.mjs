// 指定色に近い画素の、行ごと・列ごとの端を出す（模様の輪郭を掴む用）
//   node scripts/trace-color.mjs <png> <x0> <y0> <w> <h> <hex> <許容> <row|col> <step>
import { Jimp } from 'jimp';
const [f, X, Y, W, H, hex, tolA, dir, stepA] = process.argv.slice(2);
const im = await Jimp.read(f);
const t = [0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16));
const tol = Number(tolA), step = Number(stepA || 20);
const hit = (x, y) => {
  const i = (y * im.bitmap.width + x) * 4;
  return Math.abs(im.bitmap.data[i] - t[0]) + Math.abs(im.bitmap.data[i + 1] - t[1]) + Math.abs(im.bitmap.data[i + 2] - t[2]) < tol;
};
const x0 = Number(X), y0 = Number(Y), w = Number(W), h = Number(H);
if (dir === 'row') {
  for (let y = y0; y < y0 + h; y += step) {
    let a = null, b = null, n = 0;
    for (let x = x0; x < x0 + w; x++) if (hit(x, y)) { if (a === null) a = x; b = x; n++; }
    if (n > 3) console.log('y' + y + '  x' + a + '..' + b + '  (' + n + '画素)');
  }
} else {
  for (let x = x0; x < x0 + w; x += step) {
    let a = null, b = null, n = 0;
    for (let y = y0; y < y0 + h; y++) if (hit(x, y)) { if (a === null) a = y; b = y; n++; }
    if (n > 3) console.log('x' + x + '  y' + a + '..' + b + '  (' + n + '画素)');
  }
}
