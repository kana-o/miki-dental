# 工程 1: フォント・カラー変数の準備

## 概要

Figma MCP 経由でデザインからフォントとカラー情報を取得し、SCSS 変数として登録します。

## 前提条件

- Figma MCP が接続されていること

## 手順

### 1. Figma からデザイン情報を取得

#### 1-1. カラー変数の取得

`get_variable_defs` を使用して Figma のカラー変数を取得

#### 1-2. フォント情報の取得（重要）

**複数のテキスト要素を確認して、使用されているフォントを漏れなく取得する必要があります。**

- 日本語テキストと英語テキストで異なるフォントが使われている可能性がある
- `get_design_context` で複数のテキスト要素（ノード ID）を指定して確認
- 例: 見出し、本文、英語テキストなど、異なるタイプのテキスト要素を複数確認

**確認すべきポイント:**

- 日本語テキストで使用されているフォント（例: YuGothic, Noto Sans, ヒラギノ角ゴなど）
- 英語テキストで使用されているフォント（例: Lexend, Inter, Roboto など）
- 各フォントのウェイト（Light, Regular, Bold など）

### 2. フォントの読み込み

#### WordPress の場合

`functions.php` の `wp_enqueue_scripts` アクション内で読み込む：

```php
function my_script_init() {
	// Google Fonts（外部フォントを使用する場合）
	// フォント名にスペースがある場合は + に置換（例: Noto Sans → Noto+Sans）
	wp_enqueue_style('google-fonts-{フォント名}', 'https://fonts.googleapis.com/css2?family={フォント名}:wght@{ウェイト}&display=swap', array(), null, 'all');

	// 複数のフォントを読み込む場合
	// wp_enqueue_style('google-fonts', 'https://fonts.googleapis.com/css2?family={フォント名1}:wght@{ウェイト}&family={フォント名2}:wght@{ウェイト}&display=swap', array(), null, 'all');

	wp_enqueue_style('my', get_template_directory_uri() . '/assets/css/styles.css', array(), '1.0.1', 'all');
}
add_action('wp_enqueue_scripts', 'my_script_init');
```

#### 静的HTML の場合

各ページHTML（`src/html/index.html` 等）の `<head>` に直接 `<link>` を追加。
共通化したい場合は `src/html/parts/head.html` に切り出して `@@include` する。

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family={フォント名}:wght@{ウェイト}&display=swap" rel="stylesheet">
```

**注意事項:**

- **システムフォント（YuGothic、游ゴシック、Hiragino など）は読み込み不要**
- **Google Fonts など外部フォントのみ読み込む**
- フォント名は Figma から取得した値をそのまま使用（例: `Lexend`, `Noto Sans` など）
- フォント名にスペースがある場合、URL では `+` に置換（例: `Noto Sans` → `Noto+Sans`）
- 使用されているウェイトを全て含める（例: Light: 300, Regular: 400, Bold: 700 など）

### 3. SCSS 変数の登録

**変数ファイルのパス**:
- カラー: `src/scss/global/_color.scss`
- フォントファミリー・ウェイト: `src/scss/global/_font-family.scss`

> プロジェクト直下の `CLAUDE.md` の「SCSS変数一覧」も同時に更新すること。

#### フォント変数（`_font-family.scss`）

```scss
// 本文用（日本語フォント。システムフォントの場合はフォールバックを連ねる）
$base-font: "{Figmaから取得した日本語フォント名}", "Yu Gothic", "游ゴシック", YuGothic, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;

// 見出し・英字用（Google Fontsなど外部フォント）
$second-font: "{Figmaから取得した英語フォント名}", sans-serif;

// ウェイト
$regular: 400;
$medium: 500;
$semi-bold: 600;
$bold: 700;
```

**フォント設定のポイント:**

- **日本語フォント（システムフォント）**:
  - Figma で使用されているフォント名を先頭に設定
  - 日本語フォントの場合、複数のフォールバック（別名、類似フォント）を含める
  - 例: `"Yu Gothic"` → `"Yu Gothic", "游ゴシック", YuGothic, "Hiragino Kaku Gothic ProN", ...`
- **英語フォント（外部フォント）**:
  - Figma から取得したフォント名をそのまま設定（Google Fonts で読み込むフォント名）
  - システムフォントではない外部フォントのみこの変数に設定
- 使用していないウェイト変数は定義しない

#### カラー変数（`_color.scss`）

```scss
$white: #FFF;
$black: #1C1C1C;
$gray:  #DDDDDD;  // ボーダー等
// 以下プロジェクトに合わせて追加（ベースカラー・アクセントカラー等）
// $blue: #1B2E5B;
// $bg-light: #F5F5F5;
```

**注意**: カラー値は Figma から取得した値をそのまま使用してください。プロジェクトごとに異なるため、具体的な値は記載していません。SCSS変数として登録するのは**繰り返し使う色のみ**。1〜2回しか出ない色は16進数で直書きする。

### 4. 確認

- ブラウザでフォントが正しく読み込まれているか確認（Network タブで Google Fonts が読み込まれているか）
- 各SCSSファイルで `@use "global" as *;` 経由で変数が解決できているか確認（gulp ビルド時のエラーで検知）
- 日本語テキストと英語テキストでそれぞれ正しいフォントが適用されているか確認

## 注意事項

### フォント関連

- **複数のテキスト要素を確認**: 日本語と英語で異なるフォントが使われている可能性があるため、複数のテキスト要素を確認すること
- **システムフォントは読み込み不要**: YuGothic、游ゴシック、Hiragino などはシステムフォントのため、Google Fonts から読み込む必要はない
- **外部フォントのみ読み込む**: Google Fonts など外部サービスから提供されるフォントのみ `functions.php` で読み込む
- **フォント名の変換**:
  - SCSS 変数: フォント名をそのまま使用（例: `"Lexend"`, `"Noto Sans"`）
  - Google Fonts URL: スペースを `+` に置換（例: `Noto Sans` → `Noto+Sans`）
- **ウェイトの確認**: Figma で使用されているウェイト（Light: 300, Regular: 400, Bold: 700 など）を全て含める

### カラー関連

- カラー値は Figma から取得した値をそのまま使用
- 繰り返し使う色は必ず変数として定義すること
- 変数名は用途が分かりやすい名前にする（例: `--blue`, `--bg-blue` など）
