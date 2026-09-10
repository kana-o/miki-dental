// 指定範囲で「文字がある行」の帯を列挙する（行送り・段落位置の比較用）
//   node scripts/text-rows.mjs <png> <x0> <x1> <y0> <y1> <背景hex>
import { Jimp } from 'jimp';
const [f, X0, X1, Y0, Y1, bgHex] = process.argv.slice(2);
const im = await Jimp.read(f);
const bg = [0, 2, 4].map((k) => parseInt(bgHex.slice(k, k + 2), 16));
const dark = (x, y) => {
  const i = (y * im.bitmap.width + x) * 4;
  return Math.abs(im.bitmap.data[i] - bg[0]) + Math.abs(im.bitmap.data[i + 1] - bg[1]) + Math.abs(im.bitmap.data[i + 2] - bg[2]) > 90;
};
const x0 = Number(X0), x1 = Number(X1);
let run = null;
const out = [];
for (let y = Number(Y0); y <= Number(Y1); y++) {
  let n = 0;
  for (let x = x0; x <= x1; x++) if (dark(x, y)) n++;
  if (n > 3) { if (run === null) run = y; }
  else if (run !== null) { out.push(run + '..' + (y - 1) + ' (h' + (y - run) + ')'); run = null; }
}
if (run !== null) out.push(run + '..' + Y1);
console.log(out.join('  '));
