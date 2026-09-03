// Figma の画像fill（imageRef）を元画像のまま取得し、透過を保ったPNGとして書き出す。
// usage: node scripts/fig-img.mjs <imagefills.json> <imageRef> <out.png> [maxWidth]
import { Jimp } from 'jimp';
import fs from 'node:fs';

const [fillsPath, ref, out, maxW] = process.argv.slice(2);
const map = JSON.parse(fs.readFileSync(fillsPath, 'utf8')).meta.images;
const url = map[ref];
if (!url) {
  console.error('imageRef が見つかりません: ' + ref);
  process.exit(1);
}
const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
const im = await Jimp.read(buf);
const before = `${im.width}x${im.height} alpha=${im.hasAlpha()}`;
if (maxW && im.width > Number(maxW)) im.resize({ w: Number(maxW) });
await im.write(out);
console.log(`${out}  ${before} -> ${im.width}x${im.height}  ${fs.statSync(out).size} bytes`);
