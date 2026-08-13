/**
 * Figma から書き出した巨大な画像を、実表示サイズに縮小して JPG 化する。
 *
 * 使い方:
 *   node scripts/resize-image.mjs <入力> <出力> <横幅px> [品質(既定78)]
 * 例:
 *   node scripts/resize-image.mjs src/img/footer/footer-01.png src/img/footer/footer-01.jpg 1600
 *
 * WebP は gulp（gulp-webp）が /src/img/ から自動生成するので、ここでは作らない。
 */
import { Jimp } from 'jimp';
import { writeFile } from 'node:fs/promises';

const [, , src, out, width, quality = '78'] = process.argv;

if (!src || !out || !width) {
  console.error('使い方: node scripts/resize-image.mjs <入力> <出力> <横幅px> [品質]');
  process.exit(1);
}

const image = await Jimp.read(src);
image.resize({ w: Number(width) });
const buffer = await image.getBuffer('image/jpeg', { quality: Number(quality) });
await writeFile(out, buffer);

console.log(`${out} — ${image.bitmap.width}x${image.bitmap.height} / ${Math.round(buffer.length / 1024)}KB`);
