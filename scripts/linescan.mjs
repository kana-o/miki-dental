import { Jimp } from 'jimp';
// カンプ画像から「文字行の開始y」と「行送り」を実測する。
// 使い方: node scripts/linescan.mjs <画像> <開始y> <高さ> [<左x> <右x>] [dark]
const [png, y0, h] = [process.argv[2], +process.argv[3], +process.argv[4]];
const xL = +(process.argv[5] ?? 15);
const xR = +(process.argv[6] ?? 360);
const dark = process.argv[7] === 'dark';
const img = await Jimp.read(png);
const { data, width } = img.bitmap;
const rows = [];
for (let y = y0; y < y0 + h; y++) {
  let ink = 0;
  for (let x = xL; x < xR; x++) {
    const i = (y * width + x) * 4;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const hit = dark ? (r < 120 && g < 120 && b < 140) : (r > 200 && g > 200 && b > 200);
    if (hit) ink++;
  }
  rows.push(ink);
}
let inBand = false;
const starts = [];
rows.forEach((n, i) => {
  if (n > 3 && !inBand) { inBand = true; starts.push(y0 + i); }
  if (n <= 3 && inBand) inBand = false;
});
console.log('行の開始y:', starts.join(', '));
console.log('行送り:', starts.slice(1).map((s, i) => s - starts[i]).join(', '));
