// layout-snapshot.cjs の出力2つを比較し、矩形が変わった要素だけ列挙する
const fs = require('fs');
const [a, b] = [process.argv[2], process.argv[3]].map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const TOL = Number(process.argv[4] || 1); // 丸め誤差の許容 px
let changed = 0;

for (const key of Object.keys(a)) {
  const A = a[key];
  const B = b[key];
  if (!B) { console.log('[消失] ' + key); continue; }
  if (A.length !== B.length) { console.log('[要素数変化] ' + key + ' ' + A.length + ' -> ' + B.length); continue; }
  const rows = [];
  for (let i = 0; i < A.length; i++) {
    const d = [1, 2, 3, 4].map((k) => B[i][k] - A[i][k]);
    if (d.some((v) => Math.abs(v) > TOL)) {
      rows.push('    ' + A[i][0].slice(0, 60).padEnd(60) + ' Δx' + d[0] + ' Δy' + d[1] + ' Δw' + d[2] + ' Δh' + d[3]);
    }
  }
  if (rows.length) { changed += rows.length; console.log('== ' + key + '  (' + rows.length + '件)'); console.log(rows.slice(0, 25).join('\n')); if (rows.length > 25) console.log('    ...他 ' + (rows.length - 25) + ' 件'); }
}
console.log(changed === 0 ? '\n差分なし' : '\n合計 ' + changed + ' 要素に差分');
