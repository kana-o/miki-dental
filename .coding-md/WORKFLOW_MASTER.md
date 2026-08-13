# Web案件 コーディングワークフロー（全体）

## 概要

WordPress / 静的HTML 案件のコーディング工程をまとめたマスターファイルです。
**サイト種別による差分は `[WordPress]` / `[静的HTML]` ブロックで明示**しているので、該当する手順のみ実行してください。

各工程の詳細は個別の md ファイル または Skill を参照してください。

## 前提条件

- **[Figma MCP]** Figma MCP が接続されていること / Figma で対象のデザインが選択されていること
- **[デザイン画像]** `.page-info/designs/` にデザイン画像が配置されていること
- プロジェクトのセットアップが完了していること（gulp、SCSS 環境など）
- **[静的HTML]** `src/html/parts/` フォルダが存在していること（共通コンポーネント置き場）

## サイト種別の判定

プロジェクトルートに `wp-content/themes/` または `functions.php` があれば **[WordPress]**、`gulpfile.js` のソースが `src/html/` を参照していれば **[静的HTML]**。

`.page-info/README.md` のテンプレートファイル名でも判定可能:
- `front-page.php` / `page-{slug}.php` → **[WordPress]**
- `index.html` / `{slug}/index.html` → **[静的HTML]**

## デザインソースの判定

`.page-info/README.md` を確認し、**Figma URLが記入されていれば [Figma MCP]**、**空欄またはデザイン画像のみなら [デザイン画像]** モードで作業する。以降の `[Figma MCP]` / `[デザイン画像]` ブロックは該当する手順のみ実行すること。

## ディレクトリ構成

### [WordPress]
```
プロジェクトルート/（wp-content/themes/{プロジェクト名}/）
├── functions.php
├── front-page.php       # TOPテンプレート
├── page-{slug}.php      # 下層テンプレート
├── template-parts/      # 共通PHPパーツ（get_template_part で読み込み）
├── gulpfile.js
├── package.json
├── src/
│   ├── scss/
│   ├── js/
│   └── img/
└── assets/              # ビルド出力先
    ├── css/
    ├── js/
    └── img/
```

### [静的HTML]
```
プロジェクトルート/
├── gulpfile.js          # static用（gulpfile.static.jsをリネーム）
├── package.json
├── src/
│   ├── html/            # HTMLソース（ここを編集する）
│   │   ├── index.html   # TOPページ
│   │   ├── {slug}/
│   │   │   └── index.html
│   │   └── parts/       # 共通HTMLパーツ（@@includeで読み込み）
│   ├── scss/
│   └── img/
└── public_html/         # ビルド出力先（直接編集しない）
    ├── index.html
    ├── {slug}/index.html
    └── assets/
```

> **[静的HTML] 重要**: HTMLは `src/html/` を編集する。`public_html/` はビルド出力なので直接編集しない。

## ページ情報・デザイン画像

`.page-info/` フォルダに以下が集約されています:

- **README.md**: 各ページのFigma URL・テンプレート/HTMLファイル・SCSS・デザイン画像パス
- **designs/{slug}.png**: Figmaからエクスポートしたデザイン画像（例: `access.png`, `faq.png`）
- **designs/{slug}_{状態}.png**: フォームページ用（例: `contact_input.png`, `contact_confirm.png`）

コーディング前に `.page-info/README.md` を参照してください。

## 工程一覧

### 0. ページ情報の確認（必須）

- 対象ページのテンプレートファイル/HTMLファイル、SCSSファイルを確認
- デザイン画像（`.page-info/designs/{slug}.png`）が存在するか確認

**[Figma MCP]** 対象ページのFigma URLを確認。デザイン画像が存在しない場合はFigmaからスクリーンショットをエクスポートして保存。画像取得の指示がない限り、画像は取得せずデザイン情報のみを取得する。
**[デザイン画像]** デザイン画像が存在しない場合はユーザーに配置を依頼する。

### 1. フォント・カラー情報の取得

**[詳細: `01-font-color-setup/WORKFLOW_01_FONT_COLOR_SETUP.md`]**

**[Figma MCP]** Figma からフォントとカラー情報を取得
**[デザイン画像]** デザイン画像からフォント・カラーを推定し、ユーザーに確認。Phase 1 でユーザーから提供された情報があればそちらを優先

- Google Fonts CDN の読み込み
  - **[WordPress]** `functions.php` の `wp_enqueue_scripts` で
  - **[静的HTML]** 各ページHTML（`src/html/index.html` 等）の `<head>` に直接 `<link>`
- SCSS 変数の登録（`src/scss/global/_color.scss` / `_font-family.scss`）

### 2. 画像の書き出し（[Figma MCP] は必須・指示を待たない）

**[正本: `~/.claude/skills/_shared/image-rules.md`]**（補足: `02-image-export/WORKFLOW_02_IMAGE_RENAMING.md`）

