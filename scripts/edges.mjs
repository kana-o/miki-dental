// 1本の線上で「背景色と違う区間」を列挙する（写真や装飾の端を測る用）
//   node scripts/edges.mjs <png> row|col <位置> <開始> <終了> <背景hex> [許容] [最小長]
import { Jimp } from 'jimp';
const [f, dir, pos, a, b, bgHex, tolArg, minArg] = process.argv.slice(2);
const im = await Jimp.read(f);
const bg = [0, 2, 4].map((k) => parseInt(bgHex.slice(k, k + 2), 16));
const tol = Number(tolArg || 40);
const min = Number(minArg || 4);
const at = (t) => {
  const x = dir === 'row' ? t : Number(pos);
  const y = dir === 'row' ? Number(pos) : t;
  const i = (y * im.bitmap.width + x) * 4;
  const c = [im.bitmap.data[i], im.bitmap.data[i + 1], im.bitmap.data[i + 2]];
  return Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]) > tol;
};
let start = null;
const out = [];
for (let t = Number(a); t <= Number(b); t++) {
  if (at(t)) { if (start === null) start = t; }
  else if (start !== null) { if (t - start >= min) out.push(start + '..' + (t - 1) + ' (' + (t - start) + ')'); start = null; }
}
if (start !== null) out.push(start + '..' + b + ' (' + (Number(b) - start + 1) + ')');
console.log((dir === 'row' ? 'y=' : 'x=') + pos + '  ' + (out.join('  |  ') || '(なし)'));
