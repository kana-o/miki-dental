// Figma ファイルのトップレベル構成（ページ＝canvas と直下のフレーム）を出す
//   node scripts/fig-outline.mjs <fileKey> [depth]
const [key, depthArg] = process.argv.slice(2);
const TOKEN = process.env.FIGMA_TOKEN;
if (!TOKEN) { console.error('FIGMA_TOKEN が未設定'); process.exit(1); }

const res = await fetch('https://api.figma.com/v1/files/' + key + '?depth=' + (depthArg || 2), {
  headers: { 'X-Figma-Token': TOKEN },
});
if (!res.ok) { console.error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 300)); process.exit(1); }
const j = await res.json();
console.log('file: ' + j.name);
for (const page of j.document.children) {
  console.log('');
  console.log('[' + page.type + '] ' + page.name + '  id=' + page.id + '  children=' + (page.children || []).length);
  for (const f of page.children || []) {
    const b = f.absoluteBoundingBox || {};
    console.log('    ' + f.id.padEnd(14) + ' ' + (f.type || '').padEnd(10) + ' ' +
      Math.round(b.width || 0) + 'x' + Math.round(b.height || 0) + '  ' + f.name);
  }
}
