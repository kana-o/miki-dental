// 書き出した画像と、カンプの該当位置を左右に並べて1枚に出す
//   node scripts/cmp-render.mjs <out.png> <画像パス> <designPng> <dx> <dy> <w> <h>
import { Jimp } from 'jimp';
const [out, mine, design, DX, DY, W, H] = process.argv.slice(2);
const w = Math.round(Number(W)), h = Math.round(Number(H));
const d = (await Jimp.read(design)).crop({ x: Number(DX), y: Number(DY), w, h });
const m = (await Jimp.read(mine)).resize({ w, h });
const c = new Jimp({ width: w * 2 + 12, height: h, color: 0xff00ffff });
c.composite(d, 0, 0).composite(m, w + 12, 0);
await c.write(out);
console.log(out + '  左:カンプ 右:書き出し');
