# ページ一覧

## 環境情報

| 項目 | 値 |
|------|-----|
| ローカルURL | <!-- http://localhost:3000/ ※BrowserSyncのデフォルト --> |
| 本番URL | <!-- https://example.com/ --> |

> **AI向け**: 上記が未記入のままPlaywright操作が必要になった場合、**ユーザーに質問して記入すること**。

## デザイン仕様メモ（デザイン画像モード用）

> Figma MCP を使わない場合、以下の値が分かるとコーディング精度が上がります。
> 分かる範囲で記入してください（不明な項目は空欄OK）。

| 項目 | 値 |
|------|-----|
| 本文フォントサイズ | <!-- 例: 16px --> |
| 見出しフォントサイズ | <!-- 例: h2=32px, h3=24px --> |
| セクション間の余白 | <!-- 例: 80px〜120px --> |
| コンテンツ幅 | <!-- 例: 1200px --> |
| ボタン角丸 | <!-- 例: 4px --> |
| シャドウ | <!-- 例: なし / あり（薄め） --> |
| その他ルール | <!-- 自由記述 --> |

> **AI向け**: 上記が未記入かつデザイン画像モードの場合、**コーディング開始前にユーザーに確認すること**。回答を得たらこの表に記入する。

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

## TOP（トップページ）
- **HTMLファイル**: `index.html`
- **SCSS**: `src/scss/module/_top.scss`
- **デザイン画像**: `designs/front-page.png`
- **PC**: <!-- Figma URL -->
- **SP**: <!-- Figma URL（あれば） -->
- **状態**: ⬜ 未着手

---

## {ページ名}
- **HTMLファイル**: `{slug}/index.html`
- **SCSS**: `src/scss/module/_{slug}.scss`
- **デザイン画像**: `designs/{slug}.png`
- **PC**: <!-- Figma URL -->
- **状態**: ⬜ 未着手

---

<!-- 以下、ページを追加 -->

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
