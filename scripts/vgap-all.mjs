// 全ページで vgap-check を回し、しきい値以上のズレだけを一覧にする。
// usage: node scripts/vgap-all.mjs <figmaJsonDir> [最小差分px]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const DIR = process.argv[2];
const MIN = process.argv[3] || '30';
const PAGES = [
  ['top', '/', 'top'], ['about', '/about/', 'about'],
  ['general', '/general/', 'general'], ['perio', '/general/periodontal/', 'perio'],
  ['implant', '/general/implant/', 'implant'], ['aesthetic', '/general/aesthetic/', 'aesthetic'],
  ['whitening', '/general/whitening/', 'whitening'], ['preventive', '/general/preventive/', 'preventive'],
  ['pediatric', '/pediatric/', 'pediatric'], ['pedprev', '/pediatric/preventive/', 'pedprev'],
  ['pedortho', '/pediatric/orthodontics/', 'pedortho'], ['spacer', '/pediatric/space-maintainer/', 'spacer'],
  ['sealant', '/pediatric/sealant/', 'sealant'], ['clinic', '/clinic/', 'clinic'],
  ['staff', '/staff/', 'staff'], ['recruit', '/recruit/', 'recruit'],
  ['news', '/news/', 'news'], ['newsdetail', '/news/detail/', 'newsdetail'],
  ['price', '/price/', 'price'], ['reservation', '/reservation/', 'reservation'],
  ['access', '/access/', 'access'],
];

const all = [];
for (const [slug, url, jsonBase] of PAGES) {
  for (const [vp, w] of [['pc', 1600], ['sp', 375]]) {
    const jf = `${DIR}/${jsonBase}-${vp}.json`;
    if (!fs.existsSync(jf)) continue;
    let out;
    try {
      out = execFileSync('node', ['scripts/vgap-check.mjs', jf, 'http://localhost:3000' + url, String(w), MIN],
        { encoding: 'utf8', maxBuffer: 1 << 26 });
    } catch (e) { console.log(`ERROR ${slug}-${vp}: ${String(e.message).slice(0, 80)}`); continue; }
    const lines = out.split('\n');
    const start = lines.findIndex((l) => l.includes('ズレが'));
    if (start < 0) continue;
    const items = [];
    for (let i = start + 1; i < lines.length; i += 2) {
      const m = lines[i] && lines[i].match(/(広い|狭い)\s+(\d+)px\s+カンプ(-?\d+) → 実装(-?\d+)\s+（カンプy=(-?\d+)/);
      if (!m) continue;
      items.push({ dir: m[1], px: +m[2], dGap: +m[3], iGap: +m[4], y: +m[5], label: (lines[i + 1] || '').trim() });
    }
    if (items.length) all.push({ page: `${slug}-${vp}`, items });
  }
}

console.log(`\n========== ${MIN}px 以上ズレている区間 ==========`);
for (const p of all) {
  const tot = p.items.reduce((s, x) => s + (x.dir === '広い' ? x.px : -x.px), 0);
  console.log(`\n### ${p.page}  (${p.items.length}件 / 正味 ${tot > 0 ? '+' : ''}${tot}px)`);
  for (const x of p.items.sort((a, b) => b.px - a.px).slice(0, 6)) {
    console.log(`   ${x.dir} ${String(x.px).padStart(4)}px  カンプ${x.dGap}→実装${x.iGap}  y≈${x.y}`);
    console.log(`      ${x.label.slice(0, 76)}`);
  }
}
