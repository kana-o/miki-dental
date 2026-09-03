// PerfectPixel と同じ「重ね合わせ差分」でカンプと実装を比較する。
//
// - 実装をフルページ撮影し、カンプPNGと同じ幅にそろえる
// - 縦を strip（既定800px）に切り、strip ごとに縦オフセットを自動探索して合わせる
//   （PerfectPixel で画像をドラッグして位置を合わせる操作の自動化）
// - difference 合成（|カンプ − 実装|）を書き出す。一致＝黒、ズレ＝色が出る
// - strip ごとの不一致率を算出し、悪い順に並べたレポートを出す
//
// usage: node scripts/overlay.mjs <url> <compPng> <designW> <outDir> [stripH] [searchRange]
import { chromium } from 'playwright';
import { Jimp } from 'jimp';
import fs from 'node:fs';
import path from 'node:path';

const [url, compPath, dW, outDir, stripHArg, rangeArg] = process.argv.slice(2);
const W = Number(dW);
const STRIP = Number(stripHArg || 800);
const RANGE = Number(rangeArg || 260);   // 縦ズレの探索幅（±px）
const STEP = 4;                          // 探索の粗さ
fs.mkdirSync(outDir, { recursive: true });

// --- 実装をフルページ撮影 -------------------------------------------------
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: W, height: 1000 }, deviceScaleFactor: 1 });
const pg = await ctx.newPage();
await pg.goto(url, { waitUntil: 'networkidle' });
// 画像を確実に描画させてから撮る。
// loading="lazy" のままスクロールで読ませる方式だと、撮影時にまだ描画が済んでおらず
// 「画像が無い」という偽の差分が出る（TOPのスタッフ集合写真で実際に誤検出した）。
await pg.evaluate(async () => {
  document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; });
  document.querySelectorAll('img[data-src]').forEach((i) => { i.src = i.dataset.src; });
  await new Promise((r) => {
    let y = 0;
    const t = setInterval(() => {
      window.scrollTo(0, y); y += 500;
      if (y > document.body.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); r(); }
    }, 50);
  });
  // 全画像の読み込み完了を待つ
  await Promise.all([...document.images].map((i) => i.complete
    ? Promise.resolve()
    : new Promise((r) => { i.onload = i.onerror = r; })));
  // デコード完了まで待つ（complete だけでは描画が間に合わないことがある）
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
});
await pg.waitForLoadState('networkidle');
await pg.waitForTimeout(600);
// 動きのある演出は静止画比較では毎回ズレるため止める。
// パララックス（スクロール量で位置が変わる）と、FVスライダー（自動再生）が対象。
await pg.addStyleTag({ content: `*, *::before, *::after {
  animation-play-state: paused !important;
  transition: none !important;
}` });
await pg.evaluate(() => {
  document.getAnimations?.().forEach((a) => { try { a.cancel(); } catch {} });
  // JSが付けたインライン transform だけ外す。'none' にすると CSS 側の
  // translate(-50%,-50%)（中央寄せ）まで消えて位置がずれるため。
  for (const el of document.querySelectorAll('[class*="parallax"], .swiper-wrapper')) {
    el.style.removeProperty('transform');
    el.style.willChange = 'auto';
    el.style.transitionDuration = '0s';
  }
  // パララックスの画像は動かすぶん 120% に拡大してあるが、カンプは静止の100%。
  // 計測のあいだだけ枠と同じ幅にそろえる（実装を変えるものではない）
  for (const img of document.querySelectorAll('[class*="parallax"] img')) {
    img.style.width = '100%';
  }
  // position: fixed の要素（SP固定CTA・PC固定サイドナビ・ヘッダー）は
  // fullPage 撮影ではページの途中に写り込んでしまうので隠す。
  // カンプにはスクロール追従の状態が描かれていないため、これが毎ページの差分になっていた。
  // ただしヘッダーはカンプにも描かれているので残す（画面上端にあるものは対象外）。
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.top > 130) el.style.visibility = 'hidden';
  }
});
await pg.waitForTimeout(300);
const shotPath = path.join(outDir, '_impl.png');
await pg.screenshot({ path: shotPath, fullPage: true });
await br.close();

const comp = await Jimp.read(compPath);
const impl = await Jimp.read(shotPath);
if (comp.width !== W) comp.resize({ w: W });
if (impl.width !== W) impl.resize({ w: W });