**[Figma MCP]** REST API スクリプト `figma-export-images.cjs` で書き出す（2x固定・写真=jpg / 透過・ロゴ=png / アイコン=svg・`{セクション}_{連番}` 命名・jpg自動圧縮）。**該当ページのコーディング前に必ず実施**
**[デザイン画像]** ユーザーから画像素材の提供を依頼。提供された画像を命名規則に従って配置

- `src/img/` に保存（ビルドで `assets/img/` または `public_html/assets/img/` へ出力）

### 3. コンポーネント検出

**[詳細: `03-component-detection/WORKFLOW_03_COMPONENT_DETECTION.md`]**

**[Figma MCP]** Figma MCPで全ページのデザインを横断的に確認し、再利用可能な UI パーツを検出
**[デザイン画像]** `.page-info/designs/` の全ページ画像を読み取り、再利用可能な UI パーツを検出

- 「共通コンポーネント」と「ページ固有」を切り分ける
- 工程 4 では、この一覧を参照し、**コンポーネントを中心にコーディング**する

### 4. コーディング

**[呼ぶSkill: `section-impl`]**
**[補足ドキュメント: `04-coding/WORKFLOW_04_INITIAL_CODING.md`]**

> **サブエージェント運用はページ単位が最小粒度**（セクション単位の分割は禁止・精度低下の実証あり）。案件規模での使い分けは `coding-flow` Skill 参照。

**[Figma MCP]** Figma MCPでセクション単位のデザイン情報を取得してコーディング
**[デザイン画像]** `.page-info/designs/{slug}.png` を読み取り、該当セクションを参照してコーディング。フォントサイズ・余白等の正確な値はデザイン画像から推定する。`.page-info/README.md` にデザイン仕様メモがあればそちらの値を優先する

> **[デザイン画像] 精度を上げるコツ**: デザイン仕様メモが未記入の場合、コーディング開始前にユーザーへ以下を確認する:
> - 本文フォントサイズ / 見出しフォントサイズ（h2, h3）
> - セクション間の余白（おおよその値）
> - コンテンツ幅
> - その他デザイン上のルール（角丸、影、ボーダーなど）
>
> 回答を `.page-info/README.md` の「デザイン仕様メモ」欄に記録する。

#### 共通コンポーネントの実装

- **[WordPress]** `template-parts/` に PHP ファイルを作成し、各ページから `get_template_part()` で読み込む
- **[静的HTML]** `src/html/parts/` に HTML ファイルを作成し、各ページから `@@include('./parts/header.html')` で読み込む（gulp-file-include）
- SCSS は共通: `src/scss/module/_{component}.scss` に作成
- `CLAUDE.md` の「既存共通コンポーネント」テーブルに追記

#### ページ固有セクション

- **[WordPress]** ページのPHPファイル（例: `front-page.php`, `page-access.php`）に直接記述
- **[静的HTML]** ページのHTMLファイル（例: `index.html`, `access/index.html`）に直接記述
- SCSS は `src/scss/module/_{slug}.scss` に作成

#### [静的HTML] HTMLの基本構造

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ページタイトル | サイト名</title>
  <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>

  @@include('./parts/header.html')

  <main>
    <!-- ページ固有コンテンツ -->
  </main>

  @@include('./parts/footer.html')

  <script src="/assets/js/script.js"></script>
</body>
</html>
```

> `@@include()` は gulp-file-include の記法。パスは `src/html/` からの相対パス。

#### 規約チェック（コーディング後）

- **[呼ぶSkill: `scss-check`]** SCSS規約の検証
- **[呼ぶSkill: `html-check`]** HTML規約の検証

### 5. スクリーンショット比較

**[呼ぶSkill: `section-compare`]**
**[補足ドキュメント: `05-screenshot-comparison/WORKFLOW_05_SCREENSHOT_COMPARISON.md`]**

- Playwright で実サイトのスクリーンショットを取得

**[Figma MCP]** Figma MCP でデザインのスクリーンショットを取得し、実装と比較
**[デザイン画像]** `.page-info/designs/{slug}.png` のデザイン画像と実装スクリーンショットを比較

- 差異を修正し、再比較する（修正ラウンド上限は3回。基準は `section-compare` Skill 参照）
- **PC・SP両方の比較はコーディング完了報告の前提条件（省略禁止）**。可能なら tab（中間幅）の崩れも確認する

### 6. 品質チェック

**[詳細: `06-quality-check/WORKFLOW_06_QUALITY_CHECK.md`]**

- タイポグラフィ、色、画像、JS/アニメーション、フォーム、meta/head、HTML/リンクのコード上の確認
- デザイン画像（`.page-info/designs/{slug}.png`）と実装スクリーンショットの差分比較

### 7. WordPress構築（[WordPress] のみ）

**[呼ぶSkill: `wp-setup`]**
**[補足ドキュメント: `07-wordpress/WORKFLOW_07_WP_SETUP.md`]**

- コーディング完了後、固定ページ・ACF・CF7・メニュー等を Playwright MCP 経由で WP 管理画面に自動登録
- **ページ単位で都度実行**（全ページまとめてではない）

> **[静的HTML] 不要**: 静的HTMLでは工程7はスキップ。

## 工程の順序

```
工程0（ページ情報の確認：必須）
    ↓
