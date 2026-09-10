// 縦1列 / 横1行 の色の切り替わり位置を出す
//   node scripts/scan-line.mjs <png> col <x> <y0> <y1>
//   node scripts/scan-line.mjs <png> row <y> <x0> <x1>
import { Jimp } from 'jimp';
const [f, dir, a, b, c] = process.argv.slice(2);
const im = await Jimp.read(f);
const px = (x, y) => {
  const i = (y * im.bitmap.width + x) * 4;
  return [im.bitmap.data[i], im.bitmap.data[i + 1], im.bitmap.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
};
let prev = null;
for (let t = Number(b); t <= Number(c); t++) {
  const col = dir === 'col' ? px(Number(a), t) : px(t, Number(a));
  if (col !== prev) { console.log((dir === 'col' ? 'y' : 'x') + t + '  #' + col); prev = col; }
}