// --- strip ごとに縦オフセットを合わせて差分を取る ---------------------------
const gray = (im, x, y) => {
  const i = (im.width * y + x) * 4;
  const d = im.bitmap.data;
  return (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
};

// ある縦オフセットでの平均輝度差（粗いサンプリング）
function score(compY, implY, h, off) {
  let s = 0, n = 0;
  for (let y = 0; y < h; y += 6) {
    const cy = compY + y, iy = implY + y + off;
    if (cy < 0 || cy >= comp.height || iy < 0 || iy >= impl.height) return Infinity;
    for (let x = 4; x < W; x += 8) { s += Math.abs(gray(comp, x, cy) - gray(impl, x, iy)); n++; }
  }
  return n ? s / n : Infinity;
}

const rows = [];
const nStrip = Math.ceil(comp.height / STRIP);
for (let i = 0; i < nStrip; i++) {
  const cy = i * STRIP;
  const h = Math.min(STRIP, comp.height - cy);
  if (h < 40) break;

  // PerfectPixel の「ドラッグして合わせる」を自動化：最も一致する縦オフセットを探す。
  // ただし縦ズレは上から累積するものなので、探索は「直前stripの補正値の近傍」に限定する。
  // 無制限に探すと、背景色が丸ごと違う帯などで遠くの偽の一致に飛びついてしまう。
  const base = rows.length ? (rows[rows.length - 1].off ?? 0) : 0;
  const lo = rows.length ? base - 120 : -RANGE;
  const hi = rows.length ? base + 120 : RANGE;
  let best = { off: base, sc: Infinity };
  for (let off = lo; off <= hi; off += STEP) {
    const sc = score(cy, cy, h, off);
    if (sc < best.sc) best = { off, sc };
  }
  // 1px刻みで詰める。境界は事前に固定する
  // （ループ条件に best.off を書くと、更新のたびに上限が動いて探索範囲を突き抜けてしまう）
  const coarse = best.off;
  for (let off = coarse - STEP; off <= coarse + STEP; off++) {
    const sc = score(cy, cy, h, off);
    if (sc < best.sc) best = { off, sc };
  }
  const iy = cy + best.off;
  if (iy < 0 || iy + h > impl.height) { rows.push({ i, cy, off: best.off, pct: null, note: '範囲外' }); continue; }

  // difference 合成（|カンプ − 実装|）と不一致率
  const c = comp.clone().crop({ x: 0, y: cy, w: W, h });
  const m = impl.clone().crop({ x: 0, y: iy, w: W, h });
  const diff = new Jimp({ width: W, height: h, color: 0x000000ff });
  let bad = 0, tot = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < W; x++) {
      const a = (W * y + x) * 4;
      const dr = Math.abs(c.bitmap.data[a] - m.bitmap.data[a]);
      const dg = Math.abs(c.bitmap.data[a + 1] - m.bitmap.data[a + 1]);
      const db = Math.abs(c.bitmap.data[a + 2] - m.bitmap.data[a + 2]);
      const mx = Math.max(dr, dg, db);
      // 文字のアンチエイリアス・写真の圧縮差を無視するため 48 未満は一致とみなす
      if (mx >= 48) bad++;
      tot++;
      const v = Math.min(255, mx * 3);
      diff.bitmap.data[a] = v; diff.bitmap.data[a + 1] = v; diff.bitmap.data[a + 2] = v; diff.bitmap.data[a + 3] = 255;
    }
  }
  const pct = (bad / tot) * 100;
  rows.push({ i, cy, off: best.off, pct });

  const stack = new Jimp({ width: W * 3 + 24, height: h, color: 0xffffffff });
  stack.composite(c, 0, 0);
  stack.composite(m, W + 12, 0);
  stack.composite(diff, W * 2 + 24, 0);
  if (stack.width > 1500) stack.resize({ w: 1500 });
  await stack.write(path.join(outDir, `strip${String(i).padStart(2, '0')}_y${cy}_${pct.toFixed(1)}pct.png`));
}

console.log(`カンプ ${comp.height}px / 実装 ${impl.height}px  → ${rows.length} strip（各${STRIP}px）`);
console.log('（左=カンプ 中=実装 右=差分。差分は黒=一致・明るい=ズレ）\n');
console.log('  --- strip順（縦補正の連鎖を確認） ---');
for (const r of rows) console.log(`   ${String(r.i).padStart(3)}  off=${String(r.off ?? '-').padStart(6)}px  ${r.pct == null ? r.note : r.pct.toFixed(1) + '%'}`);
console.log('');
console.log('  strip   カンプy     縦補正     不一致率');
for (const r of [...rows].sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))) {
  console.log(`  ${String(r.i).padStart(3)}  ${String(r.cy).padStart(8)}  ${String(r.off ?? '-').padStart(7)}px  ${r.pct == null ? r.note : r.pct.toFixed(1) + '%'}`);
}
