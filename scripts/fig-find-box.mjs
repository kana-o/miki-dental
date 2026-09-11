// フレーム配下から、指定サイズ・位置に一致するノードを（画像フィルの有無にかかわらず）探す
//   node scripts/fig-find-box.mjs <fileKey> <frameId> <w> <h> [dx] [tol]
const [key, frameId, W, H, DX, TOL] = process.argv.slice(2);
const TOKEN = process.env.FIGMA_TOKEN;
const tol = Number(TOL || 3);

const res = await fetch('https://api.figma.com/v1/files/' + key + '/nodes?ids=' + encodeURIComponent(frameId), {
  headers: { 'X-Figma-Token': TOKEN },
});
const j = await res.json();
const doc = j.nodes[frameId].document;
const fb = doc.absoluteBoundingBox;

const hits = [];
const walk = (n, chain) => {
  const b = n.absoluteBoundingBox;
  if (b && Math.abs(b.width - Number(W)) <= tol && Math.abs(b.height - Number(H)) <= tol) {
    const dx = Math.round(b.x - fb.x);
    if (DX === undefined || DX === "" || Math.abs(dx - Number(DX)) <= 8) {
      hits.push({ id: n.id, type: n.type, name: n.name, dx, dy: Math.round(b.y - fb.y),
        w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10,
        hasImage: (n.fills || []).some((f) => f.type === 'IMAGE'),
        isMask: !!n.isMask, chain: chain.slice(-3).join(' > ') });
    }
  }
  for (const c of n.children || []) walk(c, chain.concat(n.name));
};
walk(doc, []);
for (const h of hits) {
  console.log('  ' + h.id.padEnd(22) + ' ' + h.type.padEnd(10) + ' ' + h.w + 'x' + h.h +
    ' dx=' + h.dx + ' dy=' + h.dy + (h.hasImage ? ' [image]' : '') + '  ' + h.name + '  << ' + h.chain);
}
if (!hits.length) console.log('  （該当なし）');
