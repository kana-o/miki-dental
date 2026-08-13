/**
 * カンプ（ページ通しの画像）と実装を、セクション単位で並べて比較する。
 *
 * ページ全体を単純に差分すると、文字の折り返し等で縦位置がずれて全部差分になる。
 * そこでセクションごとに「カンプのY座標」と「実装のY座標」をそれぞれ基準にして
 * 同じ高さぶん切り出し、左右に並べた画像を書き出す。
 *
 * 使い方:
 *   node scripts/compare-design.mjs <カンプ画像> <URL> <幅> <出力先> <セレクタ:カンプY> ...
 * 例:
 *   node scripts/compare-design.mjs ".page-info/designs/a PC TOP.png" \
 *     http://127.0.0.1:3100/ 1600 /tmp/diff ".top-about:1060" ".top-treatment:3047"
 */
import { Jimp } from 'jimp';
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const [, , designPath, url, widthArg, outDir, ...specs] = process.argv;
const width = Number(widthArg);

const design = await Jimp.read(designPath);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1000 } });
await page.goto(url, { waitUntil: 'networkidle' });
// 比較対象外の要素を隠す（環境変数 HIDE にセレクタをカンマ区切りで指定）
const hide = ['#__bs_notify__', ...(process.env.HIDE ? process.env.HIDE.split(',') : [])].join(',');
await page.addStyleTag({ content: `${hide}{display:none !important;}` });
// loading="lazy" のままだと fullPage 撮影で描画されないことがあるため、
// 全画像を eager に切り替えてデコード完了まで待つ
await page.evaluate(async () => {
  document.querySelectorAll('img[loading="lazy"]').forEach((im) => {
    im.loading = 'eager';
  });
  for (let y = 0; y < document.body.scrollHeight; y += 500) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 40));
  }
  window.scrollTo(0, 0);
  await Promise.all(
    [...document.images].map((im) => (im.complete ? im.decode().catch(() => {}) : new Promise((r) => { im.onload = im.onerror = r; })))
  );
});
await page.waitForTimeout(800);

const shotPath = `${outDir}/_impl.png`;
await page.screenshot({ path: shotPath, fullPage: true });
const impl = await Jimp.read(shotPath);

for (const spec of specs) {
  const parts = spec.split(':');
  const cropH = Number(parts.pop());
  const designY = Number(parts.pop());
  const sel = parts.join(':');
  const box = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { y: Math.round(r.top + window.scrollY), h: Math.round(r.height) };
  }, sel);
  if (!box) {
    console.log(`${sel}: 要素が見つかりません`);
    continue;
  }

  const h = Math.min(cropH, design.bitmap.height - designY, impl.bitmap.height - box.y);
  if (h <= 0) {
    console.log(`${sel}: 切り出し範囲が不正`);
    continue;
  }

  const a = design.clone().crop({ x: 0, y: designY, w: width, h });
  const b = impl.clone().crop({ x: 0, y: box.y, w: width, h });

  const canvas = new Jimp({ width: width * 2 + 20, height: h, color: 0xffffffff });
  canvas.composite(a, 0, 0);
  canvas.composite(b, width + 20, 0);
  const name = sel.replace(/[^a-zA-Z0-9]/g, '') || 'section';
  await writeFile(`${outDir}/${name}.png`, await canvas.getBuffer('image/png'));

  // ざっくりの差分率（RGBの差が閾値を超えたピクセルの割合）
  const da = a.bitmap.data;
  const db = b.bitmap.data;
  let differing = 0;
  const total = width * h;
  for (let i = 0; i < da.length; i += 4) {
    const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
    if (d > 90) differing++;
  }
  const pct = ((differing / total) * 100).toFixed(1);
  console.log(`${sel}: カンプ y=${designY} / 実装 y=${box.y} h=${h} → 差分 ${pct}%`);
}

await browser.close();
