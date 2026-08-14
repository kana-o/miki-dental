// 同じカンプ画像どうしを y方向にずらして比べ、この差分指標の感度を見る
import { Jimp } from 'jimp';
const [png, y0, h] = [process.argv[2], +process.argv[3], +process.argv[4]];
const img = await Jimp.read(png);
const W = img.bitmap.width;
const d = img.bitmap.data;
const at = (x, y) => ((y * W + x) << 2);
for (const shift of [0, 1, 2, 3, 5]) {
  let differing = 0, total = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < W; x++) {
      const a = at(x, y0 + y), b = at(x, y0 + y + shift);
      const diff = Math.abs(d[a] - d[b]) + Math.abs(d[a + 1] - d[b + 1]) + Math.abs(d[a + 2] - d[b + 2]);
      if (diff > 90) differing++;
      total++;
    }
  }
  console.log(`  ${shift}px ずらし → ${((differing / total) * 100).toFixed(1)}%`);
}
