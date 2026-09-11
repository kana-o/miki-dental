// Figma のノードをレンダリング書き出しして保存する（/v1/images = 見たままの画像）
//   node scripts/fig-render.mjs <fileKey> <map.json> [--dry]
// map.json: [{ "nodeId": "1:2", "out": "src/img/foo/bar.jpg", "expect": [w, h] }, ...]
//
// 角丸マスクが焼き込まれるノードがあるため、いったん png（透過）で書き出し、
// 透明になった四隅を最寄りの不透明画素で埋めてから保存する。
// こうすると CSS 側の border-radius が小さくても四隅が白く出ない。
import fs from 'node:fs';
import path from 'node:path';
import { Jimp } from 'jimp';

const [key, mapPath, ...flags] = process.argv.slice(2);
const DRY = flags.includes('--dry');
const TOKEN = process.env.FIGMA_TOKEN;
const items = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const SCALE = 2;

// Figma の CDN はたまに接続を切るのでリトライする
const fetchRetry = async (url, opt, tries = 4) => {
  for (let i = 1; i <= tries; i++) {
    try { return await fetch(url, opt); }
    catch (e) {
      if (i === tries) throw e;
      await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
};

const fillCorners = (im) => {
  const { width: W, height: H, data } = im.bitmap;
  let filled = 0;
  const at = (x, y) => (y * W + x) * 4;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = at(x, y);
      if (data[i + 3] >= 250) continue;
      // 画像の中心方向へ進んで最初に見つかった不透明画素で埋める
      const sx = x < W / 2 ? 1 : -1;
      const sy = y < H / 2 ? 1 : -1;
      let cx = x, cy = y, ok = false;
      for (let s = 1; s <= 80; s++) {
        cx = x + sx * s; cy = y + sy * s;
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) break;
        if (data[at(cx, cy) + 3] >= 250) { ok = true; break; }
      }
      if (!ok) continue;
      const j = at(cx, cy);
      data[i] = data[j]; data[i + 1] = data[j + 1]; data[i + 2] = data[j + 2]; data[i + 3] = 255;
      filled++;
    }
  }
  return filled;
};

for (let s = 0; s < items.length; s += 15) {
  const chunk = items.slice(s, s + 15);
  const ids = chunk.map((c) => c.nodeId).join(',');
  const url = 'https://api.figma.com/v1/images/' + key + '?ids=' + encodeURIComponent(ids) +
    '&format=png&scale=' + SCALE;
  const r = await fetchRetry(url, { headers: { 'X-Figma-Token': TOKEN } });
  const j = await r.json();
  if (j.err) { console.error('API エラー: ' + j.err); continue; }
  for (const it of chunk) {
    const src = j.images[it.nodeId];
    if (!src) { console.log('  × URLなし ' + it.nodeId + ' ' + it.out); continue; }
    const buf = Buffer.from(await (await fetchRetry(src)).arrayBuffer());
    const im = await Jimp.read(buf);
    const ext = path.extname(it.out).toLowerCase();
    // png は透過をそのまま残す（切り抜き画像の背景まで塗り潰してしまうため）。
    // jpg はどのみち透過を持てないので、角丸で欠けた四隅だけ埋める
    const filled = ext === '.png' ? 0 : fillCorners(im);
    const outBuf = ext === '.png'
      ? await im.getBuffer('image/png')
      : await im.getBuffer('image/jpeg', { quality: 82 });
    const exp = it.expect ? ' 期待 ' + it.expect[0] * SCALE + 'x' + it.expect[1] * SCALE : '';
    const line = '  ' + it.out.replace('src/img/', '').padEnd(40) + ' ' +
      im.bitmap.width + 'x' + im.bitmap.height + ' ' + Math.round(outBuf.length / 1024) + 'KB' +
      (filled ? ' 角丸補修' + filled + 'px' : '') + exp;
    if (DRY) { console.log('  [dry]' + line); continue; }
    fs.mkdirSync(path.dirname(it.out), { recursive: true });
    fs.writeFileSync(it.out, outBuf);
    console.log(line);
  }
}
