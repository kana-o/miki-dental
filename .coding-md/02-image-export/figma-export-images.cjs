#!/usr/bin/env node

/**
 * Figma REST API 画像書き出しスクリプト
 *
 * ルールの正本: ~/.claude/skills/_shared/image-rules.md
 *   - jpg/png は 2x 固定・svg は等倍
 *   - 写真=jpg / 透過・ロゴ=png / アイコン=svg
 *   - 命名 {セクション}_{連番2桁}、common_* は common/ へ振り分け
 *   - jpg は quality 80 で再エンコード（jimp があれば・縮む場合のみ）
 *
 * 使用方法:
 *   node figma-export-images.cjs --file <fileKey> --map <map.json> [--out src/img] [--page <slug>] [--dry-run]
 *
 * map.json の形式:
 *   [{ "nodeId": "123:456", "name": "fv_01", "format": "jpg" }, ...]
 *   format: jpg | png | svg
 *
 * 認証: 環境変数 FIGMA_TOKEN → なければ ~/.figma-token（トークン文字列のみのファイル）
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const RASTER_SCALE = 2;
const JPG_QUALITY = 80;
const CHUNK = 50; // 1リクエストあたりの node 数

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { file: null, map: null, out: "src/img", page: null, dryRun: false };
  for (let i = 0; i < a.length; i++) {
    switch (a[i]) {
      case "--file": o.file = a[++i]; break;
      case "--map": o.map = a[++i]; break;
      case "--out": o.out = a[++i]; break;
      case "--page": o.page = a[++i]; break;
      case "--dry-run": o.dryRun = true; break;
    }
  }
  return o;
}

function usageAndExit() {
  console.log(`Figma REST API 画像書き出し（正本ルール: ~/.claude/skills/_shared/image-rules.md）

使用方法:
  node figma-export-images.cjs --file <fileKey> --map <map.json> [--out src/img] [--page <slug>] [--dry-run]

  fileKey : Figma URL の figma.com/design/{fileKey}/... の部分
  map.json: [{ "nodeId": "123:456", "name": "fv_01", "format": "jpg" }, ...]`);
  process.exit(1);
}

function getToken() {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN.trim();
  const tokenFile = path.join(os.homedir(), ".figma-token");
  if (fs.existsSync(tokenFile)) {
    const t = fs.readFileSync(tokenFile, "utf8").trim();
    if (t) return t;
  }
  // Windows: setx 直後は既存プロセスに環境変数が反映されないため、レジストリから直接読む
  if (process.platform === "win32") {
    try {
      const out = require("child_process").execSync(
        'reg query "HKCU\\Environment" /v FIGMA_TOKEN', { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      );
      const m = out.match(/FIGMA_TOKEN\s+REG_(?:EXPAND_)?SZ\s+(\S+)/);
      if (m) return m[1].trim();
    } catch { /* 未設定 */ }
  }
  console.error(`❌ Figma トークンが見つかりません。次のどちらかを設定してください:
  1. 環境変数 FIGMA_TOKEN（PowerShell: setx FIGMA_TOKEN "xxx" → ターミナル再起動）
  2. ${tokenFile} にトークン文字列のみを保存

トークンの発行手順: .coding-md/MCPが使えないときの代替手段.md の 1-1
（Figma Settings → Account → Personal access tokens。スコープ file_content:read）`);
  process.exit(1);
}

// nodeId は "123-456" 形式でも受け付けて "123:456" に正規化
function normalizeId(id) {
  return String(id).trim().replace("-", ":");
}

