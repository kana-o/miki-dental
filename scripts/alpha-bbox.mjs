// PNG の不透明領域の bbox を出す（透明余白ぶんの位置合わせに使う）
import { Jimp } from 'jimp';
for (const f of process.argv.slice(2)) {
  const im = await Jimp.read(f);
  const { width: W, height: H } = im.bitmap;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (im.bitmap.data[(y * W + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  console.log(f.split(/[\/]/).pop() + '  ' + W + 'x' + H +
    '  不透明域 x' + x0 + '..' + x1 + ' y' + y0 + '..' + y1 +
    ' (' + (x1 - x0 + 1) + 'x' + (y1 - y0 + 1) + ')');
}
