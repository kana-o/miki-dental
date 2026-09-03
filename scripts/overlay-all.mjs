// 全ページ × PC/SP で overlay.mjs を回し、不一致率の高い strip を一覧にする。
// usage: node scripts/overlay-all.mjs <outDir>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];
const PAGES = [
  ['top', '/', 'a PC TOP', 'a SP TOP'],
  ['about', '/about/', 'b PC ABOUT', 'b SP ABOUT'],
  ['general', '/general/', 'general-pc', 'general-sp'],
  ['periodontal', '/general/periodontal/', 'periodontal-pc', 'periodontal-sp'],
  ['implant', '/general/implant/', 'implant-pc', 'implant-sp'],
  ['aesthetic', '/general/aesthetic/', 'aesthetic-pc', 'aesthetic-sp'],
  ['whitening', '/general/whitening/', 'whitening-pc', 'whitening-sp'],
  ['preventive', '/general/preventive/', 'preventive-pc', 'preventive-sp'],
  ['pediatric', '/pediatric/', 'pediatric-pc', 'pediatric-sp'],
  ['ped-preventive', '/pediatric/preventive/', 'pediatric-preventive-pc', 'pediatric-preventive-sp'],
  ['ped-ortho', '/pediatric/orthodontics/', 'pediatric-orthodontics-pc', 'pediatric-orthodontics-sp'],
  ['spacer', '/pediatric/space-maintainer/', 'space-maintainer-pc', 'space-maintainer-sp'],
  ['sealant', '/pediatric/sealant/', 'sealant-pc', 'sealant-sp'],
  ['clinic', '/clinic/', 'clinic-pc', 'clinic-sp'],
  ['staff', '/staff/', 'staff-pc', 'staff-sp'],
  ['recruit', '/recruit/', 'recruit-pc', 'recruit-sp'],
  ['news', '/news/', 'news-pc', 'news-sp'],
  ['news-detail', '/news/detail/', 'news-detail-pc', 'news-detail-sp'],
  ['price', '/price/', 'price-pc', 'price-sp'],
  ['reservation', '/reservation/', 'reservation-pc', 'reservation-sp'],
  ['access', '/access/', 'access-pc', 'access-sp'],
];

const all = [];
for (const [slug, url, pcName, spName] of PAGES) {
  for (const [vp, name, w, strip] of [['pc', pcName, 1600, 800], ['sp', spName, 375, 600]]) {
    const comp = `.page-info/designs/${name}.png`;
    if (!fs.existsSync(comp)) { console.log(`skip ${slug} ${vp}（カンプ画像なし）`); continue; }
    const dir = path.join(OUT, `${slug}-${vp}`);
    try {
      const out = execFileSync('node', ['scripts/overlay.mjs', 'http://localhost:3000' + url, comp, String(w), dir, String(strip), '260'],
        { encoding: 'utf8', maxBuffer: 1 << 26 });
      const worst = [];
      for (const line of out.split('\n')) {
        const m = line.match(/^\s+(\d+)\s+(\d+)\s+(-?\d+)px\s+([\d.]+)%/);
        if (m) worst.push({ i: +m[1], y: +m[2], pct: +m[4] });
      }
      worst.sort((a, b) => b.pct - a.pct);
      all.push({ slug, vp, worst });
      console.log(`${slug} ${vp}: 最大 ${worst[0]?.pct.toFixed(1)}%  (strip${worst[0]?.i} y=${worst[0]?.y})`);
    } catch (e) {
      console.log(`ERROR ${slug} ${vp}: ${String(e.message).slice(0, 120)}`);
    }
  }
}

console.log('\n\n========== 不一致率の高い箇所（上位40） ==========');
const flat = [];
for (const p of all) for (const w of p.worst) flat.push({ ...w, slug: p.slug, vp: p.vp });
flat.sort((a, b) => b.pct - a.pct);
for (const f of flat.slice(0, 40)) {
  console.log(`  ${f.pct.toFixed(1).padStart(5)}%  ${f.slug}-${f.vp}  strip${String(f.i).padStart(2)} (カンプ y=${f.y})`);
}
fs.writeFileSync(path.join(OUT, '_summary.json'), JSON.stringify(flat, null, 1));
