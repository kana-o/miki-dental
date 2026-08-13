# ページ一覧

## 環境情報

| 項目 | 値 |
|------|-----|
| ローカルURL（静的プレビュー） | http://localhost:3000/ ※`npx gulp` で BrowserSync 起動 |
| ローカルURL（WP） | http://260813-miki-dental.local/ |
| WP管理画面 | http://260813-miki-dental.local/wp-admin/（test / testtest） |
| 本番URL | <!-- 未確定 --> |
| Figmaファイル | https://www.figma.com/design/lhhDCpLMrA1oE634jXwFfL/★歯科HPリニューアル |
| リポジトリ | https://github.com/kana-o/miki-dental |

> **AI向け**: 上記が未記入のままPlaywright操作が必要になった場合、**ユーザーに質問して記入すること**。

## デザイン仕様メモ

Figma MCP から実値を取得するのが基本。以下は全体の基準値。

| 項目 | 値 |
|------|-----|
| デザイン幅 | PC: 1600px / SP: 375px |
| コンテンツ幅 | 1080px 基準（900 / 980 のセクションは個別クラスで絞る） |
| 見出しフォント | Zen Maru Gothic（Bold） |
| 本文フォント | Noto Sans JP |
| メインカラー | #10355d（濃紺） / #145aa6（青） |
| レスポンシブ | PC/SP の2段階が基本。SPは画面幅可変（`--rem-scale` + `cqi`）。TABは崩れた箇所のみ |

> 詳細な分析結果は `20260810_制作前チェック_三木歯科コーポレートサイト_分析レポート.md` を参照。

---

## 使い方
このフォルダにFigma URLとデザイン画像を記録しておくと、MCPで一括コーディング＆差分比較ができます。

例: 「TOPページをコーディングして」「アクセスページの差分を比較して」

### デザイン画像の保存場所
`designs/` フォルダに保存してください。ファイル名はスラッグ名で統一。

### 差分比較コマンド
```bash
node .coding-md/05-screenshot-comparison/compare-screenshots.cjs \
  .coding-md/screenshots/実装.png \
  .page-info/designs/デザイン.png \
  --report
```

---

## 対象ページ

**今回コーディングするのは TOP と ABOUT の2ページのみ。**
他18ページはデザイン未FIXのため着手しない（レポート「ページ構成一覧」参照）。

---

## TOP（トップページ）
- **HTMLファイル**: `src/html/index.html`
- **SCSS**: `src/scss/module/_top.scss`
- **クラスプレフィックス**: `top-`（例: `.top-fv`, `.top-about__title`）
- **PC**: https://www.figma.com/design/lhhDCpLMrA1oE634jXwFfL/★歯科HPリニューアル?node-id=1133-4902
- **SP**: https://www.figma.com/design/lhhDCpLMrA1oE634jXwFfL/★歯科HPリニューアル?node-id=1137-5893
- **セクション構成**: FV / 当院について / 治療について / パララックス / 院内紹介 / スタッフ紹介 / お知らせ / FAQ / 予約・相談
- **状態**: ⬜ 未着手

---

## ABOUT（当院について）
- **HTMLファイル**: `src/html/about/index.html`
- **SCSS**: `src/scss/module/_about.scss`
- **クラスプレフィックス**: `about-`（例: `.about-hero`, `.about-feature__title`）
- **PC**: https://www.figma.com/design/lhhDCpLMrA1oE634jXwFfL/★歯科HPリニューアル?node-id=1254-8265
- **SP**: https://www.figma.com/design/lhhDCpLMrA1oE634jXwFfL/★歯科HPリニューアル?node-id=1254-10850
- **セクション構成**: 特徴 / 専門性 / 連携（SP=診療体制） / 環境 / 治療体制 / カウンセリング（SPなし） / 予約・相談 / 他にも / 宣言文 / 誓い
- **状態**: ⬜ 未着手

---

## 共通パーツ用 Figma ノード

ヘッダー・ナビの状態違い。Phase 3（共通コンポーネント構築）で参照する。

| 用途 | node-id | 備考 |
|---|---|---|
| PC nav ドロップダウン（一般歯科） | `1137-5438` | 11項目 |
| PC nav ドロップダウン（小児歯科） | `1137-5592` | 9項目 |
| PC nav ドロップダウン（スタッフ） | `1137-5746` | 2項目 |
| SP nav-open | `1143-6004` | ハンバーガー展開・第1階層 |
| SP nav-pulldown | `1148-6235` | ＋一般歯科アコーディオン展開 |
| SP 固定CTA | `1148-6338` | SP FV＋画面下部固定CTA |
| FVマーキー2周目 | `1137-5405` | `Marquee Animation　続き` |

> ヘッダー symbol は `1148:6552`、フッター instance は `1133:5246`、CTA instance は `1133:5245`、
> 固定サイド instance は `1133:4940`（TOP frame `1133:4902` 内）。

---

<!-- デザインFIX後に他ページを追加 -->

---

## 凡例
- ✅ 完了
- 🟡 作成中
- ⬜ 未着手

## ファイル命名規則

### デザイン画像
- 基本: `{スラッグ名}.png`（例: `access.png`）
- フォーム: `{スラッグ名}_{状態}.png`（例: `contact_input.png`, `contact_confirm.png`, `contact_complete.png`）

### HTMLファイル
- TOP: `index.html`
- 下層: `{slug}/index.html`（例: `access/index.html`）

### 共通パーツ（parts/）
- `parts/header.html`
- `parts/footer.html`
- `parts/{component}.html`
