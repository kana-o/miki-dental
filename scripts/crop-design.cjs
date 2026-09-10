// デザイン画像の一部を切り出して確認用に保存する
//   node scripts/crop-design.cjs "<デザインPNG名>" <x> <y> <w> <h> <out> [倍率]
// 画像は scripts/serve.cjs の /designs/ 経由で読む（file:// は Chrome の画像ビューアが
// 勝手に縮小するうえ、setContent からは同一オリジン制約で読めない）。
const { chromium } = require('playwright');
const [name, x, y, w, h, out, scaleArg] = process.argv.slice(2);
const s = Number(scaleArg || 1);
const W = Math.round(Number(w) * s);
const H = Math.round(Number(h) * s);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W + 20, height: H + 20 } });
  // about:blank から http:// の画像を読むので、まず同一オリジンの文書を開いておく
  await page.goto('http://127.0.0.1:3100/');
  await page.setContent(
    '<style>body{margin:0;background:#fff}' +
      '#crop{position:relative;overflow:hidden;width:' + W + 'px;height:' + H + 'px}' +
      'img{position:absolute;left:0;top:0;max-width:none;transform-origin:0 0;' +
      'transform:scale(' + s + ') translate(' + -Number(x) + 'px,' + -Number(y) + 'px)}</style>' +
      '<div id="crop"><img id="d" src="http://127.0.0.1:3100/designs/' + encodeURIComponent(name) + '"></div>'
  );
  await page.waitForFunction(() => {
    const im = document.getElementById('d');
    return im && im.complete && im.naturalWidth > 0;
  }, null, { timeout: 60000 });
  console.log('読み込み: ' + (await page.evaluate(() => {
    const im = document.getElementById('d');
    const b = im.getBoundingClientRect();
    return im.naturalWidth + 'x' + im.naturalHeight + ' / 描画 ' + Math.round(b.width) + 'x' + Math.round(b.height);
  })));
  await page.locator('#crop').screenshot({ path: out });
  await browser.close();
  console.log(out);
})();
