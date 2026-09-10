// 指定矩形内で条件に合う画素の bbox を出す
//   node scripts/probe-hue.mjs <png> <x> <y> <w> <h> <blue|orange|dark|nonbg:hex:許容>
import { Jimp } from 'jimp';
const [f, X, Y, W, H, mode] = process.argv.slice(2);
const im = await Jimp.read(f);
const g = (x, y) => {
  const i = (y * im.bitmap.width + x) * 4;
  return [im.bitmap.data[i], im.bitmap.data[i + 1], im.bitmap.data[i + 2]];
};
let test;
if (mode === 'blue') test = (c) => c[2] - c[0] > 34;
else if (mode === 'orange') test = (c) => c[0] - c[2] > 60;
else if (mode === 'white') test = (c) => c[0] > 243 && c[1] > 243 && c[2] > 243;
else if (mode === 'dark') test = (c) => c[0] + c[1] + c[2] < 260;
else {
  const [, hex, tolArg] = mode.split(':');
  const bg = [0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16));
  const tol = Number(tolArg || 30);
  test = (c) => Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]) > tol;
}
const x0 = Number(X), y0 = Number(Y);
let a = 1e9, b = 1e9, c2 = -1, d = -1, n = 0;
for (let y = y0; y < y0 + Number(H); y++)
  for (let x = x0; x < x0 + Number(W); x++)
    if (test(g(x, y))) { n++; if (x < a) a = x; if (x > c2) c2 = x; if (y < b) b = y; if (y > d) d = y; }
console.log(n + '画素  x' + a + '..' + c2 + ' y' + b + '..' + d + '  (' + (c2 - a + 1) + 'x' + (d - b + 1) + ')');
