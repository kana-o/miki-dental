# 工程 6: 品質チェック（エディタ内で完結）

## 概要

エディタ上のコードとファイルだけで確認できる品質チェック項目をまとめます。ブラウザ操作や実機確認が必要な項目は含めません。

**重要**: この工程では、デザイン画像（`.page-info/designs/{slug}.png`）と実装スクリーンショットの差分比較を行い、整合性を確認します。

## 前提条件

- HTML / SCSS / JS の実装が完了していること
- 画像ファイルが配置済みであること
- デザイン画像（`.page-info/designs/{slug}.png`）が存在すること

## デザイン情報の参照方法

品質チェックを実行する前に、以下を確認してください：

1. **ページ情報**: `.page-info/README.md` でFigma URL、テンプレート、SCSSを確認
2. **デザイン画像**: `.page-info/designs/{slug}.png`（例: `access.png`, `faq.png`）
3. **SCSS変数**: プロジェクト直下 `CLAUDE.md` の「SCSS変数一覧」を参照

## チェック項目

### 1. タイポグラフィ

**参照**: `CLAUDE.md` の「SCSS変数一覧」

- [ ] フォント指定がデザイン通りか（`font-family: $base-font` / `$second-font`）
- [ ] フォントサイズがデザイン通りか（`font-size: rem(N)`）
- [ ] フォントウェイトがデザイン通りか（`$regular: 400`, `$medium: 500`, `$semi-bold: 600`, `$bold: 700`）
- [ ] 行間隔がデザイン通りか（line-height）
- [ ] 文字間隔がデザイン通りか（letter-spacing）
  - **重要**: `em` 単位で指定（`rem()` 禁止）

### 2. 色

**参照**: `CLAUDE.md` の「SCSS変数一覧」

- [ ] テキスト色がデザイン通りか（`color: $black` 等。Figma値とSCSS変数が**完全一致**する場合のみ変数使用、それ以外は16進数直書き）
- [ ] 背景色がデザイン通りか（`background-color`）
- [ ] ボーダー色がデザイン通りか（`border-color`）

### 3. 画像

- [ ] 使用画像のファイル名が命名規則通りか
  - `{セクション名}_{連番}.{拡張子}`（例: `hero_01.png`, `member_01.jpg`）
- [ ] 2倍書き出し前提の画像サイズになっているか（実ファイルが2倍解像度か確認）
- [ ] 画像ファイルが `src/img/` に配置されているか

### 4. JS・アニメーション（コード上の確認）

- [ ] リンクにホバー指定があるか（CSS / JS）

### 5. meta / head

- [ ] title が設定されているか
- [ ] description が設定されているか
- [ ] keywords が設定されているか（必要時のみ）
- [ ] OGP 画像（og:image）が設定されているか
- [ ] favicon の設定があるか（link rel="icon"）

### 6. HTML / リンク

- [ ] リンク先が指定通りのパスになっているか（href）
- [ ] 見出し構造が適切か（h1 → h2 → h3...）
- [ ] 抜け漏れがあったら教えて

## チェック手順

1. **デザイン画像との差分比較**（詳細は `section-compare` Skill）
   ```bash
   # スクリーンショット取得＆差分比較
   node .coding-md/screenshot.cjs --name {slug} --viewport pc --compare .page-info/designs/{slug}.png
   
   # 例: アクセスページ
   node .coding-md/screenshot.cjs --name access --viewport pc --compare .page-info/designs/access.png
   ```

2. **コードとの照合**
   - HTMLファイル: 画像パス、見出し構造、リンク先を確認
   - SCSSファイル: フォント、カラー、サイズを確認
   - 画像ファイル: ファイル名と存在確認

3. **差分の修正**
   - 差分画像（`diff_*.png`）で赤くハイライトされた箇所を修正
   - 修正後、再度スクリーンショット比較を実施

## 注意事項

- ブラウザ操作が必要な確認（表示崩れ、レスポンシブ、コンソールエラー等）は別工程で実施
- 仕様書 / デザインから読み取れない項目は、実装責任者に確認してから記載・判断すること
- デザイン画像が古い場合は、Figmaから最新をエクスポートして `.page-info/designs/` に保存してください
