// デザインPNGの指定矩形内で「背景と違う色」の行/列の範囲を出す
//   node scripts/probe-box.mjs <png> <x> <y> <w> <h> [背景hex]
import { Jimp } from 'jimp';
const [f, X, Y, W, H, bgHex] = process.argv.slice(2);
const im = await Jimp.read(f);
const x0 = Number(X), y0 = Number(Y), w = Number(W), h = Number(H);
const px = (x, y) => {
  const i = (y * im.bitmap.width + x) * 4;
  return [im.bitmap.data[i], im.bitmap.data[i + 1], im.bitmap.data[i + 2]];
};
const bg = bgHex ? [0, 2, 4].map((k) => parseInt(bgHex.slice(k, k + 2), 16)) : px(x0, y0);
console.log('基準色 rgb(' + bg.join(',') + ')');
const differs = (c) => Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]) > 24;

const rows = [], cols = [];
for (let y = y0; y < y0 + h; y++) {
  let n = 0;
  for (let x = x0; x < x0 + w; x++) if (differs(px(x, y))) n++;
  if (n > 2) rows.push(y);
}
for (let x = x0; x < x0 + w; x++) {
  let n = 0;
  for (let y = y0; y < y0 + h; y++) if (differs(px(x, y))) n++;
  if (n > 2) cols.push(x);
}
console.log('縦: y' + rows[0] + '..' + rows[rows.length - 1] + ' (高さ ' + (rows[rows.length - 1] - rows[0] + 1) + ')');
console.log('横: x' + cols[0] + '..' + cols[cols.length - 1] + ' (幅 ' + (cols[cols.length - 1] - cols[0] + 1) + ')');