// common_* → common/、それ以外は --page 指定時のみ {page}/
function resolveDestDir(rootDir, name, page) {
  if (name.startsWith("common_") || name.startsWith("common-")) {
    return path.join(rootDir, "common");
  }
  return page ? path.join(rootDir, page) : rootDir;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

async function figmaGet(url, token) {
  const res = await fetch(url, { headers: { "X-Figma-Token": token } });
  if (!res.ok) {
    throw new Error(`Figma API ${res.status}: ${await res.text().catch(() => "")}`.slice(0, 300));
  }
  return res.json();
}

// jimp は実行時のカレント（案件）→スクリプト設置場所の順で解決する
function loadJimp() {
  try {
    return require(require.resolve("jimp", { paths: [process.cwd(), __dirname] }));
  } catch { return null; }
}

// jpg を quality 80 で再エンコード（jimp v0/v1 両対応・縮む場合のみ書き戻す）
async function recompressJpg(filePath) {
  const jimpMod = loadJimp();
  if (!jimpMod) return null; // jimp なしはスキップ（警告は呼び出し側）
  const original = fs.readFileSync(filePath);
  try {
    let buf;
    if (jimpMod.Jimp) { // jimp v1
      const img = await jimpMod.Jimp.read(filePath);
      buf = await img.getBuffer("image/jpeg", { quality: JPG_QUALITY });
    } else { // jimp v0
      const img = await jimpMod.read(filePath);
      img.quality(JPG_QUALITY);
      buf = await img.getBufferAsync(jimpMod.MIME_JPEG);
    }
    if (buf && buf.length < original.length) {
      fs.writeFileSync(filePath, buf);
      return { before: original.length, after: buf.length };
    }
    return { before: original.length, after: original.length };
  } catch (e) {
    fs.writeFileSync(filePath, original); // 念のため原本を書き戻す
    return { before: original.length, after: original.length, error: e.message };
  }
}

async function main() {
  const opt = parseArgs();
  if (!opt.file || !opt.map) usageAndExit();

  let map;
  try {
    map = JSON.parse(fs.readFileSync(opt.map, "utf8"));
  } catch (e) {
    console.error(`❌ マッピングJSONを読めません: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(map) || map.length === 0) {
    console.error("❌ マッピングJSONは [{nodeId, name, format}] の配列で指定してください");
    process.exit(1);
  }
  for (const m of map) {
    if (!m.nodeId || !m.name || !["jpg", "png", "svg"].includes(m.format)) {
      console.error(`❌ 不正なエントリ: ${JSON.stringify(m)}（nodeId / name / format=jpg|png|svg が必須）`);
      process.exit(1);
    }
    m.nodeId = normalizeId(m.nodeId);
  }

  const token = getToken();
  console.log(`🖼️  Figma 画像書き出し: ${map.length}件`);
  console.log(`   fileKey: ${opt.file} / 出力先: ${opt.out}${opt.page ? ` / ページ: ${opt.page}` : ""}${opt.dryRun ? " / DRY-RUN" : ""}`);

  // 形式ごとにまとめて画像URLを取得（jpg/png は scale=2、svg は等倍）
  const byFormat = new Map();
  for (const m of map) {
    if (!byFormat.has(m.format)) byFormat.set(m.format, []);
    byFormat.get(m.format).push(m);
  }

  const urlMap = new Map(); // nodeId -> url
  for (const [format, items] of byFormat) {
    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK);
      const ids = chunk.map((m) => m.nodeId).join(",");
      const scale = format === "svg" ? "" : `&scale=${RASTER_SCALE}`;
      const url = `https://api.figma.com/v1/images/${opt.file}?ids=${encodeURIComponent(ids)}&format=${format}${scale}`;
      const json = await figmaGet(url, token);
      if (json.err) throw new Error(`Figma API error: ${json.err}`);
      for (const [id, u] of Object.entries(json.images || {})) urlMap.set(id, u);
    }
  }

  // ダウンロード → 保存 → jpg再圧縮
  let ok = 0, failed = 0, totalBytes = 0;
  const jimpMissing = !loadJimp();

  for (const m of map) {
    const imgUrl = urlMap.get(m.nodeId);
    const destDir = resolveDestDir(opt.out, m.name, opt.page);
    const destPath = path.join(destDir, `${m.name}.${m.format}`);
    const rel = path.relative(process.cwd(), destPath);

    if (!imgUrl) {
      console.log(`  ⚠️ ${m.nodeId} (${m.name}): レンダリング不可（URLがnull）。node-id を確認してください`);
      failed++;
      continue;
    }
    if (opt.dryRun) {
      console.log(`  [DRY-RUN] ${m.nodeId} → ${rel}`);
      continue;
    }

    try {
      const res = await fetch(imgUrl);
      if (!res.ok) throw new Error(`download ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(destPath, buf);

      let sizeNote = kb(buf.length);
      if (m.format === "jpg" && !jimpMissing) {
        const r = await recompressJpg(destPath);
        if (r && r.error) sizeNote += `（⚠️ 圧縮スキップ: ${r.error}）`;
        else if (r && r.after < r.before) sizeNote = `${kb(r.before)} → ${kb(r.after)}（quality ${JPG_QUALITY}）`;
      }
      const finalSize = fs.statSync(destPath).size;
      totalBytes += finalSize;
      console.log(`  ✅ ${rel}  ${sizeNote}`);
      if (finalSize > 2 * 1024 * 1024) {
        console.log(`     ⚠️ ${kb(finalSize)} と大きすぎます。node-id が画像要素ではなくセクション/ページ全体を指していないか確認してください`);
      }
      ok++;
    } catch (e) {
      console.log(`  ❌ ${m.name}: ${e.message}`);
      failed++;
    }
  }

  if (jimpMissing && byFormat.has("jpg") && !opt.dryRun) {
    console.log("  ⚠️ jimp が見つからないため jpg の再圧縮をスキップしました（npm install jimp で有効化）");
  }
  console.log(`\n✅ 完了: 成功 ${ok} / 失敗 ${failed}${opt.dryRun ? "（DRY-RUN）" : ` / 合計 ${kb(totalBytes)}`}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`❌ ${e.message}`);
  process.exit(1);
});
