// 横一列に点線（区切り線）が引かれている y を探す
//   node scripts/find-divider.mjs <png> <x0> <x1> <y0> <y1> <背景hex>
import { Jimp } from 'jimp';
const [f, X0, X1, Y0, Y1, bgHex] = process.argv.slice(2);
const im = await Jimp.read(f);
const bg = [0, 2, 4].map((k) => parseInt(bgHex.slice(k, k + 2), 16));
const differs = (x, y) => {
  const i = (y * im.bitmap.width + x) * 4;
  return Math.abs(im.bitmap.data[i] - bg[0]) + Math.abs(im.bitmap.data[i + 1] - bg[1]) + Math.abs(im.bitmap.data[i + 2] - bg[2]) > 25;
};
const x0 = Number(X0), x1 = Number(X1), w = x1 - x0 + 1;
let run = null;
for (let y = Number(Y0); y <= Number(Y1); y++) {
  let n = 0, runs = 0, prev = false;
  for (let x = x0; x <= x1; x++) {
    const d = differs(x, y);
    if (d && !prev) runs++;
    prev = d;
    if (d) n++;
  }
  // 点線 = 細切れの塊が30個以上、塗りつぶし率は 20〜70%
  const isDots = runs >= 30 && n / w > 0.2 && n / w < 0.75;
  if (isDots) { if (run === null) run = y; }
  else if (run !== null) { console.log('点線 y' + run + '..' + (y - 1)); run = null; }
}
if (run !== null) console.log('点線 y' + run + '..' + Y1);
