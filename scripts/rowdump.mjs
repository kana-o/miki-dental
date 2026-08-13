import { Jimp } from 'jimp';
// 指定yの行を一定間隔でRGBダンプする（写真やカードの境界を目視で特定する用）
const [png, y, step] = [process.argv[2], +process.argv[3], +(process.argv[4] ?? 5)];
const img = await Jimp.read(png);
const { data, width } = img.bitmap;
const out = [];
for (let x = 0; x < width; x += step) {
  const i = (y * width + x) * 4;
  out.push(`${x}:${data[i]},${data[i + 1]},${data[i + 2]}`);
}
console.log(out.join(' '));
