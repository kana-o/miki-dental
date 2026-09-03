// カンプのテキストノード座標と実装のDOM座標を突き合わせ、左右の配置ズレを検出する。
// 同じ文字列のテキストをキーに、ページ左端からのx座標（と右端）を比較する。
// usage: node scripts/align-check.mjs <figmaJsonDir> [しきい値px]
import { chromium } from 'playwright';
import fs from 'node:fs';

const DIR = process.argv[2];
const TOL = Number(process.argv[3] || 24);

// slug → [figma json 名, 実装パス, デザイン幅]
const PAGES = [
  ['top', 'top', '/', 1600], ['about', 'about', '/about/', 1600],
  ['general', 'general', '/general/', 1600], ['perio', 'perio', '/general/periodontal/', 1600],
  ['implant', 'implant', '/general/implant/', 1600], ['aesthetic', 'aesthetic', '/general/aesthetic/', 1600],
  ['whitening', 'whitening', '/general/whitening/', 1600], ['preventive', 'preventive', '/general/preventive/', 1600],
  ['pediatric', 'pediatric', '/pediatric/', 1600], ['pedprev', 'pedprev', '/pediatric/preventive/', 1600],
  ['pedortho', 'pedortho', '/pediatric/orthodontics/', 1600], ['spacer', 'spacer', '/pediatric/space-maintainer/', 1600],
  ['sealant', 'sealant', '/pediatric/sealant/', 1600], ['clinic', 'clinic', '/clinic/', 1600],
  ['staff', 'staff', '/staff/', 1600], ['recruit', 'recruit', '/recruit/', 1600],
  ['news', 'news', '/news/', 1600], ['newsdetail', 'newsdetail', '/news/detail/', 1600],
  ['price', 'price', '/price/', 1600], ['reservation', 'reservation', '/reservation/', 1600],
  ['access', 'access', '/access/', 1600],
];

const norm = (s) => (s || '').replace(/\s+/g, '').replace(/[（）()［］\[\]【】]/g, '').trim();

function figmaTexts(path) {
  const doc = JSON.parse(fs.readFileSync(path, 'utf8'));
  const out = new Map();
  let root = null;
  const walk = (n) => {
    const b = n.absoluteBoundingBox;
    if (!root && b) root = b;
    if (n.type === 'TEXT' && n.characters && b) {
      const k = norm(n.characters);
      if (k.length >= 4 && k.length <= 60) {
        if (out.has(k)) out.set(k, null);           // 重複テキストは判定不能として捨てる
        else out.set(k, { x: b.x - root.x, w: b.width, r: b.x - root.x + b.width });
      }
    }
    (n.children || []).forEach(walk);
  };
  Object.values(doc.nodes).forEach((v) => walk(v.document));
  return { texts: out, W: root ? root.width : 0 };
}

const br = await chromium.launch();
let total = 0;
for (const [slug, base, url, dw] of PAGES) {
  for (const [suffix, vw] of [['pc', dw], ['sp', 375]]) {
    const jf = `${DIR}/${base}-${suffix}.json`;
    if (!fs.existsSync(jf)) continue;
    const { texts, W } = figmaTexts(jf);
    const ctx = await br.newContext({ viewport: { width: vw, height: 900 } });
    const pg = await ctx.newPage();
    await pg.goto('http://localhost:3000' + url, { waitUntil: 'networkidle' });
    const dom = await pg.evaluate(() => {
      const out = {};
      const sel = 'main h1,main h2,main h3,main h4,main p,main li,main a,main span,main dt,main dd,main th,main td';
      for (const el of document.querySelectorAll(sel)) {
        if (el.querySelector(sel)) continue;                 // 末端要素だけ
        const t = (el.textContent || '').replace(/\s+/g, '').replace(/[（）()［］\[\]【】]/g, '').trim();
        if (t.length < 4 || t.length > 60) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4) continue;
        if (out[t]) { out[t] = null; continue; }
        out[t] = { x: Math.round(r.left + scrollX), w: Math.round(r.width) };
      }
      return out;
    });
    await ctx.close();

    const scale = vw / W;
    const bad = [];
    for (const [k, f] of texts) {
      if (!f) continue;
      const d = dom[k];
      if (!d) continue;
      const fx = f.x * scale, fr = f.r * scale;
      const dl = d.x, dr = d.x + d.w;
      // 左ズレ・右ズレのどちらかが大きい場合だけ拾う（幅の違いによる折返し差は無視）
      const dLeft = dl - fx, dRight = dr - fr;
      if (Math.abs(dLeft) > TOL && Math.abs(dRight) > TOL && Math.sign(dLeft) === Math.sign(dRight)) {
        bad.push(`    ${dLeft > 0 ? '→右に' : '←左に'}${Math.round(Math.abs((dLeft + dRight) / 2))}px  "${k.slice(0, 30)}"  カンプ左${Math.round(fx)} 実装左${dl}`);
      }
    }
    if (bad.length) {
      console.log(`### ${slug} ${suffix} (${bad.length}件)`);
      bad.slice(0, 8).forEach((b) => console.log(b));
      total += bad.length;
    }
  }
}
await br.close();
console.log(`\n合計 ${total} 件（しきい値 ${TOL}px）`);
