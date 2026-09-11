// 横方向に一定幅そろった色の帯（タグ）の y 範囲を列挙する
//   node scripts/find-band.mjs <png> <x0> <x1> <y0> <y1> <hex> <許容> <最小幅>
import { Jimp } from 'jimp';
const [f, X0, X1, Y0, Y1, hex, TOL, MINW] = process.argv.slice(2);
const im = await Jimp.read(f);
const t = [0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16));
const tol = Number(TOL), minw = Number(MINW);
const hit = (x, y) => {
  const i = (y * im.bitmap.width + x) * 4;
  return Math.abs(im.bitmap.data[i] - t[0]) + Math.abs(im.bitmap.data[i + 1] - t[1]) + Math.abs(im.bitmap.data[i + 2] - t[2]) < tol;
};
let run = null;
for (let y = Number(Y0); y <= Number(Y1); y++) {
  let n = 0;
  for (let x = Number(X0); x <= Number(X1); x++) if (hit(x, y)) n++;
  if (n >= minw) { if (run === null) run = y; }
  else if (run !== null) { if (y - run >= 20) console.log('  y' + run + '..' + (y - 1) + ' (h' + (y - run) + ')'); run = null; }
}
