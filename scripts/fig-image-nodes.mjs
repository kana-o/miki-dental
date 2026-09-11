// 指定フレーム配下から「画像フィルを持つノード」を集めて JSON に出す
//   node scripts/fig-image-nodes.mjs <fileKey> <nodeId> <out.json>
import fs from 'node:fs';
const [key, id, out] = process.argv.slice(2);
const TOKEN = process.env.FIGMA_TOKEN;

const url = 'https://api.figma.com/v1/files/' + key + '/nodes?ids=' + encodeURIComponent(id);
const res = await fetch(url, { headers: { 'X-Figma-Token': TOKEN } });
if (!res.ok) { console.error('HTTP ' + res.status); process.exit(1); }
const j = await res.json();
const doc = j.nodes[id].document;

const rows = [];
const walk = (n, parents) => {
  const fills = (n.fills || []).filter((f) => f.type === 'IMAGE' && f.visible !== false);
  if (fills.length) {
    const b = n.absoluteBoundingBox || {};
    rows.push({
      id: n.id,
      name: n.name,
      type: n.type,
      w: Math.round((b.width || 0) * 100) / 100,
      h: Math.round((b.height || 0) * 100) / 100,
      x: Math.round(b.x || 0),
      y: Math.round(b.y || 0),
      imageRef: fills[0].imageRef,
      scaleMode: fills[0].scaleMode,
      hasTransform: !!fills[0].imageTransform,
      radius: n.cornerRadius || 0,
      path: parents.slice(-3).join(' > '),
    });
  }
  for (const c of n.children || []) walk(c, parents.concat(n.name));
};
walk(doc, []);
const fb = doc.absoluteBoundingBox || {};
fs.writeFileSync(out, JSON.stringify({ frame: { name: doc.name, id: doc.id, x: fb.x, y: fb.y, w: fb.width, h: fb.height }, nodes: rows }, null, 1));
console.log(doc.name + ': 画像ノード ' + rows.length + ' 件 -> ' + out);
