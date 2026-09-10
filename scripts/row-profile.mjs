// 指定した y 範囲について、各行の x サンプル色を並べて出す（層の境目を掴む用）
//   node scripts/row-profile.mjs <png> <y0> <y1> <step> <x...>
import { Jimp } from 'jimp';
const [f, y0, y1, step, ...xs] = process.argv.slice(2);
const im = await Jimp.read(f);
const hex = (x, y) => {
  const i = (y * im.bitmap.width + x) * 4;
  return [im.bitmap.data[i], im.bitmap.data[i + 1], im.bitmap.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
};
let prev = '';
for (let y = Number(y0); y <= Number(y1); y += Number(step)) {
  const row = xs.map((x) => hex(Number(x), y)).join(' ');
  if (row !== prev) { console.log('y' + y + '  ' + row); prev = row; }
}
