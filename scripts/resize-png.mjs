/**
 * 透過を保ったままPNGを縮小する（切り抜き写真用）。
 * JPG化すると透明部分が黒くなるため、透過が必要な画像はこちらを使う。
 *
 * 使い方: node scripts/resize-png.mjs <入力> <出力> <横幅px>
 */
import { Jimp } from 'jimp';
import { writeFile } from 'node:fs/promises';

const [, , src, out, width] = process.argv;
if (!src || !out || !width) {
  console.error('使い方: node scripts/resize-png.mjs <入力> <出力> <横幅px>');
  process.exit(1);
}

const image = await Jimp.read(src);
image.resize({ w: Number(width) });
const buffer = await image.getBuffer('image/png');
await writeFile(out, buffer);
console.log(`${out} — ${image.bitmap.width}x${image.bitmap.height} / ${Math.round(buffer.length / 1024)}KB`);
