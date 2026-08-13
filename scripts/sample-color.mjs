/**
 * カンプ画像から指定座標の色を採取する。
 * get_design_context が画像塗りを拾えないことがあるため、実際の見た目を確認する用。
 *
 * 使い方: node scripts/sample-color.mjs <画像> <x,y> <x,y> ...
 */
import { Jimp } from 'jimp';

const img = await Jimp.read(process.argv[2]);
for (const spec of process.argv.slice(3)) {
  const [x, y] = spec.split(',').map(Number);
  const hex = img.getPixelColor(x, y).toString(16).padStart(8, '0');
  console.log(`(${x},${y}) = #${hex.slice(0, 6)}`);
}
