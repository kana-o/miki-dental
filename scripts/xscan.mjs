import { Jimp } from 'jimp';
// 指定yの行で「白い画素」の左端/右端を返す（青地の上の白帯・白文字の位置測定用）。
// 使い方: node scripts/xscan.mjs <画像> <y1,y2,y3...>
const png = process.argv[2];
const ys = process.argv[3].split(',').map(Number);
const dark = process.argv[4];
const img = await Jimp.read(png);
const { data, width } = img.bitmap;
for (const y of ys) {
  let min = -1, max = -1, n = 0;
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const hit = dark === 'dark'
      ? (data[i] < 140 && data[i + 1] < 140 && data[i + 2] < 180)
      : dark === 'nz'
        // 背景 #f2f2f2 以外（写真・カードの輪郭を拾う）
        ? (Math.abs(data[i] - 242) > 12 || Math.abs(data[i + 1] - 242) > 12 || Math.abs(data[i + 2] - 242) > 12)
        : (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200);
    if (hit) {
      if (min < 0) min = x;
      max = x; n++;
    }
  }
  console.log(`y=${y}: ${dark === 'dark' ? '濃色' : dark === 'nz' ? '非背景' : '白'} x=${min}..${max} (${n}px)`);
}