工程1（フォント・カラー情報の取得）
    ↓
工程2（画像の書き出し：Figma MCPモードは必須）
    ↓
工程3（コンポーネント検出：共通パーツの一覧化）
    ↓
工程4（コーディング：コンポーネント中心でHTML→SCSS）
    ↓
工程5（スクリーンショット比較と調整：PC/SP両方必須）
    ↓
工程6（品質チェック：エディタ内で完結）
    ↓
工程7（WordPress構築：[WordPress] のみ・ページ単位で都度実行）
```

## 各工程は独立した作業としても実施可能

上記は推奨フロー。**各工程は単体でも実施可**。1→2→…の順を必ず通す必要はない。

- 工程 1 … プロジェクト初期に 1 回。後は省略可
- 工程 2 … ページ単位で対象画像だけ実施可（ただし [Figma MCP] では該当ページのコーディング前に必ず実施）
- 工程 3 … 工程 4 の前推奨だが、なくても 4 は可能
- 工程 4 … 1 ページ・1 セクション単位で独立実施可
- 工程 5 … 該当部分だけ比較する単体実施可（ただしコーディング完了時のPC/SP両方比較は必須・省略不可）
- 工程 6 … 実装済みファイル単位で単体チェック可
- 工程 7 … ページ単位で都度実施（[WordPress] のみ）

## 重要事項

### 画像の書き出しについて

**[Figma MCP] の案件では、画像書き出しは指示を待たずに必ず実施する**（正本: `~/.claude/skills/_shared/image-rules.md`）。

- `get_design_context` はデザイン情報（フォント、カラー、レイアウト、テキスト内容など）の取得専用。画像の書き出し機能はない
- 画像は REST API スクリプト `figma-export-images.cjs` で、該当ページのコーディング前に書き出す

### デザイン画像の管理

**デザイン画像は `.page-info/designs/` に保存してください。**

- ファイル名はスラッグ名で統一（例: `access.png`, `faq.png`）
- フォームページは `{slug}_{状態}.png`（例: `contact_input.png`）
- 詳細は `.page-info/README.md` を参照

### parts/ ファイルの命名規則（[静的HTML]）

| ファイル | 用途 |
|----------|------|
| `parts/header.html` | グローバルヘッダー |
| `parts/footer.html` | グローバルフッター |
| `parts/breadcrumb.html` | パンくずリスト |
| `parts/page-header.html` | 下層ページヘッダー |
| `parts/{component}.html` | その他共通パーツ |

## セッション開始時の確認

### 環境情報の確認（Playwright MCP使用時）

Playwright MCPでWP操作やスクリーンショット取得が必要になった場合:

1. `.page-info/README.md` の「環境情報」セクションを確認
2. **未記入の場合、AIからユーザーに質問**する（URL・認証情報）
3. 取得した情報は `.page-info/README.md` に記録する

**重要**: URLやID/PASSが分からないまま作業を進めない。

## 一時ファイルの自動クリーンアップ

以下のファイルは**タスク完了時に自動削除**すること（ユーザーからの指示不要）:

### 削除対象
- `.coding-md/screenshots/` 内のスクリーンショット（差分確認が完了したもの）
- Playwright MCPが生成した一時画像ファイル
- Figma MCPの大容量出力ファイル（Readで読み取り完了後）
- `diff_*.png` 等の差分画像（修正完了後）

### 削除しないファイル
- `.page-info/designs/` 内のデザイン画像（マスターデータ）
- 差分率が高く再修正が必要なスクリーンショット（修正完了まで保持）
- ユーザーが明示的に保存を指示したファイル

### 実行タイミング
- 各セクションの差分比較→修正が完了したタイミング
- ページ全体のコーディング完了時
- セッション終了前

## 参考ファイル

- [ページ情報・デザイン画像](../.page-info/README.md) - 各ページのFigma URL・デザイン画像

## 自動化ツール

| ツール | コマンド |
|--------|----------|
| 画像リネーム | `node .coding-md/02-image-export/auto-rename-images.cjs src/img --resize` |
| 差分比較 | `node .coding-md/05-screenshot-comparison/compare-screenshots.cjs 実装.png デザイン.png --report` |
| SS取得+比較 | `node .coding-md/screenshot.cjs --selector ".section" --compare デザイン.png` |
