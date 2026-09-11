// 指定ノードの直下（または深さ指定）を一覧する
//   node scripts/fig-children.mjs <fileKey> <nodeId> [depth]
const [key, id, depthArg] = process.argv.slice(2);
const TOKEN = process.env.FIGMA_TOKEN;
const url = 'https://api.figma.com/v1/files/' + key + '/nodes?ids=' + encodeURIComponent(id) + '&depth=' + (depthArg || 1);
const res = await fetch(url, { headers: { 'X-Figma-Token': TOKEN } });
if (!res.ok) { console.error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 300)); process.exit(1); }
const j = await res.json();
const doc = j.nodes[id] && j.nodes[id].document;
if (!doc) { console.error('ノードなし: ' + id); process.exit(1); }
const walk = (n, d) => {
  const b = n.absoluteBoundingBox || {};
  console.log('  '.repeat(d) + n.id.padEnd(14) + ' ' + (n.type || '').padEnd(10) +
    ' ' + Math.round(b.width || 0) + 'x' + Math.round(b.height || 0) + '  ' + n.name);
  for (const c of n.children || []) walk(c, d + 1);
};
walk(doc, 0);
