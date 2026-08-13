# 工程 5: スクリーンショット比較と調整

## 概要

Playwright で実サイトのスクリーンショットを取得し、Figma MCP で取得したデザインのスクリーンショットと比較します。**自動差分検出ツール**で差異を可視化し、効率的に修正します。

## 前提条件

- 工程 4（コーディング）が完了していること
- 開発サーバーが起動していること
- `npm install pixelmatch pngjs` が実行済み（初回のみ自動インストール試行）

## 🚀 自動差分比較（推奨）

### ワンコマンドで撮影＆比較

```bash
# スクリーンショット取得 → 自動で差分比較
node .coding-md/screenshot.cjs --compare <デザイン画像パス>

# 例: アクセスページを比較
node .coding-md/screenshot.cjs --name access --viewport pc --compare .page-info/designs/access.png

# 例: フッターセクションを比較
node .coding-md/screenshot.cjs --selector ".l-footer" --viewport sp --compare .page-info/designs/front-page.png
```

### 差分比較のみ実行

```bash
# 2つの画像を比較して差分画像を生成
node .coding-md/05-screenshot-comparison/compare-screenshots.cjs <実装画像> <デザイン画像>

# 例
node .coding-md/05-screenshot-comparison/compare-screenshots.cjs \
  .coding-md/screenshots/access_pc.png \
  .page-info/designs/access.png \
  --report
```

### デザイン画像の場所

デザイン画像は `.page-info/` に保存されています（スラッグ名で命名）:
- `.page-info/designs/access.png` - アクセスページ
- `.page-info/designs/faq.png` - FAQページ
- `.page-info/designs/contact_input.png` - お問い合わせ（入力）
- 詳細は `.page-info/README.md` を参照

### オプション

| オプション | 説明 |
|-----------|------|
| `--threshold <0-1>` | 差分判定の閾値（デフォルト: 0.1、小さいほど厳密） |
| `--output <パス>` | 差分画像の出力先 |
| `--report` | JSON形式の詳細レポートを生成 |

### 出力結果

1. **差分画像** (`diff_*.png`): 差異がある箇所が赤くハイライト
2. **差分率**: 全ピクセル中の差分ピクセルの割合
3. **サマリー**:
   - ✅ 完全一致
   - ⚠️ 軽微な差分（1%未満）
   - 🔶 中程度の差分（1-5%）
   - ❌ 大きな差分（5%以上）

---

## 手順

### 1. 実サイトのスクリーンショットを取得

Playwright を使用して、実サイトのスクリーンショットを取得します。

```bash
# 基本的な使用方法（SPビューポートでフルページキャプチャ）
node .coding-md/screenshot.cjs

# 特定セクションのみキャプチャ（CSSセレクタを指定）
node .coding-md/screenshot.cjs --selector ".l-footer" --viewport sp
node .coding-md/screenshot.cjs --selector ".l-header" --viewport pc

# SP/PC両方をキャプチャ
node .coding-md/screenshot.cjs --selector ".l-footer" --viewport both

# 名前を指定
node .coding-md/screenshot.cjs --name staff-center --viewport pc
```

### 2. デザイン画像を確認

デザイン画像は `.page-info/` に保存されています。ページのスラッグ名で命名されています（例: `access.png`, `faq.png`）。

新しいデザイン画像が必要な場合は、Figma MCP の `get_screenshot` を使用して取得し、`.page-info/` に保存してください。

### 3. 自動差分比較を実行

```bash
# 差分比較
node .coding-md/05-screenshot-comparison/compare-screenshots.cjs \
  .coding-md/screenshots/実装画像.png \
  .page-info/デザイン画像.png \
  --report
```

### 4. 差分画像をAIに分析させる

差分画像（赤くハイライトされた箇所）をAIに見せて、具体的な修正箇所を相談：

```
「この差分画像を見て、どこを修正すべきか教えて」
「赤い部分を見て、CSS的にどう修正すればいい？」
```

### 5. 修正 → 再比較を繰り返す

- 修正後、再度スクリーンショットを取得
- 以下の基準を満たすまで繰り返す（修正ラウンドは最大3回。収束しない場合は差分画像と原因仮説を添えてユーザーに報告）
- **完了条件: PC・SP両方の比較を実施済みであること**（片方だけで完了扱いにしない）

**差分率の判定基準:**

| 差分率 | 判定 | 対応 |
|--------|------|------|
| 0% | ✅ 完全一致 | 完了 |
| 1%未満 | ⚠️ 軽微 | アンチエイリアス・フォントレンダリングの誤差範囲。基本的に許容 |
| 1〜5% | 🔶 要修正 | 余白・フォントサイズ・色などを確認して修正する |
| 5%以上 | ❌ 要修正 | 必ず修正すること |

## ベストプラクティス

### セクション単位で比較

ページ全体ではなく、セクション単位で比較すると差分が見やすい：

```bash
# ヘッダー
node .coding-md/screenshot.cjs --selector "header" --name header --viewport both

# フッター
node .coding-md/screenshot.cjs --selector "footer" --name footer --viewport both

# 特定セクション
node .coding-md/screenshot.cjs --selector ".about-section" --name about --viewport pc
```

### タブレット中間幅（1024px）の崩れ確認（必須）

PC/SPのデザインしかない案件では、中間幅の崩れを検出するために **必ず `tab` ビューポートでも撮影** する:

```bash
# sp + tab + pc を一括キャプチャ
node .coding-md/screenshot.cjs --selector ".about-section" --name about --viewport all

# tab のみ
node .coding-md/screenshot.cjs --name about --viewport tab
```

tabのスクショはデザイン画像との比較ではなく、**目視で「崩れていないか」をチェック**する:

| チェック項目 | 崩れていた場合の対応 |
|------|------|
| 横スクロールが出ていないか | コンテナに `max-width` を適用 |
| 横並び要素が押し出されていないか | `flex-wrap: wrap` / `grid auto-fit` で折返し可能に |
| 画像がはみ出していないか | `max-width: 100%; height: auto;` を追加 |
| テキストが過剰に折返されていないか | フォントサイズを `@include mq("tab")` で調整 |

補正は**崩れた箇所だけ** `@include mq("tab")` で個別対応する（先回りで全プロパティに書かない）。詳細はCLAUDE.mdの「中間幅（PC〜SP間）の破綻防止ルール」を参照。

### 閾値の調整

- デフォルト（0.1）: 一般的な比較
- 厳密（0.05）: アンチエイリアスの違いも検出
- 緩め（0.2）: 大まかな確認

```bash
node .coding-md/05-screenshot-comparison/compare-screenshots.cjs impl.png design.png --threshold 0.05
```

## 注意事項

- 開発サーバーが起動している必要があります
- 出力先は `.coding-md/screenshots/` を使用します
- 画像サイズが異なる場合は自動で調整されます（大きい方に合わせる）
- JPG画像は自動でPNGに変換して比較します
