/**
 * カンプ画像から指定範囲を切り出す。
 * get_design_context が拾えない画像塗り（テクスチャ等）の確認・書き出し用。
 *
 * 使い方: node scripts/crop-design.mjs <画像> <出力> <x> <y> <w> <h>
 */
import { Jimp } from 'jimp';
import { writeFile } from 'node:fs/promises';

const [, , src, out, x, y, w, h] = process.argv.map((v, i) => (i >= 4 ? Number(v) : v));
const img = await Jimp.read(src);
img.crop({ x, y, w, h });
await writeFile(out, await img.getBuffer('image/png'));
console.log(`${out} — ${w}x${h}`);
